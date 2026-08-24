import React, { useState, useEffect } from 'react';
import { Equipamento } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { Modal } from '../common/Modal';
import { ArrowLeftRight, MapPin, Building, User } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento: Equipamento | null;
  onSuccess?: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  equipamento,
  onSuccess,
}) => {
  const { setores, locais, transferEquipamento } = useInventory();

  const [newSetorId, setNewSetorId] = useState('');
  const [newLocalId, setNewLocalId] = useState('');
  const [newResponsavel, setNewResponsavel] = useState('');
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (equipamento) {
      setNewSetorId(equipamento.setor_id || '');
      setNewLocalId(equipamento.local_id || '');
      setNewResponsavel(equipamento.responsavel || '');
      setMotivo('');
    }
  }, [equipamento]);

  if (!equipamento) return null;

  const availableLocais = locais.filter(l => l.setor_id === newSetorId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetorId) return;

    setIsSubmitting(true);
    try {
      await transferEquipamento(
        equipamento.id,
        newSetorId,
        newLocalId,
        newResponsavel.trim() || 'Almoxarifado',
        motivo.trim()
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
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <span>Transferir Localização & Custódia</span>
        </div>
      }
      subtitle={`Movimentando equipamento ${equipamento.codigo_patrimonial} — ${equipamento.nome}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Origem Atual */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            LOCALIZAÇÃO ATUAL (ORIGEM)
          </span>
          <div className="font-semibold text-zinc-900">
            Setor: {equipamento.setor_nome || 'Não definido'} • Local: {equipamento.local_nome || 'Não definido'}
          </div>
          <div className="text-slate-600">
            Responsável atual: <strong className="text-zinc-800">{equipamento.responsavel || 'Sem responsável'}</strong>
          </div>
        </div>

        {/* Destino Novo */}
        <div className="space-y-3 pt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-700 block">
            NOVA LOCALIZAÇÃO (DESTINO)
          </span>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Novo Setor *</label>
            <select
              value={newSetorId}
              onChange={e => {
                const sId = e.target.value;
                setNewSetorId(sId);
                const locs = locais.filter(l => l.setor_id === sId);
                setNewLocalId(locs.length > 0 ? locs[0].id : '');
                const s = setores.find(st => st.id === sId);
                if (s?.responsavel_padrao) setNewResponsavel(s.responsavel_padrao);
              }}
              required
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
            >
              <option value="">Selecione o setor...</option>
              {setores.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Novo Local Físico / Sala</label>
            <select
              value={newLocalId}
              onChange={e => setNewLocalId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
            >
              <option value="">Selecione a sala/doca...</option>
              {availableLocais.map(l => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Novo Responsável / Custodiante *</label>
            <input
              type="text"
              value={newResponsavel}
              onChange={e => setNewResponsavel(e.target.value)}
              placeholder="Nome do colaborador custodiante"
              required
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Motivo da Transferência</label>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: Realocação de turno, troca de setor, redistribuição..."
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
            />
          </div>
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
            {isSubmitting ? 'Transferindo...' : 'CONFIRMAR TRANSFERÊNCIA'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
