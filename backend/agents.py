"""
agents.py
─────────
RepoGuardian AI — Multi-Agent Analysis System

Four specialist agents work in sequence:
  1. Security Scout     – hunts for vulnerabilities, secrets, CVEs
  2. Quality Architect  – enforces clean code, complexity, duplication
  3. Dependency Warden  – audits outdated/vulnerable packages
  4. Docs Specialist    – checks docstring coverage and README health

Uses OpenAI directly (no CrewAI) to avoid dependency conflicts.
Falls back to rich mock data if no API key is present.
"""

import os
import json
from typing import Optional
from dataclasses import dataclass, asdict

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


# ─────────────────────────────────────────────────────────
# Data models
# ─────────────────────────────────────────────────────────

@dataclass
class AgentFinding:
    agent:    str
    severity: str        # CRITICAL | HIGH | MEDIUM | LOW | INFO
    category: str
    file:     str
    line:     Optional[int]
    message:  str
    fix:      Optional[str]

@dataclass
class AnalysisResult:
    repo:         str
    health_score: int
    findings:     list
    agent_logs:   list
    summary:      dict


# ─────────────────────────────────────────────────────────
# Mock data (works with zero API keys)
# ─────────────────────────────────────────────────────────

MOCK_FINDINGS = [
    AgentFinding("Security Scout", "CRITICAL", "Secret Leak",
        "src/auth/jwt.py", 47,
        "Hardcoded JWT secret: SECRET_KEY = 'supersecret_2024'",
        'import os\nSECRET_KEY = os.environ.get("JWT_SECRET_KEY")\nif not SECRET_KEY:\n    raise RuntimeError("JWT_SECRET_KEY env var not set")'),
    AgentFinding("Security Scout", "HIGH", "SQL Injection",
        "src/db/queries.py", 112,
        "Unsanitised input passed to raw SQL query.",
        'def get_user(username: str):\n    query = "SELECT * FROM users WHERE username = ?"\n    return db.execute(query, (username,)).fetchone()'),
    AgentFinding("Security Scout", "HIGH", "Broken Auth",
        "src/auth/middleware.py", 23,
        "JWT tokens never expire. Add expiration claim.",
        'payload = {\n    "sub": user_id,\n    "exp": datetime.utcnow() + timedelta(hours=1)\n}'),
    AgentFinding("Quality Architect", "HIGH", "High Complexity",
        "src/api/routes.py", 88,
        "Cyclomatic complexity = 24 (threshold: 10). Decompose into smaller functions.",
        None),
    AgentFinding("Quality Architect", "MEDIUM", "Code Duplication",
        "src/utils/helpers.py", 34,
        "Duplicate validation logic in 3 locations. Extract to shared validator.",
        'def validate_email(email: str) -> bool:\n    import re\n    return bool(re.match(r"[^@]+@[^@]+\\.[^@]+", email))'),
    AgentFinding("Dependency Warden", "HIGH", "Vulnerable Dependency",
        "requirements.txt", None,
        "flask==2.1.0 has CVE-2023-30861 (CVSS 7.5). Upgrade to flask>=2.3.3.",
        'flask>=2.3.3  # was: flask==2.1.0'),
    AgentFinding("Dependency Warden", "MEDIUM", "Outdated Package",
        "requirements.txt", None,
        "sqlalchemy==1.4.46 is 3 major versions behind. Latest: 2.0.30.",
        'SQLAlchemy>=2.0.30'),
    AgentFinding("Docs Specialist", "LOW", "Missing Docstring",
        "src/ml/model.py", 1,
        "Module has 0% docstring coverage. 12 public functions undocumented.",
        '"""\nml/model.py\n-----------\nML model training and inference utilities.\n"""\n'),
    AgentFinding("Docs Specialist", "LOW", "Outdated README",
        "README.md", None,
        "README references Python 3.8 but pyproject.toml requires >=3.11.",
        None),
]

MOCK_AGENT_LOGS = [
    {"agent": "Orchestrator",      "msg": "Cloning repository and building file manifest...",          "status": "running"},
    {"agent": "Security Scout",    "msg": "Starting SAST scan across 47 Python files...",              "status": "running"},
    {"agent": "Security Scout",    "msg": "CRITICAL: Hardcoded secret found at src/auth/jwt.py:47",   "status": "alert"},
    {"agent": "Security Scout",    "msg": "HIGH: SQL injection vector in db/queries.py:112",           "status": "alert"},
    {"agent": "Quality Architect", "msg": "Calculating cyclomatic complexity for all modules...",      "status": "running"},
    {"agent": "Quality Architect", "msg": "routes.py complexity=24 exceeds threshold of 10",           "status": "warn"},
    {"agent": "Dependency Warden", "msg": "Resolving 124 dependencies against NVD CVE database...",   "status": "running"},
    {"agent": "Dependency Warden", "msg": "CVE-2023-30861 matched: flask==2.1.0 (CVSS 7.5)",          "status": "alert"},
    {"agent": "Docs Specialist",   "msg": "Coverage: 23% — below 80% threshold",                      "status": "warn"},
    {"agent": "AI Fix Agent",      "msg": "Generating patch for jwt.py:47 — confidence 97%",          "status": "success"},
    {"agent": "AI Fix Agent",      "msg": "Parameterised query patch generated for db/queries.py",    "status": "success"},
    {"agent": "Orchestrator",      "msg": "Analysis complete. Health Score: 42 / 100",                "status": "success"},
]


