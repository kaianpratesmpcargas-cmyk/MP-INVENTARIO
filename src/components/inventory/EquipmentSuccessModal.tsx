import React from 'react';
import { Equipamento } from '../../types';
import { Modal } from '../common/Modal';
import { Barcode } from '../common/Barcode';
import { generateLabelsPDF } from '../../lib/pdf';
import { CheckCircle2, Printer, FileDown, Plus, Eye } from 'lucide-react';

interface EquipmentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento: Equipamento | null;
  onOpenNewAnother: () => void;
  onViewDetails: (eq: Equipamento) => void;
}

export const EquipmentSuccessModal: React.FC<EquipmentSuccessModalProps> = ({
  isOpen,
  onClose,
  equipamento,
  onOpenNewAnother,
  onViewDetails,
}) => {
  if (!equipamento) return null;

  const handlePrintPDF = async () => {
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
      // Abre janela de impressão direta
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch (err) {
      console.error('Erro ao imprimir etiqueta:', err);
    }
  };

  const handleDownloadPDF = async () => {
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
      doc.save(`etiqueta_${equipamento.codigo_patrimonial}.pdf`);
    } catch (err) {
      console.error('Erro ao baixar PDF da etiqueta:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="md">
      <div className="flex flex-col items-center text-center p-2">
        {/* Ícone Sucesso */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-3 shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-black text-zinc-900 mb-1">
          Equipamento Cadastrado com Sucesso!
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          O código patrimonial e a etiqueta Code 128 foram gerados automaticamente.
        </p>

        {/* Card Mock da Etiqueta Física */}
        <div className="w-full max-w-xs bg-white rounded-2xl border-2 border-dashed border-zinc-300 p-4 mb-6 shadow-sm relative group">
          <div className="text-[10px] font-black tracking-widest text-zinc-800 uppercase pb-1 border-b border-zinc-200 flex items-center justify-between">
            <span>MP CARGAS</span>
            <span className="text-yellow-600 font-mono">PATRIMÔNIO</span>
          </div>

          <div className="my-2">
            <div className="font-bold text-xs text-zinc-900 truncate">
              {equipamento.nome}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {equipamento.setor_nome || 'Geral'} • {equipamento.responsavel || '-'}
            </div>
          </div>

          {/* Barcode Render */}
          <div className="py-1 bg-white flex justify-center">
            <Barcode
              value={equipamento.codigo_patrimonial}
              width={1.6}
              height={40}
              fontSize={12}
            />
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-2.5 w-full mb-4">
          <button
            type="button"
            onClick={handlePrintPDF}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all hover:scale-[1.02]"
          >
            <Printer className="w-4 h-4" />
            <span>IMPRIMIR ETIQUETA</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-xs transition-all hover:scale-[1.02]"
          >
            <FileDown className="w-4 h-4 text-yellow-400" />
            <span>GERAR PDF</span>
          </button>
        </div>

        <div className="flex items-center justify-between w-full pt-3 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewDetails(equipamento);
            }}
            className="text-slate-600 hover:text-zinc-900 font-medium flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visualizar Detalhes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNewAnother();
            }}
            className="text-yellow-700 font-bold hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Outro</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
