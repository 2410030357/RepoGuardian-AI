"""
quantum_risk.py
───────────────
Quantum-inspired risk prediction using a Complexity × Frequency matrix.

Real quantum computing simulates superposition of all states simultaneously.
We mimic this by treating every file as existing in multiple "risk states" at
once, then collapsing the wave-function via a weighted probability vector.

The four observables we measure:
  1. cyclomatic_complexity  – how branchy the logic is
  2. churn_frequency        – how often the file changes (commit velocity)
  3. coupling_degree        – how many other modules import it
  4. test_absence_penalty   – penalise files with no test coverage

We build a 4×N matrix M where each column is a file, normalise each row to
a probability distribution, then compute the "quantum risk amplitude" as the
L2-norm of the column vector (analogous to the Born rule: P = |ψ|²).
"""

import numpy as np
from dataclasses import dataclass
from typing import List


@dataclass
class FileRiskProfile:
    path: str
    risk_score: float          # 0.0 – 1.0
    risk_level: str            # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    dominant_factor: str       # which observable drove the risk
    amplitude_vector: list     # the raw 4-component ψ vector


def calculate_quantum_risk(files: List[dict]) -> List[FileRiskProfile]:
    """
    Parameters
    ----------
    files : list of dicts, each with keys:
        path, complexity, churn, coupling, has_tests (bool)

    Returns
    -------
    List[FileRiskProfile] sorted by risk_score descending.
    """
    if not files:
        return []

    n = len(files)
    LABELS = ["complexity", "churn", "coupling", "test_absence"]
    WEIGHTS = np.array([0.35, 0.25, 0.25, 0.15])  # must sum to 1.0

    # Build raw 4×N observable matrix
    raw = np.zeros((4, n))
    for i, f in enumerate(files):
        raw[0, i] = float(f.get("complexity", 1))
        raw[1, i] = float(f.get("churn", 0))
        raw[2, i] = float(f.get("coupling", 0))
        raw[3, i] = 0.0 if f.get("has_tests", False) else 1.0

    # Row-wise min-max normalisation → each observable ∈ [0, 1]
    for row in range(4):
        lo, hi = raw[row].min(), raw[row].max()
        if hi > lo:
            raw[row] = (raw[row] - lo) / (hi - lo)
        else:
            raw[row] = 0.0

    # Amplitude vector ψ_i = sqrt(w) ⊙ raw_col  (weighted Hilbert space)
    sqrt_w = np.sqrt(WEIGHTS).reshape(4, 1)
    psi = sqrt_w * raw                           # 4×N

    # Risk score = |ψ|² (Born rule analogue), clipped to [0, 1]
    scores = np.sum(psi ** 2, axis=0)            # shape (N,)
    scores = np.clip(scores, 0.0, 1.0)

    def level(s: float) -> str:
        if s >= 0.75: return "CRITICAL"
        if s >= 0.50: return "HIGH"
        if s >= 0.25: return "MEDIUM"
        return "LOW"

    results = []
    for i, f in enumerate(files):
        dominant_idx = int(np.argmax(psi[:, i]))
        results.append(FileRiskProfile(
            path=f["path"],
            risk_score=round(float(scores[i]), 4),
            risk_level=level(scores[i]),
            dominant_factor=LABELS[dominant_idx],
            amplitude_vector=[round(float(v), 4) for v in psi[:, i]],
        ))

    return sorted(results, key=lambda r: r.risk_score, reverse=True)


# ── Demo / self-test ──────────────────────────────────────
if __name__ == "__main__":
    sample = [
        {"path": "src/auth/jwt.py",        "complexity": 18, "churn": 42, "coupling": 9,  "has_tests": False},
        {"path": "src/db/queries.py",       "complexity": 12, "churn": 31, "coupling": 14, "has_tests": False},
        {"path": "src/api/routes.py",       "complexity": 8,  "churn": 55, "coupling": 7,  "has_tests": True},
        {"path": "src/utils/helpers.py",    "complexity": 4,  "churn": 8,  "coupling": 3,  "has_tests": True},
        {"path": "tests/test_auth.py",      "complexity": 2,  "churn": 12, "coupling": 1,  "has_tests": True},
        {"path": "src/ml/model_train.py",   "complexity": 22, "churn": 19, "coupling": 6,  "has_tests": False},
    ]
    for r in calculate_quantum_risk(sample):
        print(f"{r.risk_level:8s} {r.risk_score:.3f}  {r.path}  [{r.dominant_factor}]")
