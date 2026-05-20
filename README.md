# TSE Technical Interview — Velora Profile Registration

## Scenario

Velora recently launched a new profile registration flow for its fundraising platform. Since the release, multiple users have reported that the registration form is returning an error. The issue appears intermittent — most users are signing up without problems, but some are consistently hitting failures.

This is an active incident. Your task is to identify the root cause and propose a fix. You are not expected to ship a patch.

---

## Reported issue

**Reported by:** Eva Torres (`eva@velora.com`)

> "Hi, on 19 April I tried to create my Velora profile with `eva@velora.com` and got a generic error message, no details, nothing useful. I tried again on 20 April with the same email and got the same error. On 21 April I tried with my work email, `eva.torres@acme.com`, and still got the same thing. Three attempts, three failures, and I'm stuck. My whole team is waiting on me to get set up, and everyone else signed up fine. This is really frustrating; can someone please look into why this keeps happening to me?"
>
> — Eva Torres, date of birth 14 June 1987, 12 years of fundraising experience

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
signups        (id, signup_uuid, name, email, dob, years_fundraising, created_at)
signups_cache  (id, cache_uuid, email, name, dob, years_fundraising, status, created_at)
debug_events   (id, cache_uuid, error_uuid, event_type, payload, metadata, created_at)
emails_cache   (id, domain, valid, reason, checked_at)
```

`signups`, `signups_cache`, and `emails_cache` retain full history. **`debug_events` only keeps the last 30 days**; older diagnostic rows are purged automatically.

Pending and completed signups stay in `signups_cache`. Recent failures appear in `debug_events` while they are within the 30-day window. Start from a reporter email in the tickets above, then follow the `error_uuid` into log search when one is available.

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
npm --version
```

If the command is not found or the version is below 18, install it using the instructions for your OS below.

---

#### macOS — Homebrew

```bash
brew install node
```

Verify:

```bash
node -v
npm -v
```

---

#### macOS or Linux — NVM

NVM lets you install and switch between Node versions without touching your system.

Install NVM:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Reload your shell:

```bash
# bash
source ~/.bashrc

# zsh
source ~/.zshrc
```

Install and use Node 22:

```bash
nvm install 22
nvm use 22
nvm alias default 22
```

Verify:

```bash
node -v
npm -v
```

---

#### Linux — apt (Ubuntu / Debian)

For a newer Node version, use the NodeSource setup script:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify:

```bash
node -v
npm -v
```

---

#### Windows — winget (PowerShell)

```powershell
winget install OpenJS.NodeJS.LTS
```

Then open a new terminal and verify:

```powershell
node -v
npm -v
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

- Treat this as an active incident — time matters
- You can ask clarifying questions, but keep them focused
- Root cause and a clear remediation plan is the priority; if you have time, patching the code is a bonus
