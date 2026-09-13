import { useState } from 'react';

import { useAuth } from '../../context/AuthContext.jsx';
import { useAccountPanel } from '../Account/AccountPanel.jsx';
import HeartIcon from './HeartIcon.jsx';

// The heart on a card or a profile.
export default function FavoriteButton({
  kind,
  refId,
  name,
  subtitle,
  size = 22,
  className = '',
}) {
  const { user, ready, hasAccount, isFavorite, toggleFavorite } = useAuth();
  const { open } = useAccountPanel();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const saved = isFavorite(kind, refId);

  async function onClick(event) {
    // Cards are wrapped in links; a heart tap does not open the profile.
    event.preventDefault();
    event.stopPropagation();

    // Opens over the results rather than navigating away
    // so the search a visitor just ran is still there after they login
    if (!user) return open(hasAccount ? 'login' : 'register');

    setBusy(true);
    setError('');
    try {
      await toggleFavorite({ kind, refId, name, subtitle });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  const label = saved ? `Remove ${name} from favorites` : `Save ${name} to favorites`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`favorite ${saved ? 'is-saved' : ''} ${className}`.trim()}
      aria-pressed={saved}
      aria-label={label}
      title={error || label}
    >
      <HeartIcon filled={saved} size={size} />
    </button>
  );
}
