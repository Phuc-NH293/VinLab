import React, { useEffect, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { EmptyState, SectionHeading, StudentPhoto } from '../../components';

export function Students() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    student_code: 'SV001',
    full_name: 'Nguyễn Văn A',
    class_name: 'AI20K',
    password: 'VinLab@123',
  });

  const load = () => api('/students').then(setItems).catch(() => setItems([]));
  useEffect(() => {
    load();
  }, []);

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
