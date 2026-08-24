import React, { useState, useEffect } from 'react';
import { Equipamento } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { Modal } from '../common/Modal';
import { Edit3 } from 'lucide-react';

interface EquipmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento: Equipamento | null;
}

export const EquipmentEditModal: React.FC<EquipmentEditModalProps> = ({
  isOpen,
  onClose,
  equipamento,
}) => {
  const { categorias, setores, locais, updateEquipamento } = useInventory();

  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [valorAquisicao, setValorAquisicao] = useState<number | ''>('');
  const [garantiaMeses, setGarantiaMeses] = useState<number | ''>('');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (equipamento) {
      setNome(equipamento.nome);
      setCategoriaId(equipamento.categoria_id || '');
      setMarca(equipamento.marca || '');
      setModelo(equipamento.modelo || '');
      setNumeroSerie(equipamento.numero_serie || '');
      setFornecedor(equipamento.fornecedor || '');
      setValorAquisicao(equipamento.valor_aquisicao ?? '');
      setGarantiaMeses(equipamento.garantia_meses ?? '');
      setObservacoes(equipamento.observacoes || '');
    }
  }, [equipamento]);

  if (!equipamento) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateEquipamento(equipamento.id, {
        nome: nome.trim(),
        categoria_id: categoriaId,
        marca: marca.trim(),
        modelo: modelo.trim(),
        numero_serie: numeroSerie.trim(),
        fornecedor: fornecedor.trim(),
        valor_aquisicao: valorAquisicao === '' ? 0 : Number(valorAquisicao),
        garantia_meses: garantiaMeses === '' ? 0 : Number(garantiaMeses),
        observacoes: observacoes.trim(),
      });
      onClose();
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
          <Edit3 className="w-5 h-5 text-yellow-500" />
          <span>Editar Equipamento ({equipamento.codigo_patrimonial})</span>
        </div>
      }
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-zinc-700 mb-1">Nome do Equipamento *</label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            required
            className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Categoria</label>
            <select
              value={categoriaId}
              onChange={e => setCategoriaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
            >
              <option value="">Selecione...</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Nº de Série</label>
            <input
              type="text"
              value={numeroSerie}
              onChange={e => setNumeroSerie(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-yellow-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Marca</label>
            <input
              type="text"
              value={marca}
              onChange={e => setMarca(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Modelo</label>
            <input
              type="text"
              value={modelo}
              onChange={e => setModelo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Valor de Aquisição (R$)</label>
            <input
              type="number"
              step="0.01"
              value={valorAquisicao}
              onChange={e => setValorAquisicao(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-yellow-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Fornecedor</label>
            <input
              type="text"
              value={fornecedor}
              onChange={e => setFornecedor(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-zinc-700 mb-1">Observações</label>
          <textarea
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            rows={2}
            className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
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
            className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold shadow-sm"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
