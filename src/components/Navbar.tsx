import { ShieldCheck, LayoutDashboard, Settings, Menu, X, LogOut, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Language, translations } from '../translations';
import { User } from '../types';

const LANG_OPTIONS: { value: Language; flag: string; code: string }[] = [
  { value: 'pt',   flag: '🇧🇷', code: 'PT' },
  { value: 'ptPT', flag: '🇵🇹', code: 'PT' },
  { value: 'en',   flag: '🇺🇸', code: 'EN' },
  { value: 'enGB', flag: '🇬🇧', code: 'EN' },
  { value: 'es',   flag: '🇪🇸', code: 'ES' },
  { value: 'it',   flag: '🇮🇹', code: 'IT' },
  { value: 'zh',   flag: '🇨🇳', code: 'ZH' },
  { value: 'fr',   flag: '🇫🇷', code: 'FR' },
  { value: 'de',   flag: '🇩🇪', code: 'DE' },
  { value: 'uk',   flag: '🇺🇦', code: 'UA' },
];

function LangPicker({ lang, setLang }: { lang: Language; setLang: (l: Language) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANG_OPTIONS.find(o => o.value === lang) || LANG_OPTIONS[2];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg px-2.5 py-1.5 transition-colors"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{current.code}</span>
        <ChevronDown size={11} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg p-2 grid grid-cols-5 gap-1 w-[160px] z-50">
          {LANG_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setLang(opt.value); setOpen(false); }}
              title={opt.value}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors text-center ${
                lang === opt.value
                  ? 'bg-blue-100 dark:bg-blue-900/40'
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-lg leading-none">{opt.flag}</span>
              <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400">{opt.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface NavbarProps {
  onLogin: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  user: User | null;
  onAdminConsole: () => void;
  onDashboard: () => void;
  onLogout: () => void;
}

export function Navbar({ onLogin, lang, setLang, user, onAdminConsole, onDashboard, onLogout }: NavbarProps) {
  const t = translations[lang];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-lg sm:text-xl tracking-tight text-gray-900 dark:text-white">
              Safe360
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2">
                {user.role === 'master' && (
                  <button
                    onClick={onAdminConsole}
                    className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Settings size={16} />
                    {t.admin.management}
                  </button>
                )}
                <button
                  onClick={onDashboard}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>
              </div>
            )}
            <LangPicker lang={lang} setLang={setLang} />
            <ThemeToggle />
            {user ? (
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {t.dashboard.nav.logout}
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {t.nav.login}
              </button>
            )}
          </div>

          {/* Mobile nav controls */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            {!user ? (
              <button
                onClick={onLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                {t.nav.login}
              </button>
            ) : (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && user && (
        <div className="sm:hidden border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => { onDashboard(); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          {user.role === 'master' && (
            <button
              onClick={() => { onAdminConsole(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings size={18} />
              {t.admin.management}
            </button>
          )}
          <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={() => { onLogout(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={18} />
              {t.dashboard.nav.logout}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
