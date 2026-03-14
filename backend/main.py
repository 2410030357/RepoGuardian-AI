"""
main.py  -  RepoGuardian AI  -  FastAPI Backend v3.3
-----------------------------------------------------
Self-contained: rule-based engine is built directly into this file.
NO external analyzer.py needed. Drop this single file and restart.

Analysis priority:
  1. Empty repo  -> instant clean result
  2. ANTHROPIC_API_KEY set + credits -> Claude AI
  3. Anything else -> built-in rule-based engine (no credits needed)
"""

import os, re, json, asyncio
from typing import Optional, List
from datetime import datetime

import requests
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# --- safe imports (these files may or may not exist) ----------------------
try:
    from agents import analyse_repository, AnalysisResult, MOCK_AGENT_LOGS
    _AGENTS_OK = True
except ImportError:
    _AGENTS_OK = False
    MOCK_AGENT_LOGS = [
        {"agent": "Orchestrator", "msg": "System ready.", "status": "success"}
    ]

try:
    from quantum_risk import calculate_quantum_risk
    _QR_OK = True
except ImportError:
    _QR_OK = False

try:
    from digital_twin import build_mock_graph, simulate_impact
    _DT_OK = True
except ImportError:
    _DT_OK = False

# ==========================================================================
# App setup
# ==========================================================================

