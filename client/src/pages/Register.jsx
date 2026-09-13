import { useNavigate } from 'react-router-dom';

import AccountShell from '../components/Account/AccountShell.jsx';
import RegisterForm from '../components/Account/RegisterForm.jsx';

export default function Register() {
  const navigate = useNavigate();

  return (
    <AccountShell subtitle="Register">
      <RegisterForm
        onDone={() => navigate('/?account=profile')}
        onSwitch={() => navigate('/login')}
      />
    </AccountShell>
  );
}
