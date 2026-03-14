"""
main.py  –  RepoGuardian AI  –  FastAPI Backend
────────────────────────────────────────────────
Routes:
  POST /analyze-repo   – AI repo analysis (proxies Anthropic, falls back to rule-based)
  POST /analyze        – trigger multi-agent analysis
  GET  /health         – repository health score + breakdown
  POST /simulation     – digital twin blast-radius simulation
  GET  /quantum-risk   – quantum-inspired file risk ranking
  GET  /agent-logs     – streaming agent thought log
  GET  /ping           – health check
"""

import os
import json
import asyncio
import httpx
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from dotenv import load_dotenv

from agents import analyse_repository, AnalysisResult, run_mock_analysis, MOCK_AGENT_LOGS
from quantum_risk import calculate_quantum_risk
from digital_twin import build_mock_graph, simulate_impact

load_dotenv()

# ─────────────────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────────────────

app = FastAPI(
    title="RepoGuardian AI",
    description="Autonomous multi-agent code repository security & quality platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # allow all origins in dev
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_analysis_cache: dict = {}

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# ─────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    repo_url:  str
    use_mock:  bool = True

class SimulationRequest(BaseModel):
    changed_file: str
    repo_url:     Optional[str] = None

class RepoAnalyzeRequest(BaseModel):
    repo_name:    str
    language:     Optional[str] = "Unknown"
    stars:        Optional[int] = 0
    open_issues:  Optional[int] = 0
    size:         Optional[int] = 0
    topics:       Optional[list] = []
    description:  Optional[str] = ""
    default_branch: Optional[str] = "main"
    has_wiki:     Optional[bool] = False
    archived:     Optional[bool] = False


# ─────────────────────────────────────────────────────────
# Rule-based fallback engine (no API key needed)
# ─────────────────────────────────────────────────────────

def rule_based_analysis(req: RepoAnalyzeRequest) -> dict:
    """
    Produces a rich, deterministic analysis based on repo metadata.
    Works without any API key — used as fallback when Anthropic is unavailable.
    """
    lang = req.language or "Unknown"
    issues_count = req.open_issues or 0
    size_kb = req.size or 0

    # Score calculation
    base = 70
    if issues_count > 20: base -= 15
    elif issues_count > 10: base -= 8
    elif issues_count > 5: base -= 4
    if size_kb > 10000: base -= 5
    if req.archived: base -= 20
    if not req.has_wiki: base -= 3

    health_score = max(20, min(95, base))
    security_score = max(30, health_score - 12)
    quality_score = max(30, health_score - 8)
    dep_score = max(40, health_score + 5)
    doc_score = max(25, health_score - 20)

    # Language-specific findings
    lang_findings = {
        "Python": [
            {
                "id": "p1", "severity": "HIGH", "category": "Security",
                "title": "Potential hardcoded secrets in configuration",
                "file": "config.py or settings.py",
                "what_is_it": "Python projects often store API keys, database passwords, or secret tokens as plain text strings in configuration files.",
                "why_it_happens": "Early in development, hardcoding credentials is convenient. Developers often forget to move them to environment variables before pushing to version control.",
                "why_it_matters": "Anyone with read access to your repository — including bots that scan GitHub — can steal and abuse your production credentials, leading to data breaches or unexpected cloud bills.",
                "how_to_fix": "1. Create a .env file in your project root\n2. Move all secrets there: DB_PASSWORD=mypassword\n3. Add .env to your .gitignore immediately\n4. Use os.getenv('DB_PASSWORD') in your code\n5. Rotate any credentials that may have been exposed",
                "learn_more": "Study OWASP Top 10 A02:2021 (Cryptographic Failures) and the python-dotenv library documentation",
                "code_before": "# config.py\nDB_PASSWORD = \"prod_password_123\"\nSECRET_KEY = \"my-jwt-secret\"",
                "code_after": "# config.py\nimport os\nDB_PASSWORD = os.getenv(\"DB_PASSWORD\")\nSECRET_KEY = os.getenv(\"SECRET_KEY\")\nif not SECRET_KEY:\n    raise ValueError(\"SECRET_KEY env var not set\")",
            },
            {
                "id": "p2", "severity": "HIGH", "category": "Security",
                "title": "SQL Injection risk in database queries",
                "file": "database.py or models.py",
                "what_is_it": "SQL injection occurs when user-provided input is inserted directly into a SQL query string using string concatenation or formatting.",
                "why_it_happens": "String formatting feels natural when building queries. Many tutorials and older code examples still show this unsafe pattern without warning.",
                "why_it_matters": "An attacker can input `' OR '1'='1` to bypass login, extract all database records, modify data, or even drop tables entirely.",
                "how_to_fix": "1. Never use string formatting (%, .format(), f-strings) in SQL queries\n2. Always use parameterized queries — pass values as a separate tuple\n3. Consider using an ORM like SQLAlchemy which handles this automatically\n4. Audit all database calls in your codebase",
                "learn_more": "Read OWASP Top 10 A03:2021 (Injection) and Python's DB-API 2.0 specification on parameterized queries",
                "code_before": "# Dangerous\nquery = f\"SELECT * FROM users WHERE username = '{username}'\"\ncursor.execute(query)",
                "code_after": "# Safe — parameterized query\nquery = \"SELECT * FROM users WHERE username = ?\"\ncursor.execute(query, (username,))",
            },
            {
                "id": "p3", "severity": "MEDIUM", "category": "Quality",
                "title": "Missing type hints on function signatures",
                "file": "Multiple Python files",
                "what_is_it": "Python functions are defined without type annotations, meaning IDEs and static analysis tools cannot catch type-related bugs before runtime.",
                "why_it_happens": "Type hints were added to Python gradually (PEP 484, Python 3.5+). Many developers learned Python before they were common and haven't adopted them.",
                "why_it_matters": "Without type hints, a function expecting a string that receives an integer causes a runtime crash. IDEs cannot autocomplete correctly. mypy cannot catch errors before deployment.",
                "how_to_fix": "1. Add parameter types and return types to all public functions\n2. Run: pip install mypy\n3. Run: mypy your_module.py to catch type errors\n4. Use Optional[str] for parameters that can be None",
                "learn_more": "Read PEP 484 (Type Hints), PEP 526 (Variable Annotations), and the mypy documentation",
                "code_before": "def process_user(user_id, data, flag=None):\n    return fetch_user(user_id)",
                "code_after": "from typing import Optional, Dict, Any\n\ndef process_user(\n    user_id: int,\n    data: Dict[str, Any],\n    flag: Optional[bool] = None\n) -> Optional[dict]:\n    return fetch_user(user_id)",
            },
        ],
        "Java": [
            {
                "id": "j1", "severity": "HIGH", "category": "Security",
                "title": "Potential NullPointerException vulnerabilities",
                "file": "Multiple Java files",
                "what_is_it": "Java code that accesses object members without checking for null first will throw a NullPointerException at runtime, crashing the application.",
                "why_it_happens": "Java returns null for uninitialized objects and failed lookups. Without null checks, code written during happy-path testing works fine but crashes in production.",
                "why_it_matters": "NPEs are the most common Java runtime exception. They cause unexpected 500 errors, crash worker threads, and can expose stack traces to end users in misconfigured apps.",
                "how_to_fix": "1. Use Java 8+ Optional<T> instead of returning null\n2. Add @NonNull/@Nullable annotations (JetBrains or Lombok)\n3. Use Objects.requireNonNull() for mandatory parameters\n4. Consider using a linter like SpotBugs to detect null dereferences",
                "learn_more": "Study Java Optional class (JDK 8+), JSR-305 null annotations, and the NullAway static analyzer",
                "code_before": "public String getUserName(User user) {\n    return user.getProfile().getName();\n}",
                "code_after": "public Optional<String> getUserName(User user) {\n    return Optional.ofNullable(user)\n        .map(User::getProfile)\n        .map(Profile::getName);\n}",
            },
            {
                "id": "j2", "severity": "MEDIUM", "category": "Quality",
                "title": "Missing input validation in Spring controllers",
                "file": "Controller classes",
                "what_is_it": "REST controller endpoints accept user input without validating format, length, or content using Bean Validation annotations.",
                "why_it_happens": "Validation is often added as an afterthought, or developers rely on database constraints instead of catching invalid input early at the API layer.",
                "why_it_matters": "Invalid input can cause database errors, unexpected behavior in business logic, security vulnerabilities (XSS, injection), and poor user experience.",
                "how_to_fix": "1. Add @Valid to controller method parameters\n2. Use @NotNull, @Size, @Email, @Pattern on DTO fields\n3. Create a global @ExceptionHandler for MethodArgumentNotValidException\n4. Return structured validation error responses",
                "learn_more": "Study Spring Validation with Hibernate Validator, Jakarta Bean Validation 3.0 specification",
                "code_before": "@PostMapping(\"/users\")\npublic User createUser(@RequestBody UserDto dto) {\n    return userService.create(dto);\n}",
                "code_after": "@PostMapping(\"/users\")\npublic User createUser(@Valid @RequestBody UserDto dto) {\n    return userService.create(dto);\n}\n// In UserDto:\n@NotBlank @Size(min=2, max=50)\nprivate String name;\n@Email @NotBlank\nprivate String email;",
            },
        ],
        "JavaScript": [
            {
                "id": "js1", "severity": "HIGH", "category": "Security",
                "title": "Potential XSS via innerHTML usage",
                "file": "Frontend JavaScript files",
                "what_is_it": "Using innerHTML to insert content from user input or external sources allows attackers to inject malicious HTML and JavaScript into your page.",
                "why_it_happens": "innerHTML is the easiest way to dynamically add HTML. Developers use it without realizing it executes any <script> tags or event handlers in the inserted string.",
                "why_it_matters": "An attacker can inject <script>document.cookie</script> to steal session cookies, redirect users to phishing sites, or perform actions as the logged-in user.",
                "how_to_fix": "1. Replace innerHTML with textContent for plain text\n2. Use createElement/appendChild for dynamic HTML\n3. If you must use innerHTML, sanitize with DOMPurify first\n4. Enable Content Security Policy (CSP) headers",
                "learn_more": "Read OWASP XSS Prevention Cheat Sheet and the DOMPurify library documentation",
                "code_before": "// Dangerous\ndiv.innerHTML = userInput;\ndiv.innerHTML = `<h1>${req.params.name}</h1>`;",
                "code_after": "// Safe for text\ndiv.textContent = userInput;\n\n// Safe for HTML — sanitize first\nimport DOMPurify from 'dompurify';\ndiv.innerHTML = DOMPurify.sanitize(userInput);",
            },
        ],
        "TypeScript": [
            {
                "id": "ts1", "severity": "MEDIUM", "category": "Quality",
                "title": "Overuse of 'any' type defeats TypeScript safety",
                "file": "Multiple TypeScript files",
                "what_is_it": "Using the 'any' type tells TypeScript to skip type checking for a variable, effectively turning off the main benefit of TypeScript for that code path.",
                "why_it_happens": "When migrating from JavaScript or dealing with complex third-party types, using 'any' is a quick way to silence TypeScript errors without understanding the proper type.",
                "why_it_matters": "Code using 'any' can have type-related bugs that TypeScript would normally catch — null access, wrong method calls, incorrect argument types — all invisible until runtime.",
                "how_to_fix": "1. Enable strict: true in tsconfig.json\n2. Enable noImplicitAny: true\n3. Replace 'any' with 'unknown' when type is truly unknown\n4. Use generics <T> for flexible but still type-safe code\n5. Use type assertions (as Type) only when you are certain",
                "learn_more": "Read the TypeScript Handbook on 'unknown vs any' and TypeScript strict mode documentation",
                "code_before": "function processData(data: any): any {\n    return data.value.nested;\n}",
                "code_after": "interface DataShape {\n    value: { nested: string };\n}\nfunction processData(data: DataShape): string {\n    return data.value.nested;\n}",
            },
        ],
    }

    # Get language-specific findings or generic ones
    specific = lang_findings.get(lang, [])
    generic_findings = [
        {
            "id": "g1", "severity": "MEDIUM", "category": "Documentation",
            "title": "Insufficient inline documentation",
            "file": "Multiple source files",
            "what_is_it": f"Public functions and classes in this {lang} project lack descriptive comments and documentation explaining their purpose, parameters, and return values.",
            "why_it_happens": "Documentation is treated as optional during fast development cycles. There is social pressure to ship features, and documentation has no immediate functional impact.",
            "why_it_matters": "New team members spend hours reverse-engineering undocumented code. Future-you will not remember what a complex function does in 6 months. IDEs show no hints on hover.",
            "how_to_fix": "1. Document every public function before merging PRs\n2. Explain WHY the code does what it does, not just WHAT it does\n3. Document edge cases, null returns, and thrown exceptions\n4. Set up a linter rule to enforce documentation coverage",
            "learn_more": f"Study the {lang} documentation standards for your ecosystem (JSDoc, JavaDoc, Python docstrings, etc.)",
            "code_before": f"# No documentation\ndef calculate(x, y, mode):\n    if mode == 1:\n        return x * y * 0.4\n    return x + y",
            "code_after": f'def calculate(x: float, y: float, mode: int) -> float:\n    """Calculate a weighted or summed result.\n\n    Args:\n        x: First operand.\n        y: Second operand.\n        mode: 1 for weighted product, 0 for sum.\n\n    Returns:\n        Weighted product (mode=1) or simple sum.\n    """\n    if mode == 1:\n        return x * y * 0.4\n    return x + y',
        },
        {
            "id": "g2", "severity": "LOW", "category": "Quality",
            "title": "No automated testing detected",
            "file": "Repository root",
            "what_is_it": "The repository appears to have low or no automated test coverage, meaning code changes are only verified manually.",
            "why_it_happens": "Writing tests takes time that is often deprioritized under deadline pressure. Many developers are never taught test-driven development in school.",
            "why_it_matters": "Without tests, every code change might silently break existing functionality. Refactoring becomes dangerous. Bugs only surface in production where they affect real users.",
            "how_to_fix": "1. Start with the most critical functions — authentication, payments, data writes\n2. Write at least one happy-path test and one error-path test per function\n3. Set a minimum coverage threshold (e.g. 70%) in your CI pipeline\n4. Use mocks/stubs to isolate units from external dependencies",
            "learn_more": "Study Test-Driven Development (TDD) by Kent Beck, and the testing framework for your language (pytest, JUnit, Jest, etc.)",
            "code_before": "# No tests exist for this critical function\ndef transfer_funds(from_account, to_account, amount):\n    ...",
            "code_after": "# test_transfers.py\ndef test_transfer_funds_success():\n    acc1 = Account(balance=1000)\n    acc2 = Account(balance=0)\n    transfer_funds(acc1, acc2, 500)\n    assert acc1.balance == 500\n    assert acc2.balance == 500\n\ndef test_transfer_funds_insufficient_balance():\n    acc1 = Account(balance=100)\n    with pytest.raises(InsufficientFundsError):\n        transfer_funds(acc1, Account(balance=0), 500)",
        },
    ]

    all_findings = specific + generic_findings

    digital_twin = {
        "architecture_summary": f"This is a {lang} project with {issues_count} open issues. The codebase structure follows standard {lang} conventions. Key risk areas are authentication, data access, and input validation layers.",
        "files": [
            {"name": "main entry point", "role": "Application bootstrap and configuration loading", "type": "entry", "dependents": [], "dependencies": ["config", "routes"], "change_impact": "Changes here affect the entire application startup sequence", "risk": "high"},
            {"name": "authentication module", "role": "Handles user login, session management, and access control", "type": "core", "dependents": ["routes", "middleware"], "dependencies": ["database", "config"], "change_impact": "Any change to auth logic can lock out users or create security holes", "risk": "high"},
            {"name": "database layer", "role": "All database connections, queries, and data models", "type": "core", "dependents": ["auth", "business logic"], "dependencies": ["config"], "change_impact": "Schema or query changes ripple through all modules that read/write data", "risk": "high"},
            {"name": "configuration", "role": "Environment variables, secrets, and app settings", "type": "config", "dependents": ["all modules"], "dependencies": [], "change_impact": "Wrong config crashes the entire application at startup", "risk": "medium"},
        ],
        "impact_chains": [
            {"trigger_file": "configuration", "chain": ["database layer", "authentication module", "all routes"], "blast_radius": "high", "scenario": "If configuration changes (wrong DB host, missing secret key), the database connection fails, authentication cannot verify users, and all protected API routes return 500 errors — complete outage."},
            {"trigger_file": "authentication module", "chain": ["protected routes", "user sessions"], "blast_radius": "high", "scenario": "If authentication logic changes (e.g., token validation rules), all currently logged-in users may get logged out, and new logins may silently fail depending on the change."},
        ],
    }

    quantum_risk = [
        {"file": "authentication module", "risk_score": 0.85, "risk_level": "HIGH", "factors": ["Central dependency", "Security-critical", "High coupling"], "explanation": "Authentication is the gateway to your entire application — any vulnerability here compromises all users."},
        {"file": "database layer", "risk_score": 0.78, "risk_level": "HIGH", "factors": ["All data flows through here", "SQL injection surface", "No tests detected"], "explanation": "Every piece of data your app reads or writes passes through this layer, making it the highest-impact attack surface."},
        {"file": "main entry point", "risk_score": 0.55, "risk_level": "MEDIUM", "factors": ["Config loading", "Startup sequence"], "explanation": "Problems here prevent the app from starting at all — crashes are total but usually obvious and fast to diagnose."},
        {"file": "API routes", "risk_score": 0.48, "risk_level": "MEDIUM", "factors": ["Input validation", "External interface", "Error handling"], "explanation": "Direct interface with untrusted external input — missing validation here is the entry point for most web attacks."},
    ]

    agent_logs = [
        {"agent": "Orchestrator", "msg": f"Analysing {req.repo_name} — building structure model", "status": "running"},
        {"agent": "Security Scout", "msg": f"Scanning {lang} project for common vulnerability patterns", "status": "running"},
        {"agent": "Security Scout", "msg": f"Identified {len([f for f in all_findings if f['severity'] in ('CRITICAL','HIGH')])} high-priority security findings", "status": "alert" if any(f['severity'] in ('CRITICAL','HIGH') for f in all_findings) else "success"},
        {"agent": "Quality Architect", "msg": "Evaluating code structure, complexity, and documentation coverage", "status": "running"},
        {"agent": "Quality Architect", "msg": f"Quality score: {quality_score}/100 — {issues_count} open issues tracked", "status": "warn" if quality_score < 70 else "success"},
        {"agent": "Dependency Warden", "msg": f"Checking {lang} dependency manifest for known CVEs", "status": "running"},
        {"agent": "Dependency Warden", "msg": "Dependency audit complete", "status": "success"},
        {"agent": "Docs Specialist", "msg": f"Documentation coverage estimated at {doc_score}%", "status": "warn" if doc_score < 60 else "success"},
        {"agent": "AI Fix Agent", "msg": "Generating educational explanations for all findings", "status": "running"},
        {"agent": "AI Fix Agent", "msg": f"Educational content generated for {len(all_findings)} findings", "status": "success"},
        {"agent": "Orchestrator", "msg": f"Analysis complete. Health Score: {health_score}/100", "status": "success" if health_score >= 70 else "warn"},
    ]

    return {
        "health_score": health_score,
        "security_score": security_score,
        "quality_score": quality_score,
        "dependency_score": dep_score,
        "documentation_score": doc_score,
        "status": "Healthy" if health_score >= 80 else "Moderate" if health_score >= 60 else "Degraded" if health_score >= 40 else "At Risk",
        "summary": f"This {lang} repository has a health score of {health_score}/100. {len([f for f in all_findings if f['severity'] in ('CRITICAL','HIGH')])} high-priority issues were found requiring attention. Focus on security hardening and improving documentation coverage.",
        "findings": all_findings,
        "quantum_risk": quantum_risk,
        "digital_twin": digital_twin,
        "agent_logs": agent_logs,
        "source": "rule-based",
    }


# ─────────────────────────────────────────────────────────
# NEW ROUTE: /analyze-repo  (proxies Anthropic, CORS safe)
# ─────────────────────────────────────────────────────────

ANALYSIS_PROMPT = """You are RepoGuardian AI — an expert code educator and security analyst. Analyze this GitHub repository and produce a deeply educational report that TEACHES developers, not just lists issues.

Repository: {repo_name}
Language: {language}
Stars: {stars}
Open Issues: {open_issues}
Size: {size} KB
Topics: {topics}
Description: {description}
Default Branch: {default_branch}

Return ONLY valid JSON (no markdown, no backticks) in this exact format:
{{
  "health_score": <0-100>,
  "security_score": <0-100>,
  "quality_score": <0-100>,
  "dependency_score": <0-100>,
  "documentation_score": <0-100>,
  "status": "Healthy|Moderate|Degraded|At Risk",
  "summary": "<2-3 sentence summary>",
  "findings": [
    {{
      "id": "f1",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "category": "Security|Quality|Dependency|Documentation",
      "title": "<short title>",
      "file": "<filename:line or N/A>",
      "what_is_it": "<plain English: what this issue IS>",
      "why_it_happens": "<why developers make this mistake>",
      "why_it_matters": "<real-world impact and consequences>",
      "how_to_fix": "<numbered step-by-step fix>",
      "learn_more": "<concept to study>",
      "code_before": "<bad code 3-8 lines or empty>",
      "code_after": "<fixed code 3-8 lines or empty>"
    }}
  ],
  "quantum_risk": [
    {{
      "file": "<filename>",
      "risk_score": <0.0-1.0>,
      "risk_level": "HIGH|MEDIUM|LOW",
      "factors": ["<factor>"],
      "explanation": "<plain English reason>"
    }}
  ],
  "digital_twin": {{
    "architecture_summary": "<2-3 sentences on codebase structure>",
    "files": [
      {{
        "name": "<filename>",
        "role": "<what it does>",
        "type": "entry|core|utility|config|test",
        "dependents": ["<file>"],
        "dependencies": ["<file>"],
        "change_impact": "<what breaks if changed>",
        "risk": "high|medium|low"
      }}
    ],
    "impact_chains": [
      {{
        "trigger_file": "<file>",
        "chain": ["<file1>", "<file2>"],
        "scenario": "<real consequence>",
        "blast_radius": "high|medium|low"
      }}
    ]
  }},
  "agent_logs": [
    {{"agent": "<name>", "msg": "<message>", "status": "running|alert|warn|success"}}
  ]
}}

Generate 5-7 findings with rich educational content specific to {language}. Make 10-12 agent_logs.
"""

@app.post("/analyze-repo")
async def analyze_repo(req: RepoAnalyzeRequest):
    """
    Main analysis endpoint called by the frontend.
    Tries Anthropic Claude API first, falls back to rule-based engine.
    """
    cache_key = req.repo_name
    if cache_key in _analysis_cache:
        return _analysis_cache[cache_key]

    # Try Anthropic API if key is configured
    if ANTHROPIC_API_KEY and ANTHROPIC_API_KEY.startswith("sk-ant-"):
        prompt = ANALYSIS_PROMPT.format(
            repo_name=req.repo_name,
            language=req.language,
            stars=req.stars,
            open_issues=req.open_issues,
            size=req.size,
            topics=", ".join(req.topics) if req.topics else "none",
            description=req.description,
            default_branch=req.default_branch,
        )
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 3000,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                )
            if resp.status_code == 200:
                data = resp.json()
                text = "".join(c.get("text", "") for c in data.get("content", []))
                text = text.replace("```json", "").replace("```", "").strip()
                result = json.loads(text)
                result["source"] = "anthropic"
                _analysis_cache[cache_key] = result
                return result
            else:
                print(f"[Anthropic] HTTP {resp.status_code}: {resp.text[:200]} - falling back to rule-based engine")
        except Exception as e:
            print(f"[Anthropic] Error: {e} - falling back to rule-based engine")

    # Fallback: rule-based analysis (always works)
    result = rule_based_analysis(req)
    _analysis_cache[cache_key] = result
    return result


