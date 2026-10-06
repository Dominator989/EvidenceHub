import { randomUUID } from "node:crypto";
import type { ReminderEvent } from "../domain/compliance.js";
import { ComplianceRepository } from "../infrastructure/compliance-repository.js";

export type ReminderDelivery = {
  channel: "local_log";
  deliver(input: { recipient: string; subject: string; body: string }): void;
};

export class LocalReminderDelivery implements ReminderDelivery {
  channel = "local_log" as const;

  deliver(_input: { recipient: string; subject: string; body: string }): void {
    // The persisted reminder event is the local delivery record.
  }
}

export class ReminderService {
  constructor(
    private readonly repository: ComplianceRepository,
    private readonly delivery: ReminderDelivery
  ) {}

  sendRenewalReminder(productId: string, documentId: string, organisationId: string, recipient: string): ReminderEvent {
    const product = this.repository.getProduct(productId, organisationId);
    const document = this.repository.getDocument(documentId);
    if (!product || !document || document.productId !== productId) throw new Error("Evidence document not found");
    if (document.status !== "approved" || !document.expiresAt) throw new Error("Only approved evidence with an expiry date can receive renewal reminders");

    const event: ReminderEvent = {
      id: randomUUID(),
      organisationId,
      productId,
      documentId,
      recipient,
      channel: this.delivery.channel,
      sentAt: new Date().toISOString()
    };
    this.delivery.deliver({
      recipient,
      subject: `Renewal reminder: ${document.fileName}`,
      body: `${product.name} evidence expires on ${document.expiresAt}.`
    });
    return this.repository.addReminderEvent(event);
  }

  getReminderEvents(documentId: string, organisationId: string): ReminderEvent[] {
    return this.repository.getReminderEvents(documentId, organisationId);
  }
}
