import { Navigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import AccountShell from '../components/Account/AccountShell.jsx';
import ProfileBody from '../components/Account/ProfileBody.jsx';

export default function Profile() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <AccountShell subtitle="Profile">
        <p className="muted">Loading...</p>
      </AccountShell>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: '/profile' }} />;

  return (
    <AccountShell subtitle="Profile">
      <ProfileBody />
    </AccountShell>
  );
}
