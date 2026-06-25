import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Activity, AlertTriangle, BookOpen, CalendarPlus, Camera, Clock3, Download, Database, FileCheck, GraduationCap, MapPin, MapPinned, ScanFace, Search, ShieldCheck, Trash2, UserCheck, UserPlus, Users } from 'lucide-react';

import { api } from '../lib/api';

import { EmptyState, ReportTable, SectionHeading, TeacherStat } from '../components';

import { LessonSlideManager } from '../components/LessonSlideManager';

import { downloadExcel, printPdfReport } from '../lib/reports';


export function AdminDashboard() {
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
