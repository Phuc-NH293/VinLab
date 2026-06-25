export function EmptyState({ icon: Icon, text }) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <p>{text}</p>
    </div>
  );
}
