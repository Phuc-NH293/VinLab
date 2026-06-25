from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from functools import lru_cache
from pathlib import Path
import base64
import json
import math
import os
import secrets
from dotenv import load_dotenv
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, urlencode, urlparse
from urllib.request import Request as URLRequest, urlopen

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from .database import Base, engine, get_db, ensure_schema_columns
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
    ClassRoom,
    Subject,
    ClassStudent,
    AttendanceLog,
    Appeal,
    LessonSlide,
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
    ClassCreate,
    SubjectCreate,
    ClassStudentCreate,
    SessionStatusUpdate,
    AttendanceReview,
    AppealCreate,
    AppealReview,
    AIChatRequest,
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
ensure_schema_columns()
app = FastAPI(title="Smart Lab Attendance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

LESSON_TITLES = {
    1: "Nền tảng AI & LLM",
    2: "Xác định bài toán AI",
    3: "Chatbot & Agent",
    4: "Thiết kế câu lệnh & Tool Calling",
    5: "Tư duy sản phẩm AI",
    6: "Xây dựng nguyên mẫu thử nghiệm",
}
MAX_SLIDE_SIZE = 20 * 1024 * 1024
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
TEST_QR_TOKEN = "test"

def serialize_user(user: User):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "student_id": user.student_id,
        "student_code": user.student.student_code if user.student else None,
    }

def add_log(db, user, action, entity_type=None, entity_id=None, details=None):
    db.add(AttendanceLog(
        user_id=user.id if user else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=json.dumps(details, ensure_ascii=False) if isinstance(details, (dict, list)) else details,
    ))

def serialize_lesson_slide(slide: LessonSlide):
    return {
        "id": slide.id,
        "lesson_id": slide.lesson_id,
        "title": slide.title,
        "file_name": slide.file_name,
        "file_size": slide.file_size,
        "uploaded_by": slide.uploaded_by,
        "uploaded_at": slide.uploaded_at,
        "updated_at": slide.updated_at,
    }


def normalize_qr_token(raw_value: str):
    value = (raw_value or "").strip()
    if not value:
        return ""

    if value.upper().startswith("VINLAB:"):
        return value.split(":", 1)[1].strip()

    if value.startswith("{"):
        try:
            payload = json.loads(value)
            return str(payload.get("qr_token") or payload.get("token") or "").strip()
        except (json.JSONDecodeError, AttributeError):
            return value

    if value.startswith(("http://", "https://")):
        parsed = urlparse(value)
        query = parse_qs(parsed.query)
        token = (query.get("qr") or query.get("qr_token") or query.get("token") or [""])[0]
        if token:
            return token.strip()

    return value


