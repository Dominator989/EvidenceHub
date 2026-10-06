import express from "express";
import multer from "multer";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ComplianceService } from "./application/compliance-service.js";
import { createDatabase } from "./infrastructure/database.js";
import { ComplianceRepository } from "./infrastructure/compliance-repository.js";

const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));
const service = new ComplianceService(new ComplianceRepository(createDatabase()));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const allowed = new Set(["application/pdf", "image/png", "image/jpeg"]);
    callback(null, allowed.has(file.mimetype));
  }
});
const uploadDirectory = path.join(process.cwd(), "data", "uploads");

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

app.get("/api/products/:productId/requirements", (request, response) => {
  try {
    return response.json(service.getRequirements(request.params.productId));
  } catch (error) {
    return response.status(404).json({ error: error instanceof Error ? error.message : "Product not found" });
  }
});

app.post("/api/products/:productId/documents", (request, response) => {
  upload.single("file")(request, response, async (uploadError) => {
    if (uploadError instanceof multer.MulterError && uploadError.code === "LIMIT_FILE_SIZE") {
      return response.status(413).json({ error: "Files must be 10 MB or smaller" });
    }
    if (uploadError) return response.status(400).json({ error: "Only PDF, PNG, and JPEG files are accepted" });
    if (!request.file) return response.status(400).json({ error: "A document file is required" });
    const result = documentSchema.safeParse({
      requirementId: request.body.requirementId || null,
      documentType: request.body.documentType,
      expiresAt: request.body.expiresAt || null,
      status: request.body.status || "pending_review"
    });
    if (!result.success) return response.status(400).json({ error: result.error.flatten() });
    const storageKey = `${randomUUID()}${path.extname(request.file.originalname).toLowerCase()}`;
    const storagePath = path.join(uploadDirectory, storageKey);
    try {
      await mkdir(uploadDirectory, { recursive: true });
      await writeFile(storagePath, request.file.buffer, { flag: "wx" });
      const document = service.addDocument(request.params.productId, {
        ...result.data,
        fileName: request.file.originalname,
        storageKey,
        mimeType: request.file.mimetype,
        sizeBytes: request.file.size
      });
      return response.status(201).json(document);
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      const message = error instanceof Error ? error.message : "Document upload failed";
      return response.status(message.startsWith("Product '") ? 404 : 500).json({ error: message });
    }
  });
});

app.get("/api/products/:productId/documents/:documentId/download", (request, response) => {
  const document = service.getDocument(request.params.documentId);
  if (!document || document.productId !== request.params.productId || !document.storageKey) {
    return response.status(404).json({ error: "Document not found" });
  }
  const storagePath = path.resolve(uploadDirectory, document.storageKey);
  if (path.dirname(storagePath) !== path.resolve(uploadDirectory)) {
    return response.status(404).json({ error: "Document not found" });
  }
  return response.type(document.mimeType).download(storagePath, document.fileName);
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
