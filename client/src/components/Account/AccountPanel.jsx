import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import SignInForm from './SignInForm.jsx';
import RegisterForm from './RegisterForm.jsx';
import ProfileBody from './ProfileBody.jsx';

export const ACCOUNT_PARAM = 'account';

// logging in opens over whatever you were looking at `?account=` query on the CURRENT path.
// The view underneath never unmounts, so a search you just ran is still there when you close it.
export function useAccountPanel() {
  const [params, setParams] = useSearchParams();
  const view = params.get(ACCOUNT_PARAM);

  const open = (next) => {
    const updated = new URLSearchParams(params);
    updated.set(ACCOUNT_PARAM, next);
    setParams(updated, { replace: false });
  };

  const close = () => {
    const updated = new URLSearchParams(params);
    updated.delete(ACCOUNT_PARAM);
    setParams(updated, { replace: true });
  };

  return { view, open, close };
}

export default function AccountPanel() {
  const { view, open } = useAccountPanel();
  const { user, ready } = useAuth();

  if (!view) return null;

  // if Someone signed in who lands on ?account=login gets their profile instead
  //if someone signed out on ?account=profile is asked to sign in.
  const resolved = user ? 'profile' : view === 'profile' ? 'login' : view;

  return (
    <div className="account-panel">
      {!ready && <p className="muted">Loading...</p>}

      {ready && resolved === 'login' && (
        <SignInForm onDone={() => open('profile')} onSwitch={() => open('register')} />
      )}

      {ready && resolved === 'register' && (
        <RegisterForm onDone={() => open('profile')} onSwitch={() => open('login')} />
      )}

      {ready && resolved === 'profile' && user && <ProfileBody />}
    </div>
  );
}