def generate_ai_chat_reply(payload: AIChatRequest, slide: LessonSlide | None):
    api_key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    if not api_key:
        raise HTTPException(503, "Gemini chưa được cấu hình. Hãy đặt biến môi trường GEMINI_API_KEY.")

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    history_lines = []
    for item in payload.history[-8:]:
        role = "Sinh viên" if item.role in {"user", "student"} else "Trợ giảng"
        history_lines.append(f"{role}: {item.text[:2000]}")
    history_text = "\n".join(history_lines) or "(Chưa có lịch sử)"

    lesson_context = (
        f"Bài học: {slide.title or LESSON_TITLES.get(slide.lesson_id, '')}. "
        f"Tệp slide: {slide.file_name}."
        if slide
        else "Không có slide PDF được cung cấp cho lượt hỏi này."
    )
    teaching_style = (
        "Ưu tiên gợi mở bằng một câu hỏi ngắn, sau đó mới giải thích đủ để sinh viên tiến bộ."
        if payload.socratic_mode
        else "Trả lời trực tiếp, rõ ràng và có ví dụ ngắn khi hữu ích."
    )
    prompt = f"""
Bạn là trợ giảng AI cho sinh viên Việt Nam. Trả lời hoàn toàn bằng tiếng Việt.
{teaching_style}

Ngữ cảnh:
- Chủ đề: {payload.topic or "AI"}
- {lesson_context}

Quy tắc trả lời và nguồn:
1. answer luôn là câu trả lời chính bằng kiến thức của Gemini, độc lập, dễ hiểu và không nhắc tới slide.
2. Sau khi viết answer, kiểm tra PDF. Nếu PDF có nội dung liên quan, viết slide_answer để tóm tắt riêng điều slide nói và đặt source_type là "mixed".
3. Nếu PDF không có nội dung liên quan hoặc không được cung cấp, slide_answer là chuỗi rỗng, source_type là "general" và citations là [].
4. Mỗi ý trong slide_answer phải được hỗ trợ bởi citations. citations chỉ chứa trang thực sự liên quan.
5. page là số trang PDF bắt đầu từ 1. quote là một đoạn trích ngắn, sát nguyên văn trên đúng trang đó.
6. Không được bịa số trang hoặc đoạn trích. Không trộn nội dung slide vào answer.
7. Không tự viết tiêu đề "Gemini", "Trong slide" hay "Nguồn" vì giao diện sẽ thêm các tiêu đề này.

Lịch sử hội thoại:
{history_text}

Câu hỏi hiện tại:
{payload.message}
""".strip()

    parts = []
    if slide:
        parts.append({
            "inline_data": {
                "mime_type": "application/pdf",
                "data": base64.b64encode(slide.file_data).decode("ascii"),
            }
        })
    parts.append({"text": prompt})

    request_body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": 0.25,
            "maxOutputTokens": 1400,
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "required": ["answer", "slide_answer", "source_type", "citations"],
                "properties": {
                    "answer": {"type": "STRING"},
                    "slide_answer": {"type": "STRING"},
                    "source_type": {
                        "type": "STRING",
                        "enum": ["general", "mixed"],
                    },
                    "citations": {
                        "type": "ARRAY",
                        "maxItems": 5,
                        "items": {
                            "type": "OBJECT",
                            "required": ["page", "quote"],
                            "properties": {
                                "page": {"type": "INTEGER", "minimum": 1},
                                "quote": {"type": "STRING"},
                            },
                        },
                    },
                },
            },
        },
    }
    request = URLRequest(
        GEMINI_API_URL.format(model=quote(model, safe="")),
        data=json.dumps(request_body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=60) as response:
            gemini_payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        try:
            error_payload = json.loads(error.read().decode("utf-8"))
            detail = error_payload.get("error", {}).get("message")
        except (json.JSONDecodeError, UnicodeDecodeError):
            detail = None
        raise HTTPException(502, detail or "Gemini API trả về lỗi")
    except (URLError, TimeoutError, json.JSONDecodeError):
        raise HTTPException(502, "Không thể kết nối tới Gemini API")

    try:
        raw_text = "".join(
            part.get("text", "")
            for part in gemini_payload["candidates"][0]["content"]["parts"]
        )
        result = json.loads(raw_text)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError):
        raise HTTPException(502, "Gemini không trả về câu trả lời hợp lệ")

    answer = str(result.get("answer") or "").strip()
    if not answer:
        raise HTTPException(502, "Gemini trả về câu trả lời trống")

    slide_answer = str(result.get("slide_answer") or "").strip()
    source_type = result.get("source_type")
    if source_type not in {"general", "mixed"}:
        source_type = "general"

    citations = []
    if slide and source_type == "mixed":
        for citation in result.get("citations") or []:
            try:
                page = int(citation.get("page"))
            except (TypeError, ValueError):
                continue
            citation_quote = str(citation.get("quote") or "").strip()
            if page > 0 and citation_quote:
                citations.append({
                    "page": page,
                    "quote": citation_quote[:500],
                })
            if len(citations) == 5:
                break

    if not slide_answer or not citations:
        source_type = "general"
        slide_answer = ""
        citations = []

    return {
        "answer": answer,
        "slide_answer": slide_answer,
        "source_type": source_type,
        "citations": citations,
        "lesson_id": slide.lesson_id if slide else None,
        "slide_title": slide.title if slide else None,
        "model": model,
    }

