import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getMyLocation,
  getNearbyPlaces,
  searchPlaces,
  getRestrooms,
  getCEI,
} from "../api/client.js";
import { findNearestRestroom, toKm, fromKm } from "../utils/distance.js";
import { matchCEI } from "../utils/cei.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import MapView from "../components/MapView.jsx";
import BusinessCard from "../components/BusinessCard.jsx";
import Switch from "../components/Switch.jsx";
import SearchField from "../components/SearchField.jsx";
import PrideFlag from "../components/PrideFlag.jsx";
import MapNav from "../components/MapNav.jsx";

const CATEGORIES = ["gas", "cafe", "restaurant", "bar", "pharmacy", "clinic"];

const RANGE_BOUNDS = {
  km: { min: 1, max: 25, step: 1 },
  mi: { min: 1, max: 15, step: 1 },
};

export default function Home() {
  const [location, setLocation] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("cafe");
  const [unit, setUnit] = useState("mi");
  const [range, setRange] = useState(6);
  const [filters, setFilters] = useState({ unisex: false, ada: false });
  const [places, setPlaces] = useState([]);
  const [restrooms, setRestrooms] = useState([]);
  const [cei, setCei] = useState({ entries: [], maxScore: 100 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Both the slider and the search box would otherwise fire a request per
  // keystroke or per pixel, against Nominatim's one-per-second limit.
  const debouncedRange = useDebouncedValue(range, 500);
  const debouncedQuery = useDebouncedValue(query, 500);
  const radiusKm = toKm(debouncedRange, unit);

  useEffect(() => {
    getMyLocation()
      .then(setLocation)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    getCEI()
      .then(setCei)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!location) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    const { lat, lng, city } = location;

    // A typed query searches by name; an empty box browses the category.
    const lookup = debouncedQuery.trim()
      ? searchPlaces(debouncedQuery.trim(), city)
      : getNearbyPlaces({
          lat,
          lng,
          category,
          radius: radiusKm,
          limit: Math.min(40, Math.max(12, Math.round(radiusKm * 4))),
        });

    Promise.all([
      lookup,
      getRestrooms({
        lat,
        lng,
        unisex: filters.unisex,
        ada: filters.ada,
        perPage: Math.min(100, Math.round(radiusKm * 12)),
      }).catch(() => []),
    ])
      .then(([found, rooms]) => {
        if (cancelled) return;
        setPlaces(found.results);
        setRestrooms(rooms);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [
    location,
    category,
    radiusKm,
    debouncedQuery,
    filters.unisex,
    filters.ada,
  ]);

  // Switching units keeps the real distance rather than the number, so 5km
  // becomes ~3mi instead of jumping to 5mi.
  function handleUnitChange(nextUnit) {
    const bounds = RANGE_BOUNDS[nextUnit];
    const snapped =
      Math.round(fromKm(toKm(range, unit), nextUnit) / bounds.step) *
      bounds.step;

    setUnit(nextUnit);
    setRange(Math.min(bounds.max, Math.max(bounds.min, snapped)));
  }

  const enriched = places.map((place) => ({
    place,
    nearestRestroom: findNearestRestroom(place, restrooms),
    cei: matchCEI(place.name, cei.entries),
  }));

  // The restroom list is already filtered server-side, so any match here
  // satisfies the active filters. Drop places with no match when filtering.
  const filtersActive = filters.unisex || filters.ada;
  const visible = filtersActive
    ? enriched.filter((e) => e.nearestRestroom)
    : enriched;

  const bounds = RANGE_BOUNDS[unit];
  const center = location ? [location.lat, location.lng] : [28.5978, -81.3024];

  return (
    <div className="app">
      <div className="map-layer">
        <MapView
          center={center}
          zoom={13}
          markers={visible.map(({ place, nearestRestroom }) => ({
            id: place.osmId,
            osmId: place.osmId,
            name: place.name,
            address: place.address,
            lat: place.lat,
            lng: place.lng,
            tags: [place.category, nearestRestroom && "restroom nearby"].filter(
              Boolean,
            ),
          }))}
        />
      </div>

      <MapNav />

      <aside className="sidebar">
        {/* The blur lives on its own layer. Safari paints a backdrop-filter as
            a square that ignores border-radius, which spilled dark glass past
            the flag's rounded corner; clip-path does apply to a filtered
            layer, so the corner is cut here instead. */}
        <div className="sidebar-glass" aria-hidden="true" />
        {/* Safari will not clip children to a rounded corner on an element
            that also carries a backdrop-filter. This inner wrapper does the
            clipping and the scrolling; the glass stays on the parent. */}
        <div className="sidebar-body">
          <PrideFlag />

          <MapNav className="sidebar-nav" />

          <div className="sidebar-title">
            LGBTQIA+ Safety Index
            <small>Business Search</small>
          </div>

          {/* Sticky on phones: the flag and title scroll away beneath this, and
            the field pins once it reaches the top of the panel. */}
          <div className="search-dock">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search businesses"
            />
          </div>

          <div className="sidebar-scroll">
            <div className="group">
              <div className="group-label">Range</div>
              <div className="range-row">
                <input
                  type="range"
                  min={bounds.min}
                  max={bounds.max}
                  step={bounds.step}
                  value={range}
                  onChange={(e) => setRange(Number(e.target.value))}
                  aria-label="Search range"
                />
                <span className="score">{range}</span>
                <div className="segmented">
                  {["km", "mi"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={option === unit ? "active" : ""}
                      onClick={() => handleUnitChange(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="group">
              <Switch
                id="unisex"
                label="Gender Neutral"
                checked={filters.unisex}
                onChange={(v) => setFilters((f) => ({ ...f, unisex: v }))}
              />
              <Switch
                id="ada"
                label="Wheelchair Accessible"
                checked={filters.ada}
                onChange={(v) => setFilters((f) => ({ ...f, ada: v }))}
              />
            </div>

            <div className="chips" style={{ marginBottom: 14 }}>
              {CATEGORIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategory(option)}
                  className={
                    option === category && !query.trim()
                      ? "chip active"
                      : "chip"
                  }
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="group-label">
              Search Results{location ? ` - ${location.city}` : ""}
            </div>

            {error && <p className="error">{error}</p>}
            {loading && <p className="muted">Loading...</p>}

            {visible.map(({ place, nearestRestroom, cei: ceiMatch }) => (
              <BusinessCard
                key={place.osmId}
                business={place}
                nearestRestroom={nearestRestroom}
                unit={unit}
                cei={ceiMatch}
              />
            ))}

            {!loading && visible.length === 0 && !error && (
              <p className="empty">
                {filtersActive && places.length > 0
                  ? `None of the ${places.length} results have a documented matching restroom.`
                  : "No results. Try a wider range or another category."}
              </p>
            )}

          </div>
        </div>
      </aside>
    </div>
  );
}
