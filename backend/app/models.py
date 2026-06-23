from sqlalchemy import Boolean, Column, Float, Integer, LargeBinary, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    student_code = Column(String, unique=True, index=True)
    full_name = Column(String)
    class_name = Column(String)
    face_image_path = Column(String, nullable=True)
    attendances = relationship("Attendance", back_populates="student")
    user = relationship("User", back_populates="student", uselist=False)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    student = relationship("Student", back_populates="user")

class LabSession(Base):
    __tablename__ = "lab_sessions"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    room = Column(String)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    qr_token = Column(String, unique=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String, default="active", index=True)
    attendances = relationship("Attendance", back_populates="session")

class Attendance(Base):
    __tablename__ = "attendances"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    session_id = Column(Integer, ForeignKey("lab_sessions.id"))
    method = Column(String, default="QR") # QR / FACE / MANUAL
    status = Column(String, default="present")
    confidence_score = Column(Float, nullable=True)
    device_id = Column(String, nullable=True)
    review_note = Column(Text, nullable=True)
    checked_at = Column(DateTime, default=datetime.utcnow)
    student = relationship("Student", back_populates="attendances")
    session = relationship("LabSession", back_populates="attendances")
    __table_args__ = (UniqueConstraint("student_id", "session_id", name="unique_student_session"),)

class FaceProfile(Base):
    __tablename__ = "face_profiles"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), unique=True, index=True)
    vectors_json = Column(Text, nullable=False)
    sample_count = Column(Integer, default=0)
    status = Column(String, default="active")
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True)
    session_id = Column(Integer, ForeignKey("lab_sessions.id"), nullable=True, index=True)
    request_type = Column(String, default="leave")
    reason = Column(Text, nullable=False)
    evidence_name = Column(String, nullable=True)
    status = Column(String, default="pending", index=True)
    teacher_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)

class LabLocation(Base):
    __tablename__ = "lab_locations"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    room_code = Column(String, unique=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_meters = Column(Integer, default=100)
    wifi_ssid = Column(String, nullable=True)
    wifi_bssid = Column(String, nullable=True)
    camera_devices = Column(Text, nullable=True)
    active = Column(Boolean, default=True)

class SessionPolicy(Base):
    __tablename__ = "session_policies"
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("lab_sessions.id"), unique=True, index=True)
    location_id = Column(Integer, ForeignKey("lab_locations.id"), nullable=True)
    checkin_before_minutes = Column(Integer, default=15)
    checkin_after_minutes = Column(Integer, default=10)

class AnomalyAlert(Base):
    __tablename__ = "anomaly_alerts"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True, index=True)
    session_id = Column(Integer, ForeignKey("lab_sessions.id"), nullable=True, index=True)
    alert_type = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    severity = Column(String, default="medium")
    status = Column(String, default="open", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ClassRoom(Base):
    __tablename__ = "classes"
    id = Column(Integer, primary_key=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    active = Column(Boolean, default=True)

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    credits = Column(Integer, default=3)
    active = Column(Boolean, default=True)

class ClassStudent(Base):
    __tablename__ = "class_students"
    id = Column(Integer, primary_key=True)
    class_id = Column(Integer, ForeignKey("classes.id"), index=True, nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), index=True, nullable=False)
    __table_args__ = (UniqueConstraint("class_id", "student_id", name="unique_class_student"),)

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, nullable=False, index=True)
    entity_type = Column(String, nullable=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class Appeal(Base):
    __tablename__ = "appeals"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True, nullable=False)
    attendance_id = Column(Integer, ForeignKey("attendances.id"), nullable=True, index=True)
    session_id = Column(Integer, ForeignKey("lab_sessions.id"), nullable=True, index=True)
    reason = Column(Text, nullable=False)
    evidence_name = Column(String, nullable=True)
    status = Column(String, default="pending", index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)

class LessonSlide(Base):
    __tablename__ = "lesson_slides"
    id = Column(Integer, primary_key=True)
    lesson_id = Column(Integer, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_data = Column(LargeBinary, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
