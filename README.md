# VinLab

Ứng dụng quản lý và điểm danh phòng thực hành thông minh, tối ưu cho máy tính và điện thoại.

## Bản triển khai

- Web: https://vinlab-attendance-web.vercel.app
- API: https://vinlab-attendance-api.vercel.app/api

MVP hệ thống quản lý và điểm danh Lab thông minh:
- Quản lý sinh viên
- Tạo buổi lab + QR token
- Sinh viên dùng điện thoại scan QR để điểm danh
- API xem danh sách điểm danh theo buổi
- Module Computer Vision MVP: detect khuôn mặt bằng OpenCV

## Chạy backend
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Backend chạy ở: http://localhost:8000

## Chạy frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend chạy ở: http://localhost:5173

## Triển khai tự động

Repository được kết nối với hai dự án Vercel:

- `frontend/` → `vinlab-attendance-web`
- `backend/` → `vinlab-attendance-api`

Mỗi lần đẩy code lên nhánh `main`, Vercel tự động build và cập nhật bản production.

## Luồng demo
1. Vào tab Sinh viên, thêm SV001.
2. Vào tab Buổi lab, tạo buổi lab. App sinh QR.
3. Mở web bằng điện thoại cùng mạng hoặc dùng local tunnel.
4. Vào tab Điểm danh, nhập mã sinh viên rồi scan QR.
5. Quay lại Buổi lab, bấm Xem điểm danh.

## Nâng cấp Computer Vision thật
MVP hiện tại chỉ phát hiện có mặt trong ảnh. Để nhận diện đúng sinh viên:
1. Thêm bảng `face_embeddings`.
2. Khi đăng ký, chụp 3-5 ảnh/sinh viên.
3. Dùng InsightFace hoặc FaceNet sinh vector embedding.
4. Khi điểm danh, so sánh cosine similarity với embedding đã lưu.
5. Chỉ cho điểm danh nếu similarity > ngưỡng, ví dụ 0.45-0.6 tùy model.
