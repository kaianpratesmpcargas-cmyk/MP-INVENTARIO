import React, { useState, useEffect } from 'react';
import { Equipamento, EquipmentStatus } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { RefreshCw, CheckCircle2, AlertCircle, Package, Activity, Wrench, AlertTriangle, Trash2 } from 'lucide-react';
import { soundService } from '../../lib/sound';

interface ChangeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento: Equipamento | null;
  onSuccess?: () => void;
}

const STATUS_OPTIONS: { status: EquipmentStatus; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  {
    status: 'EM ESTOQUE',
    label: 'Disponível no Estoque',
    desc: 'Equipamento guardado e pronto para uso imediato',
    icon: <Package className="w-5 h-5 text-blue-500" />,
    color: 'border-blue-200 hover:border-blue-400 bg-blue-50/50',
  },
  {
    status: 'EM USO',
    label: 'Em Operação / Uso',
    desc: 'Alocado em atividade ou com colaborador',
    icon: <Activity className="w-5 h-5 text-emerald-500" />,
    color: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/50',
  },
  {
    status: 'EM MANUTENÇÃO',
    label: 'Em Manutenção',
    desc: 'Em reparo na oficina técnica ou assistência',
    icon: <Wrench className="w-5 h-5 text-amber-500" />,
    color: 'border-amber-200 hover:border-amber-400 bg-amber-50/50',
  },
  {
    status: 'DANIFICADO',
    label: 'Avariado / Danificado',
    desc: 'Apresenta falha ou quebra aguardando triagem',
    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    color: 'border-red-200 hover:border-red-400 bg-red-50/50',
  },
  {
    status: 'AGUARDANDO DESCARTE',
    label: 'Aguardando Descarte',
    desc: 'Sem viabilidade econômica de conserto',
    icon: <Trash2 className="w-5 h-5 text-zinc-500" />,
    color: 'border-zinc-300 hover:border-zinc-400 bg-zinc-100',
  },
];

export const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({
  isOpen,
  onClose,
  equipamento,
  onSuccess,
}) => {
  const { changeEquipmentStatus } = useInventory();
  const [selectedStatus, setSelectedStatus] = useState<EquipmentStatus>('EM ESTOQUE');
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (equipamento) {
      setSelectedStatus(equipamento.status);
      setMotivo('');
      setErrorMsg(null);
    }
  }, [equipamento, isOpen]);

  if (!equipamento) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) {
      setErrorMsg('Selecione um status operacional.');
      return;
    }

    if (selectedStatus === equipamento.status && !motivo.trim()) {
      setErrorMsg('O equipamento já está com este status. Escolha um novo status ou informe o motivo.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await changeEquipmentStatus(equipamento.id, selectedStatus, motivo.trim() || `Status alterado para ${selectedStatus}`);
      soundService.playSuccess();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao alterar status. Tente novamente.');
      soundService.playError();
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
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Status Atual Banner */}
        <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-semibold text-xs">Status Atual do Item:</span>
            <StatusBadge status={equipamento.status} size="md" />
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            {equipamento.setor_nome || 'Sem setor'}
          </span>
        </div>

        {/* Escolha Rápida do Novo Status */}
        <div>
          <label className="block font-bold text-zinc-900 mb-2 text-xs uppercase tracking-wider">
            Selecione o Novo Status Operacional:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {STATUS_OPTIONS.map(opt => {
              const isSelected = selectedStatus === opt.status;
              const isCurrent = equipamento.status === opt.status;

              return (
                <button
                  key={opt.status}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(opt.status);
                    setErrorMsg(null);
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                    isSelected
                      ? 'border-yellow-500 bg-yellow-50/80 ring-2 ring-yellow-400/40 shadow-xs'
                      : opt.color
                  }`}
                >
                  <div className="p-1.5 rounded-xl bg-white shadow-xs flex-shrink-0">
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-zinc-900 text-xs truncate">
                        {opt.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold uppercase bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded">
                          Atual
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                      {opt.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Motivo Opcional */}
        <div>
          <label className="block font-bold text-zinc-800 mb-1.5 text-xs">
            Motivo / Observação da Mudança (Opcional):
          </label>
          <input
            type="text"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ex: Devolução ao estoque após uso em rota, vistoria concluída..."
            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-yellow-400 focus:bg-white transition-all font-medium"
          />
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider shadow-yellow-glow flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Salvando...' : 'CONFIRMAR ALTERAÇÃO'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
