import { useState } from 'react';

export default function SearchBar({ onSearch, loading, defaultCity = '' }) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState(defaultCity);

  function handleSubmit(event) {
    event.preventDefault();
    if (query.trim()) onSearch(query.trim(), city.trim());
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Coffee shop, bar, clinic..."
        aria-label="What are you looking for?"
      />
      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="City"
        aria-label="City"
      />
      <button type="submit" disabled={loading || !query.trim()}>
        {loading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
}
