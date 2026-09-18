import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import FavoriteButton from '../Assets/FavoriteButton.jsx';

const LINK = {
  business: (refId) => `/business/${encodeURIComponent(refId)}`,
  surgeon: (refId) => `/surgeries/${refId}`,
  centre: (refId) => `/surgeries/${refId}`,
};

const GROUPS = [
  { kind: 'business', title: 'Businesses' },
  { kind: 'surgeon', title: 'Surgeons' },
  { kind: 'center', title: 'Surgery Centers' },
];

// The logged in user's own profile: account details, then everything saved.
export default function ProfileBody() {
  const { user, favorites, signOut, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function startEditing() {
    setForm({
      username: user.username,
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    });
    setError('');
    setEditing(true);
  }

  async function onSave(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await updateProfile(form);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const joined = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  });

  return (
    <>
      <div className="panel">
        <div className="card-head">
          <h1>{user.username}</h1>
          <button type="button" onClick={signOut} className="link-button">
            Sign out
          </button>
        </div>

        {editing ? (
          <form className="review-form" onSubmit={onSave}>
            <label className="field">
              <span>Username</span>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_\-]+"
                required
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span>
                  First name <small className="muted">optional</small>
                </span>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  autoComplete="given-name"
                  maxLength={60}
                />
              </label>

              <label className="field">
                <span>
                  Last name <small className="muted">optional</small>
                </span>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  autoComplete="family-name"
                  maxLength={60}
                />
              </label>
            </div>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>

            {error && <p className="error" role="alert">{error}</p>}

            <div className="row-buttons">
              <button type="submit" className="primary" disabled={busy}>
                {busy ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            {user.fullName && <p className="profile-fullname">{user.fullName}</p>}
            <p className="address">{user.email}</p>
            <p className="muted">Member since {joined}</p>
            <button type="button" onClick={startEditing} className="link-button">
              Edit profile
            </button>
          </>
        )}
      </div>

      <div className="panel">
        <h2>
          Favorites{favorites.length > 0 && <span className="score"> {favorites.length}</span>}
        </h2>

        {favorites.length === 0 && (
          <p className="empty">
            Nothing saved yet. Tap the heart on any business, surgeon or surgery centre.
          </p>
        )}

        {GROUPS.map(({ kind, title }) => {
          const saved = favorites.filter((f) => f.kind === kind);
          if (saved.length === 0) return null;

          return (
            <section key={kind} className="favorite-group">
              <h3 className="group-label">{title}</h3>

              {saved.map((favorite) => (
                <article className="card favorite-row" key={`${favorite.kind}:${favorite.refId}`}>
                  <div className="card-head">
                    <h3>
                      <Link to={LINK[favorite.kind](favorite.refId)}>{favorite.name}</Link>
                    </h3>
                    <FavoriteButton
                      kind={favorite.kind}
                      refId={favorite.refId}
                      name={favorite.name}
                      subtitle={favorite.subtitle}
                      size={20}
                    />
                  </div>

                  {favorite.subtitle && <p className="address">{favorite.subtitle}</p>}
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
