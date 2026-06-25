export function TeacherStat({ icon: Icon, label, value, tone }) {
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
