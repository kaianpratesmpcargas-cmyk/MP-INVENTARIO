import React, { useState } from 'react';
import { Equipamento, DecommissionReason } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { Modal } from '../common/Modal';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DecommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento: Equipamento | null;
  onSuccess?: () => void;
}

export const DecommissionModal: React.FC<DecommissionModalProps> = ({
  isOpen,
  onClose,
  equipamento,
  onSuccess,
}) => {
  const { decommissionEquipamento } = useInventory();

  const [motivo, setMotivo] = useState<DecommissionReason>('Obsolescência');
  const [observacao, setObservacao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!equipamento) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await decommissionEquipamento(equipamento.id, motivo, observacao.trim());
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
        <div className="flex items-center gap-2 text-red-600">
          <Trash2 className="w-5 h-5" />
          <span>Dar Baixa Patrimonial</span>
        </div>
      }
      subtitle={`Processo de descarte / baixa contábil de ${equipamento.codigo_patrimonial}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
          <div>
            <div className="font-bold">Aviso de Auditoria Contábil</div>
            <div className="text-[11px] text-red-700 mt-0.5">
              O equipamento passará ao status <strong>BAIXADO</strong>. O registro não será apagado definitivamente e permanecerá disponível para auditoria patrimonial.
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-zinc-700 mb-1">
            Motivo Obrigatório da Baixa *
          </label>
          <select
            value={motivo}
            onChange={e => setMotivo(e.target.value as DecommissionReason)}
            required
            className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-red-400 focus:bg-white"
          >
            <option value="Obsolescência">Obsolescência / Fim de Vida Útil</option>
            <option value="Quebra">Quebra / Danificado sem Reparo Econômico</option>
            <option value="Descarte">Descarte / Sucata</option>
            <option value="Venda">Venda / Alienação de Ativo</option>
            <option value="Furto/Extravio">Furto / Extravio / Sinistro</option>
            <option value="Outro">Outro Motivo</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-zinc-700 mb-1">
            Justificativa e Observações Contábeis
          </label>
          <textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            rows={3}
            placeholder="Detalhe o laudo técnico, boletim de ocorrência, autorização da diretoria ou nota de descarte..."
            className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-red-400 focus:bg-white"
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
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-sm transition-all"
          >
            {isSubmitting ? 'Processando...' : 'CONFIRMAR BAIXA'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
