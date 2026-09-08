import { useEffect, useState } from 'react';

import { getMyLocation, searchPlaces } from '../api/client.js';
import MapView from '../components/MapView.jsx';
import SearchBar from '../components/SearchBar.jsx';
import BusinessCard from '../components/BusinessCard.jsx';

export default function Search() {
  const [results, setResults] = useState([]);
  const [center, setCenter] = useState([41.8781, -87.6298]);
  const [defaultCity, setDefaultCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill the city box with wherever the visitor appears to be.
  useEffect(() => {
    getMyLocation()
      .then((location) => {
        setDefaultCity(location.city || '');
        setCenter([location.lat, location.lng]);
      })
      .catch(() => {});
  }, []);

  async function handleSearch(query, city) {
    setLoading(true);
    setError('');

    try {
      const { results: places } = await searchPlaces(query, city);
      setResults(places);

      if (places.length > 0) {
        setCenter([places[0].lat, places[0].lng]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page">
      <h1>Find Places</h1>
      <p className="muted">Search powered by OpenStreetMap / Nominatim.</p>

      <SearchBar onSearch={handleSearch} loading={loading} defaultCity={defaultCity} />

      {error && <p className="error">{error}</p>}

      <MapView
        center={center}
        zoom={14}
        markers={results.map((place) => ({
          id: place.osmId,
          osmId: place.osmId,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          tags: place.category ? [place.category] : [],
        }))}
      />

      <div className="grid">
        {results.map((place) => (
          <BusinessCard key={place.osmId} business={place} />
        ))}
      </div>

      {!loading && results.length === 0 && !error && (
        <p className="empty">Search for a business to see it on the map.</p>
      )}
    </section>
  );
}
