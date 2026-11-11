import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogIn, LogOut, UserCheck } from 'lucide-react';
import { AuthUser, ROLE_LABEL } from '../services/authClient';

interface UserMenuProps {
  authUser: AuthUser | null;
  /** Se o usuário pode lançar dados no órgão selecionado. */
  canEdit: boolean;
  organizationAcronym?: string;
  onLogin: () => void;
  onLogout: () => void;
}

const initials = (name: string) =>
  name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]!.toUpperCase())
    .join('') || '?';

/** Sessão do usuário no canto superior direito: botão Entrar ou nome com menu (papel, órgão e Sair). */
export const UserMenu: React.FC<UserMenuProps> = ({ authUser, canEdit, organizationAcronym, onLogin, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!authUser) {
    return (
      <button
        type="button"
        onClick={onLogin}
        title="Visitantes consultam os painéis sem login. Entre com o usuário da rede para lançar dados."
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Entrar</span>
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={authUser.username}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
      >
        <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
          {initials(authUser.displayName)}
        </span>
        <span className="hidden sm:flex flex-col items-start leading-tight max-w-[160px]">
          <span className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">{authUser.displayName}</span>
          <span className="text-[10px] text-slate-500">
            {ROLE_LABEL[authUser.role]}{authUser.dev ? ' · Dev' : ''}
          </span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg p-3 z-50 text-xs"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            <UserCheck className="w-3.5 h-3.5 text-teal-500" />
            Acesso
          </div>
          <div className="font-semibold text-slate-900 truncate">{authUser.displayName}</div>
          <div className="text-[11px] text-slate-500 truncate">{authUser.username}</div>
          <div className="text-[11px] text-slate-600 mt-1">
            {ROLE_LABEL[authUser.role]}{authUser.dev ? ' · Dev' : ''}
          </div>
          <div className={`mt-2 text-[11px] font-semibold ${canEdit ? 'text-emerald-700' : 'text-amber-700'}`}>
            {canEdit
              ? `Pode lançar dados em ${organizationAcronym || 'este órgão'}`
              : `Somente consulta em ${organizationAcronym || 'este órgão'}`}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
};
