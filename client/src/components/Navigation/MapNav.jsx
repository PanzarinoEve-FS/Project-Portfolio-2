import { Link, NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import { ACCOUNT_PARAM } from '../Account/AccountPanel.jsx';
import { accountChip } from '../Account/accountChip.js';

const LINKS = [
  { to: '/', label: 'Search', end: true },
  { to: '/surgeries', label: 'Surgeries' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
];

// Rendered twice: floating over the map beside the sidebar on a wide screen, and in the pane.
// One is for mobile use and the other is for desktop
export default function MapNav({ className = 'map-nav' }) {
  const { user, ready, hasAccount } = useAuth();
  const { pathname, search } = useLocation();

  // Stays on this path and just adds ?account=, so the view underneath keeps
  // its search results rather than being replaced.
  const accountHref = (view) => {
    const params = new URLSearchParams(search);
    params.set(ACCOUNT_PARAM, view);
    return `${pathname}?${params}`;
  };

  // NavLink decides isActive from the pathname alone and ignores the query, so
  // a link to `/?account=login` reads as active whenever you are on `/`. The
  // account chip is active only while the panel is actually open, so it is a
  // plain Link with the class worked out here.
  const account = accountChip({ user, hasAccount, search });
  const accountOpen = account.isOpen;

  return (
    <nav className={className}>
      {LINKS.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            isActive && !accountOpen ? 'chip active' : 'chip'
          }
        >
          {label}
        </NavLink>
      ))}

      {/* Held back until the session is known, so a signed-in visitor never
          sees a Login chip flash before their username appears. Someone who
          has never had an account here is asked to Register instead. */}
      {ready && (
        <Link
          to={accountHref(account.view)}
          className={accountOpen ? 'chip active' : 'chip'}
        >
          {account.label}
        </Link>
      )}
    </nav>
  );
}
