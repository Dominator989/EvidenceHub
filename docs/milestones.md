# EvidenceHub milestones

This file keeps the project history easy to understand without replacing the
individual Git commits. Commit hashes are intentionally not listed because
history may be rebased while the project is still in early development.

## Project foundation

- Initial project scaffold
- Added the compliance evidence vertical slice:
  products, requirements, evidence metadata, compliance calculation, SQLite,
  typed API, and domain tests
- Added the Windows development launcher
- Added the API landing page and health endpoint
- Ignored the local runtime database
- Added the browser dashboard and product workflow
- Added secure local evidence uploads and product-scoped downloads

## Authentication milestone

- Added organisations, users, sessions, password hashing, and
  authentication services
- Protected product and document routes, added login and
  registration pages, and enforced organisation-level isolation

## Evidence review milestone

- Added an immutable audit event model for evidence decisions
- Added approve, reject, and request-changes actions
- Required reviewer notes for negative decisions
- Added a browser review queue with status and expiry details
- Added tenant-scoped audit history endpoints

## OCR milestone

- Added persisted extraction records with confidence and lifecycle status
- Added Tesseract OCR for PNG and JPEG uploads
- Added safe manual-review fallback for PDF uploads
- Added explicit metadata confirmation before extracted values are trusted

## Evidence pack milestone

- Added a tenant-scoped ZIP export for each product
- Included compliance status, requirements, document metadata, and review history
- Included the original uploaded evidence files in the exported pack
- Added a dashboard action and automated endpoint coverage

## Renewal queue milestone

- Added a tenant-scoped renewal queue for approved evidence
- Included expired and upcoming evidence with days-until-expiry details
- Added 30, 60, and 90-day dashboard filters
- Added automated coverage for renewal eligibility and access control

## Reminder history milestone

- Added persisted reminder events with recipient and delivery channel metadata
- Added local reminder delivery abstraction for development and testing
- Added reminder history and record-reminder API endpoints
- Added a dashboard action for recording a reminder from the renewal queue

## Secure sharing milestone

- Added high-entropy, hashed share tokens with configurable expiry
- Added revocation and access-event logging
- Added a read-only public evidence pack page
- Scoped shared document downloads to the linked product and approved records
- Added extraction review endpoints and dashboard controls

## Validation standard

Each implementation milestone should include:

1. A focused, readable commit message
2. Automated tests for the changed behaviour
3. A successful TypeScript build
4. A clean working tree before pushing

The application is still a development project. Before production use, add
rate limiting, email verification, password reset, CSRF protection, database
backups, and a managed object-storage provider.
