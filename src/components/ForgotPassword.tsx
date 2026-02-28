import { ArrowLeft, KeyRound, CheckCircle, Eye, EyeOff, Mail, ShieldCheck } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { Language, translations } from '../translations';

interface ForgotPasswordProps {
  onBack: () => void;
  onSuccess: () => void;
  lang: Language;
  resetToken?: string | null;
  resetEmail?: string | null;
}

export function ForgotPassword({ onBack, onSuccess, lang, resetToken, resetEmail }: ForgotPasswordProps) {
  // Step 1: request email
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // Step 2: set new password (only when resetToken is provided)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // If resetToken is provided, we're in step 2 (new password)
  const isResetStep = !!resetToken;

  // Step 1: Request password reset email
  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Insira seu email.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setEmailSent(true);
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao solicitar recuperacao.');
      }
    } catch {
      setError('Erro de conexao. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Set new password with token
  const handleSetNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Nova senha deve ter no minimo 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas nao coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/auth/recover/${resetToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => onSuccess(), 2000);
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao redefinir senha.');
      }
    } catch {
      setError('Erro de conexao. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 animate-in fade-in duration-500">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500 mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Senha Redefinida!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  // Email sent confirmation
  if (emailSent && !isResetStep) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 animate-in fade-in duration-500">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 mb-4">
            <Mail size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Verifique seu Email</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Enviamos um link de recuperacao para <strong className="text-gray-700 dark:text-gray-200">{email}</strong>.
          </p>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
            <p className="text-amber-700 dark:text-amber-300 text-xs">
              O link expira em 30 minutos. Verifique tambem a pasta de spam.
            </p>
          </div>
          <button
            onClick={onBack}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <div className="p-8">
          <button
            onClick={onBack}
            className="flex items-center text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mb-6 transition-colors"
          >
            <ArrowLeft size={16} className="mr-1" />
            Voltar ao Login
          </button>

          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
              isResetStep
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
            }`}>
              {isResetStep ? <ShieldCheck size={24} /> : <KeyRound size={24} />}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isResetStep ? 'Nova Senha' : 'Recuperar Senha'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
              {isResetStep
                ? `Defina uma nova senha para ${resetEmail || 'sua conta'}.`
                : 'Insira seu email para receber um link de recuperacao.'
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Step 1: Email only */}
          {!isResetStep && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email da Conta
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="voce@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Mail size={18} />
                    Enviar Link de Recuperacao
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: New password (with reset token) */}
          {isResetStep && (
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Min. 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Redefinir Senha'
                )}
              </button>
            </form>
          )}
        </div>

        <div className="px-8 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 text-center">
          <p className="text-xs text-gray-400">
            {isResetStep
              ? 'Sua senha sera criptografada com seguranca antes de ser armazenada.'
              : 'O link de recuperacao sera enviado para o email cadastrado.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
