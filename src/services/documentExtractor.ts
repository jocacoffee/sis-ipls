import { PLSDocument, IndicatorMeasurement, DocumentType, SourceType } from '../types';

export interface ExtractedInvoiceData {
  supplier: string;
  invoiceNumber: string;
  competence: string; // YYYY-MM
  dueDate?: string;
  totalAmount: number;
  consumptionValue: number;
  consumptionUnit: string;
  consumerUnitId: string;
  confidenceScore: number;
  detectedIndicatorId: string;
  detectedProcessNumber: string;
  rawText: string;
  requiresHumanReview: boolean;
}

/**
 * Intelligent Document Extraction Pipeline.
 * Simulates OCR, natural language entity extraction, and regex parsing
 * for institutional utility bills, atestos, and SEI dispatch sheets.
 */
export function extractDataFromDocument(
  fileName: string,
  fileContentText?: string
): ExtractedInvoiceData {
  const lowerName = fileName.toLowerCase();
  const text = fileContentText || '';

  // Default fallback values
  let supplier = 'Fornecedor Identificado';
  let invoiceNumber = `FAT-${Math.floor(100000 + Math.random() * 900000)}`;
  let competence = '2026-08';
  let totalAmount = 1450.0;
  let consumptionValue = 1200;
  let consumptionUnit = 'unidades';
  let consumerUnitId = 'UC-884102';
  let confidenceScore = 92;
  let detectedIndicatorId = 'ind-energia-kwh';
  let detectedProcessNumber = '0001245-88.2026.4.01.8012';

  if (lowerName.includes('energia') || lowerName.includes('roraima_energia') || lowerName.includes('luz')) {
    supplier = 'Roraima Energia S.A. (CNPJ 02.341.470/0001-44)';
    invoiceNumber = 'FAT-984120';
    competence = '2026-08';
    totalAmount = 19840.65;
    consumptionValue = 21450;
    consumptionUnit = 'kWh';
    consumerUnitId = 'UC: 7489210-4';
    confidenceScore = 96;
    detectedIndicatorId = 'ind-energia-kwh';
    detectedProcessNumber = '0001245-88.2026.4.01.8012';
  } else if (lowerName.includes('agua') || lowerName.includes('água') || lowerName.includes('caer')) {
    supplier = 'Companhia de Águas e Esgotos de Roraima - CAER';
    invoiceNumber = 'FAT-CAER-44910';
    competence = '2026-08';
    totalAmount = 3240.50;
    consumptionValue = 179;
    consumptionUnit = 'm³';
    consumerUnitId = 'Matrícula: 334102-1';
    confidenceScore = 98;
    detectedIndicatorId = 'ind-agua-m3';
    detectedProcessNumber = '0001246-73.2026.4.01.8012';
  } else if (lowerName.includes('telefonia') || lowerName.includes('oi') || lowerName.includes('telemar') || lowerName.includes('claro')) {
    supplier = 'Telemar Norte Leste S/A - Em Recuperação Judicial';
    invoiceNumber = 'FAT-OI-88192';
    competence = '2026-08';
    totalAmount = 4920.00;
    consumptionValue = 4920;
    consumptionUnit = 'R$';
    consumerUnitId = 'Contrato STFC nº 04/2022';
    confidenceScore = 82; // Trigger low confidence review
    detectedIndicatorId = 'ind-telefonia-reais';
    detectedProcessNumber = '0000789-22.2026.4.01.8012';
  } else if (lowerName.includes('papel') || lowerName.includes('resmas') || lowerName.includes('almoxarifado')) {
    supplier = 'Comércio de Papéis Amazônia Ltda.';
    invoiceNumber = 'NF-e 004128';
    competence = '2026-08';
    totalAmount = 1564.00;
    consumptionValue = 46;
    consumptionUnit = 'resmas';
    consumerUnitId = 'SEMAT - Almoxarifado Central';
    confidenceScore = 95;
    detectedIndicatorId = 'ind-papel-resmas';
    detectedProcessNumber = '0000623-10.2026.4.01.8012';
  } else if (lowerName.includes('recibo') || lowerName.includes('catadores') || lowerName.includes('residuos') || lowerName.includes('terra_viva')) {
    supplier = 'Associação de Catadores Terra Viva de Boa Vista';
    invoiceNumber = 'MTR-2026-0842';
    competence = '2026-08';
    totalAmount = 0.0;
    consumptionValue = 420;
    consumptionUnit = 'kg';
    consumerUnitId = 'Coleta Seletiva Cidadã - Decreto 5.940/2006';
    confidenceScore = 99;
    detectedIndicatorId = 'ind-residuos-kg';
    detectedProcessNumber = '0000312-55.2026.4.01.8012';
  }

  const requiresHumanReview = confidenceScore < 90;

  const rawText = `DOCUMENTO FISCAL / ADMINISTRATIVO PROCESSADO
Fornecedor: ${supplier}
Nº Documento: ${invoiceNumber}
Competência: ${competence}
Identificador UC: ${consumerUnitId}
Consumo Apurado: ${consumptionValue} ${consumptionUnit}
Valor Total: R$ ${totalAmount.toFixed(2)}
Processo SEI Vinculado: ${detectedProcessNumber}
Índice de Confiança OCR: ${confidenceScore}%
Status de Validação: ${requiresHumanReview ? 'REQUER REVISÃO HUMANA (Confiança < 90%)' : 'APTO PARA VALIDAÇÃO'}`;

  return {
    supplier,
    invoiceNumber,
    competence,
    dueDate: '2026-09-20',
    totalAmount,
    consumptionValue,
    consumptionUnit,
    consumerUnitId,
    confidenceScore,
    detectedIndicatorId,
    detectedProcessNumber,
    rawText,
    requiresHumanReview
  };
}

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
}

/**
 * Robust CSV/TSV parser for spreadsheet imports.
 */
export function parseCSVData(csvContent: string): CSVParseResult {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return { headers: [], rows: [], errors: ['O arquivo de planilha está vazio ou não possui linhas de dados.'] };
  }

  // Detect delimiter (, or ;)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';

  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows: Record<string, string>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length !== headers.length) {
      errors.push(`Linha ${i + 1}: número de colunas (${values.length}) incompatível com o cabeçalho (${headers.length}).`);
      continue;
    }
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index];
    });
    rows.push(rowObj);
  }

  return { headers, rows, errors };
}
