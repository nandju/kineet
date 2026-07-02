/**
 * Import Service
 * Handles Excel/CSV file import with validation, error detection, and preview
 */

import { ImportRow, ImportResult, ImportPreview, ImportFileType } from '../types';

export class ImportService {
  /**
   * Parse a file and return import result
   */
  static async parseFile(file: File): Promise<ImportResult> {
    const fileType = this.getFileType(file);
    
    try {
      let rows: ImportRow[] = [];
      
      if (fileType === 'csv') {
        rows = await this.parseCsv(file);
      } else {
        rows = await this.parseExcel(file);
      }

      // Validate rows and detect duplicates
      const { validatedRows, duplicateRows, invalidRows } = this.validateRows(rows);

      return {
        rows: validatedRows,
        totalRows: rows.length,
        validRows: validatedRows.filter(r => r.isValid).length,
        invalidRows: validatedRows.filter(r => !r.isValid).length,
        duplicateRows,
        errors: validatedRows.filter(r => !r.isValid).flatMap(r => r.errors),
      };
    } catch (error) {
      return {
        rows: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        duplicateRows: 0,
        errors: [error instanceof Error ? error.message : 'Failed to parse file'],
      };
    }
  }

  /**
   * Get file type from file object
   */
  static getFileType(file: File): ImportFileType {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'xlsx':
        return 'xlsx';
      case 'xls':
        return 'xls';
      case 'csv':
        return 'csv';
      default:
        throw new Error('Unsupported file type. Please use XLSX, XLS, or CSV.');
    }
  }

  /**
   * Parse CSV file
   */
  private static async parseCsv(file: File): Promise<ImportRow[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return [];
    }

    // Parse header
    const headers = this.parseCsvLine(lines[0]);
    
    // Parse data rows
    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row = this.mapToImportRow(headers, values, i);
      rows.push(row);
    }

    return rows;
  }

  /**
   * Parse Excel file (simplified - in production use xlsx library)
   */
  private static async parseExcel(file: File): Promise<ImportRow[]> {
    // For now, we'll simulate Excel parsing
    // In production, you would use a library like 'xlsx' or 'exceljs'
    const text = await file.text();
    
    // This is a simplified approach - real Excel parsing requires a library
    // For now, we'll treat it as CSV-like
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return [];
    }

    const headers = this.parseCsvLine(lines[0]);
    const rows: ImportRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row = this.mapToImportRow(headers, values, i);
      rows.push(row);
    }

    return rows;
  }

  /**
   * Parse a CSV line (handles quoted values)
   */
  private static parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Map headers and values to ImportRow
   */
  private static mapToImportRow(headers: string[], values: string[], index: number): ImportRow {
    const row: ImportRow = {
      id: `row_${index}`,
      nom: '',
      prenom: '',
      contact: '',
      email: '',
      entreprise: '',
      isValid: true,
      errors: [],
      isDuplicate: false,
    };

    // Map values to fields based on headers
    headers.forEach((header, i) => {
      const value = values[i] || '';
      const normalizedHeader = header.toLowerCase().trim();

      switch (normalizedHeader) {
        case 'nom':
        case 'name':
        case 'lastname':
        case 'last_name':
          row.nom = value;
          break;
        case 'prenom':
        case 'prénom':
        case 'firstname':
        case 'first_name':
          row.prenom = value;
          break;
        case 'contact':
        case 'phone':
        case 'telephone':
        case 'téléphone':
        case 'mobile':
          row.contact = value;
          break;
        case 'email':
        case 'mail':
          row.email = value;
          break;
        case 'entreprise':
        case 'company':
        case 'société':
        case 'societe':
          row.entreprise = value;
          break;
      }
    });

    return row;
  }

  /**
   * Validate rows and detect duplicates
   */
  private static validateRows(rows: ImportRow[]): {
    validatedRows: ImportRow[];
    duplicateRows: number;
    invalidRows: number;
  } {
    const validatedRows: ImportRow[] = [];
    const seenContacts = new Set<string>();
    const seenEmails = new Set<string>();
    let duplicateCount = 0;

    rows.forEach(row => {
      const errors: string[] = [];

      // Check required fields
      if (!row.nom || row.nom.trim() === '') {
        errors.push('Nom est requis');
      }
      if (!row.prenom || row.prenom.trim() === '') {
        errors.push('Prénom est requis');
      }
      if (!row.contact || row.contact.trim() === '') {
        errors.push('Contact est requis');
      }

      // Validate contact format
      if (row.contact && !this.isValidContact(row.contact)) {
        errors.push('Format de contact invalide');
      }

      // Validate email format if provided
      if (row.email && !this.isValidEmail(row.email)) {
        errors.push('Format d\'email invalide');
      }

      // Check for duplicates by contact
      if (row.contact && seenContacts.has(row.contact)) {
        row.isDuplicate = true;
        duplicateCount++;
        errors.push('Contact en double');
      } else if (row.contact) {
        seenContacts.add(row.contact);
      }

      // Check for duplicates by email
      if (row.email && seenEmails.has(row.email)) {
        row.isDuplicate = true;
        if (!errors.includes('Contact en double')) {
          duplicateCount++;
        }
        errors.push('Email en double');
      } else if (row.email) {
        seenEmails.add(row.email);
      }

      row.errors = errors;
      row.isValid = errors.length === 0;

      validatedRows.push(row);
    });

    return {
      validatedRows,
      duplicateRows: duplicateCount,
      invalidRows: validatedRows.filter(r => !r.isValid).length,
    };
  }

  /**
   * Validate contact format (phone number)
   */
  private static isValidContact(contact: string): boolean {
    // Accept various phone formats
    const cleaned = contact.replace(/[\s\-\(\)]/g, '');
    return /^(\+?\d{10,15})$/.test(cleaned);
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Create import preview
   */
  static createPreview(result: ImportResult): ImportPreview {
    return {
      data: result.rows,
      headers: ['Nom', 'Prénom', 'Contact', 'Email', 'Entreprise'],
      totalRows: result.totalRows,
      validRows: result.validRows,
      invalidRows: result.invalidRows,
      duplicateRows: result.duplicateRows,
    };
  }

  /**
   * Remove a row from import result
   */
  static removeRow(result: ImportResult, rowId: string): ImportResult {
    return {
      ...result,
      rows: result.rows.filter(r => r.id !== rowId),
      totalRows: result.totalRows - 1,
      validRows: result.rows.filter(r => r.id !== rowId && r.isValid).length,
      invalidRows: result.rows.filter(r => r.id !== rowId && !r.isValid).length,
    };
  }

  /**
   * Update a row in import result
   */
  static updateRow(result: ImportResult, rowId: string, updates: Partial<ImportRow>): ImportResult {
    const updatedRows = result.rows.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, ...updates };
        
        // Re-validate the row
        const errors: string[] = [];
        if (!updated.nom || updated.nom.trim() === '') {
          errors.push('Nom est requis');
        }
        if (!updated.prenom || updated.prenom.trim() === '') {
          errors.push('Prénom est requis');
        }
        if (!updated.contact || updated.contact.trim() === '') {
          errors.push('Contact est requis');
        }
        if (updated.contact && !this.isValidContact(updated.contact)) {
          errors.push('Format de contact invalide');
        }
        if (updated.email && !this.isValidEmail(updated.email)) {
          errors.push('Format d\'email invalide');
        }
        
        updated.errors = errors;
        updated.isValid = errors.length === 0;
        
        return updated;
      }
      return row;
    });

    return {
      ...result,
      rows: updatedRows,
      validRows: updatedRows.filter(r => r.isValid).length,
      invalidRows: updatedRows.filter(r => !r.isValid).length,
    };
  }

  /**
   * Filter valid rows only
   */
  static getValidRows(result: ImportResult): ImportRow[] {
    return result.rows.filter(r => r.isValid && !r.isDuplicate);
  }

  /**
   * Convert import rows to recipient format
   */
  static toRecipients(rows: ImportRow[]): Array<{
    id: string;
    nom: string;
    prenom: string;
    contact: string;
    email?: string;
    entreprise?: string;
    statut: 'waiting';
    nombreTentatives: number;
  }> {
    return rows
      .filter(r => r.isValid && !r.isDuplicate)
      .map(row => ({
        id: row.id,
        nom: row.nom,
        prenom: row.prenom,
        contact: row.contact,
        email: row.email,
        entreprise: row.entreprise,
        statut: 'waiting' as const,
        nombreTentatives: 0,
      }));
  }
}