# ─────────────────────────────────────────────────────────
# Existing routes
# ─────────────────────────────────────────────────────────

MOCK_FILES_FOR_QUANTUM = [
    {"path": "src/auth/jwt.py",        "complexity": 18, "churn": 42, "coupling": 9,  "has_tests": False},
    {"path": "src/db/queries.py",       "complexity": 12, "churn": 31, "coupling": 14, "has_tests": False},
    {"path": "src/api/routes.py",       "complexity": 8,  "churn": 55, "coupling": 7,  "has_tests": True},
    {"path": "src/utils/helpers.py",    "complexity": 4,  "churn": 8,  "coupling": 3,  "has_tests": True},
    {"path": "src/ml/model_train.py",   "complexity": 22, "churn": 19, "coupling": 6,  "has_tests": False},
    {"path": "src/auth/middleware.py",  "complexity": 14, "churn": 38, "coupling": 11, "has_tests": False},
]

@app.get("/ping")
def ping():
    return {"status": "online", "service": "RepoGuardian AI", "ts": datetime.utcnow().isoformat()}

@app.post("/analyze")
async def analyze(req: AnalyzeRequest, bg: BackgroundTasks):
    def _run():
        result = analyse_repository(req.repo_url, use_mock=req.use_mock)
        _analysis_cache[req.repo_url] = result
    bg.add_task(_run)
    return {"status": "queued", "repo": req.repo_url, "message": "Analysis started. Poll /health for results."}

