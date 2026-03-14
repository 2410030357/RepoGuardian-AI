"""
digital_twin.py
───────────────
Builds a static-analysis dependency graph of a Python/JS codebase using
NetworkX, then simulates the blast radius of changing any single file.

A "Digital Twin" in this context is a structural model of the codebase:
  - Nodes  → files / modules
  - Edges  → import dependencies (A → B means A imports B)

Impact propagation:
  - Direct impact   : files that import the changed file (in-neighbours)
  - Indirect impact : files reachable transitively through those importers
  - Risk multiplier : files with high betweenness centrality are rated CRITICAL
"""

import re
import os
from pathlib import Path
from typing import Dict, List
import networkx as nx


# ── Graph construction ────────────────────────────────────

PYTHON_IMPORT_RE = re.compile(
    r'^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.,\s]+))',
    re.MULTILINE,
)
JS_IMPORT_RE = re.compile(
    r"""(?:import|require)\s*\(?['"](\.{1,2}/[^'"]+)['"]\)?""",
    re.MULTILINE,
)


def _extract_python_deps(content: str, file_path: str, all_files: List[str]) -> List[str]:
    """Return local module paths imported by a Python file."""
    deps = []
    base_dir = str(Path(file_path).parent)
    for match in PYTHON_IMPORT_RE.finditer(content):
        mod = (match.group(1) or match.group(2) or "").split(",")[0].strip()
        # Convert dotted module to path guess
        candidate = mod.replace(".", "/") + ".py"
        for f in all_files:
            if f.endswith(candidate) or f.endswith(mod.replace(".", "/") + "/__init__.py"):
                deps.append(f)
    return deps


def _extract_js_deps(content: str, file_path: str, all_files: List[str]) -> List[str]:
    """Return resolved import paths from a JS/TS file."""
    deps = []
    base = Path(file_path).parent
    for match in JS_IMPORT_RE.finditer(content):
        raw = match.group(1)
        resolved = str((base / raw).resolve())
        for f in all_files:
            if resolved in f or f.endswith(raw.lstrip("./")):
                deps.append(f)
    return deps


def build_dependency_graph(
    file_contents: Dict[str, str]   # { path: source_code }
) -> nx.DiGraph:
    """
    Construct directed dependency graph from a dict of file contents.
    Edge A → B means file A imports file B.
    """
    G = nx.DiGraph()
    all_files = list(file_contents.keys())

    for path in all_files:
        G.add_node(path)

    for path, content in file_contents.items():
        if path.endswith(".py"):
            deps = _extract_python_deps(content, path, all_files)
        elif path.endswith((".js", ".jsx", ".ts", ".tsx")):
            deps = _extract_js_deps(content, path, all_files)
        else:
            deps = []

        for dep in deps:
            if dep != path and dep in G:
                G.add_edge(path, dep)   # path → dep (path depends on dep)

    return G


# ── Simulation ────────────────────────────────────────────

def simulate_impact(
    graph: nx.DiGraph,
    changed_file: str,
    top_n: int = 20,
) -> dict:
    """
    Simulate the blast radius if `changed_file` is modified.

    Returns a dict with:
      - changed_file
      - direct_impact   : immediate importers
      - indirect_impact : transitive importers
      - safe_files      : files completely unaffected
      - critical_nodes  : top betweenness-centrality nodes (architectural risk)
      - impact_map      : per-file impact metadata
    """
    if changed_file not in graph:
        # Add as isolated node if not present (edge case for demo)
        graph.add_node(changed_file)

    # Reverse graph: edge B → A means "A depends on B"
    # So predecessors(changed_file) in reversed graph = who imports changed_file
    rev = graph.reverse(copy=True)

    direct   = set(rev.successors(changed_file))
    indirect = set()
    for d in direct:
        indirect.update(nx.descendants(rev, d))
    indirect -= direct
    indirect.discard(changed_file)

    all_affected = direct | indirect | {changed_file}
    safe = set(graph.nodes) - all_affected

    # Betweenness centrality → structural importance
    try:
        bc = nx.betweenness_centrality(graph, normalized=True)
    except Exception:
        bc = {n: 0.0 for n in graph.nodes}

    critical_threshold = sorted(bc.values(), reverse=True)[:max(1, len(bc) // 5)]
    critical_cutoff    = critical_threshold[-1] if critical_threshold else 1.0

    impact_map = {}
    for node in graph.nodes:
        if node == changed_file:
            tier = "CHANGED"
        elif node in direct:
            tier = "DIRECT"
        elif node in indirect:
            tier = "INDIRECT"
        else:
            tier = "SAFE"

        impact_map[node] = {
            "path":       node,
            "tier":       tier,
            "centrality": round(bc.get(node, 0.0), 4),
            "is_critical": bc.get(node, 0) >= critical_cutoff and tier != "SAFE",
        }

    # Top critical nodes by centrality (for UI badge)
    critical_nodes = sorted(
        [v for v in impact_map.values() if v["is_critical"]],
        key=lambda x: x["centrality"],
        reverse=True,
    )[:top_n]

    return {
        "changed_file":    changed_file,
        "direct_impact":   sorted(direct),
        "indirect_impact": sorted(indirect),
        "safe_files":      sorted(safe),
        "critical_nodes":  critical_nodes,
        "impact_map":      impact_map,
        "stats": {
            "total_files":    graph.number_of_nodes(),
            "total_edges":    graph.number_of_edges(),
            "affected_count": len(all_affected),
            "safe_count":     len(safe),
        },
    }


# ── Mock graph for demo (no real repo needed) ────────────

def build_mock_graph() -> nx.DiGraph:
    G = nx.DiGraph()
    nodes = [
        "src/auth/jwt.py", "src/auth/middleware.py",
        "src/db/queries.py", "src/db/connection.py",
        "src/api/routes.py", "src/api/handlers.py",
        "src/utils/helpers.py", "src/utils/validators.py",
        "src/ml/model.py", "src/ml/preprocess.py",
        "tests/test_auth.py", "tests/test_api.py",
    ]
    G.add_nodes_from(nodes)
    edges = [
        ("src/auth/middleware.py",  "src/auth/jwt.py"),
        ("src/api/routes.py",       "src/auth/middleware.py"),
        ("src/api/routes.py",       "src/db/queries.py"),
        ("src/api/handlers.py",     "src/api/routes.py"),
        ("src/api/handlers.py",     "src/utils/validators.py"),
        ("src/db/queries.py",       "src/db/connection.py"),
        ("src/ml/model.py",         "src/ml/preprocess.py"),
        ("src/ml/model.py",         "src/db/queries.py"),
        ("src/utils/validators.py", "src/utils/helpers.py"),
        ("tests/test_auth.py",      "src/auth/jwt.py"),
        ("tests/test_api.py",       "src/api/routes.py"),
    ]
    G.add_edges_from(edges)
    return G