def face_similarity(probe, stored_vectors):
    if not probe or not stored_vectors:
        return 0.0
    scores = []
    for vector in stored_vectors:
        dot = sum(a * b for a, b in zip(probe, vector))
        left = math.sqrt(sum(a * a for a in probe))
        right = math.sqrt(sum(b * b for b in vector))
        if left and right:
            scores.append(dot / (left * right))
    return max(scores, default=0.0)


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


def seed_test_qr_session():
    from .database import SessionLocal

    db = SessionLocal()
    try:
        session = db.query(LabSession).filter(LabSession.qr_token == TEST_QR_TOKEN).first()
        if not session:
            session = LabSession(
                title="Buổi kiểm thử QR",
                room="TEST",
                start_time=datetime(2020, 1, 1),
                end_time=datetime(2100, 1, 1),
                qr_token=TEST_QR_TOKEN,
                status="active",
            )
            db.add(session)
            db.commit()
    finally:
        db.close()


seed_test_qr_session()


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

def flag_shared_device(
    db: Session,
    student_id: int,
    session_id: int,
    device_id: str | None,
    phase: str = "checkin",
):
    if not device_id:
        return False
    device_column = Attendance.checkout_device_id if phase == "checkout" else Attendance.device_id
    other = db.query(Attendance).filter(
        Attendance.session_id == session_id,
        device_column == device_id,
        Attendance.student_id != student_id,
    ).first()
    if not other:
        return False
    db.add(AnomalyAlert(
        student_id=student_id,
        session_id=session_id,
        alert_type="shared_device",
        details=(
            f"Thiết bị {device_id} được nhiều sinh viên sử dụng để "
            f"{'check-out QR' if phase == 'checkout' else 'check-in khuôn mặt'} "
            "trong cùng một buổi học"
        ),
        severity="high",
    ))
    return True

@app.get("/api")
def root():
    return {"message": "Smart Lab Attendance API running"}


@lru_cache(maxsize=2048)
def reverse_geocode_google(latitude: float, longitude: float):
    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(503, "Google Maps Geocoding chưa được cấu hình")

    query = urlencode({
        "latlng": f"{latitude:.6f},{longitude:.6f}",
        "language": "vi",
        "region": "vn",
        "key": api_key,
    })
    try:
        with urlopen(
            f"https://maps.googleapis.com/maps/api/geocode/json?{query}",
            timeout=8,
        ) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        raise HTTPException(502, "Không thể tra cứu địa chỉ từ Google Maps")

    status = payload.get("status")
    if status == "ZERO_RESULTS":
        raise HTTPException(404, "Không tìm thấy địa chỉ tại vị trí này")
    if status != "OK":
        raise HTTPException(502, payload.get("error_message") or "Google Maps Geocoding trả về lỗi")

    results = payload.get("results") or []
    if not results:
        raise HTTPException(404, "Không tìm thấy địa chỉ tại vị trí này")

    preferred_types = ("street_address", "premise", "subpremise", "point_of_interest", "route")
    result = next(
        (item for address_type in preferred_types for item in results if address_type in item.get("types", [])),
        results[0],
    )
    return {
        "address": result.get("formatted_address"),
        "place_id": result.get("place_id"),
        "location_type": result.get("geometry", {}).get("location_type"),
        "source": "google",
    }


@app.get("/api/location/reverse")
def reverse_location(
    latitude: float,
    longitude: float,
    current_user: User = Depends(get_current_user),
):
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise HTTPException(400, "Tọa độ không hợp lệ")
    return reverse_geocode_google(round(latitude, 5), round(longitude, 5))


