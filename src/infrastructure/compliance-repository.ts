import type Database from "better-sqlite3";
import type { EvidenceDocument, EvidenceRequirement, Product } from "../domain/compliance.js";

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
}
