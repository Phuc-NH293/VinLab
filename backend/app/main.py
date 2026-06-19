from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import secrets
from .database import Base, engine, get_db
from .models import Student, User, LabSession, Attendance
from .schemas import (
    StudentCreate,
    StudentOut,
    LoginRequest,
    TokenOut,
    SessionCreate,
    SessionOut,
    CheckInRequest,
    ManualAttendanceRequest,
    AttendanceOut,
)
from .cv_service import create_face_thumbnail
from .auth import (
    create_access_token,
    get_current_user,
    hash_password,
    require_role,
    verify_password,
)

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Smart Lab Attendance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def serialize_user(user: User):
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
        "student_id": user.student_id,
        "student_code": user.student.student_code if user.student else None,
    }


def seed_demo_accounts():
    from .database import SessionLocal

    db = SessionLocal()
    try:
        teacher = db.query(User).filter(User.username == "gv001").first()
        if not teacher:
            db.add(User(
                username="gv001",
                password_hash=hash_password("VinLab@123"),
                full_name="Giảng viên Demo",
                role="teacher",
            ))

        student = db.query(Student).filter(Student.student_code == "SV001").first()
        if not student:
            student = Student(
                student_code="SV001",
                full_name="Nguyễn Văn A",
                class_name="AI20K",
            )
            db.add(student)
            db.flush()

        student_user = db.query(User).filter(User.username == "sv001").first()
        if not student_user:
            db.add(User(
                username="sv001",
                password_hash=hash_password("VinLab@123"),
                full_name=student.full_name,
                role="student",
                student_id=student.id,
            ))
        db.commit()
    finally:
        db.close()


seed_demo_accounts()

@app.get("/api")
def root():
    return {"message": "Smart Lab Attendance API running"}

@app.post("/api/auth/login", response_model=TokenOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username.strip().lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Tên đăng nhập hoặc mật khẩu không đúng")
    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@app.get("/api/auth/me")
def auth_me(current_user: User = Depends(get_current_user)):
    return serialize_user(current_user)


@app.post("/api/students", response_model=StudentOut)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher")),
):
    data = payload.model_dump(exclude={"password"})
    student = Student(**data)
    db.add(student)
    try:
        db.flush()
        db.add(User(
            username=payload.student_code.strip().lower(),
            password_hash=hash_password(payload.password),
            full_name=payload.full_name,
            role="student",
            student_id=student.id,
        ))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Mã sinh viên hoặc tài khoản đã tồn tại")
    db.refresh(student)
    return student

@app.get("/api/students", response_model=list[StudentOut])
def list_students(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher")),
):
    return db.query(Student).order_by(Student.id.desc()).all()

@app.post("/api/sessions", response_model=SessionOut)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher")),
):
    session = LabSession(**payload.model_dump(), qr_token=secrets.token_urlsafe(16))
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@app.get("/api/sessions", response_model=list[SessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(LabSession).order_by(LabSession.id.desc()).all()

@app.post("/api/check-in", response_model=AttendanceOut)
def check_in(
    payload: CheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "student":
        if not current_user.student or current_user.student.student_code != payload.student_code:
            raise HTTPException(403, "Sinh viên chỉ được điểm danh cho chính mình")
    student = db.query(Student).filter(Student.student_code == payload.student_code).first()
    if not student:
        raise HTTPException(404, "Không tìm thấy sinh viên")
    session = db.query(LabSession).filter(LabSession.qr_token == payload.qr_token).first()
    if not session:
        raise HTTPException(404, "QR không hợp lệ")
    now = datetime.utcnow()
    if not (session.start_time <= now <= session.end_time):
        raise HTTPException(400, "Ngoài thời gian điểm danh")
    attendance = Attendance(student_id=student.id, session_id=session.id, method="QR")
    db.add(attendance)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Sinh viên đã điểm danh buổi này")
    db.refresh(attendance)
    return attendance

@app.post("/api/face-check-in")
async def face_check_in(
    file: UploadFile = File(...),
    session_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    image_bytes = await file.read()
    thumbnail = create_face_thumbnail(image_bytes)
    if not thumbnail:
        raise HTTPException(400, "Chưa phát hiện khuôn mặt rõ trong ảnh")
    if not current_user.student:
        raise HTTPException(400, "Tài khoản sinh viên chưa liên kết hồ sơ")
    session = db.query(LabSession).filter(LabSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Không tìm thấy buổi học")
    now = datetime.utcnow()
    if not (session.start_time <= now <= session.end_time):
        raise HTTPException(400, "Ngoài thời gian điểm danh")

    current_user.student.face_image_path = thumbnail
    attendance = Attendance(
        student_id=current_user.student.id,
        session_id=session.id,
        method="FACE",
        status="pending_face",
    )
    db.add(attendance)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Bạn đã gửi điểm danh cho buổi học này")
    return {
        "ok": True,
        "status": "pending_face",
        "message": "Đã gửi khuôn mặt, đang chờ giảng viên xác nhận",
        "face_image_path": thumbnail,
    }


@app.post("/api/instructor/face-attendance/scan")
def instructor_scan_face_attendance(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher")),
):
    pending = (
        db.query(Attendance)
        .filter(
            Attendance.session_id == session_id,
            Attendance.method == "FACE",
            Attendance.status == "pending_face",
        )
        .all()
    )
    for attendance in pending:
        attendance.status = "present"
    db.commit()
    return {
        "confirmed": len(pending),
        "message": f"Đã xác nhận {len(pending)} sinh viên điểm danh khuôn mặt",
    }

@app.post("/api/instructor/attendance", response_model=AttendanceOut)
def instructor_mark_attendance(
    payload: ManualAttendanceRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher")),
):
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(404, "Không tìm thấy sinh viên")
    session = db.query(LabSession).filter(LabSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(404, "Không tìm thấy buổi học")

    attendance = Attendance(
        student_id=student.id,
        session_id=session.id,
        method="MANUAL",
        status="present",
    )
    db.add(attendance)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Sinh viên đã được ghi nhận có mặt")
    db.refresh(attendance)
    return attendance

@app.delete("/api/instructor/attendance/{attendance_id}")
def instructor_remove_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher")),
):
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(404, "Không tìm thấy lượt điểm danh")
    db.delete(attendance)
    db.commit()
    return {"ok": True}

@app.get("/api/sessions/{session_id}/attendances")
def session_attendances(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher")),
):
    rows = (
        db.query(Attendance, Student)
        .join(Student, Attendance.student_id == Student.id)
        .filter(Attendance.session_id == session_id)
        .order_by(Attendance.checked_at.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "student_id": a.student_id,
            "session_id": a.session_id,
            "student_code": s.student_code,
            "full_name": s.full_name,
            "class_name": s.class_name,
            "face_image_path": s.face_image_path,
            "method": a.method,
            "status": a.status,
            "checked_at": a.checked_at,
        }
        for a, s in rows
    ]
