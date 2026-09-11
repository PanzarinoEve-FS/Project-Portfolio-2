import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PlaceDetail from "../components/Profile/PlaceDetail.jsx";

import {
  getMyLocation,
  getNearbyPlaces,
  searchPlaces,
  getRestrooms,
  getCEI,
} from "../api/client.js";
import {
  findNearestRestroom,
  distanceInMetres,
  toKm,
  fromKm,
} from "../utils/distance.js";
import { matchCEI } from "../utils/cei.js";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import MapView from "../components/Map/MapView.jsx";
import BusinessCard from "../components/Profile/BusinessCard.jsx";
import Switch from "../components/Apple Design Elements/Switch.jsx";
import SearchField from "../components/Apple Design Elements/SearchField.jsx";
import RangeControl from "../components/Apple Design Elements/RangeControl.jsx";
import PrideFlag from "../components/Assets/PrideFlag.jsx";
import MapNav from "../components/Navigation/MapNav.jsx";

const CATEGORIES = ["gas", "cafe", "restaurant", "bar", "pharmacy", "clinic"];

export default function Home() {

  const { osmId } = useParams();
  const [location, setLocation] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("gas");
  const [unit, setUnit] = useState("mi");
  const [range, setRange] = useState(5);
  const [filters, setFilters] = useState({ unisex: true, ada: false });
  const [places, setPlaces] = useState([]);
  const [restrooms, setRestrooms] = useState([]);
  const [cei, setCei] = useState({ entries: [], maxScore: 100 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [cappedKm, setCappedKm] = useState(null);

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
        setCappedKm(found.cappedAtKm ?? null);
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

  const restroomReachKm =
    location && restrooms.length
      ? Math.max(...restrooms.map((r) => distanceInMetres(location, r))) / 1000
      : 0;
  const coverageLabel = restroomReachKm
    ? `${Math.round(fromKm(restroomReachKm, unit))} ${unit}`
    : null;

  const enriched = places.map((place) => {
    const nearestRestroom = findNearestRestroom(place, restrooms);
    return {
      place,
      nearestRestroom,

      beyondCoverage:
        !nearestRestroom &&
        Boolean(location) &&
        restroomReachKm > 0 &&
        distanceInMetres(location, place) / 1000 > restroomReachKm,
      cei: matchCEI(place.name, cei.entries),
    };
  });

  const filtersActive = filters.unisex || filters.ada;
  const visible = filtersActive
    ? enriched.filter((e) => e.nearestRestroom || e.beyondCoverage)
    : enriched;

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

      {osmId && (
        <div className="detail">
          <PlaceDetail osmId={osmId} backTo="/" backLabel="Back to search" />
        </div>
      )}

      <aside className="sidebar">

        <div className="sidebar-glass" aria-hidden="true" />

        <div className="sidebar-body">
          <PrideFlag />

          <MapNav className="sidebar-nav" />

          <div className="sidebar-title">
            LGBTQIA+ Safety Index
            <small>Business Search</small>
          </div>

          <div className="search-dock">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search businesses"
            />
          </div>

          <div className="sidebar-scroll">
            <RangeControl
              range={range}
              unit={unit}
              onRangeChange={setRange}
              onUnitChange={setUnit}
            />

            {cappedKm && (
              <p className="muted">
                OpenStreetMap will only answer a category search out to about{" "}
                {Math.round(fromKm(cappedKm, unit))} {unit}, so that is how far
                this searched.
              </p>
            )}

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

            {visible.map(({ place, nearestRestroom, beyondCoverage, cei: ceiMatch }) => (
              <BusinessCard
                key={place.osmId}
                business={place}
                nearestRestroom={nearestRestroom}
                unit={unit}
                cei={ceiMatch}
                beyondCoverage={beyondCoverage}
                coverageLabel={coverageLabel}
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
