# EvidenceHub milestones

This file keeps the project history easy to understand without replacing the
individual Git commits.

## Project foundation

- `a3bdf9e` - Initial project scaffold
- `4bc949b` - Added the compliance evidence vertical slice:
  products, requirements, evidence metadata, compliance calculation, SQLite,
  typed API, and domain tests
- `af09070` - Added the Windows development launcher
- `4cdcfcd` - Added the API landing page and health endpoint
- `82f8e2c` - Ignored the local runtime database
- `61691b2` - Added the browser dashboard and product workflow
- `7d14cf1` - Added secure local evidence uploads and product-scoped downloads

## Authentication milestone

- `efeb951` - Added organisations, users, sessions, password hashing, and
  authentication services
- `2527c67` - Protected product and document routes, added login and
  registration pages, and enforced organisation-level isolation

## Validation standard

Each implementation milestone should include:

1. A focused, readable commit message
2. Automated tests for the changed behaviour
3. A successful TypeScript build
4. A clean working tree before pushing

The application is still a development project. Before production use, add
rate limiting, email verification, password reset, CSRF protection, database
backups, and a managed object-storage provider.
