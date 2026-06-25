import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, ScanFace, ShieldCheck } from 'lucide-react';
import { api, API, authHeaders } from '../../lib/api';
import { SectionHeading } from '../../components';
import { describeCameraError, drawVideoFrame, canvasToJpegFile } from '../../lib/media';

export function FaceEnrollment({ profile, onComplete, required = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [samples, setSamples] = useState([]);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrollmentFailed, setEnrollmentFailed] = useState(false);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'user' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true);
    } catch (error) {
      setEnrollmentFailed(false);
      setMessage(`❌ ${describeCameraError(error)}`);
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }

  useEffect(() => stop, []);

  async function captureSample() {
    const video = videoRef.current;
    if (!video?.videoWidth || samples.length >= 5) return;
    const canvas = document.createElement('canvas');
    drawVideoFrame(canvas, video, true);
    const file = await canvasToJpegFile(canvas, `face-sample-${samples.length + 1}.jpg`);
    if (file) setSamples(current => [...current, file]);
  }

  async function enroll() {
    if (samples.length < 3) {
      setEnrollmentFailed(false);
      setMessage('❌ Cần chụp ít nhất 3 góc mặt.');
      return;
    }
    setEnrollmentFailed(false);
    setLoading(true);
    try {
      const formData = new FormData();
      samples.forEach(file => formData.append('files', file));
      const response = await fetch(`${API}/student/face-enrollment`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Không thể đăng ký khuôn mặt');
      setMessage(`✅ ${data.message}`);
      setSamples([]);
      stop();
      await onComplete();
    } catch (error) {
      setEnrollmentFailed(true);
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function retryEnrollment() {
    stop();
    setSamples([]);
    setMessage('');
    setEnrollmentFailed(false);
    await start();
  }

  return (
    <section className={`card ${required ? 'face-enrollment-required' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <SectionHeading icon={ScanFace} kicker="Face Enrollment" title="Đăng ký khuôn mặt" />
        <span className={`attendance-status ${profile.enrolled ? 'attendance-present' : 'attendance-absent'}`}>
          {profile.enrolled ? 'Đã đăng ký' : 'Chưa đăng ký'}
        </span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-500">
        Chụp 3–5 góc mặt. Hệ thống lưu vector đặc trưng và một ảnh đại diện thu nhỏ để quản trị viên đối chiếu.
      </p>
      <div className="enrollment-camera mt-5">
        <video ref={videoRef} autoPlay muted playsInline />
        {!active && <div><ScanFace size={36} /><p>Bật camera trước để bắt đầu</p></div>}
      </div>
      <div className="mt-3 flex gap-2">
        {!active
          ? <button type="button" className="btn w-full" onClick={start}><Camera size={17} />Mở camera</button>
          : <button type="button" className="btn w-full" onClick={captureSample} disabled={samples.length >= 5}><Camera size={17} />Chụp mẫu {samples.length + 1}</button>}
        {active && <button type="button" className="btn-secondary" onClick={stop}>Dừng</button>}
      </div>
      <div className="sample-progress mt-4">
        {[0, 1, 2, 3, 4].map(index => <span key={index} className={index < samples.length ? 'sample-done' : ''}>{index + 1}</span>)}
      </div>
      <button type="button" className="face-scan-button mt-4 w-full" onClick={enroll} disabled={samples.length < 3 || loading}>
        <ShieldCheck size={17} />{loading ? 'Đang trích xuất vector...' : 'Lưu vector khuôn mặt'}
      </button>
      {message && (
        <div className={`result-message mt-4 ${enrollmentFailed ? 'enrollment-error' : ''}`}>
          <span>{message}</span>
          {enrollmentFailed && (
            <button type="button" className="enrollment-retry-button" onClick={retryEnrollment}>
              <RefreshCw size={16} />Thử lại
            </button>
          )}
        </div>
      )}
    </section>
  );
}
