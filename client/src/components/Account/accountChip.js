import { ACCOUNT_PARAM } from './AccountPanel.jsx';


// While a panel is open the chip names the nav button either "Login" or "Register"

//Login to Register inside the panel renames the chip
// With nothing open it offers the way in that fits this browser: 
// Register if nothing in storage on previous logins
// Login if there is storage of previous logins
export function accountChip({ user, hasAccount, search }) {
  const open = new URLSearchParams(search).get(ACCOUNT_PARAM);
  const isOpen = open !== null;

  if (user) {
    return { view: 'profile', label: user.username, isOpen };
  }

  const view = open === 'login' || open === 'register'
    ? open
    : hasAccount
      ? 'login'
      : 'register';

  return { view, label: view === 'login' ? 'Login' : 'Register', isOpen };
}
