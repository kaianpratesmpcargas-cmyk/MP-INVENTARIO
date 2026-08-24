import React from 'react';
import { EquipmentStatus, UserRole, UserStatus } from '../../types';

interface StatusBadgeProps {
  status?: EquipmentStatus | UserStatus | string;
  role?: UserRole | string;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  role,
  size = 'md',
  dot = true,
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  }[size];

  // Papel de Usuário
  if (role) {
    switch (role) {
      case 'ADMINISTRADOR':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-md bg-zinc-900 text-yellow-400 border border-zinc-800 shadow-sm ${sizeClasses}`}>
            {dot && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
            ADMINISTRADOR
          </span>
        );
      case 'CONFERENTE':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
            {dot && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
            CONFERENTE
          </span>
        );
      case 'MANUTENÇÃO':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
            {dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
            MANUTENÇÃO
          </span>
        );
      case 'CONSULTA':
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
            {dot && <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
            CONSULTA
          </span>
        );
    }
  }

  // Status de Equipamento ou Usuário
  switch (status) {
    case 'EM USO':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${sizeClasses}`}>
          {dot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          EM USO
        </span>
      );

    case 'EM ESTOQUE':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/80 ${sizeClasses}`}>
          {dot && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
          EM ESTOQUE
        </span>
      );

    case 'EM MANUTENÇÃO':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80 ${sizeClasses}`}>
          {dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
          EM MANUTENÇÃO
        </span>
      );

    case 'DANIFICADO':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/80 ${sizeClasses}`}>
          {dot && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
          DANIFICADO
        </span>
      );

    case 'AGUARDANDO DESCARTE':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 ${sizeClasses}`}>
          {dot && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
          AGUARDANDO DESCARTE
        </span>
      );

    case 'BAIXADO':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-300 line-through ${sizeClasses}`}>
          {dot && <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />}
          BAIXADO
        </span>
      );

    case 'ATIVO':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
          {dot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          ATIVO
        </span>
      );

    case 'PENDENTE':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-amber-50 text-amber-700 border border-amber-300 font-bold ${sizeClasses}`}>
          {dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
          PENDENTE
        </span>
      );

    case 'BLOQUEADO':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 ${sizeClasses}`}>
          {dot && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
          BLOQUEADO
        </span>
      );

    case 'RECUSADO':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200 ${sizeClasses}`}>
          {dot && <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />}
          RECUSADO
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          {status || '-'}
        </span>
      );
  }
};
