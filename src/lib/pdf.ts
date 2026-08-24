// ==========================================
// MP CARGAS - Gerador de PDF e Impressão de Etiquetas
// ==========================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import { Equipamento, LabelPrintOptions } from '../types';

/**
 * Converte um código de barras em Data URL (PNG base64) para inclusão no PDF
 */
function generateBarcodeDataUrl(code: string): string {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, code, {
      format: 'CODE128',
      width: 2.2,
      height: 45,
      displayValue: false, // O texto será renderizado tipograficamente pelo jsPDF
      margin: 0,
      background: '#FFFFFF',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Erro ao gerar imagem do barcode:', err);
    return '';
  }
}

/**
 * Gera PDF de Etiquetas para Equipamentos
 */
export async function generateLabelsPDF(
  items: Equipamento[],
  options: LabelPrintOptions,
  companyName: string = 'MP CARGAS'
): Promise<jsPDF> {
  const { template, copiesPerItem = 1 } = options;

  // Monta lista com cópias
  const expandedItems: Equipamento[] = [];
  items.forEach(item => {
    for (let i = 0; i < copiesPerItem; i++) {
      expandedItems.push(item);
    }
  });

  if (expandedItems.length === 0) {
    throw new Error('Nenhum item selecionado para impressão de etiquetas.');
  }

  // Modelo Folha A4 com Grade (24 etiquetas: 3 colunas x 8 linhas)
  if (template === 'FOLHA_A4_GRADE') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const marginLeft = 10;
    const marginTop = 12;
    const labelWidth = 60;
    const labelHeight = 32;
    const gapX = 5;
    const gapY = 3;
    const cols = 3;
    const rows = 8;
    const labelsPerPage = cols * rows;

    expandedItems.forEach((item, index) => {
      if (index > 0 && index % labelsPerPage === 0) {
        doc.addPage();
      }

      const pageIndex = index % labelsPerPage;
      const col = pageIndex % cols;
      const row = Math.floor(pageIndex / cols);

      const x = marginLeft + col * (labelWidth + gapX);
      const y = marginTop + row * (labelHeight + gapY);

      // Borda sutil de corte
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, labelWidth, labelHeight, 1.5, 1.5);

      // Topo Cabeçalho Amarelo MP
      doc.setFillColor(255, 209, 0);
      doc.rect(x + 0.2, y + 0.2, labelWidth - 0.4, 6.5, 'F');

      // Nome da Empresa
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(17, 17, 17);
      doc.text(companyName, x + labelWidth / 2, y + 4.5, { align: 'center' });

      // Nome do Equipamento
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(20, 20, 20);
      const truncatedName = item.nome.length > 28 ? item.nome.substring(0, 26) + '...' : item.nome;
      doc.text(truncatedName, x + labelWidth / 2, y + 10, { align: 'center' });

      // Código de Barras
      const barcodeImg = generateBarcodeDataUrl(item.codigo_patrimonial);
      if (barcodeImg) {
        doc.addImage(barcodeImg, 'PNG', x + 5, y + 11.5, labelWidth - 10, 11);
      }

      // Código PAT numérico
      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(item.codigo_patrimonial, x + labelWidth / 2, y + 26, { align: 'center' });

      // Rodapé sutil: Setor
      if (item.setor_nome) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 100, 100);
        doc.text(`Setor: ${item.setor_nome}`, x + labelWidth / 2, y + 29.5, { align: 'center' });
      }
    });

    return doc;
  }

  // Modelo Padrão Térmica 50x30mm
  if (template === 'PADRAO_50X30') {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [30, 50], // 50mm largura x 30mm altura
    });

    expandedItems.forEach((item, index) => {
      if (index > 0) doc.addPage([30, 50], 'landscape');

      const width = 50;
      const height = 30;

      // Header Amarelo
      doc.setFillColor(255, 209, 0);
      doc.rect(0, 0, width, 6, 'F');

      // MP CARGAS
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(17, 17, 17);
      doc.text(companyName, width / 2, 4.2, { align: 'center' });

      // Nome do Equipamento
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(20, 20, 20);
      const name = item.nome.length > 25 ? item.nome.substring(0, 23) + '...' : item.nome;
      doc.text(name, width / 2, 9.5, { align: 'center' });

      // Código de Barras
      const barcodeImg = generateBarcodeDataUrl(item.codigo_patrimonial);
      if (barcodeImg) {
        doc.addImage(barcodeImg, 'PNG', 4, 10.5, width - 8, 11);
      }

      // Código PAT
      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(item.codigo_patrimonial, width / 2, 25, { align: 'center' });

      // Local / Setor
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 100, 100);
      doc.text(`${item.setor_nome || 'MP CARGAS'} • ${item.local_nome || 'Geral'}`, width / 2, 28, { align: 'center' });
    });

    return doc;
  }

  // Modelo Completa Térmica 70x40mm
  if (template === 'COMPLETA_70X40') {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [40, 70],
    });

    expandedItems.forEach((item, index) => {
      if (index > 0) doc.addPage([40, 70], 'landscape');

      const width = 70;
      const height = 40;

      // Header Amarelo
      doc.setFillColor(255, 209, 0);
      doc.rect(0, 0, width, 7.5, 'F');

      // Empresa
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(17, 17, 17);
      doc.text(companyName, width / 2, 5.2, { align: 'center' });

      // Nome do Equipamento
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 15, 15);
      doc.text(item.nome, width / 2, 12, { align: 'center' });

      // Barcode
      const barcodeImg = generateBarcodeDataUrl(item.codigo_patrimonial);
      if (barcodeImg) {
        doc.addImage(barcodeImg, 'PNG', 5, 13.5, width - 10, 14);
      }

      // Código PAT
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(item.codigo_patrimonial, width / 2, 31.5, { align: 'center' });

      // Informações adicionais
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(80, 80, 80);
      const infoText = `Setor: ${item.setor_nome || '-'} | Resp: ${item.responsavel || '-'} ${item.numero_serie ? '| S/N: ' + item.numero_serie : ''}`;
      doc.text(infoText, width / 2, 36, { align: 'center' });
    });

    return doc;
  }

  // Modelo Compacto 40x20mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [20, 40],
  });

  expandedItems.forEach((item, index) => {
    if (index > 0) doc.addPage([20, 40], 'landscape');

    const width = 40;

    // Mini cabeçalho
    doc.setFillColor(255, 209, 0);
    doc.rect(0, 0, width, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    doc.text(companyName, width / 2, 3, { align: 'center' });

    // Barcode
    const barcodeImg = generateBarcodeDataUrl(item.codigo_patrimonial);
    if (barcodeImg) {
      doc.addImage(barcodeImg, 'PNG', 2, 4.5, width - 4, 9);
    }

    // Código
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.text(item.codigo_patrimonial, width / 2, 16.5, { align: 'center' });

    // Pequeno nome
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(80, 80, 80);
    const shortName = item.nome.length > 20 ? item.nome.substring(0, 18) + '..' : item.nome;
    doc.text(shortName, width / 2, 19, { align: 'center' });
  });

  return doc;
}

