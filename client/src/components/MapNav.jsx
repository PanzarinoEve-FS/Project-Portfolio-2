import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Search', end: true },
  { to: '/surgeries', label: 'Surgeries' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
];

// Floats over the map beside the sidebar rather than living inside it, so the
// panel stays given over to search and results.
export default function MapNav() {
  return (
    <nav className="map-nav">
      {LINKS.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => (isActive ? 'chip active' : 'chip')}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
