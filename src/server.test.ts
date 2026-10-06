import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "./server.js";

describe("server", () => {
  it("shows a helpful landing page", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("EvidenceHub is running");
  });

  it("reports API health", async () => {
    const response = await request(app).get("/api/health");
    expect(response.body).toEqual({ status: "ok", service: "evidencehub" });
  });
});
