import express from "express";
import { z } from "zod";
import { ComplianceService } from "./application/compliance-service.js";
import { createDatabase } from "./infrastructure/database.js";
import { ComplianceRepository } from "./infrastructure/compliance-repository.js";

const app = express();
app.use(express.json());
const service = new ComplianceService(new ComplianceRepository(createDatabase()));

app.get("/", (_request, response) => {
  response.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>EvidenceHub</title>
    <style>
      :root { color-scheme: dark; font-family: system-ui, sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #101827; color: #e5edf8; }
      main { width: min(680px, calc(100% - 40px)); padding: 40px; border: 1px solid #2b3a52; border-radius: 16px; background: #172338; }
      h1 { margin-top: 0; color: #8ed1b2; }
      code { padding: 3px 6px; border-radius: 5px; background: #0d1420; color: #b9d7ff; }
      li { margin: 12px 0; }
    </style>
  </head>
  <body>
    <main>
      <h1>EvidenceHub is running</h1>
      <p>The API is ready for the first evidence-management workflow.</p>
      <ul>
        <li>Create a product: <code>POST /api/products</code></li>
        <li>Add an evidence requirement: <code>POST /api/products/:productId/requirements</code></li>
        <li>Check compliance: <code>GET /api/products/:productId/compliance</code></li>
      </ul>
      <p>See the README for example requests and development commands.</p>
    </main>
  </body>
</html>`);
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
