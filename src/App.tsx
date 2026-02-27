// MANTENHA TODAS AS TELAS E LOGICAS DE SEGURANÇA. NÃO DELETE COMPONENTES EXISTENTES.
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Pricing } from './components/Pricing';
import { Footer } from './components/Footer';
import { Register } from './components/Register';
import { Login } from './components/Login';
import { PinPad } from './components/PinPad';
import { Dashboard } from './components/Dashboard';
import { AdminConsole } from './components/AdminConsole';
import { Language } from './translations';
import { User } from './types';

export default function App() {
  const { user, token, lang, authError, t, handleLogin, handleRegister, handleLogout, setLang } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'register' | 'login' | 'pinpad' | 'dashboard' | 'adminConsole'>('landing');
  const [userPin, setUserPin] = useState<string>('');
  const [masterKey, setMasterKey] = useState<string>('');
  const [recoveryInitiated, setRecoveryInitiated] = useState(false);

  useEffect(() => {
    if (user && !token) {
      // User is logged in but token is missing, force logout (e.g., token expired or cleared manually)
      handleLogout();
    } else if (user && !currentView && token && user.role === 'master') {
      setCurrentView('adminConsole');
    } else if (user && !currentView && token) {
      // If user is logged in and no specific view, and has a token, go to pinpad
      setCurrentView('pinpad');
    }
  }, [user, token, currentView, handleLogout]);

  // Redirect to dashboard if user is logged in and pin is set
  useEffect(() => {
    if (user && userPin && currentView === 'pinpad') {
      setCurrentView('dashboard');
    }
  }, [user, userPin, currentView]);

  // If user logs out, reset view to landing
  useEffect(() => {
    if (!user && (currentView === 'pinpad' || currentView === 'dashboard')) {
      setCurrentView('landing');
    }
  }, [user, currentView]);

  if (currentView === 'dashboard' || currentView === 'pinpad' || currentView === 'adminConsole') {
    if (!user) {
      setCurrentView('landing');
      return null; // Don't render these views if no user
    }

    if (currentView === 'pinpad') {
      return (
        <PinPad 
          savedMasterKey={masterKey}
          onMasterKeyGenerated={(key) => setMasterKey(key)}
          onRecoveryInitiated={() => setRecoveryInitiated(true)}
          onComplete={(pin) => {
            setUserPin(pin);
            setCurrentView('dashboard');
          }} 
          lang={lang}
        />
      );
    } else if (currentView === 'adminConsole' && user?.role === 'master') {
      return (
        <AdminConsole onLogout={handleLogout} />
      );
    }
    return (
      <Dashboard 
        onLogout={handleLogout}
        user={user}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-gray-900 dark:text-white transition-colors duration-300">
      <Navbar 
        onLogin={() => setCurrentView('login')} 
        lang={lang} 
        setLang={setLang} 
        user={user}
        onAdminConsole={() => setCurrentView('adminConsole')}
        onDashboard={() => setCurrentView('dashboard')}
        onLogout={handleLogout}
      />
      <main>
        {currentView === 'landing' && (
          <>
            <Hero onStart={() => setCurrentView('register')} lang={lang} />
            <Pricing lang={lang} />
          </>
        )}
        {currentView === 'register' && (
          <Register 
            onBack={() => setCurrentView('landing')} 
            onRegisterSubmit={async (email, password) => {
              const success = await handleRegister(email, password);
              if (success) setCurrentView('login');
            }}
            onLogin={() => setCurrentView('login')}
            lang={lang}
            error={authError}
          />
        )}
        {currentView === 'login' && (
          <Login 
            onBack={() => setCurrentView('landing')}
            onLoginSubmit={async (email, password) => {
              const success = await handleLogin(email, password);
              if (success) setCurrentView('pinpad');
            }}
            onRegister={() => setCurrentView('register')}
            lang={lang}
            error={authError}
          />
        )}
      </main>
      <Footer lang={lang} />
    </div>
  );
}
