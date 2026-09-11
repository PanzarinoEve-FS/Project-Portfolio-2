import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Search', end: true },
  { to: '/surgeries', label: 'Surgeries' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
];

// Rendered twice: floating over the map beside the sidebar on a wide screen, and in the pane.
// One is for mobile use and the other is for desktop
export default function MapNav({ className = 'map-nav' }) {
  return (
    <nav className={className}>
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
