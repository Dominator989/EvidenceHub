import { createWorker } from "tesseract.js";
import { randomUUID } from "node:crypto";
import type { EvidenceExtraction } from "../domain/compliance.js";
import { ComplianceRepository } from "../infrastructure/compliance-repository.js";

export type OcrResult = {
  text: string;
  confidence: number;
  suggestedDocumentType: string | null;
  suggestedExpiresAt: string | null;
};

export interface OcrEngine {
  extract(buffer: Buffer, mimeType: string): Promise<OcrResult>;
}

function suggestType(text: string): string | null {
  const value = text.toLowerCase();
  if (value.includes("certificate")) return "Certificate";
  if (value.includes("insurance")) return "Insurance certificate";
  if (value.includes("safety data sheet") || value.includes("sds")) return "Safety data sheet";
  if (value.includes("declaration of conformity")) return "Declaration of conformity";
  return null;
}

function suggestExpiry(text: string): string | null {
  const match = text.match(/\b(20\d{2})[-/](\d{2})[-/](\d{2})\b/);
  if (!match) return null;
  const candidate = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
  return Number.isNaN(candidate.getTime()) ? null : candidate.toISOString();
}

export class TesseractOcrEngine implements OcrEngine {
  async extract(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    if (mimeType === "application/pdf") throw new Error("PDF OCR requires a text extraction service and is not enabled yet");
    const worker = await createWorker("eng");
    try {
      const result = await worker.recognize(buffer);
      const text = result.data.text.trim();
      return {
        text,
        confidence: Math.round(result.data.confidence) / 100,
        suggestedDocumentType: suggestType(text),
        suggestedExpiresAt: suggestExpiry(text)
      };
    } finally {
      await worker.terminate();
    }
  }
}

export class OcrService {
  constructor(private readonly repository: ComplianceRepository, private readonly engine: OcrEngine) {}

  async process(documentId: string, organisationId: string, buffer: Buffer, mimeType: string): Promise<EvidenceExtraction> {
    const now = new Date().toISOString();
    const base = { id: randomUUID(), documentId, organisationId, extractedText: null, suggestedDocumentType: null, suggestedExpiresAt: null, confidence: null, errorMessage: null, confirmedAt: null, confirmedByUserId: null, createdAt: now, updatedAt: now };
    if (mimeType === "application/pdf") return this.repository.saveExtraction({ ...base, status: "manual_required", errorMessage: "PDF text extraction will be added in a later milestone" });
    try {
      const result = await this.engine.extract(buffer, mimeType);
      return this.repository.saveExtraction({ ...base, status: "ready_for_review", extractedText: result.text, suggestedDocumentType: result.suggestedDocumentType, suggestedExpiresAt: result.suggestedExpiresAt, confidence: result.confidence });
    } catch (error) {
      return this.repository.saveExtraction({ ...base, status: "failed", errorMessage: error instanceof Error ? error.message : "OCR failed" });
    }
  }

  get(documentId: string, organisationId: string): EvidenceExtraction | undefined {
    return this.repository.getExtraction(documentId, organisationId);
  }

  confirm(documentId: string, organisationId: string, userId: string, input: { documentType: string; expiresAt: string | null }): EvidenceExtraction {
    const now = new Date().toISOString();
    this.repository.confirmExtraction(documentId, organisationId, userId, input.documentType, input.expiresAt, now);
    const extraction = this.repository.getExtraction(documentId, organisationId);
    if (!extraction) throw new Error(`Extraction for document '${documentId}' was not found`);
    return extraction;
  }
}
