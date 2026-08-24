import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { Equipamento, EquipmentStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Barcode } from '../common/Barcode';
import { Modal } from '../common/Modal';
import { soundService } from '../../lib/sound';
import { generateLabelsPDF } from '../../lib/pdf';
import { generateBatchZPL, downloadZPLFile, copyZPLToClipboard } from '../../lib/zpl';
import { getSupabaseClient } from '../../lib/supabase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Scan,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  Wrench,
  RotateCcw,
  RefreshCw,
  History,
  Edit3,
  Printer,
  Plus,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Layers,
  Trash2,
  FileDown,
  Copy,
  Clock,
  Boxes,
  CheckSquare,
  X,
  Code,
  PackageCheck,
  Check,
} from 'lucide-react';

interface ScannerViewProps {
  onOpenNewEquipmentWithCode: (code: string) => void;
  onOpenTransfer: (eq: Equipamento) => void;
  onOpenMaintenance: (eq: Equipamento) => void;
  onOpenFinishMaintenance: (eq: Equipamento) => void;
  onOpenStatusChange: (eq: Equipamento) => void;
  onOpenDecommission: (eq: Equipamento) => void;
  onOpenEdit: (eq: Equipamento) => void;
  onViewDetails: (eq: Equipamento) => void;
}

export type ScanState = 'IDLE' | 'FOUND' | 'NOT_FOUND';
export type ScannerMode = 'QUICK' | 'DETAILED' | 'BATCH';

