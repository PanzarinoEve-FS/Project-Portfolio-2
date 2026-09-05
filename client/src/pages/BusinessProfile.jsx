import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import {
  getBusiness,
  lookupPlace,
  saveBusiness,
  addReview,
  getRestrooms,
  getCEI,
} from '../api/client.js';
import { findNearestRestroom, formatDistance } from '../utils/distance.js';
import MapView from '../components/MapView.jsx';
import RatingsChart from '../components/RatingsChart.jsx';
import BathroomAccess from '../components/BathroomAccess.jsx';
import CEIScore from '../components/CEIScore.jsx';
import { matchCEI } from '../utils/cei.js';

const STATS = [
  { key: 'bathroomAccess', label: 'Bathroom Access' },
  { key: 'acceptance', label: 'Acceptance' },
  { key: 'staffFriendliness', label: 'Staff Friendliness' },
  { key: 'safety', label: 'Safety' },
  { key: 'overall', label: 'Overall' },
];

const BLANK = {
  author: '',
  comment: '',
  bathroomAccess: 3,
  acceptance: 3,
  staffFriendliness: 3,
  safety: 3,
  overall: 3,
};

export default function BusinessProfile() {
  const { osmId } = useParams();
  const [business, setBusiness] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [nearestRestroom, setNearestRestroom] = useState(null);
  const [cei, setCei] = useState({ entries: [], maxScore: 100 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // A place only lands in MongoDB once somebody reviews it, so a 
    // 404 is the normal case for an unreviewed business rather than an error.
    getBusiness(osmId)
      .catch((err) => {
        if (err.status !== 404) throw err;
        return lookupPlace(osmId);
      })
      .then((data) => !cancelled && setBusiness(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [osmId]);

  // Once the place resolves, check whether a documented restroom sits close by.
  useEffect(() => {
    getCEI()
      .then(setCei)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!business) return;

    let cancelled = false;

    getRestrooms({ lat: business.lat, lng: business.lng, perPage: 40 })
      .then((rooms) => {
        if (!cancelled) setNearestRestroom(findNearestRestroom(business, rooms));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [business]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      // The place may not exist in the database yet. saveBusiness()
      const { name, address, category, lat, lng } = business;
      await saveBusiness({ osmId, name, address, category, lat, lng });

      setBusiness(await addReview(osmId, form));
      setForm(BLANK);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !business) {
    return (
      <section className="page">
        <p className="error">{error}</p>
        <Link to="/search">Back to search</Link>
      </section>
    );
  }

  if (loading) return <section className="page"><p className="muted">Loading...</p></section>;

  if (!business) return null;

  const reviewCount = business.reviews?.length ?? 0;
  const ceiMatch = matchCEI(business.name, cei.entries);

  return (
    <section className="page">
      <h1>{business.name}</h1>
      <p className="address">{business.address}</p>

      {ceiMatch && (
        <div className="panel">
          <h2>Company Rating</h2>
          <CEIScore match={ceiMatch} maxScore={cei.maxScore} detailed />
        </div>
      )}

      <div className="panel bathroom-panel">
        <BathroomAccess
          score={business.averages?.bathroomAccess}
          reviewCount={reviewCount}
          nearestRestroom={nearestRestroom}
        />

        {nearestRestroom && (
          <div className="restroom-detail">
            <h3>{nearestRestroom.name}</h3>
            <p className="address">{nearestRestroom.address}</p>

            <div className="popup-tags">
              <span className="tag">{formatDistance(nearestRestroom.metres)} away</span>
              {nearestRestroom.unisex && <span className="tag">Gender-neutral</span>}
              {nearestRestroom.accessible && <span className="tag">Wheelchair accessible</span>}
              {nearestRestroom.changingTable && <span className="tag">Changing table</span>}
            </div>

            {nearestRestroom.directions && (
              <p className="restroom-directions">{nearestRestroom.directions}</p>
            )}

            <p className="muted restroom-source">
              Logged in the Refuge Restrooms database. Distance is measured from this
              business, so the restroom may be in a different building.
            </p>
          </div>
        )}
      </div>

      <div className="profile-grid">
        <div className="panel">
          <h2>Community Ratings</h2>
          <RatingsChart averages={business.averages} reviewCount={reviewCount} />
        </div>

        <div className="panel">
          <h2>Location</h2>
          <MapView
            center={[business.lat, business.lng]}
            zoom={16}
            markers={[{ id: business.osmId, name: business.name, lat: business.lat, lng: business.lng }]}
          />
        </div>
      </div>

      <div className="panel">
        <h2>Leave a Review</h2>

        <form className="review-form" onSubmit={handleSubmit}>
          <input
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            placeholder="Your name (optional)"
            aria-label="Your name"
          />

          {STATS.map(({ key, label }) => (
            <label key={key} className="slider">
              <span>
                {label}: <strong>{form[key]}</strong>
              </span>
              <input
                type="range"
                min="1"
                max="5"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
              />
            </label>
          ))}

          <textarea
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            placeholder="What was your experience like?"
            rows="3"
            aria-label="Your experience"
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={saving}>
            {saving ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>{reviewCount} Review{reviewCount === 1 ? '' : 's'}</h2>

        {business.reviews?.map((review) => (
          <div key={review._id} className="review">
            <div className="card-head">
              <strong>{review.author || 'Anonymous'}</strong>
              <span className="score">{review.overall} / 5</span>
            </div>
            {review.comment && <p>{review.comment}</p>}
          </div>
        ))}

        {reviewCount === 0 && <p className="empty">No reviews yet.</p>}
      </div>
    </section>
  );
}