app = FastAPI(title="RepoGuardian AI", version="3.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache: dict = {}

# ==========================================================================
# Schemas
# ==========================================================================

class AnalyzeRequest(BaseModel):
    repo_url: str
    use_mock: bool = True

class SimulationRequest(BaseModel):
    changed_file: str
    repo_url: Optional[str] = None

class RepoAnalyzeRequest(BaseModel):
    owner:           str
    repo:            str
    language:        Optional[str] = None
    size:            int           = 0
    stars:           int           = 0
    forks:           int           = 0
    open_issues:     int           = 0
    description:     Optional[str] = None
    default_branch:  str           = "main"
    topics:          List[str]     = []
    archived:        bool          = False
    is_empty:        bool          = False
    file_count:      int           = 0
    has_tests:       bool          = False
    has_ci:          bool          = False
    has_docker:      bool          = False
    has_readme:      bool          = False
    has_license:     bool          = False
    has_security_md: bool          = False
    file_context:    str           = ""
    tree:            List[str]     = []

# ==========================================================================
# Built-in Rule-Based Analysis Engine
# (works with ZERO API keys - scans real file content)
# ==========================================================================

# Security vulnerability patterns
_SEC = [
    (r'(?i)(password|secret|api_key|apikey|token|passwd)\s*=\s*["\'][^"\']{4,}["\']',
     "CRITICAL","Hardcoded Secret",
     "A credential is hardcoded in source code.",
     "Use env vars: os.environ.get('KEY_NAME')"),
    (r'(?i)(execute|cursor\.execute)\s*\([f"\'].*?(%s|\{|format)',
     "HIGH","SQL Injection Risk",
     "User input may be interpolated directly into a SQL query.",
     "Use parameterised queries: cursor.execute('SELECT * FROM t WHERE id=?', (val,))"),
    (r'\b(eval|exec)\s*\(',
     "HIGH","Dangerous eval/exec",
     "eval() or exec() can run arbitrary code.",
     "Use ast.literal_eval() for safe data evaluation."),
    (r'(?i)(md5|sha1)\s*\(',
     "MEDIUM","Weak Cryptographic Hash",
     "MD5/SHA-1 are broken for security use.",
     "Use hashlib.sha256() or bcrypt for passwords."),
    (r'(?i)DEBUG\s*=\s*True|app\.run\s*\(.*debug\s*=\s*True',
     "HIGH","Debug Mode Enabled",
     "Debug=True exposes stack traces in production.",
     "Set DEBUG=False or read from env: os.getenv('DEBUG','False')=='True'"),
    (r'\bpickle\.(load|loads)\b',
     "HIGH","Insecure Deserialization",
     "pickle.load on untrusted data allows code execution.",
     "Use json.loads() for safe deserialization."),
    (r'(?i)(os\.system|subprocess\.call|popen)\s*\(.*[\+\%f]',
     "HIGH","Shell Injection Risk",
     "Shell command built with string formatting.",
     "Use subprocess with list args: subprocess.run(['cmd', arg], shell=False)"),
    (r'http://(?!localhost|127\.0\.0\.1)',
     "LOW","Insecure HTTP URL",
     "Plain HTTP used for external request.",
     "Replace http:// with https://"),
    (r'(?i)(print|logger\.(debug|info))\s*\(.*?(password|token|secret)',
     "MEDIUM","Sensitive Data Logged",
     "Passwords or secrets may appear in logs.",
     "Remove sensitive fields from log statements."),
]

# Known vulnerable Python packages {pkg: (safe_prefix, CVE, severity, note)}
_PY_VULNS = {
    "flask":        ("2.3","CVE-2023-30861","HIGH","Session cookie not invalidated"),
    "django":       ("4.2","CVE-2023-36053","HIGH","ReDoS in EmailValidator"),
    "requests":     ("2.31","CVE-2023-32681","MEDIUM","Proxy-Auth header leak"),
    "pillow":       ("10.0","CVE-2023-44271","HIGH","Uncontrolled resource use"),
    "werkzeug":     ("2.3","CVE-2023-46136","HIGH","DoS via multipart parsing"),
    "pyyaml":       ("6.0","CVE-2022-1471","HIGH","Code execution via yaml.load()"),
    "urllib3":      ("2.0","CVE-2023-45803","MEDIUM","Cookie redirect leak"),
    "gunicorn":     ("22.0","CVE-2024-1135","HIGH","HTTP Request Smuggling"),
    "setuptools":   ("70.0","CVE-2024-6345","HIGH","Remote code execution"),
    "cryptography": ("41.0","CVE-2023-49083","HIGH","NULL pointer dereference"),
    "paramiko":     ("3.4","CVE-2023-48795","HIGH","Terrapin SSH attack"),
    "sqlalchemy":   ("2.0",None,"MEDIUM","Major version behind - upgrade for security fixes"),
    "celery":       ("5.3",None,"LOW","Old version - update for patches"),
}

# Known vulnerable JS packages
_JS_VULNS = {
    "axios":        ("1.6","CVE-2023-45857","HIGH","CSRF vulnerability"),
    "lodash":       ("4.17.21","CVE-2021-23337","HIGH","Command injection"),
    "express":      ("4.19","CVE-2024-29041","MEDIUM","Open redirect"),
    "jsonwebtoken": ("9.0","CVE-2022-23529","HIGH","Arbitrary file read"),
    "semver":       ("7.5.2","CVE-2022-25883","HIGH","ReDoS"),
    "word-wrap":    ("1.2.4","CVE-2023-26115","HIGH","ReDoS"),
    "tough-cookie": ("4.1.3","CVE-2023-26136","HIGH","Prototype pollution"),
    "minimist":     ("1.2.6","CVE-2021-44906","HIGH","Prototype pollution"),
}


def _rule_based_analysis(file_context: str, tree: List[str], req) -> dict:
    """Scan real file content with regex patterns. No API key needed."""
    findings = []
    fid = [0]

    def nid():
        fid[0] += 1
        return f"f{fid[0]}"

    # Split context into sections: ## filename\ncontent
    sections = {}
    parts = re.split(r'\n## (.+)\n', file_context)
    i = 1
    while i < len(parts) - 1:
        key = parts[i].strip()
        val = parts[i + 1] if i + 1 < len(parts) else ""
        if not key.startswith("File Tree"):
            sections[key] = val
        i += 2

    files_with_issues = set()

    # Security + basic quality scan on each file
    for fname, content in sections.items():
        for pattern, sev, title, desc, fix in _SEC:
            m = re.search(pattern, content, re.MULTILINE)
            if m:
                line = content[:m.start()].count('\n') + 1
                findings.append({
                    "id": nid(), "severity": sev, "category": "Security",
                    "title": title,
                    "description": f"{desc} Found in {fname}.",
                    "file": f"{fname}:{line}",
                    "fix": fix, "code_example": "",
                })
                files_with_issues.add(fname)

        # TODO/FIXME check
        todos = re.findall(r'(TODO|FIXME|HACK|XXX)', content)
        if len(todos) >= 3:
            findings.append({
                "id": nid(), "severity": "LOW", "category": "Quality",
                "title": f"Unresolved TODOs ({len(todos)} found)",
                "description": f"{len(todos)} TODO/FIXME comments in {fname} indicate unfinished work.",
                "file": fname, "fix": "Create issues in your tracker and remove inline comments.", "code_example": "",
            })

    # Dependency scan - requirements.txt
    req_content = sections.get("requirements.txt", "") or sections.get("Pipfile", "")
    if req_content:
        for pkg, (safe_ver, cve, sev, note) in _PY_VULNS.items():
            m = re.search(rf'(?i)^{re.escape(pkg)}\s*[=<>!]=?\s*([\d.]+)', req_content, re.MULTILINE)
            if m:
                ver = m.group(1)
                if not ver.startswith(safe_ver):
                    cve_s = f" ({cve})" if cve else ""
                    findings.append({
                        "id": nid(), "severity": sev, "category": "Dependency",
                        "title": f"Vulnerable: {pkg}=={ver}",
                        "description": f"{pkg}=={ver} has security issues{cve_s}. {note}",
                        "file": "requirements.txt",
                        "fix": f"Upgrade: {pkg}>={safe_ver}",
                        "code_example": f"# requirements.txt\n{pkg}>={safe_ver}",
                    })

    # Dependency scan - package.json
    pkg_content = sections.get("package.json", "")
    if pkg_content:
        try:
            pkg_data = json.loads(pkg_content)
            all_deps = {**pkg_data.get("dependencies",{}), **pkg_data.get("devDependencies",{})}
            for pkg, (safe_ver, cve, sev, note) in _JS_VULNS.items():
                if pkg in all_deps:
                    ver = re.sub(r'[^0-9.]', '', all_deps[pkg])
                    if ver and not ver.startswith(safe_ver.split('.')[0]):
                        cve_s = f" ({cve})" if cve else ""
                        findings.append({
                            "id": nid(), "severity": sev, "category": "Dependency",
                            "title": f"Vulnerable npm: {pkg}",
                            "description": f"{pkg} has known issues{cve_s}. {note}",
                            "file": "package.json",
                            "fix": f"npm install {pkg}@latest",
                            "code_example": f'"{pkg}": ">={safe_ver}"',
                        })
        except Exception:
            pass

    # Structural checks using file tree
    src_files  = [f for f in tree if re.search(r'\.(py|js|ts|go|java|rb|rs|cpp)$', f)]
    test_files = [f for f in tree if re.search(r'(test|spec|__tests__)', f, re.I)]
    has_ci     = any(('.github/workflows' in f or 'gitlab-ci' in f or 'Jenkinsfile' in f) for f in tree)
    has_readme = req.has_readme or any(re.search(r'readme', f, re.I) for f in tree)
    has_docker = any(f == 'Dockerfile' or f.endswith('/Dockerfile') for f in tree)

    if src_files and not test_files:
        findings.append({
            "id": nid(), "severity": "MEDIUM", "category": "Quality",
            "title": "No Test Files Found",
            "description": f"{len(src_files)} source files but zero test files detected. Untested code is fragile.",
            "file": "Repository root",
            "fix": "Create a tests/ folder. Use pytest (Python) or jest (JS).",
            "code_example": "pip install pytest\n\n# tests/test_basic.py\ndef test_example():\n    assert 1 + 1 == 2",
        })

    if src_files and not has_ci:
        findings.append({
            "id": nid(), "severity": "LOW", "category": "Quality",
            "title": "No CI/CD Pipeline",
            "description": "No GitHub Actions, GitLab CI or similar automation detected.",
            "file": "Repository root",
            "fix": "Add .github/workflows/ci.yml to run tests on every push.",
            "code_example": "name: CI\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - run: pip install -r requirements.txt && pytest",
        })

    if not has_readme and src_files:
        findings.append({
            "id": nid(), "severity": "LOW", "category": "Documentation",
            "title": "No README File",
            "description": "Repository has no README. Contributors won't know how to set up the project.",
            "file": "Repository root",
            "fix": "Add README.md with project description, setup steps, and usage examples.",
            "code_example": "# Project Name\n\n## Setup\n```bash\npip install -r requirements.txt\n```\n\n## Usage\n...",
        })

    # Calculate scores
    def deduct(items, category):
        w = {"CRITICAL": 20, "HIGH": 12, "MEDIUM": 6, "LOW": 2}
        return sum(w.get(f["severity"], 0) for f in items if f["category"] == category)

    sec_score  = max(0, min(100, 100 - deduct(findings, "Security")))
    qual_score = max(0, min(100, (80 if test_files else 55) - deduct(findings, "Quality")))
    dep_score  = max(0, min(100, (85 if has_ci else 75) - deduct(findings, "Dependency")))
    doc_score  = max(0, min(100, (70 if has_readme else 45) - deduct(findings, "Documentation")))
    health     = round(sec_score*0.35 + qual_score*0.30 + dep_score*0.20 + doc_score*0.15)

    status = "Healthy" if health >= 80 else "Moderate" if health >= 60 else "Degraded" if health >= 40 else "At Risk"
    total  = len(findings)
    crit   = sum(1 for f in findings if f["severity"] == "CRITICAL")
    high   = sum(1 for f in findings if f["severity"] == "HIGH")
    name   = f"{req.owner}/{req.repo}"
    fc     = req.file_count

    if total == 0:
        summary = f"{name} passed all automated checks with no issues detected across {fc} files. Code quality, security, and dependencies look clean."
    else:
        summary = (f"{name} has {total} issue{'s' if total!=1 else ''} across {fc} files "
                   f"({crit} critical, {high} high). Security: {sec_score}/100. "
                   f"{'Fix critical issues immediately.' if crit > 0 else 'No critical security issues.'}")

    # Agent logs
    sec_f = [f for f in findings if f["category"]=="Security"]
    dep_f = [f for f in findings if f["category"]=="Dependency"]
    qual_f= [f for f in findings if f["category"]=="Quality"]
    doc_f = [f for f in findings if f["category"]=="Documentation"]

    logs = [
        {"agent":"Orchestrator",      "msg":f"Scanning {name} — {fc} files indexed",         "status":"running"},
        {"agent":"Security Scout",    "msg":f"Running {len(_SEC)} security pattern checks...", "status":"running"},
    ]
    for f in sec_f[:3]:
        logs.append({"agent":"Security Scout","msg":f"{f['severity']}: {f['title']} ({f['file']})","status":"alert" if f["severity"] in ("CRITICAL","HIGH") else "warn"})
    logs.append({"agent":"Security Scout","msg":"Security scan complete" if not sec_f else f"{len(sec_f)} issues found","status":"success" if not sec_f else "warn"})
    logs.append({"agent":"Quality Architect","msg":"Analysing code structure and tests...","status":"running"})
    for f in qual_f[:2]:
        logs.append({"agent":"Quality Architect","msg":f.get("title","Issue found"),"status":"warn"})
    logs.append({"agent":"Dependency Warden","msg":"Checking CVE database...","status":"running"})
    for f in dep_f[:2]:
        logs.append({"agent":"Dependency Warden","msg":f"{f['severity']}: {f['title']}","status":"alert" if f["severity"]=="HIGH" else "warn"})
    logs.append({"agent":"Docs Specialist","msg":f"{len(doc_f)} documentation issues" if doc_f else "Docs OK","status":"warn" if doc_f else "success"})
    if any(f.get("fix") for f in (sec_f+dep_f)[:3]):
        logs.append({"agent":"AI Fix Agent","msg":f"Fix suggestions ready for {sum(1 for f in findings if f.get('fix'))} issues","status":"success"})
    logs.append({"agent":"Orchestrator","msg":f"Analysis complete. Health Score: {health}/100","status":"success"})

    # Quantum risk
    qr_files = {}
    for f in findings:
        fname = f["file"].split(':')[0]
        w = {"CRITICAL":0.4,"HIGH":0.25,"MEDIUM":0.15,"LOW":0.05}.get(f["severity"],0)
        qr_files[fname] = min(1.0, qr_files.get(fname, 0.1) + w)
    for path in tree:
        if re.search(r'\.(py|js|ts|go|java)$', path) and path not in qr_files:
            qr_files[path] = 0.05
    quantum_risk = []
    for fname, score in sorted(qr_files.items(), key=lambda x:x[1], reverse=True)[:8]:
        lvl = "HIGH" if score>=0.5 else "MEDIUM" if score>=0.25 else "LOW"
        related = [f["title"] for f in findings if f["file"].split(':')[0]==fname][:3]
        quantum_risk.append({"file":fname,"risk_score":round(score,3),"risk_level":lvl,"factors":related or ["No issues detected"]})

    # Digital twin
    critical_files = list(set(f["file"].split(':')[0] for f in findings if f["severity"] in ("CRITICAL","HIGH")))[:5]
    dep_map = {}
    for f in src_files[:6]:
        parts = [p for p in re.split(r'[/_.]', f) if len(p)>3]
        deps  = [g for g in src_files if g!=f and any(p in g for p in parts)][:3]
        if deps:
            dep_map[f] = deps

    return {
        "health_score":       health,
        "security_score":     sec_score,
        "quality_score":      qual_score,
        "dependency_score":   dep_score,
        "documentation_score":doc_score,
        "status":             status,
        "summary":            summary,
        "findings":           findings,
        "quantum_risk":       quantum_risk,
        "digital_twin":       {"critical_files":critical_files,"dependency_map":dep_map,"impact_summary":summary[:200]},
        "agent_logs":         logs,
        "_engine":            "rule-based",
    }


# ==========================================================================
# Routes
# ==========================================================================

@app.get("/ping")
def ping():
    return {"status":"online","service":"RepoGuardian AI v3.3","ts":datetime.utcnow().isoformat()}


@app.post("/analyze")
async def analyze(req: AnalyzeRequest, bg: BackgroundTasks):
    if not _AGENTS_OK:
        return {"status":"skipped","message":"agents.py not available"}
    def _run():
        result = analyse_repository(req.repo_url, use_mock=req.use_mock)
        _cache[req.repo_url] = result
    bg.add_task(_run)
    return {"status":"queued","repo":req.repo_url}


@app.get("/health-status")
def get_health_status(repo_url: Optional[str] = None):
    if repo_url and repo_url in _cache:
        r = _cache[repo_url]
    elif repo_url:
        return {"status":"no_analysis","repo":repo_url,"health_score":None,"findings":[],"summary":{},"agent_logs":[],"message":"Not yet analysed."}
    elif _cache:
        r = list(_cache.values())[-1]
    else:
        return {"status":"no_analysis","health_score":None,"findings":[],"summary":{},"agent_logs":[],"message":"No repos analysed yet."}
    return {"status":"complete","repo":r.repo,"health_score":r.health_score,"findings":r.findings,"summary":r.summary,"agent_logs":r.agent_logs,"grade":_grade(r.health_score),"last_updated":datetime.utcnow().isoformat()}


@app.post("/analyze-repo")
async def analyze_repo(req: RepoAnalyzeRequest):
    """
    Main frontend endpoint.
    1. Empty repo -> instant result
    2. Anthropic key + credits -> Claude AI
    3. Fallback -> built-in rule-based engine
    """

    # 1. Empty
    if req.is_empty or req.file_count == 0:
        return _empty_result(req)

    # 2. Try Anthropic
    api_key = os.getenv("ANTHROPIC_API_KEY","").strip()
    if api_key and not api_key.startswith("sk-ant-your"):
        try:
            result = await _call_anthropic(api_key, req)
            result["_engine"] = "claude-ai"
            return result
        except Exception as e:
            print(f"[Anthropic] {str(e)[:150]} - falling back to rule-based engine")

    # 3. Rule-based (always works)
    return _rule_based_analysis(req.file_context, req.tree, req)


async def _call_anthropic(api_key: str, req: RepoAnalyzeRequest) -> dict:
    prompt = f"""Analyse {req.owner}/{req.repo} and return ONLY valid JSON (no markdown):
Language:{req.language} | Size:{req.size}KB | Files:{req.file_count} | Tests:{req.has_tests} | CI:{req.has_ci}
Topics:{','.join(req.topics)} | Desc:{req.description}

FILE CONTENT:
{req.file_context[:5000]}

Rules: only report issues you actually see. Empty/simple repos score HIGH (85+).
security_score start 100 (-20 CRIT,-12 HIGH,-6 MED,-2 LOW), quality start {80 if req.has_tests else 55},
dependency start {85 if req.has_ci else 75}, docs start {70 if req.has_readme else 45}.
health = sec*0.35+qual*0.30+dep*0.20+doc*0.15

JSON shape: {{"health_score":0,"security_score":0,"quality_score":0,"dependency_score":0,"documentation_score":0,"status":"Healthy","summary":"","findings":[],"quantum_risk":[],"digital_twin":{{"critical_files":[],"dependency_map":{{}},"impact_summary":""}},"agent_logs":[]}}"""

    import asyncio
    loop = asyncio.get_event_loop()
    def _sync_post():
        return requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key":api_key,"anthropic-version":"2023-06-01","content-type":"application/json"},
            json={"model":"claude-sonnet-4-20250514","max_tokens":2500,"messages":[{"role":"user","content":prompt}]},
            timeout=60,
        )
    r = await loop.run_in_executor(None, _sync_post)

    if r.status_code != 200:
        raise Exception(f"HTTP {r.status_code}: {r.text[:200]}")

    text = "".join(b.get("text","") for b in r.json().get("content",[]))
    clean = re.sub(r'```(?:json)?','',text).strip()
    try:
        result = json.loads(clean)
    except Exception:
        m = re.search(r'\{[\s\S]*\}', clean)
        if not m:
            raise Exception("Non-JSON Anthropic response")
        result = json.loads(m.group(0))

    for k in ["health_score","security_score","quality_score","dependency_score","documentation_score"]:
        result[k] = max(0,min(100,round(float(result.get(k,0)))))
    result["health_score"] = round(result["security_score"]*0.35+result["quality_score"]*0.30+result["dependency_score"]*0.20+result["documentation_score"]*0.15)
    return result


