import { useCallback, useEffect, useState } from 'react';

import { getMyLocation, getRestrooms } from '../api/client.js';
import MapView from '../components/Map/MapView.jsx';

export default function Restrooms() {
  const [restrooms, setRestrooms] = useState([]);
  const [center, setCenter] = useState(null);
  const [filters, setFilters] = useState({ unisex: true, ada: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (lat, lng, activeFilters) => {
    setLoading(true);
    setError('');

    try {
      setRestrooms(await getRestrooms({ lat, lng, ...activeFilters }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getMyLocation()
      .then((location) => {
        setCenter([location.lat, location.lng]);
        load(location.lat, location.lng, filters);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

  }, [load]);

  function toggleFilter(key) {
    const next = { ...filters, [key]: !filters[key] };
    setFilters(next);
    if (center) load(center[0], center[1], next);
  }

  return (
    <section className="page">
      <h1>Safe Restrooms</h1>
      <p className="muted">
        Verified locations from the Refuge Restrooms database.
      </p>

      <div className="filters">
        <label>
          <input type="checkbox" checked={filters.unisex} onChange={() => toggleFilter('unisex')} />
          Gender-neutral only
        </label>
        <label>
          <input type="checkbox" checked={filters.ada} onChange={() => toggleFilter('ada')} />
          Wheelchair accessible only
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading restrooms...</p>}

      {center && (
        <MapView
          center={center}
          zoom={13}
          markers={restrooms.map((room) => ({
            id: room.id,
            name: room.name,
            address: room.address,
            lat: room.lat,
            lng: room.lng,
            tags: [
              room.unisex && 'Gender-neutral',
              room.accessible && 'Accessible',
              room.changingTable && 'Changing table',
            ].filter(Boolean),
          }))}
        />
      )}

      {!loading && restrooms.length === 0 && !error && (
        <p className="empty">No restrooms found nearby with these filters.</p>
      )}
    </section>
  );
}
