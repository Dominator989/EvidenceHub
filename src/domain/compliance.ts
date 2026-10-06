export type EvidenceStatus = "pending_review" | "approved" | "rejected";

export type Product = {
  id: string;
  organisationId: string;
  name: string;
  sku: string;
  createdAt: string;
};

export type EvidenceRequirement = {
  id: string;
  productId: string;
  name: string;
  required: boolean;
};

export type EvidenceDocument = {
  id: string;
  productId: string;
  requirementId: string | null;
  fileName: string;
  documentType: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string | null;
  status: EvidenceStatus;
  uploadedAt: string;
};

export type EvidenceReviewAction = "approved" | "rejected" | "changes_requested";

export type ExtractionStatus = "pending" | "ready_for_review" | "confirmed" | "manual_required" | "failed";

export type EvidenceExtraction = {
  id: string;
  documentId: string;
  organisationId: string;
  status: ExtractionStatus;
  extractedText: string | null;
  suggestedDocumentType: string | null;
  suggestedExpiresAt: string | null;
  confidence: number | null;
  errorMessage: string | null;
  confirmedAt: string | null;
  confirmedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EvidenceAuditEvent = {
  id: string;
  documentId: string;
  organisationId: string;
  actorUserId: string;
  action: EvidenceReviewAction;
  note: string | null;
  createdAt: string;
};

export type ReminderEvent = {
  id: string;
  organisationId: string;
  productId: string;
  documentId: string;
  recipient: string;
  channel: "local_log";
  sentAt: string;
};

export type ComplianceSummary = {
  productId: string;
  status: "compliant" | "action_required" | "incomplete";
  requiredEvidence: number;
  approvedEvidence: number;
  expiringEvidence: number;
  missingRequirements: string[];
};

export function calculateCompliance(
  product: Product,
  requirements: EvidenceRequirement[],
  documents: EvidenceDocument[],
  now = new Date()
): ComplianceSummary {
  const required = requirements.filter((requirement) => requirement.required);
  const approved = documents.filter(
    (document) => document.status === "approved" && required.some((requirement) => requirement.id === document.requirementId)
  );
  const missingRequirements = required
    .filter((requirement) => !approved.some((document) => document.requirementId === requirement.id))
    .map((requirement) => requirement.name);
  const expiryWindow = new Date(now);
  expiryWindow.setDate(expiryWindow.getDate() + 30);
  const expiringEvidence = approved.filter(
    (document) => document.expiresAt !== null && new Date(document.expiresAt) <= expiryWindow
  ).length;

  return {
    productId: product.id,
    status: missingRequirements.length > 0 ? "incomplete" : expiringEvidence > 0 ? "action_required" : "compliant",
    requiredEvidence: required.length,
    approvedEvidence: approved.length,
    expiringEvidence,
    missingRequirements
  };
}
