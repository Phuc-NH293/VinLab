from pydantic import BaseModel
from datetime import datetime

class StudentCreate(BaseModel):
    student_code: str
    full_name: str
    class_name: str
    password: str = "VinLab@123"

class StudentOut(BaseModel):
    id: int
    student_code: str
    full_name: str
    class_name: str
    face_image_path: str | None = None
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    student_id: int | None = None
    student_code: str | None = None

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

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
