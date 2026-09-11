import { formatDistance } from '../../utils/distance.js';

export default function BathroomAccess({
  averages,
  reviewCount = 0,
  nearestRestroom,
  unit = 'km',
  beyondCoverage = false,
  coverageLabel,
}) {

  const reported = averages?.genderNeutral || 0;
  const accessible = averages?.wheelchair || 0;

  if (reviewCount > 0 && (reported > 0 || accessible > 0)) {
    const level = reported > 0 ? 'good' : 'mixed';
    const label = [
      reported > 0 && 'Gender-neutral',
      accessible > 0 && 'wheelchair accessible',
    ].filter(Boolean).join(', ');

    return (
      <div className={`bathroom bathroom-${level}`}>
        <span className="bathroom-label">Bathroom Access</span>
        <span className="bathroom-value">
          {label} - reported by {Math.max(reported, accessible)} of {reviewCount}
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

  if (beyondCoverage) {
    return (
      <div className="bathroom bathroom-unknown">
        <span className="bathroom-label">Bathroom Access</span>
        <span className="bathroom-value">
          No data - Refuge Restrooms only covers about {coverageLabel} from you
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
