import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  BookOpen,
  CalendarPlus,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Download,
  Database,
  ExternalLink,
  FileCheck,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  MapPinned,
  MessageCircle,
  Minus,
  Network,
  QrCode,
  RefreshCw,
  ScanFace,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
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
  { id: 'checkin', label: 'Điểm danh', description: 'Mã QR & khuôn mặt', icon: QrCode, roles: ['student'] },
  { id: 'studentPortal', label: 'Cổng sinh viên', description: 'Lịch, lịch sử, xin nghỉ', icon: CalendarPlus, roles: ['student'] },
  { id: 'socraticDashboard', label: 'Gia sư AI & Lộ trình', description: 'Học tập AI, Socratic Chat', icon: Sparkles, roles: ['student'] },
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
  socraticDashboard: {
    eyebrow: 'Học tập Socratic',
    title: 'Không gian học tập AI',
    description: 'Trao đổi với gia sư AI, học tập theo lộ trình cá nhân hóa và làm kiểm tra.',
    icon: Sparkles,
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

function defaultTabForRole(role) {
  if (role === 'teacher') return 'instructor';
  if (role === 'admin') return 'admin';
  return 'checkin';
}

function isTabAllowed(tab, role) {
  return navigation.some(item => item.id === tab && item.roles.includes(role));
}

const tabPaths = {
  checkin: '/student/check-in',
  studentPortal: '/student/home',
  socraticDashboard: '/student/socratic',
  sessions: '/teacher/attendance/create',
  students: '/teacher/classes',
  instructor: '/teacher/dashboard',
  admin: '/admin/dashboard',
};

const lessonCatalog = [
  { id: 1, title: 'Nền tảng AI & LLM' },
  { id: 2, title: 'Xác định bài toán AI' },
  { id: 3, title: 'Chatbot & Agent' },
  { id: 4, title: 'Thiết kế câu lệnh & Tool Calling' },
  { id: 5, title: 'Tư duy sản phẩm AI' },
  { id: 6, title: 'Xây dựng nguyên mẫu thử nghiệm' },
];


function tabFromPath(role) {
  const entry = Object.entries(tabPaths).find(([, path]) => window.location.pathname.startsWith(path));
  return entry && isTabAllowed(entry[0], role) ? entry[0] : defaultTabForRole(role);
}

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('VinLab page crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="card page-error">
        <div className="page-error-icon"><AlertTriangle size={28} /></div>
        <div>
          <p className="section-kicker">Không thể mở màn hình</p>
          <h3>Trang này vừa gặp lỗi</h3>
          <p>Ứng dụng vẫn hoạt động. Hãy tải lại riêng màn hình này để tiếp tục.</p>
          <button type="button" className="btn-secondary mt-4" onClick={() => this.setState({ error: null })}>
            <RefreshCw size={17} />Thử lại
          </button>
        </div>
      </section>
    );
  }
}

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('VinLab root crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="root-error">
        <div className="root-error-panel">
          <AlertTriangle size={34} />
          <h1>VINLAB gặp lỗi hiển thị</h1>
          <p>{this.state.error?.message || 'Không thể tải giao diện.'}</p>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            <RefreshCw size={18} />Tải lại ứng dụng
          </button>
        </div>
      </main>
    );
  }
}

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

