import { CalendarPlus, GraduationCap, LayoutDashboard, QrCode, ShieldCheck, Sparkles, Users } from 'lucide-react';

export const navigation = [
  { id: 'checkin', label: 'Điểm danh', description: 'Mã QR & khuôn mặt', icon: QrCode, roles: ['student'] },
  { id: 'studentPortal', label: 'Cổng sinh viên', description: 'Lịch, lịch sử, xin nghỉ', icon: CalendarPlus, roles: ['student'] },
  { id: 'socraticDashboard', label: 'Gia sư AI & Lộ trình', description: 'Học tập AI, Socratic Chat', icon: Sparkles, roles: ['student'] },
  { id: 'sessions', label: 'Buổi thực hành', description: 'Lịch & mã QR', icon: CalendarPlus, roles: ['teacher'] },
  { id: 'students', label: 'Sinh viên', description: 'Quản lý lớp', icon: Users, roles: ['teacher'] },
  { id: 'instructor', label: 'Giảng viên', description: 'Theo dõi lớp học', icon: GraduationCap, roles: ['teacher'] },
  { id: 'admin', label: 'Quản trị hệ thống', description: 'Tài khoản, phòng Lab, bảo mật', icon: ShieldCheck, roles: ['admin'] },
];

export const pageMeta = {
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

export function defaultTabForRole(role) {
  if (role === 'teacher') return 'instructor';
  if (role === 'admin') return 'admin';
  return 'checkin';
}

export function isTabAllowed(tab, role) {
  return navigation.some(item => item.id === tab && item.roles.includes(role));
}

export const tabPaths = {
  checkin: '/student/check-in',
  studentPortal: '/student/home',
  socraticDashboard: '/student/socratic',
  sessions: '/teacher/attendance/create',
  students: '/teacher/classes',
  instructor: '/teacher/dashboard',
  admin: '/admin/dashboard',
};

export const lessonCatalog = [
  { id: 1, title: 'Nền tảng AI & LLM' },
  { id: 2, title: 'Xác định bài toán AI' },
  { id: 3, title: 'Chatbot & Agent' },
  { id: 4, title: 'Thiết kế câu lệnh & Tool Calling' },
  { id: 5, title: 'Tư duy sản phẩm AI' },
  { id: 6, title: 'Xây dựng nguyên mẫu thử nghiệm' },
];


export function tabFromPath(role) {
  const entry = Object.entries(tabPaths).find(([, path]) => window.location.pathname.startsWith(path));
  return entry && isTabAllowed(entry[0], role) ? entry[0] : defaultTabForRole(role);
}
