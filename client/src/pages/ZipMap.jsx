import { useEffect, useMemo, useState } from 'react';

import { getZipScore, getZipScores } from '../api/client.js';
import MapShell from '../components/Map/MapShell.jsx';
import ZipLayer, { BANDS, ZipViewport, bandRange } from '../components/Map/ZipLayer.jsx';
import ZipChart from '../components/Map/ZipChart.jsx';
import ReviewMarker from '../components/Map/ReviewMarker.jsx';
import BusinessPanel from '../components/Map/BusinessPanel.jsx';
import ZipPanel from '../components/Map/ZipPanel.jsx';
import SearchField from '../components/Apple Design Elements/SearchField.jsx';

const CENTER = [28.55, -81.33];
const MIN_ZOOM = 9;
const PAD = 0.25;
const LIST_LIMIT = 150;


const padded = ([w, s, e, n]) => {
  const dx = (e - w) * PAD;
  const dy = (n - s) * PAD;
  return [Math.max(-180, w - dx), Math.max(-90, s - dy), Math.min(180, e + dx), Math.min(90, n + dy)];
};

const covers = (outer, inner) =>
  Boolean(outer) && inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3];

const overlaps = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];


export default function ZipMap() {
  const [view, setView] = useState(null);
  const [data, setData] = useState(null);
  const [loadedBox, setLoadedBox] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [lookedUp, setLookedUp] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [focus, setFocus] = useState(null);
  const [query, setQuery] = useState('');
  const [place, setPlace] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (!view || view.zoom < MIN_ZOOM || covers(loadedBox, view.bbox)) return undefined;

    let cancelled = false;
    const box = padded(view.bbox);

    getZipScores(box)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoadedBox(result.meta?.truncated || result.meta?.tooWide ? null : box);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [view, loadedBox]);

  const zips = useMemo(() => (data?.features ?? []).map((feature) => feature.properties), [data]);
  const inView = useMemo(
    () => (view ? zips.filter((zip) => zip.bbox && overlaps(zip.bbox, view.bbox)) : zips),
    [zips, view]
  );
  const current = zips.find((zip) => zip.zip === selected) ?? (lookedUp?.zip === selected ? lookedUp : null);
  const meta = data?.meta;
  const method = meta?.method;

  const counts = useMemo(() => {
    const tally = { good: 0, mixed: 0, poor: 0, insufficient: 0 };
    for (const zip of inView) tally[zip.band] += 1;
    return tally;
  }, [inView]);

  const listed = useMemo(() => {
    const typed = query.trim();
    return inView
      .filter((zip) => !typed || zip.zip.startsWith(typed))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.zip.localeCompare(b.zip));
  }, [inView, query]);

  const pick = (zip) => {
    setSelected(zip.zip);
    setFocus({ zip: zip.zip, bbox: zip.bbox, at: Date.now() });
  };

  const openBusiness = (business) => {
    setPlace({
      business: business.name,
      osmId: business.osmId,
      lat: business.lat,
      lng: business.lng,
      zip: current?.zip,
      businesses: current?.businesses ?? [],
      method,
      reviews: (current?.reviews ?? []).filter((item) => item.business === business.name),
    });
    setPanelOpen(true);
  };

  const openPlace = (review) => {
    if (review.lat == null || review.lng == null) return;
    setPlace({
      business: review.business,
      address: review.address,
      osmId: review.osmId,
      stance: review.stance,
      lat: review.lat,
      lng: review.lng,
      zip: current?.zip,
      businesses: current?.businesses ?? [],
      method,
      reviews: (current?.reviews ?? []).filter((item) => item.business === review.business),
    });
    setPanelOpen(true);
  };

  const lookup = (value) => {
    const typed = value.trim();
    if (!/^\d{5}$/.test(typed)) return;

    setLookupError('');
    getZipScore(typed)
      .then((feature) => {
        setLookedUp(feature.properties);
        pick(feature.properties);
      })
      .catch((err) => setLookupError(err.message));
  };

  const search = (value) => {
    setQuery(value);
    setLookupError('');
    if (/^\d{5}$/.test(value.trim())) lookup(value);
  };

  return (
    <MapShell
      title="LGBTQIA+ Safety Index"
      subtitle="LGBTQIA+ Safety Heatmap"
      center={CENTER}
      zoom={10}
      search={<SearchField value={query} onChange={search} onSubmit={lookup} placeholder="Find a ZIP code" />}
      detail={
        panelOpen && place ? (
          <BusinessPanel place={place} onClose={() => setPanelOpen(false)} />
        ) : (
          current && (
            <ZipPanel
              zip={current}
              method={method}
              onOpenBusiness={openBusiness}
              onOpenReview={openPlace}
              onClose={() => setSelected(null)}
            />
          )
        )
      }
      mapChildren={
        <>
          <ZipViewport onChange={setView} focus={focus} />
          {data && <ZipLayer data={data} selected={selected} onSelect={setSelected} />}
          <ReviewMarker place={place} onOpen={() => setPanelOpen(true)} />
        </>
      }
    >
      {error && <p className="error">{error}</p>}
      {lookupError && <p className="error">{lookupError}</p>}
      {!data && !error && <p className="muted">Loading ZIP codes...</p>}

      {view && view.zoom < MIN_ZOOM && <p className="zip-notice">Zoom in to load the ZIP codes in this area.</p>}

      {meta?.shapes === 0 && (
        <p className="zip-notice">
          ZIP code shapes have not been loaded yet. Run <code>npm run seed:zctas</code> in the server folder.
        </p>
      )}

      {meta?.shapes > 0 && !meta.scored && (
        <p className="zip-notice">
          Scores have not been calculated yet, so every ZIP is grey. Run <code>npm run score:zips</code> in the
          server folder.
        </p>
      )}

      {meta?.truncated && view?.zoom >= MIN_ZOOM && (
        <p className="zip-notice">
          Showing the first {meta.maxZips} ZIP codes around here. Zoom in to see the rest.
        </p>
      )}

      <div className="group">
        <div className="group-label">Business Safety Score · in view</div>
        <div className="zip-legend">
          {Object.entries(BANDS).map(([band, style]) => (
            <div key={band} className="zip-legend-row">
              <span
                className={band === 'insufficient' ? 'zip-swatch is-grey' : 'zip-swatch'}
                style={{ background: style.color }}
              />
              <span>{style.label}</span>
              <span className="muted">
                {bandRange(band, method)} · {counts[band]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {inView.some((zip) => zip.score != null) && (
        <div className="group">
          <div className="group-label">Score by ZIP · in view</div>
          <ZipChart zips={inView} selected={selected} onPick={pick} method={method} />
        </div>
      )}

      <p className="muted zip-method">
        Each business scores 0 to 100 from whatever it has: community reviews count most, then LGBTQIA+ reviews of
        that location found on the web and a documented gender-neutral restroom within{' '}
        {method?.restroomRadiusM ?? 150} m, then reviews of the whole chain and the parent company's HRC Corporate
        Equality Index score. Chain-wide evidence can shade a business's number but never colors a ZIP by itself. Google Maps
        reviews are read automatically, and only those that mention LGBTQIA+ people and say something clearly
        welcoming or hostile count. A place whose own reviews are mostly unfriendly counts {method?.badReviewMultiplier ?? 3} times over,
        in its score and again in its ZIP's average. A ZIP needs at least {method?.minScored ?? 3} places with local evidence; then{' '}
        {method?.bands?.good ?? 95} or more is green and under {method?.bands?.mixed ?? 85} is red. Businesses have
        only been surveyed across Central Florida so far, so ZIP codes elsewhere stay grey. Grey means not enough has
        been documented, not that a place is unsafe.
      </p>

      <div className="group-label">ZIP codes in view</div>
      <div className="zip-list">
        {listed.slice(0, LIST_LIMIT).map((zip) => (
          <button
            key={zip.zip}
            type="button"
            className={zip.zip === selected ? 'zip-row active' : 'zip-row'}
            onClick={() => pick(zip)}
          >
            <span
              className={zip.band === 'insufficient' ? 'zip-swatch is-grey' : 'zip-swatch'}
              style={{ background: BANDS[zip.band].color }}
            />
            <strong>{zip.zip}</strong>
            <span className="muted">
              {zip.band === 'insufficient' ? 'Not enough local evidence' : `${zip.score} · ${zip.scored} places`}
            </span>
          </button>
        ))}
        {listed.length > LIST_LIMIT && (
          <p className="muted">
            {listed.length - LIST_LIMIT} more in view. Zoom in or type a ZIP code to narrow the list.
          </p>
        )}
        {data && listed.length === 0 && (
          <p className="empty">
            {query.trim() ? `No ZIP code in view starts with ${query.trim()}.` : 'No ZIP codes in view.'}
          </p>
        )}
      </div>
    </MapShell>
  );
}
