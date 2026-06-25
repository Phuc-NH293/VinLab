import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Activity, ArrowRight, MapPin, ScanFace, Sparkles } from 'lucide-react';

import { BrandMark } from '../components';

export function WelcomeScreen({ onGoToLogin }) {
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep(current => (current === 4 ? 1 : current + 1));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="welcome-container">
      <header className="welcome-header">
        <div className="welcome-nav">
          <a href="#" className="flex items-center gap-3">
            <BrandMark />
          </a>

          <nav className="welcome-nav-links">
            <a href="#">Trang chủ</a>
            <a href="#about">Giới thiệu</a>
            <a href="#features">Tính năng</a>
            <a href="#roadmap">Quy trình</a>
          </nav>

          <div className="welcome-nav-actions">
            <button type="button" className="welcome-btn welcome-btn-secondary py-2 px-4" onClick={onGoToLogin}>
              Đăng nhập
            </button>
          </div>
        </div>
      </header>

      <section className="welcome-hero">
        <div className="welcome-hero-content">
          <div className="welcome-eyebrow">
            <Sparkles size={13} /> Nền tảng điểm danh thông minh
          </div>
          <h1>
            Điểm danh <span>nhanh hơn</span>, Xác thực <span>sâu hơn</span>
          </h1>
          <p>
            VinLab kết hợp AI nhận dạng khuôn mặt, Geofencing tọa độ phòng thực hành và Liveness check chống giả mạo để mang lại độ trung thực tuyệt đối.
          </p>
          <div className="welcome-hero-actions">
            <button type="button" className="welcome-btn welcome-btn-primary" onClick={onGoToLogin}>
              Bắt đầu điểm danh <ArrowRight size={16} />
            </button>
            <a href="#about" className="welcome-btn welcome-btn-secondary">
              Xem cách hoạt động
            </a>
          </div>
        </div>

        <div className="welcome-hero-visual">
          <div className="welcome-scan-box">
            <div className="welcome-scan-grid" />
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400" 
              className="welcome-scan-avatar" 
              alt="Scan Demo" 
            />
            <div className="welcome-scan-line" />
            <div className="welcome-scan-status">
              <div>
                <span className="block font-bold text-blue-700">📍 PHÒNG LAB 402</span>
                <span className="block text-[10px] text-slate-400">Mã: SV1029 — Độ trùng khớp: 98.6%</span>
              </div>
              <span className="rounded-md bg-emerald-500/20 px-2 py-1 text-[10px] font-black text-emerald-400">
                XÁC THỰC XONG
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="welcome-stats">
        <div className="welcome-stat">
          <strong>50,000+</strong>
          <span>Lượt điểm danh</span>
        </div>
        <div className="welcome-stat">
          <strong>99.9%</strong>
          <span>Độ chính xác</span>
        </div>
        <div className="welcome-stat">
          <strong>15+</strong>
          <span>Phòng thực hành</span>
        </div>
        <div className="welcome-stat">
          <strong>&lt; 2s</strong>
          <span>Thời gian quét</span>
        </div>
      </section>

      <section id="about" className="welcome-section">
        <div className="welcome-section-header">
          <div className="welcome-eyebrow">Tầm nhìn VinLab</div>
          <h2>Không chỉ điểm danh. VinLab bảo vệ <span>sự trung thực</span>.</h2>
          <p>
            So sánh phương thức điểm danh truyền thống với nền tảng điểm danh tự động hóa bằng sinh trắc học của VinLab.
          </p>
        </div>

        <div className="welcome-compare-grid">
          <div className="welcome-compare-card">
            <h3>Phương pháp truyền thống</h3>
            <ul className="welcome-compare-list">
              <li>
                <span className="text-red-500">❌</span> Ký tên giấy mất thời gian và dễ thất lạc.
              </li>
              <li>
                <span className="text-red-500">❌</span> Sinh viên gửi mã QR điểm danh hộ từ xa.
              </li>
              <li>
                <span className="text-red-500">❌</span> Giảng viên mất 15-20 phút đầu giờ chỉ để điểm danh lớp đông.
              </li>
            </ul>
          </div>

          <div className="welcome-compare-card welcome-compare-card-active">
            <h3>Giải pháp VinLab</h3>
            <ul className="welcome-compare-list">
              <li>
                <span className="text-emerald-500">✅</span> Quét khuôn mặt trong 2 giây bằng camera thiết bị cá nhân.
              </li>
              <li>
                <span className="text-emerald-500">✅</span> Liveness Check & Geofence chống điểm danh hộ hoàn toàn.
              </li>
              <li>
                <span className="text-emerald-500">✅</span> Báo cáo tự động được lưu trữ đám mây và kết xuất Excel chỉ trong 1 click.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="features" className="welcome-section">
        <div className="welcome-section-header">
          <div className="welcome-eyebrow">Tính năng cốt lõi</div>
          <h2>Công nghệ điểm danh <span>hàng đầu</span></h2>
          <p>
            Mỗi tính năng được thiết kế tỉ mỉ để tối ưu hiệu suất và tăng cường tính bảo mật.
          </p>
        </div>

        <div className="welcome-features-grid">
          <div className="welcome-feature-card">
            <div className="welcome-feature-icon">
              <ScanFace size={22} />
            </div>
            <h3>Xác thực khuôn mặt AI</h3>
            <p>Nhận diện chính xác từng sinh viên và đối chiếu với dữ liệu khuôn mặt đã đăng ký an toàn.</p>
          </div>

          <div className="welcome-feature-card">
            <div className="welcome-feature-icon">
              <MapPin size={22} />
            </div>
            <h3>Ranh giới địa lý (Geofencing)</h3>
            <p>Yêu cầu sinh viên phải ở đúng tọa độ GPS của phòng Lab trong khoảng bán kính cho phép.</p>
          </div>

          <div className="welcome-feature-card">
            <div className="welcome-feature-icon">
              <Activity size={22} />
            </div>
            <h3>Liveness Check thông minh</h3>
            <p>Phát hiện chuyển động để tránh các hình thức gian lận bằng hình ảnh hoặc video tĩnh.</p>
          </div>
        </div>
      </section>

      <section id="roadmap" className="welcome-section">
        <div className="welcome-timeline-section">
          <div className="welcome-timeline-copy">
            <h2>Quy trình điểm danh <span>thích ứng</span></h2>
            <p>
              Giảng viên chỉ cần mở buổi thực hành, hệ thống sẽ tự động điều phối sinh viên quét khuôn mặt và ghi nhận chuyên cần.
            </p>
            <p>
              Sau khi điểm danh hoàn tất, dữ liệu lập tức được đồng bộ hóa với bảng điều khiển giảng viên theo thời gian thực.
            </p>
            <button type="button" className="welcome-btn welcome-btn-primary mt-4" onClick={onGoToLogin}>
              Trải nghiệm ngay
            </button>
          </div>

          <div className="welcome-timeline-mock">
            <h3 className="font-extrabold text-white text-base border-b border-slate-800 pb-3">Phiên thực hành Lab</h3>
            <div className="welcome-timeline-steps">
              <div className={`welcome-timeline-step ${activeStep >= 1 ? (activeStep > 1 ? 'welcome-timeline-completed' : 'welcome-timeline-active') : ''}`}>
                <div className="welcome-timeline-badge">{activeStep > 1 ? '✓' : '1'}</div>
                <div className="welcome-timeline-step-content">
                  <span>Đăng nhập hệ thống</span>
                  <small>Xác thực vai trò và thông tin cá nhân</small>
                </div>
              </div>

              <div className={`welcome-timeline-step ${activeStep >= 2 ? (activeStep > 2 ? 'welcome-timeline-completed' : 'welcome-timeline-active') : ''}`}>
                <div className="welcome-timeline-badge">{activeStep > 2 ? '✓' : '2'}</div>
                <div className="welcome-timeline-step-content">
                  <span>Quét khuôn mặt điểm danh</span>
                  <small>Kiểm tra camera & Liveness Check bắt buộc</small>
                </div>
              </div>

              <div className={`welcome-timeline-step ${activeStep >= 3 ? (activeStep > 3 ? 'welcome-timeline-completed' : 'welcome-timeline-active') : ''}`}>
                <div className="welcome-timeline-badge">{activeStep > 3 ? '✓' : '3'}</div>
                <div className="welcome-timeline-step-content">
                  <span>Đối chiếu GPS & Vị trí phòng Lab</span>
                  <small>Đảm bảo sinh viên đang có mặt tại phòng thực hành</small>
                </div>
              </div>

              <div className={`welcome-timeline-step ${activeStep >= 4 ? (activeStep > 4 ? 'welcome-timeline-completed' : 'welcome-timeline-active') : ''}`}>
                <div className="welcome-timeline-badge">{activeStep > 4 ? '✓' : '4'}</div>
                <div className="welcome-timeline-step-content">
                  <span>Ghi nhận chuyên cần</span>
                  <small>Đồng bộ tức thì lên bảng điểm của giảng viên</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="welcome-cta-section">
        <h2>Sẵn sàng bắt đầu số hóa?</h2>
        <p>Tham gia hàng nghìn sinh viên và giảng viên đang sử dụng VinLab mỗi ngày.</p>
        <button type="button" className="welcome-btn welcome-btn-secondary text-slate-900 bg-white" onClick={onGoToLogin}>
          Đăng nhập tài khoản VinLab
        </button>
      </section>

      <footer className="welcome-footer">
        <div className="welcome-footer-grid">
          <div className="welcome-footer-brand">
            <span className="flex items-center gap-2 mb-3">
              <BrandMark />
            </span>
            <p>Hệ thống quản lý điểm danh và bảo mật phòng Lab thông minh.</p>
          </div>
          <div className="welcome-footer-links">
            <h3>Sản phẩm</h3>
            <ul>
              <li><a href="#">Xác thực khuôn mặt</a></li>
              <li><a href="#">Geofencing GPS</a></li>
              <li><a href="#">AI Anomaly Detection</a></li>
            </ul>
          </div>
          <div className="welcome-footer-links">
            <h3>Hỗ trợ</h3>
            <ul>
              <li><a href="#">Trung tâm hỗ trợ</a></li>
              <li><a href="#">Hướng dẫn sử dụng</a></li>
              <li><a href="#">Quy trình bảo mật</a></li>
            </ul>
          </div>
          <div className="welcome-footer-links">
            <h3>Pháp lý</h3>
            <ul>
              <li><a href="#">Điều khoản sử dụng</a></li>
              <li><a href="#">Chính sách bảo mật</a></li>
              <li><a href="#" onClick={onGoToLogin}>Đăng nhập</a></li>
            </ul>
          </div>
        </div>
        <div className="welcome-copyright">
          © 2026 VinLab. All rights reserved. Built with passion.
        </div>
      </footer>
    </div>
  );
}