async function getLocationName(latitude, longitude) {
  const fallback = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  const cacheKey = `vinlab-location-v3-${latitude.toFixed(5)}-${longitude.toFixed(5)}`;

  function uniqueNames(values) {
    return values.filter((value, index, items) => value && items.indexOf(value) === index);
  }

  function prefixedAdministrativeName(item) {
    if (!item?.name) return '';
    const name = item.name.trim();
    if (/^(phường|xã|thị trấn|quận|huyện|thị xã|thành phố|tp\.?)/i.test(name)) return name;
    const description = String(item.description || '').toLocaleLowerCase('vi');
    if (description.includes('ward') || description.includes('phường')) return `phường ${name}`;
    if (description.includes('commune') || description.includes('xã')) return `xã ${name}`;
    if (description.includes('township') || description.includes('thị trấn')) return `thị trấn ${name}`;
    return name;
  }

  function cityName(value) {
    if (!value) return '';
    return /^(thành phố|tp\.?)/i.test(value) ? value : `TP. ${value}`;
  }

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached;

    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: 'vi',
    });
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${query}`);
    if (!response.ok) return fallback;

    const data = await response.json();
    const administrative = [...(data.localityInfo?.administrative || [])]
      .sort((left, right) => (right.adminLevel || 0) - (left.adminLevel || 0));
    const ward = administrative.find(item => {
      const description = String(item.description || '').toLocaleLowerCase('vi');
      return /ward|commune|township|phường|xã|thị trấn/.test(description);
    });
    const locality = data.locality || (data.localityInfo?.informative || [])
      .slice()
      .sort((left, right) => (right.order || 0) - (left.order || 0))
      .find(item => item.name)?.name;
    const municipality = data.city || data.principalSubdivision;
    const parts = uniqueNames([
      locality,
      ward && ward.name !== locality ? prefixedAdministrativeName(ward) : '',
      municipality && municipality !== locality && municipality !== ward?.name ? cityName(municipality) : '',
    ]);
    const locationName = parts.join(', ') || data.countryName || fallback;
    sessionStorage.setItem(cacheKey, locationName);
    return locationName;
  } catch {
    return fallback;
  }
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
      async position => {
        const { latitude, longitude, accuracy } = position.coords;
        const location = await getLocationName(latitude, longitude);
        resolve({
          date,
          time,
          dateTime,
          location,
          accuracy: Math.round(accuracy),
        });
      },
      () => resolve({ date, time, dateTime, location: 'Không có dữ liệu vị trí', accuracy: null }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
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
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
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

function downloadExcel(records, filename = 'bao-cao-diem-danh.xls') {
  const columns = ['Mã SV', 'Họ tên', 'Lớp', 'Buổi học', 'Trạng thái', 'Phương thức', 'Độ tin cậy', 'Thời gian'];
  const rows = records.map(row => [
    row.student_code,
    row.full_name,
    row.class_name,
    row.session_title,
    row.status,
    row.method,
    row.confidence_score ?? '',
    row.checked_at ? new Date(row.checked_at).toLocaleString('vi-VN') : '',
  ]);
  const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const table = `<table><thead><tr>${columns.map(value => `<th>${escape(value)}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map(row => `<tr>${row.map(value => `<td>${escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const url = URL.createObjectURL(new Blob([`\uFEFF${table}`], { type: 'application/vnd.ms-excel;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function printPdfReport(records) {
  const popup = window.open('', '_blank', 'width=1000,height=760');
  if (!popup) return;
  const rows = records.map(row => `<tr><td>${row.student_code}</td><td>${row.full_name}</td><td>${row.class_name}</td><td>${row.session_title}</td><td>${row.status}</td><td>${row.method}</td><td>${row.confidence_score ?? ''}</td></tr>`).join('');
  popup.document.write(`<!doctype html><html><head><title>Báo cáo điểm danh</title><style>body{font-family:Arial;padding:28px;color:#172033}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #d8dee9;padding:8px;text-align:left;font-size:12px}th{background:#f1f5f9}</style></head><body><h1>Báo cáo điểm danh VINLAB</h1><p>Ngày xuất: ${new Date().toLocaleString('vi-VN')}</p><table><thead><tr><th>Mã SV</th><th>Họ tên</th><th>Lớp</th><th>Buổi học</th><th>Trạng thái</th><th>Phương thức</th><th>Confidence</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
  popup.document.close();
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-label="VinLab">
      <span>V</span>
    </div>
  );
}

function WelcomeScreen({ onGoToLogin }) {
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
            <div className="text-slate-900">
              <span className="block font-black text-lg tracking-tight leading-none">VINLAB</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Smart Attendance</span>
            </div>
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
                <span className="block font-bold text-red-500">📍 PHÒNG LAB 402</span>
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
              <strong className="text-slate-900 font-black text-lg">VINLAB</strong>
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

function ForcedFaceCheckIn({ currentUser, session, onComplete, onLogout }) {
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


function App() {
  const storedUser = getStoredUser();
  const [currentUser, setCurrentUser] = useState(storedUser);
  const [tab, setTab] = useState(() => tabFromPath(storedUser?.role));
  const [checkingSession, setCheckingSession] = useState(Boolean(storedUser));
  const [studentFaceProfile, setStudentFaceProfile] = useState(null);
  const [checkingFaceProfile, setCheckingFaceProfile] = useState(storedUser?.role === 'student');
  const [cameraPermissionReady, setCameraPermissionReady] = useState(
    () => localStorage.getItem('vinlab-camera-permission') === 'granted',
  );

  const [viewingWelcome, setViewingWelcome] = useState(() => {
    return !storedUser && (window.location.pathname === '/welcome' || window.location.pathname === '/' || window.location.pathname === '');
  });

  const [requireFaceAttendance, setRequireFaceAttendance] = useState(false);
  const [activeSessionForForcedCheckin, setActiveSessionForForcedCheckin] = useState(null);
  const [checkingAttendance, setCheckingAttendance] = useState(false);

  const visibleNavigation = navigation.filter(item => item.roles.includes(currentUser?.role));
  const activeTab = isTabAllowed(tab, currentUser?.role) ? tab : defaultTabForRole(currentUser?.role);
  const meta = pageMeta[activeTab] || pageMeta.checkin;
  const PageIcon = meta.icon;

  useEffect(() => {
    if (!currentUser) {
      setCheckingSession(false);
      return;
    }
    api('/auth/me')
      .then(user => {
        setCurrentUser(user);
        setTab(current => isTabAllowed(current, user.role) ? current : defaultTabForRole(user.role));
      })
      .catch(() => {
        clearSession();
        setCurrentUser(null);
      })
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (!currentUser) {
        const isWelcome = window.location.pathname === '/welcome' || window.location.pathname === '/' || window.location.pathname === '';
        setViewingWelcome(isWelcome);
      } else {
        setTab(tabFromPath(currentUser?.role));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  useEffect(() => {
    function handleExpiredSession() {
      setCurrentUser(null);
      setViewingWelcome(true);
      setTab('checkin');
      window.history.replaceState({}, '', '/welcome');
    }
    window.addEventListener('vinlab-auth-expired', handleExpiredSession);
    return () => window.removeEventListener('vinlab-auth-expired', handleExpiredSession);
  }, []);

  useEffect(() => {
    if (currentUser?.role !== 'student') {
      setStudentFaceProfile(null);
      setCheckingFaceProfile(false);
      return;
    }
    let active = true;
    setCheckingFaceProfile(true);
    api('/student/face-profile')
      .then(profile => {
        if (active) setStudentFaceProfile(profile);
      })
      .catch(() => {
        if (active) setStudentFaceProfile({ enrolled: false, sample_count: 0 });
      })
      .finally(() => {
        if (active) setCheckingFaceProfile(false);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role !== 'student' || !studentFaceProfile?.enrolled) {
      setRequireFaceAttendance(false);
      setActiveSessionForForcedCheckin(null);
      setCheckingAttendance(false);
      return;
    }

    let active = true;
    setCheckingAttendance(true);

    async function verifyCheckIn() {
      try {
        const schedule = await api('/student/schedule');
        const activeSessions = schedule.filter(s => s.status === 'active');

        if (activeSessions.length === 0) {
          if (active) {
            setRequireFaceAttendance(false);
            setActiveSessionForForcedCheckin(null);
            setCheckingAttendance(false);
          }
          return;
        }

        const activeSession = activeSessions[0];

        const history = await api('/student/attendance-history');
        const hasCheckedIn = history.some(
          att => att.session_id === activeSession.id &&
          (att.status === 'present' || att.status === 'pending_review' || att.status === 'excused')
        );

        if (active) {
          if (hasCheckedIn) {
            setRequireFaceAttendance(false);
            setActiveSessionForForcedCheckin(null);
          } else {
            setRequireFaceAttendance(true);
            setActiveSessionForForcedCheckin(activeSession);
          }
        }
      } catch (error) {
        console.error('Error verifying attendance:', error);
      } finally {
        if (active) setCheckingAttendance(false);
      }
    }

    verifyCheckIn();

    return () => {
      active = false;
    };
  }, [currentUser?.id, studentFaceProfile?.enrolled]);

  function handleLogout() {
    clearSession();
    setCurrentUser(null);
    setViewingWelcome(true);
    setTab('checkin');
    window.history.replaceState({}, '', '/welcome');
  }

  function openTab(nextTab) {
    if (!isTabAllowed(nextTab, currentUser?.role)) return;
    setTab(nextTab);
    window.history.pushState({}, '', tabPaths[nextTab]);
  }

  if (checkingSession) {
    return <div className="auth-loading"><Activity size={28} /><p>Đang kiểm tra phiên đăng nhập...</p></div>;
  }

  if (!currentUser) {
    if (viewingWelcome) {
      return (
        <WelcomeScreen
          onGoToLogin={() => {
            setViewingWelcome(false);
            window.history.pushState({}, '', '/login');
          }}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={user => {
          setCurrentUser(user);
          const nextTab = defaultTabForRole(user.role);
          setTab(nextTab);
          window.history.replaceState({}, '', tabPaths[nextTab]);
        }}
        onGoToWelcome={() => {
          setViewingWelcome(true);
          window.history.pushState({}, '', '/welcome');
        }}
      />
    );
  }

  if (currentUser.role === 'student' && (checkingFaceProfile || !studentFaceProfile || checkingAttendance)) {
    return <div className="auth-loading"><Activity size={28} /><p>Đang kiểm tra thông tin sinh viên & điểm danh...</p></div>;
  }

  if (currentUser.role === 'student' && !studentFaceProfile.enrolled) {
    return (
      <StudentFaceSetup
        currentUser={currentUser}
        profile={studentFaceProfile}
        onLogout={handleLogout}
        onComplete={async () => {
          const profile = await api('/student/face-profile');
          setStudentFaceProfile(profile);
          setTab('checkin');
          window.history.replaceState({}, '', tabPaths.checkin);
        }}
      />
    );
  }

  if (currentUser.role === 'student' && requireFaceAttendance) {
    return (
      <ForcedFaceCheckIn
        currentUser={currentUser}
        session={activeSessionForForcedCheckin}
        onLogout={handleLogout}
        onComplete={() => {
          setRequireFaceAttendance(false);
          setActiveSessionForForcedCheckin(null);
        }}
      />
    );
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

      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-48 pt-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 lg:pb-10">
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
                  onClick={() => openTab(id)}
                  className={`nav-item ${activeTab === id ? 'nav-item-active' : ''}`}
                >
                  <span className="nav-icon"><Icon size={20} strokeWidth={2.3} /></span>
                  <span className="min-w-0 text-left">
                    <span className="block font-bold">{label}</span>
                    <span className={`block text-xs ${activeTab === id ? 'text-white/70' : 'text-slate-400'}`}>
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

          <div className="page-content-stage mt-6">
            <PageErrorBoundary key={`${currentUser.role}:${activeTab}`}>
              {currentUser.role === 'student' && activeTab === 'checkin' && (
                cameraPermissionReady
                  ? <CheckIn currentUser={currentUser} />
                  : <CameraPermission onGranted={() => setCameraPermissionReady(true)} />
              )}
              {currentUser.role === 'teacher' && activeTab === 'sessions' && <Sessions />}
              {currentUser.role === 'teacher' && activeTab === 'students' && <Students />}
              {currentUser.role === 'teacher' && activeTab === 'instructor' && <InstructorDashboard />}
              {currentUser.role === 'student' && activeTab === 'studentPortal' && <StudentPortal />}
              {currentUser.role === 'student' && activeTab === 'socraticDashboard' && <SocraticWorkspace />}
              {currentUser.role === 'admin' && activeTab === 'admin' && <AdminDashboard />}
            </PageErrorBoundary>
            <div className="mobile-content-spacer lg:hidden" aria-hidden="true" />
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
            onClick={() => openTab(id)}
            className={`mobile-nav-item ${activeTab === id ? 'mobile-nav-active' : ''}`}
          >
            <Icon size={21} strokeWidth={2.4} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function LoginScreen({ onLogin, onGoToWelcome }) {
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
            Email hoặc mã sinh viên
            <input
              className="input mt-2"
              value={form.username}
              onChange={event => setForm({ ...form, username: event.target.value })}
              placeholder="Nhập email hoặc mã sinh viên"
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
          
          <div className="mt-4 text-center">
            <button type="button" className="text-xs font-bold text-slate-500 hover:text-slate-700 underline cursor-pointer" onClick={onGoToWelcome}>
              Quay lại trang chủ
            </button>
          </div>

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

function StudentFaceSetup({ currentUser, profile, onComplete, onLogout }) {
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
  const [appeals, setAppeals] = useState([]);
  const [faceProfile, setFaceProfile] = useState({ enrolled: false, sample_count: 0 });
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ session_id: '', request_type: 'leave', reason: '', evidence_name: '' });
  const [appealForm, setAppealForm] = useState({ attendance_id: '', session_id: '', reason: '', evidence_name: '' });

  async function load() {
    try {
      const [scheduleRows, historyRows, requestRows, profile, appealRows] = await Promise.all([
        api('/student/schedule'),
        api('/student/attendance-history'),
        api('/student/leave-requests'),
        api('/student/face-profile'),
        api('/student/appeals'),
      ]);
      setSchedule(scheduleRows);
      setHistory(historyRows);
      setRequests(requestRows);
      setFaceProfile(profile);
      setAppeals(appealRows);
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

  async function submitAppeal(event) {
    event.preventDefault();
    try {
      await api('/student/appeals', {
        method: 'POST',
        body: JSON.stringify({
          ...appealForm,
          attendance_id: appealForm.attendance_id ? Number(appealForm.attendance_id) : null,
          session_id: appealForm.session_id ? Number(appealForm.session_id) : null,
        }),
      });
      setMessage('✅ Đã gửi yêu cầu sửa điểm danh.');
      setAppealForm({ attendance_id: '', session_id: '', reason: '', evidence_name: '' });
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
                <span className={`attendance-status ${['pending_face', 'pending_review'].includes(item.status) ? 'attendance-pending' : item.status === 'late' ? 'attendance-late' : item.status === 'rejected' ? 'attendance-absent' : 'attendance-present'}`}>
                  {['pending_face', 'pending_review'].includes(item.status) ? 'Chờ xác nhận' : item.status === 'late' ? 'Đi muộn' : item.status === 'rejected' ? 'Từ chối' : 'Có mặt'}
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

      <form className="card" onSubmit={submitAppeal}>
        <SectionHeading icon={AlertTriangle} kicker="Attendance Appeal" title="Yêu cầu sửa điểm danh" description="Gửi yêu cầu khi trạng thái điểm danh chưa chính xác." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="field-label">Bản ghi điểm danh
            <select className="input mt-2" value={appealForm.attendance_id} onChange={event => {
              const attendance = history.find(item => String(item.id) === event.target.value);
              setAppealForm({ ...appealForm, attendance_id: event.target.value, session_id: attendance ? String(attendance.session_id) : '' });
            }}>
              <option value="">Chọn bản ghi cần sửa</option>
              {history.map(item => <option key={item.id} value={item.id}>{item.title} · {item.status}</option>)}
            </select>
          </label>
          <label className="field-label">Minh chứng<input className="input mt-2" value={appealForm.evidence_name} onChange={event => setAppealForm({ ...appealForm, evidence_name: event.target.value })} placeholder="Tên ảnh hoặc tài liệu" /></label>
          <label className="field-label md:col-span-2">Lý do<textarea className="input mt-2 min-h-24" required value={appealForm.reason} onChange={event => setAppealForm({ ...appealForm, reason: event.target.value })} /></label>
        </div>
        <button className="btn mt-4" type="submit"><Send size={17} />Gửi yêu cầu</button>
        <div className="mt-5 space-y-2">
          {appeals.map(item => <div className="request-row" key={item.id}><span>{item.reason}</span><b className={`request-${item.status}`}>{item.status}</b></div>)}
        </div>
      </form>
    </div>
  );
}

function SocraticWorkspace() {
  const [subTab, setSubTab] = useState('home');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonResource, setLessonResource] = useState(null);
  const [lessonSlides, setLessonSlides] = useState([]);
  const [slidePdfUrl, setSlidePdfUrl] = useState('');
  const [slideLoading, setSlideLoading] = useState(false);
  const [slideError, setSlideError] = useState('');
  const [slideAssistantOpen, setSlideAssistantOpen] = useState(false);
  const slideChatEndRef = useRef(null);
  const [level, setLevel] = useState(3);
  const [xp, setXp] = useState(240);
  const [streak, setStreak] = useState(12);
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Trao đổi với AI Tutor', sub: 'Hỏi 1 câu về Prompt Design', xp: 20, completed: false, tab: 'tutor' },
    { id: 2, title: 'Luyện tập kỹ năng yếu', sub: 'Khắc phục lỗ hổng RAG', xp: 30, completed: false, tab: 'knowledge-map' },
    { id: 3, title: 'Hoàn thành bài kiểm tra thử', sub: 'Quiz: Lý thuyết AI Cơ bản', xp: 50, completed: false, tab: 'exam' }
  ]);

  // VLearn customization states
  const [selectedNode, setSelectedNode] = useState('rag');
  const [socraticMode, setSocraticMode] = useState(true);

  // Chatbot states
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Chào bạn! Hôm nay chúng ta sẽ tìm hiểu về Prompt Engineering (Thiết kế câu lệnh). Theo bạn, điều gì làm nên sự khác biệt giữa một câu lệnh chung chung và một câu lệnh có cấu trúc tốt?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatTopic, setChatTopic] = useState('prompt_design');
  const [chatReplying, setChatReplying] = useState(false);

  // Quiz states
  const [quizActive, setQuizActive] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(null);

  // History states
  const [studyHistory, setStudyHistory] = useState([
    { id: 1, name: 'Socratic Chat: RAG basics', score: '95% hoàn thành', date: '21/06/2026' },
    { id: 2, name: 'Quiz: Prompt Design', score: '8/10', date: '19/06/2026' },
    { id: 3, name: 'Socratic Chat: AI Agent', score: '80% hoàn thành', date: '15/06/2026' }
  ]);

  useEffect(() => {
    api('/lessons/slides').then(setLessonSlides).catch(() => setLessonSlides([]));
  }, []);

  useEffect(() => () => {
    if (slidePdfUrl) URL.revokeObjectURL(slidePdfUrl);
  }, [slidePdfUrl]);

  useEffect(() => {
    if (slideAssistantOpen) {
      slideChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, slideAssistantOpen]);

  useEffect(() => {
    if (!selectedLesson) return;
    if (selectedLesson.id === 3 || selectedLesson.id === 6) {
      setChatTopic('ai_agents');
    } else if (selectedLesson.id === 1 || selectedLesson.id === 2) {
      setChatTopic('rag_basics');
    } else {
      setChatTopic('prompt_design');
    }
  }, [selectedLesson?.id]);

  async function openLessonSlide(lessonId) {
    setLessonResource('slides');
    setSlideAssistantOpen(false);
    setSlideLoading(true);
    setSlideError('');
    try {
      const response = await fetch(`${API}/lessons/${lessonId}/slide`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Không thể mở slide');
      }
      setSlidePdfUrl(URL.createObjectURL(await response.blob()));
    } catch (error) {
      setSlidePdfUrl('');
      setSlideError(error.message);
    } finally {
      setSlideLoading(false);
    }
  }

  const roadmapLessons = [
    {
      id: 1,
      title: 'Nền tảng AI & LLM',
      description: 'Khái niệm về mô hình ngôn ngữ lớn, các tham số cơ bản và cách hoạt động của mạng neuron sinh học/nhân tạo.',
      status: 'completed',
      duration: '90 phút',
      slides: 24,
      labTitle: 'Khám phá tham số của LLM',
      labDescription: 'Thử nghiệm Temperature và Top-p để quan sát sự thay đổi trong câu trả lời của mô hình.',
      quizQuestions: 10,
    },
    {
      id: 2,
      title: 'Xác định bài toán AI',
      description: 'Tìm hiểu các miền ứng dụng của học máy, phân biệt phân loại, hồi quy và học không giám sát.',
      status: 'completed',
      duration: '100 phút',
      slides: 28,
      labTitle: 'Phân loại bài toán thực tế',
      labDescription: 'Phân tích các tình huống và lựa chọn đúng nhóm bài toán AI cùng chỉ số đánh giá.',
      quizQuestions: 10,
    },
    {
      id: 3,
      title: 'Chatbot & Agent',
      description: 'Từ ứng dụng hỏi đáp cơ bản đến tác nhân có thể quan sát, lập kế hoạch và gọi API công cụ ngoài.',
      status: 'completed',
      duration: '110 phút',
      slides: 32,
      labTitle: 'Thiết kế luồng chatbot',
      labDescription: 'Xây dựng một luồng hội thoại có bộ nhớ và xử lý các nhánh yêu cầu phổ biến.',
      quizQuestions: 12,
    },
    {
      id: 4,
      title: 'Thiết kế câu lệnh & Tool Calling',
      description: 'System Prompt, kỹ thuật ít mẫu (few-shot prompting) và chỉ định tham số đầu ra có cấu trúc.',
      status: 'active',
      duration: '120 phút',
      slides: 36,
      labTitle: 'Xây dựng trợ lý gọi công cụ',
      labDescription: 'Viết system prompt, định nghĩa JSON schema và xử lý kết quả từ một công cụ giả lập.',
      quizQuestions: 15,
    },
    {
      id: 5,
      title: 'Tư duy sản phẩm AI',
      description: 'Phân tích tính khả thi của tính năng AI, xác định metrics đo lường và quản trị rủi ro ảo tưởng.',
      status: 'locked',
      duration: '100 phút',
      slides: 30,
      labTitle: 'Đánh giá ý tưởng sản phẩm AI',
      labDescription: 'Lập bảng giả thuyết, chỉ số thành công và rủi ro cho một tính năng AI.',
      quizQuestions: 12,
    },
    {
      id: 6,
      title: 'Xây dựng nguyên mẫu thử nghiệm',
      description: 'Cách build nhanh giao diện mockup bằng Gradio/Streamlit và trình bày phần thử nghiệm (AI Demo).',
      status: 'locked',
      duration: '120 phút',
      slides: 34,
      labTitle: 'Tạo AI Demo đầu tiên',
      labDescription: 'Dựng một nguyên mẫu tương tác và chuẩn bị kịch bản trình diễn sản phẩm.',
      quizQuestions: 15,
    },
  ];

  const conceptNodes = {
    llm: {
      title: 'Nền tảng LLM & AI',
      mastery: 100,
      status: 'Đã thông thạo',
      statusClass: 'text-emerald-500 bg-emerald-50 border-emerald-100',
      description: 'Hiểu về cấu trúc Transformer, Tokenization, và cách hoạt động cơ bản của các mô hình ngôn ngữ lớn.',
      skills: [
        { name: 'Transformer Architecture & Attention', ok: true },
        { name: 'Tokenization & Context Window', ok: true },
        { name: 'Model Parameters (Temperature, Top-p)', ok: true }
      ],
      suggestedTask: 'Làm bài kiểm tra thử',
      actionTab: 'exam'
    },
    prompt: {
      title: 'Prompt Engineering (Thiết kế câu lệnh)',
      mastery: 65,
      status: 'Khá tốt',
      statusClass: 'text-blue-500 bg-blue-50/50 border-blue-100',
      description: 'Kỹ năng giao tiếp và tối ưu hóa phản hồi từ mô hình thông qua cấu trúc chỉ thị rõ ràng, ví dụ cụ thể và phân tách bối cảnh.',
      skills: [
        { name: 'System Prompt vs User Prompt', ok: true },
        { name: 'Few-shot & Zero-shot Prompting', ok: true },
        { name: 'Structured Outputs (JSON, Markdown)', ok: false }
      ],
      suggestedTask: 'Trao đổi về Prompt Design',
      actionTab: 'tutor'
    },
    rag: {
      title: 'Retrieval-Augmented Generation (RAG)',
      mastery: 30,
      status: 'Cần cải thiện',
      statusClass: 'text-red-500 bg-red-50/50 border-red-100',
      description: 'Mô hình kết hợp truy xuất thông tin từ bên ngoài vào bối cảnh của LLM để giảm thiểu ảo tưởng và cập nhật tri thức mới.',
      skills: [
        { name: 'Semantic Chunking & Overlap', ok: false },
        { name: 'Vector Database & Retrieval (Cosine Similarity)', ok: true },
        { name: 'Re-ranking & Context Compression', ok: false }
      ],
      suggestedTask: 'Hỏi AI Tutor về RAG & Vector store',
      actionTab: 'tutor'
    },
    embeddings: {
      title: 'Embeddings & Vector Store',
      mastery: 45,
      status: 'Đang tiến bộ',
      statusClass: 'text-amber-500 bg-amber-50/50 border-amber-100',
      description: 'Hiểu bản chất của biểu diễn vector từ ngữ nghĩa và cách truy vấn hiệu quả trên không gian nhiều chiều.',
      skills: [
        { name: 'Embedding Models (text-embedding-3)', ok: true },
        { name: 'Vector Search Indexing (HNSW, IVF)', ok: false },
        { name: 'Distance Metrics (L2, Inner Product, Cosine)', ok: false }
      ],
      suggestedTask: 'Khắc phục lỗ hổng RAG',
      actionTab: 'home'
    },
    agents: {
      title: 'AI Agent & Tool Calling',
      mastery: 15,
      status: 'Mới bắt đầu',
      statusClass: 'text-purple-500 bg-purple-50/50 border-purple-100',
      description: 'Xây dựng các tác nhân tự chủ có khả năng lập kế hoạch suy luận ReAct và gọi công cụ ngoài thông qua giao thức MCP.',
      skills: [
        { name: 'ReAct Plan-and-Solve Loop', ok: false },
        { name: 'Tool Calling Schema & Argument Parsing', ok: true },
        { name: 'Model Context Protocol (MCP) Setup', ok: false }
      ],
      suggestedTask: 'Khám phá AI Agents & MCP',
      actionTab: 'tutor'
    }
  };

  const chatPills = {
    prompt_design: [
      { text: 'Thêm ngữ cảnh & vai trò', search: 'context' },
      { text: 'Viết câu lệnh thật dài', search: 'dài' }
    ],
    rag_basics: [
      { text: 'Hạn chế ảo tưởng (bịa đặt thông tin)', search: 'bịa' },
      { text: 'Để mô hình chạy nhanh hơn', search: 'nhanh' }
    ],
    ai_agents: [
      { text: 'Khả năng lập kế hoạch (Planning) & MCP', search: 'kế hoạch' },
      { text: 'Do lập trình viên gán cứng sẵn', search: 'gán cứng' }
    ]
  };

  useEffect(() => {
    let introText = '';
    if (socraticMode) {
      if (chatTopic === 'prompt_design') {
        introText = 'Chào bạn! Hôm nay chúng ta sẽ tìm hiểu về Prompt Engineering (Thiết kế câu lệnh). Theo bạn, điều gì làm nên sự khác biệt giữa một câu lệnh chung chung và một câu lệnh có cấu trúc tốt?';
      } else if (chatTopic === 'rag_basics') {
        introText = 'Chào bạn! RAG là phương pháp rất phổ biến hiện nay. Theo bạn, tại sao một mô hình ngôn ngữ lớn lại cần thêm bước truy xuất tài liệu bên ngoài thay vì tự trả lời ngay?';
      } else {
        introText = 'Chào bạn! Chúng ta cùng thảo luận về AI Agents & MCP. Một Agent thông minh cần khả năng gọi công cụ để lấy thông tin. Làm thế nào nó tự biết lúc nào cần gọi công cụ?';
      }
    } else {
      if (chatTopic === 'prompt_design') {
        introText = 'Chào bạn! Dưới đây là hướng dẫn viết Prompt tốt trực tiếp: Bạn hãy dùng cấu trúc Role, Context, Instruction, Examples, và Output Format. Bạn muốn xem chi tiết phần nào?';
      } else if (chatTopic === 'rag_basics') {
        introText = 'Chào bạn! RAG (Retrieval-Augmented Generation) giúp mở rộng tri thức LLM bằng cách lấy thông tin từ VectorDB rồi nhúng vào ngữ cảnh prompt. Bạn cần tìm hiểu bước nào cụ thể?';
      } else {
        introText = 'Chào bạn! AI Agent kết hợp LLM với Trí nhớ (Memory), Lập kế hoạch (Planning), và Công cụ (Tools). Giao thức MCP giúp kết nối mô hình với máy chủ bên ngoài để chạy mã lệnh hoặc truy vấn dữ liệu.';
      }
    }
    setMessages([
      { id: 1, sender: 'bot', text: introText }
    ]);
  }, [chatTopic, socraticMode]);

  const quizQuestions = [
    {
      q: 'LLM viết tắt của cụm từ nào dưới đây?',
      options: ['Large Language Model', 'Low Level Machine', 'Linear Logical Method'],
      correct: 0
    },
    {
      q: 'Trong mô hình RAG (Retrieval-Augmented Generation), pha nào diễn ra trước?',
      options: ['Generation (Sinh câu trả lời)', 'Retrieval (Truy xuất tài liệu)', 'Cả hai diễn ra song song'],
      correct: 1
    },
    {
      q: 'MCP viết tắt của từ gì trong hệ sinh thái AI Agents?',
      options: ['Multi Chat Protocol', 'Model Context Protocol', 'Machine Control Protocol'],
      correct: 1
    }
  ];

  function handleSendChat(text) {
    if (!text.trim() || chatReplying) return;
    const userMsg = { id: messages.length + 1, sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatReplying(true);

    // Simulate AI reply after 1s
    setTimeout(() => {
      let replyText = '';
      const normalizedText = text.toLowerCase();
      if (socraticMode) {
        if (chatTopic === 'prompt_design') {
          if (normalizedText.includes('giải thích nội dung')) {
            replyText = `Bài “${selectedLesson?.title || 'Thiết kế câu lệnh'}” tập trung vào cách cung cấp đủ vai trò, ngữ cảnh, yêu cầu và định dạng đầu ra để AI hiểu đúng nhiệm vụ. Nếu có Tool Calling, mô hình còn phải biết lúc nào cần gọi công cụ, truyền tham số gì và dùng kết quả trả về ra sao. Bạn có thể gửi đúng thuật ngữ hoặc câu trên slide mà bạn đang vướng để mình giải thích sâu hơn.`;
          } else if (normalizedText.includes('ví dụ thực tế') || normalizedText.includes('cho tôi một ví dụ')) {
            replyText = 'Ví dụ: bạn hỏi “Thời tiết Hà Nội hôm nay thế nào?”. AI không nên đoán. System prompt quy định phải dùng dữ liệu thật, tool schema mô tả hàm get_weather(city), mô hình gọi công cụ với city="Hà Nội", rồi lấy kết quả API để viết câu trả lời. Đó là một vòng Tool Calling hoàn chỉnh.';
          } else if (normalizedText.includes('context packet')) {
            replyText = 'Context packet là “gói ngữ cảnh” được ghép trước mỗi lần gọi mô hình. Nó thường gồm system instruction, câu hỏi hiện tại, lịch sử hội thoại, dữ kiện đã biết, tài liệu truy xuất, mô tả công cụ và định dạng đầu ra. Bạn có thể hình dung nó như bộ hồ sơ mà AI được phép đọc trước khi trả lời.';
          } else if (normalizedText.includes('tool calling') || normalizedText.includes('gọi công cụ')) {
            replyText = 'Tool Calling là lúc mô hình không tự bịa kết quả mà chọn một công cụ phù hợp, tạo arguments theo schema, chờ công cụ chạy rồi dùng kết quả thật để trả lời. Ba phần quan trọng là: mô tả công cụ rõ, schema đầu vào chặt và kiểm tra kết quả trước khi đưa cho người dùng.';
          } else if (normalizedText.includes('few-shot') || normalizedText.includes('ít mẫu')) {
            replyText = 'Few-shot prompting là đưa vài cặp ví dụ đầu vào–đầu ra để mô hình bắt chước quy luật. Ví dụ nên đại diện cho các trường hợp quan trọng, nhất quán về định dạng và đủ ngắn để không làm phình context.';
          } else if (normalizedText.includes('system prompt')) {
            replyText = 'System prompt là lớp chỉ dẫn ưu tiên cao, dùng để xác định vai trò, nguyên tắc, giới hạn và cách phản hồi của trợ lý. User prompt là yêu cầu cụ thể của người dùng trong từng lượt. Một system prompt tốt nên rõ ràng, có thứ tự ưu tiên và nêu cách xử lý khi thiếu dữ liệu.';
          } else if (normalizedText.includes('context') || normalizedText.includes('ngữ cảnh') || normalizedText.includes('vai trò')) {
            replyText = 'Đúng vậy! Bối cảnh (Context) và vai trò (Role) giúp LLM giới hạn không gian tri thức. Vậy tiếp theo, nếu ta muốn LLM trả về kết quả theo định dạng JSON hoặc Markdown, ta nên hướng dẫn nó thế nào?';
          } else {
            replyText = 'Đó là một yếu tố. Nhưng hãy nghĩ xem, nếu mô hình không biết nó đang đóng vai ai hoặc trả lời cho đối tượng nào, câu trả lời sẽ dễ bị thế nào?';
          }
        } else if (chatTopic === 'rag_basics') {
          if (normalizedText.includes('bịa') || normalizedText.includes('ảo tưởng') || normalizedText.includes('hallucin') || normalizedText.includes('thiếu')) {
            replyText = 'Chính xác! Hiện tượng ảo tưởng (hallucination) xảy ra khi mô hình không có dữ liệu thực tế. Vậy nếu ta tìm đúng đoạn văn liên quan rồi đưa vào ngữ cảnh, câu trả lời sẽ đáng tin hơn như thế nào?';
          } else {
            replyText = 'Đúng một phần. Nhưng hãy tưởng tượng bạn đi thi và được mang tài liệu so với việc phải nhớ mọi thứ. Phương pháp nào hạn chế sai sót tốt hơn?';
          }
        } else {
          if (normalizedText.includes('kế hoạch') || normalizedText.includes('plan') || normalizedText.includes('mcp')) {
            replyText = 'Tuyệt vời! Giao thức MCP (Model Context Protocol) và khả năng lập kế hoạch giúp Agent kết nối dữ liệu. Làm thế nào để Agent đánh giá kết quả hành động của mình trước khi trả về cho người dùng?';
          } else {
            replyText = 'Một gợi ý nhỏ: Để một Agent hoạt động độc lập, nó cần "công cụ" và "quy trình". Hãy thử phân tích xem Agent sẽ gọi công cụ như thế nào?';
          }
        }
      } else {
        // Direct answer mode
        if (chatTopic === 'prompt_design') {
          replyText = 'Giải đáp trực tiếp: Để viết Prompt tốt, bạn cần 5 thành phần: (1) Role (Ví dụ: Bạn là chuyên gia Python), (2) Context (Ngữ cảnh bài toán), (3) Instruction (Chỉ dẫn cụ thể), (4) Input Data (Dữ liệu đầu vào), (5) Output Indicator (Định dạng đầu ra: ví dụ JSON). Hãy sử dụng Markdown và phân tách rõ các phần bằng dấu ngoặc tam giác hoặc thẻ XML để LLM hiểu rõ nhất.';
        } else if (chatTopic === 'rag_basics') {
          replyText = 'Giải đáp trực tiếp: RAG (Retrieval-Augmented Generation) giải quyết vấn đề thiếu thông tin cập nhật của LLM. Quy trình gồm: 1. Vectorize tài liệu thành các embeddings, 2. Lưu vào cơ sở dữ liệu vector (như PGVector, Pinecone), 3. Khi có truy vấn, tính Cosine Similarity để lấy top-k văn bản liên quan nhất, 4. Nối các văn bản này vào prompt làm ngữ cảnh rồi gửi cho LLM để tạo câu trả lời chính xác.';
        } else {
          replyText = 'Giải đáp trực tiếp: AI Agent là hệ thống sử dụng LLM làm bộ não điều hành để tự động thực hiện các nhiệm vụ phức tạp. Cấu trúc gồm: (1) Memory: lưu lịch sử trò chuyện và trạng thái, (2) Planning: lập kế hoạch từng bước (CoT, ReAct), (3) Tools: gọi API, chạy code python, hoặc dùng Model Context Protocol (MCP) để tương tác với cơ sở dữ liệu và công cụ hệ thống.';
        }
      }
      
      setMessages(prev => [...prev, { id: prev.length + 1, sender: 'bot', text: replyText }]);
      setChatReplying(false);
      
      // Complete daily task 1 if not done
      setTasks(prev => prev.map(t => t.id === 1 ? { ...t, completed: true } : t));
    }, 1000);
  }

  function handleSelectOption(optIdx) {
    setAnswers(prev => ({ ...prev, [quizStep]: optIdx }));
  }

  function handleNextQuiz() {
    if (quizStep < quizQuestions.length - 1) {
      setQuizStep(prev => prev + 1);
    } else {
      // Calculate score
      let correctCount = 0;
      quizQuestions.forEach((q, idx) => {
        if (answers[idx] === q.correct) correctCount++;
      });
      const finalScore = `${correctCount}/${quizQuestions.length}`;
      setQuizScore(finalScore);
      
      // Award XP
      setXp(prev => {
        const nextXp = prev + 50;
        if (nextXp >= 360) {
          setLevel(4);
          return nextXp - 360;
        }
        return nextXp;
      });

      // Add to study history
      setStudyHistory(prev => [
        { id: prev.length + 1, name: 'Quiz: Lý thuyết AI Cơ bản', score: finalScore, date: 'Hôm nay' },
        ...prev
      ]);

      // Complete task 3
      setTasks(prev => prev.map(t => t.id === 3 ? { ...t, completed: true } : t));
    }
  }

  function handleResetQuiz() {
    setQuizActive(false);
    setQuizStep(0);
    setAnswers({});
    setQuizScore(null);
  }

  return (
    <div className={`socratic-workspace space-y-6 ${subTab === 'roadmap' && selectedLesson ? 'socratic-slide-mode' : ''}`}>
      {/* Sub navigation tabs */}
      <div className="socratic-navbar">
        <button type="button" className={`socratic-nav-btn ${subTab === 'home' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('home')}>
          <LayoutDashboard size={16} /> Tổng quan
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'tutor' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('tutor')}>
          <Sparkles size={16} /> AI Tutor
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'roadmap' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('roadmap')}>
          <MapPinned size={16} /> Lộ trình học
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'knowledge-map' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('knowledge-map')}>
          <Network size={16} /> Bản đồ kiến thức
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'exam' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('exam')}>
          <FileCheck size={16} /> Kiểm tra
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'leaderboard' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('leaderboard')}>
          <Users size={16} /> Bảng xếp hạng
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'achievements' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('achievements')}>
          <ShieldCheck size={16} /> Huy chương
        </button>
        <button type="button" className={`socratic-nav-btn ${subTab === 'history' ? 'socratic-nav-btn-active' : ''}`} onClick={() => setSubTab('history')}>
          <Clock3 size={16} /> Lịch sử học
        </button>
      </div>

      {subTab === 'home' && (
        <div className="space-y-6">
          {/* Level Header Banner */}
          <div className="socratic-hero-greet">
            <div className="socratic-hero-greet-text">
              <h2>Xin chào, Người học AI!</h2>
              <p>Bạn đã hoàn thành 25% lộ trình. Tiếp tục luyện tập với AI Tutor để cải thiện các kỹ năng còn yếu.</p>
              <div className="flex items-center gap-2 mt-4 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl w-fit">
                <span>Cấp độ {level} · {xp}/{level * level * 40} XP</span>
              </div>
              <div className="socratic-xp-bar">
                <div className="socratic-xp-progress" style={{ width: `${Math.round((xp / (level * level * 40)) * 100)}%` }} />
              </div>
            </div>
            <img src="/vinlearn/bots/main.png" alt="Mascot" className="w-24 h-24 object-contain" />
          </div>

          {/* Quick Metrics */}
          <div className="socratic-metrics-grid">
            <div className="socratic-metric-card">
              <div className="socratic-metric-icon">🔥</div>
              <div className="socratic-metric-info">
                <strong>{streak} ngày</strong>
                <span>Streak liên tiếp</span>
              </div>
            </div>
            <div className="socratic-metric-card">
              <div className="socratic-metric-icon">🎯</div>
              <div className="socratic-metric-info">
                <strong>3 khái niệm</strong>
                <span>Đã làm chủ</span>
              </div>
            </div>
            <div className="socratic-metric-card">
              <div className="socratic-metric-icon">⚡</div>
              <div className="socratic-metric-info">
                <strong>1,240 XP</strong>
                <span>Tổng điểm tích lũy</span>
              </div>
            </div>
            <div className="socratic-metric-card">
              <div className="socratic-metric-icon">🏆</div>
              <div className="socratic-metric-info">
                <strong>Hạng #4</strong>
                <span>Bảng xếp hạng</span>
              </div>
            </div>
          </div>

          <div className="socratic-card-grid">
            {/* Primary Columns */}
            <div className="socratic-card-col-2">
              <section className="card">
                <h3 className="socratic-card-title">📖 Lộ trình đang học</h3>
                <div className="flex justify-between items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Đang hoạt động</span>
                    <h4 className="text-sm font-black text-slate-800">Bài 04 · Thiết kế câu lệnh và gọi công cụ</h4>
                    <p className="text-xs text-slate-500">Tìm hiểu vai trò của System Prompt, cách cấu trúc câu lệnh và liên kết công cụ bên ngoài.</p>
                  </div>
                  <button type="button" className="btn whitespace-nowrap" onClick={() => setSubTab('tutor')}>
                    Học tiếp
                  </button>
                </div>
              </section>

              <section className="card">
                <h3 className="socratic-card-title">⚠️ Kỹ năng yếu cần khắc phục</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>RAG Workflow (Truy xuất ngữ nghĩa)</span>
                      <span className="text-red-500">30% thông thạo</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full" style={{ width: '30%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>Prompt Design (Kỹ thuật câu lệnh)</span>
                      <span className="text-amber-500">45% thông thạo</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '45%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>Embeddings & Vector Database</span>
                      <span className="text-emerald-500">55% thông thạo</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '55%' }} />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Daily Tasks Column */}
            <div className="space-y-6">
              <section className="card">
                <h3 className="socratic-card-title">🔥 Nhiệm vụ hàng ngày</h3>
                <div className="space-y-3 mt-4">
                  {tasks.map(task => (
                    <div key={task.id} className="socratic-task-row">
                      <div className="socratic-task-left">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          readOnly
                          className="socratic-task-check accent-emerald-500"
                        />
                        <div className="socratic-task-text" onClick={() => setSubTab(task.tab)}>
                          <strong className={task.completed ? 'line-through text-slate-400' : ''}>{task.title}</strong>
                          <small>{task.sub}</small>
                        </div>
                      </div>
                      <span className="socratic-task-xp">+{task.xp} XP</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {subTab === 'tutor' && (
        <div className="socratic-chat-layout">
          {/* Chat Sidebar */}
          <div className="socratic-chat-sidebar">
            <h4 className="socratic-chat-sidebar-title">Chủ đề học tập</h4>
            <button type="button" className={`socratic-chat-topic-btn ${chatTopic === 'prompt_design' ? 'socratic-chat-topic-btn-active' : ''}`} onClick={() => setChatTopic('prompt_design')}>
              💬 Prompt Design
            </button>
            <button type="button" className={`socratic-chat-topic-btn ${chatTopic === 'rag_basics' ? 'socratic-chat-topic-btn-active' : ''}`} onClick={() => setChatTopic('rag_basics')}>
              📚 RAG & Vector store
            </button>
            <button type="button" className={`socratic-chat-topic-btn ${chatTopic === 'ai_agents' ? 'socratic-chat-topic-btn-active' : ''}`} onClick={() => setChatTopic('ai_agents')}>
              🤖 AI Agents & MCP
            </button>
          </div>

          {/* Chat Container */}
          <div className="socratic-chat-area">
            {/* Mobile Topic Selector */}
            <div className="lg:hidden px-4 py-3 border-b border-slate-100 flex gap-2 overflow-x-auto bg-slate-50/30">
              <button
                type="button"
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${chatTopic === 'prompt_design' ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md shadow-red-600/25' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setChatTopic('prompt_design')}
              >
                💬 Prompt Design
              </button>
              <button
                type="button"
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${chatTopic === 'rag_basics' ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md shadow-red-600/25' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setChatTopic('rag_basics')}
              >
                📚 RAG & Vector
              </button>
              <button
                type="button"
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${chatTopic === 'ai_agents' ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md shadow-red-600/25' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setChatTopic('ai_agents')}
              >
                🤖 AI Agents & MCP
              </button>
            </div>
            <div className="socratic-chat-header flex flex-wrap items-center justify-between gap-3">
              <div className="socratic-chat-header-title">
                <h3>Socratic AI Tutor</h3>
                <p>Đang thảo luận: {chatTopic === 'prompt_design' ? 'Prompt Design' : chatTopic === 'rag_basics' ? 'RAG basics' : 'AI Agents'}</p>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tư duy phản biện (Socratic)</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={socraticMode}
                  className="w-9 h-5 rounded-full relative transition-colors cursor-pointer bg-slate-300"
                  style={{ backgroundColor: socraticMode ? '#ef4444' : '#cbd5e1' }}
                  onClick={() => setSocraticMode(!socraticMode)}
                >
                  <span
                    className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all shadow-sm"
                    style={{ left: socraticMode ? '18px' : '2px' }}
                  />
                </button>
              </div>
            </div>

            <div className="socratic-chat-messages">
              {messages.map(msg => (
                <div key={msg.id} className={`socratic-chat-bubble ${msg.sender === 'bot' ? 'socratic-chat-bubble-bot' : 'socratic-chat-bubble-user'}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Chat Pills */}
            <div className="socratic-chat-pills">
              {chatPills[chatTopic].map((pill, idx) => (
                <button key={idx} type="button" className="socratic-chat-pill-btn" onClick={() => handleSendChat(pill.text)}>
                  {pill.text}
                </button>
              ))}
            </div>

            <div className="socratic-chat-footer">
              <input
                className="socratic-chat-input"
                type="text"
                placeholder="Nhập suy luận của bạn..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat(chatInput)}
              />
              <button type="button" className="btn py-2 px-4" onClick={() => handleSendChat(chatInput)}>
                <Send size={15} /> Gửi
              </button>
            </div>
          </div>
        </div>
      )}

      {subTab === 'roadmap' && (
        <div className="space-y-6">
          {!selectedLesson ? (
            <section className="card">
              <h3 className="socratic-card-title">🗺️ Lộ trình đào tạo 15 ngày</h3>
              <p className="socratic-roadmap-hint">Chọn một bài học đã mở để xem slide, bài lab và bài trắc nghiệm.</p>
              <div className="socratic-roadmap-grid mt-4">
                {roadmapLessons.map(lesson => {
                  const isLocked = lesson.status === 'locked';
                  return (
                    <button
                      type="button"
                      key={lesson.id}
                      disabled={isLocked}
                      className={`socratic-roadmap-card socratic-roadmap-card-${lesson.status}`}
                      onClick={() => {
                        setSelectedLesson(lesson);
                        setLessonResource(null);
                      }}
                    >
                      <div className="socratic-roadmap-card-top">
                        <div className="socratic-roadmap-badge">{lesson.status === 'completed' ? '✓' : lesson.id}</div>
                        <span className="socratic-roadmap-state">
                          {lesson.status === 'completed' ? 'Đã hoàn thành' : lesson.status === 'active' ? 'Đang học' : 'Chưa mở'}
                        </span>
                      </div>
                      <h3>Bài {String(lesson.id).padStart(2, '0')} · {lesson.title}</h3>
                      <p>{lesson.description}</p>
                      {!isLocked && <span className="socratic-roadmap-open">Xem nội dung <ArrowRight size={14} /></span>}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className={`card socratic-lesson-detail ${lessonResource ? 'socratic-lesson-detail-viewing' : ''}`}>
              <button type="button" className="socratic-lesson-back" onClick={() => {
                setSelectedLesson(null);
                setLessonResource(null);
              }}>
                <ChevronLeft size={16} /> Quay lại lộ trình
              </button>

              <div className="socratic-lesson-heading">
                <div>
                  <span className="socratic-lesson-kicker">Bài {String(selectedLesson.id).padStart(2, '0')}</span>
                  <h2>{selectedLesson.title}</h2>
                  <p>{selectedLesson.description}</p>
                </div>
                <div className="socratic-lesson-duration">
                  <Clock3 size={17} />
                  <span>{selectedLesson.duration}</span>
                </div>
              </div>

              <div className={`socratic-lesson-resources ${lessonResource ? 'socratic-lesson-resources-active' : ''}`}>
                <article className="socratic-resource-card socratic-resource-card-slide">
                  <div className="socratic-resource-icon"><BookOpen size={23} /></div>
                  <div className="socratic-resource-meta">Nội dung học</div>
                  <h3>Slide buổi học</h3>
                  <p>
                    {lessonSlides.find(item => item.lesson_id === selectedLesson.id)
                      ? `PDF: ${lessonSlides.find(item => item.lesson_id === selectedLesson.id).file_name}`
                      : 'Giảng viên chưa tải slide PDF cho bài học này.'}
                  </p>
                  <button
                    type="button"
                    className="socratic-resource-action"
                    disabled={!lessonSlides.some(item => item.lesson_id === selectedLesson.id)}
                    onClick={() => openLessonSlide(selectedLesson.id)}
                  >
                    {lessonSlides.some(item => item.lesson_id === selectedLesson.id) ? 'Mở slide PDF' : 'Chưa có slide'} <ArrowRight size={15} />
                  </button>
                </article>

                <article className="socratic-resource-card socratic-resource-card-lab">
                  <div className="socratic-resource-icon"><FlaskConical size={23} /></div>
                  <div className="socratic-resource-meta">01 bài thực hành</div>
                  <h3>{selectedLesson.labTitle}</h3>
                  <p>{selectedLesson.labDescription}</p>
                  <button type="button" className="socratic-resource-action" onClick={() => setLessonResource('lab')}>
                    Làm bài lab <ArrowRight size={15} />
                  </button>
                </article>

                <article className="socratic-resource-card socratic-resource-card-quiz">
                  <div className="socratic-resource-icon"><FileCheck size={23} /></div>
                  <div className="socratic-resource-meta">01 bài trắc nghiệm</div>
                  <h3>Kiểm tra kiến thức</h3>
                  <p>{selectedLesson.quizQuestions} câu hỏi giúp củng cố kiến thức và mở khóa bài học tiếp theo.</p>
                  <button type="button" className="socratic-resource-action" onClick={() => setSubTab('exam')}>
                    Bắt đầu làm bài <ArrowRight size={15} />
                  </button>
                </article>
              </div>

              {lessonResource === 'slides' && (
                <div className="socratic-resource-panel">
                  <div className="socratic-resource-panel-heading">
                    <div className="socratic-resource-icon"><BookOpen size={22} /></div>
                    <div>
                      <span>Slide buổi học</span>
                      <h3>Bài {String(selectedLesson.id).padStart(2, '0')} · {selectedLesson.title}</h3>
                    </div>
                    {slidePdfUrl && (
                      <a className="socratic-pdf-fullscreen" href={slidePdfUrl} target="_blank" rel="noreferrer">
                        <ExternalLink size={15} /> <span>Mở toàn màn hình</span>
                      </a>
                    )}
                  </div>
                  {slideLoading && <div className="socratic-pdf-state">Đang tải slide PDF...</div>}
                  {slideError && <div className="result-message mt-4">❌ {slideError}</div>}
                  {slidePdfUrl && !slideLoading && (
                    <iframe
                      className="socratic-pdf-viewer"
                      src={slidePdfUrl}
                      title={`Slide bài ${selectedLesson.id}`}
                    />
                  )}
                </div>
              )}

              {lessonResource === 'lab' && (
                <div className="socratic-resource-panel">
                  <div className="socratic-resource-panel-heading">
                    <div className="socratic-resource-icon socratic-resource-icon-lab"><FlaskConical size={22} /></div>
                    <div>
                      <span>Bài lab của buổi học</span>
                      <h3>{selectedLesson.labTitle}</h3>
                    </div>
                  </div>
                  <p className="socratic-lab-description">{selectedLesson.labDescription}</p>
                  <div className="socratic-lab-requirements">
                    <span><CheckCircle2 size={15} /> Đọc yêu cầu và dữ liệu mẫu</span>
                    <span><CheckCircle2 size={15} /> Hoàn thành các bước thực hành</span>
                    <span><CheckCircle2 size={15} /> Nộp kết quả để nhận phản hồi</span>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {subTab === 'knowledge-map' && (
        <div className="socratic-card-grid">
          {/* Node Graph Visualizer */}
          <div className="socratic-card-col-2">
            <section className="card min-h-[460px] flex flex-col justify-between relative overflow-hidden">
              <div>
                <h3 className="socratic-card-title">🗺️ Sơ đồ tư duy & Bản đồ kiến thức AI</h3>
                <p className="text-xs text-slate-500 mb-6">Nhấp vào từng nút chủ đề để xem mức độ thông thạo, lỗ hổng kiến thức và bài tập gợi ý.</p>
              </div>

              {/* Graphical representation container */}
              <div className="flex-1 flex items-center justify-center relative min-h-[300px] border border-slate-50 rounded-2xl bg-slate-50/20 p-4">
                {/* SVG Connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                  {/* Connect LLM -> Prompt */}
                  <line x1="20%" y1="50%" x2="50%" y2="20%" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
                  {/* Connect Prompt -> RAG */}
                  <line x1="50%" y1="20%" x2="80%" y2="50%" stroke="#fca5a5" strokeWidth="2" />
                  {/* Connect LLM -> Embeddings */}
                  <line x1="20%" y1="50%" x2="50%" y2="80%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                  {/* Connect Embeddings -> RAG */}
                  <line x1="50%" y1="80%" x2="80%" y2="50%" stroke="#fcd34d" strokeWidth="2" />
                  {/* Connect RAG -> Agents */}
                  <line x1="80%" y1="50%" x2="50%" y2="50%" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
                </svg>

                {/* Interactive Nodes */}
                {/* Node 1: LLM */}
                <button
                  type="button"
                  className={`absolute p-3 rounded-full border flex items-center justify-center font-black transition-all cursor-pointer shadow-md ${selectedNode === 'llm' ? 'bg-emerald-500 text-white border-emerald-600 scale-110 ring-4 ring-emerald-100' : 'bg-white text-emerald-500 border-emerald-200 hover:bg-emerald-50'}`}
                  style={{ left: '15%', top: '42%', zIndex: 1 }}
                  onClick={() => setSelectedNode('llm')}
                  title="Nền tảng LLM"
                >
                  <Database size={20} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-slate-500">Nền tảng AI</span>
                </button>

                {/* Node 2: Prompt */}
                <button
                  type="button"
                  className={`absolute p-3 rounded-full border flex items-center justify-center font-black transition-all cursor-pointer shadow-md ${selectedNode === 'prompt' ? 'bg-blue-500 text-white border-blue-600 scale-110 ring-4 ring-blue-100' : 'bg-white text-blue-500 border-blue-200 hover:bg-blue-50'}`}
                  style={{ left: '45%', top: '10%', zIndex: 1 }}
                  onClick={() => setSelectedNode('prompt')}
                  title="Prompt Design"
                >
                  <Sparkles size={20} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-slate-500">Prompt Design</span>
                </button>

                {/* Node 3: RAG */}
                <button
                  type="button"
                  className={`absolute p-3 rounded-full border flex items-center justify-center font-black transition-all cursor-pointer shadow-md ${selectedNode === 'rag' ? 'bg-red-500 text-white border-red-600 scale-110 ring-4 ring-red-100' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}`}
                  style={{ left: '75%', top: '42%', zIndex: 1 }}
                  onClick={() => setSelectedNode('rag')}
                  title="RAG Workflow"
                >
                  <Activity size={20} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-slate-500">RAG Workflow</span>
                </button>

                {/* Node 4: Embeddings */}
                <button
                  type="button"
                  className={`absolute p-3 rounded-full border flex items-center justify-center font-black transition-all cursor-pointer shadow-md ${selectedNode === 'embeddings' ? 'bg-amber-500 text-white border-amber-600 scale-110 ring-4 ring-amber-100' : 'bg-white text-amber-500 border-amber-200 hover:bg-amber-50'}`}
                  style={{ left: '45%', top: '74%', zIndex: 1 }}
                  onClick={() => setSelectedNode('embeddings')}
                  title="Vector Embeddings"
                >
                  <MapPin size={20} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-slate-500">Embeddings</span>
                </button>

                {/* Node 5: Agents (Center) */}
                <button
                  type="button"
                  className={`absolute p-3 rounded-full border flex items-center justify-center font-black transition-all cursor-pointer shadow-md ${selectedNode === 'agents' ? 'bg-purple-500 text-white border-purple-600 scale-110 ring-4 ring-purple-100' : 'bg-white text-purple-500 border-purple-200 hover:bg-purple-50'}`}
                  style={{ left: '45%', top: '42%', zIndex: 1 }}
                  onClick={() => setSelectedNode('agents')}
                  title="AI Agents"
                >
                  <Network size={20} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black text-slate-500">AI Agents</span>
                </button>
              </div>
            </section>
          </div>

          {/* Node Info / Sidebar Details */}
          <div className="space-y-6">
            <section className="card h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${conceptNodes[selectedNode].statusClass}`}>
                    {conceptNodes[selectedNode].status}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{conceptNodes[selectedNode].mastery}% nắm vững</span>
                </div>

                <h3 className="text-base font-black text-slate-800 mb-2">{conceptNodes[selectedNode].title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">{conceptNodes[selectedNode].description}</p>

                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Kỹ năng thành phần</h4>
                <div className="space-y-2 mb-6">
                  {conceptNodes[selectedNode].skills.map((skill, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <span className={`w-2 h-2 rounded-full ${skill.ok ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className={skill.ok ? '' : 'text-slate-400'}>{skill.ok ? '✓' : '✗'} {skill.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  className="btn w-full justify-center cursor-pointer"
                  onClick={() => {
                    const node = conceptNodes[selectedNode];
                    if (node.actionTab === 'tutor') {
                      if (selectedNode === 'prompt') setChatTopic('prompt_design');
                      else if (selectedNode === 'rag') setChatTopic('rag_basics');
                      else if (selectedNode === 'agents') setChatTopic('ai_agents');
                      setSubTab('tutor');
                    } else if (node.actionTab === 'exam') {
                      setSubTab('exam');
                    } else {
                      setSubTab('home');
                    }
                  }}
                >
                  🎯 {conceptNodes[selectedNode].suggestedTask}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {subTab === 'exam' && (
        <div className="space-y-6">
          {!quizActive ? (
            <section className="card max-w-xl mx-auto space-y-4">
              <div className="text-center space-y-2">
                <FileCheck className="mx-auto text-red-600" size={32} />
                <h3 className="text-lg font-black text-slate-800">Kiểm tra năng lực AI Cơ bản</h3>
                <p className="text-xs text-slate-500">Bài thi trắc nghiệm ngắn gồm 3 câu hỏi để kiểm tra kiến thức về các mô hình LLM, RAG và MCP.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2 text-slate-600">
                <p>📅 Thời gian làm bài: Không giới hạn</p>
                <p>📚 Số câu hỏi: 3 câu</p>
                <p>💎 Phần thưởng: +50 XP khi vượt qua</p>
              </div>

              <button type="button" className="btn w-full justify-center" onClick={() => setQuizActive(true)}>
                Bắt đầu làm bài
              </button>
            </section>
          ) : (
            <div className="socratic-quiz-box">
              {quizScore === null ? (
                <>
                  <div className="socratic-quiz-header">
                    <span className="text-xs font-bold text-red-600">Câu hỏi {quizStep + 1}/3</span>
                    <span className="text-xs font-bold text-slate-400">Đang thực hiện</span>
                  </div>

                  <p className="socratic-quiz-q">{quizQuestions[quizStep].q}</p>

                  <div className="socratic-quiz-options">
                    {quizQuestions[quizStep].options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`socratic-quiz-option ${answers[quizStep] === idx ? 'socratic-quiz-option-selected' : ''}`}
                        onClick={() => handleSelectOption(idx)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn w-full justify-center"
                    disabled={answers[quizStep] === undefined}
                    onClick={handleNextQuiz}
                  >
                    {quizStep < quizQuestions.length - 1 ? 'Tiếp theo' : 'Nộp bài'}
                  </button>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
                  <h3 className="text-lg font-black text-slate-800">Hoàn thành bài thi!</h3>
                  <p className="text-xs text-slate-500">Chúc mừng bạn đã hoàn thành bài kiểm tra ngắn.</p>
                  
                  <div className="bg-slate-50 rounded-2xl p-4 w-fit mx-auto">
                    <span className="text-sm font-bold text-slate-700">Điểm số của bạn: {quizScore}</span>
                  </div>

                  <button type="button" className="btn-outline w-full justify-center" onClick={handleResetQuiz}>
                    Quay lại
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {subTab === 'leaderboard' && (
        <section className="card max-w-2xl mx-auto">
          <h3 className="socratic-card-title text-center mb-6">🏆 Bảng xếp hạng tuần</h3>
          
          <div className="socratic-leaderboard-podium">
            <div className="socratic-podium-item socratic-podium-item-2">
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200" className="socratic-podium-avatar" alt="Rank 2" />
              <div className="socratic-podium-stand">
                <span className="socratic-podium-rank">2</span>
                <span className="text-[10px] font-bold text-slate-600 truncate mt-1">Trần Thị B</span>
                <small className="text-[9px] text-slate-400">1,420 XP</small>
              </div>
            </div>

            <div className="socratic-podium-item socratic-podium-item-1">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" className="socratic-podium-avatar" alt="Rank 1" />
              <div className="socratic-podium-stand">
                <span className="socratic-podium-rank">1</span>
                <span className="text-[10px] font-bold text-slate-600 truncate mt-1">Nguyễn Văn A</span>
                <small className="text-[9px] text-slate-400">1,540 XP</small>
              </div>
            </div>

            <div className="socratic-podium-item socratic-podium-item-3">
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200" className="socratic-podium-avatar" alt="Rank 3" />
              <div className="socratic-podium-stand">
                <span className="socratic-podium-rank">3</span>
                <span className="text-[10px] font-bold text-slate-600 truncate mt-1">Lê Hoàng C</span>
                <small className="text-[9px] text-slate-400">1,290 XP</small>
              </div>
            </div>
          </div>

          <div className="socratic-leaderboard-list">
            <div className="socratic-leaderboard-row socratic-leaderboard-row-highlight">
              <div className="socratic-leaderboard-left">
                <span className="socratic-leaderboard-num">4</span>
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-600 text-xs">U</div>
                <span className="socratic-leaderboard-name">Bạn (Sinh viên)</span>
              </div>
              <span className="socratic-leaderboard-xp">1,240 XP</span>
            </div>
            
            <div className="socratic-leaderboard-row">
              <div className="socratic-leaderboard-left">
                <span className="socratic-leaderboard-num">5</span>
                <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200" className="socratic-leaderboard-avatar" alt="User 5" />
                <span className="socratic-leaderboard-name">Phạm Minh D</span>
              </div>
              <span className="socratic-leaderboard-xp">1,050 XP</span>
            </div>
          </div>
        </section>
      )}

      {subTab === 'achievements' && (
        <section className="card">
          <h3 className="socratic-card-title mb-6">🏆 Huy chương danh hiệu</h3>
          <div className="socratic-badge-grid">
            <div className="socratic-badge-card">
              <div className="socratic-badge-icon">🎖️</div>
              <h3>AI Rookie</h3>
              <p>Hoàn thành bài thực hành đầu tiên.</p>
            </div>
            <div className="socratic-badge-card">
              <div className="socratic-badge-icon">🧭</div>
              <h3>AI Explorer</h3>
              <p>Mở khóa 3 chủ đề học.</p>
            </div>
            <div className="socratic-badge-card">
              <div className="socratic-badge-icon font-mono text-xs">🔥</div>
              <h3>Streak Master</h3>
              <p>Đạt streak 10 ngày liên tục.</p>
            </div>
            <div className="socratic-badge-card socratic-badge-card-locked">
              <div className="socratic-badge-icon">👑</div>
              <h3>AI Master</h3>
              <p>Đạt cấp độ 5 trong cổng học tập.</p>
            </div>
          </div>
        </section>
      )}

      {subTab === 'history' && (
        <section className="card">
          <h3 className="socratic-card-title mb-5">🕒 Lịch sử học tập gần đây</h3>
          <div className="space-y-2">
            {studyHistory.map(hist => (
              <div key={hist.id} className="history-row">
                <span className="attendance-status attendance-present">✓ Đã làm</span>
                <div>
                  <p>{hist.name}</p>
                  <small>{hist.date}</small>
                </div>
                <b>{hist.score}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      {subTab === 'roadmap' && lessonResource === 'slides' && selectedLesson && (
        <div className={`slide-assistant ${slideAssistantOpen ? 'slide-assistant-open' : ''}`}>
          {slideAssistantOpen && (
            <section className="slide-assistant-panel" aria-label="Trợ giảng AI khi xem slide">
              <header className="slide-assistant-header">
                <div className="slide-assistant-avatar"><Bot size={20} /></div>
                <div>
                  <strong>Trợ giảng AI</strong>
                  <span>Bài {String(selectedLesson.id).padStart(2, '0')} · {selectedLesson.title}</span>
                </div>
                <button type="button" onClick={() => setSlideAssistantOpen(false)} aria-label="Thu nhỏ chatbot">
                  <Minus size={18} />
                </button>
              </header>

              <div className="slide-assistant-messages">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`slide-assistant-message ${message.sender === 'bot' ? 'slide-assistant-message-bot' : 'slide-assistant-message-user'}`}
                  >
                    {message.text}
                  </div>
                ))}
                {chatReplying && (
                  <div className="slide-assistant-message slide-assistant-message-bot slide-assistant-typing">
                    <span /><span /><span />
                  </div>
                )}
                <div ref={slideChatEndRef} />
              </div>

              <div className="slide-assistant-suggestions">
                <button type="button" onClick={() => handleSendChat('Giải thích nội dung này theo cách dễ hiểu')}>Giải thích dễ hiểu</button>
                <button type="button" onClick={() => handleSendChat('Cho tôi một ví dụ thực tế')}>Cho ví dụ</button>
              </div>

              <div className="slide-assistant-input">
                <input
                  value={chatInput}
                  onChange={event => setChatInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') handleSendChat(chatInput);
                  }}
                  placeholder="Hỏi điều bạn chưa hiểu trong slide..."
                />
                <button type="button" onClick={() => handleSendChat(chatInput)} disabled={!chatInput.trim() || chatReplying} aria-label="Gửi câu hỏi">
                  <Send size={17} />
                </button>
              </div>
            </section>
          )}

          <button
            type="button"
            className="slide-assistant-toggle"
            onClick={() => setSlideAssistantOpen(current => !current)}
            aria-label={slideAssistantOpen ? 'Thu nhỏ trợ giảng AI' : 'Mở trợ giảng AI'}
          >
            {slideAssistantOpen ? <Minus size={22} /> : <MessageCircle size={23} />}
            {!slideAssistantOpen && <span>Hỏi AI</span>}
          </button>
        </div>
      )}
    </div>
  );
}

function FaceEnrollment({ profile, onComplete, required = false }) {
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

function formatFileSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LessonSlideManager({ compact = false }) {
  const [slides, setSlides] = useState([]);
  const [lessonId, setLessonId] = useState('4');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function loadSlides() {
    try {
      setSlides(await api('/lessons/slides'));
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  useEffect(() => {
    loadSlides();
  }, []);

  async function uploadSlide(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file) {
      setMessage('❌ Hãy chọn một file PDF.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', lessonCatalog.find(item => String(item.id) === lessonId)?.title || '');
      const response = await fetch(`${API}/lessons/${lessonId}/slide`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'Không thể tải slide lên');
      setFile(null);
      form.reset();
      setMessage('✅ Đã lưu slide PDF cho bài học.');
      await loadSlides();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function previewSlide(targetLessonId) {
    const previewWindow = window.open('', '_blank');
    try {
      const response = await fetch(`${API}/lessons/${targetLessonId}/slide`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Không thể mở slide');
      }
      const url = URL.createObjectURL(await response.blob());
      if (previewWindow) previewWindow.location.href = url;
      else window.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      previewWindow?.close();
      setMessage(`❌ ${error.message}`);
    }
  }

  async function deleteSlide(targetLessonId) {
    try {
      await api(`/lessons/${targetLessonId}/slide`, { method: 'DELETE' });
      setMessage('✅ Đã xóa slide PDF.');
      await loadSlides();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  return (
    <section className={`card ${compact ? 'lesson-slide-manager-compact' : ''}`}>
      <SectionHeading
        icon={BookOpen}
        kicker="Learning Materials"
        title="Quản lý slide buổi học"
        description="Tải slide PDF lên từng bài học. File mới sẽ thay thế bản PDF hiện tại."
      />
      <form className="lesson-slide-upload" onSubmit={uploadSlide}>
        <label className="field-label">
          Bài học
          <select className="input mt-2" value={lessonId} onChange={event => setLessonId(event.target.value)}>
            {lessonCatalog.map(lesson => <option key={lesson.id} value={lesson.id}>Bài {String(lesson.id).padStart(2, '0')} · {lesson.title}</option>)}
          </select>
        </label>
        <label className="field-label">
          File slide PDF
          <input
            className="input mt-2 lesson-slide-file"
            type="file"
            accept="application/pdf,.pdf"
            onChange={event => setFile(event.target.files?.[0] || null)}
            required
          />
          <small>Tối đa 20 MB · chỉ nhận định dạng .pdf</small>
        </label>
        <button className="btn lesson-slide-submit" type="submit" disabled={busy}>
          <Upload size={17} />{busy ? 'Đang tải lên...' : 'Tải slide lên'}
        </button>
      </form>
      {message && <div className="result-message mt-4">{message}</div>}
      <div className="lesson-slide-list">
        {lessonCatalog.map(lesson => {
          const slide = slides.find(item => item.lesson_id === lesson.id);
          return (
            <div className="lesson-slide-row" key={lesson.id}>
              <div className={`lesson-slide-status ${slide ? 'lesson-slide-status-ready' : ''}`}>
                <BookOpen size={18} />
              </div>
              <div>
                <p>Bài {String(lesson.id).padStart(2, '0')} · {lesson.title}</p>
                <span>{slide ? `${slide.file_name} · ${formatFileSize(slide.file_size)}` : 'Chưa có slide PDF'}</span>
              </div>
              {slide && (
                <div className="lesson-slide-actions">
                  <button className="btn-secondary" type="button" onClick={() => previewSlide(lesson.id)}>Xem PDF</button>
                  <button className="icon-danger" type="button" title="Xóa slide" onClick={() => deleteSlide(lesson.id)}><Trash2 size={17} /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
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
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [report, setReport] = useState({ summary: {}, records: [] });
  const [reportFilter, setReportFilter] = useState({ class_id: '', subject_id: '', date_from: '', date_to: '' });
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState('');
  const [classForm, setClassForm] = useState({ code: '', name: '', teacher_id: '' });
  const [subjectForm, setSubjectForm] = useState({ code: '', name: '', credits: 3 });
  const [enrollmentForm, setEnrollmentForm] = useState({ class_id: '', student_id: '' });
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
    class_id: '',
    subject_id: '',
  });

  async function load() {
    try {
      const [userRows, locationRows, sessionRows, profileRows, anomalyRows, classRows, subjectRows] = await Promise.all([
        api('/admin/users'),
        api('/admin/locations'),
        api('/sessions'),
        api('/admin/face-profiles'),
        api('/admin/anomalies'),
        api('/classes'),
        api('/subjects'),
      ]);
      setUsers(userRows);
      setLocations(locationRows);
      setSessions(sessionRows);
      setProfiles(profileRows);
      setAnomalies(anomalyRows);
      setClasses(classRows);
      setSubjects(subjectRows);
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
            class_id: sessionForm.class_id ? Number(sessionForm.class_id) : null,
            subject_id: sessionForm.subject_id ? Number(sessionForm.subject_id) : null,
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
          class_id: sessionForm.class_id ? Number(sessionForm.class_id) : null,
          subject_id: sessionForm.subject_id ? Number(sessionForm.subject_id) : null,
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

  async function createClass(event) {
    event.preventDefault();
    try {
      await api('/admin/classes', {
        method: 'POST',
        body: JSON.stringify({
          ...classForm,
          teacher_id: classForm.teacher_id ? Number(classForm.teacher_id) : null,
        }),
      });
      setClassForm({ code: '', name: '', teacher_id: '' });
      await load();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  async function createSubject(event) {
    event.preventDefault();
    try {
      await api('/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({ ...subjectForm, credits: Number(subjectForm.credits) }),
      });
      setSubjectForm({ code: '', name: '', credits: 3 });
      await load();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  async function enrollStudent(event) {
    event?.preventDefault();
    try {
      await api(`/admin/classes/${enrollmentForm.class_id}/students`, {
        method: 'POST',
        body: JSON.stringify({ student_id: Number(enrollmentForm.student_id) }),
      });
      setEnrollmentForm({ class_id: '', student_id: '' });
      await load();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  async function loadReport() {
    const params = new URLSearchParams();
    if (reportFilter.class_id) params.set('class_id', reportFilter.class_id);
    if (reportFilter.subject_id) params.set('subject_id', reportFilter.subject_id);
    if (reportFilter.date_from) params.set('date_from', new Date(`${reportFilter.date_from}T00:00:00`).toISOString());
    if (reportFilter.date_to) params.set('date_to', new Date(`${reportFilter.date_to}T23:59:59`).toISOString());
    setReport(await api(`/reports/attendance${params.toString() ? `?${params}` : ''}`));
    setSection('reports');
  }

  async function loadLogs() {
    setLogs(await api('/admin/logs'));
    setSection('logs');
  }

  const adminTabs = [
    ['users', 'Tài khoản', Users],
    ['locations', 'Phòng Lab', MapPinned],
    ['classes', 'Lớp & môn', GraduationCap],
    ['schedule', 'Thời khóa biểu', CalendarPlus],
    ['materials', 'Học liệu', BookOpen],
    ['faces', 'Face Vector DB', Database],
    ['alerts', 'Cảnh báo', AlertTriangle],
    ['reports', 'Báo cáo', FileCheck],
    ['logs', 'Nhật ký', Activity],
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
          <button
            type="button"
            key={id}
            className={section === id ? 'admin-tab-active' : ''}
            onClick={() => id === 'reports' ? loadReport() : id === 'logs' ? loadLogs() : setSection(id)}
          >
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

      {section === 'classes' && (
        <div className="grid gap-5 xl:grid-cols-2">
          <form className="card" onSubmit={createClass}>
            <SectionHeading icon={GraduationCap} kicker="Class Management" title="Tạo lớp học" />
            <div className="mt-5 space-y-3">
              <label className="field-label">Mã lớp<input className="input mt-2" value={classForm.code} onChange={event => setClassForm({ ...classForm, code: event.target.value })} required /></label>
              <label className="field-label">Tên lớp<input className="input mt-2" value={classForm.name} onChange={event => setClassForm({ ...classForm, name: event.target.value })} required /></label>
              <label className="field-label">Giảng viên
                <select className="input mt-2" value={classForm.teacher_id} onChange={event => setClassForm({ ...classForm, teacher_id: event.target.value })}>
                  <option value="">Chưa phân công</option>
                  {users.filter(user => user.role === 'teacher').map(user => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                </select>
              </label>
              <button className="btn w-full" type="submit"><GraduationCap size={17} />Lưu lớp học</button>
            </div>
            <div className="mt-5 space-y-2">
              {classes.map(item => <div className="admin-list-row" key={item.id}><GraduationCap className="text-red-500" /><div><p>{item.code} · {item.name}</p><span>{item.student_count} sinh viên</span></div></div>)}
            </div>
          </form>
          <form className="card" onSubmit={createSubject}>
            <SectionHeading icon={Database} kicker="Subject Management" title="Tạo môn học" />
            <div className="mt-5 space-y-3">
              <label className="field-label">Mã môn<input className="input mt-2" value={subjectForm.code} onChange={event => setSubjectForm({ ...subjectForm, code: event.target.value })} required /></label>
              <label className="field-label">Tên môn<input className="input mt-2" value={subjectForm.name} onChange={event => setSubjectForm({ ...subjectForm, name: event.target.value })} required /></label>
              <label className="field-label">Số tín chỉ<input className="input mt-2" type="number" min="1" value={subjectForm.credits} onChange={event => setSubjectForm({ ...subjectForm, credits: event.target.value })} /></label>
              <button className="btn w-full" type="submit"><Database size={17} />Lưu môn học</button>
            </div>
            <div className="mt-5 space-y-2">
              {subjects.map(item => <div className="admin-list-row" key={item.id}><Database className="text-cyan-600" /><div><p>{item.code} · {item.name}</p><span>{item.credits} tín chỉ</span></div></div>)}
            </div>
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="font-extrabold text-slate-900">Thêm sinh viên vào lớp</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <select className="input" value={enrollmentForm.class_id} onChange={event => setEnrollmentForm({ ...enrollmentForm, class_id: event.target.value })} required><option value="">Chọn lớp</option>{classes.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</select>
                <select className="input" value={enrollmentForm.student_id} onChange={event => setEnrollmentForm({ ...enrollmentForm, student_id: event.target.value })} required><option value="">Chọn sinh viên</option>{users.filter(user => user.role === 'student' && user.student_id).map(user => <option key={user.student_id} value={user.student_id}>{user.student_code} · {user.full_name}</option>)}</select>
              </div>
              <button className="btn-secondary mt-3" type="button" onClick={enrollStudent}><UserPlus size={17} />Thêm vào lớp</button>
            </div>
          </form>
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
              <label className="field-label">Lớp học<select className="input mt-2" value={sessionForm.class_id} onChange={event => setSessionForm({ ...sessionForm, class_id: event.target.value })}><option value="">Không giới hạn lớp</option>{classes.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
              <label className="field-label">Môn học<select className="input mt-2" value={sessionForm.subject_id} onChange={event => setSessionForm({ ...sessionForm, subject_id: event.target.value })}><option value="">Chọn môn học</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
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

      {section === 'materials' && <LessonSlideManager />}

      {section === 'faces' && (
        <section className="card">
          <SectionHeading icon={Database} kicker="Face Vector DB" title="Dữ liệu khuôn mặt" description="Lưu vector nhận diện và ảnh đại diện thu nhỏ để đối chiếu." />
          <div className="mt-5 space-y-2">
            {profiles.length === 0 && <EmptyState icon={ScanFace} text="Chưa có sinh viên đăng ký khuôn mặt." />}
            {profiles.map(profile => (
              <div className="admin-list-row" key={profile.id}>
                <div className="admin-face-photo">
                  {profile.face_image_path
                    ? <img src={profile.face_image_path} alt={`Khuôn mặt ${profile.full_name}`} />
                    : <ScanFace size={21} />}
                </div>
                <div><p>{profile.full_name}</p><span>{profile.student_code} · {profile.class_name} · {profile.sample_count} vector mẫu</span></div>
                <span className="attendance-status attendance-present">{profile.status}</span>
                <button className="icon-danger" type="button" onClick={() => deleteProfile(profile.id)}><Trash2 size={17} /></button>
              </div>
            ))}
          </div>
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

      {section === 'reports' && (
        <section className="card">
          <div className="teacher-toolbar">
            <SectionHeading icon={FileCheck} kicker="Reporting" title="Báo cáo toàn hệ thống" />
            <button className="btn-secondary" type="button" onClick={() => downloadExcel(report.records)}><Download size={17} />Excel</button>
            <button className="btn" type="button" onClick={() => printPdfReport(report.records)}><FileCheck size={17} />PDF</button>
          </div>
          <div className="teacher-controls">
            <label className="field-label">Lớp<select className="input mt-2" value={reportFilter.class_id} onChange={event => setReportFilter({ ...reportFilter, class_id: event.target.value })}><option value="">Tất cả lớp</option>{classes.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label>
            <label className="field-label">Môn<select className="input mt-2" value={reportFilter.subject_id} onChange={event => setReportFilter({ ...reportFilter, subject_id: event.target.value })}><option value="">Tất cả môn</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label>
            <label className="field-label">Từ ngày<input className="input mt-2" type="date" value={reportFilter.date_from} onChange={event => setReportFilter({ ...reportFilter, date_from: event.target.value })} /></label>
            <label className="field-label">Đến ngày<input className="input mt-2" type="date" value={reportFilter.date_to} onChange={event => setReportFilter({ ...reportFilter, date_to: event.target.value })} /></label>
            <button className="btn-secondary self-end" type="button" onClick={loadReport}><Search size={17} />Lọc báo cáo</button>
          </div>
          <div className="teacher-stats mt-5">
            <TeacherStat icon={UserCheck} label="Có mặt" value={report.summary.present || 0} tone="green" />
            <TeacherStat icon={Clock3} label="Đi muộn" value={report.summary.late || 0} tone="amber" />
            <TeacherStat icon={AlertTriangle} label="Chờ duyệt" value={report.summary.pending_review || 0} tone="red" />
            <TeacherStat icon={Users} label="Tổng lượt" value={report.summary.total || 0} tone="cyan" />
          </div>
          <ReportTable records={report.records} />
        </section>
      )}

      {section === 'logs' && (
        <section className="card">
          <SectionHeading icon={Activity} kicker="Audit Trail" title="Nhật ký hành động" />
          <div className="mt-5 space-y-2">
            {logs.length === 0 && <EmptyState icon={Activity} text="Chưa có nhật ký." />}
            {logs.map(log => <div className="admin-list-row" key={log.id}><Activity className="text-violet-600" /><div><p>{log.action}</p><span>{log.entity_type || 'system'} #{log.entity_id || '—'} · {new Date(log.created_at).toLocaleString('vi-VN')}</span></div></div>)}
          </div>
        </section>
      )}
    </div>
  );
}

function ReportTable({ records }) {
  return (
    <div className="report-table-wrap mt-5">
      <table className="report-table">
        <thead><tr><th>Sinh viên</th><th>Buổi học</th><th>Trạng thái</th><th>Phương thức</th><th>Confidence</th><th>Thời gian</th></tr></thead>
        <tbody>
          {records.map(row => (
            <tr key={row.attendance_id}>
              <td><strong>{row.full_name}</strong><small>{row.student_code} · {row.class_name}</small></td>
              <td>{row.session_title}</td>
              <td>{row.status}</td>
              <td>{row.method}</td>
              <td>{row.confidence_score ?? '—'}</td>
              <td>{row.checked_at ? new Date(row.checked_at).toLocaleString('vi-VN') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length === 0 && <EmptyState icon={FileCheck} text="Chưa có dữ liệu báo cáo." />}
    </div>
  );
}

function InstructorDashboard() {
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [teacherReport, setTeacherReport] = useState({ summary: {}, records: [] });
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyStudentId, setBusyStudentId] = useState(null);
  const [message, setMessage] = useState('');

  async function loadOverview() {
    try {
      const [studentRows, sessionRows, leaveRows, appealRows] = await Promise.all([
        api('/students'),
        api('/sessions'),
        api('/instructor/leave-requests'),
        api('/instructor/appeals'),
      ]);
      setStudents(studentRows);
      setSessions(sessionRows);
      setLeaveRequests(leaveRows);
      setAppeals(appealRows);
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
    const isPresent = ['present', 'late'].includes(student.attendance?.status);
    const isPending = ['pending_face', 'pending_review'].includes(student.attendance?.status);
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'present' && isPresent)
      || (statusFilter === 'pending' && isPending)
      || (statusFilter === 'absent' && !isPresent && !isPending);
    return matchesSearch && matchesStatus;
  });
  const presentCount = attendances.filter(attendance => attendance.status === 'present').length;
  const pendingFaceCount = attendances.filter(attendance => ['pending_face', 'pending_review'].includes(attendance.status)).length;
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

  async function updateBFace() {
    if (!selectedSessionId) {
      setMessage('❌ Hãy chọn một buổi học trước.');
      return;
    }
    setBusyStudentId('face-scan');
    setMessage('Đang cập nhật dữ liệu BFace...');
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

  async function reviewAttendance(attendanceId, status) {
    await api(`/instructor/attendance/${attendanceId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, review_note: status === 'present' ? 'Đã xác minh khuôn mặt' : 'Không đủ độ tin cậy' }),
    });
    await loadAttendances();
  }

  async function reviewAppeal(appealId, status) {
    await api(`/instructor/appeals/${appealId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, review_note: status === 'approved' ? 'Đã chấp nhận điều chỉnh' : 'Không đủ minh chứng' }),
    });
    await loadOverview();
  }

  async function loadTeacherReport() {
    const query = selectedSessionId ? `?session_id=${selectedSessionId}` : '';
    setTeacherReport(await api(`/reports/attendance${query}`));
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

      <LessonSlideManager compact />

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
          <button type="button" className="btn-secondary" onClick={async () => { await loadTeacherReport(); downloadExcel((await api(`/reports/attendance${selectedSessionId ? `?session_id=${selectedSessionId}` : ''}`)).records); }}>
            <Download size={17} />Excel
          </button>
          <button type="button" className="btn-secondary" onClick={async () => { const data = await api(`/reports/attendance${selectedSessionId ? `?session_id=${selectedSessionId}` : ''}`); setTeacherReport(data); printPdfReport(data.records); }}>
            <FileCheck size={17} />PDF
          </button>
          <button
            type="button"
            className="face-scan-button"
            onClick={updateBFace}
            disabled={!selectedSessionId || busyStudentId === 'face-scan'}
          >
            <ScanFace size={18} />
            {busyStudentId === 'face-scan' ? 'Đang cập nhật...' : `Cập nhật BFace (${pendingFaceCount})`}
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
            const present = ['present', 'late'].includes(student.attendance?.status);
            const pendingFace = ['pending_face', 'pending_review'].includes(student.attendance?.status);
            const late = student.attendance?.status === 'late' || isLate(student.attendance);
            return (
              <article className="teacher-student-row" key={student.id}>
                <div className="student-avatar">{student.full_name?.charAt(0) || 'S'}</div>
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
                {pendingFace && (
                  <div className="attendance-review-actions">
                    <button type="button" title="Duyệt" onClick={() => reviewAttendance(student.attendance.id, 'present')}><UserCheck size={16} /></button>
                    <button type="button" title="Từ chối" onClick={() => reviewAttendance(student.attendance.id, 'rejected')}><UserX size={16} /></button>
                  </div>
                )}
                <BFaceThumbnail student={student} />
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

      <section className="card">
        <div className="flex items-center justify-between gap-3">
          <SectionHeading icon={AlertTriangle} kicker="Attendance Appeals" title="Yêu cầu sửa điểm danh" />
          <span className="count-badge">{appeals.filter(item => item.status === 'pending').length} chờ duyệt</span>
        </div>
        <div className="mt-5 space-y-2">
          {appeals.length === 0 && <EmptyState icon={AlertTriangle} text="Chưa có yêu cầu sửa điểm danh." />}
          {appeals.map(item => (
            <div className="leave-review-row" key={item.id}>
              <div>
                <p>{item.full_name} · {item.student_code}</p>
                <span>{item.session_title || 'Không gắn buổi học'} · {new Date(item.created_at).toLocaleString('vi-VN')}</span>
                <em>{item.reason}{item.evidence_name ? ` · Minh chứng: ${item.evidence_name}` : ''}</em>
              </div>
              {item.status === 'pending' ? (
                <div>
                  <button type="button" className="attendance-action attendance-add" onClick={() => reviewAppeal(item.id, 'approved')}>Duyệt</button>
                  <button type="button" className="attendance-action attendance-remove" onClick={() => reviewAppeal(item.id, 'rejected')}>Từ chối</button>
                </div>
              ) : <span className={`attendance-status ${item.status === 'approved' ? 'attendance-present' : 'attendance-absent'}`}>{item.status}</span>}
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

function BFaceThumbnail({ student }) {
  return (
    <div className="bface-thumbnail" title={student.face_image_path ? `BFace của ${student.full_name}` : 'Chưa có ảnh BFace'}>
      {student.face_image_path
        ? <img src={student.face_image_path} alt={`BFace ${student.full_name}`} />
        : <ScanFace size={19} />}
    </div>
  );
}

function Sessions() {
  const [items, setItems] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({
    title: 'Lab 01 - Python',
    room: 'Lab A301',
    start_time: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    class_id: '',
    subject_id: '',
  });

  const load = () => Promise.all([api('/sessions'), api('/classes'), api('/subjects')])
    .then(([sessionRows, classRows, subjectRows]) => {
      setItems(sessionRows);
      setClasses(classRows);
      setSubjects(subjectRows);
    })
    .catch(() => setItems([]));
  useEffect(load, []);

  async function submit(event) {
    event.preventDefault();
    await api('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        class_id: form.class_id ? Number(form.class_id) : null,
        subject_id: form.subject_id ? Number(form.subject_id) : null,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      }),
    });
    load();
  }

  async function view(id) {
    setAttendances(await api(`/sessions/${id}/attendances`));
  }

  async function toggleSession(session) {
    await api(`/sessions/${session.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: session.status === 'active' ? 'closed' : 'active' }),
    });
    await load();
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
          <label className="field-label">Lớp học<select className="input mt-2" value={form.class_id} onChange={event => setForm({ ...form, class_id: event.target.value })}><option value="">Không giới hạn lớp</option>{classes.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
          <label className="field-label">Môn học<select className="input mt-2" value={form.subject_id} onChange={event => setForm({ ...form, subject_id: event.target.value })}><option value="">Chọn môn học</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
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
                  <span className={`live-chip ${session.status === 'closed' ? 'live-chip-waiting' : ''}`}><span />{session.status === 'closed' ? 'Đã đóng' : 'Đang mở'}</span>
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
              <button className="btn-secondary mt-2" type="button" onClick={() => toggleSession(session)}>
                {session.status === 'active' ? <UserX size={17} /> : <UserCheck size={17} />}
                {session.status === 'active' ? 'Đóng điểm danh' : 'Mở điểm danh'}
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

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <p>{text}</p>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
