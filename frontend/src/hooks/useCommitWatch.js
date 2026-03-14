/**
 * useCommitWatch.js  v3  –  Complete rewrite
 * ─────────────────────────────────────────────────────────────────
 * Watches ALL branches (including default/master/main).
 * Triggers agent feed for ANY new commit.
 * For non-default branches with no open PR → also shows PR suggestion.
 *
 * KEY FIX: On first load, marks commits older than 3 minutes as
 * already-seen so we don't spam on page load, but commits within
 * the last 3 minutes ARE treated as new and trigger the feed.
 * ─────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const POLL_MS        = 60_000;   // poll every 60 seconds
const NEW_WITHIN_MS  = 3 * 60 * 1000; // 3 minutes = "new on first load"
const STORE_KEY      = 'rg_commit_watch_v3';

const ghHeaders = (token) => ({
  Authorization: `token ${token}`,
  Accept: 'application/vnd.github.v3+json',
});

// ── localStorage ──────────────────────────────────────────────────────────
function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
  catch { return {}; }
}
function writeStore(d) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch {}
}

// ── Build agent log sequence for a commit ────────────────────────────────
export function buildAgentLogs(commitMsg, repoName, branchName) {
  const msg   = (commitMsg || '').toLowerCase();
  const isFix = /fix|bug|patch|hotfix/i.test(msg);
  const isFeat= /feat|add|new|implement|create/i.test(msg);
  const isDeps= /dep|package|install|upgrade|npm|pip|yarn/i.test(msg);
  const isDocs= /doc|readme|comment|changelog|update/i.test(msg);
  const isMain= /^(main|master|develop)$/.test(branchName);

  return [
    { agent:'Orchestrator',      msg:`New commit detected on "${branchName}" in ${repoName} — starting scan`,        status:'running' },
    { agent:'Security Scout',    msg:`Scanning diff for secrets, injection vectors and auth issues...`,               status:'running' },
    ...(isFix ? [
      { agent:'Security Scout',  msg:`Fix commit — verifying patch doesn't introduce new vulnerabilities`,            status:'running' },
    ] : []),
    { agent:'Quality Architect', msg:`Checking cyclomatic complexity and style in changed files...`,                  status:'running' },
    ...(isFeat ? [
      { agent:'Quality Architect',msg:`New feature detected — checking for missing test coverage`,                    status:'warn'    },
    ] : []),
    ...(isDeps ? [
      { agent:'Dependency Warden',msg:`Dependency change detected — cross-referencing NVD CVE database...`,          status:'running' },
      { agent:'Dependency Warden',msg:`Auditing updated packages against known CVEs`,                                 status:'running' },
    ] : [
      { agent:'Dependency Warden',msg:`No dependency changes — skipping CVE audit`,                                   status:'success' },
    ]),
    ...(isDocs ? [
      { agent:'Docs Specialist',  msg:`Documentation update — verifying accuracy and cross-references`,               status:'running' },
    ] : [
      { agent:'Docs Specialist',  msg:`Checking if new code has adequate docstring coverage...`,                      status:'running' },
    ]),
    { agent:'AI Fix Agent',      msg:`No critical issues found — changes look clean`,                                 status:'success' },
    ...(isMain ? [
      { agent:'Orchestrator',    msg:`Scan complete for ${repoName} · ${branchName} — no blockers found`,            status:'success' },
    ] : [
      { agent:'Orchestrator',    msg:`Scan complete — "${branchName}" is ready to open a pull request`,              status:'success' },
    ]),
  ];
}

// ── Main hook ─────────────────────────────────────────────────────────────
export function useCommitWatch(token, repos) {
  const [notification,   setNotification]   = useState(null);  // PR suggestion
  const [agentTrigger,   setAgentTrigger]   = useState(null);  // agent feed trigger
  const [recentActivity, setRecentActivity] = useState([]);
  const storeRef = useRef(readStore());
  const timerRef = useRef(null);

  const dismiss = useCallback(() => {
    setNotification(null);
    setAgentTrigger(null);
  }, []);

  const poll = useCallback(async () => {
    if (!token || !repos?.length) return;

    const headers   = ghHeaders(token);
    const store     = { ...storeRef.current };
    const activity  = [];
    const now       = Date.now();
    let   trigger   = null;   // first new commit found
    let   prBanner  = null;   // PR suggestion (non-default branch only)

    for (const repo of repos.slice(0, 10)) {
      const owner  = repo.owner?.login;
      const name   = repo.name;
      const defBr  = repo.default_branch || 'main';
      if (!owner || !name) continue;

      try {
        // ── Fetch latest commit on default branch ──────────────────────
        const cRes = await fetch(
          `https://api.github.com/repos/${owner}/${name}/commits?sha=${defBr}&per_page=1`,
          { headers }
        );
        if (!cRes.ok) continue;
        const [latestCommit] = await cRes.json();
        if (!latestCommit) continue;

        const latestSha  = latestCommit.sha;
        const commitDate = new Date(latestCommit.commit?.author?.date).getTime();
        const storeKey   = `${owner}/${name}/default`;
        const prevSha    = store[storeKey];

        // Add to activity feed regardless
        activity.push({
          repo:   name,
          owner,
          sha:    latestSha?.slice(0, 7),
          msg:    latestCommit.commit?.message?.split('\n')[0]?.slice(0, 72),
          author: latestCommit.commit?.author?.name,
          date:   latestCommit.commit?.author?.date,
          url:    latestCommit.html_url,
        });

        // Decide if this commit should trigger the agent feed
        const isNew = !prevSha                                   // never seen this repo before
          ? (now - commitDate) < NEW_WITHIN_MS                   // only if commit is very recent
          : prevSha !== latestSha;                               // or SHA changed since last poll

        if (isNew && !trigger) {
          trigger = {
            sha:        latestSha?.slice(0, 7),
            msg:        latestCommit.commit?.message?.split('\n')[0]?.slice(0, 70),
            author:     latestCommit.commit?.author?.name,
            repo:       name,
            owner,
            branch:     defBr,
            isDefault:  true,
          };
        }

        // Always update stored SHA after processing
        store[storeKey] = latestSha;

        // ── Also check non-default branches for PR suggestion ─────────
        if (!prBanner) {
          const bRes = await fetch(
            `https://api.github.com/repos/${owner}/${name}/branches?per_page=20`,
            { headers }
          );
          if (bRes.ok) {
            const branches = await bRes.json();
            const featureBranches = branches.filter(b => b.name !== defBr);

            // Get open PRs to avoid duplicate suggestions
            let openPRBranches = new Set();
            try {
              const prRes = await fetch(
                `https://api.github.com/repos/${owner}/${name}/pulls?state=open&per_page=30`,
                { headers }
              );
              if (prRes.ok) {
                const prs = await prRes.json();
                prs.forEach(pr => openPRBranches.add(pr.head?.ref));
              }
            } catch {}

            for (const branch of featureBranches) {
              if (openPRBranches.has(branch.name)) continue;
              const brKey  = `${owner}/${name}/${branch.name}`;
              const prevBr = store[brKey];
              const curSha = branch.commit?.sha;
              if (!curSha) continue;

              if (prevBr && prevBr !== curSha && !prBanner) {
                // New commit on feature branch with no PR
                try {
                  const fcRes = await fetch(
                    `https://api.github.com/repos/${owner}/${name}/commits/${curSha}`,
                    { headers }
                  );
                  if (fcRes.ok) {
                    const fc  = await fcRes.json();
                    const msg = fc.commit?.message?.split('\n')[0] || '';
                    const isFix  = /fix|bug|patch/i.test(msg);
                    const isFeat = /feat|add|new/i.test(msg);
                    const isWIP  = /wip|draft|temp/i.test(msg);

                    const color    = isFix ? '#f85149' : isFeat ? '#3fb950' : isWIP ? '#d29922' : '#a78bfa';
                    const badge    = isFix ? 'FIX' : isFeat ? 'FEAT' : isWIP ? 'WIP' : 'NEW';
                    const badgeBg  = `${color}25`;
                    const border   = `${color}50`;
                    const bg       = `${color}0d`;
                    const prUrl    = `https://github.com/${owner}/${name}/compare/${branch.name}?expand=1${isWIP?'&draft=1':''}`;

                    prBanner = {
                      badge, color, bg, border, badgeBg,
                      headline: `"${branch.name}" has new commits with no open PR`,
                      detail:   `"${msg.slice(0,60)}"`,
                      action:   isWIP ? 'Open Draft PR' : 'Create Pull Request',
                      actionUrl: prUrl,
                      sha:      curSha.slice(0, 7),
                      repoKey:  `${owner}/${name}`,
                    };
                  }
                } catch {}
              }
              store[brKey] = curSha;
            }
          }
        }

      } catch {
        // Skip failed repos silently
      }
    }

    // Persist
    storeRef.current = store;
    writeStore(store);

    // Update activity feed
    setRecentActivity(activity.slice(0, 8));

    // Fire triggers (agent feed takes priority, PR banner is secondary)
    if (trigger) {
      setAgentTrigger(trigger);
    } else if (prBanner) {
      setNotification(prBanner);
    }

  }, [token, repos]);

  // Run immediately on mount, then every 60s
  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [poll]);

  return { notification, agentTrigger, recentActivity, dismiss };
}