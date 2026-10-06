# EvidenceHub

EvidenceHub is a compliance evidence workspace for small businesses. It keeps
supplier, product, insurance, safety, and certification documents organised,
reviewable, and ready to share with an auditor or customer.

## Planned MVP

- Create organisations, products, and suppliers
- Upload and securely store evidence documents
- Extract document metadata with OCR
- Track expiry dates and missing evidence
- Record approvals and review history
- Send renewal reminders
- Export a complete product evidence pack

## Product principles

- Evidence first: every compliance status links to a source document
- Human approval: extracted data is reviewable before it is trusted
- Explainable AI: summaries cite the documents they came from
- Secure by default: tenant isolation, least-privilege access, and audit logs

## Current implementation

The `feature/proofstack-mvp` branch contains the first vertical slice:

- Products and evidence requirements
- Evidence document records with review status and expiry dates
- Compliance calculation based on required, approved, and expiring evidence
- SQLite persistence with foreign-key enforcement
- Typed Express API with Zod request validation
- Domain tests and a TypeScript build

## Local development

```bash
npm install
npm run dev
```

The API listens on `http://localhost:3000` by default. The database is created
at `./data/evidencehub.sqlite`.

### Example workflow

```bash
curl -X POST http://localhost:3000/api/products ^
  -H "Content-Type: application/json" ^
  -d "{\"organisationId\":\"org-1\",\"name\":\"Sample product\",\"sku\":\"SKU-1\"}"
```

The API is intentionally small at this stage. Authentication, tenant
boundaries, secure file storage, and OCR are planned before production use.