/**
 * Gera Relatório Gerencial em PDF
 */
export function generateInventoryReportPDF(
  items: Equipamento[],
  title: string,
  filterDescription?: string,
  companyName: string = 'MP CARGAS'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Cabeçalho institucional
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, 297, 22, 'F');

  doc.setFillColor(255, 209, 0);
  doc.rect(0, 22, 297, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 209, 0);
  doc.text(companyName, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`— Sistema de Controle de Inventário e Patrimônio`, 48, 12);

  const dataHora = new Date().toLocaleString('pt-BR');
  doc.setFontSize(8.5);
  doc.text(`Gerado em: ${dataHora}`, 283, 12, { align: 'right' });

  // Título do Relatório
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(title, 14, 32);

  if (filterDescription) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Filtros aplicados: ${filterDescription}`, 14, 37);
  }

  // Tabela
  const tableData = items.map(item => [
    item.codigo_patrimonial,
    item.nome,
    item.categoria_nome || '-',
    item.marca ? `${item.marca} ${item.modelo || ''}` : '-',
    item.numero_serie || '-',
    item.setor_nome || '-',
    item.local_nome || '-',
    item.responsavel || '-',
    item.status,
    item.valor_aquisicao ? `R$ ${item.valor_aquisicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
  ]);

  autoTable(doc, {
    startY: filterDescription ? 41 : 36,
    head: [[
      'Código',
      'Equipamento',
      'Categoria',
      'Marca/Modelo',
      'Nº Série',
      'Setor',
      'Local',
      'Responsável',
      'Status',
      'Valor',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [17, 17, 17],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      cellPadding: 2,
    },
    columnStyles: {
      0: { font: 'courier', fontStyle: 'bold' },
      8: { fontStyle: 'bold' },
    },
  });

  // Rodapé com paginação
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(
      `MP CARGAS • Total de registros: ${items.length} | Página ${i} de ${pageCount}`,
      148.5,
      202,
      { align: 'center' }
    );
  }

  return doc;
}
