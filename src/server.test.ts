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
    const download = await agent.get(`/api/products/${product.body.id}/documents/${upload.body.id}/download`);
    expect(download.status).toBe(200);
    expect(download.body.toString()).toBe("test evidence");
  });

  it("does not expose products across organisations", async () => {
    const owner = await authenticatedAgent("owner");
    const other = await authenticatedAgent("other");
    const product = await owner.post("/api/products").send({ organisationId: "ignored", name: "Private product", sku: `PRIVATE-${Date.now()}` });
    const response = await other.get(`/api/products/${product.body.id}/compliance`);
    expect(response.status).toBe(404);
  });
});
