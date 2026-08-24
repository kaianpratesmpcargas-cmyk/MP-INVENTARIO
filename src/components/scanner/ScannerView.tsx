import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { Equipamento } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Barcode } from '../common/Barcode';
import { soundService } from '../../lib/sound';
import { generateLabelsPDF } from '../../lib/pdf';
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
  const { findEquipmentByCode, configuracoes, toggleSound, manutencoes } = useInventory();
  const { hasPermission } = useAuth();

  // Estados de Leitura
  const [scanInput, setScanInput] = useState('');
  const [scanState, setScanState] = useState<ScanState>('IDLE');
  const [scannedCode, setScannedCode] = useState('');
  const [foundEquipment, setFoundEquipment] = useState<Equipamento | null>(null);
  const [lastScannedTime, setLastScannedTime] = useState<string | null>(null);

  // Câmera Scanner
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Input Ref com Auto-focus permanente
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autoResetTimerRef = useRef<any>(null);

  // Mantém o input permanentemente focado para leitores USB
  const keepFocus = () => {
    if (inputRef.current && !isCameraActive) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    keepFocus();
    const interval = setInterval(keepFocus, 1000);
    return () => clearInterval(interval);
  }, [isCameraActive]);

  // Executa busca do código
  const handleProcessBarcode = (code: string) => {
    const rawCode = code.trim().replace(/[\r\n\t]/g, '');
    if (!rawCode) return;

    setScannedCode(rawCode);
    setLastScannedTime(new Date().toLocaleTimeString('pt-BR'));

    const eq = findEquipmentByCode(rawCode);

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
    }

    setScanInput('');
  };

  // Submit do form do leitor USB (quando o leitor envia Enter automático)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanInput.trim()) {
      handleProcessBarcode(scanInput);
    }
  };

  // Reset para aguardar próxima leitura
  const handleResetScanner = () => {
    setScanState('IDLE');
    setFoundEquipment(null);
    setScannedCode('');
    setScanInput('');
    keepFocus();
  };

  // Controle de Câmera com html5-qrcode
  const toggleCamera = async () => {
    if (isCameraActive) {
      // Parar Câmera
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
      // Iniciar Câmera
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
              // Para câmera após leitura com sucesso se desejar, ou mantém
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

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
      if (autoResetTimerRef.current) {
        clearTimeout(autoResetTimerRef.current);
      }
    };
  }, []);

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
      });
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch (e) {
      console.error(e);
    }
  };

  const activeTicket = foundEquipment ? manutencoes.find(m => m.equipamento_id === foundEquipment.id && !m.concluida) : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Top Header da Estação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 text-white p-5 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-yellow-400 text-black flex items-center justify-center font-black shadow-yellow-glow">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-extrabold flex items-center gap-2">
              <span>ESTAÇÃO SCANNER OPERACIONAL</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                ONLINE
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Pronto para leitores USB/Bluetooth ou câmera em tempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Câmera */}
          <button
            onClick={toggleCamera}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              isCameraActive
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-yellow-400 border border-zinc-700'
            }`}
          >
            {isCameraActive ? (
              <>
                <CameraOff className="w-4 h-4" />
                <span>FECHAR CÂMERA</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>ESCANEAR COM CÂMERA</span>
              </>
            )}
          </button>

          {/* Som Toggle */}
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

      {/* Câmera Stream Container (quando ativa) */}
      {isCameraActive && (
        <div className="bg-black rounded-3xl p-4 border-2 border-yellow-400 shadow-2xl overflow-hidden text-center animate-fadeIn">
          <div className="text-xs font-bold text-yellow-400 mb-2 flex items-center justify-center gap-1.5 uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            <span>Aponte a câmera para o Código de Barras Code 128</span>
          </div>
          <div id="camera-scanner-reader" className="w-full max-w-md mx-auto rounded-2xl overflow-hidden" />
          {cameraError && (
            <div className="p-3 bg-red-500/20 text-red-400 text-xs rounded-xl mt-3">
              {cameraError}
            </div>
          )}
        </div>
      )}

      {/* Grande Campo de Leitura Central USB */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleFormSubmit} className="relative">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 text-center">
            CAMPO DE LEITURA DO LEITOR USB / DIGITAÇÃO RÁPIDA
          </label>

          <div className="relative max-w-2xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              placeholder="Aguardando bipagem do código..."
              autoFocus
              className="w-full bg-slate-50 border-2 border-yellow-400 text-center font-mono font-black text-xl sm:text-2xl text-zinc-900 rounded-2xl py-4 px-6 focus:outline-none focus:ring-4 focus:ring-yellow-400/20 focus:bg-white transition-all placeholder:text-slate-400 placeholder:text-lg placeholder:font-sans placeholder:font-normal shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-zinc-900 hover:bg-black text-yellow-400 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-transform active:scale-95"
            >
              CONSULTAR
            </button>
          </div>

          <div className="text-center text-[11px] text-slate-400 mt-2">
            O campo permanece focado automaticamente. Basta pressionar o gatilho do leitor óptico.
          </div>
        </form>
      </div>

      {/* PAINEL DE FEEDBACK VISUAL INSTANTÂNEO */}

      {/* ESTADO 1: IDLE / AGUARDANDO LEITURA */}
      {scanState === 'IDLE' && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs text-slate-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Scan className="w-8 h-8 text-yellow-500" />
          </div>
          <h3 className="text-base font-bold text-zinc-800 mb-1">
            Aguardando Leitura de Código de Barras...
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Aproxime o leitor USB do equipamento ou clique em "Escanear com Câmera" para consultar instantaneamente.
          </p>

          {/* Atalhos Rápidos para Testar */}
          <div className="mt-8 pt-6 border-t border-slate-200/80 max-w-lg mx-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Bipar códigos de teste com 1 clique:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleProcessBarcode('PAT-000001')}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-yellow-400 hover:text-black border border-slate-200 text-xs font-mono font-bold text-zinc-700 transition-colors shadow-xs"
              >
                PAT-000001 (Notebook)
              </button>
              <button
                type="button"
                onClick={() => handleProcessBarcode('PAT-000002')}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-yellow-400 hover:text-black border border-slate-200 text-xs font-mono font-bold text-zinc-700 transition-colors shadow-xs"
              >
                PAT-000002 (Coletor)
              </button>
              <button
                type="button"
                onClick={() => handleProcessBarcode('PAT-000003')}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-400 hover:text-black border border-slate-200 text-xs font-mono font-bold text-zinc-700 transition-colors shadow-xs"
              >
                PAT-000003 (Manutenção)
              </button>
              <button
                type="button"
                onClick={() => handleProcessBarcode('PAT-000999')}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-red-400 hover:text-white border border-slate-200 text-xs font-mono font-bold text-zinc-700 transition-colors shadow-xs"
              >
                PAT-000999 (Não Cadastrado)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESTADO 2: 🟢 EQUIPAMENTO ENCONTRADO (Requirement #25) */}
      {scanState === 'FOUND' && foundEquipment && (
        <div className="bg-white rounded-3xl border-2 border-emerald-400 shadow-2xl p-6 sm:p-8 animate-fadeIn space-y-6">
          {/* Header Sucesso */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  EQUIPAMENTO LOCALIZADO COM SUCESSO
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-900">
                  {foundEquipment.nome}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Lido às {lastScannedTime}</span>
              <button
                onClick={handleResetScanner}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-700 font-bold text-xs transition-colors"
              >
                Próxima Leitura
              </button>
            </div>
          </div>

          {/* Grid Operacional: O QUE É? ONDE ESTÁ? QUEM É O RESPONSÁVEL? QUAL O STATUS? */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* O QUE É */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                1. IDENTIFICAÇÃO
              </span>
              <div className="font-mono font-black text-base text-yellow-600">
                {foundEquipment.codigo_patrimonial}
              </div>
              <div className="text-xs font-semibold text-zinc-800">
                {foundEquipment.marca} {foundEquipment.modelo}
              </div>
              {foundEquipment.numero_serie && (
                <div className="text-[11px] text-slate-500 font-mono">
                  S/N: {foundEquipment.numero_serie}
                </div>
              )}
            </div>

            {/* ONDE ESTÁ */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                2. LOCALIZAÇÃO ATUAL
              </span>
              <div className="font-bold text-sm text-zinc-900">
                {foundEquipment.setor_nome || 'Sem setor'}
              </div>
              <div className="text-xs text-slate-600">
                {foundEquipment.local_nome || 'Sem local físico'}
              </div>
            </div>

            {/* QUEM É RESPONSÁVEL */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                3. RESPONSÁVEL
              </span>
              <div className="font-bold text-sm text-zinc-900">
                {foundEquipment.responsavel || 'Sem responsável'}
              </div>
              <div className="text-xs text-slate-500">
                Categoria: {foundEquipment.categoria_nome || 'Geral'}
              </div>
            </div>

            {/* QUAL O STATUS */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                4. STATUS OPERACIONAL
              </span>
              <div className="pt-0.5">
                <StatusBadge status={foundEquipment.status} size="md" />
              </div>
              {foundEquipment.status === 'EM MANUTENÇÃO' && (
                <div className="text-[11px] text-amber-700 font-bold mt-1">
                  ⚠ Na oficina de manutenção
                </div>
              )}
            </div>
          </div>

          {/* Barcode Render & Observações */}
          <div className="p-4 bg-zinc-900 text-white rounded-2xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                Etiqueta e Código de Barras Ativo
              </div>
              <p className="text-xs text-zinc-300">
                {foundEquipment.observacoes || 'Sem observações cadastradas para este ativo.'}
              </p>
            </div>

            <div className="bg-white p-2 rounded-xl flex items-center justify-center">
              <Barcode
                value={foundEquipment.codigo_patrimonial}
                width={1.6}
                height={38}
                fontSize={11}
              />
            </div>
          </div>

          {/* Barra de Ações Rápidas Imediatas */}
          <div className="pt-2">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
              AÇÕES RÁPIDAS PARA ESTE PATRIMÔNIO:
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              {/* Transferir */}
              {hasPermission('transfer_equipment') && foundEquipment.status !== 'BAIXADO' && (
                <button
                  type="button"
                  onClick={() => onOpenTransfer(foundEquipment)}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-800 font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                >
                  <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                  <span>TRANSFERIR</span>
                </button>
              )}

              {/* Manutenção / Finalizar */}
              {hasPermission('open_maintenance') && foundEquipment.status !== 'EM MANUTENÇÃO' && foundEquipment.status !== 'BAIXADO' && (
                <button
                  type="button"
                  onClick={() => onOpenMaintenance(foundEquipment)}
                  className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                >
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>MANUTENÇÃO</span>
                </button>
              )}

              {hasPermission('finish_maintenance') && foundEquipment.status === 'EM MANUTENÇÃO' && activeTicket && (
                <button
                  type="button"
                  onClick={() => onOpenFinishMaintenance(foundEquipment)}
                  className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.02] shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>FINALIZAR MANUT.</span>
                </button>
              )}

              {/* Alterar Status */}
              {hasPermission('edit_equipment') && foundEquipment.status !== 'BAIXADO' && (
                <button
                  type="button"
                  onClick={() => onOpenStatusChange(foundEquipment)}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-800 font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                >
                  <RefreshCw className="w-4 h-4 text-slate-600" />
                  <span>STATUS</span>
                </button>
              )}

              {/* Imprimir Etiqueta */}
              {hasPermission('print_labels') && (
                <button
                  type="button"
                  onClick={() => handlePrintLabel(foundEquipment)}
                  className="p-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.02] shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>IMPRIMIR</span>
                </button>
              )}

              {/* Histórico / Ficha */}
              <button
                type="button"
                onClick={() => onViewDetails(foundEquipment)}
                className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-800 font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
              >
                <History className="w-4 h-4 text-zinc-700" />
                <span>HISTÓRICO</span>
              </button>

              {/* Editar */}
              {hasPermission('edit_equipment') && (
                <button
                  type="button"
                  onClick={() => onOpenEdit(foundEquipment)}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-800 font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                >
                  <Edit3 className="w-4 h-4 text-zinc-700" />
                  <span>EDITAR</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ESTADO 3: 🔴 CÓDIGO NÃO CADASTRADO (Requirement #26) */}
      {scanState === 'NOT_FOUND' && (
        <div className="bg-white rounded-3xl border-2 border-red-400 shadow-2xl p-8 text-center animate-fadeIn space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div>
            <div className="text-xs font-black uppercase tracking-wider text-red-600 mb-1">
              CÓDIGO NÃO CADASTRADO NO SISTEMA
            </div>
            <h3 className="text-2xl font-mono font-black text-zinc-900">
              {scannedCode}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Este código de barras foi lido corretamente, mas ainda não pertence a nenhum patrimônio cadastrado.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleResetScanner}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Tentar Outro Código
            </button>

            {hasPermission('create_equipment') && (
              <button
                onClick={() => onOpenNewEquipmentWithCode(scannedCode)}
                className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-yellow-glow transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>CADASTRAR ESTE EQUIPAMENTO</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
