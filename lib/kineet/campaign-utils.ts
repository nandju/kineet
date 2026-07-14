import * as XLSX from "xlsx";
import type { Channel, Recipient } from "./types";
import { isValidContact } from "./notify";

export function generateId(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function replaceVariables(
  template: string,
  recipient: Pick<Recipient, "firstName" | "lastName">,
): string {
  return template
    .replace(/\{\{\s*prénom\s*\}\}/gi, recipient.firstName)
    .replace(/\{\{\s*prenom\s*\}\}/gi, recipient.firstName)
    .replace(/\{\{\s*first name\s*\}\}/gi, recipient.firstName)
    .replace(/\{\{\s*nom\s*\}\}/gi, recipient.lastName)
    .replace(/\{\{\s*last name\s*\}\}/gi, recipient.lastName);
}

export function estimateCampaignCost(recipients: number, channel: Channel): number {
  const rates: Record<Channel, number> = { whatsapp: 0.04, email: 0.002, sms: 0.06 };
  return Math.round(recipients * rates[channel] * 100) / 100;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

type ColumnMap = {
  lastName?: number;
  firstName?: number;
  contact?: number;
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  headers.forEach((header, index) => {
    if (/nom$|lastname|last.?name|nom.?famille/.test(header) && map.lastName === undefined) {
      map.lastName = index;
    } else if (/prenom|firstname|first.?name|given/.test(header) && map.firstName === undefined) {
      map.firstName = index;
    } else if (/email|mail|telephone|phone|mobile|whatsapp|contact|numero|number/.test(header) && map.contact === undefined) {
      map.contact = index;
    }
  });
  return map;
}

export interface ImportResult {
  recipients: Recipient[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  detectedColumns: string[];
  empty: boolean;
}

export function parseSpreadsheetFile(
  file: File,
  channel: Channel | null,
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 });

        if (!rows.length) {
          resolve({
            recipients: [],
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            detectedColumns: [],
            empty: true,
          });
          return;
        }

        const headerRow = rows[0].map((cell) => normalizeHeader(cell));
        const columnMap = detectColumns(headerRow);
        const detectedColumns = [
          columnMap.lastName !== undefined ? "Nom" : null,
          columnMap.firstName !== undefined ? "Prénom" : null,
          columnMap.contact !== undefined ? "Contact" : null,
        ].filter(Boolean) as string[];

        const recipients: Recipient[] = [];
        let invalidRows = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every((cell) => !String(cell ?? "").trim())) continue;

          const lastName = String(row[columnMap.lastName ?? 0] ?? "").trim();
          const firstName = String(row[columnMap.firstName ?? 1] ?? "").trim();
          const contact = String(row[columnMap.contact ?? 2] ?? "").trim();
          const valid = Boolean(lastName && firstName && contact && (channel === null || isValidContact(contact, channel)));

          if (!valid) invalidRows += 1;

          recipients.push({
            id: generateId("rcp"),
            lastName: lastName || "—",
            firstName: firstName || "—",
            contact,
            valid,
          });
        }

        resolve({
          recipients,
          totalRows: Math.max(rows.length - 1, 0),
          validRows: recipients.filter((r) => r.valid).length,
          invalidRows,
          detectedColumns,
          empty: recipients.length === 0,
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.readAsArrayBuffer(file);
  });
}

export function simulateSmtpConnection(
  email: string,
  smtpServer: string,
  port: string,
  username: string,
  password: string,
): boolean {
  const portNum = Number(port);
  return (
    email.includes("@") &&
    smtpServer.length > 3 &&
    portNum > 0 &&
    username.length > 0 &&
    password.length >= 4
  );
}
