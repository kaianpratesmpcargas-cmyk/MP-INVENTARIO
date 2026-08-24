import React, { useState, useEffect } from 'react';
import { Equipamento, EquipmentStatus } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { RefreshCw } from 'lucide-react';

interface ChangeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento: Equipamento | null;
  onSuccess?: () => void;
}

export const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({
  isOpen,
  onClose,
  equipamento,
  onSuccess,
}) => {
  const { changeEquipmentStatus } = useInventory();
  const [newStatus, setNewStatus] = useState<EquipmentStatus>('EM ESTOQUE');
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (equipamento) {
      setNewStatus(equipamento.status);
      setMotivo('');
    }
  }, [equipamento]);

  if (!equipamento) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatus === equipamento.status) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await changeEquipmentStatus(equipamento.id, newStatus, motivo.trim());
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
          <RefreshCw className="w-5 h-5 text-yellow-500" />
          <span>Alterar Status do Equipamento</span>
        </div>
      }
      subtitle={`${equipamento.codigo_patrimonial} — ${equipamento.nome}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <span className="text-slate-500">Status Atual:</span>
          <StatusBadge status={equipamento.status} />
        </div>

        <div>
          <label className="block font-semibold text-zinc-700 mb-1">
            Novo Status Operacional *
          </label>
          <select
            value={newStatus}
            onChange={e => setNewStatus(e.target.value as EquipmentStatus)}
            required
            className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-yellow-400 focus:bg-white"
          >
            <option value="EM USO">EM USO</option>
            <option value="EM ESTOQUE">EM ESTOQUE</option>
            <option value="EM MANUTENÇÃO">EM MANUTENÇÃO</option>
            <option value="DANIFICADO">DANIFICADO</option>
            <option value="AGUARDANDO DESCARTE">AGUARDANDO DESCARTE</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-zinc-700 mb-1">
            Motivo da Alteração
          </label>
          <input
            type="text"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ex: Devolução ao estoque, avaria identificada em vistoria..."
            className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
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
            className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold shadow-sm transition-all"
          >
            {isSubmitting ? 'Salvando...' : 'ALTERAR STATUS'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
