export function downloadExcel(records, filename = 'bao-cao-diem-danh.xls') {
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

export function printPdfReport(records) {
  const popup = window.open('', '_blank', 'width=1000,height=760');
  if (!popup) return;
  const rows = records.map(row => `<tr><td>${row.student_code}</td><td>${row.full_name}</td><td>${row.class_name}</td><td>${row.session_title}</td><td>${row.status}</td><td>${row.method}</td><td>${row.confidence_score ?? ''}</td></tr>`).join('');
  popup.document.write(`<!doctype html><html><head><title>Báo cáo điểm danh</title><style>body{font-family:Arial;padding:28px;color:#172033}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #d8dee9;padding:8px;text-align:left;font-size:12px}th{background:#f1f5f9}</style></head><body><h1>Báo cáo điểm danh VINLAB</h1><p>Ngày xuất: ${new Date().toLocaleString('vi-VN')}</p><table><thead><tr><th>Mã SV</th><th>Họ tên</th><th>Lớp</th><th>Buổi học</th><th>Trạng thái</th><th>Phương thức</th><th>Confidence</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
  popup.document.close();
}
