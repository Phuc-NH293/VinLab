import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarPlus, Download, FileCheck, GraduationCap, RefreshCw, ScanFace, Search, UserCheck, UserX, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { BFaceThumbnail, EmptyState, SectionHeading, StudentPhoto, TeacherStat } from '../../components';
import { LessonSlideManager } from '../../components/LessonSlideManager';
import { downloadExcel, printPdfReport } from '../../lib/reports';

export function ReportTable({ records }) {
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

export function InstructorDashboard() {
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
