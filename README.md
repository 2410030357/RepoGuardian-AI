# RepoGuardian AI — Complete Setup Guide

## What's New in v2.0

-  **Full routing** — All pages now work: Dashboard, Repositories, Repo Detail, Agent Logs, Settings
-  **GitHub sync** — Connect your GitHub Personal Access Token to see all your real repos
-  **AI Analysis** — Claude AI analyses each repo for security, quality, deps & docs
-  **Digital Twin** — Impact simulation showing what changes affect
-  **Quantum Risk** — Risk scoring per file with factor breakdown
-  **Agent Logs** — Live streaming log page with filtering
-  **Settings page** — GitHub connection management

## Quick Start

### 1. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 2. Backend Setup (Optional — frontend works with demo data)
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

### 3. Connect GitHub
- Log in with any email + password (demo login)
- Go to **Settings** → **GitHub Integration**
- Create a token at github.com/settings/tokens (select `repo` and `read:user` scopes)
- Paste token → Connect
- Your repos will appear immediately in the dashboard!

### 4. Run AI Analysis on a Repo
- Go to **Repositories** → click any repo
- Click **Run AI Analysis**
- Claude AI will scan for: Security vulnerabilities, Code quality, Dependencies, Documentation
- View results across 6 tabs: Overview, Security, Code Quality, Digital Twin, Quantum Risk, AI Fix Suggestions

## Environment Variables

```env
# frontend/.env
VITE_API_URL=http://localhost:8000
```

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, React Router v6
- **AI**: Claude API (claude-sonnet-4-20250514) for repository analysis
- **GitHub**: GitHub REST API v3 (via Personal Access Token)
- **Backend**: FastAPI + Python (optional)
