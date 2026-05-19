# TSE Technical Interview — Velora Profile Registration

## Scenario

Velora recently launched a new profile registration flow for its fundraising platform. Since the release, a user has reported that the registration form is returning an error. The issue appears intermittent — most users are signing up without problems, but some are consistently hitting failures.

This is an active incident. Your task is to identify the root cause and propose a fix. You are not expected to ship a patch.

---

## Reported issue

**Reported by:** Eva Torres (`eva@velora.com`)

> "Hi, I tried to create my Velora profile earlier today and got a generic error message. I thought it was a blip so I tried again, but got the same error. I haven't been able to register at all. Other people on my team signed up fine without any issues."
>
> — Eva Torres, date of birth 14 June 1987, 12 years of fundraising experience

Eva submitted the form twice. Both attempts returned the same generic error with no further detail.

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