@app.post("/api/auth/login", response_model=TokenOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    identifier = payload.username.strip().lower()
    user = db.query(User).filter((User.username == identifier) | (User.email == identifier)).first()
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


@app.post("/api/ai/chat")
def ai_chat(
    payload: AIChatRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    slide = None
    if payload.lesson_id is not None:
        if payload.lesson_id not in LESSON_TITLES:
            raise HTTPException(404, "Bài học không tồn tại")
        slide = db.query(LessonSlide).filter(LessonSlide.lesson_id == payload.lesson_id).first()
    return generate_ai_chat_reply(payload, slide)


@app.get("/api/lessons/slides")
def list_lesson_slides(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    slides = db.query(LessonSlide).order_by(LessonSlide.lesson_id.asc()).all()
    return [serialize_lesson_slide(slide) for slide in slides]


@app.get("/api/lessons/{lesson_id}/slide")
def get_lesson_slide(
    lesson_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    slide = db.query(LessonSlide).filter(LessonSlide.lesson_id == lesson_id).first()
    if not slide:
        raise HTTPException(404, "Bài học chưa có slide PDF")
    encoded_name = quote(slide.file_name)
    return Response(
        content=slide.file_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{encoded_name}",
            "Content-Length": str(slide.file_size),
        },
    )


@app.post("/api/lessons/{lesson_id}/slide")
async def upload_lesson_slide(
    lesson_id: int,
    file: UploadFile = File(...),
    title: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "admin")),
):
    if lesson_id not in LESSON_TITLES:
        raise HTTPException(404, "Bài học không tồn tại")
    file_name = (file.filename or "").strip()
    if not file_name.lower().endswith(".pdf"):
        raise HTTPException(400, "Chỉ chấp nhận file PDF")
    file_data = await file.read(MAX_SLIDE_SIZE + 1)
    if not file_data.startswith(b"%PDF-"):
        raise HTTPException(400, "File tải lên không phải PDF hợp lệ")
    if len(file_data) > MAX_SLIDE_SIZE:
        raise HTTPException(400, "File PDF không được vượt quá 20 MB")

    slide = db.query(LessonSlide).filter(LessonSlide.lesson_id == lesson_id).first()
    if not slide:
        slide = LessonSlide(lesson_id=lesson_id, uploaded_by=current_user.id)
        db.add(slide)
    slide.title = title.strip() or LESSON_TITLES[lesson_id]
    slide.file_name = file_name[:255]
    slide.file_size = len(file_data)
    slide.file_data = file_data
    slide.uploaded_by = current_user.id
    slide.updated_at = datetime.utcnow()
    db.flush()
    add_log(
        db,
        current_user,
        "lesson_slide_uploaded",
        "lesson_slide",
        slide.id,
        {"lesson_id": lesson_id, "file_name": slide.file_name, "file_size": slide.file_size},
    )
    db.commit()
    db.refresh(slide)
    return serialize_lesson_slide(slide)


@app.delete("/api/lessons/{lesson_id}/slide")
def delete_lesson_slide(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "admin")),
):
    slide = db.query(LessonSlide).filter(LessonSlide.lesson_id == lesson_id).first()
    if not slide:
        raise HTTPException(404, "Bài học chưa có slide PDF")
    slide_id = slide.id
    db.delete(slide)
    add_log(db, current_user, "lesson_slide_deleted", "lesson_slide", slide_id, {"lesson_id": lesson_id})
    db.commit()
    return {"ok": True}


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
    current_user: User = Depends(require_role("teacher", "admin")),
):
    session = LabSession(
        **payload.model_dump(),
        qr_token=secrets.token_urlsafe(16),
        teacher_id=current_user.id if current_user.role == "teacher" else None,
        status="active",
    )
    db.add(session)
    db.flush()
    add_log(db, current_user, "session_created", "attendance_session", session.id, {"title": session.title})
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
    current_user: User = Depends(require_role("student")),
):
    class_ids = [
        row.class_id
        for row in db.query(ClassStudent).filter(ClassStudent.student_id == current_user.student_id).all()
    ]
    query = db.query(LabSession)
    query = query.filter(LabSession.qr_token != TEST_QR_TOKEN)
    if class_ids:
        query = query.filter((LabSession.class_id.in_(class_ids)) | (LabSession.class_id.is_(None)))
    return query.order_by(LabSession.start_time.asc()).all()


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
            "checkout_method": attendance.checkout_method,
            "checkout_at": attendance.checkout_at,
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
    add_log(db, current_user, "face_enrolled", "face_profile", profile.id, {"sample_count": len(vectors)})
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
        "face_image_path": current_user.student.face_image_path if current_user.student else None,
    }


