import { ShieldCheck, Globe } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Language, translations } from '../translations';

interface NavbarProps {
  onLogin: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export function Navbar({ onLogin, lang, setLang }: NavbarProps) {
  const t = translations[lang];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">
              Safe360
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
              <Globe size={16} className="text-gray-500 ml-1" />
              <select 
                value={lang}
                onChange={(e) => setLang(e.target.value as Language)}
                className="bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300 outline-none cursor-pointer pr-1"
              >
                <option value="pt">PT</option>
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
            </div>
            <ThemeToggle />
            <button 
              onClick={onLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {t.nav.login}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
