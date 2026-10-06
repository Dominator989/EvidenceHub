import { createHash, randomBytes, randomUUID, scryptSync } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createDatabase } from "../src/infrastructure/database.js";

const database = createDatabase();
const now = new Date().toISOString();
const organisationId = "demo-organisation";
const userId = "demo-user";
const productIds = {
  sunscreen: "demo-product-sunscreen",
  cleaner: "demo-product-cleaner"
};

function passwordHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function insertOnce(table: string, values: Record<string, string | number | null>): void {
  const columns = Object.keys(values);
  const placeholders = columns.map((column) => `@${column}`).join(", ");
  database.prepare(`INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`).run(values);
}

function createDemoPdf(): Buffer {
  const content = "BT\n/F1 24 Tf\n72 720 Td\n(Northstar Goods) Tj\n0 -40 Td\n/F1 16 Tf\n(Product Safety Certificate) Tj\n0 -28 Td\n/F1 12 Tf\n(This is a local EvidenceHub demo document.) Tj\nET\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}endstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "ascii");
}

insertOnce("organisations", { id: organisationId, name: "Northstar Goods (Demo)", created_at: now });
insertOnce("users", {
  id: userId,
  organisation_id: organisationId,
  email: "demo@evidencehub.local",
  password_hash: passwordHash("DemoPassword123!"),
  created_at: now
});

insertOnce("products", { id: productIds.sunscreen, organisation_id: organisationId, name: "Northstar SPF 50 Sunscreen", sku: "NS-SPF50", created_at: now });
insertOnce("products", { id: productIds.cleaner, organisation_id: organisationId, name: "Northstar Citrus Cleaner", sku: "NS-CLEAN-01", created_at: now });

const requirements = [
  { id: "demo-req-sunscreen-safety", product_id: productIds.sunscreen, name: "Product safety certificate", required: 1 },
  { id: "demo-req-sunscreen-insurance", product_id: productIds.sunscreen, name: "Product liability insurance", required: 1 },
  { id: "demo-req-cleaner-sds", product_id: productIds.cleaner, name: "Safety data sheet", required: 1 },
  { id: "demo-req-cleaner-supplier", product_id: productIds.cleaner, name: "Supplier declaration", required: 1 }
];
requirements.forEach((requirement) => insertOnce("evidence_requirements", requirement));

const uploadDirectory = path.join(process.cwd(), "data", "uploads");

async function main(): Promise<void> {
  await mkdir(uploadDirectory, { recursive: true });
  const sampleStorageKey = "demo-sunscreen-certificate.pdf";
  const demoPdf = createDemoPdf();
  await writeFile(path.join(uploadDirectory, sampleStorageKey), demoPdf);
  database.prepare(`
    INSERT INTO evidence_documents
      (id, product_id, requirement_id, file_name, document_type, storage_key, mime_type, size_bytes, expires_at, status, uploaded_at)
    VALUES (@id, @product_id, @requirement_id, @file_name, @document_type, @storage_key, @mime_type, @size_bytes, @expires_at, @status, @uploaded_at)
    ON CONFLICT(id) DO UPDATE SET
      file_name = excluded.file_name, document_type = excluded.document_type,
      storage_key = excluded.storage_key, mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes, expires_at = excluded.expires_at,
      status = excluded.status
  `).run({
    id: "demo-doc-sunscreen-certificate",
    product_id: productIds.sunscreen,
    requirement_id: "demo-req-sunscreen-safety",
    file_name: "northstar-safety-certificate.pdf",
    document_type: "Safety certificate",
    storage_key: sampleStorageKey,
    mime_type: "application/pdf",
    size_bytes: demoPdf.length,
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString(),
    status: "pending_review",
    uploaded_at: now
  });

  const seedMarker = createHash("sha256").update(`${organisationId}:${userId}`).digest("hex").slice(0, 12);
  console.log(`Demo data is ready (seed ${seedMarker}).`);
  console.log("Email: demo@evidencehub.local");
  console.log("Password: DemoPassword123!");
  console.log("This account is for local development only.");
  database.close();
}

main().catch((error: unknown) => {
  database.close();
  console.error(error);
  process.exitCode = 1;
});
