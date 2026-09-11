import { useEffect, useState } from 'react';

import { getBusinesses } from '../api/client.js';
import BusinessCard from '../components/Profile/BusinessCard.jsx';

export default function Directory() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getBusinesses()
      .then(setBusinesses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const reviewed = businesses.filter((business) => business.reviews?.length > 0);

  return (
    <section className="page">
      <h1>Community Directory</h1>
      <p className="muted">Every place that has been rated by the community.</p>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading...</p>}

      <div className="grid">
        {reviewed.map((business) => (
          <BusinessCard key={business.osmId} business={business} />
        ))}
      </div>

      {!loading && reviewed.length === 0 && !error && (
        <p className="empty">No reviews yet. Find a place and leave the first one.</p>
      )}
    </section>
  );
}
