import { useRef, useState } from 'react';

import { useAuth } from '../../context/AuthContext.jsx';

// The login form 
// Rendered both by the /login page
// and account panel that opens over a search view, so it never assumes a route.
export default function SignInForm({ onDone, onSwitch }) {
  const { signIn, knownAccounts, forgetAccount } = useAuth();
  const passwordRef = useRef(null);
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await signIn(form.login, form.password);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel auth-panel">
      <h1>Login</h1>
      <p className="muted">Save the places you want to find again.</p>

      {knownAccounts.length > 0 && (
        <div className="known-accounts">
          <div className="group-label">Logged in before</div>

          {knownAccounts.map((name) => (
            <div key={name} className="known-account">
              {/* Fills the name in and jumps to the password */}
              <button
                type="button"
                className="known-account-pick"
                onClick={() => {
                  setForm({ login: name, password: '' });
                  passwordRef.current?.focus();
                }}
              >
                {name}
              </button>

              <button
                type="button"
                className="known-account-forget"
                onClick={() => forgetAccount(name)}
                aria-label={`Forget ${name} on this device`}
                title={`Forget ${name} on this device`}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <form className="review-form" onSubmit={onSubmit}>
        <label className="field">
          <span>Username or email</span>
          <input
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
            autoComplete="username"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            ref={passwordRef}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="muted auth-switch">
        No account yet?{' '}
        <button type="button" className="link-button" onClick={onSwitch}>
          Register
        </button>
      </p>
    </div>
  );
}
