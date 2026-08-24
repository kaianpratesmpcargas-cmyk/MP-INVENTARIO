import React, { useState } from 'react';
import { Equipamento } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { Modal } from '../common/Modal';
import { Wrench, Calendar, DollarSign, User } from 'lucide-react';

interface SendMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento: Equipamento | null;
  onSuccess?: () => void;
}

export const SendMaintenanceModal: React.FC<SendMaintenanceModalProps> = ({
  isOpen,
  onClose,
  equipamento,
  onSuccess,
}) => {
  const { sendToMaintenance } = useInventory();

  const [problema, setProblema] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tecnico, setTecnico] = useState('');
  const [previsaoRetorno, setPrevisaoRetorno] = useState('');
  const [custoEstimado, setCustoEstimado] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!equipamento) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problema.trim()) return;

    setIsSubmitting(true);
    try {
      await sendToMaintenance(
        equipamento.id,
        problema.trim(),
        descricao.trim(),
        tecnico.trim(),
        previsaoRetorno,
        custoEstimado === '' ? 0 : Number(custoEstimado)
      );
      setProblema('');
      setDescricao('');
      setTecnico('');
      setCustoEstimado('');
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
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
            <Wrench className="w-5 h-5" />
          </div>
          <span>Enviar para Manutenção</span>
        </div>
      }
      subtitle={`Abrindo ordem de serviço para ${equipamento.codigo_patrimonial} — ${equipamento.nome}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-zinc-700 mb-1">
            Problema Identificado / Motivo *
          </label>
          <input
            type="text"
            value={problema}
            onChange={e => setProblema(e.target.value)}
            placeholder="Ex: Não liga, vazamento de óleo, tela quebrada, botão travado..."
            required
            className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white font-medium"
          />
        </div>

        <div>
          <label className="block font-semibold text-zinc-700 mb-1">
            Descrição Detalhada do Defeito
          </label>
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={3}
            placeholder="Descreva as circunstâncias da avaria, testes realizados ou peças com defeito aparente..."
            className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Oficina / Técnico
            </label>
            <input
              type="text"
              value={tecnico}
              onChange={e => setTecnico(e.target.value)}
              placeholder="Ex: Oficina Mecânica / TI Interno"
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Previsão de Retorno
            </label>
            <input
              type="date"
              value={previsaoRetorno}
              onChange={e => setPrevisaoRetorno(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Custo Estimado (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={custoEstimado}
              onChange={e => setCustoEstimado(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0,00"
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-yellow-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900">
          O status do equipamento será alterado imediatamente para <strong>EM MANUTENÇÃO</strong> e registrado na linha do tempo.
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
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold shadow-sm transition-all"
          >
            {isSubmitting ? 'Enviando...' : 'CONFIRMAR ENVIO'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