def _empty_result(req: RepoAnalyzeRequest) -> dict:
    return {
        "health_score":100,"security_score":100,"quality_score":100,
        "dependency_score":100,"documentation_score":70 if req.has_readme else 20,
        "status":"Healthy",
        "summary":f"{req.owner}/{req.repo} is empty — no source files to analyse. Push code to get a real report.",
        "findings":[],"quantum_risk":[],
        "digital_twin":{"critical_files":[],"dependency_map":{},"impact_summary":"No files yet."},
        "agent_logs":[
            {"agent":"Orchestrator",      "msg":f"Scanning {req.owner}/{req.repo}...",   "status":"running"},
            {"agent":"Orchestrator",      "msg":"Repository appears to be empty.",        "status":"warn"},
            {"agent":"Security Scout",    "msg":"No source files — scan skipped.",        "status":"success"},
            {"agent":"Quality Architect", "msg":"No source files — scan skipped.",        "status":"success"},
            {"agent":"Dependency Warden", "msg":"No dependency manifests found.",         "status":"success"},
            {"agent":"Docs Specialist",   "msg":"README detected." if req.has_readme else "No README found.","status":"success" if req.has_readme else "warn"},
            {"agent":"Orchestrator",      "msg":"Analysis complete. Health Score: 100/100","status":"success"},
        ],
        "_isEmpty":True,"_engine":"empty-repo",
    }


