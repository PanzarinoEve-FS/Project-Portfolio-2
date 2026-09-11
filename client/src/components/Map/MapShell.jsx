import MapView from './MapView.jsx';
import PrideFlag from '../Assets/PrideFlag.jsx';
import MapNav from '../Navigation/MapNav.jsx';

export default function MapShell({
  title,
  subtitle,
  center,
  zoom = 12,
  markers = [],
  cluster = false,
  search = null,
  detail = null,
  children,
}) {
  return (
    <div className="app">
      <div className="map-layer">
        <MapView center={center} zoom={zoom} markers={markers} cluster={cluster} />
      </div>

      <MapNav />

      <aside className="sidebar">

        <div className="sidebar-glass" aria-hidden="true" />

        <div className="sidebar-body">
          <PrideFlag />

          <MapNav className="sidebar-nav" />

          <div className="sidebar-title">
            {title}
            <small>{subtitle}</small>
          </div>

          {search && <div className="search-dock">{search}</div>}

          <div className="sidebar-scroll">{children}</div>
        </div>
      </aside>

      {detail && <div className="detail">{detail}</div>}
    </div>
  );
}
