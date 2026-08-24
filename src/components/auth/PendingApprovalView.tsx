import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, ShieldAlert, LogOut, CheckCircle2, Building2 } from 'lucide-react';

export const PendingApprovalView: React.FC = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="min-h-screen w-full bg-[#111111] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl">
        {/* Glow de fundo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Ícone */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 text-yellow-400">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        {/* Título e status */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-3">
          Status: Aguardando Aprovação
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          Olá, {currentUser?.full_name || 'Colaborador'}!
        </h2>

        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          Sua solicitação de acesso para a conta <strong className="text-zinc-200">{currentUser?.email}</strong> foi registrada no sistema da <strong>MP CARGAS</strong> e está em análise pela administração.
        </p>

        <div className="bg-zinc-950/60 rounded-2xl p-4 border border-zinc-800/80 text-left space-y-3 mb-6 text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Dados de autenticação validados</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span>Departamento: {currentUser?.department || 'Geral'}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>O Administrador definirá seu nível de permissão (Conferente, Manutenção, etc.)</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair e verificar mais tarde</span>
        </button>
      </div>
    </div>
  );
};
