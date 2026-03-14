import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SESSION_KEY  = 'rg_session';
const REMEMBER_KEY = 'rg_remember';

function readSession() {
  try {
    const remembered = localStorage.getItem(REMEMBER_KEY) === 'true';
    const store = remembered ? localStorage : sessionStorage;
    const raw   = store.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.email && parsed?.name ? parsed : null;
  } catch { return null; }
}

function writeSession(profile, rememberMe) {
  const session = {
    name:        profile.name,
    email:       profile.email,
    picture:     profile.picture    ?? null,
    given_name:  profile.given_name ?? profile.name?.split(' ')[0] ?? '',
    verified:    profile.verified_email ?? true,
    rememberMe,
    loginAt:     new Date().toISOString(),
    githubToken: profile.githubToken ?? null,
    githubUser:  profile.githubUser  ?? null,
  };
  localStorage.setItem(REMEMBER_KEY, String(rememberMe));
  const store = rememberMe ? localStorage : sessionStorage;
  store.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,            setUser]   = useState(null);
  const [isAuthenticated, setIsAuth] = useState(false);
  const [isLoading,       setLoad]   = useState(true);
  const [githubToken,     setGhTok]  = useState(null);
  const [githubUser,      setGhUser] = useState(null);

  useEffect(() => {
    const session = readSession();
    if (session) {
      setUser(session);
      setIsAuth(true);
      if (session.githubToken) setGhTok(session.githubToken);
      if (session.githubUser)  setGhUser(session.githubUser);
    }
    setLoad(false);
  }, []);

  const login = useCallback((profile, rememberMe = false) => {
    const session = writeSession(profile, rememberMe);
    setUser(session);
    setIsAuth(true);
    if (profile.githubToken) setGhTok(profile.githubToken);
    if (profile.githubUser)  setGhUser(profile.githubUser);
  }, []);

  const connectGitHub = useCallback((token, ghUser) => {
    setGhTok(token);
    setGhUser(ghUser);
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, githubToken: token, githubUser: ghUser };
      const remembered = localStorage.getItem(REMEMBER_KEY) === 'true';
      writeSession(updated, remembered);
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setIsAuth(false);
    setGhTok(null);
    setGhUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, githubToken, githubUser, connectGitHub }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
