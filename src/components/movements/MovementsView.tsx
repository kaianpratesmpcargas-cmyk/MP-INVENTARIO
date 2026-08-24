import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Movimentacao, MovementType } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { exportMovementsToExcel, exportToCSV } from '../../lib/export';
import {
  ArrowLeftRight,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Building,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';

export const MovementsView: React.FC = () => {
  const { movimentacoes, setores } = useInventory();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('TODOS');
  const [selectedSetor, setSelectedSetor] = useState<string>('');

  const filteredMovimentacoes = useMemo(() => {
    return movimentacoes.filter(m => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesCode = m.equipamento_codigo.toLowerCase().includes(q);
        const matchesName = m.equipamento_nome.toLowerCase().includes(q);
        const matchesUser = m.usuario_nome.toLowerCase().includes(q);
        const matchesMotivo = (m.motivo || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesUser && !matchesMotivo) return false;
      }

      if (selectedType !== 'TODOS' && m.tipo !== selectedType) {
        return false;
      }

      if (selectedSetor) {
        const matchesOrigem = m.origem_setor_id === selectedSetor;
        const matchesDestino = m.destino_setor_id === selectedSetor;
        if (!matchesOrigem && !matchesDestino) return false;
      }

      return true;
    });
  }, [movimentacoes, searchTerm, selectedType, selectedSetor]);

  const handleExportExcel = () => {
    exportMovementsToExcel(filteredMovimentacoes, 'movimentacoes_mp_cargas.xlsx');
  };

  const handleExportCSV = () => {
    const data = filteredMovimentacoes.map(m => ({
      Data: new Date(m.created_at).toLocaleString('pt-BR'),
      Codigo: m.equipamento_codigo,
      Equipamento: m.equipamento_nome,
      Tipo: m.tipo,
      Origem: `${m.origem_setor_nome || '-'} / ${m.origem_local_nome || '-'} (${m.origem_responsavel || '-'})`,
      Destino: `${m.destino_setor_nome || '-'} / ${m.destino_local_nome || '-'} (${m.destino_responsavel || '-'})`,
      Usuario: m.usuario_nome,
      Motivo: m.motivo,
    }));
    exportToCSV(data, 'movimentacoes_mp_cargas.csv');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-yellow-500" />
            <span>Histórico Geral de Movimentações</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rastreabilidade contábil e operacional completa de transferências, manutenções e cadastros.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-zinc-700 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-yellow-400 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, equipamento, usuário ou motivo..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-yellow-400 font-medium"
          />
        </div>

        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 text-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400 font-semibold"
        >
          <option value="TODOS">Todos os Tipos de Movimentação</option>
          <option value="CADASTRO">Cadastro Inicial</option>
          <option value="TRANSFERENCIA">Transferência</option>
          <option value="ENVIO_MANUTENCAO">Envio para Manutenção</option>
          <option value="RETORNO_MANUTENCAO">Retorno de Manutenção</option>
          <option value="ALTERACAO_STATUS">Alteração de Status</option>
          <option value="BAIXA">Baixa Patrimonial</option>
          <option value="CONFERENCIA">Auditoria / Conferência</option>
        </select>

        <select
          value={selectedSetor}
          onChange={e => setSelectedSetor(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 text-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
        >
          <option value="">Todos os Setores (Origem ou Destino)</option>
          {setores.map(s => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      </div>

      {/* Tabela de Movimentações */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {filteredMovimentacoes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 pl-4">Data/Hora</th>
                  <th className="p-3.5">Código / Ativo</th>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5">Origem</th>
                  <th className="p-3.5">Destino</th>
                  <th className="p-3.5">Usuário Responsável</th>
                  <th className="p-3.5 pr-4">Motivo / Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovimentacoes.map(mov => (
                  <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                    {/* Data/Hora */}
                    <td className="p-3.5 pl-4 whitespace-nowrap text-slate-500 font-mono">
                      <div>{new Date(mov.created_at).toLocaleDateString('pt-BR')}</div>
                      <div className="text-[10px] text-slate-400">{new Date(mov.created_at).toLocaleTimeString('pt-BR')}</div>
                    </td>

                    {/* Equipamento */}
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-yellow-600">
                        {mov.equipamento_codigo}
                      </div>
                      <div className="font-bold text-zinc-900 truncate max-w-xs">
                        {mov.equipamento_nome}
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="p-3.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-zinc-800">
                        {mov.tipo}
                      </span>
                    </td>

                    {/* Origem */}
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">
                      {mov.origem_setor_nome ? (
                        <div>
                          <div className="font-semibold text-zinc-800">{mov.origem_setor_nome}</div>
                          <div className="text-[11px] text-slate-400">{mov.origem_local_nome || '-'} • {mov.origem_responsavel || '-'}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Destino */}
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">
                      {mov.destino_setor_nome ? (
                        <div>
                          <div className="font-semibold text-zinc-800">{mov.destino_setor_nome}</div>
                          <div className="text-[11px] text-slate-400">{mov.destino_local_nome || '-'} • {mov.destino_responsavel || '-'}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Usuário */}
                    <td className="p-3.5 whitespace-nowrap font-medium text-zinc-800">
                      {mov.usuario_nome}
                    </td>

                    {/* Motivo */}
                    <td className="p-3.5 pr-4 text-slate-600 max-w-xs">
                      <div className="font-medium text-zinc-800 truncate">{mov.motivo || '-'}</div>
                      {mov.observacoes && (
                        <div className="text-[11px] text-slate-400 truncate">{mov.observacoes}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<ArrowLeftRight className="w-8 h-8 text-yellow-500" />}
            title="Nenhuma movimentação encontrada"
            description="Não há registros de movimentação para os filtros selecionados."
          />
        )}
      </div>
    </div>
  );
};
