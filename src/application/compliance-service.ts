import { randomUUID } from "node:crypto";
import { calculateCompliance, type EvidenceDocument, type EvidenceRequirement, type Product } from "../domain/compliance.js";
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
