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

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'register' | 'login' | 'pinpad' | 'dashboard'>('landing');

  // If dashboard, we might want to hide the main navbar/footer or adjust them.
  // For now, let's keep it simple. If dashboard, we render just the dashboard component which has its own nav.

  if (currentView === 'dashboard') {
    return <Dashboard onLogout={() => setCurrentView('landing')} />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-gray-900 dark:text-white transition-colors duration-300">
      <Navbar onLogin={() => setCurrentView('login')} />
      <main>
        {currentView === 'landing' && (
          <>
            <Hero onStart={() => setCurrentView('register')} />
            <Pricing />
          </>
        )}
        {currentView === 'register' && (
          <Register 
            onBack={() => setCurrentView('landing')} 
            onSuccess={() => setCurrentView('pinpad')}
            onLogin={() => setCurrentView('login')}
          />
        )}
        {currentView === 'login' && (
          <Login 
            onBack={() => setCurrentView('landing')}
            onSuccess={() => setCurrentView('pinpad')}
            onRegister={() => setCurrentView('register')}
          />
        )}
        {currentView === 'pinpad' && (
          <PinPad onComplete={() => setCurrentView('dashboard')} />
        )}
      </main>
      <Footer />
    </div>
  );
}
