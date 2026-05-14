# TSE Technical Interview — Velora Profile Registration

## Scenario

Velora recently released a profile registration form to the public. Some users are reporting that the profile registration is failing. Your task is to investigate the root cause and propose a fix.

---

## Example failures (reproduce these)

These mirror real complaints. Walk through each one until you understand **why** the system behaves that way before you propose a fix.

All failures return the same generic error message and a UUID. Use the UUID to trace through the logs and database.

### Registration form (`http://localhost:5173`)

**A — Registration fails for a senior applicant**

- Full name: any two or more characters
- Email: `test@velora.com`
- Password: any eight or more characters
- Years of experience: `10`

Submit; expect a failure. Repeat with years set to `3` and observe whether it succeeds.

**B — Registration fails with a personal email**

- Full name: any two or more characters
- Email: `you@gmail.com`
- Password: any eight or more characters
- Years of experience: `5`

Submit; note the UUID. Query the database and logs to understand why this submission is rejected.

### SQL console (`http://localhost:5173/sql`)

Only `SELECT` is allowed.

**C — Postgres-style filter**

Run:

```sql
SELECT * FROM emails_cache WHERE domain ILIKE '%velora%';
```

You should get a syntax error. Write a query that returns the equivalent rows using what SQLite supports.

*(Also try querying `signups` and `debug_events` joined on `signup_id` using the UUID from a failed submission.)*

---

## What you have access to

| Tool | URL |
|---|---|
| Registration form | `http://localhost:5173` |
| Log search | `http://localhost:5173/logs` |
| SQL console | `http://localhost:5173/sql` |
| Codebase | Read-only in your editor |

### Database schema

```sql
signups      (id, signup_id, name, email, years_exp, created_at)
debug_events (id, signup_id, error_uuid, event_type, payload, metadata, created_at)
emails_cache (id, domain, valid, reason, checked_at)
```

---

## Setup

### 1. Get the code

```bash
git clone git@github.com:ARK-shared-platform/tse-tech-challenge.git
cd tse-tech-challenge
```

### 2. Install Node.js (if not already installed)

This app requires **Node.js 18 or higher**. To check if you already have it:

```bash
node --version
```

If the command is not found or the version is below 18, install it:

**Mac:**
```bash
# Option A — Homebrew (recommended)
brew install node

# Option B — download the .pkg installer
# https://nodejs.org/en/download
```

**Windows:**
```
Download the LTS .msi installer from https://nodejs.org/en/download
Run it — Node.js and npm are installed automatically.
```

### 3. Run the app

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

> **Mac/Linux tip:** you can search logs directly from the terminal (run from the project root):
> ```bash
> grep "<error-id>" server/logs/app.log
> ```

---

## Constraints

- You can ask clarifying questions, but treat this as an active incident
- Use the error ID shown in the UI to trace failures through logs and the database