interface ScannedBatchItem {
  equipment: Equipamento;
  scannedAt: string;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onOpenNewEquipmentWithCode,
  onOpenTransfer,
  onOpenMaintenance,
  onOpenFinishMaintenance,
  onOpenStatusChange,
  onOpenDecommission,
  onOpenEdit,
  onViewDetails,
}) => {
  const {
    findEquipmentByCode,
    configuracoes,
    toggleSound,
    manutencoes,
    setores,
    locais,
    createEquipamento,
    transferEquipamento,
    sendToMaintenance,
    changeEquipmentStatus,
  } = useInventory();
  const { hasPermission } = useAuth();

  // Modo de Operação (Rápido 1-Clique vs Detalhado vs Multi-Bipagem)
  const [scannerMode, setScannerMode] = useState<ScannerMode>('QUICK');

  // Estados de Leitura
  const [scanInput, setScanInput] = useState('');
  const [scanState, setScanState] = useState<ScanState>('IDLE');
  const [scannedCode, setScannedCode] = useState('');
  const [foundEquipment, setFoundEquipment] = useState<Equipamento | null>(null);
  const [lastScannedTime, setLastScannedTime] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Cadastro Rápido Inline (quando bipar código novo no modo rápido)
  const [quickName, setQuickName] = useState('');
  const [quickSetorId, setQuickSetorId] = useState('');
  const [quickResp, setQuickResp] = useState('');

  // Lote de Bipagem Contínua
  const [batchItems, setBatchItems] = useState<ScannedBatchItem[]>([]);
  const [batchStartTime, setBatchStartTime] = useState<string | null>(null);

  // Modais de Ações em Lote
  const [isBatchTransferOpen, setIsBatchTransferOpen] = useState(false);
  const [batchSetorId, setBatchSetorId] = useState('');
  const [batchLocalId, setBatchLocalId] = useState('');
  const [batchResponsavel, setBatchResponsavel] = useState('');
  const [batchMotivo, setBatchMotivo] = useState('');

  const [isBatchMaintenanceOpen, setIsBatchMaintenanceOpen] = useState(false);
  const [batchProblema, setBatchProblema] = useState('');
  const [batchPrevisao, setBatchPrevisao] = useState('');
  const [batchTecnico, setBatchTecnico] = useState('');

  const [isBatchStatusOpen, setIsBatchStatusOpen] = useState(false);
  const [batchNewStatus, setBatchNewStatus] = useState<EquipmentStatus>('EM ESTOQUE');

  const [isBatchZPLOpen, setIsBatchZPLOpen] = useState(false);
  const [zplCopied, setZplCopied] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Câmera Scanner
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Input Ref com Auto-focus permanente
  const inputRef = useRef<HTMLInputElement | null>(null);

  const keepFocus = () => {
    if (inputRef.current && !isCameraActive && !isBatchTransferOpen && !isBatchMaintenanceOpen && !isBatchStatusOpen && !isBatchZPLOpen) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    keepFocus();
    const interval = setInterval(keepFocus, 1000);
    return () => clearInterval(interval);
  }, [isCameraActive, isBatchTransferOpen, isBatchMaintenanceOpen, isBatchStatusOpen, isBatchZPLOpen]);

  // Executa processamento do código de barras (com consulta direta ao Supabase para busca universal)
  const handleProcessBarcode = async (code: string) => {
    const rawCode = code.trim().replace(/[\r\n\t]/g, '');
    if (!rawCode) return;

    setScannedCode(rawCode);
    const nowTime = new Date().toLocaleTimeString('pt-BR');
    setLastScannedTime(nowTime);
    setDuplicateWarning(null);

    let eq = findEquipmentByCode(rawCode);

    // Se não encontrou na memória local, faz consulta direta no Supabase (busca em nuvem em tempo real)
    if (!eq) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data: dbEq } = await supabase
            .from('equipamentos')
            .select('*')
            .or(`codigo_patrimonial.ilike.${rawCode},codigo_barras.ilike.${rawCode},numero_serie.ilike.${rawCode}`)
            .maybeSingle();

          if (dbEq) {
            eq = dbEq as Equipamento;
          }
        } catch (err) {
          console.warn('Consulta direta Supabase no scanner:', err);
        }
      }
    }

    if (scannerMode === 'QUICK' || scannerMode === 'DETAILED') {
      if (eq) {
        setFoundEquipment(eq);
        setScanState('FOUND');
        if (eq.status === 'EM MANUTENÇÃO') {
          soundService.playWarning();
        } else {
          soundService.playSuccess();
        }
      } else {
        setFoundEquipment(null);
        setScanState('NOT_FOUND');
        soundService.playError();
        // Preenche sugestão de nome
        setQuickName('');
        setQuickSetorId(setores[0]?.id || '');
        setQuickResp(setores[0]?.responsavel_padrao || '');
      }
    } else {
      // MODO MULTI-BIPAGEM EM LOTE
      if (!batchStartTime) {
        setBatchStartTime(nowTime);
      }

      if (eq) {
        const alreadyInBatch = batchItems.some(item => item.equipment.id === eq.id);
        if (alreadyInBatch) {
          setDuplicateWarning(`O item ${eq.codigo_patrimonial} (${eq.nome}) já está no lote!`);
          soundService.playWarning();
        } else {
          setBatchItems(prev => [{ equipment: eq, scannedAt: nowTime }, ...prev]);
          soundService.playSuccess();
        }
      } else {
        soundService.playError();
        setDuplicateWarning(`Código ${rawCode} NÃO cadastrado no inventário.`);
      }
    }

    setScanInput('');
  };

  // Submit do form do leitor USB
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanInput.trim()) {
      handleProcessBarcode(scanInput);
    }
  };

  // Reset
  const handleResetScanner = () => {
    setScanState('IDLE');
    setFoundEquipment(null);
    setScannedCode('');
    setScanInput('');
    keepFocus();
  };

  // Ação Rápida 1: Transferência Imediata de Setor com 1 Clique
  const handleQuickTransferSetor = async (newSetorId: string) => {
    if (!foundEquipment) return;
    const targetSetor = setores.find(s => s.id === newSetorId);
    if (!targetSetor) return;

    // Encontra primeiro local do setor ou usa padrão
    const local = locais.find(l => l.setor_id === newSetorId);
    await transferEquipamento(
      foundEquipment.id,
      newSetorId,
      local?.id || '',
      targetSetor.responsavel_padrao || foundEquipment.responsavel,
      'Transferência rápida via Estação Scanner'
    );

    const updatedEq = {
      ...foundEquipment,
      setor_id: newSetorId,
      setor_nome: targetSetor.nome,
      local_id: local?.id || '',
      local_nome: local?.nome || '',
      responsavel: targetSetor.responsavel_padrao || foundEquipment.responsavel,
    };
    setFoundEquipment(updatedEq);

    soundService.playSuccess();
    setActionSuccessMsg(`Transferido para ${targetSetor.nome} com sucesso!`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Ação Rápida 2: Enviar Manutenção com 1 Clique
  const handleQuickSendMaintenance = async () => {
    if (!foundEquipment) return;
    await sendToMaintenance(
      foundEquipment.id,
      'Equipamento com defeito / Danificado',
      'Abertura rápida pelo operador na estação scanner'
    );

    setFoundEquipment({ ...foundEquipment, status: 'EM MANUTENÇÃO' });
    soundService.playWarning();
    setActionSuccessMsg('Equipamento enviado para MANUTENÇÃO!');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Ação Rápida 3: Devolver ao Estoque com 1 Clique
  const handleQuickReturnToStock = async () => {
    if (!foundEquipment) return;
    await changeEquipmentStatus(foundEquipment.id, 'EM ESTOQUE', 'Item guardado no almoxarifado/estoque');
    setFoundEquipment({ ...foundEquipment, status: 'EM ESTOQUE' });
    soundService.playSuccess();
    setActionSuccessMsg('Status atualizado para DISPONÍVEL EM ESTOQUE!');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Cadastro Rápido em 5 segundos
  const handleQuickSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    const targetSetor = setores.find(s => s.id === quickSetorId) || setores[0];
    const targetLocal = locais.find(l => l.setor_id === targetSetor?.id);

    const created = await createEquipamento({
      codigo_patrimonial: scannedCode,
      codigo_barras: scannedCode,
      nome: quickName.trim(),
      setor_id: targetSetor?.id || '',
      setor_nome: targetSetor?.nome || 'Geral',
      local_id: targetLocal?.id || '',
      local_nome: targetLocal?.nome || '',
      responsavel: quickResp.trim() || targetSetor?.responsavel_padrao || 'Operador',
      status: 'EM ESTOQUE',
    });

    setFoundEquipment(created);
    setScanState('FOUND');
    soundService.playSuccess();
    setActionSuccessMsg(`Item ${created.nome} cadastrado com sucesso!`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Remover do lote
  const handleRemoveFromBatch = (id: string) => {
    setBatchItems(prev => prev.filter(item => item.equipment.id !== id));
  };

  // Limpar lote
  const handleClearBatch = () => {
    if (batchItems.length === 0) return;
    if (window.confirm('Deseja realmente limpar toda a lista da sessão de bipagem?')) {
      setBatchItems([]);
      setBatchStartTime(null);
      setDuplicateWarning(null);
      keepFocus();
    }
  };

  // Executar Transferência em Lote
  const handleExecuteBatchTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchSetorId || !batchLocalId || batchItems.length === 0) return;

    for (const item of batchItems) {
      await transferEquipamento(
        item.equipment.id,
        batchSetorId,
        batchLocalId,
        batchResponsavel.trim() || item.equipment.responsavel,
        batchMotivo.trim() || 'Transferência em Lote via Estação Scanner'
      );
    }

    setIsBatchTransferOpen(false);
    setActionSuccessMsg(`Transferência de ${batchItems.length} equipamentos concluída com sucesso!`);
    setBatchItems([]);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Executar Envio em Lote para Manutenção
  const handleExecuteBatchMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchProblema.trim() || batchItems.length === 0) return;

    for (const item of batchItems) {
      await sendToMaintenance(
        item.equipment.id,
        batchProblema.trim(),
        'Abertura em lote via Estação Scanner de Galpão',
        batchTecnico.trim() || undefined,
        batchPrevisao || undefined,
        undefined
      );
    }

    setIsBatchMaintenanceOpen(false);
    setActionSuccessMsg(`${batchItems.length} equipamentos enviados para manutenção!`);
    setBatchItems([]);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Executar Alteração de Status em Lote
  const handleExecuteBatchStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (batchItems.length === 0) return;

    for (const item of batchItems) {
      await changeEquipmentStatus(
        item.equipment.id,
        batchNewStatus,
        'Alteração de status em lote via Estação Scanner'
      );
    }

    setIsBatchStatusOpen(false);
    setActionSuccessMsg(`Status de ${batchItems.length} equipamentos atualizado para ${batchNewStatus}!`);
    setBatchItems([]);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Exportar Lote para CSV
  const handleExportBatchCSV = () => {
    if (batchItems.length === 0) return;
    const headers = ['Hora Bip', 'Código Patrimonial', 'Equipamento', 'Marca', 'Modelo', 'Nº Série', 'Setor Atual', 'Local Atual', 'Responsável', 'Status'];
    const rows = batchItems.map(item => [
      item.scannedAt,
      item.equipment.codigo_patrimonial,
      `"${item.equipment.nome.replace(/"/g, '""')}"`,
      `"${(item.equipment.marca || '').replace(/"/g, '""')}"`,
      `"${(item.equipment.modelo || '').replace(/"/g, '""')}"`,
      item.equipment.numero_serie || '',
      `"${(item.equipment.setor_nome || '').replace(/"/g, '""')}"`,
      `"${(item.equipment.local_nome || '').replace(/"/g, '""')}"`,
      `"${(item.equipment.responsavel || '').replace(/"/g, '""')}"`,
      item.equipment.status,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lote_bipagem_${batchItems.length}_itens_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Imprimir PDF
  const handlePrintLabel = async (eq: Equipamento) => {
    try {
      const doc = await generateLabelsPDF([eq], {
        template: 'PADRAO_50X30',
        includeCompany: true,
        includeName: true,
        includeCode: true,
        includeBarcode: true,
        includeSector: true,
        includeSerial: true,
        copiesPerItem: 1,
      }, configuracoes.empresa_nome);
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch (e) {
      console.error(e);
    }
  };

  // Imprimir PDF do Lote
  const handlePrintBatchPDF = async () => {
    if (batchItems.length === 0) return;
    const equips = batchItems.map(b => b.equipment);
    const doc = await generateLabelsPDF(equips, {
      template: 'PADRAO_50X30',
      includeCompany: true,
      includeName: true,
      includeCode: true,
      includeBarcode: true,
      includeSector: true,
      includeSerial: true,
      copiesPerItem: 1,
    }, configuracoes.empresa_nome);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  // Câmera
  const toggleCamera = async () => {
    if (isCameraActive) {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch (e) {
          console.warn(e);
        }
        html5QrCodeRef.current = null;
      }
      setIsCameraActive(false);
      setCameraError(null);
      keepFocus();
    } else {
      setCameraError(null);
      setIsCameraActive(true);

      setTimeout(async () => {
        try {
          const qrCodeScanner = new Html5Qrcode('camera-scanner-reader');
          html5QrCodeRef.current = qrCodeScanner;

          const config = {
            fps: 15,
            qrbox: { width: 280, height: 160 },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.EAN_13,
            ],
          };

          await qrCodeScanner.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              handleProcessBarcode(decodedText);
            },
            () => {}
          );
        } catch (err: any) {
          console.error('Erro ao abrir câmera:', err);
          setCameraError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
          setIsCameraActive(false);
        }
      }, 300);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const activeTicket = foundEquipment ? manutencoes.find(m => m.equipamento_id === foundEquipment.id && !m.concluida) : null;
  const filteredLocais = locais.filter(l => !batchSetorId || l.setor_id === batchSetorId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12">
      {/* Mensagem Flutuante de Sucesso */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-3 font-extrabold text-sm animate-fadeIn">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Top Header da Estação com Seletor de Modo Simplificado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 text-white p-4 sm:p-5 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-yellow-400 text-black flex items-center justify-center font-black shadow-yellow-glow flex-shrink-0">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-extrabold flex items-center gap-2 leading-none">
              <span>ESTAÇÃO DE BIPAGEM</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                ONLINE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Bipe com leitor USB/Bluetooth ou câmera do celular.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de 3 Modos */}
          <div className="flex bg-black p-1 rounded-2xl border border-zinc-800">
            <button
              onClick={() => {
                setScannerMode('QUICK');
                setDuplicateWarning(null);
                keepFocus();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                scannerMode === 'QUICK'
                  ? 'bg-yellow-400 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Modo Fácil (1-Clique)</span>
            </button>

            <button
              onClick={() => {
                setScannerMode('DETAILED');
                setDuplicateWarning(null);
                keepFocus();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                scannerMode === 'DETAILED'
                  ? 'bg-yellow-400 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Ficha Completa
            </button>

            <button
              onClick={() => {
                setScannerMode('BATCH');
                setDuplicateWarning(null);
                keepFocus();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                scannerMode === 'BATCH'
                  ? 'bg-yellow-400 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Lote ({batchItems.length})</span>
            </button>
          </div>

          {/* Botão Câmera */}
          <button
            onClick={toggleCamera}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isCameraActive
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-yellow-400 border border-zinc-700'
            }`}
          >
            {isCameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          </button>

          {/* Som */}
          <button
            onClick={toggleSound}
            title={configuracoes.som_ativo ? 'Som ativado' : 'Som mudo'}
            className={`p-2 rounded-xl border transition-colors ${
              configuracoes.som_ativo
                ? 'bg-amber-500/10 border-amber-500/30 text-yellow-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-500'
            }`}
          >
            {configuracoes.som_ativo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Câmera Stream */}
      {isCameraActive && (
        <div className="bg-black rounded-3xl p-4 border-2 border-yellow-400 shadow-2xl text-center animate-fadeIn">
          <div className="text-xs font-bold text-yellow-400 mb-2 flex items-center justify-center gap-1.5 uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            <span>Aponte a câmera para o Código de Barras</span>
          </div>
          <div id="camera-scanner-reader" className="w-full max-w-md mx-auto rounded-2xl overflow-hidden" />
          {cameraError && <div className="p-3 bg-red-500/20 text-red-400 text-xs rounded-xl mt-3">{cameraError}</div>}
        </div>
      )}

      {/* Alerta de Duplicidade */}
      {duplicateWarning && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
          <button onClick={() => setDuplicateWarning(null)} className="text-amber-700 hover:text-amber-900 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Campo Central de Leitura USB / Digitação */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
        <form onSubmit={handleFormSubmit} className="relative">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
              {scannerMode === 'BATCH' ? 'BIPAGEM CONTÍNUA (LOTE)' : 'LEITURA RÁPIDA (BIPADOR OU CÂMERA)'}
            </label>
            <span className="text-[11px] text-yellow-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono">
              FOCO ATIVO
            </span>
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              placeholder="Aproxime o leitor ou digite o código..."
              autoFocus
              className="w-full bg-slate-50 border-2 border-yellow-400 text-center font-mono font-black text-xl sm:text-2xl text-zinc-900 rounded-2xl py-4 px-6 focus:outline-none focus:ring-4 focus:ring-yellow-400/20 focus:bg-white transition-all placeholder:text-slate-400 placeholder:text-base placeholder:font-sans placeholder:font-normal shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-zinc-900 hover:bg-black text-yellow-400 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-transform active:scale-95"
            >
              BIPAR
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* MODO 1: MODO RÁPIDO / OPERADOR (SUPER SIMPLES & 1-CLIQUE)                  */}
      {/* ========================================================================= */}
      {scannerMode === 'QUICK' && (
        <>
          {scanState === 'IDLE' && (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-yellow-400/20 text-yellow-600 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-zinc-900 mb-1">
                Bipe qualquer equipamento agora
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Basta acionar o gatilho do leitor óptico para ver o item e transferir ou enviar para manutenção com 1 toque.
              </p>
            </div>
          )}

          {scanState === 'FOUND' && foundEquipment && (
            <div className="bg-white rounded-3xl border-2 border-emerald-400 shadow-xl p-6 sm:p-8 animate-fadeIn space-y-6">
              {/* Header do Equipamento Bipado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black flex-shrink-0 shadow-md">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-black text-yellow-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {foundEquipment.codigo_patrimonial}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-zinc-900 mt-1">
                      {foundEquipment.nome}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={foundEquipment.status} size="md" />
                  <button
                    onClick={handleResetScanner}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-800 font-bold text-xs"
                  >
                    Próximo
                  </button>
                </div>
              </div>

              {/* Informações Resumidas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block font-semibold">SETOR ATUAL</span>
                  <strong className="text-zinc-900 text-sm">{foundEquipment.setor_nome || 'Geral'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">LOCAL / SALA</span>
                  <strong className="text-zinc-900 text-sm">{foundEquipment.local_nome || 'Sem local'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">RESPONSÁVEL</span>
                  <strong className="text-zinc-900 text-sm">{foundEquipment.responsavel || '-'}</strong>
                </div>
              </div>

              {/* PAINEL DE AÇÕES RÁPIDAS (1-TOQUE) */}
              <div className="space-y-4 pt-2">
                <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                  ESCOLHA O QUE FAZER (1 CLIQUE):
                </div>

                {/* Bloco 1: MUDAR DE SETOR */}
                <div className="p-4 bg-slate-100/70 rounded-2xl border border-slate-200 space-y-2.5">
                  <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                    <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                    <span>MUDAR PARA OUTRO SETOR (Clique no destino):</span>
                  </span>

                  <div className="flex flex-wrap gap-2">
                    {setores.map(s => {
                      const isCurrent = s.id === foundEquipment.setor_id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => !isCurrent && handleQuickTransferSetor(s.id)}
                          disabled={isCurrent}
                          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                            isCurrent
                              ? 'bg-blue-600 text-white shadow-sm cursor-default'
                              : 'bg-white hover:bg-blue-50 text-zinc-800 border border-slate-200 hover:border-blue-300 hover:scale-[1.02]'
                          }`}
                        >
                          {isCurrent && <Check className="w-3.5 h-3.5" />}
                          <span>{s.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bloco 2: Ações Diretas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Manutenção */}
                  {foundEquipment.status !== 'EM MANUTENÇÃO' ? (
                    <button
                      onClick={handleQuickSendMaintenance}
                      className="p-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border-2 border-amber-300 font-extrabold text-xs flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                    >
                      <Wrench className="w-5 h-5 text-amber-600" />
                      <span>ESTÁ COM DEFEITO / MANUTENÇÃO</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenFinishMaintenance(foundEquipment)}
                      className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                    >
                      <RotateCcw className="w-5 h-5" />
                      <span>CONCLUIR REPARO / LIBERAR</span>
                    </button>
                  )}

                  {/* Devolver Estoque */}
                  <button
                    onClick={handleQuickReturnToStock}
                    className="p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-2 border-emerald-300 font-extrabold text-xs flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                  >
                    <PackageCheck className="w-5 h-5 text-emerald-600" />
                    <span>GUARDAR / DISPONÍVEL NO ESTOQUE</span>
                  </button>

                  {/* Imprimir Etiqueta */}
                  <button
                    onClick={() => handlePrintLabel(foundEquipment)}
                    className="p-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.02] shadow-xs"
                  >
                    <Printer className="w-5 h-5" />
                    <span>IMPRIMIR ETIQUETA P&B</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {scanState === 'NOT_FOUND' && (
            <div className="bg-white rounded-3xl border-2 border-yellow-400 shadow-xl p-6 sm:p-8 animate-fadeIn space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-black flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-mono font-black text-amber-700 uppercase">CÓDIGO NOVO DETECTADO</span>
                  <h3 className="text-xl font-black text-zinc-900 font-mono">{scannedCode}</h3>
                </div>
              </div>

              {/* Formulário de Cadastro Rápido em 5 segundos */}
              <form onSubmit={handleQuickSaveNew} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
                <div className="font-extrabold text-zinc-800 text-sm">
                  ⚡ Cadastrar Este Item Rapidamente:
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Nome do Equipamento *</label>
                  <input
                    type="text"
                    value={quickName}
                    onChange={e => setQuickName(e.target.value)}
                    placeholder="Ex: Paleteira Manual 02, Notebook Dell..."
                    required
                    autoFocus
                    className="w-full bg-white border-2 border-yellow-400 rounded-xl px-3.5 py-2.5 text-sm font-bold text-zinc-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Setor Inicial:</label>
                  <div className="flex flex-wrap gap-2">
                    {setores.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setQuickSetorId(s.id);
                          setQuickResp(s.responsavel_padrao || '');
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          quickSetorId === s.id
                            ? 'bg-zinc-900 text-yellow-400 shadow-sm'
                            : 'bg-white text-zinc-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s.nome}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-sm uppercase rounded-xl shadow-yellow-glow transition-transform active:scale-95"
                  >
                    SALVAR E CONCLUIR CADASTRO
                  </button>
                  <button
                    type="button"
                    onClick={handleResetScanner}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODO 2: FICHA COMPLETA (DETALHADA)                                        */}
      {/* ========================================================================= */}
      {scannerMode === 'DETAILED' && (
        <>
          {scanState === 'IDLE' && (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
              <Scan className="w-8 h-8 text-yellow-500 mx-auto mb-2 animate-pulse" />
              <h3 className="text-base font-bold text-zinc-800">Aguardando leitura de código...</h3>
            </div>
          )}

          {scanState === 'FOUND' && foundEquipment && (
            <div className="bg-white rounded-3xl border-2 border-emerald-400 shadow-xl p-6 sm:p-8 animate-fadeIn space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-yellow-600">{foundEquipment.codigo_patrimonial}</span>
                  <h3 className="text-2xl font-black text-zinc-900">{foundEquipment.nome}</h3>
                </div>
                <StatusBadge status={foundEquipment.status} size="md" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block font-semibold">MARCA/MODELO</span>
                  <strong className="text-zinc-900">{foundEquipment.marca} {foundEquipment.modelo}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block font-semibold">SETOR</span>
                  <strong className="text-zinc-900">{foundEquipment.setor_nome || '-'}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block font-semibold">RESPONSÁVEL</span>
                  <strong className="text-zinc-900">{foundEquipment.responsavel || '-'}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block font-semibold">Nº SÉRIE</span>
                  <strong className="text-zinc-900 font-mono">{foundEquipment.numero_serie || '-'}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <button
                  onClick={() => onOpenTransfer(foundEquipment)}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-800 font-bold text-xs"
                >
                  Transferir Completo
                </button>
                <button
                  onClick={() => onOpenMaintenance(foundEquipment)}
                  className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs"
                >
                  Ordem de Manutenção
                </button>
                <button
                  onClick={() => onViewDetails(foundEquipment)}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-800 font-bold text-xs"
                >
                  Histórico / Ficha
                </button>
                <button
                  onClick={() => onOpenEdit(foundEquipment)}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-800 font-bold text-xs"
                >
                  Editar Cadastro
                </button>
              </div>
            </div>
          )}

          {scanState === 'NOT_FOUND' && (
            <div className="bg-white rounded-3xl border-2 border-red-400 p-8 text-center space-y-4">
              <div className="font-mono text-2xl font-black">{scannedCode}</div>
              <p className="text-xs text-slate-500">Código não cadastrado no inventário.</p>
              <button
                onClick={() => onOpenNewEquipmentWithCode(scannedCode)}
                className="px-6 py-2.5 rounded-xl bg-yellow-400 font-extrabold text-xs uppercase"
              >
                Cadastrar Ficha Completa
              </button>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODO 3: MULTI-BIPAGEM (LOTE)                                              */}
      {/* ========================================================================= */}
      {scannerMode === 'BATCH' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-yellow-400 text-black flex flex-col items-center justify-center font-black shadow-yellow-glow flex-shrink-0">
                <span className="text-2xl font-mono leading-none">{batchItems.length}</span>
                <span className="text-[9px] uppercase tracking-tighter mt-0.5">ITENS</span>
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                  <span>Sessão de Bipagem Contínua</span>
                  {batchStartTime && (
                    <span className="text-[10px] text-slate-500 font-mono font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Iniciado às {batchStartTime}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bipe quantos itens quiser em sequência. Em seguida, execute ações coletivas em 1 clique.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsBatchTransferOpen(true)}
                disabled={batchItems.length === 0}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 shadow-xs"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Transferir Lote ({batchItems.length})</span>
              </button>

              <button
                onClick={() => setIsBatchMaintenanceOpen(true)}
                disabled={batchItems.length === 0}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 shadow-xs"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Enviar Manutenção</span>
              </button>

              <button
                onClick={() => setIsBatchStatusOpen(true)}
                disabled={batchItems.length === 0}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-900 text-yellow-400 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Trocar Status</span>
              </button>

              <button
                onClick={handlePrintBatchPDF}
                disabled={batchItems.length === 0}
                className="p-2 rounded-xl border border-slate-200 text-zinc-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                title="Imprimir PDF das etiquetas do lote"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsBatchZPLOpen(true)}
                disabled={batchItems.length === 0}
                className="p-2 rounded-xl border border-slate-200 text-zinc-700 hover:bg-slate-100 transition-colors disabled:opacity-40 font-mono text-xs font-bold"
                title="Gerar código ZPL para impressora Zebra"
              >
                <Code className="w-4 h-4 text-yellow-600" />
              </button>

              <button
                onClick={handleExportBatchCSV}
                disabled={batchItems.length === 0}
                className="p-2 rounded-xl border border-slate-200 text-zinc-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                title="Exportar lista da sessão para CSV"
              >
                <FileDown className="w-4 h-4" />
              </button>

              {batchItems.length > 0 && (
                <button
                  onClick={handleClearBatch}
                  className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  title="Limpar toda a lista"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            {batchItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-white font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Hora</th>
                      <th className="py-3 px-4">Código PAT</th>
                      <th className="py-3 px-4">Equipamento</th>
                      <th className="py-3 px-4">Setor Atual</th>
                      <th className="py-3 px-4">Responsável</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchItems.map((item, idx) => (
                      <tr key={item.equipment.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 font-bold">{batchItems.length - idx}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{item.scannedAt}</td>
                        <td className="py-3 px-4 font-mono font-black text-yellow-600">{item.equipment.codigo_patrimonial}</td>
                        <td className="py-3 px-4 font-bold text-zinc-900">{item.equipment.nome}</td>
                        <td className="py-3 px-4 text-slate-600">{item.equipment.setor_nome || '-'}</td>
                        <td className="py-3 px-4 text-slate-600">{item.equipment.responsavel || '-'}</td>
                        <td className="py-3 px-4"><StatusBadge status={item.equipment.status} size="sm" /></td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRemoveFromBatch(item.equipment.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Remover deste lote"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400">
                <Boxes className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <div className="font-bold text-zinc-700">Nenhum equipamento bipado no lote ainda</div>
                <div className="text-xs text-slate-400 mt-0.5">Use o leitor de código de barras para adicionar itens continuamente.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modais de Lote */}
      <Modal
        isOpen={isBatchTransferOpen}
        onClose={() => setIsBatchTransferOpen(false)}
        title={`Transferir Lote de ${batchItems.length} Equipamentos`}
        maxWidth="md"
      >
        <form onSubmit={handleExecuteBatchTransfer} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Setor de Destino *</label>
            <select
              value={batchSetorId}
              onChange={e => {
                setBatchSetorId(e.target.value);
                setBatchLocalId('');
              }}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
            >
              <option value="">Selecione o setor...</option>
              {setores.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Local / Sala de Destino *</label>
            <select
              value={batchLocalId}
              onChange={e => setBatchLocalId(e.target.value)}
              required
              disabled={!batchSetorId}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400 disabled:opacity-50"
            >
              <option value="">Selecione o local...</option>
              {filteredLocais.map(l => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBatchTransferOpen(false)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Confirmar Transferência em Massa
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isBatchMaintenanceOpen}
        onClose={() => setIsBatchMaintenanceOpen(false)}
        title={`Enviar ${batchItems.length} Equipamentos para Manutenção`}
        maxWidth="md"
      >
        <form onSubmit={handleExecuteBatchMaintenance} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Problema / Motivo do Envio *</label>
            <input
              type="text"
              value={batchProblema}
              onChange={e => setBatchProblema(e.target.value)}
              required
              placeholder="Ex: Revisão de rotina..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBatchMaintenanceOpen(false)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
            >
              Confirmar Envio Coletivo
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isBatchStatusOpen}
        onClose={() => setIsBatchStatusOpen(false)}
        title={`Alterar Status de ${batchItems.length} Equipamentos`}
        maxWidth="md"
      >
        <form onSubmit={handleExecuteBatchStatusChange} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Novo Status Operacional *</label>
            <select
              value={batchNewStatus}
              onChange={e => setBatchNewStatus(e.target.value as EquipmentStatus)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-yellow-400"
            >
              <option value="EM ESTOQUE">EM ESTOQUE</option>
              <option value="EM USO">EM USO</option>
              <option value="DANIFICADO">DANIFICADO</option>
              <option value="AGUARDANDO DESCARTE">AGUARDANDO DESCARTE</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBatchStatusOpen(false)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold"
            >
              Aplicar Status ao Lote
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isBatchZPLOpen}
        onClose={() => setIsBatchZPLOpen(false)}
        title={`Código ZPL para Impressoras Zebra (${batchItems.length} etiquetas)`}
        maxWidth="lg"
      >
        <div className="space-y-3 text-xs">
          <div className="relative bg-zinc-950 text-emerald-400 p-3.5 rounded-xl font-mono text-[11px] max-h-60 overflow-y-auto border border-zinc-800">
            <pre className="whitespace-pre-wrap">
              {generateBatchZPL(batchItems.map(b => b.equipment), configuracoes.empresa_nome, 'PADRAO_50X30')}
            </pre>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={async () => {
                const zpl = generateBatchZPL(batchItems.map(b => b.equipment), configuracoes.empresa_nome, 'PADRAO_50X30');
                const ok = await copyZPLToClipboard(zpl);
                if (ok) {
                  setZplCopied(true);
                  setTimeout(() => setZplCopied(false), 2500);
                }
              }}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-yellow-400" />
              <span>{zplCopied ? 'COPIADO!' : 'COPIAR ZPL'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const zpl = generateBatchZPL(batchItems.map(b => b.equipment), configuracoes.empresa_nome, 'PADRAO_50X30');
                downloadZPLFile(`lote_etiquetas_${batchItems.length}_itens.zpl`, zpl);
              }}
              className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>BAIXAR ARQUIVO .ZPL</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
