import { BANDS } from './ZipLayer.jsx';
import BusinessChart from './BusinessChart.jsx';

// Literal hex, as on the map layer. Dots show Mixed in yellow.
const DOT_COLORS = { good: BANDS.good.color, mixed: '#ffcc00', poor: BANDS.poor.color };

const SOURCE_LABEL = {
  reviews: 'community reviews',
  web: 'web reviews',
  restroom: 'restroom',
  brand: 'chain reviews',
  cei: 'CEI',
};
const STANCE_LABEL = { friendly: 'Friendly', mixed: 'Mixed', unfriendly: 'Unfriendly', unclear: 'Unclear' };

const bandFor = (score, method) => {
  if (score >= (method?.bands?.good ?? 95)) return 'good';
  if (score >= (method?.bands?.mixed ?? 85)) return 'mixed';
  return 'poor';
};


function insufficientText(zip, minScored) {
  if (zip.scanned === 0) return 'No businesses have been surveyed in this ZIP yet.';
  if (zip.scored === 0 && zip.corporateOnly > 0) {
    return `The only evidence here is company-wide, CEI scores or chain reviews, for ${zip.corporateOnly} ${
      zip.corporateOnly === 1 ? 'place' : 'places'
    }. Company-wide evidence alone does not color a ZIP.`;
  }
  if (zip.scored === 0) {
    return zip.scanned === 1
      ? 'The one business surveyed here has no score yet.'
      : `None of the ${zip.scanned} businesses surveyed here have a score yet.`;
  }
  return `Only ${zip.scored} of the ${zip.scanned} businesses here ${
    zip.scored === 1 ? 'has' : 'have'
  } local evidence. At least ${minScored} are needed for a color.`;
}

function Contributors({ label, businesses, method, onOpenBusiness }) {
  if (!businesses || businesses.length === 0) return null;

  return (
    <>
      <div className="group-label">{label}</div>
      <div className="zip-list">
        {businesses.map((business, index) => (
          <button
            key={`${label}-${business.osmId ?? business.name}-${index}`}
            type="button"
            className="zip-row"
            onClick={() => onOpenBusiness(business)}
          >
            <span
              className="zip-swatch"
              style={{ background: DOT_COLORS[bandFor(business.score, method)] }}
            />
            <strong>{business.name}</strong>
            <span className="muted">
              {business.score} · {(business.sources ?? []).map((source) => SOURCE_LABEL[source]).join(', ')}
              {business.bad && ' · bad review'}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

// A ZIP's own profile, titled with its number:
//  what it scored, what the score was built from, and every business counted here. 
// Each business and each web review opens the place it is about.
export default function ZipPanel({ zip, method, onOpenBusiness, onOpenReview, onClose }) {
  if (!zip) return null;

  const businesses = [...(zip.businesses ?? [])].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name)
  );
  const stanceTotal = zip.stances.friendly + zip.stances.mixed + zip.stances.unfriendly;

  return (
    <>
      <button type="button" className="detail-back" onClick={onClose}>
        Close
      </button>

      <header className="profile-hero">
        <h1>{zip.zip}</h1>
        <p className="address">
          <span
            className={zip.band === 'insufficient' ? 'zip-swatch is-grey' : 'zip-swatch'}
            style={{ background: BANDS[zip.band].color }}
          />{' '}
          {BANDS[zip.band].label}
          {zip.score != null && ` · ${zip.score} / 100`}
        </p>
      </header>

      <div className="panel">
        <h2>Business Safety Score</h2>

        {zip.band === 'insufficient' ? (
          <p className="muted">{insufficientText(zip, method?.minScored ?? 3)}</p>
        ) : (
          <>
            <p>
              <span className="score">{zip.score} / 100</span>{' '}
              <span className="muted">
                from {zip.scored} of {zip.scanned} businesses
              </span>
            </p>
            <p className="muted">
              {zip.signals.reviews} with community reviews · {zip.signals.web} with web reviews ·{' '}
              {zip.signals.restroom} near a gender-neutral restroom · {zip.signals.brand} with chain reviews ·{' '}
              {zip.signals.cei} with a CEI score
              {zip.corporateOnly > 0 && ` · ${zip.corporateOnly} known only company-wide, not counted`}
            </p>

            {stanceTotal === 0 && (
              <p className="muted">
                {zip.reviews.length > 0
                  ? `Nobody has reviewed a place in this ZIP. The reviews below are about those chains
                     company-wide, which shades a business's own score but never colors a ZIP.`
                  : `No LGBTQIA+ reviews of places here yet. This score comes from documented
                     gender-neutral restrooms, not from what anyone reported about being treated here.`}
              </p>
            )}

            <BusinessChart businesses={zip.businesses} method={method} />
          </>
        )}
      </div>

      {zip.band !== 'insufficient' && (
        <div className="panel">
          <h2>Highest and lowest</h2>
          <Contributors
            label="Highest"
            businesses={zip.highest}
            method={method}
            onOpenBusiness={onOpenBusiness}
          />
          <Contributors
            label="Lowest"
            businesses={zip.lowest}
            method={method}
            onOpenBusiness={onOpenBusiness}
          />
        </div>
      )}

      {zip.reviews.length > 0 && (
        <div className="panel">
          <h2>Web Reviews</h2>

          {stanceTotal > 0 && (
            <p className="muted">
              Reviews of places here: {zip.stances.unfriendly} unfriendly · {zip.stances.mixed} mixed ·{' '}
              {zip.stances.friendly} friendly
            </p>
          )}

          <ul className="business-reviews">
            {zip.reviews.map((review) => (
              <li key={review.key}>
                <button
                  type="button"
                  className="zip-review"
                  onClick={() => onOpenReview(review)}
                  disabled={review.lat == null || review.lng == null}
                >
                  <div className="business-review-head">
                    <span className={`stance-dot is-${review.stance}`} />
                    <strong>{review.business}</strong>
                    <span className="muted">
                      {STANCE_LABEL[review.stance]} ·{' '}
                      {review.scope === 'brand' ? 'whole chain' : 'this location'}
                    </span>
                  </div>
                </button>

                {review.quote && <q className="zip-quote">{review.quote}</q>}
                {review.summary && <p className="business-review-summary">{review.summary}</p>}

                <div className="business-review-foot">
                  <span className="muted">{review.publisher || review.title}</span>
                  {review.url && (
                    <a className="chip" href={review.url} target="_blank" rel="noreferrer">
                      View Web Article
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        <h2>{zip.scored === 1 ? '1 business counted' : `${zip.scored} businesses counted`}</h2>

        {zip.scored > businesses.length && (
          <p className="muted">Showing {businesses.length} of them, highest and lowest scoring.</p>
        )}

        {businesses.length === 0 ? (
          <p className="empty">
            Nothing here has local evidence yet. Grey means nothing has been documented, not that a place is
            unsafe.
          </p>
        ) : (
          <div className="zip-list">
            {businesses.map((business) => (
              <button
                key={business.osmId ?? business.name}
                type="button"
                className="zip-row"
                onClick={() => onOpenBusiness(business)}
              >
                <span
                  className="zip-swatch"
                  style={{ background: DOT_COLORS[bandFor(business.score, method)] }}
                />
                <strong>{business.name}</strong>
                <span className="muted">
                  {business.score}
                  {business.bad && ' · bad review'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
