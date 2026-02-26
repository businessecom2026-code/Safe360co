// MANTENHA TODAS AS TELAS E LOGICAS DE SEGURANÇA. NÃO DELETE COMPONENTES EXISTENTES.
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Pricing } from './components/Pricing';
import { Footer } from './components/Footer';
import { Register } from './components/Register';
import { Login } from './components/Login';
import { PinPad } from './components/PinPad';
import { Dashboard } from './components/Dashboard';
import { Language, translations } from './translations';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'register' | 'login' | 'pinpad' | 'dashboard'>('landing');
  const [userPin, setUserPin] = useState<string>('');
  const [masterKey, setMasterKey] = useState<string>('');
  const [recoveryInitiated, setRecoveryInitiated] = useState(false);
  const [lang, setLang] = useState<Language>('pt');

  const t = translations[lang];

  // If dashboard, we might want to hide the main navbar/footer or adjust them.
  // For now, let's keep it simple. If dashboard, we render just the dashboard component which has its own nav.

  if (currentView === 'dashboard' || currentView === 'pinpad') {
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
    }
    return (
      <Dashboard 
        onLogout={() => {
          setCurrentView('landing');
          setRecoveryInitiated(false);
        }} 
        userPin={userPin} 
        masterKey={masterKey}
        initialRecoveryLog={recoveryInitiated}
        lang={lang}
        setLang={setLang}
        onPinChange={setUserPin}
      />
    );
  }

  if (currentView === 'dashboard') {
    return (
      <Dashboard 
        onLogout={() => {
          setCurrentView('landing');
          setRecoveryInitiated(false);
        }} 
        userPin={userPin} 
        masterKey={masterKey}
        initialRecoveryLog={recoveryInitiated}
        lang={lang}
        setLang={setLang}
        onPinChange={setUserPin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-gray-900 dark:text-white transition-colors duration-300">
      <Navbar 
        onLogin={() => setCurrentView('login')} 
        lang={lang} 
        setLang={setLang} 
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
            onSuccess={() => setCurrentView('pinpad')}
            onLogin={() => setCurrentView('login')}
            lang={lang}
          />
        )}
        {currentView === 'login' && (
          <Login 
            onBack={() => setCurrentView('landing')}
            onSuccess={() => setCurrentView('pinpad')}
            onRegister={() => setCurrentView('register')}
            lang={lang}
          />
        )}
      </main>
      <Footer lang={lang} />
    </div>
  );
}