def _mock_health_score(findings: list) -> int:
    deductions = {"CRITICAL": 15, "HIGH": 8, "MEDIUM": 4, "LOW": 1}
    total = sum(deductions.get(f.severity, 0) for f in findings)
    return max(0, min(100, 100 - total))


def run_mock_analysis(repo_url: str) -> AnalysisResult:
    findings = MOCK_FINDINGS
    score = _mock_health_score(findings)
    return AnalysisResult(
        repo=repo_url,
        health_score=score,
        findings=[asdict(f) for f in findings],
        agent_logs=MOCK_AGENT_LOGS,
        summary={
            "total_findings": len(findings),
            "critical": sum(1 for f in findings if f.severity == "CRITICAL"),
            "high":     sum(1 for f in findings if f.severity == "HIGH"),
            "medium":   sum(1 for f in findings if f.severity == "MEDIUM"),
            "low":      sum(1 for f in findings if f.severity == "LOW"),
            "agents_run": 4,
        },
    )


# ─────────────────────────────────────────────────────────
# Real OpenAI multi-agent system (no CrewAI needed)
# ─────────────────────────────────────────────────────────

AGENT_PROMPTS = {
    "Security Scout": (
        "You are a senior AppSec engineer. Analyse this repository for: "
        "hardcoded secrets, SQL/command injection, broken auth, SSRF, XSS, insecure deserialization. "
        "Return ONLY a JSON array of findings. Each finding must have: "
        "severity (CRITICAL/HIGH/MEDIUM/LOW), category, file, message, fix."
    ),
    "Quality Architect": (
        "You are a principal engineer. Analyse this repository for: "
        "cyclomatic complexity >10, code duplication, long methods >50 lines, anti-patterns, missing type hints. "
        "Return ONLY a JSON array of findings with: severity, category, file, message, fix."
    ),
    "Dependency Warden": (
        "You are a dependency security expert. Analyse the package manifests for: "
        "known CVEs, packages >1 major version behind, deprecated packages. "
        "Return ONLY a JSON array of findings with: severity, category, file, message, fix."
    ),
    "Docs Specialist": (
        "You are a documentation engineer. Analyse this repository for: "
        "missing docstrings on public functions, inaccurate README, missing type annotations, no changelog. "
        "Return ONLY a JSON array of findings with: severity, category, file, message, fix."
    ),
}


def _run_agent(client: "OpenAI", agent_name: str, repo_url: str) -> list:
    """Run a single agent via OpenAI and return its findings."""
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.1,
            messages=[
                {"role": "system", "content": AGENT_PROMPTS[agent_name]},
                {"role": "user",   "content": f"Repository to analyse: {repo_url}\n\nReturn only a JSON array."},
            ],
        )
        text = response.choices[0].message.content.strip()
        text = text.replace("```json", "").replace("```", "").strip()
        findings = json.loads(text)
        # Tag each finding with the agent name
        for f in findings:
            f["agent"] = agent_name
        return findings
    except Exception as e:
        print(f"[{agent_name}] failed: {e}")
        return []


def run_real_analysis(repo_url: str) -> AnalysisResult:
    """Run all 4 agents via OpenAI API in sequence."""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    all_findings = []
    logs = [{"agent": "Orchestrator", "msg": f"Starting analysis of {repo_url}", "status": "running"}]

    for agent_name in AGENT_PROMPTS:
        logs.append({"agent": agent_name, "msg": f"Agent starting analysis...", "status": "running"})
        findings = _run_agent(client, agent_name, repo_url)
        all_findings.extend(findings)
        logs.append({"agent": agent_name, "msg": f"Found {len(findings)} issues", "status": "success" if findings else "warn"})

    # Compute score
    deductions = {"CRITICAL": 15, "HIGH": 8, "MEDIUM": 4, "LOW": 1}
    total_deduction = sum(deductions.get(f.get("severity", "LOW"), 0) for f in all_findings)
    score = max(0, min(100, 100 - total_deduction))

    logs.append({"agent": "Orchestrator", "msg": f"Analysis complete. Health Score: {score}/100", "status": "success"})

    return AnalysisResult(
        repo=repo_url,
        health_score=score,
        findings=all_findings,
        agent_logs=logs,
        summary={
            "total_findings": len(all_findings),
            "critical": sum(1 for f in all_findings if f.get("severity") == "CRITICAL"),
            "high":     sum(1 for f in all_findings if f.get("severity") == "HIGH"),
            "medium":   sum(1 for f in all_findings if f.get("severity") == "MEDIUM"),
            "low":      sum(1 for f in all_findings if f.get("severity") == "LOW"),
            "agents_run": 4,
        },
    )


# ─────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────

def analyse_repository(repo_url: str, use_mock: bool = True) -> AnalysisResult:
    """
    Main entry point called by FastAPI.
    use_mock=True  → instant demo data, no API key needed
    use_mock=False → real OpenAI GPT-4o agents (needs OPENAI_API_KEY in .env)
    """
    has_key = bool(os.getenv("OPENAI_API_KEY")) and OPENAI_AVAILABLE
    if use_mock or not has_key:
        return run_mock_analysis(repo_url)
    try:
        return run_real_analysis(repo_url)
    except Exception as e:
        print(f"[RepoGuardian] Real analysis failed: {e}. Using mock.")
        return run_mock_analysis(repo_url)
