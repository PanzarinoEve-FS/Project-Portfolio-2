import { useNavigate, useLocation } from 'react-router-dom';

import AccountShell from '../components/Account/AccountShell.jsx';
import SignInForm from '../components/Account/SignInForm.jsx';

// /login 
export default function Login() {
  const navigate = useNavigate();
  const { state } = useLocation();

  return (
    <AccountShell subtitle="Login">
      <SignInForm
        onDone={() => navigate(state?.from ?? '/?account=profile')}
        onSwitch={() => navigate('/register')}
      />
    </AccountShell>
  );
}
