import { describe, expect, it } from "vitest";
import { calculateCompliance, type EvidenceDocument, type EvidenceRequirement, type Product } from "./compliance.js";

const product: Product = { id: "product-1", organisationId: "org-1", name: "Widget", sku: "W-1", createdAt: "2026-01-01T00:00:00.000Z" };
const requirement: EvidenceRequirement = { id: "requirement-1", productId: product.id, name: "Safety certificate", required: true };

function document(status: EvidenceDocument["status"], expiresAt: string | null): EvidenceDocument {
  return { id: "document-1", productId: product.id, requirementId: requirement.id, fileName: "certificate.pdf", documentType: "certificate", storageKey: "certificate.pdf", mimeType: "application/pdf", sizeBytes: 100, expiresAt, status, uploadedAt: "2026-01-01T00:00:00.000Z" };
}

describe("calculateCompliance", () => {
  it("marks a product incomplete when required evidence is missing", () => {
    expect(calculateCompliance(product, [requirement], [], new Date("2026-01-01")).status).toBe("incomplete");
  });

  it("does not count pending evidence as approved", () => {
    const result = calculateCompliance(product, [requirement], [document("pending_review", null)], new Date("2026-01-01"));
    expect(result.approvedEvidence).toBe(0);
    expect(result.missingRequirements).toEqual(["Safety certificate"]);
  });

  it("warns when approved evidence expires within thirty days", () => {
    const result = calculateCompliance(product, [requirement], [document("approved", "2026-01-20T00:00:00.000Z")], new Date("2026-01-01"));
    expect(result.status).toBe("action_required");
    expect(result.expiringEvidence).toBe(1);
  });
});
