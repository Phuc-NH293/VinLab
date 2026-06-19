import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarPlus,
  Camera,
  CheckCircle2,
  Clock3,
  Download,
  Database,
  FileCheck,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  MapPinned,
  QrCode,
  RefreshCw,
  ScanFace,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  Wifi,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import './index.css';
import {
  api,
  API,
  authHeaders,
  clearSession,
  getStoredUser,
  setSession,
} from './lib/api';

const navigation = [
  { id: 'checkin', label: 'Điểm danh', description: 'Mã QR & khuôn mặt', icon: QrCode, roles: ['student', 'teacher'] },
  { id: 'studentPortal', label: 'Cổng sinh viên', description: 'Lịch, lịch sử, xin nghỉ', icon: CalendarPlus, roles: ['student'] },
  { id: 'sessions', label: 'Buổi thực hành', description: 'Lịch & mã QR', icon: CalendarPlus, roles: ['teacher'] },
  { id: 'students', label: 'Sinh viên', description: 'Quản lý lớp', icon: Users, roles: ['teacher'] },
  { id: 'instructor', label: 'Giảng viên', description: 'Theo dõi lớp học', icon: GraduationCap, roles: ['teacher'] },
  { id: 'admin', label: 'Quản trị hệ thống', description: 'Tài khoản, phòng Lab, bảo mật', icon: ShieldCheck, roles: ['admin'] },
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
  instructor: {
    eyebrow: 'Trung tâm điều hành',
    title: 'Bảng điều khiển giảng viên',
    description: 'Theo dõi chuyên cần, xử lý điểm danh và xuất báo cáo lớp học.',
    icon: LayoutDashboard,
  },
  studentPortal: {
    eyebrow: 'Cổng thông tin sinh viên',
    title: 'Học tập & chuyên cần',
    description: 'Theo dõi lịch học, lịch sử điểm danh và gửi đơn xin phép.',
    icon: CalendarPlus,
  },
  admin: {
    eyebrow: 'Quản trị toàn trường',
    title: 'Trung tâm điều hành VinLab',
    description: 'Quản lý tài khoản, phòng Lab, dữ liệu khuôn mặt và cảnh báo hệ thống.',
    icon: ShieldCheck,
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
  const date = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(capturedAt);
  const time = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(capturedAt);
  const dateTime = `${time} · ${date}`;

  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve({ date, time, dateTime, location: 'Không có dữ liệu vị trí', accuracy: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude, accuracy } = position.coords;
        resolve({
          date,
          time,
          dateTime,
          location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          accuracy: Math.round(accuracy),
        });
      },
      () => resolve({ date, time, dateTime, location: 'Không có dữ liệu vị trí', accuracy: null }),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 },
    );
  });
}

function getCurrentCoordinates() {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy),
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 },
    );
  });
}

