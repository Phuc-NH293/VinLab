from pydantic import BaseModel, Field
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
    email: str | None = None
    email: str | None = None
    email: str | None = None
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
    class_id: int | None = None
    subject_id: int | None = None

class SessionOut(BaseModel):
    id: int
    title: str
    room: str
    start_time: datetime
    end_time: datetime
    qr_token: str
    class_id: int | None = None
    subject_id: int | None = None
    teacher_id: int | None = None
    status: str = "active"
    class Config:
        from_attributes = True

class CheckInRequest(BaseModel):
    student_code: str
    qr_token: str

class ManualAttendanceRequest(BaseModel):
    student_id: int
    session_id: int

class LeaveRequestCreate(BaseModel):
    session_id: int | None = None
    request_type: str = "leave"
    reason: str
    evidence_name: str | None = None

class LeaveReviewRequest(BaseModel):
    status: str
    teacher_note: str | None = None

class UserRoleUpdate(BaseModel):
    role: str

class LocationCreate(BaseModel):
    name: str
    room_code: str
    latitude: float
    longitude: float
    radius_meters: int = 100
    wifi_ssid: str | None = None
    wifi_bssid: str | None = None
    camera_devices: str | None = None

class SessionUpdate(BaseModel):
    title: str
    room: str
    start_time: datetime
    end_time: datetime
    location_id: int | None = None
    checkin_before_minutes: int = 15
    checkin_after_minutes: int = 10
    class_id: int | None = None
    subject_id: int | None = None

class AttendanceOut(BaseModel):
    id: int
    student_id: int
    session_id: int
    method: str
    status: str
    confidence_score: float | None = None
    review_note: str | None = None
    checked_at: datetime
    checkout_method: str | None = None
    checkout_at: datetime | None = None
    class Config:
        from_attributes = True

class ClassCreate(BaseModel):
    code: str
    name: str
    teacher_id: int | None = None

class SubjectCreate(BaseModel):
    code: str
    name: str
    credits: int = 3

class ClassStudentCreate(BaseModel):
    student_id: int

class SessionStatusUpdate(BaseModel):
    status: str

class AttendanceReview(BaseModel):
    status: str
    review_note: str | None = None

class AppealCreate(BaseModel):
    attendance_id: int | None = None
    session_id: int | None = None
    reason: str
    evidence_name: str | None = None

class AppealReview(BaseModel):
    status: str
    review_note: str | None = None


class AIChatHistoryItem(BaseModel):
    role: str
    text: str = Field(min_length=1, max_length=4000)


class AIChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    lesson_id: int | None = None
    topic: str | None = Field(default=None, max_length=100)
    socratic_mode: bool = True
    history: list[AIChatHistoryItem] = Field(default_factory=list, max_length=12)
