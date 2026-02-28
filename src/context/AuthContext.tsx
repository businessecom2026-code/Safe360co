import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { Language, translations } from '../translations';

interface AuthContextType {
  user: User | null;
  token: string | null;
  lang: Language;
  authError: string;
  t: typeof translations['pt'];
  handleLogin: (email: string, password: string) => Promise<void>;
  handleRegister: (email: string, password: string) => Promise<void>;
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
  const [lang, setLang] = useState<Language>('pt');
  const [authError, setAuthError] = useState<string>('');

  const t = translations[lang];

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
