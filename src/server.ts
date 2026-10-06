import express from "express";
import path from "node:path";
import { z } from "zod";
import { ComplianceService } from "./application/compliance-service.js";
import { createDatabase } from "./infrastructure/database.js";
import { ComplianceRepository } from "./infrastructure/compliance-repository.js";

const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));
const service = new ComplianceService(new ComplianceRepository(createDatabase()));

app.get("/", (_request, response) => {
  response.redirect("/dashboard.html");
});

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "evidencehub" });
});

const productSchema = z.object({
  organisationId: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().min(1)
});
const requirementSchema = z.object({ name: z.string().min(1), required: z.boolean().default(true) });
const documentSchema = z.object({
  requirementId: z.string().nullable(),
  fileName: z.string().min(1),
  documentType: z.string().min(1),
  expiresAt: z.string().datetime().nullable(),
  status: z.enum(["pending_review", "approved", "rejected"])
});

app.post("/api/products", (request, response) => {
  const result = productSchema.safeParse(request.body);
  if (!result.success) return response.status(400).json({ error: result.error.flatten() });
  return response.status(201).json(service.createProduct(result.data));
});

app.get("/api/products", (_request, response) => {
  return response.json(service.getProducts());
});

app.post("/api/products/:productId/requirements", (request, response) => {
  const result = requirementSchema.safeParse(request.body);
  if (!result.success) return response.status(400).json({ error: result.error.flatten() });
  try {
    return response.status(201).json(service.addRequirement(request.params.productId, result.data));
  } catch (error) {
    return response.status(404).json({ error: error instanceof Error ? error.message : "Product not found" });
  }
});

app.post("/api/products/:productId/documents", (request, response) => {
  const result = documentSchema.safeParse(request.body);
  if (!result.success) return response.status(400).json({ error: result.error.flatten() });
  try {
    return response.status(201).json(service.addDocument(request.params.productId, result.data));
  } catch (error) {
    return response.status(404).json({ error: error instanceof Error ? error.message : "Product not found" });
  }
});

app.get("/api/products/:productId/compliance", (request, response) => {
  try {
    return response.json(service.getCompliance(request.params.productId));
  } catch (error) {
    return response.status(404).json({ error: error instanceof Error ? error.message : "Product not found" });
  }
});

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => console.log(`EvidenceHub API listening on http://localhost:${port}`));
}

export default app;
