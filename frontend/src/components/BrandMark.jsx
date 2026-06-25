import vinUniversityLogo from '../assets/vinuniversity-logo.png';

export function BrandMark() {
  return (
    <span className="brand-mark" aria-label="VinUniversity">
      <img src={vinUniversityLogo} alt="VinUniversity" />
    </span>
  );
}
