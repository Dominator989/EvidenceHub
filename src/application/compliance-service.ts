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

  getEvidencePack(productId: string, organisationId: string) {
    const product = this.assertProduct(productId, organisationId);
    const requirements = this.repository.getRequirements(productId);
    const documents = this.repository.getDocuments(productId);

    return {
      product,
      compliance: calculateCompliance(product, requirements, documents),
      requirements,
      documents: documents.map((document) => ({
        ...document,
        auditEvents: this.repository.getAuditEvents(document.id, organisationId)
      }))
    };
  }

  getRenewalQueue(productId: string, organisationId: string, days = 30) {
    const product = this.assertProduct(productId, organisationId);
    const requirements = new Map(this.repository.getRequirements(productId).map((requirement) => [requirement.id, requirement.name]));
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + days);

    return this.repository.getDocuments(productId)
      .filter((document) => document.status === "approved" && document.expiresAt !== null && new Date(document.expiresAt) <= cutoff)
      .sort((left, right) => new Date(left.expiresAt as string).getTime() - new Date(right.expiresAt as string).getTime())
      .map((document) => ({
        document,
        productId: product.id,
        requirementName: document.requirementId ? requirements.get(document.requirementId) ?? null : null,
        renewalStatus: new Date(document.expiresAt as string) < now ? "expired" : "expiring_soon",
        daysUntilExpiry: Math.ceil((new Date(document.expiresAt as string).getTime() - now.getTime()) / 86_400_000)
      }));
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
