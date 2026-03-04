import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { Language, translations } from '../translations';
import { getPersistedLanguage, persistLanguage, resolveInitialLanguage, HTML_LANG_MAP } from '../utils/detectLanguage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  lang: Language;
  authError: string;
  t: typeof translations['pt'];
  handleLogin: (email: string, password: string) => Promise<boolean>;
  handleRegister: (email: string, password: string) => Promise<boolean>;
  handleLogout: () => void;
  setLang: (lang: Language) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getLocalStorageKey = (key: string, userId?: string | null) => {
  return userId ? `safe360_${userId}_${key}` : `safe360_${key}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLangState] = useState<Language>(() => {
    // Try new key first, then legacy key
    return getPersistedLanguage()
      || (() => {
        const legacy = localStorage.getItem('safe360_lang') as Language | null;
        const valid: Language[] = ['pt','ptPT','en','enGB','es','it','zh','fr','de','uk'];
        return legacy && valid.includes(legacy) ? legacy : null;
      })()
      || 'en';
  });
  const [authError, setAuthError] = useState<string>('');

  const t = translations[lang];

  // Auto-detect language by IP on first visit (when nothing is persisted)
  useEffect(() => {
    if (!getPersistedLanguage()) {
      resolveInitialLanguage().then(detected => {
        setLangState(detected);
        persistLanguage(detected);
        document.documentElement.lang = HTML_LANG_MAP[detected];
      });
    } else {
      document.documentElement.lang = HTML_LANG_MAP[lang];
    }
  }, []);

  useEffect(() => {
    // Load initial state from localStorage based on a potential last active user
    const lastUserId = localStorage.getItem('safe360_lastUserId');
    if (lastUserId) {
      const storedToken = localStorage.getItem(getLocalStorageKey('token', lastUserId));
      const storedUser = localStorage.getItem(getLocalStorageKey('user', lastUserId));
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setAuthError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to login');
      }
      
      const loggedInUser: User = data.user;
      const userToken: string = data.token;

      // Store token and user data with user-specific prefix
      localStorage.setItem(getLocalStorageKey('token', loggedInUser.id), userToken);
      localStorage.setItem(getLocalStorageKey('user', loggedInUser.id), JSON.stringify(loggedInUser));
      localStorage.setItem('safe360_lastUserId', loggedInUser.id); // Track last active user

      setToken(userToken);
      setUser(loggedInUser);
      return true; // Indicate success
    } catch (error) {
      setAuthError((error as Error).message);
      // Error stored in authError state
      return false; // Indicate failure
    }
  };

  const handleRegister = async (email: string, password: string) => {
    setAuthError('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to register');
      }
      // Toast will be shown by the component that called handleRegister
      return true; // Indicate success
    } catch (error) {
      setAuthError((error as Error).message);
      // Error stored in authError state
      return false; // Indicate failure
    }
  };

  const handleLogout = () => {
    if (user?.id) {
      localStorage.removeItem(getLocalStorageKey('token', user.id));
      localStorage.removeItem(getLocalStorageKey('user', user.id));
    }
    localStorage.removeItem('safe360_lastUserId');
    setToken(null);
    setUser(null);
    setAuthError('');
  };

  const setLang = (l: Language) => {
    persistLanguage(l);
    document.documentElement.lang = HTML_LANG_MAP[l];
    setLangState(l);
  };

  // ─── Idle auto-lock ───────────────────────────────────────────────────────
  // Reads `autoLockTime` (seconds) set by SettingsModal. 0 = disabled.
  // Re-schedules on every user interaction; calls handleLogout on timeout.
  useEffect(() => {
    if (!user?.id) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      // Default 300 matches SettingsModal's default so timer is armed even before user opens Settings
      const secs = parseInt(localStorage.getItem('autoLockTime') || '300', 10);
      if (!secs) return;
      timer = setTimeout(handleLogout, secs * 1000);
    };

    // React to cross-tab autoLockTime changes (same-tab changes are picked up on next interaction)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'autoLockTime') schedule();
    };

    const events = ['mousemove', 'keydown', 'click', 'touchstart'] as const;
    events.forEach(ev => window.addEventListener(ev, schedule, { passive: true }));
    window.addEventListener('storage', onStorage);
    schedule(); // arm immediately on login

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, schedule));
      window.removeEventListener('storage', onStorage);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const contextValue: AuthContextType = {
    user,
    token,
    lang,
    authError,
    t,
    handleLogin,
    handleRegister,
    handleLogout,
    setLang,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
