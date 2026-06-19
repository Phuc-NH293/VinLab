"""
MVP Computer Vision module.
Hiện tại module này detect có mặt người trong frame bằng OpenCV Haar Cascade.
Bước nâng cấp: thay bằng face embedding/FaceNet/InsightFace để nhận diện sinh viên thật.
"""
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
