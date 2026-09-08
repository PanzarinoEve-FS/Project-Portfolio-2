import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/search', label: 'Find Places' },
  { to: '/restrooms', label: 'Restrooms' },
  { to: '/directory', label: 'Directory' },
  { to: '/about', label: 'About' },
];

export default function NavBar() {
  return (
    <header className="navbar">
      <NavLink to="/" className="brand">
        Safe Space Finder
      </NavLink>

      <nav>
        {LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
