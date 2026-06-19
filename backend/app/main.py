from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import json
import math
import secrets
from .database import Base, engine, get_db
from .models import (
    Student,
    User,
    LabSession,
    Attendance,
    FaceProfile,
    LeaveRequest,
    LabLocation,
    SessionPolicy,
    AnomalyAlert,
)
from .schemas import (
    StudentCreate,
    StudentOut,
    LoginRequest,
    TokenOut,
    SessionCreate,
    SessionOut,
    CheckInRequest,
    ManualAttendanceRequest,
    LeaveRequestCreate,
    LeaveReviewRequest,
    UserRoleUpdate,
    LocationCreate,
    SessionUpdate,
    AttendanceOut,
)
from .cv_service import create_face_thumbnail, extract_face_vector
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
        admin = db.query(User).filter(User.username == "admin001").first()
        if not admin:
            db.add(User(
                username="admin001",
                password_hash=hash_password("VinLab@123"),
                full_name="Quản trị viên Demo",
                role="admin",
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


def distance_meters(latitude_a, longitude_a, latitude_b, longitude_b):
    earth_radius = 6_371_000
    phi_a = math.radians(latitude_a)
    phi_b = math.radians(latitude_b)
    delta_phi = math.radians(latitude_b - latitude_a)
    delta_lambda = math.radians(longitude_b - longitude_a)
    value = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi_a) * math.cos(phi_b) * math.sin(delta_lambda / 2) ** 2
    )
    return earth_radius * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def flag_overlapping_attendance(db: Session, student_id: int, session: LabSession):
    rows = (
        db.query(Attendance, LabSession)
        .join(LabSession, Attendance.session_id == LabSession.id)
        .filter(
            Attendance.student_id == student_id,
            Attendance.session_id != session.id,
            Attendance.status == "present",
        )
        .all()
    )
    for _, other_session in rows:
        overlaps = session.start_time < other_session.end_time and other_session.start_time < session.end_time
        if overlaps:
            db.add(AnomalyAlert(
                student_id=student_id,
                session_id=session.id,
                alert_type="overlapping_checkin",
                details=f"Điểm danh trùng thời gian với {other_session.title} tại {other_session.room}",
                severity="high",
            ))
            return

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
    _: User = Depends(require_role("teacher", "admin")),
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
    _: User = Depends(require_role("teacher", "admin")),
):
    return db.query(Student).order_by(Student.id.desc()).all()

@app.post("/api/sessions", response_model=SessionOut)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher", "admin")),
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


@app.get("/api/student/schedule")
def student_schedule(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("student")),
):
    return db.query(LabSession).order_by(LabSession.start_time.asc()).all()


@app.get("/api/student/attendance-history")
def student_attendance_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    rows = (
        db.query(Attendance, LabSession)
        .join(LabSession, Attendance.session_id == LabSession.id)
        .filter(Attendance.student_id == current_user.student_id)
        .order_by(LabSession.start_time.desc())
        .all()
    )
    return [
        {
            "id": attendance.id,
            "session_id": session.id,
            "title": session.title,
            "room": session.room,
            "start_time": session.start_time,
            "method": attendance.method,
            "status": attendance.status,
            "checked_at": attendance.checked_at,
        }
        for attendance, session in rows
    ]


