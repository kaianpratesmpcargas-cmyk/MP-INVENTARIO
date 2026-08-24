import React, { useState } from 'react';
import { Equipamento, EquipmentStatus } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { Modal } from '../common/Modal';
import { CheckCircle2, RotateCcw, Wrench } from 'lucide-react';

interface FinishMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento: Equipamento | null;
  onSuccess?: () => void;
}

export const FinishMaintenanceModal: React.FC<FinishMaintenanceModalProps> = ({
  isOpen,
  onClose,
  equipamento,
  onSuccess,
}) => {
  const { manutencoes, finishMaintenance } = useInventory();

  const [servicoRealizado, setServicoRealizado] = useState('');
  const [pecasUtilizadas, setPecasUtilizadas] = useState('');
  const [custoReal, setCustoReal] = useState<number | ''>('');
  const [dataSaida, setDataSaida] = useState(new Date().toISOString().split('T')[0]);
  const [novoStatus, setNovoStatus] = useState<EquipmentStatus>('EM USO');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!equipamento) return null;

  const ticket = manutencoes.find(m => m.equipamento_id === equipamento.id && !m.concluida);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicoRealizado.trim()) return;

    if (!ticket) {
      alert('Nenhum chamado de manutenção ativo encontrado para este equipamento.');
      return;
    }

    setIsSubmitting(true);
    try {
      await finishMaintenance(
        ticket.id,
        servicoRealizado.trim(),
        pecasUtilizadas.trim(),
        custoReal === '' ? 0 : Number(custoReal),
        dataSaida,
        novoStatus,
        observacoes.trim()
      );
      onClose();
      if (onSuccess) onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <RotateCcw className="w-5 h-5" />
          </div>
          <span>Finalizar Manutenção & Retorno</span>
        </div>
      }
      subtitle={`Conclusão do chamado para ${equipamento.codigo_patrimonial} — ${equipamento.nome}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {ticket && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              CHAMADO ABERTO
            </span>
            <div className="font-semibold text-zinc-900">Motivo: {ticket.problema}</div>
            <div className="text-slate-500">
              Entrada em: {new Date(ticket.data_entrada).toLocaleDateString('pt-BR')} • Técnico: {ticket.tecnico_responsavel || 'Interno'}
            </div>
          </div>
        )}

        <div>
          <label className="block font-semibold text-zinc-700 mb-1">
            Serviço Realizado / Laudo Técnico *
          </label>
          <textarea
            value={servicoRealizado}
            onChange={e => setServicoRealizado(e.target.value)}
            rows={2}
            placeholder="Ex: Troca do retentor hidráulico, formatação do sistema operacional, limpeza e lubrificação geral..."
            required
            className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
          />
        </div>

        <div>
          <label className="block font-semibold text-zinc-700 mb-1">
            Peças e Componentes Utilizados
          </label>
          <input
            type="text"
            value={pecasUtilizadas}
            onChange={e => setPecasUtilizadas(e.target.value)}
            placeholder="Ex: 1x Kit de vedação 50mm, 2L Óleo hidráulico ISO 68..."
            className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Custo Real Total (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={custoReal}
              onChange={e => setCustoReal(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-yellow-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Data de Saída
            </label>
            <input
              type="date"
              value={dataSaida}
              onChange={e => setDataSaida(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Novo Status *
            </label>
            <select
              value={novoStatus}
              onChange={e => setNovoStatus(e.target.value as EquipmentStatus)}
              required
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-yellow-400 focus:bg-white"
            >
              <option value="EM USO">EM USO (Pronto)</option>
              <option value="EM ESTOQUE">EM ESTOQUE (Disponível)</option>
              <option value="DANIFICADO">DANIFICADO (Sem reparo)</option>
              <option value="AGUARDANDO DESCARTE">AGUARDANDO DESCARTE</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-zinc-700 mb-1">
            Observações de Saída
          </label>
          <input
            type="text"
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            placeholder="Recomendações de uso, cuidados preventivos..."
            className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-yellow-400 focus:bg-white"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm transition-all"
          >
            {isSubmitting ? 'Salvando...' : 'CONCLUIR MANUTENÇÃO'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
