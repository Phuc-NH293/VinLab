from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import secrets
from .database import Base, engine, get_db
from .models import Student, LabSession, Attendance
from .schemas import (
    StudentCreate,
    StudentOut,
    SessionCreate,
    SessionOut,
    CheckInRequest,
    ManualAttendanceRequest,
    AttendanceOut,
)
from .cv_service import detect_face

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Smart Lab Attendance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api")
def root():
    return {"message": "Smart Lab Attendance API running"}

@app.post("/api/students", response_model=StudentOut)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    student = Student(**payload.model_dump())
    db.add(student)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Mã sinh viên đã tồn tại")
    db.refresh(student)
    return student

@app.get("/api/students", response_model=list[StudentOut])
def list_students(db: Session = Depends(get_db)):
    return db.query(Student).order_by(Student.id.desc()).all()

@app.post("/api/sessions", response_model=SessionOut)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    session = LabSession(**payload.model_dump(), qr_token=secrets.token_urlsafe(16))
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@app.get("/api/sessions", response_model=list[SessionOut])
def list_sessions(db: Session = Depends(get_db)):
    return db.query(LabSession).order_by(LabSession.id.desc()).all()

@app.post("/api/check-in", response_model=AttendanceOut)
def check_in(payload: CheckInRequest, db: Session = Depends(get_db)):
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

@app.post("/api/face-detect")
async def face_detect(file: UploadFile = File(...)):
    image_bytes = await file.read()
    return {"has_face": detect_face(image_bytes)}

@app.post("/api/instructor/attendance", response_model=AttendanceOut)
def instructor_mark_attendance(payload: ManualAttendanceRequest, db: Session = Depends(get_db)):
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
def instructor_remove_attendance(attendance_id: int, db: Session = Depends(get_db)):
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(404, "Không tìm thấy lượt điểm danh")
    db.delete(attendance)
    db.commit()
    return {"ok": True}

@app.get("/api/sessions/{session_id}/attendances")
def session_attendances(session_id: int, db: Session = Depends(get_db)):
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
            "method": a.method,
            "status": a.status,
            "checked_at": a.checked_at,
        }
        for a, s in rows
    ]
