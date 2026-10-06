import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { ShareLink } from "../domain/compliance.js";
import { ComplianceRepository } from "../infrastructure/compliance-repository.js";

export class ShareService {
  constructor(private readonly repository: ComplianceRepository) {}

  createLink(productId: string, organisationId: string, createdByUserId: string, expiresInDays: number): { link: ShareLink; token: string } {
    const product = this.repository.getProduct(productId, organisationId);
    if (!product) throw new Error(`Product '${productId}' was not found`);
    const token = randomBytes(32).toString("base64url");
    const link: ShareLink = {
      id: randomUUID(),
      organisationId,
      productId,
      createdByUserId,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(Date.now() + expiresInDays * 86_400_000).toISOString(),
      revokedAt: null,
      createdAt: new Date().toISOString()
    };
    return { link: this.repository.createShareLink(link), token };
  }

  getLink(token: string): ShareLink | undefined {
    return this.repository.getShareLink(this.hashToken(token));
  }

  revokeLink(linkId: string, organisationId: string): void {
    if (!this.repository.revokeShareLink(linkId, organisationId)) throw new Error("Share link not found");
  }

  recordAccess(link: ShareLink, accessedAt: string, userAgent: string | undefined): void {
    this.repository.addShareAccess({
      id: randomUUID(),
      shareLinkId: link.id,
      accessedAt,
      userAgent: userAgent ?? null
    });
  }

  getAccessEvents(linkId: string): ReturnType<ComplianceRepository["getShareAccessEvents"]> {
    return this.repository.getShareAccessEvents(linkId);
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
