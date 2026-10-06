import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "./server.js";

describe("server", () => {
  it("shows a helpful landing page", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/dashboard.html");
  });

  it("reports API health", async () => {
    const response = await request(app).get("/api/health");
    expect(response.body).toEqual({ status: "ok", service: "evidencehub" });
  });

  it("lists products for the dashboard", async () => {
    const response = await request(app).get("/api/products");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.any(Array));
  });

  it("uploads an evidence file and serves it only for its product", async () => {
    const product = await request(app).post("/api/products").send({ organisationId: "test-org", name: "Upload test", sku: `UPLOAD-${Date.now()}` });
    const requirement = await request(app).post(`/api/products/${product.body.id}/requirements`).send({ name: "Certificate", required: true });
    const upload = await request(app)
      .post(`/api/products/${product.body.id}/documents`)
      .field("requirementId", requirement.body.id)
      .field("documentType", "Certificate")
      .attach("file", Buffer.from("test evidence"), "certificate.pdf");
    expect(upload.status).toBe(201);
    expect(upload.body.mimeType).toBe("application/pdf");
    const download = await request(app).get(`/api/products/${product.body.id}/documents/${upload.body.id}/download`);
    expect(download.status).toBe(200);
    expect(download.body.toString()).toBe("test evidence");
  });
});
