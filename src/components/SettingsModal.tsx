import {
  Shield, Palette, Gem, LogOut, ChevronRight, Eye, KeyRound, AlertTriangle,
  RefreshCw, Download, Timer, Fingerprint, Globe,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Language } from '../translations';
import { hashPin, PinStore, isMobileDevice, platformAuthAvailable, registerPasskey } from '../utils/pinUtils';

// ─── Language options ─────────────────────────────────────────────────────────
const LANGUAGE_OPTIONS: { value: Language; flag: string; label: string }[] = [
  { value: 'pt',   flag: '🇧🇷', label: 'Português (BR)' },
  { value: 'ptPT', flag: '🇵🇹', label: 'Português (PT)' },
  { value: 'en',   flag: '🇺🇸', label: 'English' },
  { value: 'enGB', flag: '🇬🇧', label: 'English (UK)' },
  { value: 'es',   flag: '🇪🇸', label: 'Español' },
  { value: 'it',   flag: '🇮🇹', label: 'Italiano' },
  { value: 'zh',   flag: '🇨🇳', label: '中文' },
  { value: 'fr',   flag: '🇫🇷', label: 'Français' },
  { value: 'de',   flag: '🇩🇪', label: 'Deutsch' },
  { value: 'uk',   flag: '🇺🇦', label: 'Українська' },
];

