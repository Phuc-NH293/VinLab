import React from 'react';
import { LogOut, ScanFace } from 'lucide-react';
import { BrandMark } from '../../components';
import { FaceEnrollment } from '../attendance';

export function StudentFaceSetup({ currentUser, profile, onComplete, onLogout }) {
  return (
    <main className="face-setup-page">
      <header className="face-setup-header">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <strong>VINLAB</strong>
            <p>Thiết lập tài khoản sinh viên</p>
          </div>
        </div>
        <button type="button" className="logout-button" onClick={onLogout}>
          <LogOut size={18} />Đăng xuất
        </button>
      </header>
      <div className="face-setup-layout">
        <section className="face-setup-intro">
          <div className="face-setup-icon"><ScanFace size={34} /></div>
          <p className="section-kicker">Xác thực lần đầu</p>
          <h1>Đăng ký khuôn mặt để hoàn tất tài khoản</h1>
          <p>
            Xin chào <strong>{currentUser.full_name}</strong>. Hãy chụp từ 3 đến 5 góc mặt rõ nét.
            Sau khi hoàn tất, ảnh đại diện và dữ liệu BFace sẽ được lưu trong hệ thống quản trị.
          </p>
          <div className="face-setup-steps">
            <span><b>1</b>Mở camera trước</span>
            <span><b>2</b>Chụp tối thiểu 3 mẫu</span>
            <span><b>3</b>Xác nhận đăng ký</span>
          </div>
        </section>
        <FaceEnrollment profile={profile} onComplete={onComplete} required />
      </div>
    </main>
  );
}
