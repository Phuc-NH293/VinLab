import React, { useState } from 'react';
import { Camera, CheckCircle2, GraduationCap, LayoutDashboard, LogIn, ScanFace, ShieldCheck, Users } from 'lucide-react';
import { api, setSession } from '../../lib/api';
import { BrandMark } from '../../components';

export function LoginScreen({ onLogin, onGoToWelcome }) {
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
          <div className="login-mobile-brand"><BrandMark /></div>
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