# Simulation + Quantum endpoints
@app.post("/simulation")
def run_simulation(req: SimulationRequest):
    if not _DT_OK:
        return {"changed_file":req.changed_file,"direct_impact":[],"indirect_impact":[],"safe_files":[],"stats":{"total_files":0,"affected_count":0,"safe_count":0}}
    return simulate_impact(build_mock_graph(), req.changed_file)


@app.get("/quantum-risk")
def quantum_risk(repo_url: Optional[str] = None):
    if not _QR_OK:
        return {"repo":repo_url or "demo","profiles":[],"computed_at":datetime.utcnow().isoformat()}
    MOCK = [
        {"path":"src/auth/jwt.py","complexity":18,"churn":42,"coupling":9,"has_tests":False},
        {"path":"src/db/queries.py","complexity":12,"churn":31,"coupling":14,"has_tests":False},
        {"path":"src/api/routes.py","complexity":8,"churn":55,"coupling":7,"has_tests":True},
        {"path":"src/utils/helpers.py","complexity":4,"churn":8,"coupling":3,"has_tests":True},
        {"path":"src/auth/middleware.py","complexity":14,"churn":38,"coupling":11,"has_tests":False},
    ]
    profiles = calculate_quantum_risk(MOCK)
    return {"repo":repo_url or "demo","computed_at":datetime.utcnow().isoformat(),
            "profiles":[{"path":p.path,"risk_score":p.risk_score,"risk_level":p.risk_level,"dominant_factor":p.dominant_factor,"amplitude_vector":p.amplitude_vector} for p in profiles]}


@app.get("/agent-logs")
async def stream_logs():
    async def gen():
        for log in MOCK_AGENT_LOGS:
            yield f"data: {json.dumps(log)}\n\n"
            await asyncio.sleep(1.2)
        yield 'data: {"agent":"Orchestrator","msg":"Stream complete.","status":"success"}\n\n'
    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/simulation/files")
def list_files():
    if not _DT_OK:
        return {"files":[]}
    return {"files":sorted(build_mock_graph().nodes())}


def _grade(s):
    return "A" if s>=90 else "B" if s>=80 else "C" if s>=70 else "D" if s>=55 else "F"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)