@app.post("/api/student/face-access")
async def student_face_access(
    file: UploadFile = File(...),
    liveness_passed: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    profile = db.query(FaceProfile).filter(
        FaceProfile.student_id == current_user.student_id,
        FaceProfile.status == "active",
    ).first()
    if not profile:
        raise HTTPException(400, "Bạn cần đăng ký khuôn mặt trước")
    if not liveness_passed:
        raise HTTPException(400, "Chưa hoàn thành xác thực chuyển động")

    image_bytes = await file.read()
    thumbnail = create_face_thumbnail(image_bytes)
    probe_vector = extract_face_vector(image_bytes)
    if not thumbnail or not probe_vector:
        raise HTTPException(400, "Chưa phát hiện khuôn mặt rõ trong ảnh")

    try:
        stored_vectors = json.loads(profile.vectors_json or "[]")
    except json.JSONDecodeError:
        stored_vectors = []
    confidence = round(face_similarity(probe_vector, stored_vectors), 4)
    add_log(db, current_user, "face_access", "face_profile", profile.id, {
        "confidence_score": confidence,
        "liveness_passed": True,
    })
    db.commit()
    return {
        "ok": True,
        "confidence_score": confidence,
        "message": "Xác thực khuôn mặt thành công",
    }


@app.post("/api/check-in", response_model=AttendanceOut)
def check_out_by_qr(
    payload: CheckInRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "student":
        if not current_user.student or current_user.student.student_code != payload.student_code:
            raise HTTPException(403, "Sinh viên chỉ được điểm danh cho chính mình")
    student = db.query(Student).filter(Student.student_code == payload.student_code).first()
    if not student:
        raise HTTPException(404, "Không tìm thấy sinh viên")
    qr_token = normalize_qr_token(payload.qr_token)
    session = db.query(LabSession).filter(LabSession.qr_token == qr_token).first()
    if not session:
        raise HTTPException(404, "QR không hợp lệ")
    if session.status != "active":
        raise HTTPException(400, "Attendance session is closed")
    if session.class_id:
        enrolled = db.query(ClassStudent).filter(
            ClassStudent.class_id == session.class_id,
            ClassStudent.student_id == student.id,
        ).first()
        if not enrolled:
            raise HTTPException(403, "Student is not enrolled in this class")
    existing_attendance = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.session_id == session.id,
    ).first()
    if not existing_attendance:
        raise HTTPException(400, "Bạn chưa check-in bằng khuôn mặt cho buổi học này")
    if existing_attendance.status not in {"present", "late"}:
        raise HTTPException(400, "Check-in khuôn mặt chưa được giảng viên xác nhận")
    if existing_attendance.checkout_at:
        raise HTTPException(409, "Bạn đã check-out buổi học này rồi")
    now = datetime.utcnow()
    is_test_qr = session.qr_token == TEST_QR_TOKEN
    policy = db.query(SessionPolicy).filter(SessionPolicy.session_id == session.id).first()
    checkout_deadline = session.end_time.timestamp() + (policy.checkin_after_minutes if policy else 0) * 60
    if not is_test_qr and not (session.start_time.timestamp() <= now.timestamp() <= checkout_deadline):
        raise HTTPException(400, "Ngoài thời gian check-out")
    device_id = request.headers.get("x-device-id")
    shared_device = False if is_test_qr else flag_shared_device(
        db, student.id, session.id, device_id, phase="checkout"
    )
    if shared_device:
        db.commit()
        raise HTTPException(
            409,
            "Thiết bị này đã được dùng check-out cho sinh viên khác trong cùng buổi học",
        )
    existing_attendance.checkout_at = now
    existing_attendance.checkout_method = "QR"
    existing_attendance.checkout_device_id = device_id
    try:
        add_log(db, current_user, "qr_check_out", "attendance", existing_attendance.id, {
            "checkout_at": now.isoformat(),
        })
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Bạn đã check-out buổi học này rồi")
    db.refresh(existing_attendance)
    return existing_attendance

@app.post("/api/face-check-in")
async def face_check_in(
    request: Request,
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
    probe_vector = extract_face_vector(image_bytes)
    if not thumbnail:
        raise HTTPException(400, "Chưa phát hiện khuôn mặt rõ trong ảnh")
    if not probe_vector:
        raise HTTPException(400, "Could not extract face features")
    if not current_user.student:
        raise HTTPException(400, "Tài khoản sinh viên chưa liên kết hồ sơ")
    session = db.query(LabSession).filter(LabSession.id == session_id).first()
    if not session:
        raise HTTPException(404, "Không tìm thấy buổi học")
    if session.status != "active":
        raise HTTPException(400, "Attendance session is closed")
    if session.class_id:
        enrolled = db.query(ClassStudent).filter(
            ClassStudent.class_id == session.class_id,
            ClassStudent.student_id == current_user.student_id,
        ).first()
        if not enrolled:
            raise HTTPException(403, "Student is not enrolled in this class")
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

    try:
        stored_vectors = json.loads(profile.vectors_json or "[]")
    except json.JSONDecodeError:
        stored_vectors = []
    confidence = round(face_similarity(probe_vector, stored_vectors), 4)
    attendance_status = "present" if confidence >= 0.85 else "pending_review"
    device_id = request.headers.get("x-device-id")
    shared_device = (
        False
        if session.qr_token == TEST_QR_TOKEN
        else flag_shared_device(db, current_user.student.id, session.id, device_id)
    )
    if shared_device:
        attendance_status = "pending_review"
    attendance = Attendance(
        student_id=current_user.student.id,
        session_id=session.id,
        method="FACE",
        status=attendance_status,
        confidence_score=confidence,
        device_id=device_id,
    )
    db.add(attendance)
    try:
        db.flush()
        add_log(db, current_user, "face_check_in", "attendance", attendance.id, {
            "status": attendance_status,
            "confidence_score": confidence,
            "liveness_passed": liveness_passed,
        })
        flag_overlapping_attendance(db, current_user.student.id, session)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Bạn đã gửi điểm danh cho buổi học này")
    return {
        "ok": True,
        "status": attendance_status,
        "confidence_score": confidence,
        "message": (
            "Check-in khuôn mặt thành công"
            if attendance_status == "present"
            else "Đã gửi check-in khuôn mặt, đang chờ giảng viên xác nhận"
        ),
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
            Attendance.status.in_(["pending_face", "pending_review"]),
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
            "confidence_score": a.confidence_score,
            "review_note": a.review_note,
            "checked_at": a.checked_at,
            "checkout_method": a.checkout_method,
            "checkout_at": a.checkout_at,
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
    session.class_id = payload.class_id
    session.subject_id = payload.subject_id
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
            "face_image_path": student.face_image_path,
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


@app.get("/api/classes")
def list_classes(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = db.query(ClassRoom).order_by(ClassRoom.code.asc()).all()
    return [
        {
            "id": row.id,
            "code": row.code,
            "name": row.name,
            "teacher_id": row.teacher_id,
            "active": row.active,
            "student_count": db.query(ClassStudent).filter(ClassStudent.class_id == row.id).count(),
        }
        for row in rows
    ]


@app.post("/api/admin/classes")
def create_class(
    payload: ClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    row = ClassRoom(**payload.model_dump())
    db.add(row)
    try:
        db.flush()
        add_log(db, current_user, "class_created", "class", row.id, {"code": row.code})
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Class code already exists")
    db.refresh(row)
    return row


@app.delete("/api/admin/classes/{class_id}")
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    row = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not row:
        raise HTTPException(404, "Class not found")
    db.query(ClassStudent).filter(ClassStudent.class_id == class_id).delete()
    add_log(db, current_user, "class_deleted", "class", class_id, {"code": row.code})
    db.delete(row)
    db.commit()
    return {"ok": True}


@app.post("/api/admin/classes/{class_id}/students")
def add_class_student(
    class_id: int,
    payload: ClassStudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "teacher")),
):
    if not db.query(ClassRoom).filter(ClassRoom.id == class_id).first():
        raise HTTPException(404, "Class not found")
    if not db.query(Student).filter(Student.id == payload.student_id).first():
        raise HTTPException(404, "Student not found")
    row = ClassStudent(class_id=class_id, student_id=payload.student_id)
    db.add(row)
    try:
        db.flush()
        add_log(db, current_user, "student_added_to_class", "class", class_id, {"student_id": payload.student_id})
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Student is already in this class")
    return {"ok": True}


@app.get("/api/subjects")
def list_subjects(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Subject).order_by(Subject.code.asc()).all()


@app.post("/api/admin/subjects")
def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    row = Subject(**payload.model_dump())
    db.add(row)
    try:
        db.flush()
        add_log(db, current_user, "subject_created", "subject", row.id, {"code": row.code})
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Subject code already exists")
    db.refresh(row)
    return row


@app.delete("/api/admin/subjects/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    row = db.query(Subject).filter(Subject.id == subject_id).first()
    if not row:
        raise HTTPException(404, "Subject not found")
    add_log(db, current_user, "subject_deleted", "subject", subject_id, {"code": row.code})
    db.delete(row)
    db.commit()
    return {"ok": True}


@app.patch("/api/sessions/{session_id}/status")
def update_session_status(
    session_id: int,
    payload: SessionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "admin")),
):
    if payload.status not in {"active", "closed"}:
        raise HTTPException(400, "Status must be active or closed")
    row = db.query(LabSession).filter(LabSession.id == session_id).first()
    if not row:
        raise HTTPException(404, "Session not found")
    row.status = payload.status
    add_log(db, current_user, "session_status_changed", "attendance_session", row.id, {"status": row.status})
    db.commit()
    return {"ok": True, "status": row.status}


@app.patch("/api/instructor/attendance/{attendance_id}/review")
def review_attendance(
    attendance_id: int,
    payload: AttendanceReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "admin")),
):
    if payload.status not in {"present", "late", "rejected"}:
        raise HTTPException(400, "Invalid attendance review status")
    row = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not row:
        raise HTTPException(404, "Attendance not found")
    row.status = payload.status
    row.review_note = payload.review_note
    add_log(db, current_user, "attendance_reviewed", "attendance", row.id, {
        "status": row.status,
        "note": row.review_note,
    })
    db.commit()
    return {"ok": True, "status": row.status}


