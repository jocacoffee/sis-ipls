import React, { useEffect, useState } from 'react';
import { LogIn, X, Loader2, ShieldCheck } from 'lucide-react';
import type { AuthUser } from '../services/authClient';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoggedIn: (user: AuthUser) => void;
}

/** Login com o usuário de rede do AD da 1ª Região (usuario@ba.trf1.gov.br, JFBA\usuario ou usuario). */
export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoggedIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<{ mode: string; defaultDomain: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setPassword('');
    fetch('/api/auth/config')
      .then(r => r.json())
      .then(setConfig)
      .catch(() => setConfig(null));
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível entrar.');
        return;
      }
      setPassword('');
      onLoggedIn(data.user);
    } catch {
      setError('Falha de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="login-title" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Entrar no iPLS
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Use seu usuário e senha de rede da Justiça Federal da 1ª Região.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Usuário
          <input
            autoFocus
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder={`usuario@${config?.defaultDomain || 'secao.trf1.gov.br'}`}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="block mt-1 font-normal text-[11px] text-slate-500">
            Formatos aceitos: usuario@ba.trf1.gov.br, JFBA\usuario ou só usuario ({config?.defaultDomain || 'domínio padrão'}).
          </span>
        </label>

        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        {config?.mode === 'dev' && (
          <p className="text-[11px] rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1">
            Modo de teste (sem AD) ativo neste servidor.
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-2 py-1.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !username || !password}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold py-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Entrar
        </button>
        <p className="text-[11px] text-slate-500 text-center">
          Para apenas consultar os painéis, não é preciso entrar.
        </p>
      </form>
    </div>
  );
};
