import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "./server.js";

describe("server", () => {
  async function authenticatedAgent(label: string) {
    const agent = request.agent(app);
    const registration = await agent.post("/api/auth/register").send({
      organisationName: `${label} organisation`,
      email: `${label}-${Date.now()}@example.com`,
      password: "a-secure-password"
    });
    expect(registration.status).toBe(201);
    expect(registration.headers["set-cookie"]).toBeDefined();
    return agent;
  }

  it("shows a helpful landing page", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login.html");
  });

  it("reports API health", async () => {
    const response = await request(app).get("/api/health");
    expect(response.body).toEqual({ status: "ok", service: "evidencehub" });
  });

  it("lists products for the dashboard", async () => {
    const agent = await authenticatedAgent("list");
    const response = await agent.get("/api/products");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.any(Array));
  });

  it("registers extraction routes before the first upload", async () => {
    const agent = await authenticatedAgent("routes");
    const response = await agent.get("/api/products/missing-product/documents/missing-document/extraction");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Product 'missing-product' was not found" });
  });

  it("uploads an evidence file and serves it only for its product", async () => {
    const agent = await authenticatedAgent("upload");
    const product = await agent.post("/api/products").send({ organisationId: "ignored", name: "Upload test", sku: `UPLOAD-${Date.now()}` });
    expect(product.status).toBe(201);
    const requirement = await agent.post(`/api/products/${product.body.id}/requirements`).send({ name: "Certificate", required: true });
    expect(requirement.status).toBe(201);
    const upload = await agent
      .post(`/api/products/${product.body.id}/documents`)
      .field("requirementId", requirement.body.id)
      .field("documentType", "Certificate")
      .attach("file", Buffer.from("test evidence"), "certificate.pdf");
    expect(upload.status).toBe(201);
    expect(upload.body.mimeType).toBe("application/pdf");
    const extraction = await agent.get(`/api/products/${product.body.id}/documents/${upload.body.id}/extraction`);
    expect(extraction.status).toBe(200);
    expect(extraction.body.status).toBe("manual_required");
    const confirmed = await agent.post(`/api/products/${product.body.id}/documents/${upload.body.id}/extraction/confirm`).send({ documentType: "Certificate", expiresAt: null });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.status).toBe("confirmed");
    const download = await agent.get(`/api/products/${product.body.id}/documents/${upload.body.id}/download`);
    expect(download.status).toBe(200);
    expect(download.body.toString()).toBe("test evidence");
  });

  it("exports an evidence pack for the selected product", async () => {
    const agent = await authenticatedAgent("export");
    const product = await agent.post("/api/products").send({ organisationId: "ignored", name: "Export test", sku: `EXPORT-${Date.now()}` });
    expect(product.status).toBe(201);
    const upload = await agent
      .post(`/api/products/${product.body.id}/documents`)
      .field("documentType", "Certificate")
      .attach("file", Buffer.from("export evidence"), "certificate.pdf");
    expect(upload.status).toBe(201);

    const pack = await agent.get(`/api/products/${product.body.id}/evidence-pack`).buffer(true).parse((response, callback) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => callback(null, Buffer.concat(chunks)));
    });
    expect(pack.status).toBe(200);
    expect(pack.headers["content-type"]).toContain("application/zip");
    expect(pack.headers["content-disposition"]).toContain("export-test-evidence-pack.zip");
    expect(pack.body.length).toBeGreaterThan(0);
  });

  it("lists approved evidence due for renewal", async () => {
    const agent = await authenticatedAgent("renewals");
    const product = await agent.post("/api/products").send({ organisationId: "ignored", name: "Renewal test", sku: `RENEWAL-${Date.now()}` });
    expect(product.status).toBe(201);
    const upload = await agent
      .post(`/api/products/${product.body.id}/documents`)
      .field("documentType", "Insurance certificate")
      .field("expiresAt", new Date(Date.now() + 7 * 86_400_000).toISOString())
      .attach("file", Buffer.from("renewal evidence"), "insurance.pdf");
    expect(upload.status).toBe(201);
    const review = await agent.post(`/api/products/${product.body.id}/documents/${upload.body.id}/review`).send({ action: "approved" });
    expect(review.status).toBe(200);

    const renewals = await agent.get(`/api/products/${product.body.id}/renewals?days=30`);
    expect(renewals.status).toBe(200);
    expect(renewals.body[0]).toMatchObject({ renewalStatus: "expiring_soon", requirementName: null });
    expect(renewals.body[0].document).toMatchObject({ id: upload.body.id, status: "approved" });
  });

  it("records review decisions and requires notes for negative decisions", async () => {
    const agent = await authenticatedAgent("review");
    const product = await agent.post("/api/products").send({ organisationId: "ignored", name: "Review test", sku: `REVIEW-${Date.now()}` });
    const upload = await agent
      .post(`/api/products/${product.body.id}/documents`)
      .field("documentType", "Certificate")
      .attach("file", Buffer.from("review evidence"), "review.pdf");
    expect(upload.status).toBe(201);
    const rejectedWithoutNote = await agent.post(`/api/products/${product.body.id}/documents/${upload.body.id}/review`).send({ action: "rejected" });
    expect(rejectedWithoutNote.status).toBe(400);
    const rejected = await agent.post(`/api/products/${product.body.id}/documents/${upload.body.id}/review`).send({ action: "rejected", note: "The certificate is expired" });
    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe("rejected");
    const audit = await agent.get(`/api/products/${product.body.id}/documents/${upload.body.id}/audit`);
    expect(audit.status).toBe(200);
    expect(audit.body[0]).toMatchObject({ action: "rejected", note: "The certificate is expired" });
  });

  it("does not expose products across organisations", async () => {
    const owner = await authenticatedAgent("owner");
    const other = await authenticatedAgent("other");
    const product = await owner.post("/api/products").send({ organisationId: "ignored", name: "Private product", sku: `PRIVATE-${Date.now()}` });
    const response = await other.get(`/api/products/${product.body.id}/compliance`);
    expect(response.status).toBe(404);
  });
});