// ─── PRICES (exported for Pricing component) ──────────────────────────────────
export const PRICES = {
  extraUser: 2.00,
  scalePlan: 19.90,
  discount: 0.10,
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface SettingsProps {
  userId: string;
  userRole?: string;
  onLogout: () => void;
  onPinChange?: (newPin: string) => void;
  currentPlan: 'free' | 'pro' | 'scale';
  isProcessing: boolean;
  onUpgrade: () => void;
  transactions: { id: string; description: string; amount: string; date: string; icon: 'credit-card' | 'receipt' }[];
  activityLogs: { id: string; time: string; message: string }[];
}

// ─── Component ────────────────────────────────────────────────────────────────
export const SettingsModal = ({
  userId, userRole, onLogout, onPinChange,
  currentPlan, isProcessing, onUpgrade,
  transactions, activityLogs,
}: SettingsProps) => {
  const { lang, setLang, token } = useAuth();

  // Read master key from PinStore
  const masterKey = PinStore.getMasterKey(userId) || '—';

  // ── Dark mode ───────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  // ── PIN reveal ──────────────────────────────────────────────────────────────
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // ── Change PIN ──────────────────────────────────────────────────────────────
  const [showChangePin, setShowChangePin] = useState(false);
  const [changePinStep, setChangePinStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [changePinError, setChangePinError] = useState('');

  // ── Biometric ───────────────────────────────────────────────────────────────
  const [hasBiometric, setHasBiometric] = useState(() => !!PinStore.getCredId(userId));
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // ── Auto-lock ───────────────────────────────────────────────────────────────
  const [autoLockTime, setAutoLockTime] = useState<number>(() => {
    const saved = localStorage.getItem('autoLockTime');
    if (saved === null) {
      localStorage.setItem('autoLockTime', '300'); // persist default so AuthContext picks it up
      return 300;
    }
    return parseInt(saved, 10);
  });

  // ── Lockout after failed attempts ───────────────────────────────────────────
  const [pinAttempts, setPinAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);

  // ── Feedback ────────────────────────────────────────────────────────────────
  const [successMessage, setSuccessMessage] = useState('');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isMobileDevice()) {
      platformAuthAvailable().then(setBiometricAvailable);
    }
  }, []);

  // ── Countdown lock timer ────────────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isLocked && lockTimeLeft > 0) {
      timer = setInterval(() => setLockTimeLeft(p => p - 1), 1000);
    } else if (isLocked && lockTimeLeft === 0) {
      setIsLocked(false);
      setPinAttempts(0);
    }
    return () => clearInterval(timer);
  }, [isLocked, lockTimeLeft]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const handleFailedAttempt = (setError: (msg: string) => void) => {
    const next = pinAttempts + 1;
    setPinAttempts(next);
    if (next >= 3) {
      setIsLocked(true);
      setLockTimeLeft(30);
      setError('Muitas tentativas. Aguarde 30s.');
    } else {
      setError(`PIN incorreto. Restantes: ${3 - next}`);
    }
  };

  // ── Reveal master key ───────────────────────────────────────────────────────
  const handleRevealMasterKey = async () => {
    if (isLocked) return;
    const storedHash = PinStore.getPinHash(userId);
    if (!storedHash) {
      setShowPinConfirm(false);
      setShowMasterKey(true);
      return;
    }
    const inputHash = await hashPin(userId, pinInput);
    if (inputHash === storedHash) {
      setShowPinConfirm(false);
      setShowMasterKey(true);
      setPinInput('');
      setPinError('');
      setPinAttempts(0);
    } else {
      handleFailedAttempt(setPinError);
      setPinInput('');
    }
  };

  // ── Change PIN ──────────────────────────────────────────────────────────────
  const handleVerifyCurrentPin = async () => {
    if (isLocked) return;
    const storedHash = PinStore.getPinHash(userId);
    if (!storedHash) { setChangePinStep('new'); return; }
    const inputHash = await hashPin(userId, currentPinInput);
    if (inputHash === storedHash) {
      setChangePinStep('new');
      setChangePinError('');
      setPinAttempts(0);
    } else {
      handleFailedAttempt(setChangePinError);
      setCurrentPinInput('');
    }
  };

  const handleSaveNewPin = async () => {
    if (newPinInput !== confirmNewPinInput) {
      setChangePinError('Os PINs não coincidem.');
      return;
    }
    const newHash = await hashPin(userId, newPinInput);
    PinStore.setPinHash(userId, newHash);
    onPinChange?.(newPinInput);
    setSuccessMessage('PIN alterado com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
    setShowChangePin(false);
  };

  // ── Biometric ───────────────────────────────────────────────────────────────
  const handleEnableBiometric = async () => {
    setBiometricLoading(true);
    try {
      const credId = await registerPasskey(userId);
      PinStore.setCredId(userId, credId);
      setHasBiometric(true);
      showToast('Biometria ativada!');
    } catch {
      showToast('Falha ao ativar biometria.', 'error');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleDisableBiometric = () => {
    PinStore.clearCredId(userId);
    setHasBiometric(false);
    showToast('Biometria desativada.');
  };

  // ── Backup export (multi-format) ────────────────────────────────────────────

  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const buildXlsxBlob = (vaults: any[]): Blob => {
    let rows = '<tr><th>Cofre</th><th>Título</th><th>Tipo</th><th>Campos</th><th>Notas</th><th>Criado em</th></tr>';
    for (const v of vaults) {
      for (const item of (v.data || [])) {
        const fields = (item.passwords || []).map((p: any) => `${p.label}: ${p.value}`).join('; ');
        rows += `<tr><td>${escHtml(v.name)}</td><td>${escHtml(item.title)}</td><td>${escHtml(item.type || 'password')}</td><td>${escHtml(fields)}</td><td>${escHtml(item.description || '')}</td><td>${item.createdAt?.slice(0, 10) || ''}</td></tr>`;
      }
    }
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>td,th{border:1px solid #ccc;padding:4px 8px;font-size:12px}th{background:#f0f0f0;font-weight:bold}</style></head><body><table>${rows}</table></body></html>`;
    return new Blob([html], { type: 'application/vnd.ms-excel' });
  };

  const openPdfPrint = (vaults: any[], date: string) => {
    let content = '';
    for (const v of vaults) {
      content += `<div style="margin-bottom:30px"><h2 style="color:#3b82f6;border-bottom:2px solid #3b82f6;padding-bottom:4px">${escHtml(v.name)}</h2>`;
      for (const item of (v.data || [])) {
        content += `<div style="margin:12px 0;padding:10px;border:1px solid #e2e8f0;border-radius:8px"><h3 style="margin:0 0 6px">${escHtml(item.title)}</h3>`;
        if (item.passwords?.length) {
          content += '<ul style="margin:4px 0;padding-left:20px">';
          for (const p of item.passwords) content += `<li><strong>${escHtml(p.label)}:</strong> ${escHtml(p.value)}</li>`;
          content += '</ul>';
        }
        if (item.description) content += `<p style="color:#666;margin:4px 0">${escHtml(item.description)}</p>`;
        content += `<p style="font-size:10px;color:#999;margin:2px 0">Criado: ${item.createdAt?.slice(0, 10) || '—'}</p></div>`;
      }
      content += '</div>';
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Safe360 Backup</title><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:800px;margin:0 auto;padding:20px}h1{text-align:center;color:#1e293b}</style></head><body><h1>Safe360 — Backup</h1><p style="text-align:center;color:#666">${date}</p>${content}<script>window.onload=function(){window.print()}</script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html); w.document.close();
  };

  const crc32Calc = (data: Uint8Array): number => {
    let c = ~0;
    for (let i = 0; i < data.length; i++) { c ^= data[i]; for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0); }
    return ~c >>> 0;
  };

  const createSimpleZip = (filename: string, content: Uint8Array): Blob => {
    const enc = new TextEncoder();
    const name = enc.encode(filename);
    const crc = crc32Calc(content);
    // Local file header
    const lh = new Uint8Array(30 + name.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true); lv.setUint32(14, crc, true);
    lv.setUint32(18, content.length, true); lv.setUint32(22, content.length, true);
    lv.setUint16(26, name.length, true); lh.set(name, 30);
    const cdOffset = lh.length + content.length;
    // Central directory
    const cd = new Uint8Array(46 + name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(10, 0, true); cv.setUint32(16, crc, true);
    cv.setUint32(20, content.length, true); cv.setUint32(24, content.length, true);
    cv.setUint16(28, name.length, true); cv.setUint32(42, 0, true); cd.set(name, 46);
    // End of central directory
    const ecd = new Uint8Array(22);
    const ev = new DataView(ecd.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, 1, true); ev.setUint16(10, 1, true);
    ev.setUint32(12, cd.length, true); ev.setUint32(16, cdOffset, true);
    return new Blob([lh, content, cd, ecd], { type: 'application/zip' });
  };

  const handleExport = async (format: 'json' | 'xlsx' | 'pdf' | 'zip') => {
    if (!window.confirm('Este arquivo contém dados do cofre. Guarde em local seguro. Continuar?')) return;
    try {
      const res = await fetch('/api/vaults', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const vaults = await res.json();
      const date = new Date().toISOString().slice(0, 10);
      const baseData = { version: '1.0', exportedAt: new Date().toISOString(), userId, vaults };

      switch (format) {
        case 'json': {
          const blob = new Blob([JSON.stringify(baseData, null, 2)], { type: 'application/json' });
          downloadBlob(blob, `safe360_backup_${date}.json`);
          break;
        }
        case 'xlsx': {
          downloadBlob(buildXlsxBlob(vaults), `safe360_backup_${date}.xlsx`);
          break;
        }
        case 'pdf': {
          openPdfPrint(vaults, date);
          break;
        }
        case 'zip': {
          const jsonStr = JSON.stringify(baseData, null, 2);
          const zipBlob = createSimpleZip(`safe360_backup_${date}.json`, new TextEncoder().encode(jsonStr));
          downloadBlob(zipBlob, `safe360_backup_${date}.zip`);
          break;
        }
      }
      showToast('Backup exportado!');
    } catch {
      showToast('Erro ao exportar backup.', 'error');
    }
  };

  // ── Other ────────────────────────────────────────────────────────────────────
  const handleAutoLockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const t = parseInt(e.target.value, 10);
    setAutoLockTime(t);
    localStorage.setItem('autoLockTime', t.toString());
    showToast(t > 0 ? `Bloqueio: ${t / 60} min.` : 'Bloqueio automático desativado.');
  };

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(d => { localStorage.setItem('theme', !d ? 'dark' : 'light'); return !d; });
  };

  const handleClearCache = () => {
    if (window.confirm('Limpar cache? Você será desconectado.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // ── Plan details ─────────────────────────────────────────────────────────────
  const planDetails = {
    free:  { name: 'FREE',  limit: 200,  label: '200MB' },
    pro:   { name: 'PRO',   limit: 500,  label: '500MB' },
    scale: { name: 'SCALE', limit: 2000, label: '2GB'   },
  };
  const usedStorageMB = 40;
  const { name: planName, limit: currentLimit, label: currentLimitLabel } = planDetails[currentPlan];
  const usagePercentage = Math.min(100, (usedStorageMB / currentLimit) * 100);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="w-full max-w-lg mx-auto pb-24 select-none">

        {/* ═══ Assinatura ══════════════════════════════════════════════════ */}
        {userRole !== 'guest' && (
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Assinatura</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex justify-between items-start mb-4">
              <div className="w-full pr-4 overflow-hidden">
                <p className="font-semibold mb-1">Plano Atual: <span className="text-blue-600">{planName}</span></p>
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>{usedStorageMB}MB de {currentLimitLabel} usados</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${usagePercentage}%` }} />
                </div>
              </div>
              <Gem size={24} className="text-blue-500 flex-shrink-0 mt-1" />
            </div>
            {currentPlan !== 'scale' && (
              <button
                onClick={onUpgrade}
                disabled={isProcessing}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isProcessing && <RefreshCw size={16} className="animate-spin" />}
                {isProcessing ? 'Processando...' : `Upgrade → ${currentPlan === 'free' ? 'PRO (500MB)' : 'SCALE (2GB)'}`}
              </button>
            )}
            {currentPlan === 'scale' && (
              <div className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold text-center text-sm">
                Plano Máximo Atingido
              </div>
            )}
            {currentPlan !== 'scale' && (
              <p className="text-center text-[10px] text-slate-400 mt-3">Pagamento seguro via Revolut</p>
            )}
          </div>
        </div>
        )}

        {/* ═══ Segurança ═══════════════════════════════════════════════════ */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Segurança</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <button
              onClick={() => { setShowPinConfirm(true); setShowMasterKey(false); setPinInput(''); setPinError(''); }}
              className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Eye size={20} className="text-slate-500" />
                <span className="font-semibold">Revelar Master Key</span>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </button>

            <button
              onClick={() => { setShowChangePin(true); setChangePinStep('current'); setCurrentPinInput(''); setNewPinInput(''); setConfirmNewPinInput(''); setChangePinError(''); }}
              className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <KeyRound size={20} className="text-slate-500" />
                <span className="font-semibold">Alterar PIN de Acesso</span>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </button>

            {/* Biometric toggle — mobile only */}
            {isMobileDevice() && biometricAvailable && (
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Fingerprint size={20} className="text-slate-500" />
                  <div>
                    <span className="font-semibold block">Face / Touch ID</span>
                    <span className="text-xs text-slate-400">{hasBiometric ? 'Ativado' : 'Desativado'}</span>
                  </div>
                </div>
                <button
                  onClick={hasBiometric ? handleDisableBiometric : handleEnableBiometric}
                  disabled={biometricLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${hasBiometric ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  {biometricLoading
                    ? <div className="absolute inset-0 flex items-center justify-center"><RefreshCw size={12} className="animate-spin text-white" /></div>
                    : <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasBiometric ? 'translate-x-6' : 'translate-x-1'}`} />
                  }
                </button>
              </div>
            )}

            <div className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Timer size={20} className="text-slate-500" />
                <span className="font-semibold">Bloqueio Automático</span>
              </div>
              <select
                value={autoLockTime}
                onChange={handleAutoLockChange}
                className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm font-semibold py-1 px-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="0">Nunca</option>
                <option value="60">1 Minuto</option>
                <option value="300">5 Minutos</option>
                <option value="900">15 Minutos</option>
              </select>
            </div>
          </div>
        </div>

        {/* ═══ Aparência ═══════════════════════════════════════════════════ */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Aparência</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Palette size={20} className="text-slate-500" />
                <span className="font-semibold">Modo Escuro</span>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ═══ Idioma ══════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Idioma</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Globe size={18} className="text-slate-500" />
              <span className="font-semibold text-sm">Selecionar Idioma</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLang(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    lang === opt.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{opt.flag}</span>
                  <span className="truncate text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ Backup ══════════════════════════════════════════════════════ */}
        {userRole !== 'guest' && (
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Backup de Segurança</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Download size={18} className="text-slate-500" />
              <div>
                <span className="font-semibold text-sm block">Exportar Cofres</span>
                <span className="text-[10px] text-slate-400">Selecione o formato do backup</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { fmt: 'json' as const, label: '.JSON', color: 'bg-blue-600 hover:bg-blue-700' },
                { fmt: 'xlsx' as const, label: '.XLSX', color: 'bg-emerald-600 hover:bg-emerald-700' },
                { fmt: 'pdf' as const,  label: '.PDF',  color: 'bg-red-600 hover:bg-red-700' },
                { fmt: 'zip' as const,  label: '.ZIP',  color: 'bg-violet-600 hover:bg-violet-700' },
              ]).map(({ fmt, label, color }) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-xs font-bold transition-colors ${color}`}
                >
                  <Download size={13} />{label}
                </button>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* ═══ Atividade Recente ═══════════════════════════════════════════ */}
        {activityLogs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Atividade Recente</h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {activityLogs.map(log => (
                <div key={log.id} className="p-4 flex items-start gap-3">
                  <div className="text-xs font-mono text-slate-400 mt-0.5 shrink-0">[{log.time}]</div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-tight">{log.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Ações ═══════════════════════════════════════════════════════ */}
        <div className="mt-12 px-4 space-y-3">
          <button
            onClick={() => { sessionStorage.clear(); onLogout(); }}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <LogOut size={16} />Sair da Conta
          </button>
          <button
            onClick={handleClearCache}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-600 dark:text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors"
          >
            <AlertTriangle size={16} />Limpar Cache do App
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-6">Safe360 v1.0.0</p>
        </div>
      </div>

      {/* ── Floating success feedback ─────────────────────────────────────── */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg font-semibold z-[70] pointer-events-none">
          {successMessage}
        </div>
      )}

      {/* ── Toast list ───────────────────────────────────────────────────── */}
      <div className="fixed bottom-4 right-4 z-[70] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded-lg text-white text-sm shadow-lg ${t.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {t.message}
          </div>
        ))}
      </div>

      {/* ── Modal: PIN → Reveal Master Key ───────────────────────────────── */}
      {showPinConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-[92%] max-w-sm shadow-2xl border border-white/10">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                <Shield size={24} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-bold mb-1">Confirmação de Segurança</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Digite seu PIN para revelar a Master Key.</p>
              <input
                type="password"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pinInput.length >= 4 && handleRevealMasterKey()}
                maxLength={8}
                autoFocus
                placeholder="••••••"
                className="w-full text-center tracking-[.5em] font-mono px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none mb-2"
              />
              {pinError && <p className="text-red-500 text-xs mb-3">{pinError}</p>}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { setShowPinConfirm(false); setPinInput(''); setPinError(''); }}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-semibold"
                >Cancelar</button>
                <button
                  onClick={handleRevealMasterKey}
                  disabled={isLocked || pinInput.length < 4}
                  className={`flex-1 py-3 text-white rounded-xl font-bold disabled:opacity-50 ${isLocked ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isLocked ? `Aguarde ${lockTimeLeft}s` : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Master Key display ─────────────────────────────────────── */}
      {showMasterKey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-[92%] max-w-sm shadow-2xl border border-white/10">
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold mb-1">Sua Master Key</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Guarde em local seguro. É a única forma de recuperar o acesso se esquecer o PIN.</p>
              <div
                className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl mb-3 font-mono text-blue-500 select-all break-all text-sm leading-relaxed"
                onContextMenu={e => e.preventDefault()}
              >
                {masterKey}
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(masterKey); showToast('Master Key copiada!'); }}
                className="w-full mb-2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm"
              >
                Copiar Chave
              </button>
              <button onClick={() => setShowMasterKey(false)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Change PIN ─────────────────────────────────────────────── */}
      {showChangePin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-[92%] max-w-sm shadow-2xl border border-white/10">
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold mb-4">Alterar PIN</h3>

              {changePinStep === 'current' && (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Digite seu PIN atual.</p>
                  <input
                    type="password"
                    value={currentPinInput}
                    onChange={e => setCurrentPinInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && currentPinInput.length >= 4 && handleVerifyCurrentPin()}
                    maxLength={8} autoFocus placeholder="••••••"
                    className="w-full text-center tracking-[.5em] font-mono px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                  />
                  {changePinError && <p className="text-red-500 text-xs mb-3">{changePinError}</p>}
                  <button
                    onClick={handleVerifyCurrentPin}
                    disabled={isLocked || currentPinInput.length < 4}
                    className={`w-full py-3 text-white rounded-xl font-bold mt-2 disabled:opacity-50 ${isLocked ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {isLocked ? `Aguarde ${lockTimeLeft}s` : 'Próximo'}
                  </button>
                </>
              )}

              {changePinStep === 'new' && (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Novo PIN (4–8 dígitos).</p>
                  <input
                    type="password"
                    value={newPinInput}
                    onChange={e => setNewPinInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && newPinInput.length >= 4 && setChangePinStep('confirm')}
                    maxLength={8} autoFocus placeholder="••••••"
                    className="w-full text-center tracking-[.5em] font-mono px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                  />
                  <button
                    onClick={() => { if (newPinInput.length >= 4) setChangePinStep('confirm'); }}
                    disabled={newPinInput.length < 4}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold mt-2 disabled:opacity-50"
                  >Próximo</button>
                </>
              )}

              {changePinStep === 'confirm' && (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Confirme o novo PIN.</p>
                  <input
                    type="password"
                    value={confirmNewPinInput}
                    onChange={e => setConfirmNewPinInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmNewPinInput.length >= 4 && handleSaveNewPin()}
                    maxLength={8} autoFocus placeholder="••••••"
                    className="w-full text-center tracking-[.5em] font-mono px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                  />
                  {changePinError && <p className="text-red-500 text-xs mb-3">{changePinError}</p>}
                  <button
                    onClick={handleSaveNewPin}
                    disabled={confirmNewPinInput.length < 4}
                    className="w-full py-3 bg-green-600 text-white rounded-xl font-bold mt-2 disabled:opacity-50 hover:bg-green-700"
                  >Salvar Novo PIN</button>
                </>
              )}

              <button onClick={() => setShowChangePin(false)} className="w-full py-2 text-sm text-slate-500 mt-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
