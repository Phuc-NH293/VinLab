import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CalendarPlus, Clock3, FileCheck, MapPin, ScanFace, Send, UserCheck } from 'lucide-react';
import { api, API } from '../../lib/api';
import { EmptyState, SectionHeading, TeacherStat } from '../../components';
import { FaceEnrollment } from '../attendance';

export function StudentPortal() {
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
                  <small>
                    {item.room} · Vào: {new Date(item.checked_at).toLocaleString('vi-VN')}
                    {' · '}
                    {item.checkout_at ? `Ra: ${new Date(item.checkout_at).toLocaleString('vi-VN')}` : 'Chưa check-out'}
                  </small>
                </div>
                <b>{item.method} → {item.checkout_method || '—'}</b>
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
