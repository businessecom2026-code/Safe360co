// MANTENHA TODAS AS TELAS E LOGICAS DE SEGURANÇA. NÃO DELETE COMPONENTES EXISTENTES.
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Pricing } from './components/Pricing';
import { Footer } from './components/Footer';
import { Register } from './components/Register';
import { Login } from './components/Login';
import { PinPad } from './components/PinPad';
import { Dashboard } from './components/Dashboard';
import { AdminConsole } from './components/AdminConsole';
import { InviteLandingPage } from './components/InviteLandingPage';
import { ForgotPassword } from './components/ForgotPassword';
import { Language } from './translations';
import { User } from './types';

export default function App() {
  const { user, token, lang, authError, t, handleLogin, handleRegister, handleLogout, setLang } = useAuth();
  const { showToast } = useToast();
  const [currentView, setCurrentView] = useState<'landing' | 'register' | 'login' | 'forgotPassword' | 'pinpad' | 'dashboard' | 'adminConsole' | 'inviteAccept'>('landing');
  const [userPin, setUserPin] = useState<string>('');
  const [masterKey, setMasterKey] = useState<string>('');
  const [recoveryInitiated, setRecoveryInitiated] = useState(false);

  // Invite acceptance state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<{ guestEmail: string; adminName: string } | null>(null);

  // Password reset state
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<string | null>(null);

  // Detect invite token or reset token from URL hash
  useEffect(() => {
    const hash = window.location.hash;

    // Check for invite token
    const inviteMatch = hash.match(/#invite=([a-f0-9]+)/);
    if (inviteMatch) {
      const tkn = inviteMatch[1];
      setInviteToken(tkn);
      fetch(`/api/auth/invite/${tkn}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Invalid invite');
        })
        .then(data => {
          setInviteData(data);
          setCurrentView('inviteAccept');
        })
        .catch(() => {
          setInviteToken(null);
          window.location.hash = '';
        });
      return;
    }

    // Check for password reset token
    const resetMatch = hash.match(/#reset=([a-f0-9]+)/);
    if (resetMatch) {
      const tkn = resetMatch[1];
      fetch(`/api/auth/recover/${tkn}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Invalid/expired reset token');
        })
        .then(data => {
          setResetToken(tkn);
          setResetEmail(data.email);
          setCurrentView('forgotPassword');
        })
        .catch(() => {
          showToast('Link de recuperacao invalido ou expirado.', 'error');
          window.location.hash = '';
          setCurrentView('login');
        });
    }
  }, []);

  useEffect(() => {
    if (user && !token) {
      handleLogout();
    } else if (user && !currentView && token && user.role === 'master') {
      setCurrentView('adminConsole');
    } else if (user && !currentView && token) {
      setCurrentView('pinpad');
    }
  }, [user, token, currentView, handleLogout]);

  useEffect(() => {
    if (user && userPin && currentView === 'pinpad') {
      setCurrentView('dashboard');
    }
  }, [user, userPin, currentView]);

  useEffect(() => {
    if (!user && (currentView === 'pinpad' || currentView === 'dashboard')) {
      setCurrentView('landing');
    }
  }, [user, currentView]);

  // Invite acceptance view
  if (currentView === 'inviteAccept' && inviteToken && inviteData) {
    return (
      <InviteLandingPage
        adminName={inviteData.adminName}
        sharedVaults={['Cofres Compartilhados']}
        onActivate={async (pin: string) => {
          try {
            const response = await fetch(`/api/auth/invite/${inviteToken}/activate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pin }),
            });
            if (response.ok) {
              const data = await response.json();
              localStorage.setItem(`safe360_${data.user.id}_token`, data.token);
              localStorage.setItem(`safe360_${data.user.id}_user`, JSON.stringify(data.user));
              localStorage.setItem('safe360_lastUserId', data.user.id);
              window.location.hash = '';
              window.location.reload();
            } else {
              showToast('Erro ao ativar conta. Tente novamente.', 'error');
            }
          } catch {
            showToast('Erro de conexao.', 'error');
          }
        }}
      />
    );
  }

  if (currentView === 'dashboard' || currentView === 'pinpad' || currentView === 'adminConsole') {
    if (!user) {
      setCurrentView('landing');
      return null;
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
        <AdminConsole onLogout={handleLogout} onBack={() => setCurrentView('dashboard')} />
      );
    }
    return (
      <Dashboard
        onLogout={handleLogout}
        onAdminConsole={user?.role === 'master' ? () => setCurrentView('adminConsole') : undefined}
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
            <Pricing lang={lang} onRegister={() => setCurrentView('register')} />
          </>
        )}
        {currentView === 'register' && (
          <Register
            onBack={() => setCurrentView('landing')}
            onRegisterSubmit={async (email, password) => {
              const success = await handleRegister(email, password);
              if (success) {
                showToast('Conta criada com sucesso! Faca login.', 'success');
                setCurrentView('login');
              }
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
            onForgotPassword={() => setCurrentView('forgotPassword')}
            lang={lang}
            error={authError}
          />
        )}
        {currentView === 'forgotPassword' && (
          <ForgotPassword
            onBack={() => {
              setResetToken(null);
              setResetEmail(null);
              window.location.hash = '';
              setCurrentView('login');
            }}
            onSuccess={() => {
              setResetToken(null);
              setResetEmail(null);
              window.location.hash = '';
              showToast('Senha redefinida! Faca login com a nova senha.', 'success');
              setCurrentView('login');
            }}
            lang={lang}
            resetToken={resetToken}
            resetEmail={resetEmail}
          />
        )}
      </main>
      <Footer lang={lang} />
    </div>
  );
}
