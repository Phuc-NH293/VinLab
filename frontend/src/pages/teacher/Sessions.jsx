import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarPlus, CheckCircle2, Clock3, Copy, MapPin, Maximize2, QrCode, RefreshCw, UserCheck, UserX, Users, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../lib/api';
import { EmptyState, SectionHeading } from '../../components';

const qrPayload = token => `VINLAB:${token}`;

export function Sessions() {
  const [items, setItems] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [presentingSession, setPresentingSession] = useState(null);
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
      setSelectedSessionId(current => current || String(sessionRows[0]?.id || ''));
    })
    .catch(error => {
      setItems([]);
      setMessage(`❌ ${error.message}`);
    });
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedSessionId) {
      setAttendances([]);
      return undefined;
    }
    loadAttendances(selectedSessionId);
    const refreshTimer = window.setInterval(() => loadAttendances(selectedSessionId, true), 5000);
    return () => window.clearInterval(refreshTimer);
  }, [selectedSessionId]);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    const startTime = new Date(form.start_time);
    const endTime = new Date(form.end_time);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      setMessage('❌ Hãy nhập đầy đủ thời gian bắt đầu và kết thúc.');
      return;
    }
    if (endTime <= startTime) {
      setMessage('❌ Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }
    setCreating(true);
    try {
      const created = await api('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          class_id: form.class_id ? Number(form.class_id) : null,
          subject_id: form.subject_id ? Number(form.subject_id) : null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        }),
      });
      await load();
      setSelectedSessionId(String(created.id));
      setPresentingSession(created);
      setMessage('✅ Đã tạo buổi học và phát hành mã QR check-out.');
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function loadAttendances(id = selectedSessionId, silent = false) {
    if (!id) return;
    if (!silent) setAttendanceLoading(true);
    try {
      setAttendances(await api(`/sessions/${id}/attendances`));
    } catch (error) {
      if (!silent) setMessage(`❌ ${error.message}`);
    } finally {
      if (!silent) setAttendanceLoading(false);
    }
  }

  function view(id) {
    setSelectedSessionId(String(id));
    window.setTimeout(() => {
      document.getElementById('session-attendance-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  async function toggleSession(session) {
    await api(`/sessions/${session.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: session.status === 'active' ? 'closed' : 'active' }),
    });
    await load();
  }

  async function copyToken(session) {
    try {
      await navigator.clipboard.writeText(session.qr_token);
      setMessage('✅ Đã sao chép mã xác nhận.');
    } catch {
      setMessage('❌ Không thể sao chép tự động. Hãy chọn mã và sao chép thủ công.');
    }
  }

  const selectedSession = items.find(session => String(session.id) === String(selectedSessionId));

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
        <button className="btn mt-5" type="submit" disabled={creating}>
          <QrCode size={18} />{creating ? 'Đang tạo...' : 'Tạo buổi học & QR'}
        </button>
        {message && <div className="result-message mt-4">{message}</div>}
      </form>

      {items.length > 0 && (
        <section className="card">
          <SectionHeading
            icon={QrCode}
            kicker="QR check-out theo buổi học"
            title="Chọn buổi để phát mã check-out"
            description="Sinh viên phải check-in khuôn mặt trước, sau đó dùng QR này để check-out."
          />
          <label className="field-label mt-5 block">
            Buổi học
            <select
              className="input mt-2"
              value={selectedSessionId}
              onChange={event => setSelectedSessionId(event.target.value)}
            >
              {items.map(session => (
                <option key={session.id} value={session.id}>
                  {session.title} — {session.room}
                </option>
              ))}
            </select>
          </label>
          {selectedSession && (
            <div className="session-qr-focus mt-5">
              <div className="qr-wrap session-qr-large">
                <QRCodeSVG value={qrPayload(selectedSession.qr_token)} size={190} />
              </div>
              <div className="min-w-0">
                <span className={`live-chip ${selectedSession.status === 'closed' ? 'live-chip-waiting' : ''}`}>
                  <span />{selectedSession.status === 'closed' ? 'Đã đóng' : 'Đang mở'}
                </span>
                <h3>{selectedSession.title}</h3>
                <p>{selectedSession.room} · {new Date(selectedSession.start_time).toLocaleString('vi-VN')}</p>
                <code className="token-box">{selectedSession.qr_token}</code>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn" type="button" onClick={() => setPresentingSession(selectedSession)}>
                    <Maximize2 size={17} />Trình chiếu QR check-out
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => copyToken(selectedSession)}>
                    <Copy size={17} />Sao chép mã
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => loadAttendances()}>
                    <RefreshCw size={17} />Làm mới danh sách ({attendances.length})
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

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
                <div className="qr-wrap"><QRCodeSVG value={qrPayload(session.qr_token)} size={108} /></div>
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

      <section className="card" id="session-attendance-list">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading
            icon={CheckCircle2}
            kicker="Cập nhật tự động"
            title={`Danh sách điểm danh · ${selectedSession?.title || 'Chưa chọn buổi'}`}
            description="Danh sách tự làm mới mỗi 5 giây, hiển thị riêng giờ check-in và check-out."
          />
          <div className="flex items-center gap-2">
            <span className="count-badge">{attendances.length} sinh viên</span>
            <button className="btn-secondary" type="button" onClick={() => loadAttendances()} disabled={!selectedSessionId || attendanceLoading}>
              <RefreshCw size={17} className={attendanceLoading ? 'animate-spin' : ''} />
              {attendanceLoading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
        </div>
        {attendances.length === 0 && !attendanceLoading ? (
          <div className="mt-5">
            <EmptyState icon={Users} text="Chưa có sinh viên điểm danh trong buổi này." />
          </div>
        ) : (
          <div className="session-attendance-list mt-5">
            {attendances.map((attendance, index) => (
              <div className="session-attendance-row" key={attendance.id}>
                <div className="session-attendance-number">{index + 1}</div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{attendance.full_name}</p>
                  <p className="text-sm text-slate-500">{attendance.student_code} · {attendance.class_name || 'Chưa có lớp'}</p>
                </div>
                <div className="session-attendance-meta">
                  <span>Vào · {attendance.method}</span>
                  <time>{new Date(attendance.checked_at).toLocaleString('vi-VN')}</time>
                  <span className={attendance.checkout_at ? '' : 'session-checkout-missing'}>
                    {attendance.checkout_at ? `Ra · ${attendance.checkout_method || 'QR'}` : 'Chưa check-out'}
                  </span>
                  {attendance.checkout_at && <time>{new Date(attendance.checkout_at).toLocaleString('vi-VN')}</time>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {presentingSession && (
        <div className="qr-presentation" role="dialog" aria-modal="true" aria-label="Mã QR check-out">
          <button type="button" className="qr-presentation-close" onClick={() => setPresentingSession(null)} aria-label="Đóng">
            <X size={24} />
          </button>
          <div className="qr-presentation-card">
            <p>Mã QR check-out</p>
            <h2>{presentingSession.title}</h2>
            <span>{presentingSession.room}</span>
            <QRCodeSVG value={qrPayload(presentingSession.qr_token)} size={360} />
            <code>{presentingSession.qr_token}</code>
          </div>
        </div>
      )}
    </div>
  );
}
