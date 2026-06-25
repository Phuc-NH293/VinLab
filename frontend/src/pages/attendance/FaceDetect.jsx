import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Camera, MapPin, ScanFace, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { api, API, authHeaders } from '../../lib/api';
import { SectionHeading } from '../../components';
import { describeCameraError, getCaptureMetadata, getCurrentCoordinates, getLocationName, captureLivenessFrame, drawVideoFrame, stampCaptureMetadata, canvasToJpegFile } from '../../lib/media';

export function FaceDetect({ registerCameraStop, currentUser }) {
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
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [livenessChecking, setLivenessChecking] = useState(false);
  const [liveStamp, setLiveStamp] = useState({
    time: '--:--:--',
    date: '--/--/----',
    location: 'Đang xác định địa điểm...',
    accuracy: null,
  });

  useEffect(() => {
    api('/sessions')
      .then(rows => {
        setSessions(rows);
        setSelectedSessionId(String(rows[0]?.id || ''));
      })
      .catch(error => setMessage(`❌ ${error.message}`));
  }, []);

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

  async function retryFaceCamera() {
    await stopFaceCamera();
    setCameraAttempt(attempt => attempt + 1);
  }

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

  useEffect(() => registerCameraStop(stopFaceCamera), [registerCameraStop, stopFaceCamera]);

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
    setMessage('Ảnh đã sẵn sàng, bấm Gửi để kiểm tra.');
  }

  async function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) {
      setMessage('❌ Camera chưa sẵn sàng.');
      return;
    }
    setCapturing(true);
    setMessage('Đang lấy thời gian và vị trí...');
    try {
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
    if (!selectedSessionId) {
      setMessage('❌ Hãy chọn buổi học trước khi gửi.');
      return;
    }
    let verifiedLiveness = livenessPassed;
    if (!verifiedLiveness) {
      verifiedLiveness = await runLivenessCheck();
      if (!verifiedLiveness) return;
    }
    setLoading(true);
    setMessage('Đang gửi ảnh...');
    try {
      const formData = new FormData();
      formData.append('file', photo);
      formData.append('session_id', selectedSessionId);
      const coordinates = await getCurrentCoordinates();
      if (coordinates) {
        formData.append('latitude', String(coordinates.latitude));
        formData.append('longitude', String(coordinates.longitude));
      }
      formData.append('liveness_passed', String(verifiedLiveness));
      const response = await fetch(`${API}/face-check-in`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Không thể gửi ảnh');
      setMessage(`✅ ${data.message}`);
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <section className="card face-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeading
            icon={ScanFace}
            kicker="Camera trực tiếp"
            title="Định vị khuôn mặt"
            description="Nhìn thẳng vào camera và giữ khuôn mặt trong vùng nhận diện."
          />
          <span className={`live-chip ${cameraReady ? '' : 'live-chip-waiting'}`}><span />{cameraReady ? 'Camera trực tiếp' : 'Đang mở camera'}</span>
        </div>

        <div className="camera-frame mt-6">
          <video ref={videoRef} autoPlay playsInline muted />
          <div className="camera-vignette" />
          <div className="face-guide">
            <i className="corner corner-tl" />
            <i className="corner corner-tr" />
            <i className="corner corner-bl" />
            <i className="corner corner-br" />
          </div>
          <div className="camera-caption"><Activity size={15} />Đang tìm khuôn mặt...</div>
          <div className="timemark-live">
            <div>
              <strong>{liveStamp.time}</strong>
              <span>{liveStamp.date}</span>
            </div>
            <div>
              <b title={liveStamp.location}><MapPin size={13} /><span>{liveStamp.location}</span></b>
              <small>{liveStamp.accuracy ? `Độ chính xác ±${liveStamp.accuracy}m` : 'VINLAB SMART CHECK-IN'}</small>
            </div>
          </div>
          {cameraFailed && (
            <div className="face-camera-error">
              <Camera size={34} />
              <p>Camera chưa thể khởi động</p>
              <small>{message.replace(/^❌\s*/, '')}</small>
              <button type="button" onClick={retryFaceCamera}>Thử mở lại</button>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <label className="field-label mt-5 block">
          Buổi học cần điểm danh
          <select
            className="input mt-2"
            value={selectedSessionId}
            onChange={event => setSelectedSessionId(event.target.value)}
          >
            {sessions.length === 0 && <option value="">Chưa có buổi học</option>}
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.title} — {session.room}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className={`liveness-button mt-4 ${livenessPassed ? 'liveness-passed' : ''}`} onClick={runLivenessCheck} disabled={!cameraReady || livenessChecking}>
          <Activity size={18} />{livenessChecking ? 'Đang kiểm tra chuyển động...' : livenessPassed ? 'Đã vượt qua Liveness' : 'Kiểm tra Liveness'}
        </button>

        <div className="mt-5">
          <button type="button" className="btn w-full" onClick={capture} disabled={!cameraReady || capturing}>
            <Camera size={18} />{capturing ? 'Đang ghi nhận...' : 'Chụp khuôn mặt'}
          </button>
        </div>
      </section>

      <div className="space-y-5">
        <section className="card">
          <SectionHeading icon={Sparkles} kicker="Ảnh xác thực" title="Bản xem trước" />
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Sinh viên: <strong className="text-slate-800">{currentUser.full_name}</strong>. Sau khi gửi,
            lượt điểm danh sẽ chờ giảng viên quét xác nhận.
          </p>
          {preview ? (
            <img src={preview} alt="Ảnh khuôn mặt đã chụp" className="preview-image mt-5" />
          ) : (
            <div className="preview-placeholder mt-5">
              <ScanFace size={38} />
              <p>Ảnh vừa chụp sẽ xuất hiện tại đây</p>
            </div>
          )}
          <button type="button" className="btn mt-4 w-full" onClick={upload} disabled={!photo || loading || !selectedSessionId || livenessChecking}>
            <Send size={18} />{loading ? 'Đang gửi...' : livenessChecking ? 'Đang xác thực...' : livenessPassed ? 'Gửi điểm danh khuôn mặt' : 'Xác thực và gửi điểm danh'}
          </button>
          {message && <div className="result-message mt-4">{message}</div>}
        </section>

        <section className="security-card">
          <ShieldCheck size={25} />
          <div>
            <p className="font-extrabold">Dữ liệu được bảo vệ</p>
            <p className="mt-1 text-sm text-slate-600">Ảnh khuôn mặt thu nhỏ được lưu trong hồ sơ để giảng viên đối chiếu điểm danh.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