@app.post("/api/student/leave-requests")
def create_leave_request(
    payload: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    request = LeaveRequest(
        student_id=current_user.student_id,
        session_id=payload.session_id,
        request_type=payload.request_type,
        reason=payload.reason,
        evidence_name=payload.evidence_name,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return {
        "id": request.id,
        "status": request.status,
        "message": "Đã gửi đơn cho giảng viên",
    }


@app.get("/api/student/leave-requests")
def student_leave_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    return (
        db.query(LeaveRequest)
        .filter(LeaveRequest.student_id == current_user.student_id)
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )


@app.post("/api/student/face-enrollment")
async def face_enrollment(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    if len(files) < 3 or len(files) > 5:
        raise HTTPException(400, "Cần chụp từ 3 đến 5 góc mặt")
    vectors = []
    thumbnail = None
    for uploaded_file in files:
        image_bytes = await uploaded_file.read()
        vector = extract_face_vector(image_bytes)
        if not vector:
            raise HTTPException(400, "Có ảnh chưa phát hiện được khuôn mặt rõ")
        vectors.append(vector)
        if thumbnail is None:
            thumbnail = create_face_thumbnail(image_bytes)

    profile = db.query(FaceProfile).filter(FaceProfile.student_id == current_user.student_id).first()
    if not profile:
        profile = FaceProfile(student_id=current_user.student_id, vectors_json="[]")
        db.add(profile)
    profile.vectors_json = json.dumps(vectors)
    profile.sample_count = len(vectors)
    profile.status = "active"
    profile.updated_at = datetime.utcnow()
    if current_user.student and thumbnail:
        current_user.student.face_image_path = thumbnail
    db.commit()
    return {
        "ok": True,
        "sample_count": len(vectors),
        "message": "Đăng ký khuôn mặt thành công; hệ thống chỉ lưu vector đặc trưng",
    }


@app.get("/api/student/face-profile")
def student_face_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    profile = db.query(FaceProfile).filter(FaceProfile.student_id == current_user.student_id).first()
    return {
        "enrolled": bool(profile and profile.status == "active"),
        "sample_count": profile.sample_count if profile else 0,
        "updated_at": profile.updated_at if profile else None,
    }

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
    flag_overlapping_attendance(db, student.id, session)
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
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    liveness_passed: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    profile = db.query(FaceProfile).filter(
        FaceProfile.student_id == current_user.student_id,
        FaceProfile.status == "active",
    ).first()
    if not profile:
        raise HTTPException(400, "Bạn cần đăng ký khuôn mặt trước khi điểm danh")
    if not liveness_passed:
        raise HTTPException(400, "Chưa hoàn thành thử thách chống giả mạo")
    image_bytes = await file.read()
    thumbnail = create_face_thumbnail(image_bytes)
    if not thumbnail:
        raise HTTPException(400, "Chưa phát hiện khuôn mặt rõ trong ảnh")
    if not current_user.student:
        raise HTTPException(400, "Tài khoản sinh viên chưa liên kết hồ sơ")
    session = db.query(LabSession).filter(LabSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Không tìm thấy buổi học")
    policy = db.query(SessionPolicy).filter(SessionPolicy.session_id == session.id).first()
    before_minutes = policy.checkin_before_minutes if policy else 0
    after_minutes = policy.checkin_after_minutes if policy else 0
    now = datetime.utcnow()
    window_start = session.start_time.timestamp() - before_minutes * 60
    window_end = session.end_time.timestamp() + after_minutes * 60
    if not (window_start <= now.timestamp() <= window_end):
        raise HTTPException(400, "Ngoài thời gian điểm danh")
    if policy and policy.location_id:
        location = db.query(LabLocation).filter(LabLocation.id == policy.location_id).first()
        if location:
            if latitude is None or longitude is None:
                raise HTTPException(400, "Cần bật vị trí để điểm danh tại phòng Lab")
            distance = distance_meters(latitude, longitude, location.latitude, location.longitude)
            if distance > location.radius_meters:
                db.add(AnomalyAlert(
                    student_id=current_user.student_id,
                    session_id=session.id,
                    alert_type="outside_geofence",
                    details=f"Khoảng cách {round(distance)}m vượt bán kính {location.radius_meters}m",
                    severity="high",
                ))
                db.commit()
                raise HTTPException(400, "Bạn đang ở ngoài khu vực phòng Lab")

    current_user.student.face_image_path = thumbnail
    attendance = Attendance(
        student_id=current_user.student.id,
        session_id=session.id,
        method="FACE",
        status="pending_face",
    )
    db.add(attendance)
    flag_overlapping_attendance(db, current_user.student.id, session)
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
    session = db.query(LabSession).filter(LabSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Không tìm thấy buổi học")
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


@app.get("/api/instructor/leave-requests")
def instructor_leave_requests(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher", "admin")),
):
    rows = (
        db.query(LeaveRequest, Student, LabSession)
        .join(Student, LeaveRequest.student_id == Student.id)
        .outerjoin(LabSession, LeaveRequest.session_id == LabSession.id)
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )
    return [
        {
            "id": request.id,
            "student_code": student.student_code,
            "full_name": student.full_name,
            "class_name": student.class_name,
            "session_title": session.title if session else None,
            "request_type": request.request_type,
            "reason": request.reason,
            "evidence_name": request.evidence_name,
            "status": request.status,
            "teacher_note": request.teacher_note,
            "created_at": request.created_at,
        }
        for request, student, session in rows
    ]


@app.patch("/api/instructor/leave-requests/{request_id}")
def review_leave_request(
    request_id: int,
    payload: LeaveReviewRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher", "admin")),
):
    if payload.status not in {"approved", "rejected"}:
        raise HTTPException(400, "Trạng thái duyệt không hợp lệ")
    request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not request:
        raise HTTPException(404, "Không tìm thấy đơn")
    request.status = payload.status
    request.teacher_note = payload.teacher_note
    request.reviewed_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "status": request.status}

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


@app.get("/api/admin/users")
def admin_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    return [serialize_user(user) for user in db.query(User).order_by(User.id.desc()).all()]


@app.patch("/api/admin/users/{user_id}/role")
def admin_update_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    if payload.role not in {"student", "teacher", "admin"}:
        raise HTTPException(400, "Vai trò không hợp lệ")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Không tìm thấy tài khoản")
    user.role = payload.role
    db.commit()
    return serialize_user(user)


@app.get("/api/admin/locations")
def admin_locations(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    return db.query(LabLocation).order_by(LabLocation.id.desc()).all()


@app.post("/api/admin/locations")
def admin_create_location(
    payload: LocationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    location = LabLocation(**payload.model_dump())
    db.add(location)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Mã phòng đã tồn tại")
    db.refresh(location)
    return location


@app.delete("/api/admin/locations/{location_id}")
def admin_delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    location = db.query(LabLocation).filter(LabLocation.id == location_id).first()
    if not location:
        raise HTTPException(404, "Không tìm thấy phòng Lab")
    db.delete(location)
    db.commit()
    return {"ok": True}


@app.patch("/api/admin/sessions/{session_id}")
def admin_update_session(
    session_id: int,
    payload: SessionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    session = db.query(LabSession).filter(LabSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Không tìm thấy buổi học")
    session.title = payload.title
    session.room = payload.room
    session.start_time = payload.start_time
    session.end_time = payload.end_time
    policy = db.query(SessionPolicy).filter(SessionPolicy.session_id == session.id).first()
    if not policy:
        policy = SessionPolicy(session_id=session.id)
        db.add(policy)
    policy.location_id = payload.location_id
    policy.checkin_before_minutes = payload.checkin_before_minutes
    policy.checkin_after_minutes = payload.checkin_after_minutes
    db.commit()
    return {"ok": True}


@app.delete("/api/admin/sessions/{session_id}")
def admin_delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    session = db.query(LabSession).filter(LabSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Không tìm thấy buổi học")
    db.query(Attendance).filter(Attendance.session_id == session.id).delete()
    db.query(SessionPolicy).filter(SessionPolicy.session_id == session.id).delete()
    db.query(LeaveRequest).filter(LeaveRequest.session_id == session.id).update({"session_id": None})
    db.delete(session)
    db.commit()
    return {"ok": True}


@app.get("/api/admin/face-profiles")
def admin_face_profiles(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    rows = (
        db.query(FaceProfile, Student)
        .join(Student, FaceProfile.student_id == Student.id)
        .order_by(FaceProfile.updated_at.desc())
        .all()
    )
    return [
        {
            "id": profile.id,
            "student_id": student.id,
            "student_code": student.student_code,
            "full_name": student.full_name,
            "class_name": student.class_name,
            "sample_count": profile.sample_count,
            "status": profile.status,
            "updated_at": profile.updated_at,
        }
        for profile, student in rows
    ]


@app.delete("/api/admin/face-profiles/{profile_id}")
def admin_delete_face_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    profile = db.query(FaceProfile).filter(FaceProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Không tìm thấy dữ liệu khuôn mặt")
    student = db.query(Student).filter(Student.id == profile.student_id).first()
    if student:
        student.face_image_path = None
    db.delete(profile)
    db.commit()
    return {"ok": True}


@app.get("/api/admin/anomalies")
def admin_anomalies(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    rows = (
        db.query(AnomalyAlert, Student)
        .outerjoin(Student, AnomalyAlert.student_id == Student.id)
        .order_by(AnomalyAlert.created_at.desc())
        .all()
    )
    return [
        {
            "id": alert.id,
            "student_code": student.student_code if student else None,
            "full_name": student.full_name if student else None,
            "session_id": alert.session_id,
            "alert_type": alert.alert_type,
            "details": alert.details,
            "severity": alert.severity,
            "status": alert.status,
            "created_at": alert.created_at,
        }
        for alert, student in rows
    ]
