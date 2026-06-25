import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Camera, MapPin, ScanFace, ShieldCheck } from 'lucide-react';
import { api, API, authHeaders } from '../../lib/api';
import { BrandMark } from '../../components';
import { describeCameraError, getCaptureMetadata, getLocationName, captureLivenessFrame, drawVideoFrame, stampCaptureMetadata, canvasToJpegFile } from '../../lib/media';

export function ForcedFaceCheckIn({ currentUser, session, onComplete, onLogout }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const startupPromiseRef = useRef(null);
  const stopPromiseRef = useRef(null);
  const disposedRef = useRef(false);
  const mountedRef = useRef(false);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [livenessChecking, setLivenessChecking] = useState(false);
  const [liveStamp, setLiveStamp] = useState({
    time: '--:--:--',
    date: '--/--/----',
    location: 'Đang xác định địa điểm...',
    accuracy: null,
  });

  useEffect(() => {
    let active = true;
    let watchId = null;
    let requestSequence = 0;
    let hasPosition = false;

    const updatePosition = async position => {
      if (!active) return;
      hasPosition = true;
      const sequence = ++requestSequence;
      const { latitude, longitude, accuracy } = position.coords;
      setLiveStamp(current => ({
        ...current,
        location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        accuracy: Math.round(accuracy) || null,
      }));
      const location = await getLocationName(latitude, longitude);
      if (!active || sequence !== requestSequence) return;
      setLiveStamp(current => ({
        ...current,
        location,
        accuracy: Math.round(accuracy) || null,
      }));
    };

    const handlePositionError = error => {
      if (!active || hasPosition) return;
      setLiveStamp(current => ({
        ...current,
        location: error?.code === 1
          ? 'Chưa được cấp quyền vị trí'
          : 'Đang thử lấy lại vị trí...',
        accuracy: null,
      }));
    };

    const requestFreshPosition = () => {
      navigator.geolocation?.getCurrentPosition(
        updatePosition,
        handlePositionError,
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    };

    if (navigator.geolocation) {
      requestFreshPosition();
      watchId = navigator.geolocation.watchPosition(
        updatePosition,
        handlePositionError,
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      );
    } else {
      handlePositionError();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestFreshPosition();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', requestFreshPosition);
    window.addEventListener('online', requestFreshPosition);
    const locationRetryTimer = window.setInterval(requestFreshPosition, 15000);

    const updateClock = () => {
      const now = new Date();
      setLiveStamp(current => ({
        ...current,
        time: now.toLocaleTimeString('vi-VN', { hour12: false }),
        date: now.toLocaleDateString('vi-VN'),
      }));
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => {
      active = false;
      requestSequence += 1;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', requestFreshPosition);
      window.removeEventListener('online', requestFreshPosition);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      window.clearInterval(locationRetryTimer);
      window.clearInterval(timer);
    };
  }, []);

  const stopFaceCamera = useCallback(async () => {
    if (stopPromiseRef.current) return stopPromiseRef.current;
    disposedRef.current = true;
    stopPromiseRef.current = (async () => {
      try {
        await startupPromiseRef.current;
      } catch {
        // Camera startup errors are handled below.
      }
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    })().finally(() => {
      stopPromiseRef.current = null;
    });
    return stopPromiseRef.current;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    disposedRef.current = false;
    async function startCamera() {
      try {
        setCameraReady(false);
        setCameraFailed(false);
        setMessage('');
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Trình duyệt không hỗ trợ camera');
        }
        const startupPromise = navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        });
        startupPromiseRef.current = startupPromise;
        const stream = await startupPromise;
        startupPromiseRef.current = null;
        if (disposedRef.current || !mountedRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraReady(true);
        setCameraFailed(false);
      } catch (error) {
        startupPromiseRef.current = null;
        if (disposedRef.current || !mountedRef.current) return;
        setCameraReady(false);
        setCameraFailed(true);
        const detail = error?.name === 'OverconstrainedError' || error?.name === 'NotFoundError'
          ? 'Không tìm thấy camera trước. Xác thực khuôn mặt không sử dụng camera sau.'
          : describeCameraError(error);
        setMessage(`❌ ${detail}`);
      }
    }
    startCamera();
    return () => {
      mountedRef.current = false;
      stopFaceCamera();
    };
  }, [cameraAttempt]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function setSelectedPhoto(file) {
    if (!file) return;
    setPhoto(file);
    setPreview(current => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setMessage('Ảnh đã sẵn sàng, bấm Điểm danh để gửi.');
  }

  async function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) {
      setMessage('❌ Camera chưa sẵn sàng.');
      return;
    }
    setCapturing(true);
    try {
      let verifiedLiveness = livenessPassed;
      if (!verifiedLiveness) {
        verifiedLiveness = await runLivenessCheck();
        if (!verifiedLiveness) return;
      }
      setMessage('Đang lấy thời gian và vị trí...');
      drawVideoFrame(canvas, video, true);
      const metadata = await getCaptureMetadata();
      stampCaptureMetadata(canvas, metadata);
      const file = await canvasToJpegFile(canvas, 'face-camera.jpg');
      if (file) setSelectedPhoto(file);
    } finally {
      setCapturing(false);
    }
  }

  async function runLivenessCheck() {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      setMessage('❌ Camera chưa sẵn sàng.');
      return false;
    }
    setLivenessChecking(true);
    setLivenessPassed(false);
    setMessage('Hãy nháy mắt hoặc quay nhẹ khuôn mặt...');
    const firstFrame = captureLivenessFrame(video);
    await new Promise(resolve => setTimeout(resolve, 1600));
    const secondFrame = captureLivenessFrame(video);
    let difference = 0;
    for (let index = 0; index < firstFrame.length; index += 16) {
      difference += Math.abs(firstFrame[index] - secondFrame[index]);
    }
    const score = difference / (firstFrame.length / 16);
    const passed = score > 3.2;
    setLivenessPassed(passed);
    setMessage(passed ? '✅ Đã xác nhận chuyển động khuôn mặt.' : '❌ Chưa thấy chuyển động rõ, hãy thử lại.');
    setLivenessChecking(false);
    return passed;
  }

  async function upload() {
    if (!photo) {
      setMessage('❌ Hãy chụp khuôn mặt trước khi gửi.');
      return;
    }
    if (!livenessPassed) {
      setMessage('❌ Ảnh chưa được xác thực chuyển động. Hãy chụp lại.');
      return;
    }
    setLoading(true);
    setMessage('Đang xác thực khuôn mặt...');
    try {
      const formData = new FormData();
      formData.append('file', photo);
      formData.append('liveness_passed', 'true');
      const response = await fetch(`${API}/student/face-access`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Không thể xác thực khuôn mặt');
      setMessage(`✅ ${data.message}`);
      
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-ambient login-ambient-one" />
      <div className="login-ambient login-ambient-two" />
      
      <section className="login-brand-panel flex flex-col justify-between">
        <div>
          <BrandMark />
          <span className="login-brand-name">VINLAB</span>
          <div className="login-brand-content mt-8">
            <p className="eyebrow"><ScanFace size={15} />Bắt buộc điểm danh</p>
            <h1>Xác thực khuôn mặt để vào hệ thống</h1>
            <p className="mt-4">
              Lớp học của bạn đang diễn ra buổi thực hành: <strong>{session.title}</strong> tại phòng <strong>{session.room}</strong>.
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Bạn cần thực hiện điểm danh bằng khuôn mặt để tiếp tục sử dụng cổng thông tin sinh viên và các tính năng khác.
            </p>
          </div>
        </div>

        <div className="login-features pt-6 border-t border-white/10">
          <span><ShieldCheck size={17} />Liveness Check hoạt động</span>
          <span><MapPin size={17} />Geofence định vị phòng Lab</span>
        </div>
      </section>

      <main className="login-form-panel">
        <div className="login-card max-w-lg w-full">
          <h2 className="text-xl font-black text-slate-900">Quét khuôn mặt</h2>
          <p className="text-xs text-slate-500 mt-1">Vui lòng điều chỉnh khuôn mặt vào đúng khung hình camera trước.</p>

          <div className="relative mt-5 overflow-hidden rounded-2xl bg-slate-950 aspect-[4/3] flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 h-full w-full object-cover scale-x-[-1] ${preview ? 'invisible' : ''}`}
            />
            {preview && (
              <img
                src={preview}
                className="absolute inset-0 h-full w-full object-cover"
                alt="Khuôn mặt đã chụp"
              />
            )}

            <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-2xl" />
            
            {!preview && cameraReady && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-dashed border-red-500/60 rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Đặt khuôn mặt vào đây</span>
              </div>
            )}

            <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/60 p-2 text-[10px] text-white backdrop-blur flex justify-between font-mono">
              <div className="flex flex-col gap-0.5">
                <span>📍 {liveStamp.location}</span>
                {liveStamp.accuracy && <span>🎯 Sai số: {liveStamp.accuracy}m</span>}
              </div>
              <div className="flex flex-col gap-0.5 text-right">
                <span>🕒 {liveStamp.time}</span>
                <span>📅 {liveStamp.date}</span>
              </div>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" width={640} height={480} />

          <div className="mt-4 flex flex-col gap-2">
            {!preview ? (
              <>
                <button
                  type="button"
                  className="liveness-button"
                  onClick={runLivenessCheck}
                  disabled={livenessChecking || !cameraReady}
                >
                  <Activity size={16} />
                  {livenessChecking ? 'Đang kiểm tra chuyển động...' : livenessPassed ? '✅ Xác minh chuyển động xong' : 'Thử thách nháy mắt'}
                </button>

                <button
                  type="button"
                  className="btn w-full justify-center"
                  onClick={capture}
                  disabled={!cameraReady || capturing}
                >
                  <Camera size={18} /> Chụp khuôn mặt
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="btn-outline w-full justify-center"
                  onClick={() => {
                    setPhoto(null);
                    setPreview('');
                    setLivenessPassed(false);
                    setMessage('');
                  }}
                  disabled={loading}
                >
                  Chụp lại
                </button>
                <button
                  type="button"
                  className="btn w-full justify-center"
                  onClick={upload}
                  disabled={loading}
                >
                  {loading ? 'Đang xác thực...' : 'Vào hệ thống'}
                </button>
              </div>
            )}
          </div>

          {message && (
            <div className={`mt-4 rounded-xl p-3 text-xs font-semibold ${message.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {message}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Đang đăng nhập: {currentUser.full_name}</span>
            <button
              type="button"
              className="text-xs font-bold text-red-600 hover:text-red-500"
              onClick={onLogout}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
