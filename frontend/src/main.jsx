import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowRight,
  CalendarPlus,
  Camera,
  CheckCircle2,
  Clock3,
  MapPin,
  QrCode,
  ScanFace,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Wifi,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import './index.css';
import { api, API } from './lib/api';

const navigation = [
  { id: 'checkin', label: 'Điểm danh', description: 'Mã QR & khuôn mặt', icon: QrCode },
  { id: 'sessions', label: 'Buổi thực hành', description: 'Lịch & mã QR', icon: CalendarPlus },
  { id: 'students', label: 'Sinh viên', description: 'Quản lý lớp', icon: Users },
];

const pageMeta = {
  checkin: {
    eyebrow: 'Điểm danh nhanh',
    title: 'Điểm danh thông minh',
    description: 'Chọn quét mã QR hoặc xác thực khuôn mặt trong cùng một màn hình.',
    icon: QrCode,
  },
  sessions: {
    eyebrow: 'Quản lý phòng thực hành',
    title: 'Quản lý buổi học',
    description: 'Tạo lịch, phát hành QR và theo dõi điểm danh.',
    icon: CalendarPlus,
  },
  students: {
    eyebrow: 'Quản lý sinh viên',
    title: 'Danh sách sinh viên',
    description: 'Quản lý thông tin lớp học trong một không gian.',
    icon: Users,
  },
};

function describeCameraError(error) {
  const name = error?.name || '';
  const detail = String(error?.message || error || '');
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Quyền camera đang bị chặn. Hãy cho phép camera trong cài đặt của trình duyệt.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || /could not start video source/i.test(detail)) {
    return 'Camera đang được ứng dụng hoặc thẻ trình duyệt khác sử dụng. Hãy đóng Camera, Teams, Zoom hoặc trang đang dùng webcam rồi thử lại.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return 'Không tìm thấy camera phù hợp trên thiết bị.';
  }
  if (name === 'AbortError') {
    return 'Camera bị gián đoạn khi khởi động. Hãy thử mở lại.';
  }
  return 'Không thể mở camera. Hãy kiểm tra quyền camera và thử lại.';
}

function getCaptureMetadata() {
  const capturedAt = new Date();
  const dateTime = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
  }).format(capturedAt);

  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve({ dateTime, location: 'Không có dữ liệu vị trí' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        resolve({
          dateTime,
          location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        });
      },
      () => resolve({ dateTime, location: 'Không có dữ liệu vị trí' }),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 },
    );
  });
}

function drawVideoFrame(canvas, video, mirror = false) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  context.save();
  if (mirror) {
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  context.restore();
}

function stampCaptureMetadata(canvas, metadata) {
  const context = canvas.getContext('2d');
  const scale = Math.max(1, canvas.width / 1280);
  const padding = Math.round(18 * scale);
  const lineHeight = Math.round(26 * scale);
  const fontSize = Math.round(18 * scale);
  const lines = [
    `Thời gian: ${metadata.dateTime}`,
    `Vị trí: ${metadata.location}`,
  ];

  context.font = `700 ${fontSize}px Arial, sans-serif`;
  const boxWidth = Math.min(
    canvas.width - padding * 2,
    Math.max(...lines.map(line => context.measureText(line).width)) + padding * 2,
  );
  const boxHeight = lineHeight * lines.length + padding * 1.5;
  const x = canvas.width - boxWidth - padding;
  const y = canvas.height - boxHeight - padding;

  context.fillStyle = 'rgba(15, 23, 42, 0.78)';
  context.fillRect(x, y, boxWidth, boxHeight);
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  lines.forEach((line, index) => {
    context.fillText(
      line,
      canvas.width - padding * 2,
      y + padding + lineHeight * (index + 0.5),
      boxWidth - padding * 2,
    );
  });
}

