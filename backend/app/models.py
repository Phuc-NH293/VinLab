from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
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
