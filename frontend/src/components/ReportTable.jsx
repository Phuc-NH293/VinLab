import { FileCheck } from 'lucide-react';
import { EmptyState } from './EmptyState';

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