@app.post("/api/student/appeals")
def create_appeal(
    payload: AppealCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    if payload.attendance_id:
        attendance = db.query(Attendance).filter(
            Attendance.id == payload.attendance_id,
            Attendance.student_id == current_user.student_id,
        ).first()
        if not attendance:
            raise HTTPException(404, "Attendance record not found")
    row = Appeal(
        student_id=current_user.student_id,
        attendance_id=payload.attendance_id,
        session_id=payload.session_id,
        reason=payload.reason,
        evidence_name=payload.evidence_name,
    )
    db.add(row)
    db.flush()
    add_log(db, current_user, "appeal_created", "appeal", row.id)
    db.commit()
    return {"ok": True, "id": row.id, "status": row.status}


@app.get("/api/student/appeals")
def student_appeals(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
):
    return db.query(Appeal).filter(
        Appeal.student_id == current_user.student_id,
    ).order_by(Appeal.created_at.desc()).all()


@app.get("/api/instructor/appeals")
def instructor_appeals(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher", "admin")),
):
    rows = (
        db.query(Appeal, Student, LabSession)
        .join(Student, Appeal.student_id == Student.id)
        .outerjoin(LabSession, Appeal.session_id == LabSession.id)
        .order_by(Appeal.created_at.desc())
        .all()
    )
    return [
        {
            "id": appeal.id,
            "student_code": student.student_code,
            "full_name": student.full_name,
            "class_name": student.class_name,
            "attendance_id": appeal.attendance_id,
            "session_id": appeal.session_id,
            "session_title": session.title if session else None,
            "reason": appeal.reason,
            "evidence_name": appeal.evidence_name,
            "status": appeal.status,
            "review_note": appeal.review_note,
            "created_at": appeal.created_at,
        }
        for appeal, student, session in rows
    ]


@app.patch("/api/instructor/appeals/{appeal_id}")
def review_appeal(
    appeal_id: int,
    payload: AppealReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "admin")),
):
    if payload.status not in {"approved", "rejected"}:
        raise HTTPException(400, "Invalid appeal status")
    row = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not row:
        raise HTTPException(404, "Appeal not found")
    row.status = payload.status
    row.review_note = payload.review_note
    row.reviewer_id = current_user.id
    row.reviewed_at = datetime.utcnow()
    if payload.status == "approved" and row.attendance_id:
        attendance = db.query(Attendance).filter(Attendance.id == row.attendance_id).first()
        if attendance:
            attendance.status = "present"
            attendance.review_note = payload.review_note
    add_log(db, current_user, "appeal_reviewed", "appeal", row.id, {"status": row.status})
    db.commit()
    return {"ok": True, "status": row.status}


