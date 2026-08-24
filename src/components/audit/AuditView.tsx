import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { AuditoriaLog } from '../../types';
import { EmptyState } from '../common/EmptyState';
import {
  ShieldAlert,
  Search,
  Calendar,
  User,
  Clock,
  Code,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export const AuditView: React.FC = () => {
  const { auditoria } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('TODAS');

  const filteredLogs = auditoria.filter(log => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchUser = log.usuario_nome.toLowerCase().includes(q) || log.usuario_email.toLowerCase().includes(q);
      const matchAction = log.acao.toLowerCase().includes(q);
      const matchCode = (log.registro_codigo || '').toLowerCase().includes(q);
      const matchDetails = log.detalhes.toLowerCase().includes(q);
      if (!matchUser && !matchAction && !matchCode && !matchDetails) return false;
    }

    if (selectedEntity !== 'TODAS' && log.entidade !== selectedEntity) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-yellow-500" />
          <span>Trilha de Auditoria & Segurança</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Registro cronológico imutável de todas as operações críticas, alterações de status e movimentações.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuário, código patrimonial ou ação..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
          />
        </div>

        <select
          value={selectedEntity}
          onChange={e => setSelectedEntity(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 text-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400 font-semibold"
        >
          <option value="TODAS">Todas as Entidades</option>
          <option value="equipamentos">Equipamentos & Patrimônio</option>
          <option value="manutencoes">Manutenções</option>
          <option value="conferencias">Conferências</option>
          <option value="usuarios">Usuários & Permissões</option>
          <option value="configuracoes">Configurações</option>
        </select>
      </div>

      {/* Lista de Logs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map(log => (
              <div key={log.id} className="p-4 hover:bg-slate-50/80 transition-colors text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {log.acao}
                    </span>
                    {log.registro_codigo && (
                      <span className="font-mono font-black text-yellow-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                        {log.registro_codigo}
                      </span>
                    )}
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-zinc-800">{log.usuario_nome}</span>
                    <span className="text-[10px] text-slate-400">({log.usuario_email})</span>
                  </div>

                  <div className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                <p className="text-zinc-700 font-medium">
                  {log.detalhes}
                </p>

                {/* Diff antes/depois se houver */}
                {(log.dados_anteriores || log.dados_novos) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                    {log.dados_anteriores && (
                      <div className="p-2 bg-red-50/60 rounded-lg border border-red-200 text-red-800">
                        <span className="font-bold block text-red-900 mb-0.5">Antes:</span>
                        <pre className="whitespace-pre-wrap">{JSON.stringify(log.dados_anteriores, null, 2)}</pre>
                      </div>
                    )}
                    {log.dados_novos && (
                      <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-200 text-emerald-800">
                        <span className="font-bold block text-emerald-900 mb-0.5">Depois:</span>
                        <pre className="whitespace-pre-wrap">{JSON.stringify(log.dados_novos, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ShieldAlert className="w-8 h-8 text-slate-400" />}
            title="Nenhum log de auditoria encontrado"
            description="Não há registros correspondentes aos filtros."
          />
        )}
      </div>
    </div>
  );
};
