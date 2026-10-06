import { randomUUID } from "node:crypto";
import { calculateCompliance, type EvidenceAuditEvent, type EvidenceDocument, type EvidenceRequirement, type EvidenceReviewAction, type Product } from "../domain/compliance.js";
import { ComplianceRepository } from "../infrastructure/compliance-repository.js";

export class ComplianceService {
  constructor(private readonly repository: ComplianceRepository) {}

  createProduct(input: { organisationId: string; name: string; sku: string }): Product {
    return this.repository.createProduct({
      id: randomUUID(),
      ...input,
      createdAt: new Date().toISOString()
    });
  }

  getProducts(organisationId?: string): Product[] {
    return this.repository.getProducts(organisationId);
  }

  getDocument(id: string): EvidenceDocument | undefined {
    return this.repository.getDocument(id);
  }

  getDocuments(productId: string, organisationId?: string): EvidenceDocument[] {
    this.assertProduct(productId, organisationId);
    return this.repository.getDocuments(productId);
  }

  reviewDocument(
    productId: string,
    documentId: string,
    input: { action: EvidenceReviewAction; note: string | null; actorUserId: string },
    organisationId: string
  ): EvidenceDocument {
    this.assertProduct(productId, organisationId);
    const document = this.repository.getDocument(documentId);
    if (!document || document.productId !== productId) throw new Error(`Document '${documentId}' was not found`);
    if (input.action !== "approved" && (!input.note || input.note.trim().length < 3)) {
      throw new Error("A review note is required when evidence is not approved");
    }
    const status = input.action === "approved" ? "approved" : input.action === "rejected" ? "rejected" : "pending_review";
    this.repository.updateDocumentStatus(documentId, status);
    this.repository.addAuditEvent({
      id: randomUUID(),
      documentId,
      organisationId,
      actorUserId: input.actorUserId,
      action: input.action,
      note: input.note?.trim() || null,
      createdAt: new Date().toISOString()
    });
    return { ...document, status };
  }

  getAuditEvents(productId: string, documentId: string, organisationId: string): EvidenceAuditEvent[] {
    this.assertProduct(productId, organisationId);
    return this.repository.getAuditEvents(documentId, organisationId);
  }

  addRequirement(productId: string, input: { name: string; required: boolean }, organisationId?: string): EvidenceRequirement {
    this.assertProduct(productId, organisationId);
    return this.repository.addRequirement({ id: randomUUID(), productId, ...input });
  }

  getRequirements(productId: string, organisationId?: string): EvidenceRequirement[] {
    this.assertProduct(productId, organisationId);
    return this.repository.getRequirements(productId);
  }

  addDocument(productId: string, input: Omit<EvidenceDocument, "id" | "productId" | "uploadedAt">, organisationId?: string): EvidenceDocument {
    this.assertProduct(productId, organisationId);
    return this.repository.addDocument({ id: randomUUID(), productId, uploadedAt: new Date().toISOString(), ...input });
  }

  getCompliance(productId: string, organisationId?: string) {
    const product = this.assertProduct(productId, organisationId);
    return calculateCompliance(product, this.repository.getRequirements(productId), this.repository.getDocuments(productId));
  }

  private assertProduct(productId: string, organisationId?: string): Product {
    const product = this.repository.getProduct(productId, organisationId);
    if (!product) throw new Error(`Product '${productId}' was not found`);
    return product;
  }
}
