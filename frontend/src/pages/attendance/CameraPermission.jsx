import React, { useState } from 'react';
import { Camera, ShieldCheck } from 'lucide-react';
import { describeCameraError } from '../../lib/media';

export function CameraPermission({ onGranted }) {
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState('');

  async function requestCameraPermission() {
    setRequesting(true);
    setMessage('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trình duyệt này không hỗ trợ camera.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      stream.getTracks().forEach(track => track.stop());
      localStorage.setItem('vinlab-camera-permission', 'granted');
      onGranted();
    } catch (error) {
      setMessage(`❌ ${describeCameraError(error)}`);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <section className="camera-permission-card">
      <div className="camera-permission-icon"><Camera size={34} /></div>
      <p className="section-kicker">Thiết lập lần đầu</p>
      <h3>Cho phép sử dụng camera</h3>
      <p className="camera-permission-description">
        VINLAB cần camera để quét mã QR và xác thực khuôn mặt. Bạn chỉ cần cho phép một lần;
        những lần mở ứng dụng sau sẽ không hiện lại bước này.
      </p>
      <div className="camera-permission-note">
        <ShieldCheck size={20} />
        <span>Camera chỉ hoạt động trong màn hình điểm danh và sẽ tự tắt khi bạn chuyển trang.</span>
      </div>
      <button
        type="button"
        className="btn mt-6 w-full sm:w-auto"
        onClick={requestCameraPermission}
        disabled={requesting}
      >
        <Camera size={18} />{requesting ? 'Đang xin quyền...' : 'Cho phép camera'}
      </button>
      {message && <div className="result-message mt-4">{message}</div>}
    </section>
  );
}