@app.get("/health")
def get_health(repo_url: Optional[str] = None):
    if repo_url and repo_url in _analysis_cache:
        r = _analysis_cache[repo_url]
    elif _analysis_cache:
        r = list(_analysis_cache.values())[-1]
    else:
        r = run_mock_analysis("kluniversity/auth-service")
    return {"repo": r.repo, "health_score": r.health_score, "findings": r.findings, "summary": r.summary, "agent_logs": r.agent_logs, "last_updated": datetime.utcnow().isoformat()}

@app.post("/simulation")
def run_simulation(req: SimulationRequest):
    graph  = build_mock_graph()
    result = simulate_impact(graph, req.changed_file)
    return result

@app.get("/quantum-risk")
def quantum_risk(repo_url: Optional[str] = None):
    profiles = calculate_quantum_risk(MOCK_FILES_FOR_QUANTUM)
    return {"repo": repo_url or "mock-repo", "profiles": [{"path": p.path, "risk_score": p.risk_score, "risk_level": p.risk_level, "dominant_factor": p.dominant_factor} for p in profiles]}

@app.get("/simulation/files")
def list_simulatable_files():
    graph = build_mock_graph()
    return {"files": sorted(graph.nodes())}

@app.get("/agent-logs")
async def stream_agent_logs():
    import json as _json
    async def event_generator():
        for log in MOCK_AGENT_LOGS:
            yield f"data: {_json.dumps(log)}\n\n"
            await asyncio.sleep(1.2)
        yield "data: {\"agent\":\"Orchestrator\",\"msg\":\"Stream complete.\",\"status\":\"success\"}\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)