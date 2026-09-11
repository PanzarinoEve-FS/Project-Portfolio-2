import { Link } from 'react-router-dom';

import BathroomAccess from './BathroomAccess.jsx';
import CEIScore from './CEIScore.jsx';

export default function BusinessCard({
  business,
  nearestRestroom,
  unit = 'km',
  cei,
  to = '/business',
  beyondCoverage = false,
  coverageLabel,
}) {
  const reviewCount = business.reviews?.length ?? 0;
  const overall = business.averages?.overall;

  return (
    <article className="card">
      <div className="card-head">
        <h3>{business.name}</h3>
        {reviewCount > 0 && <span className="score">{overall} / 5</span>}
      </div>

      {business.category && <span className="tag">{business.category}</span>}
      <p className="address">{business.address}</p>

      <BathroomAccess
        averages={business.averages}
        reviewCount={reviewCount}
        nearestRestroom={nearestRestroom}
        beyondCoverage={beyondCoverage}
        coverageLabel={coverageLabel}
        unit={unit}
      />

      <CEIScore match={cei} />

      <div className="card-foot">
        <span className="muted">
          {reviewCount === 0 ? 'No reviews yet' : `${reviewCount} review${reviewCount === 1 ? '' : 's'}`}
        </span>
        <Link to={`${to}/${encodeURIComponent(business.osmId)}`}>View profile</Link>
      </div>
    </article>
  );
}
