# Repository context

This repository is a **Velora TSE technical interview challenge**. It is **not production code** and is not deployed to customers.

## How to review PRs here

- Treat the codebase as an **intentional exercise** for candidates, not a product backlog.
- **Do not** file blocking bugs for deliberate interview mechanics (validation quirks, misleading logs, red herrings, sparse error responses, or seeded investigation data).
- **Do not** recommend production hardening (SOC2 checklists, exhaustive test coverage gates, removing debug tables, or “fixing” behaviors that are part of the scenario).
- **Do** focus on accidental regressions: broken builds, crashes on startup, dependency/security issues in real dependencies, or changes that make the app impossible to run locally per the README.

## Expected characteristics (not defects)

- In-memory SQLite with large seeded datasets for SQL investigation
- Generic API error messages with `error_uuid` for log lookup
- Background jobs that insert synthetic traffic
- Challenge-specific field names and validation ordering

When unsure whether something is intentional, assume it is part of the challenge unless it prevents `npm install` and `npm run dev` from working.
