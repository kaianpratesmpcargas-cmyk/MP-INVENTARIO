import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Equipamento, LabelPrintOptions } from '../types';

/**
 * Converte um código de barras Code 128 em Data URL de Alta Resolução (300+ DPI)
 * com Zona de Silêncio (Quiet Zone) obrigatória para leitura ótica instantânea.
 */
export function generateBarcodeDataUrl(code: string, widthMultiplier: number = 3): string {
  const canvas = document.createElement('canvas');
  try {
    // Renderização com alta densidade de pixels para que o driver da impressora
    // não crie serrilhados ou interpolações cinzas que impeçam o laser de ler.
    JsBarcode(canvas, code, {
      format: 'CODE128',
      width: widthMultiplier,     // Módulo de barra espesso (alta densidade)
      height: 90,                  // Altura generosa para varredura do feixe laser
      displayValue: false,         // O texto é renderizado com precisão vetorial pelo jsPDF
      margin: 16,                  // ZONA DE SILÊNCIO OBRIGATÓRIA (Margem branca nas duas laterais)
      background: '#FFFFFF',
      lineColor: '#000000',
      flat: true,
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Erro ao gerar imagem do barcode:', err);
    return '';
  }
}

/**
 * Converte um valor em Data URL de QR Code 2D em Alta Resolução
 */
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 250,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Erro ao gerar imagem do QR Code:', err);
    return '';
  }
}

