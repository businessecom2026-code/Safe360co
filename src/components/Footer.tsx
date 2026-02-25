import { Shield } from 'lucide-react';
import { Language, translations } from '../translations';

interface FooterProps {
  lang: Language;
}

export function Footer({ lang }: FooterProps) {
  const t = translations[lang];

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-lg text-gray-900 dark:text-white">
                Safe360
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              {t.hero.subtitle}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
              {lang === 'pt' ? 'Produto' : lang === 'en' ? 'Product' : 'Producto'}
            </h4>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Features</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">{lang === 'pt' ? 'Preços' : lang === 'en' ? 'Pricing' : 'Precios'}</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">{lang === 'pt' ? 'Segurança' : lang === 'en' ? 'Security' : 'Seguridad'}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">{lang === 'pt' ? 'Privacidade' : lang === 'en' ? 'Privacy' : 'Privacidad'}</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">{lang === 'pt' ? 'Termos' : lang === 'en' ? 'Terms' : 'Términos'}</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">LGPD / GDPR</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Safe360. Powered by <a href="https://ecom360.co" className="text-blue-600 dark:text-blue-400 hover:underline">Ecom360.co</a>
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full border border-green-100 dark:border-green-900/30">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-medium text-green-700 dark:text-green-400">
              {lang === 'pt' ? 'Em conformidade com GDPR (EU) e LGPD (BR)' : lang === 'en' ? 'GDPR (EU) and LGPD (BR) compliant' : 'Cumple con GDPR (UE) y LGPD (BR)'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
