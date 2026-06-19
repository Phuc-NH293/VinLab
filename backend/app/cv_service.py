"""
MVP Computer Vision module.
Hiện tại module này detect có mặt người trong frame bằng OpenCV Haar Cascade.
Bước nâng cấp: thay bằng face embedding/FaceNet/InsightFace để nhận diện sinh viên thật.
"""
import base64
import cv2
import numpy as np

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

def detect_face(image_bytes: bytes) -> bool:
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return False
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 5)
    return len(faces) > 0


def create_face_thumbnail(image_bytes: bytes) -> str | None:
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 5)
    if len(faces) == 0:
        return None
    x, y, width, height = max(faces, key=lambda face: face[2] * face[3])
    margin = int(max(width, height) * 0.28)
    x1 = max(0, x - margin)
    y1 = max(0, y - margin)
    x2 = min(img.shape[1], x + width + margin)
    y2 = min(img.shape[0], y + height + margin)
    face = img[y1:y2, x1:x2]
    face = cv2.resize(face, (180, 180), interpolation=cv2.INTER_AREA)
    success, encoded = cv2.imencode(".jpg", face, [cv2.IMWRITE_JPEG_QUALITY, 78])
    if not success:
        return None
    return f"data:image/jpeg;base64,{base64.b64encode(encoded).decode()}"
