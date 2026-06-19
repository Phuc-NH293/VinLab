from sqlalchemy import Boolean, Column, Float, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
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
    attendances = relationship("Attendance", back_populates="session")

class Attendance(Base):
    __tablename__ = "attendances"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    session_id = Column(Integer, ForeignKey("lab_sessions.id"))
    method = Column(String, default="QR") # QR / FACE / MANUAL
    status = Column(String, default="present")
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
