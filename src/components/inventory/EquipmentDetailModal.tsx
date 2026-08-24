import React, { useState } from 'react';
import { Equipamento, EquipmentStatus, DecommissionReason } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { Barcode } from '../common/Barcode';
import { StatusBadge } from '../common/StatusBadge';
import { generateLabelsPDF } from '../../lib/pdf';
import {
  Boxes,
  Printer,
  FileDown,
  ArrowLeftRight,
  Wrench,
  RotateCcw,
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  Building,
  User,
  ShieldCheck,
  History,
  Clock,
} from 'lucide-react';

interface EquipmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento: Equipamento | null;
  onOpenTransfer?: (eq: Equipamento) => void;
  onOpenMaintenance?: (eq: Equipamento) => void;
  onOpenFinishMaintenance?: (eq: Equipamento) => void;
  onOpenStatusChange?: (eq: Equipamento) => void;
  onOpenDecommission?: (eq: Equipamento) => void;
  onOpenEdit?: (eq: Equipamento) => void;
}

export const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({
  isOpen,
  onClose,
  equipamento: propEquipamento,
  onOpenTransfer,
  onOpenMaintenance,
  onOpenFinishMaintenance,
  onOpenStatusChange,
  onOpenDecommission,
  onOpenEdit,
}) => {
  const { equipamentos, getEquipmentHistory, manutencoes } = useInventory();
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

  // Obtém sempre o registro vivo e mais recente da memória e da nuvem
  const equipamento = propEquipamento
    ? (equipamentos.find(e => e.id === propEquipamento.id || e.codigo_patrimonial === propEquipamento.codigo_patrimonial) || propEquipamento)
    : null;

  if (!equipamento) return null;

  const historyEvents = getEquipmentHistory(equipamento.id);
  const activeTicket = manutencoes.find(m => (m.equipamento_id === equipamento.id || m.equipamento_codigo === equipamento.codigo_patrimonial) && !m.concluida);

  const handlePrint = async () => {
    try {
      const doc = await generateLabelsPDF([equipamento], {
        template: 'PADRAO_50X30',
        includeCompany: true,
        includeName: true,
        includeCode: true,
        includeBarcode: true,
        includeSector: true,
        includeSerial: true,
        copiesPerItem: 1,
      });
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="font-mono text-yellow-600 font-black">{equipamento.codigo_patrimonial}</span>
          <span className="text-slate-400">•</span>
          <span className="truncate max-w-md">{equipamento.nome}</span>
        </div>
      }
      subtitle={`Cadastrado em ${new Date(equipamento.created_at).toLocaleDateString('pt-BR')}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Top Header Card com Barcode e Status */}
        <div className="bg-zinc-900 text-white rounded-2xl p-5 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <StatusBadge status={equipamento.status} size="lg" />
              <span className="text-xs text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-md">
                {equipamento.categoria_nome || 'Geral'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">{equipamento.nome}</h3>
            <p className="text-xs text-zinc-400">
              Setor: <strong className="text-yellow-400">{equipamento.setor_nome || 'Não definido'}</strong> • Local: <strong className="text-zinc-200">{equipamento.local_nome || 'Não definido'}</strong>
            </p>
            <p className="text-xs text-zinc-400">
              Responsável: <strong className="text-zinc-200">{equipamento.responsavel || 'Sem responsável'}</strong>
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-zinc-700 flex flex-col items-center justify-center shadow-md">
            <Barcode
              value={equipamento.codigo_patrimonial}
              width={1.6}
              height={42}
              fontSize={11}
            />
            <button
              onClick={handlePrint}
              className="mt-2 text-[10px] font-bold text-black bg-yellow-400 hover:bg-yellow-500 px-3 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              <Printer className="w-3 h-3" />
              <span>Imprimir Etiqueta</span>
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'border-yellow-400 text-zinc-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Ficha Técnica Completa</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-yellow-400 text-zinc-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Linha do Tempo / Histórico ({historyEvents.length})</span>
          </button>
        </div>

        {/* Conteúdo Aba 1: Ficha Técnica */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Marca:</span>
                <span className="font-semibold text-zinc-800">{equipamento.marca || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Modelo:</span>
                <span className="font-semibold text-zinc-800">{equipamento.modelo || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Nº de Série / Chassi:</span>
                <span className="font-semibold text-zinc-800 font-mono">{equipamento.numero_serie || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Valor de Aquisição:</span>
                <span className="font-semibold text-zinc-800 font-mono">
                  {equipamento.valor_aquisicao ? `R$ ${equipamento.valor_aquisicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Data de Compra:</span>
                <span className="font-semibold text-zinc-800">
                  {equipamento.data_aquisicao ? new Date(equipamento.data_aquisicao).toLocaleDateString('pt-BR') : '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Fornecedor:</span>
                <span className="font-semibold text-zinc-800 truncate block">{equipamento.fornecedor || '-'}</span>
              </div>
            </div>

            {equipamento.observacoes && (
              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-zinc-700">
                <span className="font-bold block text-amber-900 mb-0.5">Observações:</span>
                <p>{equipamento.observacoes}</p>
              </div>
            )}

            {equipamento.motivo_baixa && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                <span className="font-bold block text-red-900 mb-0.5">Equipamento Baixado:</span>
                <p>Motivo: <strong>{equipamento.motivo_baixa}</strong> | Data: {equipamento.data_baixa ? new Date(equipamento.data_baixa).toLocaleDateString('pt-BR') : '-'}</p>
                {equipamento.observacao_baixa && <p className="mt-1">{equipamento.observacao_baixa}</p>}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo Aba 2: Timeline de Histórico (Requirement #33) */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyEvents.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {historyEvents.map((event, idx) => (
                  <div key={event.id || idx} className="relative group text-xs">
                    {/* Marcador na linha */}
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white border-2 border-yellow-500 group-hover:scale-125 transition-transform" />

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900">{event.titulo}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(event.data_hora).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-slate-600">{event.descricao}</p>
                      <div className="text-[10px] text-slate-400 font-medium pt-1">
                        Registrado por: <strong className="text-zinc-700">{event.usuario_nome}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                Nenhum evento registrado no histórico deste equipamento.
              </div>
            )}
          </div>
        )}

        {/* Barra Inferior de Ações Rápidas Operacionais */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {hasPermission('transfer_equipment') && equipamento.status !== 'BAIXADO' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenTransfer) onOpenTransfer(equipamento);
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-800 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Transferir</span>
              </button>
            )}

            {hasPermission('open_maintenance') && equipamento.status !== 'EM MANUTENÇÃO' && equipamento.status !== 'BAIXADO' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenMaintenance) onOpenMaintenance(equipamento);
                }}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                <span>Enviar Manutenção</span>
              </button>
            )}

            {hasPermission('finish_maintenance') && equipamento.status === 'EM MANUTENÇÃO' && activeTicket && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenFinishMaintenance) onOpenFinishMaintenance(equipamento);
                }}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Finalizar Manutenção</span>
              </button>
            )}

            {hasPermission('edit_equipment') && equipamento.status !== 'BAIXADO' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenStatusChange) onOpenStatusChange(equipamento);
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-800 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>Alterar Status</span>
              </button>
            )}

            {hasPermission('decommission_equipment') && equipamento.status !== 'BAIXADO' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenDecommission) onOpenDecommission(equipamento);
                }}
                className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Dar Baixa</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasPermission('edit_equipment') && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenEdit) onOpenEdit(equipamento);
                }}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-black text-yellow-400 font-bold flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
