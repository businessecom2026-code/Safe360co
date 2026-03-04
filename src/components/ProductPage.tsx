import { Shield, Lock, Users, Download, Globe, ShieldCheck, Key, UserCheck, Check, FolderOpen } from 'lucide-react';
import { Language, translations } from '../translations';

interface ProductPageProps {
  lang: Language;
  onRegister: () => void;
}

export function ProductPage({ lang, onRegister }: ProductPageProps) {
  const t = translations[lang];
  const p = t.productPage;
  const pr = t.pricing;

  const features = [
    { icon: ShieldCheck, title: p.f1, desc: p.f1d, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
    { icon: Key, title: p.f2, desc: p.f2d, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
    { icon: FolderOpen, title: p.f3, desc: p.f3d, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' },
    { icon: Users, title: p.f4, desc: p.f4d, color: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
    { icon: Download, title: p.f5, desc: p.f5d, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' },
    { icon: Globe, title: p.f6, desc: p.f6d, color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' },
  ];

  const pillars = [
    { icon: Lock, title: p.s1, desc: p.s1d, gradient: 'from-blue-600 to-cyan-500' },
    { icon: Shield, title: p.s2, desc: p.s2d, gradient: 'from-purple-600 to-pink-500' },
    { icon: UserCheck, title: p.s3, desc: p.s3d, gradient: 'from-green-600 to-emerald-500' },
  ];

  const plans = [
    { name: pr.free.name, price: pr.free.price, features: pr.free.features, highlight: false },
    { name: pr.pro.name, price: pr.pro.price, features: pr.pro.features, highlight: true },
    { name: pr.scale.name, price: pr.scale.price, features: pr.scale.features, highlight: false },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            {p.heroTitle}
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">{p.heroSub}</p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-10">{p.featTitle}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon size={22} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="py-16 px-4 bg-slate-50 dark:bg-slate-950">
        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-10">{p.pricingCta}</h2>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl p-6 border-2 transition-transform ${
                plan.highlight
                  ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-xl md:scale-105'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              {plan.highlight && (
                <span className="inline-block text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full mb-3">
                  {pr.mostPopular}
                </span>
              )}
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
              <p className="text-3xl font-extrabold text-blue-600 my-3">
                {plan.price}
                <span className="text-sm font-normal text-slate-400">/mês</span>
              </p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onRegister}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  plan.highlight
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Security Pillars */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-10">{p.secTitle}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map((s, i) => (
            <div key={i} className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-6">
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${s.gradient}`} />
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-4`}>
                <s.icon size={22} />
              </div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center bg-gradient-to-r from-blue-600 to-indigo-600">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{p.cta}</h2>
        <p className="text-blue-100 mb-6">{p.ctaSub}</p>
        <button
          onClick={onRegister}
          className="px-8 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors text-sm"
        >
          {p.cta} →
        </button>
      </section>
    </div>
  );
}

export default ProductPage;
