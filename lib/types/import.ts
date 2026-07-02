/**
 * Import service types and interfaces
 */

export type ImportFileType = 'xlsx' | 'xls' | 'csv';

export interface ImportRow {
  id: string;
  nom: string;
  prenom: string;
  contact: string;
  email?: string;
  entreprise?: string;
  isValid: boolean;
  errors: string[];
  isDuplicate: boolean;
}

export interface ImportResult {
  rows: ImportRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: string[];
}

export interface ImportPreview {
  data: ImportRow[];
  headers: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
}