@app.get("/api/reports/attendance")
def attendance_report(
    session_id: int | None = None,
    class_id: int | None = None,
    subject_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher", "admin")),
):
    query = db.query(Attendance, Student, LabSession).join(
        Student, Attendance.student_id == Student.id,
    ).join(LabSession, Attendance.session_id == LabSession.id)
    if session_id:
        query = query.filter(LabSession.id == session_id)
    if class_id:
        query = query.filter(LabSession.class_id == class_id)
    if subject_id:
        query = query.filter(LabSession.subject_id == subject_id)
    if date_from:
        query = query.filter(LabSession.start_time >= date_from)
    if date_to:
        query = query.filter(LabSession.start_time <= date_to)
    rows = query.order_by(LabSession.start_time.desc(), Student.student_code.asc()).all()
    records = [
        {
            "attendance_id": attendance.id,
            "session_id": session.id,
            "session_title": session.title,
            "class_id": session.class_id,
            "subject_id": session.subject_id,
            "student_code": student.student_code,
            "full_name": student.full_name,
            "class_name": student.class_name,
            "status": attendance.status,
            "method": attendance.method,
            "confidence_score": attendance.confidence_score,
            "checked_at": attendance.checked_at,
            "checkout_method": attendance.checkout_method,
            "checkout_at": attendance.checkout_at,
        }
        for attendance, student, session in rows
    ]
    if session_id:
        selected_session = db.query(LabSession).filter(LabSession.id == session_id).first()
        if selected_session and selected_session.class_id:
            present_student_ids = {attendance.student_id for attendance, _, _ in rows}
            class_rows = (
                db.query(Student)
                .join(ClassStudent, ClassStudent.student_id == Student.id)
                .filter(ClassStudent.class_id == selected_session.class_id)
                .order_by(Student.student_code.asc())
                .all()
            )
            for student in class_rows:
                if student.id not in present_student_ids:
                    records.append({
                        "attendance_id": f"absent-{student.id}",
                        "session_id": selected_session.id,
                        "session_title": selected_session.title,
                        "class_id": selected_session.class_id,
                        "subject_id": selected_session.subject_id,
                        "student_code": student.student_code,
                        "full_name": student.full_name,
                        "class_name": student.class_name,
                        "status": "absent",
                        "method": "",
                        "confidence_score": None,
                        "checked_at": None,
                        "checkout_method": None,
                        "checkout_at": None,
                    })
    summary = {
        "present": sum(row["status"] == "present" for row in records),
        "late": sum(row["status"] == "late" for row in records),
        "pending_review": sum(row["status"] in {"pending_review", "pending_face"} for row in records),
        "rejected": sum(row["status"] == "rejected" for row in records),
        "absent": sum(row["status"] == "absent" for row in records),
        "total": len(records),
    }
    return {"summary": summary, "records": records}


@app.get("/api/admin/logs")
def admin_logs(
    limit: int = 200,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    return db.query(AttendanceLog).order_by(
        AttendanceLog.created_at.desc(),
    ).limit(min(max(limit, 1), 1000)).all()
