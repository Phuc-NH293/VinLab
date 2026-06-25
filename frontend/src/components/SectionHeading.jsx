export function SectionHeading({ icon: Icon, kicker, title, description }) {
  return (
    <div className="section-heading">
      <div className="section-icon"><Icon size={22} /></div>
      <div>
        <p className="section-kicker">{kicker}</p>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}
