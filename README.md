# EvidenceHub

EvidenceHub is a compliance evidence workspace for small businesses. It keeps
supplier, product, insurance, safety, and certification documents organised,
reviewable, and ready to share with an auditor or customer.

## Product scope

- Create organisations, products, and suppliers
- Upload and securely store evidence documents
- Review extracted document metadata
- Track expiry dates and missing evidence
- Record approvals and review history
- Send renewal reminders
- Export a complete product evidence pack

## Product principles

- Evidence first: every compliance status links to a source document
- Human approval: extracted data is reviewable before it is trusted
- Explainable automation: summaries cite the documents they came from
- Secure by default: tenant isolation, least-privilege access, and audit logs

## Current implementation

The `feature/proofstack-mvp` branch contains the first vertical slice:

- Products and evidence requirements
- Evidence document records with review status and expiry dates
- Compliance calculation based on required, approved, and expiring evidence
- Browser dashboard for creating products and requirements
- Product list and health API endpoints
- Secure local document uploads for PDF, PNG, and JPEG evidence files
- Download endpoint scoped to the owning product
- Organisation registration, login, logout, and session-based access control
- Tenant isolation for product and document workflows
- Evidence review queue with approve, reject, and request-changes actions
- Immutable review audit events with reviewer and timestamp metadata
- Reviewable OCR metadata extraction for image evidence
- Downloadable product evidence packs with compliance manifest and source files
- Renewal queue for approved evidence that is expired or expiring soon
- Local reminder event history with a provider-ready delivery boundary
- SQLite persistence with foreign-key enforcement
- Typed Express API with Zod request validation
- Domain tests and a TypeScript build

## Local development

### One-click Windows launch

Double-click `start-app.bat`, or run this from PowerShell:

```powershell
./start-app.ps1
```

The script checks that Node.js 20 or newer is installed, installs dependencies
when needed, and starts the development API.

### Manual launch

```bash
npm install
npm run dev
```

### Load demo data

To populate a local development database with example products, requirements,
and a document awaiting review:

```bash
npm run seed:demo
```

Sign in with:

```text
Email: demo@evidencehub.local
Password: DemoPassword123!
```

The demo account and its sample data are intended for local development only.
The seed command is explicit and is never run automatically by the application.
Running it again repairs the generated sample PDF and updates its stored file
metadata without creating duplicate records.

The dashboard is available at `http://localhost:3000`. The database is created
at `./data/evidencehub.sqlite`.

From a selected product, use **Download evidence pack** to export a ZIP
containing the compliance summary, requirements, review history, and uploaded
evidence files. The export is protected by the same organisation-level access
control as the dashboard.

The dashboard also includes a renewal queue with selectable 30, 60, and
90-day windows. It currently identifies approved evidence that needs attention;
users can record a local reminder event against the document. The current
delivery channel is intentionally local; email delivery can be added behind the
same application boundary later.

The current dashboard supports creating products, selecting products, adding
required evidence, uploading evidence files, reviewing evidence, and reviewing
the calculated compliance summary. Review decisions require notes when
evidence is rejected or returned for changes, and each decision is recorded in
an audit trail. Image uploads are sent through Tesseract OCR and extracted
metadata is presented as an untrusted suggestion until a user confirms it.
PDFs currently receive a manual-review state because PDF text extraction is a
separate processing step. Uploads are limited to 10 MB and stored outside the
public directory using generated storage keys. Authentication and
organisation-level tenant isolation are implemented for the development
workflow. Before
production use, add rate limiting, email verification, password reset, CSRF
protection, database backups, and managed object storage.

### Development notes

The API requires an authenticated session for organisation data. Create an
account through the browser dashboard before using product endpoints. The
current implementation is intentionally focused on a small, testable workflow;
OCR, reminders, and external object storage are planned follow-up features.
