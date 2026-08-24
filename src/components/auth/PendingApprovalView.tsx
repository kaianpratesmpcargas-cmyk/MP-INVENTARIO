import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock } from 'lucide-react';

export const PendingApprovalView: React.FC = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#FFD100] mx-auto">
          <span className="text-black font-black text-sm tracking-tighter">MP</span>
        </div>

        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-2xl p-7">
          <div className="w-10 h-10 rounded-full bg-amber-900/30 border border-amber-700/50 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>

          <h2 className="text-white font-semibold text-sm mb-2">Aguardando Aprovação</h2>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Sua solicitação foi recebida, <strong className="text-zinc-200">{currentUser?.full_name}</strong>.
            Um Administrador precisa aprovar seu acesso antes que você possa entrar no sistema.
          </p>

          <button
            onClick={logout}
            className="mt-5 text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
          >
            Sair e voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
};
