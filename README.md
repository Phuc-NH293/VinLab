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

### Cấu hình Gemini cho AI Chat

Đặt biến môi trường trước khi chạy backend:

```powershell
$env:GEMINI_API_KEY="your-gemini-api-key"
$env:GEMINI_MODEL="gemini-2.5-flash" # không bắt buộc
```

AI Chat sẽ ưu tiên đọc PDF slide của bài học và trả về trích dẫn theo số trang. Nếu slide
không có thông tin liên quan hoặc chưa được tải lên, Gemini sẽ trả lời bằng kiến thức chung.

### Database production

Local development mặc định dùng `backend/lab_attendance.db`. Khi chạy trên Vercel, backend
bắt buộc phải có `DATABASE_URL` trỏ tới PostgreSQL; ứng dụng không dùng SQLite tạm trong
`/tmp` để tránh mất mã QR và dữ liệu giữa các request.

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

## Tài khoản thử nghiệm

- Giảng viên: `gv001` / `VinLab@123`
- Sinh viên: `sv001` / `VinLab@123`
- Admin: `admin001` / `VinLab@123`

API sử dụng JWT với thời hạn phiên mặc định 8 giờ. Sinh viên chỉ được truy cập màn điểm danh
và chỉ có thể điểm danh cho chính tài khoản của mình; giảng viên có quyền quản lý lớp học.

## Phạm vi MVP ba vai trò

- Sinh viên: đăng ký 3–5 mẫu khuôn mặt, điểm danh QR/khuôn mặt, GPS, kiểm tra chuyển động,
  lịch học, lịch sử chuyên cần và đơn xin phép.
- Giảng viên/TA: bảng điều khiển realtime, xác nhận hàng loạt điểm danh khuôn mặt,
  ghi đè thủ công, duyệt đơn và xuất CSV.
- Admin: phân quyền, phòng Lab, GPS/Wi‑Fi/camera, thời khóa biểu, Face Vector DB và cảnh báo.

Trình duyệt không cho phép đọc SSID/BSSID Wi‑Fi. Việc xác minh Wi‑Fi thật cần native mobile app
hoặc device agent. Vector khuôn mặt hiện là bộ đặc trưng MVP và cần thay bằng InsightFace/FaceNet
trước khi áp dụng thực tế.

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
