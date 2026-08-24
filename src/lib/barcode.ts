// ==========================================
// MP CARGAS - Utilitário Code 128 Barcode
// ==========================================

import JsBarcode from 'jsbarcode';

export interface BarcodeRenderOptions {
  format?: 'CODE128' | 'CODE39' | 'EAN13';
  width?: number;
  height?: number;
  displayValue?: boolean;
  text?: string;
  font?: string;
  fontSize?: number;
  textMargin?: number;
  margin?: number;
  background?: string;
  lineColor?: string;
}

/**
 * Renderiza um código de barras Code 128 em um elemento SVG ou Canvas
 */
export function renderBarcode(
  element: SVGSVGElement | HTMLCanvasElement | null,
  value: string,
  options?: BarcodeRenderOptions
): boolean {
  if (!element || !value) return false;

  try {
    const opts = {
      format: options?.format || 'CODE128',
      width: options?.width || 2,
      height: options?.height || 50,
      displayValue: options?.displayValue ?? true,
      text: options?.text || value,
      font: options?.font || 'JetBrains Mono, monospace',
      fontSize: options?.fontSize || 14,
      textMargin: options?.textMargin || 4,
      margin: options?.margin || 8,
      background: options?.background || '#FFFFFF',
      lineColor: options?.lineColor || '#000000',
    };

    JsBarcode(element, value, opts);
    return true;
  } catch (error) {
    console.error('Falha ao renderizar código de barras:', error);
    return false;
  }
}

/**
 * Formata um número sequencial para o padrão PAT-000001
 */
export function formatPatrimonioCode(prefix: string, sequence: number, digits: number = 6): string {
  const cleanPrefix = prefix ? prefix.trim().toUpperCase() : 'PAT';
  const padded = String(sequence).padStart(digits, '0');
  return `${cleanPrefix}-${padded}`;
}

/**
 * Normaliza qualquer leitura de scanner para busca segura
 */
export function sanitizeBarcodeValue(input: string): string {
  return input.trim().replace(/[\r\n\t]/g, '');
}