function canvasToJpegFile(canvas, filename) {
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      resolve(blob ? new File([blob], filename, { type: 'image/jpeg' }) : null);
    }, 'image/jpeg', 0.92);
  });
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-label="VinLab">
      <span>V</span>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState('checkin');
  const [cameraPermissionReady, setCameraPermissionReady] = useState(
    () => localStorage.getItem('vinlab-camera-permission') === 'granted',
  );
  const meta = pageMeta[tab];
  const PageIcon = meta.icon;

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">VINLAB</h1>
                <span className="brand-pill">AI</span>
              </div>
              <p className="text-xs font-medium text-slate-500">Nền tảng điểm danh thông minh</p>
            </div>
          </div>
          <div className="status-pill">
            <span className="status-dot" />
            <span className="hidden sm:inline">Hệ thống hoạt động tốt</span>
            <span className="sm:hidden">Trực tuyến</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-28 pt-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 lg:pb-10">
        <aside className="hidden lg:block">
          <div className="sidebar-card">
            <p className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              Không gian làm việc
            </p>
            <nav className="space-y-2">
              {navigation.map(({ id, label, description, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`nav-item ${tab === id ? 'nav-item-active' : ''}`}
                >
                  <span className="nav-icon"><Icon size={20} strokeWidth={2.3} /></span>
                  <span className="min-w-0 text-left">
                    <span className="block font-bold">{label}</span>
                    <span className={`block text-xs ${tab === id ? 'text-white/70' : 'text-slate-400'}`}>
                      {description}
                    </span>
                  </span>
                  <ArrowRight className="ml-auto opacity-60" size={16} />
                </button>
              ))}
            </nav>

            <div className="sidebar-highlight">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
                <Sparkles size={20} />
              </div>
              <p className="font-extrabold">Tương lai của lớp học</p>
              <p className="mt-1 text-xs leading-relaxed text-white/75">
                Nhanh hơn, thông minh hơn và hoàn toàn không giấy tờ.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <section className="hero-panel">
            <div className="relative z-10 max-w-2xl">
              <div className="eyebrow"><PageIcon size={15} />{meta.eyebrow}</div>
              <h2>{meta.title}</h2>
              <p>{meta.description}</p>
            </div>
            <div className="hero-orbit hero-orbit-one" />
            <div className="hero-orbit hero-orbit-two" />
            <Sparkles className="hero-sparkle" size={30} />
          </section>

          <div className="mt-6">
            {tab === 'checkin' && (
              cameraPermissionReady
                ? <CheckIn />
                : <CameraPermission onGranted={() => setCameraPermissionReady(true)} />
            )}
            {tab === 'sessions' && <Sessions />}
            {tab === 'students' && <Students />}
          </div>
        </main>
      </div>

      <nav className="mobile-nav lg:hidden">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`mobile-nav-item ${tab === id ? 'mobile-nav-active' : ''}`}
          >
            <Icon size={21} strokeWidth={2.4} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function CameraPermission({ onGranted }) {
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

function SectionHeading({ icon: Icon, kicker, title, description }) {
  return (
    <div className="section-heading">
      <div className="section-icon"><Icon size={22} /></div>
      <div>
        <p className="section-kicker">{kicker}</p>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}

function Students() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    student_code: 'SV001',
    full_name: 'Nguyễn Văn A',
    class_name: 'AI20K',
  });

  const load = () => api('/students').then(setItems).catch(() => setItems([]));
  useEffect(load, []);

  async function submit(event) {
    event.preventDefault();
    await api('/students', { method: 'POST', body: JSON.stringify(form) });
    load();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <form onSubmit={submit} className="card">
        <SectionHeading
          icon={UserPlus}
          kicker="Hồ sơ mới"
          title="Thêm sinh viên"
          description="Nhập thông tin cơ bản để tạo hồ sơ."
        />
        <div className="mt-6 space-y-4">
          <label className="field-label">Mã sinh viên<input className="input mt-2" value={form.student_code} onChange={e => setForm({ ...form, student_code: e.target.value })} /></label>
          <label className="field-label">Họ và tên<input className="input mt-2" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></label>
          <label className="field-label">Lớp học<input className="input mt-2" value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} /></label>
          <button className="btn w-full" type="submit"><UserPlus size={18} />Lưu sinh viên</button>
        </div>
      </form>

      <section className="card">
        <div className="flex items-center justify-between gap-3">
          <SectionHeading icon={Users} kicker="Danh sách lớp" title="Sinh viên" />
          <span className="count-badge">{items.length} thành viên</span>
        </div>
        <div className="mt-5 space-y-3">
          {items.length === 0 && <EmptyState icon={Users} text="Chưa có sinh viên trong danh sách." />}
          {items.map((student, index) => (
            <div className="student-row" key={student.id}>
              <div className="student-avatar">{student.full_name?.charAt(0) || 'S'}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold text-slate-900">{student.full_name}</p>
                <p className="text-sm text-slate-500">{student.student_code}</p>
              </div>
              <span className={`class-chip chip-${index % 3}`}>{student.class_name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Sessions() {
  const [items, setItems] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [form, setForm] = useState({
    title: 'Lab 01 - Python',
    room: 'Lab A301',
    start_time: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  });

  const load = () => api('/sessions').then(setItems).catch(() => setItems([]));
  useEffect(load, []);

  async function submit(event) {
    event.preventDefault();
    await api('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      }),
    });
    load();
  }

  async function view(id) {
    setAttendances(await api(`/sessions/${id}/attendances`));
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="card">
        <SectionHeading
          icon={CalendarPlus}
          kicker="Lập lịch nhanh"
          title="Tạo buổi thực hành mới"
          description="Thiết lập thông tin và nhận mã QR ngay lập tức."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="field-label">Tên buổi thực hành<input className="input mt-2" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <label className="field-label">Phòng học<input className="input mt-2" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} /></label>
          <label className="field-label">Bắt đầu<input className="input mt-2" type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></label>
          <label className="field-label">Kết thúc<input className="input mt-2" type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></label>
        </div>
        <button className="btn mt-5" type="submit"><QrCode size={18} />Tạo buổi học & QR</button>
      </form>

      <div className="grid gap-5 xl:grid-cols-2">
        {items.length === 0 && <div className="card xl:col-span-2"><EmptyState icon={CalendarPlus} text="Chưa có buổi thực hành nào được tạo." /></div>}
        {items.map(session => (
          <article className="session-card" key={session.id}>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <span className="live-chip"><span />Đang mở</span>
                  <h3 className="mt-3 text-xl font-black text-slate-950">{session.title}</h3>
                </div>
                <div className="qr-wrap"><QRCodeSVG value={session.qr_token} size={108} /></div>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="info-chip"><MapPin size={14} />{session.room}</span>
                <span className="info-chip"><Clock3 size={14} />Sẵn sàng điểm danh</span>
              </div>
              <code className="token-box">{session.qr_token}</code>
              <button className="btn-secondary mt-4" type="button" onClick={() => view(session.id)}>
                <Users size={17} />Xem người tham dự<ArrowRight size={16} className="ml-auto" />
              </button>
            </div>
          </article>
        ))}
      </div>

      {attendances.length > 0 && (
        <section className="card">
          <SectionHeading icon={CheckCircle2} kicker="Đã xác nhận" title="Danh sách điểm danh" />
          <div className="mt-5 divide-y divide-slate-100">
            {attendances.map(attendance => (
              <div className="flex items-center gap-3 py-3" key={attendance.id}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={20} /></div>
                <div>
                  <p className="font-bold text-slate-900">{attendance.full_name}</p>
                  <p className="text-sm text-slate-500">{attendance.student_code}</p>
                </div>
                <span className="ml-auto text-xs font-semibold text-slate-400">{attendance.checked_at}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CheckIn() {
  const [method, setMethod] = useState('qr');
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const stopActiveCameraRef = useRef(async () => {});

  const registerCameraStop = useCallback(stopCamera => {
    stopActiveCameraRef.current = stopCamera;
    return () => {
      if (stopActiveCameraRef.current === stopCamera) {
        stopActiveCameraRef.current = async () => {};
      }
    };
  }, []);

  async function switchMethod(nextMethod) {
    if (nextMethod === method || switchingCamera) return;
    setSwitchingCamera(true);
    try {
      await stopActiveCameraRef.current();
      setMethod(nextMethod);
    } finally {
      setSwitchingCamera(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="checkin-methods">
        <button
          type="button"
          className={`checkin-method ${method === 'qr' ? 'checkin-method-active' : ''}`}
          onClick={() => switchMethod('qr')}
          disabled={switchingCamera}
        >
          <span><QrCode size={21} /></span>
          <div>
            <strong>Quét mã QR</strong>
            <small>Điểm danh bằng mã của buổi học</small>
          </div>
        </button>
        <button
          type="button"
          className={`checkin-method ${method === 'face' ? 'checkin-method-active' : ''}`}
          onClick={() => switchMethod('face')}
          disabled={switchingCamera}
        >
          <span><ScanFace size={21} /></span>
          <div>
            <strong>Quét khuôn mặt</strong>
            <small>Chụp và gửi ảnh xác thực</small>
          </div>
        </button>
      </div>
      {switchingCamera && <div className="camera-switching"><Activity size={20} />Đang chuyển camera...</div>}
      {method === 'qr'
        ? <QrCheckIn registerCameraStop={registerCameraStop} />
        : <FaceDetect registerCameraStop={registerCameraStop} />}
    </div>
  );
}

function QrCheckIn({ registerCameraStop }) {
  const [studentCode, setStudentCode] = useState('SV001');
  const [message, setMessage] = useState('');
  const [manual, setManual] = useState('');
  const [cameraStatus, setCameraStatus] = useState('Đang khởi động camera...');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [scanPreview, setScanPreview] = useState('');
  const qrScannerRef = useRef(null);
  const startupPromiseRef = useRef(null);
  const stopPromiseRef = useRef(null);
  const disposedRef = useRef(false);
  const mountedRef = useRef(false);
  const studentCodeRef = useRef(studentCode);

  useEffect(() => {
    studentCodeRef.current = studentCode;
  }, [studentCode]);

  async function doCheck(token) {
    try {
      await api('/check-in', {
        method: 'POST',
        body: JSON.stringify({ student_code: studentCode, qr_token: token }),
      });
      setMessage('✅ Điểm danh thành công');
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  const stopQrCamera = useCallback(async () => {
    if (stopPromiseRef.current) return stopPromiseRef.current;
    disposedRef.current = true;
    stopPromiseRef.current = (async () => {
      try {
        await startupPromiseRef.current;
      } catch {
        // Camera startup errors are handled by startQrCamera.
      }
      const scanner = qrScannerRef.current;
      if (!scanner) return;
      try {
        if (scanner.isScanning) await scanner.stop();
      } catch {
        // The camera may already have been released by the browser.
      }
      try {
        scanner.clear();
      } catch {
        // The scanner element may already be unmounted.
      }
    })().finally(() => {
      stopPromiseRef.current = null;
    });
    return stopPromiseRef.current;
  }, []);

  async function startQrCamera() {
    if (startupPromiseRef.current || qrScannerRef.current?.isScanning) return;
    disposedRef.current = false;
    setCameraStatus('Đang xin quyền sử dụng camera...');
    setCameraReady(false);
    setCameraFailed(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ camera');
      }
      const cameras = await Html5Qrcode.getCameras();
      if (disposedRef.current) return;
      if (!cameras.length) {
        const error = new Error('Không tìm thấy camera');
        error.name = 'NotFoundError';
        throw error;
      }
      const preferredCamera = cameras.find(camera =>
        /back|rear|environment|sau/i.test(camera.label || ''),
      ) || cameras[0];
      const scanner = qrScannerRef.current || new Html5Qrcode('qr-reader', false);
      qrScannerRef.current = scanner;
      const startupPromise = scanner.start(
        preferredCamera.id,
        {
          fps: 10,
          aspectRatio: 4 / 3,
          qrbox: (width, height) => {
            const size = Math.min(width, height, 320) * 0.82;
            return { width: size, height: size };
          },
        },
        async decodedText => {
          const video = document.querySelector('#qr-reader video');
          const evidenceCanvas = document.createElement('canvas');
          if (video?.videoWidth) drawVideoFrame(evidenceCanvas, video);
          await stopQrCamera();
          if (mountedRef.current) {
            setCameraReady(false);
            setCameraStatus('Đã đọc mã QR');
          }
          if (evidenceCanvas.width) {
            const metadata = await getCaptureMetadata();
            stampCaptureMetadata(evidenceCanvas, metadata);
            const evidenceFile = await canvasToJpegFile(evidenceCanvas, 'qr-checkin.jpg');
            if (evidenceFile && mountedRef.current) {
              setScanPreview(current => {
                if (current) URL.revokeObjectURL(current);
                return URL.createObjectURL(evidenceFile);
              });
            }
          }
          try {
            await api('/check-in', {
              method: 'POST',
              body: JSON.stringify({
                student_code: studentCodeRef.current,
                qr_token: decodedText,
              }),
            });
            if (mountedRef.current) setMessage('✅ Điểm danh thành công');
          } catch (error) {
            if (mountedRef.current) setMessage(`❌ ${error.message}`);
          }
        },
        () => {},
      );
      startupPromiseRef.current = startupPromise;
      await startupPromise;
      startupPromiseRef.current = null;
      if (disposedRef.current) {
        await stopQrCamera();
        return;
      }
      if (!mountedRef.current) return;
      setCameraReady(true);
      setCameraFailed(false);
      setCameraStatus('Camera sẵn sàng');
    } catch (error) {
      startupPromiseRef.current = null;
      if (disposedRef.current || !mountedRef.current) return;
      setCameraReady(false);
      setCameraFailed(true);
      setCameraStatus('Không thể mở camera');
      setMessage(`❌ ${describeCameraError(error)}`);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    disposedRef.current = false;
    startQrCamera();
    return () => {
      mountedRef.current = false;
      stopQrCamera();
    };
  }, []);

  useEffect(() => registerCameraStop(stopQrCamera), [registerCameraStop, stopQrCamera]);

  useEffect(() => () => {
    if (scanPreview) URL.revokeObjectURL(scanPreview);
  }, [scanPreview]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="card scanner-card">
        <SectionHeading
          icon={QrCode}
          kicker="Quét bằng camera"
          title="Đưa mã QR vào khung"
          description="Hệ thống sẽ tự động nhận diện và xác nhận."
        />
        <label className="field-label mt-6 block">
          Mã sinh viên
          <input className="input mt-2" value={studentCode} onChange={e => setStudentCode(e.target.value)} placeholder="Ví dụ: SV001" />
        </label>
        <div className="scanner-shell mt-5">
          <div className={`scanner-status ${cameraReady ? '' : 'scanner-status-waiting'}`}>
            <Wifi size={14} />{cameraStatus}
          </div>
          <div id="qr-reader" />
          {cameraFailed && (
            <div className="scanner-retry">
              <Camera size={32} />
              <p>{cameraStatus}</p>
              <button type="button" onClick={startQrCamera}>Mở camera</button>
            </div>
          )}
        </div>
        {scanPreview && (
          <div className="capture-preview mt-4">
            <p>Ảnh ghi nhận khi quét mã</p>
            <img src={scanPreview} alt="Ảnh ghi nhận khi quét mã QR" />
          </div>
        )}
        {message && <div className="result-message mt-4">{message}</div>}
      </section>

      <div className="space-y-5">
        <section className="card">
          <SectionHeading icon={ShieldCheck} kicker="Phương án dự phòng" title="Nhập mã xác nhận thủ công" />
          <p className="mt-4 text-sm leading-relaxed text-slate-500">Sử dụng khi thiết bị không cấp quyền camera hoặc mã QR khó quét.</p>
          <input className="input mt-5" value={manual} onChange={e => setManual(e.target.value)} placeholder="Dán mã xác nhận tại đây" />
          <button className="btn mt-3 w-full" type="button" onClick={() => doCheck(manual)}>
            Xác nhận điểm danh<ArrowRight size={18} />
          </button>
        </section>

        <section className="tip-card">
          <div className="tip-icon"><Sparkles size={20} /></div>
          <div>
            <p className="font-extrabold text-slate-900">Mẹo quét nhanh</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">Giữ điện thoại ổn định, đủ sáng và đặt mã QR cách camera khoảng 20 cm.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function FaceDetect({ registerCameraStop }) {
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

  async function upload() {
    if (!photo) {
      setMessage('❌ Hãy chụp khuôn mặt trước khi gửi.');
      return;
    }
    setLoading(true);
    setMessage('Đang gửi ảnh...');
    try {
      const formData = new FormData();
      formData.append('file', photo);
      const response = await fetch(`${API}/face-detect`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Không thể gửi ảnh');
      const data = await response.json();
      setMessage(data.has_face ? '✅ Camera phát hiện khuôn mặt' : '❌ Chưa thấy mặt rõ');
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

        <div className="mt-5">
          <button type="button" className="btn w-full" onClick={capture} disabled={!cameraReady || capturing}>
            <Camera size={18} />{capturing ? 'Đang ghi nhận...' : 'Chụp khuôn mặt'}
          </button>
        </div>
      </section>

      <div className="space-y-5">
        <section className="card">
          <SectionHeading icon={Sparkles} kicker="Ảnh xác thực" title="Bản xem trước" />
          {preview ? (
            <img src={preview} alt="Ảnh khuôn mặt đã chụp" className="preview-image mt-5" />
          ) : (
            <div className="preview-placeholder mt-5">
              <ScanFace size={38} />
              <p>Ảnh vừa chụp sẽ xuất hiện tại đây</p>
            </div>
          )}
          <button type="button" className="btn mt-4 w-full" onClick={upload} disabled={!photo || loading}>
            <Send size={18} />{loading ? 'Đang gửi...' : 'Gửi xác thực'}
          </button>
          {message && <div className="result-message mt-4">{message}</div>}
        </section>

        <section className="security-card">
          <ShieldCheck size={25} />
          <div>
            <p className="font-extrabold">Dữ liệu được bảo vệ</p>
            <p className="mt-1 text-sm text-slate-600">Ảnh chỉ được sử dụng để kiểm tra khuôn mặt trong phiên hiện tại.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <p>{text}</p>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