function captureLivenessFrame(video) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 72;
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
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
  const padding = Math.round(24 * scale);
  const bandHeight = Math.round(132 * scale);
  const y = canvas.height - bandHeight;

  const gradient = context.createLinearGradient(0, y, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(10, 18, 36, 0.20)');
  gradient.addColorStop(0.25, 'rgba(10, 18, 36, 0.78)');
  gradient.addColorStop(1, 'rgba(10, 18, 36, 0.96)');
  context.fillStyle = gradient;
  context.fillRect(0, y, canvas.width, bandHeight);

  context.fillStyle = '#ef4444';
  context.fillRect(0, y, Math.round(7 * scale), bandHeight);

  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillStyle = '#ffffff';
  context.font = `900 ${Math.round(34 * scale)}px Arial, sans-serif`;
  context.fillText(metadata.time, padding, y + Math.round(55 * scale));

  context.font = `700 ${Math.round(16 * scale)}px Arial, sans-serif`;
  context.fillStyle = '#fca5a5';
  context.fillText(metadata.date, padding, y + Math.round(85 * scale));

  context.fillStyle = '#ffffff';
  context.font = `700 ${Math.round(17 * scale)}px Arial, sans-serif`;
  const locationLabel = `GPS  ${metadata.location}`;
  context.fillText(locationLabel, padding, y + Math.round(113 * scale), canvas.width * 0.68);

  if (metadata.accuracy) {
    context.fillStyle = '#cbd5e1';
    context.font = `600 ${Math.round(13 * scale)}px Arial, sans-serif`;
    context.fillText(`Độ chính xác ±${metadata.accuracy}m`, canvas.width * 0.54, y + Math.round(113 * scale));
  }

  context.textAlign = 'right';
  context.fillStyle = '#ffffff';
  context.font = `900 ${Math.round(18 * scale)}px Arial, sans-serif`;
  context.fillText('VINLAB', canvas.width - padding, y + Math.round(55 * scale));
  context.fillStyle = '#fda4af';
  context.font = `700 ${Math.round(12 * scale)}px Arial, sans-serif`;
  context.fillText('SMART CHECK-IN', canvas.width - padding, y + Math.round(78 * scale));
  context.fillStyle = '#94a3b8';
  context.font = `600 ${Math.round(11 * scale)}px Arial, sans-serif`;
  context.fillText('Ảnh có dấu thời gian & vị trí', canvas.width - padding, y + Math.round(102 * scale));
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
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [checkingSession, setCheckingSession] = useState(Boolean(getStoredUser()));
  const [cameraPermissionReady, setCameraPermissionReady] = useState(
    () => localStorage.getItem('vinlab-camera-permission') === 'granted',
  );
  const visibleNavigation = navigation.filter(item => item.roles.includes(currentUser?.role));
  const meta = pageMeta[tab];
  const PageIcon = meta.icon;

  useEffect(() => {
    if (!currentUser) {
      setCheckingSession(false);
      return;
    }
    api('/auth/me')
      .then(user => setCurrentUser(user))
      .catch(() => {
        clearSession();
        setCurrentUser(null);
      })
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    function handleExpiredSession() {
      setCurrentUser(null);
      setTab('checkin');
    }
    window.addEventListener('vinlab-auth-expired', handleExpiredSession);
    return () => window.removeEventListener('vinlab-auth-expired', handleExpiredSession);
  }, []);

  function handleLogout() {
    clearSession();
    setCurrentUser(null);
    setTab('checkin');
  }

  if (checkingSession) {
    return <div className="auth-loading"><Activity size={28} /><p>Đang kiểm tra phiên đăng nhập...</p></div>;
  }

  if (!currentUser) {
    return <LoginScreen onLogin={user => {
      setCurrentUser(user);
      setTab(user.role === 'student' ? 'checkin' : user.role === 'admin' ? 'admin' : 'instructor');
    }} />;
  }

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
            <span className="hidden sm:inline">{currentUser.full_name}</span>
            <span className="sm:hidden">{currentUser.role === 'teacher' ? 'GV' : currentUser.role === 'admin' ? 'AD' : 'SV'}</span>
          </div>
          <button type="button" className="logout-button" onClick={handleLogout} title="Đăng xuất">
            <LogOut size={18} /><span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-28 pt-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 lg:pb-10">
        <aside className="hidden lg:block">
          <div className="sidebar-card">
            <p className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              Không gian làm việc
            </p>
            <nav className="space-y-2">
              {visibleNavigation.map(({ id, label, description, icon: Icon }) => (
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
                ? <CheckIn currentUser={currentUser} />
                : <CameraPermission onGranted={() => setCameraPermissionReady(true)} />
            )}
            {currentUser.role === 'teacher' && tab === 'sessions' && <Sessions />}
            {currentUser.role === 'teacher' && tab === 'students' && <Students />}
            {currentUser.role === 'teacher' && tab === 'instructor' && <InstructorDashboard />}
            {currentUser.role === 'student' && tab === 'studentPortal' && <StudentPortal />}
            {currentUser.role === 'admin' && tab === 'admin' && <AdminDashboard />}
          </div>
        </main>
      </div>

      <nav
        className="mobile-nav lg:hidden"
        style={{ gridTemplateColumns: `repeat(${visibleNavigation.length}, minmax(0, 1fr))` }}
      >
        {visibleNavigation.map(({ id, label, icon: Icon }) => (
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

function LoginScreen({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSession(result.access_token, result.user);
      onLogin(result.user);
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function useDemo(role) {
    setForm({
      username: role === 'teacher' ? 'gv001' : role === 'admin' ? 'admin001' : 'sv001',
      password: 'VinLab@123',
    });
    setMessage('');
  }

  return (
    <div className="login-page">
      <div className="login-ambient login-ambient-one" />
      <div className="login-ambient login-ambient-two" />
      <section className="login-brand-panel">
        <BrandMark />
        <span className="login-brand-name">VINLAB</span>
        <div className="login-brand-content">
          <p className="eyebrow"><ShieldCheck size={15} />Hệ thống bảo mật JWT</p>
          <h1>Điểm danh thông minh cho lớp học hiện đại.</h1>
          <p>Phân quyền rõ ràng cho sinh viên và giảng viên, bảo vệ dữ liệu và thao tác quản lý.</p>
        </div>
        <div className="login-features">
          <span><CheckCircle2 size={17} />Xác thực an toàn</span>
          <span><ScanFace size={17} />Camera thông minh</span>
          <span><LayoutDashboard size={17} />Quản lý chuyên cần</span>
        </div>
      </section>

      <main className="login-form-panel">
        <form className="login-card" onSubmit={login}>
          <div className="login-mobile-brand"><BrandMark /><strong>VINLAB</strong></div>
          <p className="section-kicker">Chào mừng trở lại</p>
          <h2>Đăng nhập tài khoản</h2>
          <p className="login-subtitle">Sử dụng tài khoản được cấp theo đúng vai trò của bạn.</p>

          <label className="field-label mt-6 block">
            Tên đăng nhập
            <input
              className="input mt-2"
              value={form.username}
              onChange={event => setForm({ ...form, username: event.target.value })}
              placeholder="Nhập tên đăng nhập"
              autoComplete="username"
            />
          </label>
          <label className="field-label mt-4 block">
            Mật khẩu
            <input
              className="input mt-2"
              type="password"
              value={form.password}
              onChange={event => setForm({ ...form, password: event.target.value })}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
            />
          </label>
          <button className="btn mt-5 w-full" type="submit" disabled={loading || !form.username || !form.password}>
            <LogIn size={18} />{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
          {message && <div className="result-message mt-4">{message}</div>}

          <div className="demo-accounts">
            <p>Tài khoản thử nghiệm</p>
            <button type="button" onClick={() => useDemo('teacher')}>
              <GraduationCap size={18} /><span><strong>Giảng viên</strong><small>gv001 / VinLab@123</small></span>
            </button>
            <button type="button" onClick={() => useDemo('student')}>
              <Users size={18} /><span><strong>Sinh viên</strong><small>sv001 / VinLab@123</small></span>
            </button>
            <button type="button" onClick={() => useDemo('admin')}>
              <ShieldCheck size={18} /><span><strong>Quản trị viên</strong><small>admin001 / VinLab@123</small></span>
            </button>
          </div>
        </form>
      </main>
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
    password: 'VinLab@123',
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
          <label className="field-label">Mật khẩu ban đầu<input className="input mt-2" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          <p className="text-xs leading-relaxed text-slate-500">Tên đăng nhập của sinh viên chính là mã sinh viên viết thường.</p>
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
              <StudentPhoto student={student} />
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

function StudentPortal() {
  const [schedule, setSchedule] = useState([]);
  const [history, setHistory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [faceProfile, setFaceProfile] = useState({ enrolled: false, sample_count: 0 });
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ session_id: '', request_type: 'leave', reason: '', evidence_name: '' });

  async function load() {
    try {
      const [scheduleRows, historyRows, requestRows, profile] = await Promise.all([
        api('/student/schedule'),
        api('/student/attendance-history'),
        api('/student/leave-requests'),
        api('/student/face-profile'),
      ]);
      setSchedule(scheduleRows);
      setHistory(historyRows);
      setRequests(requestRows);
      setFaceProfile(profile);
      setForm(current => ({ ...current, session_id: current.session_id || String(scheduleRows[0]?.id || '') }));
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitLeave(event) {
    event.preventDefault();
    try {
      const result = await api('/student/leave-requests', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          session_id: form.session_id ? Number(form.session_id) : null,
        }),
      });
      setMessage(`✅ ${result.message}`);
      setForm(current => ({ ...current, reason: '', evidence_name: '' }));
      await load();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  const presentCount = history.filter(item => item.status === 'present').length;
  const lateCount = history.filter(item => {
    const session = schedule.find(row => row.id === item.session_id);
    return session && new Date(item.checked_at) > new Date(new Date(session.start_time).getTime() + 15 * 60 * 1000);
  }).length;

  return (
    <div className="space-y-5">
      <section className="teacher-stats">
        <TeacherStat icon={CalendarPlus} label="Buổi sắp tới" value={schedule.length} tone="cyan" />
        <TeacherStat icon={UserCheck} label="Đã có mặt" value={presentCount} tone="green" />
        <TeacherStat icon={Clock3} label="Đi muộn" value={lateCount} tone="amber" />
        <TeacherStat icon={ScanFace} label="Mẫu khuôn mặt" value={faceProfile.sample_count} tone="red" />
      </section>

      {message && <div className="result-message">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-2">
        <FaceEnrollment profile={faceProfile} onComplete={load} />

        <section className="card">
          <SectionHeading icon={CalendarPlus} kicker="Lịch học & Lab" title="Lịch sắp tới" />
          <div className="mt-5 space-y-3">
            {schedule.length === 0 && <EmptyState icon={CalendarPlus} text="Chưa có lịch học." />}
            {schedule.slice(0, 6).map(session => (
              <div className="schedule-row" key={session.id}>
                <div className="schedule-date">
                  <strong>{new Date(session.start_time).getDate()}</strong>
                  <span>Tháng {new Date(session.start_time).getMonth() + 1}</span>
                </div>
                <div>
                  <p>{session.title}</p>
                  <span><MapPin size={13} />{session.room}</span>
                  <span><Clock3 size={13} />{new Date(session.start_time).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="card">
          <SectionHeading icon={Activity} kicker="Chuyên cần cá nhân" title="Lịch sử điểm danh" />
          <div className="mt-5 space-y-2">
            {history.length === 0 && <EmptyState icon={Activity} text="Chưa có dữ liệu điểm danh." />}
            {history.map(item => (
              <div className="history-row" key={item.id}>
                <span className={`attendance-status ${item.status === 'pending_face' ? 'attendance-pending' : 'attendance-present'}`}>
                  {item.status === 'pending_face' ? 'Chờ xác nhận' : 'Có mặt'}
                </span>
                <div>
                  <p>{item.title}</p>
                  <small>{item.room} · {new Date(item.checked_at).toLocaleString('vi-VN')}</small>
                </div>
                <b>{item.method}</b>
              </div>
            ))}
          </div>
        </section>

        <form className="card" onSubmit={submitLeave}>
          <SectionHeading icon={FileCheck} kicker="Đơn trực tuyến" title="Xin nghỉ / Báo đi muộn" />
          <div className="mt-5 space-y-4">
            <label className="field-label">Buổi học
              <select className="input mt-2" value={form.session_id} onChange={event => setForm({ ...form, session_id: event.target.value })}>
                <option value="">Không gắn buổi cụ thể</option>
                {schedule.map(session => <option key={session.id} value={session.id}>{session.title}</option>)}
              </select>
            </label>
            <label className="field-label">Loại đơn
              <select className="input mt-2" value={form.request_type} onChange={event => setForm({ ...form, request_type: event.target.value })}>
                <option value="leave">Xin nghỉ phép</option>
                <option value="late">Báo đi muộn</option>
              </select>
            </label>
            <label className="field-label">Lý do
              <textarea className="input mt-2 min-h-24 resize-y" value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} required />
            </label>
            <label className="field-label">Tên minh chứng
              <input className="input mt-2" value={form.evidence_name} onChange={event => setForm({ ...form, evidence_name: event.target.value })} placeholder="Ví dụ: Giấy khám Vinmec" />
            </label>
            <button className="btn w-full" type="submit"><Send size={17} />Gửi đơn</button>
          </div>
          <div className="mt-5 space-y-2">
            {requests.slice(0, 4).map(request => (
              <div className="request-row" key={request.id}>
                <span>{request.request_type === 'leave' ? 'Xin nghỉ' : 'Đi muộn'}</span>
                <b className={`request-${request.status}`}>{request.status === 'pending' ? 'Chờ duyệt' : request.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}</b>
              </div>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}

function FaceEnrollment({ profile, onComplete }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [samples, setSamples] = useState([]);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: 'user' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true);
    } catch (error) {
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
      setMessage('❌ Cần chụp ít nhất 3 góc mặt.');
      return;
    }
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
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <div className="flex items-start justify-between gap-3">
        <SectionHeading icon={ScanFace} kicker="Face Enrollment" title="Đăng ký khuôn mặt" />
        <span className={`attendance-status ${profile.enrolled ? 'attendance-present' : 'attendance-absent'}`}>
          {profile.enrolled ? 'Đã đăng ký' : 'Chưa đăng ký'}
        </span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-500">Chụp 3–5 góc mặt. Hệ thống trích xuất vector đặc trưng và không lưu ảnh gốc.</p>
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
      {message && <div className="result-message mt-4">{message}</div>}
    </section>
  );
}

function AdminDashboard() {
  const [section, setSection] = useState('users');
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [message, setMessage] = useState('');
  const [locationForm, setLocationForm] = useState({
    name: 'CECS Lab 401',
    room_code: 'CECS-401',
    latitude: 20.991,
    longitude: 105.944,
    radius_meters: 120,
    wifi_ssid: 'VinUni-Student',
    wifi_bssid: '',
    camera_devices: '',
  });
  const [sessionForm, setSessionForm] = useState({
    id: '',
    title: 'Lab AI',
    room: 'CECS Lab 401',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 90 * 60 * 1000).toISOString().slice(0, 16),
    location_id: '',
    checkin_before_minutes: 15,
    checkin_after_minutes: 10,
  });

  async function load() {
    try {
      const [userRows, locationRows, sessionRows, profileRows, anomalyRows] = await Promise.all([
        api('/admin/users'),
        api('/admin/locations'),
        api('/sessions'),
        api('/admin/face-profiles'),
        api('/admin/anomalies'),
      ]);
      setUsers(userRows);
      setLocations(locationRows);
      setSessions(sessionRows);
      setProfiles(profileRows);
      setAnomalies(anomalyRows);
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateRole(userId, role) {
    try {
      await api(`/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setMessage('✅ Đã cập nhật quyền tài khoản.');
      await load();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  async function createLocation(event) {
    event.preventDefault();
    try {
      await api('/admin/locations', { method: 'POST', body: JSON.stringify({
        ...locationForm,
        latitude: Number(locationForm.latitude),
        longitude: Number(locationForm.longitude),
        radius_meters: Number(locationForm.radius_meters),
      }) });
      setMessage('✅ Đã thêm phòng Lab và vùng GPS.');
      await load();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  async function deleteLocation(id) {
    await api(`/admin/locations/${id}`, { method: 'DELETE' });
    await load();
  }

  async function saveSession(event) {
    event.preventDefault();
    try {
      let sessionId = sessionForm.id;
      if (!sessionId) {
        const created = await api('/sessions', {
          method: 'POST',
          body: JSON.stringify({
            title: sessionForm.title,
            room: sessionForm.room,
            start_time: new Date(sessionForm.start_time).toISOString(),
            end_time: new Date(sessionForm.end_time).toISOString(),
          }),
        });
        sessionId = created.id;
      }
      await api(`/admin/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: sessionForm.title,
          room: sessionForm.room,
          start_time: new Date(sessionForm.start_time).toISOString(),
          end_time: new Date(sessionForm.end_time).toISOString(),
          location_id: sessionForm.location_id ? Number(sessionForm.location_id) : null,
          checkin_before_minutes: Number(sessionForm.checkin_before_minutes),
          checkin_after_minutes: Number(sessionForm.checkin_after_minutes),
        }),
      });
      setMessage('✅ Đã lưu thời khóa biểu và chính sách check-in.');
      setSessionForm(current => ({ ...current, id: '' }));
      await load();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  function editSession(session) {
    setSection('schedule');
    setSessionForm(current => ({
      ...current,
      id: session.id,
      title: session.title,
      room: session.room,
      start_time: new Date(session.start_time).toISOString().slice(0, 16),
      end_time: new Date(session.end_time).toISOString().slice(0, 16),
    }));
  }

  async function deleteSession(id) {
    await api(`/admin/sessions/${id}`, { method: 'DELETE' });
    await load();
  }

  async function deleteProfile(id) {
    await api(`/admin/face-profiles/${id}`, { method: 'DELETE' });
    await load();
  }

  const adminTabs = [
    ['users', 'Tài khoản', Users],
    ['locations', 'Phòng Lab', MapPinned],
    ['schedule', 'Thời khóa biểu', CalendarPlus],
    ['faces', 'Face Vector DB', Database],
    ['alerts', 'Cảnh báo', AlertTriangle],
  ];

  return (
    <div className="space-y-5">
      <section className="teacher-stats">
        <TeacherStat icon={Users} label="Tài khoản" value={users.length} tone="red" />
        <TeacherStat icon={MapPinned} label="Phòng Lab" value={locations.length} tone="cyan" />
        <TeacherStat icon={Database} label="Hồ sơ khuôn mặt" value={profiles.length} tone="green" />
        <TeacherStat icon={AlertTriangle} label="Cảnh báo mở" value={anomalies.filter(item => item.status === 'open').length} tone="amber" />
      </section>
      {message && <div className="result-message">{message}</div>}
      <div className="admin-tabs">
        {adminTabs.map(([id, label, Icon]) => (
          <button type="button" key={id} className={section === id ? 'admin-tab-active' : ''} onClick={() => setSection(id)}>
            <Icon size={17} />{label}
          </button>
        ))}
      </div>

      {section === 'users' && (
        <section className="card">
          <SectionHeading icon={Users} kicker="User Management" title="Tài khoản & phân quyền" />
          <div className="mt-5 space-y-2">
            {users.map(user => (
              <div className="admin-list-row" key={user.id}>
                <div className="student-avatar">{user.full_name?.charAt(0) || 'U'}</div>
                <div><p>{user.full_name}</p><span>{user.username}{user.student_code ? ` · ${user.student_code}` : ''}</span></div>
                <select className="compact-select" value={user.role} onChange={event => updateRole(user.id, event.target.value)}>
                  <option value="student">Sinh viên</option>
                  <option value="teacher">Giảng viên / TA</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {section === 'locations' && (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <form className="card" onSubmit={createLocation}>
            <SectionHeading icon={MapPinned} kicker="Location Setup" title="Thêm phòng Lab" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['name', 'Tên phòng'],
                ['room_code', 'Mã phòng'],
                ['latitude', 'Vĩ độ'],
                ['longitude', 'Kinh độ'],
                ['radius_meters', 'Bán kính GPS (m)'],
                ['wifi_ssid', 'Wi-Fi SSID'],
                ['wifi_bssid', 'Wi-Fi BSSID'],
                ['camera_devices', 'Camera cố định'],
              ].map(([key, label]) => (
                <label className="field-label" key={key}>{label}<input className="input mt-2" value={locationForm[key]} onChange={event => setLocationForm({ ...locationForm, [key]: event.target.value })} /></label>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-amber-700">Web có thể kiểm tra GPS; xác minh SSID/BSSID thật cần native app hoặc device agent của VinUni.</p>
            <button className="btn mt-4 w-full" type="submit"><MapPinned size={17} />Lưu phòng Lab</button>
          </form>
          <section className="card">
            <SectionHeading icon={MapPin} kicker="Khu vực hoạt động" title="Danh sách phòng Lab" />
            <div className="mt-5 space-y-2">
              {locations.map(location => (
                <div className="admin-list-row" key={location.id}>
                  <MapPinned className="text-cyan-600" />
                  <div><p>{location.name}</p><span>{location.room_code} · Bán kính {location.radius_meters}m · {location.wifi_ssid || 'Chưa cấu hình Wi-Fi'}</span></div>
                  <button className="icon-danger" type="button" onClick={() => deleteLocation(location.id)}><Trash2 size={17} /></button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {section === 'schedule' && (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <form className="card" onSubmit={saveSession}>
            <SectionHeading icon={CalendarPlus} kicker="Curriculum Management" title={sessionForm.id ? 'Chỉnh sửa buổi học' : 'Tạo buổi học'} />
            <div className="mt-5 space-y-3">
              <label className="field-label">Tên buổi học<input className="input mt-2" value={sessionForm.title} onChange={event => setSessionForm({ ...sessionForm, title: event.target.value })} /></label>
              <label className="field-label">Phòng<input className="input mt-2" value={sessionForm.room} onChange={event => setSessionForm({ ...sessionForm, room: event.target.value })} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field-label">Bắt đầu<input type="datetime-local" className="input mt-2" value={sessionForm.start_time} onChange={event => setSessionForm({ ...sessionForm, start_time: event.target.value })} /></label>
                <label className="field-label">Kết thúc<input type="datetime-local" className="input mt-2" value={sessionForm.end_time} onChange={event => setSessionForm({ ...sessionForm, end_time: event.target.value })} /></label>
              </div>
              <label className="field-label">Vùng GPS<select className="input mt-2" value={sessionForm.location_id} onChange={event => setSessionForm({ ...sessionForm, location_id: event.target.value })}><option value="">Không áp dụng</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field-label">Cho phép trước (phút)<input className="input mt-2" type="number" value={sessionForm.checkin_before_minutes} onChange={event => setSessionForm({ ...sessionForm, checkin_before_minutes: event.target.value })} /></label>
                <label className="field-label">Cho phép sau (phút)<input className="input mt-2" type="number" value={sessionForm.checkin_after_minutes} onChange={event => setSessionForm({ ...sessionForm, checkin_after_minutes: event.target.value })} /></label>
              </div>
              <button className="btn w-full" type="submit"><CalendarPlus size={17} />Lưu thời khóa biểu</button>
            </div>
          </form>
          <section className="card">
            <SectionHeading icon={Clock3} kicker="Lịch đang quản lý" title="Các buổi học" />
            <div className="mt-5 space-y-2">{sessions.map(session => <div className="admin-list-row" key={session.id}><CalendarPlus className="text-red-500" /><div><p>{session.title}</p><span>{session.room} · {new Date(session.start_time).toLocaleString('vi-VN')}</span></div><button className="btn-secondary" type="button" onClick={() => editSession(session)}>Sửa</button><button className="icon-danger" type="button" onClick={() => deleteSession(session.id)}><Trash2 size={17} /></button></div>)}</div>
          </section>
        </div>
      )}

      {section === 'faces' && (
        <section className="card">
          <SectionHeading icon={Database} kicker="Face Vector DB" title="Dữ liệu khuôn mặt" description="Chỉ lưu vector đặc trưng; không lưu ảnh gốc." />
          <div className="mt-5 space-y-2">{profiles.map(profile => <div className="admin-list-row" key={profile.id}><Database className="text-emerald-600" /><div><p>{profile.full_name}</p><span>{profile.student_code} · {profile.class_name} · {profile.sample_count} vector mẫu</span></div><span className="attendance-status attendance-present">{profile.status}</span><button className="icon-danger" type="button" onClick={() => deleteProfile(profile.id)}><Trash2 size={17} /></button></div>)}</div>
        </section>
      )}

      {section === 'alerts' && (
        <section className="card">
          <SectionHeading icon={AlertTriangle} kicker="Anomaly Detection" title="Cảnh báo nghi vấn" />
          <div className="mt-5 space-y-2">
            {anomalies.length === 0 && <EmptyState icon={ShieldCheck} text="Chưa phát hiện bất thường." />}
            {anomalies.map(alert => <div className="alert-row" key={alert.id}><AlertTriangle size={20} /><div><p>{alert.full_name || 'Không rõ sinh viên'} · {alert.alert_type}</p><span>{alert.details}</span></div><b>{alert.severity}</b></div>)}
          </div>
        </section>
      )}
    </div>
  );
}

function InstructorDashboard() {
  const teacherVideoRef = useRef(null);
  const teacherStreamRef = useRef(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyStudentId, setBusyStudentId] = useState(null);
  const [message, setMessage] = useState('');
  const [teacherCameraReady, setTeacherCameraReady] = useState(false);
  const [teacherCameraError, setTeacherCameraError] = useState('');

  async function loadOverview() {
    try {
      const [studentRows, sessionRows, leaveRows] = await Promise.all([
        api('/students'),
        api('/sessions'),
        api('/instructor/leave-requests'),
      ]);
      setStudents(studentRows);
      setSessions(sessionRows);
      setLeaveRequests(leaveRows);
      setSelectedSessionId(current => current || String(sessionRows[0]?.id || ''));
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  async function loadAttendances(sessionId = selectedSessionId) {
    if (!sessionId) {
      setAttendances([]);
      return;
    }
    try {
      setAttendances(await api(`/sessions/${sessionId}/attendances`));
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    loadAttendances(selectedSessionId);
  }, [selectedSessionId]);

  useEffect(() => () => {
    teacherStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const selectedSession = sessions.find(session => String(session.id) === String(selectedSessionId));
  const attendanceByStudent = new Map(attendances.map(attendance => [attendance.student_id, attendance]));
  const roster = students.map(student => ({
    ...student,
    attendance: attendanceByStudent.get(student.id) || null,
  }));
  const normalizedSearch = search.trim().toLocaleLowerCase('vi');
  const filteredRoster = roster.filter(student => {
    const matchesSearch = !normalizedSearch || [
      student.student_code,
      student.full_name,
      student.class_name,
    ].some(value => String(value || '').toLocaleLowerCase('vi').includes(normalizedSearch));
    const isPresent = student.attendance?.status === 'present';
    const isPending = student.attendance?.status === 'pending_face';
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'present' && isPresent)
      || (statusFilter === 'pending' && isPending)
      || (statusFilter === 'absent' && !isPresent && !isPending);
    return matchesSearch && matchesStatus;
  });
  const presentCount = attendances.filter(attendance => attendance.status === 'present').length;
  const pendingFaceCount = attendances.filter(attendance => attendance.status === 'pending_face').length;
  const absentCount = Math.max(students.length - presentCount - pendingFaceCount, 0);
  const attendanceRate = students.length ? Math.round((presentCount / students.length) * 100) : 0;

  function isLate(attendance) {
    if (!attendance || !selectedSession) return false;
    const checkedAt = new Date(attendance.checked_at).getTime();
    const startAt = new Date(selectedSession.start_time).getTime();
    return checkedAt > startAt + 15 * 60 * 1000;
  }

  async function markPresent(studentId) {
    if (!selectedSessionId) {
      setMessage('❌ Hãy chọn một buổi học trước.');
      return;
    }
    setBusyStudentId(studentId);
    setMessage('');
    try {
      await api('/instructor/attendance', {
        method: 'POST',
        body: JSON.stringify({
          student_id: studentId,
          session_id: Number(selectedSessionId),
        }),
      });
      await loadAttendances();
      setMessage('✅ Đã ghi nhận sinh viên có mặt.');
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setBusyStudentId(null);
    }
  }

  async function removeAttendance(student) {
    if (!student.attendance) return;
    setBusyStudentId(student.id);
    setMessage('');
    try {
      await api(`/instructor/attendance/${student.attendance.id}`, { method: 'DELETE' });
      await loadAttendances();
      setMessage('✅ Đã hủy lượt điểm danh.');
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setBusyStudentId(null);
    }
  }

  async function scanFaceAttendances() {
    if (!selectedSessionId) {
      setMessage('❌ Hãy chọn một buổi học trước.');
      return;
    }
    setBusyStudentId('face-scan');
    setMessage('Đang quét các lượt điểm danh khuôn mặt...');
    try {
      const result = await api(`/instructor/face-attendance/scan?session_id=${selectedSessionId}`, {
        method: 'POST',
      });
      await Promise.all([loadAttendances(), loadOverview()]);
      setMessage(`✅ ${result.message}`);
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setBusyStudentId(null);
    }
  }

  async function openTeacherCamera() {
    setTeacherCameraError('');
    try {
      teacherStreamRef.current?.getTracks().forEach(track => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      teacherStreamRef.current = stream;
      if (teacherVideoRef.current) teacherVideoRef.current.srcObject = stream;
      setTeacherCameraReady(true);
    } catch (error) {
      setTeacherCameraReady(false);
      setTeacherCameraError(describeCameraError(error));
    }
  }

  function closeTeacherCamera() {
    teacherStreamRef.current?.getTracks().forEach(track => track.stop());
    teacherStreamRef.current = null;
    if (teacherVideoRef.current) teacherVideoRef.current.srcObject = null;
    setTeacherCameraReady(false);
  }

  async function scanRoomAndConfirm() {
    if (!teacherCameraReady) {
      await openTeacherCamera();
      return;
    }
    await scanFaceAttendances();
  }

  async function reviewLeave(requestId, status) {
    try {
      await api(`/instructor/leave-requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, teacher_note: status === 'approved' ? 'Đã xác nhận' : 'Không đủ điều kiện' }),
      });
      setMessage(status === 'approved' ? '✅ Đã duyệt đơn.' : '✅ Đã từ chối đơn.');
      await loadOverview();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  function exportCsv() {
    if (!selectedSession) {
      setMessage('❌ Chưa có buổi học để xuất báo cáo.');
      return;
    }
    const escapeCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [
      ['Mã sinh viên', 'Họ và tên', 'Lớp', 'Trạng thái', 'Phương thức', 'Thời gian'],
      ...roster.map(student => [
        student.student_code,
        student.full_name,
        student.class_name,
        student.attendance
          ? student.attendance.status === 'pending_face'
            ? 'Chờ xác nhận khuôn mặt'
            : isLate(student.attendance) ? 'Đi muộn' : 'Có mặt'
          : 'Vắng',
        student.attendance?.method || '',
        student.attendance?.checked_at
          ? new Date(student.attendance.checked_at).toLocaleString('vi-VN')
          : '',
      ]),
    ];
    const csv = `\uFEFF${rows.map(row => row.map(escapeCell).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `diem-danh-${selectedSession.title.replaceAll(/\s+/g, '-').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <section className="teacher-stats">
        <TeacherStat icon={Users} label="Tổng sinh viên" value={students.length} tone="red" />
        <TeacherStat icon={CalendarPlus} label="Buổi thực hành" value={sessions.length} tone="cyan" />
        <TeacherStat icon={UserCheck} label="Có mặt" value={presentCount} tone="green" />
        <TeacherStat icon={ScanFace} label="Chờ quét khuôn mặt" value={pendingFaceCount} tone="amber" />
      </section>

      <section className="teacher-face-scanner">
        <div className="teacher-face-copy">
          <div className="teacher-face-icon"><ScanFace size={28} /></div>
          <p className="section-kicker">Điểm danh khuôn mặt tập thể</p>
          <h3>Quét cả phòng Lab</h3>
          <p>
            Mở camera, hướng về lớp học rồi bấm quét. Hệ thống xác nhận các sinh viên đã gửi
            khuôn mặt cho buổi đang chọn và chuyển trạng thái sang Có mặt.
          </p>
          <div className="teacher-face-counts">
            <span><Activity size={15} />{pendingFaceCount} đang chờ xác nhận</span>
            <span><UserCheck size={15} />{presentCount} đã có mặt</span>
          </div>
          <div className="teacher-face-actions">
            <button type="button" className="face-scan-button" onClick={scanRoomAndConfirm} disabled={!selectedSessionId || busyStudentId === 'face-scan'}>
              <Camera size={18} />
              {!teacherCameraReady ? 'Mở camera quét mặt' : busyStudentId === 'face-scan' ? 'Đang quét...' : `Quét và xác nhận (${pendingFaceCount})`}
            </button>
            {teacherCameraReady && <button type="button" className="btn-secondary" onClick={closeTeacherCamera}>Tắt camera</button>}
          </div>
          {teacherCameraError && <div className="result-message mt-4">❌ {teacherCameraError}</div>}
        </div>
        <div className="teacher-camera-view">
          <video ref={teacherVideoRef} autoPlay muted playsInline />
          {!teacherCameraReady && (
            <div className="teacher-camera-placeholder">
              <ScanFace size={44} />
              <p>Camera quét tập thể chưa bật</p>
            </div>
          )}
          {teacherCameraReady && (
            <>
              <div className="teacher-camera-grid" />
              <div className="camera-caption"><Activity size={15} />Sẵn sàng quét lớp học</div>
            </>
          )}
        </div>
      </section>

      <section className="card">
        <div className="teacher-toolbar">
          <div className="min-w-0 flex-1">
            <SectionHeading
              icon={GraduationCap}
              kicker="Quản lý chuyên cần"
              title="Danh sách điểm danh"
              description="Chọn buổi học để theo dõi và điều chỉnh trạng thái sinh viên."
            />
          </div>
          <button type="button" className="btn-secondary" onClick={() => loadAttendances()}>
            <RefreshCw size={17} />Làm mới
          </button>
          <button type="button" className="btn" onClick={exportCsv}>
            <Download size={17} />Xuất CSV
          </button>
        </div>

        <div className="teacher-controls">
          <label className="field-label">
            Buổi học
            <select
              className="input mt-2"
              value={selectedSessionId}
              onChange={event => setSelectedSessionId(event.target.value)}
            >
              {sessions.length === 0 && <option value="">Chưa có buổi học</option>}
              {sessions.map(session => (
                <option key={session.id} value={session.id}>{session.title} — {session.room}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Tìm sinh viên
            <span className="search-field mt-2">
              <Search size={17} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Mã, tên hoặc lớp..." />
            </span>
          </label>
        </div>

        <div className="teacher-summary">
          <div>
            <p className="font-black text-slate-950">{selectedSession?.title || 'Chưa chọn buổi học'}</p>
            <p className="mt-1 text-sm text-slate-500">
              {selectedSession ? `${selectedSession.room} · ${new Date(selectedSession.start_time).toLocaleString('vi-VN')}` : 'Tạo buổi thực hành để bắt đầu quản lý.'}
            </p>
          </div>
          <div className="teacher-filter-tabs">
            {[
              ['all', `Tất cả ${students.length}`],
              ['present', `Có mặt ${presentCount}`],
              ['pending', `Chờ xác nhận ${pendingFaceCount}`],
              ['absent', `Vắng ${absentCount}`],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setStatusFilter(value)}
                className={statusFilter === value ? 'teacher-filter-active' : ''}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {message && <div className="result-message mt-4">{message}</div>}

        <div className="teacher-roster">
          {filteredRoster.length === 0 && (
            <EmptyState icon={Users} text="Không tìm thấy sinh viên phù hợp." />
          )}
          {filteredRoster.map(student => {
            const present = student.attendance?.status === 'present';
            const pendingFace = student.attendance?.status === 'pending_face';
            const late = isLate(student.attendance);
            return (
              <article className="teacher-student-row" key={student.id}>
                <StudentPhoto student={student} />
                <div className="teacher-student-info">
                  <p>{student.full_name}</p>
                  <span>{student.student_code} · {student.class_name}</span>
                </div>
                <div className="teacher-attendance-detail">
                  <span className={`attendance-status ${pendingFace ? 'attendance-pending' : present ? (late ? 'attendance-late' : 'attendance-present') : 'attendance-absent'}`}>
                    {pendingFace ? 'Chờ xác nhận mặt' : present ? (late ? 'Đi muộn' : 'Có mặt') : 'Vắng'}
                  </span>
                  {student.attendance && (
                    <small>
                      {student.attendance.method === 'MANUAL' ? 'Giảng viên ghi nhận' : student.attendance.method}
                      {' · '}
                      {new Date(student.attendance.checked_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </small>
                  )}
                </div>
                <button
                  type="button"
                  className={student.attendance ? 'attendance-action attendance-remove' : 'attendance-action attendance-add'}
                  disabled={busyStudentId === student.id || !selectedSessionId}
                  onClick={() => student.attendance ? removeAttendance(student) : markPresent(student.id)}
                >
                  {student.attendance ? <UserX size={17} /> : <UserCheck size={17} />}
                  {busyStudentId === student.id ? 'Đang xử lý...' : student.attendance ? 'Hủy lượt ghi nhận' : 'Đánh dấu có mặt'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between gap-3">
          <SectionHeading icon={FileCheck} kicker="Leave Requests" title="Phê duyệt đơn sinh viên" />
          <span className="count-badge">{leaveRequests.filter(request => request.status === 'pending').length} chờ duyệt</span>
        </div>
        <div className="mt-5 space-y-2">
          {leaveRequests.length === 0 && <EmptyState icon={FileCheck} text="Chưa có đơn xin phép." />}
          {leaveRequests.map(request => (
            <div className="leave-review-row" key={request.id}>
              <div>
                <p>{request.full_name} <small>({request.student_code})</small></p>
                <span>{request.request_type === 'leave' ? 'Xin nghỉ' : 'Báo đi muộn'} · {request.session_title || 'Không gắn buổi học'}</span>
                <em>{request.reason}{request.evidence_name ? ` · Minh chứng: ${request.evidence_name}` : ''}</em>
              </div>
              {request.status === 'pending' ? (
                <div>
                  <button type="button" className="attendance-action attendance-add" onClick={() => reviewLeave(request.id, 'approved')}>Duyệt</button>
                  <button type="button" className="attendance-action attendance-remove" onClick={() => reviewLeave(request.id, 'rejected')}>Từ chối</button>
                </div>
              ) : (
                <span className={`attendance-status ${request.status === 'approved' ? 'attendance-present' : 'attendance-absent'}`}>
                  {request.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TeacherStat({ icon: Icon, label, value, tone }) {
  return (
    <div className={`teacher-stat teacher-stat-${tone}`}>
      <span><Icon size={21} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function StudentPhoto({ student }) {
  if (student.face_image_path) {
    return (
      <img
        className="student-photo"
        src={student.face_image_path}
        alt={`Ảnh ${student.full_name}`}
      />
    );
  }
  return <div className="student-avatar">{student.full_name?.charAt(0) || 'S'}</div>;
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

function CheckIn({ currentUser }) {
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
        {currentUser.role === 'student' && (
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
        )}
      </div>
      {switchingCamera && <div className="camera-switching"><Activity size={20} />Đang chuyển camera...</div>}
      {method === 'qr'
        ? <QrCheckIn registerCameraStop={registerCameraStop} currentUser={currentUser} />
        : <FaceDetect registerCameraStop={registerCameraStop} currentUser={currentUser} />}
    </div>
  );
}

function QrCheckIn({ registerCameraStop, currentUser }) {
  const [studentCode, setStudentCode] = useState(currentUser.student_code || 'SV001');
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
          <input
            className="input mt-2"
            value={studentCode}
            onChange={e => setStudentCode(e.target.value)}
            placeholder="Ví dụ: SV001"
            disabled={currentUser.role === 'student'}
          />
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

function FaceDetect({ registerCameraStop, currentUser }) {
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
    location: 'Đang lấy vị trí...',
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
    let location = 'Đang lấy vị trí...';
    let accuracy = null;
    getCurrentCoordinates().then(coordinates => {
      if (!active) return;
      if (coordinates) {
        location = `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
        accuracy = coordinates.accuracy || null;
      } else {
        location = 'Không có dữ liệu vị trí';
      }
      setLiveStamp(current => ({ ...current, location, accuracy }));
    });
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
      return;
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
      formData.append('liveness_passed', String(livenessPassed));
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
              <b><MapPin size={13} />{liveStamp.location}</b>
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
          <button type="button" className="btn mt-4 w-full" onClick={upload} disabled={!photo || loading || !selectedSessionId || !livenessPassed}>
            <Send size={18} />{loading ? 'Đang gửi...' : 'Gửi điểm danh khuôn mặt'}
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

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <p>{text}</p>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
