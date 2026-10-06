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
});
