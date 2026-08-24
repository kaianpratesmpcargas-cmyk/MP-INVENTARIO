// ==========================================
// MP CARGAS - Gerador de Código ZPL (Zebra Programming Language)
// Compatível com Zebra ZT230, ZD220, ZD420, GC420t, GK420d, Argox e Elgin
// ==========================================

import { Equipamento, LabelTemplate } from '../types';

/**
 * Remove acentos e caracteres especiais para compatibilidade com o chipset ZPL
 */
function sanitizeZPLText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\^~]/g, '') // remove caracteres de controle ZPL
    .trim();
}

/**
 * Gera comando ZPL para uma única etiqueta
 */
export function generateSingleZPL(
  item: Equipamento,
  companyName: string = 'MP CARGAS',
  template: LabelTemplate = 'PADRAO_50X30'
): string {
  const company = sanitizeZPLText(companyName).toUpperCase();
  const name = sanitizeZPLText(item.nome);
  const code = sanitizeZPLText(item.codigo_patrimonial);
  const sector = sanitizeZPLText(item.setor_nome || 'Geral');
  const responsible = sanitizeZPLText(item.responsavel || '-');
  const serial = sanitizeZPLText(item.numero_serie || '');

  // =========================================================================
  // MODELO: 70x40mm HÍBRIDA (Code 128 + QR Code)
  // =========================================================================
  if (template === 'HIBRIDA_70X40' || template === 'COMPLETA_70X40') {
    return `^XA
^PW560
^LL320
^PON
^LH0,0

~SD25

^FO20,15^GB520,38,38^FS
^FO30,22^A0N,26,26^FR^FD${company}^FS

^FO20,62^A0N,24,24^FD${name.substring(0, 36)}^FS

^FO20,100^BY2,3,75^BCN,75,N,N,N^FD${code}^FS
^FO20,185^A0N,28,28^FD${code}^FS

^FO410,95^BQN,2,4^FDQA,${code}^FS
^FO415,200^A0N,16,16^FDQR-CODE^FS

^FO20,230^GB520,2,2^FS

^FO20,242^A0N,20,20^FDSetor: ${sector.substring(0, 24)}^FS
^FO20,270^A0N,18,18^FDResp: ${responsible.substring(0, 22)}${serial ? ' | S/N: ' + serial.substring(0, 15) : ''}^FS

^XZ`;
  }

  // =========================================================================
  // MODELO: 50x30mm HÍBRIDA (Code 128 + QR Code)
  // =========================================================================
  if (template === 'HIBRIDA_50X30') {
    return `^XA
^PW400
^LL240
^PON
^LH0,0

~SD25

^FO15,10^GB370,30,30^FS
^FO25,16^A0N,20,20^FR^FD${company}^FS

^FO15,48^A0N,18,18^FD${name.substring(0, 26)}^FS

^FO15,75^BY2,2.5,50^BCN,50,N,N,N^FD${code}^FS
^FO15,132^A0N,22,22^FD${code}^FS

^FO300,75^BQN,2,3^FDQA,${code}^FS

^FO15,165^GB370,1,1^FS

^FO15,175^A0N,16,16^FD${sector.substring(0, 28)}^FS
^FO15,198^A0N,14,14^FDResp: ${responsible.substring(0, 22)}^FS

^XZ`;
  }

  // =========================================================================
  // MODELO: 40x20mm COMPACTA
  // =========================================================================
  if (template === 'COMPACTA_40X20') {
    return `^XA
^PW320
^LL160
^PON
^LH0,0

~SD25

^FO10,8^A0N,18,18^FD${company}^FS
^FO10,30^BY1.5,2,40^BCN,40,N,N,N^FD${code}^FS
^FO10,75^A0N,20,20^FD${code}^FS
^FO10,105^A0N,14,14^FD${name.substring(0, 22)}^FS

^XZ`;
  }

  // =========================================================================
  // MODELO: PADRÃO 50x30mm (Code 128 de Alto Contraste)
  // =========================================================================
  return `^XA
^PW400
^LL240
^PON
^LH0,0

~SD25

^FO15,10^GB370,32,32^FS
^FO25,16^A0N,22,22^FR^FD${company}^FS

^FO15,50^A0N,20,20^FD${name.substring(0, 30)}^FS

^FO15,80^BY2,3,65^BCN,65,N,N,N^FD${code}^FS
^FO15,152^A0N,24,24^FD${code}^FS

^FO15,188^GB370,1,1^FS

^FO15,198^A0N,16,16^FDSetor: ${sector.substring(0, 26)}^FS

^XZ`;
}

/**
 * Gera código ZPL em lote para múltiplos equipamentos com suporte a cópias
 */
export function generateBatchZPL(
  items: Equipamento[],
  companyName: string = 'MP CARGAS',
  template: LabelTemplate = 'PADRAO_50X30',
  copies: number = 1
): string {
  let fullZpl = '';

  items.forEach(item => {
    for (let c = 0; c < copies; c++) {
      fullZpl += generateSingleZPL(item, companyName, template) + '\n\n';
    }
  });

  return fullZpl.trim();
}

/**
 * Faz download de um arquivo .zpl para envio via driver Generic / Text Only ou RAW
 */
export function downloadZPLFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.zpl') ? filename : `${filename}.zpl`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copia o código ZPL para a área de transferência
 */
export async function copyZPLToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (e) {
    console.error('Falha ao copiar ZPL:', e);
    return false;
  }
}
