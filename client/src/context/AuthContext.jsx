import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as api from '../api/client.js';

const AuthContext = createContext(null);

// Usernames that have signed in on this browser, most recent first, so the
// sign-in form can offer them back instead of making someone retype.
//
// USERNAMES ONLY. No password, no token, no email -- nothing here would let
// anyone into an account, and a shared computer gives away no more than the
// names of people who have used it. Every read and write is wrapped because a
// private window or blocked site data makes localStorage throw rather than
// return null.
const ACCOUNTS_KEY = 'safety.accounts';
// Kept only so someone who signed in before this list existed is still offered
// Sign in rather than Register.
const SEEN_KEY = 'safety.hasAccount';
const MAX_REMEMBERED = 5;

const readAccounts = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((name) => typeof name === 'string') : [];
  } catch {
    return [];
  }
};

const readSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

const writeAccounts = (names) => {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(names));
    localStorage.setItem(SEEN_KEY, names.length > 0 ? '1' : '0');
  } catch {
    // A visitor who blocks storage just never gets the shortcut. Harmless.
  }
};

// Most recently used first, no duplicates, capped.
const remember = (names, username) =>
  [username, ...names.filter((n) => n.toLowerCase() !== username.toLowerCase())].slice(
    0,
    MAX_REMEMBERED
  );

// One key per saved place, so a heart can ask "am I saved?" in constant time.
const keyOf = (kind, refId) => `${kind}:${refId}`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [knownAccounts, setKnownAccounts] = useState(readAccounts);
  // Someone who used this browser before the list existed still counts.
  const [seenBefore] = useState(readSeen);
  // Distinguishes "still checking the cookie" from "definitely signed out",
  // so the UI does not flash a Sign in button at someone who is signed in.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .getMe()
      .then(({ user: me }) => {
        setUser(me);
        // An existing session proves this browser has used this account.
        setKnownAccounts((names) => {
          const next = remember(names, me.username);
          writeAccounts(next);
          return next;
        });
      })
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const rememberAccount = useCallback((username) => {
    setKnownAccounts((names) => {
      const next = remember(names, username);
      writeAccounts(next);
      return next;
    });
  }, []);

  const forgetAccount = useCallback((username) => {
    setKnownAccounts((names) => {
      const next = names.filter((n) => n !== username);
      writeAccounts(next);
      return next;
    });
  }, []);

  const favoriteKeys = useMemo(
    () => new Set((user?.favorites ?? []).map((f) => keyOf(f.kind, f.refId))),
    [user]
  );

  const isFavorite = useCallback(
    (kind, refId) => favoriteKeys.has(keyOf(kind, refId)),
    [favoriteKeys]
  );

  // Saving and unsaving both replace the whole list from the server response,
  // so the heart can never drift out of step with what is stored.
  const toggleFavorite = useCallback(
    async (favorite) => {
      if (!user) throw new Error('Log in to save places');

      const saved = favoriteKeys.has(keyOf(favorite.kind, favorite.refId));
      const { favorites } = saved
        ? await api.removeFavorite(favorite.kind, favorite.refId)
        : await api.addFavorite(favorite);

      setUser((current) => (current ? { ...current, favorites } : current));
      return !saved;
    },
    [user, favoriteKeys]
  );

  const value = useMemo(
    () => ({
      user,
      ready,
      knownAccounts,
      hasAccount: knownAccounts.length > 0 || seenBefore,
      forgetAccount,
      favorites: user?.favorites ?? [],
      isFavorite,
      toggleFavorite,
      register: async (fields) => {
        const { user: me } = await api.register(fields);
        setUser(me);
        rememberAccount(me.username);
      },
      signIn: async (loginName, password) => {
        const { user: me } = await api.login(loginName, password);
        setUser(me);
        // The canonical username, not whatever was typed -- someone may have
        // signed in with their email address.
        rememberAccount(me.username);
      },
      signOut: async () => {
        await api.logout();
        setUser(null);
      },
      updateProfile: async (changes) => {
        const { user: me } = await api.updateMe(changes);
        setUser(me);
      },
    }),
    [user, ready, knownAccounts, seenBefore, rememberAccount, forgetAccount, isFavorite, toggleFavorite]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
