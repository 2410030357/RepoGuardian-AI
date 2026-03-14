# RepoGuardian AI — Complete Run Guide

## Project Structure

```
repoguardian-new/
├── frontend/          ← React app (Vite + Tailwind)
│   ├── src/
│   │   ├── pages/     ← Dashboard, Repositories, RepoDetail, AgentLogs, Settings, Login
│   │   ├── components/← Sidebar, HealthGauge, AgentLog, DigitalTwin, QuantumRisk, etc.
│   │   ├── context/   ← AuthContext (auth + GitHub token storage)
│   │   └── hooks/     ← useGitHub.js (GitHub API), useApi.js (backend API)
│   ├── package.json
│   └── vite.config.js
│
└── backend/           ← Python FastAPI server
    ├── main.py        ← API routes: /analyze, /health, /quantum-risk, /simulation
    ├── agents.py      ← CrewAI multi-agent system (4 AI agents)
    ├── quantum_risk.py← Quantum-inspired risk scoring
    ├── digital_twin.py← Dependency graph + blast-radius simulation
    └── requirements.txt
```

---

## OPTION 1: Frontend Only (Recommended for Demo)

The frontend works completely without the backend. AI analysis is done directly via the Claude API from the browser.

### Step 1 — Install dependencies
```bash
cd frontend
npm install
```

### Step 2 — Create .env
```bash
cp .env.example .env
```
The default .env.example already has:
```
VITE_API_URL=http://localhost:8000
```
This is fine — if the backend is offline, the frontend uses built-in demo data.

### Step 3 — Run
```bash
npm run dev
```
Open: **http://localhost:5173**

### Step 4 — Connect GitHub (to see your real repos)
1. Go to **https://github.com/settings/tokens**
2. Click "Generate new token (classic)"
3. Give it a name like "RepoGuardian"
4. Check these scopes: ✅ `repo` ✅ `read:user`
5. Click Generate → copy the token (starts with `ghp_`)
6. In the app: **Login** → **GitHub tab** → paste token → Connect
7. All your repos will now appear in the dashboard!

### Step 5 — Run AI Analysis on Any Repo
1. Go to **Repositories** → click any repo
2. Click **"Run AI Analysis"**
3. Claude AI will analyse the repo metadata and return:
   - Security vulnerabilities
   - Code quality issues
   - Dependency risks
   - Documentation gaps
   - AI fix suggestions
   - Quantum risk scores
   - Digital twin impact map

---

## OPTION 2: Frontend + Backend (Full Stack)

Use this if you want the real CrewAI multi-agent analysis with Python agents.

### Backend Setup

#### Step 1 — Python environment
```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate it:
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

#### Step 2 — Install packages
```bash
pip install -r requirements.txt
```

> ⚠️ If you get errors with `crewai`, try:
> ```bash
> pip install fastapi uvicorn python-dotenv networkx numpy pygithub httpx pydantic
> pip install crewai crewai-tools langchain-openai
> ```

#### Step 3 — Configure .env
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Required for real AI agents (CrewAI uses GPT-4)
OPENAI_API_KEY=sk-your-openai-key-here

# Required to fetch real GitHub repo data
GITHUB_TOKEN=ghp_your-github-personal-access-token

# Leave as-is for local development
FRONTEND_URL=http://localhost:5173
```

**Where to get these:**
- `OPENAI_API_KEY` → https://platform.openai.com/api-keys
- `GITHUB_TOKEN` → https://github.com/settings/tokens (select `repo` scope)

#### Step 4 — Run the backend
```bash
# From the backend/ folder:
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

Test it works:
```bash
curl http://localhost:8000/ping
# Response: {"status":"online","service":"RepoGuardian AI","ts":"..."}
```

#### Step 5 — Run the frontend (in a separate terminal)
```bash
cd frontend
npm install
npm run dev
```

---

## Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ping` | Health check |
| POST | `/analyze` | Trigger CrewAI agent analysis on a repo |
| GET | `/health?repo_url=owner/repo` | Get health score + findings |
| GET | `/quantum-risk?repo_url=owner/repo` | Get quantum risk scores per file |
| POST | `/simulation` | Digital twin — blast radius of a file change |
| GET | `/simulation/files` | List files available for simulation |
| GET | `/agent-logs` | Server-Sent Events stream of agent logs |

### Example: Trigger analysis
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "your-github-username/your-repo", "use_mock": true}'
```

Use `"use_mock": true` for demo data (no OpenAI key needed).
Use `"use_mock": false` for real CrewAI analysis (needs OPENAI_API_KEY).

---

## Common Issues & Fixes

### "Module not found: crewai"
```bash
pip install crewai crewai-tools
```
The backend still works without it — it falls back to mock data automatically.

### "CORS error" in browser console
Make sure your backend `.env` has:
```
FRONTEND_URL=http://localhost:5173
```
And backend is running on port 8000.

### "npm install fails"
Make sure you're using Node.js 18+:
```bash
node --version  # Should be v18.x or higher
```

### GitHub API rate limit
Personal access tokens get 5000 requests/hour — more than enough.
Without a token, GitHub allows only 60 requests/hour.

### "AI Analysis failed" in the app
The frontend Claude AI analysis works without any API key — it uses the
built-in Anthropic API proxy. If it fails, the app automatically falls
back to demo data so you can still show all features.

---

## Demo Flow for Judges

1. Open http://localhost:5173
2. Login with any email + password (e.g., `demo@example.com` / `demo123`)
3. Connect GitHub token in Settings (or use the GitHub tab on login)
4. See your real repos in Dashboard
5. Go to Repositories → click a repo
6. Click "Run AI Analysis"
7. Show judges:
   - **Overview tab** → Health Score gauge + score breakdown
   - **Security tab** → Vulnerabilities found
   - **Code Quality tab** → Code smells, complexity
   - **Digital Twin tab** → File dependency map + impact simulation
   - **Quantum Risk tab** → Risk-ranked files with scores
   - **AI Fix Suggestions tab** → Auto-generated code fixes
8. Go to **Agent Logs** page → show live streaming agent activity
9. Go to **Settings** → show GitHub integration panel
