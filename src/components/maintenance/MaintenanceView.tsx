import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { Equipamento, Manutencao } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import {
  Wrench,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Plus,
  Search,
  Calendar,
  User,
  Building,
} from 'lucide-react';

interface MaintenanceViewProps {
  onOpenNewMaintenance: (eq?: Equipamento) => void;
  onOpenFinishMaintenance: (eq: Equipamento) => void;
  onViewEquipmentDetails: (eq: Equipamento) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  onOpenNewMaintenance,
  onOpenFinishMaintenance,
  onViewEquipmentDetails,
}) => {
  const { manutencoes, equipamentos } = useInventory();
  const { hasPermission } = useAuth();

  const [tab, setTab] = useState<'ativos' | 'concluidos'>('ativos');
  const [searchTerm, setSearchTerm] = useState('');

  // Métricas
  const activeTickets = manutencoes.filter(m => !m.concluida);
  const completedTickets = manutencoes.filter(m => m.concluida);
  const overdueTickets = activeTickets.filter(m => {
    const eq = equipamentos.find(e => e.id === m.equipamento_id);
    return (eq?.dias_em_manutencao || 0) > 30;
  });

  const totalMaintenanceCost = manutencoes.reduce((acc, m) => acc + (m.custo_real || m.custo_estimado || 0), 0);

  // Filtro
  const displayedTickets = (tab === 'ativos' ? activeTickets : completedTickets).filter(t => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      t.equipamento_codigo.toLowerCase().includes(q) ||
      t.equipamento_nome.toLowerCase().includes(q) ||
      t.problema.toLowerCase().includes(q) ||
      (t.tecnico_responsavel || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-500" />
            <span>Controle de Manutenções & Reparos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhe ordens de serviço, laudos técnicos, troca de peças e custos de oficina.
          </p>
        </div>

        {hasPermission('open_maintenance') && (
          <button
            onClick={() => onOpenNewMaintenance()}
            className="px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-yellow-glow transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>ABRIR MANUTENÇÃO</span>
          </button>
        )}
      </div>

      {/* Cards Métricas de Manutenção */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">EM ANDAMENTO</span>
            <Wrench className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">{activeTickets.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Chamados na oficina</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">ATRASADOS (+30 DIAS)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 font-mono">{overdueTickets.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Requer cobrança técnica</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">CONCLUÍDOS</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">{completedTickets.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Histórico finalizado</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-zinc-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">CUSTO ACUMULADO</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 font-mono">
            R$ {totalMaintenanceCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Investimento em reparos</div>
        </div>
      </div>

      {/* Abas e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Abas */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold w-fit">
            <button
              onClick={() => setTab('ativos')}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                tab === 'ativos' ? 'bg-zinc-900 text-white shadow-xs' : 'text-slate-600 hover:text-black'
              }`}
            >
              Chamados em Aberto ({activeTickets.length})
            </button>
            <button
              onClick={() => setTab('concluidos')}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                tab === 'concluidos' ? 'bg-zinc-900 text-white shadow-xs' : 'text-slate-600 hover:text-black'
              }`}
            >
              Histórico Concluído ({completedTickets.length})
            </button>
          </div>

          {/* Busca */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar chamado ou código..."
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        {/* Lista de Chamados */}
        {displayedTickets.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {displayedTickets.map(ticket => {
              const eq = equipamentos.find(e => e.id === ticket.equipamento_id);
              const isOverdue = !ticket.concluida && (eq?.dias_em_manutencao || 0) > 30;

              return (
                <div key={ticket.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-sm text-yellow-600">
                        {ticket.equipamento_codigo}
                      </span>
                      <span className="font-bold text-zinc-900 text-sm">
                        {ticket.equipamento_nome}
                      </span>
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-bold text-[10px] animate-pulse">
                          ⚠ +30 DIAS EM ABERTO
                        </span>
                      )}
                    </div>

                    <div className="font-medium text-zinc-800">
                      Defeito: <strong className="text-zinc-900">{ticket.problema}</strong>
                    </div>

                    {ticket.descricao && (
                      <p className="text-slate-500 text-[11px] line-clamp-2">
                        {ticket.descricao}
                      </p>
                    )}

                    {ticket.concluida && ticket.servico_realizado && (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] mt-1">
                        <strong>Laudo / Serviço Concluído:</strong> {ticket.servico_realizado}
                        {ticket.pecas_utilizadas && ` (Peças: ${ticket.pecas_utilizadas})`}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Entrada: {new Date(ticket.data_entrada).toLocaleDateString('pt-BR')}</span>
                      {ticket.previsao_retorno && <span>Previsão: {new Date(ticket.previsao_retorno).toLocaleDateString('pt-BR')}</span>}
                      {ticket.data_saida && <span>Saída: {new Date(ticket.data_saida).toLocaleDateString('pt-BR')}</span>}
                      <span>Técnico: {ticket.tecnico_responsavel || 'Interno'}</span>
                      {(ticket.custo_real || ticket.custo_estimado) && (
                        <span className="font-mono font-bold text-zinc-700">
                          {ticket.concluida ? `Custo Real: R$ ${(ticket.custo_real || 0).toFixed(2)}` : `Est: R$ ${(ticket.custo_estimado || 0).toFixed(2)}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {eq && (
                      <button
                        onClick={() => onViewEquipmentDetails(eq)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-zinc-700 font-semibold hover:bg-slate-50 transition-colors"
                      >
                        Ver Patrimônio
                      </button>
                    )}

                    {!ticket.concluida && eq && hasPermission('finish_maintenance') && (
                      <button
                        onClick={() => onOpenFinishMaintenance(eq)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Finalizar Manutenção</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Wrench className="w-8 h-8 text-amber-500" />}
            title={tab === 'ativos' ? 'Nenhum chamado ativo na oficina' : 'Nenhum chamado concluído'}
            description={
              tab === 'ativos'
                ? 'Todos os equipamentos estão operacionais ou disponíveis em estoque.'
                : 'Não há registros de manutenções finalizadas.'
            }
          />
        )}
      </div>
    </div>
  );
};