/**
 * Gera PDF de Etiquetas para Equipamentos (100% Otimizado para Impressoras Térmicas e Laser P&B)
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

  // =========================================================================
  // MODELO: HÍBRIDA 70x40mm (Code 128 + QR Code 2D Simultâneos)
  // =========================================================================
  if (template === 'HIBRIDA_70X40') {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [40, 70],
    });

    for (let index = 0; index < expandedItems.length; index++) {
      const item = expandedItems[index];
      if (index > 0) doc.addPage([40, 70], 'landscape');

      const width = 70;
      const height = 40;

      // Fundo Branco
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, width, height, 'F');

      // Topo Preto Sólido
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, width, 6.5, 'F');

      // Nome da Empresa
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(companyName.toUpperCase(), width / 2, 4.8, { align: 'center' });

      // Nome do Equipamento
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const name = item.nome.length > 34 ? item.nome.substring(0, 32) + '...' : item.nome;
      doc.text(name, 3, 11);

      // Barcode Code 128 na Esquerda
      const barcodeImg = generateBarcodeDataUrl(item.codigo_patrimonial, 2.5);
      if (barcodeImg) {
        doc.addImage(barcodeImg, 'PNG', 2, 13, 44, 15);
      }

      // QR Code 2D na Direita
      const qrImg = await generateQRCodeDataUrl(item.codigo_patrimonial);
      if (qrImg) {
        doc.addImage(qrImg, 'PNG', 49, 12.5, 18, 18);
      }

      // Código PAT
      doc.setFont('courier', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(0, 0, 0);
      doc.text(item.codigo_patrimonial, 24, 31, { align: 'center' });

      // Linha separadora
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.line(3, 33, width - 3, 33);

      // Rodapé
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(0, 0, 0);
      const infoText = `Setor: ${item.setor_nome || '-'} | Resp: ${item.responsavel || '-'} ${item.numero_serie ? '| S/N: ' + item.numero_serie : ''}`;
      doc.text(infoText, width / 2, 36.8, { align: 'center' });
    }

    return doc;
  }

  // =========================================================================
  // MODELO: HÍBRIDA 50x30mm (Code 128 + Mini QR Code)
  // =========================================================================
  if (template === 'HIBRIDA_50X30') {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [30, 50],
    });

    for (let index = 0; index < expandedItems.length; index++) {
      const item = expandedItems[index];
      if (index > 0) doc.addPage([30, 50], 'landscape');

      const width = 50;
      const height = 30;

      // Fundo Branco
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, width, height, 'F');

      // Topo Preto Sólido
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, width, 5.2, 'F');

      // Nome da Empresa
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(companyName.toUpperCase(), width / 2, 3.8, { align: 'center' });

      // Nome do Equipamento
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(0, 0, 0);
      const name = item.nome.length > 28 ? item.nome.substring(0, 26) + '...' : item.nome;
      doc.text(name, 2.5, 8.8);

      // Barcode Code 128
      const barcodeImg = generateBarcodeDataUrl(item.codigo_patrimonial, 2.2);
      if (barcodeImg) {
        doc.addImage(barcodeImg, 'PNG', 1.5, 9.8, 33, 11.5);
      }

      // QR Code
      const qrImg = await generateQRCodeDataUrl(item.codigo_patrimonial);
      if (qrImg) {
        doc.addImage(qrImg, 'PNG', 36, 9.5, 12, 12);
      }

      // Código PAT
      doc.setFont('courier', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(item.codigo_patrimonial, 18, 24.2, { align: 'center' });

      // Linha
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.15);
      doc.line(2, 25.8, width - 2, 25.8);

      // Rodapé
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(0, 0, 0);
      const footerText = `${item.setor_nome || 'MP CARGAS'}${item.responsavel ? ' • ' + item.responsavel : ''}`;
      doc.text(footerText, width / 2, 28.5, { align: 'center' });
    }

    return doc;
  }

  // =========================================================================
  // MODELO 1: FOLHA A4 COM GRADE (24 etiquetas: 3 colunas x 8 linhas)
  // =========================================================================
  if (template === 'FOLHA_A4_GRADE') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

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

      // Fundo Branco Puro
      doc.setFillColor(255, 255, 255);
      doc.rect(x, y, labelWidth, labelHeight, 'F');

      // Borda de corte nítida (100% preto)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, labelWidth, labelHeight, 1, 1);

      // Faixa Superior Preto Sólido (Alto Contraste)
      doc.setFillColor(0, 0, 0);
      doc.rect(x, y, labelWidth, 5.5, 'F');

      // Nome da Empresa em Branco Puro
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(companyName.toUpperCase(), x + labelWidth / 2, y + 3.8, { align: 'center' });

      // Nome do Equipamento (Preto Puro)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      const truncatedName = item.nome.length > 28 ? item.nome.substring(0, 26) + '...' : item.nome;
      doc.text(truncatedName, x + labelWidth / 2, y + 9.2, { align: 'center' });

      // Código de Barras de Alta Resolução com Zona de Silêncio
      const barcodeImg = generateBarcodeDataUrl(item.codigo_patrimonial, 3);
      if (barcodeImg) {
        doc.addImage(barcodeImg, 'PNG', x + 2, y + 10.5, labelWidth - 4, 12);
      }

      // Código PAT Numérico em Fonte Monoespaçada Bold
      doc.setFont('courier', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(item.codigo_patrimonial, x + labelWidth / 2, y + 25.5, { align: 'center' });

      // Linha separadora sutil
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.15);
      doc.line(x + 3, y + 27, x + labelWidth - 3, y + 27);

      // Rodapé: Setor / Local (Preto Puro)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(0, 0, 0);
      const footerInfo = `${item.setor_nome || 'MP CARGAS'}${item.local_nome ? ' • ' + item.local_nome : ''}`;
      doc.text(footerInfo, x + labelWidth / 2, y + 29.8, { align: 'center' });
    });

    return doc;
  }


  // =========================================================================
  // MODELO 2: PADRÃO TÉRMICA 50x30mm (Rolo / Ribbon P&B)
  // =========================================================================
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

      // Fundo Branco Puro
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, width, height, 'F');

      // Cabeçalho Preto Sólido (Alto Contraste para Impressão Térmica)
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, width, 5.2, 'F');

      // Nome da Empresa em Branco
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(companyName.toUpperCase(), width / 2, 3.8, { align: 'center' });

      // Nome do Equipamento (Preto Puro)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      const name = item.nome.length > 25 ? item.nome.substring(0, 23) + '...' : item.nome;
      doc.text(name, width / 2, 8.8, { align: 'center' });

      // Código de Barras Code 128 com Alta Densidade e Zona de Silêncio
      const barcodeImg = generateBarcodeDataUrl(item.codigo_patrimonial, 3);
      if (barcodeImg) {
        doc.addImage(barcodeImg, 'PNG', 1.5, 9.8, width - 3, 12.5);
      }

      // Código PAT em Fonte Courier Bold (Legível para humanos e OCR)
      doc.setFont('courier', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(item.codigo_patrimonial, width / 2, 24.8, { align: 'center' });

      // Linha separadora
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.15);
      doc.line(2, 26, width - 2, 26);

      // Rodapé: Setor & Responsável (Preto Puro para não pontilhar na térmica)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(0, 0, 0);
      const footerText = `${item.setor_nome || 'MP CARGAS'}${item.responsavel ? ' • ' + item.responsavel : ''}`;
      doc.text(footerText, width / 2, 28.5, { align: 'center' });
    });

    return doc;
  }

  // =========================================================================
  // MODELO 3: COMPLETA TÉRMICA 70x40mm (Grandes Ativos com Nº Série)
  // =========================================================================
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

      // Fundo Branco
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, width, height, 'F');

      // Faixa Superior Preto Sólido
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, width, 6.5, 'F');

      // Nome da Empresa
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(companyName.toUpperCase(), width / 2, 4.8, { align: 'center' });

      // Nome do Equipamento
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(item.nome, width / 2, 11, { align: 'center' });

      // Código de Barras com Altura Generosa (16mm)
      const barcodeImg = generateBarcodeDataUrl(item.codigo_patrimonial, 3);
      if (barcodeImg) {
        doc.addImage(barcodeImg, 'PNG', 3, 12.5, width - 6, 16);
      }

      // Código PAT
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(item.codigo_patrimonial, width / 2, 31.5, { align: 'center' });

      // Linha separadora
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.line(3, 33.5, width - 3, 33.5);

      // Informações detalhadas em Preto Puro
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 0);
      const infoText = `Setor: ${item.setor_nome || '-'} | Resp: ${item.responsavel || '-'} ${item.numero_serie ? '| S/N: ' + item.numero_serie : ''}`;
      doc.text(infoText, width / 2, 37, { align: 'center' });
    });

    return doc;
  }

  // =========================================================================
  // MODELO 4: COMPACTA TÉRMICA 40x20mm (Pequenos Componentes)
  // =========================================================================
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [20, 40],
  });

  expandedItems.forEach((item, index) => {
    if (index > 0) doc.addPage([20, 40], 'landscape');

    const width = 40;
    const height = 20;

    // Fundo Branco
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, width, height, 'F');

    // Mini cabeçalho Preto Sólido
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, width, 3.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(companyName.toUpperCase(), width / 2, 2.8, { align: 'center' });

    // Código de Barras
    const barcodeImg = generateBarcodeDataUrl(item.codigo_patrimonial, 2.5);
    if (barcodeImg) {
      doc.addImage(barcodeImg, 'PNG', 1, 4.5, width - 2, 9.5);
    }

    // Código PAT
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(item.codigo_patrimonial, width / 2, 16.2, { align: 'center' });

    // Nome resumido
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(0, 0, 0);
    const shortName = item.nome.length > 22 ? item.nome.substring(0, 20) + '..' : item.nome;
    doc.text(shortName, width / 2, 18.8, { align: 'center' });
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
