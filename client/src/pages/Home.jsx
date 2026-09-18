import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PlaceDetail from "../components/Profile/PlaceDetail.jsx";

import {
  getOsmPlaces,
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
import RangeControl, { stopsFor } from "../components/Apple Design Elements/RangeControl.jsx";
import PrideFlag from "../components/Assets/PrideFlag.jsx";
import MapNav from "../components/Navigation/MapNav.jsx";
import AccountPanel, { useAccountPanel } from "../components/Account/AccountPanel.jsx";

const CATEGORIES = ["gas", "cafe", "restaurant", "bar", "pharmacy", "clinic"];

// "all" searches every category above at once.
const FILTERS = [...CATEGORIES, "all"];

// How far the search may widen itself before giving up.
const MAX_WIDEN_STEPS = 6;

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
  // Set when an empty search was widened on the visitor's behalf.
  const [autoJump, setAutoJump] = useState(null);
  // One probe per category/filter combination, so this can never loop.
  // setLoading(true) inside an effect does not apply until the next render, so
  // the probe could see loading===false and fire before the first search had
  // even returned. This ref flips synchronously.
  const searchRan = useRef(false);
  // Bounds the widening so a category with nothing anywhere cannot walk the
  // whole ladder.
  const widenSteps = useRef(0);

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
    searchRan.current = false;
    setLoading(true);
    setError("");

    const { lat, lng, city } = location;

    const limit = Math.min(40, Math.max(12, Math.round(radiusKm * 4)));

    // "all" wants the nearest businesses whatever their type, which is a tag
    // search rather than a text one, so it goes to OpenStreetMap directly.
    const lookup = debouncedQuery.trim()
      ? searchPlaces(debouncedQuery.trim(), city)
      : category === "all"
        ? getOsmPlaces({ lat, lng, radius: radiusKm, categories: "all", limit })
        : getNearbyPlaces({ lat, lng, category, radius: radiusKm, limit });

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
      .finally(() => {
        if (cancelled) return;
        searchRan.current = true;
        setLoading(false);
      });

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

  // When nothing matches in range, widen one stop at a time until something
  // does, up to a handful of steps.
  //
  // An earlier version probed once at the widest range and jumped to the
  // nearest hit it saw. That was wrong: neither Nominatim nor a capped Overpass
  // query returns nearest-first, so "closest in the sample" was not the closest
  // that exists -- it once skipped a clinic 10 miles away to land on one 300
  // miles out. Stepping is a few more requests but lands on the smallest range
  // that actually works.
  useEffect(() => {
    if (!searchRan.current || loading || error || !location) return;
    if (visible.length > 0 || range !== debouncedRange) return;
    if (widenSteps.current >= MAX_WIDEN_STEPS) return;

    const stops = stopsFor(unit);
    const next = stops.find((stop) => stop > range);
    if (!next) return;

    widenSteps.current += 1;
    setAutoJump((prev) => ({ from: prev?.from ?? range, to: next }));
    setRange(next);
  }, [loading, error, location, visible.length, range, debouncedRange, unit]);

  const center = location ? [location.lat, location.lng] : [28.5978, -81.3024];

  // Opening the account panel must not unmount this view -- the results and
  // every filter stay exactly as they were.
  const { view: accountView } = useAccountPanel();

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

      {(accountView || osmId) && (
        <div className="detail">
          {accountView ? (
            <AccountPanel />
          ) : (
            <PlaceDetail osmId={osmId} backTo="/" backLabel="Back to search" />
          )}
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
              onRangeChange={(next) => {
                setAutoJump(null);
                widenSteps.current = 0;
                setRange(next);
              }}
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
              {FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setAutoJump(null);
                    widenSteps.current = 0;
                    setCategory(option);
                  }}
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

            {autoJump && (
              <p className="muted auto-jump">
                Nothing within {autoJump.from} {unit}, so the range widened to{' '}
                {autoJump.to} {unit}.
              </p>
            )}

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
                  : widenSteps.current >= MAX_WIDEN_STEPS
                    ? `Nothing found, even out to ${range} ${unit}.`
                    : `Nothing within ${range} ${unit}. Widening...`}
              </p>
            )}

          </div>
        </div>
      </aside>
    </div>
  );
}
