import { useState } from 'react';

import { useAuth } from '../../context/AuthContext.jsx';

export default function RegisterForm({ onDone, onSwitch }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await register(form);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel auth-panel">
      <h1>Create an account</h1>
      <p className="muted">Only a username, an email and a password.</p>

      <form className="review-form" onSubmit={onSubmit}>
        <label className="field">
          <span>Username</span>
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            autoComplete="username"
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_\-]+"
            title="Letters, numbers, _ and - only"
            required
          />
        </label>

        {/* Name is optional */}
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
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <small className="muted">At least 8 characters.</small>
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="muted auth-switch">
        Already have an account?{' '}
        <button type="button" className="link-button" onClick={onSwitch}>
          Login
        </button>
      </p>
    </div>
  );
}
