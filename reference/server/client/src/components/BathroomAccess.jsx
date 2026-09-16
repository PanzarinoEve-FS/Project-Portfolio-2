import { formatDistance } from '../utils/distance.js';

// Turns a 1-5 community score into a plain-language band.
export function band(score) {
  if (score >= 4) return { level: 'good', label: 'Good' };
  if (score >= 2.5) return { level: 'mixed', label: 'Mixed' };
  return { level: 'poor', label: 'Poor' };
}

// Bathroom access is the headline of this app.

export default function BathroomAccess({ score, reviewCount = 0, nearestRestroom, unit = 'km' }) {
  if (reviewCount > 0 && score > 0) {
    const { level, label } = band(score);

    return (
      <div className={`bathroom bathroom-${level}`}>
        <span className="bathroom-label">Bathroom Access</span>
        <span className="bathroom-value">
          {label} - {score} / 5
        </span>
      </div>
    );
  }

  if (nearestRestroom) {
    const tags = [
      nearestRestroom.unisex && 'gender-neutral',
      nearestRestroom.accessible && 'accessible',
    ].filter(Boolean);

    return (
      <div className="bathroom bathroom-nearby">
        <span className="bathroom-label">Bathroom Access</span>
        <span className="bathroom-value">
          Documented {tags.join(', ') || 'restroom'}{' '}
          {formatDistance(nearestRestroom.metres, unit)} away
        </span>
      </div>
    );
  }

  return (
    <div className="bathroom bathroom-unknown">
      <span className="bathroom-label">Bathroom Access</span>
      <span className="bathroom-value">Not rated yet</span>
    </div>
  );
}
