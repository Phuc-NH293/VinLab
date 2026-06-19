from pydantic import BaseModel
from datetime import datetime

class StudentCreate(BaseModel):
    student_code: str
    full_name: str
    class_name: str

class StudentOut(StudentCreate):
    id: int
    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    title: str
    room: str
    start_time: datetime
    end_time: datetime

class SessionOut(BaseModel):
    id: int
    title: str
    room: str
    start_time: datetime
    end_time: datetime
    qr_token: str
    class Config:
        from_attributes = True

class CheckInRequest(BaseModel):
    student_code: str
    qr_token: str

class ManualAttendanceRequest(BaseModel):
    student_id: int
    session_id: int

class AttendanceOut(BaseModel):
    id: int
    student_id: int
    session_id: int
    method: str
    status: str
    checked_at: datetime
    class Config:
        from_attributes = True
