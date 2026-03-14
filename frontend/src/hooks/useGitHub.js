/**
 * useGitHub.js  –  Real GitHub API integration
 * FIX: getRepoFileContext now returns hasTests/hasCI/hasDocker/hasReadme flags
 *      for the backend /analyze-repo endpoint.
 *      README fetch is gracefully handled (404 = no readme, not an error).
 */
import { useState, useEffect, useCallback } from 'react';

const GH_BASE = 'https://api.github.com';

const ghFetch = (url, token) =>
  fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useGitHubRepos(token) {
  const [repos,   setRepos]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchRepos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ghFetch(
        `${GH_BASE}/user/repos?sort=updated&per_page=100&type=all`,
        token
      );
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      setRepos(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRepos(); }, [fetchRepos]);
  return { repos, loading, error, refetch: fetchRepos };
}

export function useGitHubUser(token) {
  const [ghUser,  setGhUser]  = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    ghFetch(`${GH_BASE}/user`, token)
      .then(r => r.json())
      .then(d => { setGhUser(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  return { ghUser, loading };
}

export async function fetchGitHubUser(token) {
  const res = await ghFetch(`${GH_BASE}/user`, token);
  if (!res.ok) throw new Error('Invalid token or insufficient permissions');
  return res.json();
}

export async function fetchRepoDetails(token, owner, repo) {
  const safe = async (promise) => {
    try {
      const r = await promise;
      return r.ok ? r.json() : [];
    } catch { return []; }
  };

  const [repoData, contributors, commits, branches, pulls] = await Promise.all([
    safe(ghFetch(`${GH_BASE}/repos/${owner}/${repo}`, token)),
    safe(ghFetch(`${GH_BASE}/repos/${owner}/${repo}/contributors?per_page=5`, token)),
    safe(ghFetch(`${GH_BASE}/repos/${owner}/${repo}/commits?per_page=10`, token)),
    safe(ghFetch(`${GH_BASE}/repos/${owner}/${repo}/branches`, token)),
    safe(ghFetch(`${GH_BASE}/repos/${owner}/${repo}/pulls?state=open&per_page=5`, token)),
  ]);

  return { repoData: repoData || {}, contributors, commits, branches, pulls };
}

// ── File tree ──────────────────────────────────────────────────────────────

export async function fetchRepoTree(token, owner, repo, defaultBranch = 'main') {
  const branches = [defaultBranch, 'main', 'master', 'HEAD'];
  for (const branch of [...new Set(branches)]) {
    try {
      const res = await ghFetch(
        `${GH_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        token
      );
      if (res.ok) {
        const data = await res.json();
        return (data.tree || [])
          .filter(item => item.type === 'blob')
          .map(item => item.path);
      }
    } catch { /* try next branch */ }
  }
  return [];
}

// ── README (graceful 404) ─────────────────────────────────────────────────

export async function fetchRepoReadme(token, owner, repo) {
  try {
    const res = await ghFetch(`${GH_BASE}/repos/${owner}/${repo}/readme`, token);
    if (!res.ok) return null;   // 404 = no readme, that's fine
    const data = await res.json();
    if (!data.content) return null;
    return atob(data.content.replace(/\n/g, ''));
  } catch {
    return null;
  }
}

// ── Single file content ────────────────────────────────────────────────────

export async function fetchFileContent(token, owner, repo, path) {
  try {
    const res = await ghFetch(
      `${GH_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
      token
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.encoding === 'base64' && data.content) {
      return atob(data.content.replace(/\n/g, ''));
    }
    return null;
  } catch {
    return null;
  }
}

// ── Rich context builder ───────────────────────────────────────────────────

/**
 * Fetches file tree, key manifests, source files, README.
 * Returns a context object ready for POST /analyze-repo.
 */
export async function getRepoFileContext(token, owner, repo, repoData = {}) {
  const [tree, readme] = await Promise.all([
    fetchRepoTree(token, owner, repo, repoData.default_branch),
    fetchRepoReadme(token, owner, repo),   // gracefully returns null on 404
  ]);

  // Empty repo
  if (tree.length === 0) {
    return {
      isEmpty: true, context: '', fileCount: 0, tree: [],
      hasTests: false, hasCI: false, hasDocker: false,
      hasReadme: Boolean(readme), hasLicense: false, hasSecurityMd: false,
    };
  }

  // Detect structural flags
  const hasTests      = tree.some(f => /test|spec|__tests__/i.test(f));
  const hasCI         = tree.some(f => f.includes('.github/workflows') || f.includes('.gitlab-ci') || f.includes('Jenkinsfile') || f.includes('.circleci'));
  const hasDocker     = tree.some(f => f === 'Dockerfile' || f.endsWith('/Dockerfile') || f === 'docker-compose.yml');
  const hasReadme     = Boolean(readme) || tree.some(f => /readme/i.test(f));
  const hasLicense    = tree.some(f => /^license/i.test(f));
  const hasSecurityMd = tree.some(f => /security/i.test(f) && f.endsWith('.md'));

  // Build context string
  let context = `## File Tree (${tree.length} files)\n`;
  context += tree.slice(0, 80).join('\n');
  if (tree.length > 80) context += `\n... and ${tree.length - 80} more`;
  context += '\n\n';

  // Fetch manifest files
  const MANIFESTS = [
    'requirements.txt', 'package.json', 'Pipfile', 'pyproject.toml',
    'Gemfile', 'go.mod', 'pom.xml', 'Cargo.toml', 'composer.json',
    'setup.py', 'setup.cfg', 'build.gradle',
  ];
  const manifests = tree.filter(f => MANIFESTS.some(m => f === m || f.endsWith('/' + m)));
  for (const mf of manifests.slice(0, 3)) {
    const content = await fetchFileContent(token, owner, repo, mf);
    if (content) context += `## ${mf}\n${content.slice(0, 700)}\n\n`;
  }

  // Fetch key source files
  const SOURCE_PATTERNS = [
    /^src\/.*\.(py|js|ts|go|rb|java|rs|cpp|c)$/,
    /^app\/.*\.(py|js|ts|go|rb|java)$/,
    /^lib\/.*\.(py|js|ts|go|rb|java)$/,
    /^(auth|security|db|database|config|routes|api|main|index|server)\.(py|js|ts|go|rb|java)$/i,
  ];
  const sourceFiles = tree
    .filter(f => SOURCE_PATTERNS.some(p => p.test(f)) && !/test|spec/i.test(f))
    .slice(0, 5);

  for (const sf of sourceFiles) {
    const content = await fetchFileContent(token, owner, repo, sf);
    if (content) context += `## ${sf}\n${content.slice(0, 800)}\n\n`;
  }

  // Add README excerpt
  if (readme) {
    context += `## README (excerpt)\n${readme.slice(0, 500)}\n\n`;
  }

  return {
    isEmpty: false,
    context: context.slice(0, 6000),
    fileCount: tree.length,
    tree,
    hasTests,
    hasCI,
    hasDocker,
    hasReadme,
    hasLicense,
    hasSecurityMd,
  };
}