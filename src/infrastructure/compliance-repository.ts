import type Database from "better-sqlite3";
import type { EvidenceAuditEvent, EvidenceDocument, EvidenceExtraction, EvidenceRequirement, EvidenceStatus, Product, ReminderEvent } from "../domain/compliance.js";

export class ComplianceRepository {
  constructor(private readonly database: Database.Database) {}

  createProduct(product: Product): Product {
    this.database.prepare(
      "INSERT INTO products (id, organisation_id, name, sku, created_at) VALUES (@id, @organisationId, @name, @sku, @createdAt)"
    ).run(product);
    return product;
  }

  getProduct(id: string, organisationId?: string): Product | undefined {
    const row = this.database.prepare("SELECT id, organisation_id as organisationId, name, sku, created_at as createdAt FROM products WHERE id = @id AND (@organisationId IS NULL OR organisation_id = @organisationId)").get({ id, organisationId: organisationId ?? null });
    return row as Product | undefined;
  }

  getProducts(organisationId?: string): Product[] {
    return this.database.prepare(
      "SELECT id, organisation_id as organisationId, name, sku, created_at as createdAt FROM products WHERE (@organisationId IS NULL OR organisation_id = @organisationId) ORDER BY created_at DESC"
    ).all({ organisationId: organisationId ?? null }) as Product[];
  }

  addRequirement(requirement: EvidenceRequirement): EvidenceRequirement {
    this.database.prepare(
      "INSERT INTO evidence_requirements (id, product_id, name, required) VALUES (@id, @productId, @name, @required)"
    ).run({ ...requirement, required: requirement.required ? 1 : 0 });
    return requirement;
  }

  getRequirements(productId: string): EvidenceRequirement[] {
    return this.database.prepare(
      "SELECT id, product_id as productId, name, required FROM evidence_requirements WHERE product_id = ?"
    ).all(productId).map((row) => ({ ...(row as Omit<EvidenceRequirement, "required">), required: Boolean((row as { required: number }).required) }));
  }

  addDocument(document: EvidenceDocument): EvidenceDocument {
    this.database.prepare(
      `INSERT INTO evidence_documents
        (id, product_id, requirement_id, file_name, document_type, storage_key, mime_type, size_bytes, expires_at, status, uploaded_at)
       VALUES (@id, @productId, @requirementId, @fileName, @documentType, @storageKey, @mimeType, @sizeBytes, @expiresAt, @status, @uploadedAt)`
    ).run(document);
    return document;
  }

  getDocuments(productId: string): EvidenceDocument[] {
    return this.database.prepare(
      "SELECT id, product_id as productId, requirement_id as requirementId, file_name as fileName, document_type as documentType, storage_key as storageKey, mime_type as mimeType, size_bytes as sizeBytes, expires_at as expiresAt, status, uploaded_at as uploadedAt FROM evidence_documents WHERE product_id = ?"
    ).all(productId) as EvidenceDocument[];
  }

  getDocument(id: string): EvidenceDocument | undefined {
    return this.database.prepare(
      "SELECT id, product_id as productId, requirement_id as requirementId, file_name as fileName, document_type as documentType, storage_key as storageKey, mime_type as mimeType, size_bytes as sizeBytes, expires_at as expiresAt, status, uploaded_at as uploadedAt FROM evidence_documents WHERE id = ?"
    ).get(id) as EvidenceDocument | undefined;
  }

  updateDocumentStatus(id: string, status: EvidenceStatus): void {
    this.database.prepare("UPDATE evidence_documents SET status = ? WHERE id = ?").run(status, id);
  }

  addAuditEvent(event: EvidenceAuditEvent): EvidenceAuditEvent {
    this.database.prepare(
      `INSERT INTO evidence_audit_events
        (id, document_id, organisation_id, actor_user_id, action, note, created_at)
       VALUES (@id, @documentId, @organisationId, @actorUserId, @action, @note, @createdAt)`
    ).run(event);
    return event;
  }

  getAuditEvents(documentId: string, organisationId: string): EvidenceAuditEvent[] {
    return this.database.prepare(
      `SELECT id, document_id as documentId, organisation_id as organisationId,
        actor_user_id as actorUserId, action, note, created_at as createdAt
       FROM evidence_audit_events
       WHERE document_id = ? AND organisation_id = ?
       ORDER BY created_at DESC`
    ).all(documentId, organisationId) as EvidenceAuditEvent[];
  }

  addReminderEvent(event: ReminderEvent): ReminderEvent {
    this.database.prepare(
      `INSERT INTO reminder_events
        (id, organisation_id, product_id, document_id, recipient, channel, sent_at)
       VALUES (@id, @organisationId, @productId, @documentId, @recipient, @channel, @sentAt)`
    ).run(event);
    return event;
  }

  getReminderEvents(documentId: string, organisationId: string): ReminderEvent[] {
    return this.database.prepare(
      `SELECT id, organisation_id as organisationId, product_id as productId,
        document_id as documentId, recipient, channel, sent_at as sentAt
       FROM reminder_events
       WHERE document_id = ? AND organisation_id = ?
       ORDER BY sent_at DESC`
    ).all(documentId, organisationId) as ReminderEvent[];
  }

  saveExtraction(extraction: EvidenceExtraction): EvidenceExtraction {
    this.database.prepare(
      `INSERT INTO evidence_extractions
        (id, document_id, organisation_id, status, extracted_text, suggested_document_type,
         suggested_expires_at, confidence, error_message, confirmed_at, confirmed_by_user_id,
         created_at, updated_at)
       VALUES (@id, @documentId, @organisationId, @status, @extractedText, @suggestedDocumentType,
         @suggestedExpiresAt, @confidence, @errorMessage, @confirmedAt, @confirmedByUserId,
         @createdAt, @updatedAt)
       ON CONFLICT(document_id) DO UPDATE SET
         status = excluded.status, extracted_text = excluded.extracted_text,
         suggested_document_type = excluded.suggested_document_type,
         suggested_expires_at = excluded.suggested_expires_at, confidence = excluded.confidence,
         error_message = excluded.error_message, updated_at = excluded.updated_at`
    ).run(extraction);
    return extraction;
  }

  getExtraction(documentId: string, organisationId: string): EvidenceExtraction | undefined {
    return this.database.prepare(
      `SELECT id, document_id as documentId, organisation_id as organisationId, status,
        extracted_text as extractedText, suggested_document_type as suggestedDocumentType,
        suggested_expires_at as suggestedExpiresAt, confidence, error_message as errorMessage,
        confirmed_at as confirmedAt, confirmed_by_user_id as confirmedByUserId,
        created_at as createdAt, updated_at as updatedAt
       FROM evidence_extractions WHERE document_id = ? AND organisation_id = ?`
    ).get(documentId, organisationId) as EvidenceExtraction | undefined;
  }

  confirmExtraction(documentId: string, organisationId: string, userId: string, documentType: string, expiresAt: string | null, now: string): void {
    const update = this.database.transaction(() => {
      this.database.prepare("UPDATE evidence_documents SET document_type = ?, expires_at = ? WHERE id = (SELECT id FROM evidence_documents WHERE id = ? AND product_id IN (SELECT id FROM products WHERE organisation_id = ?))").run(documentType, expiresAt, documentId, organisationId);
      this.database.prepare("UPDATE evidence_extractions SET status = 'confirmed', confirmed_at = ?, confirmed_by_user_id = ?, updated_at = ? WHERE document_id = ? AND organisation_id = ?").run(now, userId, now, documentId, organisationId);
    });
    update();
  }
}
