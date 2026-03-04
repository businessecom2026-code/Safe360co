import { useState } from 'react';
import { FileText, Shield, Scale } from 'lucide-react';
import { Language, translations } from '../translations';

interface LegalPageProps {
  lang: Language;
}

export function LegalPage({ lang }: LegalPageProps) {
  const t = translations[lang];
  const l = t.legalPage;
  const [tab, setTab] = useState<'terms' | 'privacy' | 'compliance'>('terms');

  const tabs = [
    { key: 'terms' as const, label: l.termsTab, icon: FileText },
    { key: 'privacy' as const, label: l.privacyTab, icon: Shield },
    { key: 'compliance' as const, label: l.complianceTab, icon: Scale },
  ];

  const content: Record<string, string[]> = {
    terms: [l.t1, l.t2, l.t3, l.t4],
    privacy: [l.p1, l.p2, l.p3, l.p4],
    compliance: [l.c1, l.c2, l.c3, l.c4],
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 text-center">
            {l.title}
          </h1>
          <p className="text-sm text-slate-400 text-center mb-8">{l.updated}</p>

          {/* Tabs */}
          <div className="flex gap-2 justify-center mb-10 flex-wrap">
            {tabs.map(tb => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  tab === tb.key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <tb.icon size={16} />
                {tb.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              {tabs.find(tb => tb.key === tab)?.icon && (() => {
                const Icon = tabs.find(tb => tb.key === tab)!.icon;
                return <Icon size={18} className="text-blue-500" />;
              })()}
              {tabs.find(tb => tb.key === tab)?.label}
            </h2>
            <div className="space-y-4">
              {content[tab].map((paragraph, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-blue-500 font-bold text-sm flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{paragraph}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance badge */}
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-full border border-green-100 dark:border-green-900/30">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium">{t.common.compliance}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LegalPage;
