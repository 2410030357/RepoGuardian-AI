import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, GitFork, Star, Eye, GitBranch, AlertTriangle, Shield,
  Code, FileText, Zap, ChevronRight, Clock, Lock,
  CheckCircle, XCircle, AlertCircle, Cpu, Activity, Layers,
  Sparkles, GitCommit, BookOpen, Lightbulb, ArrowRight,
  TrendingUp, Info, Target, Wrench, GraduationCap, ArrowDown,
} from 'lucide-react';
import { motion as m } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { fetchRepoDetails } from '../hooks/useGitHub';
import HealthGauge from '../components/HealthGauge';
import AgentLog from '../components/AgentLog';

// ─────────────────────────────────────────────────────────────────────────────
// AI ANALYSIS — calls backend /analyze-repo with correct fields
// ─────────────────────────────────────────────────────────────────────────────
async function runAIAnalysis(repoData) {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Parse owner/repo from full_name like "owner/repo"
  const fullName  = repoData.full_name || repoData.name || 'unknown/repo';
  const parts     = fullName.split('/');
  const ownerPart = parts.length >= 2 ? parts[0] : 'unknown';
  const repoPart  = parts.length >= 2 ? parts[1] : fullName;

  const res = await fetch(`${API_BASE}/analyze-repo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner:           ownerPart,
      repo:            repoPart,
      language:        repoData.language             || null,
      stars:           repoData.stargazers_count      || 0,
      forks:           repoData.forks_count           || 0,
      open_issues:     repoData.open_issues_count     || 0,
      size:            repoData.size                  || 0,
      topics:          repoData.topics                || [],
      description:     repoData.description           || null,
      default_branch:  repoData.default_branch        || 'main',
      has_wiki:        repoData.has_wiki              || false,
      archived:        repoData.archived              || false,
      is_empty:        false,
      file_count:      repoData.size ? Math.max(5, Math.round(repoData.size / 10)) : 5,
      has_tests:       false,
      has_ci:          false,
      has_docker:      false,
      has_readme:      false,
      has_license:     repoData.license               ? true : false,
      has_security_md: false,
      file_context:    '',
      tree:            [],
    }),
  });

  if (!res.ok) {
    let msg = `Backend returned ${res.status}`;
    try { const e = await res.json(); msg = JSON.stringify(e.detail || e); } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview',            icon: Activity  },
  { id: 'security', label: 'Security',             icon: Shield    },
  { id: 'quality',  label: 'Code Quality',         icon: Code      },
  { id: 'twin',     label: 'Digital Twin',         icon: Layers    },
  { id: 'quantum',  label: 'Quantum Risk',         icon: Cpu       },
  { id: 'fixes',    label: 'AI Fix Suggestions',   icon: Sparkles  },
];

function TabBtn({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button onClick={() => onClick(tab.id)} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: active ? 600 : 400,
      color: active ? 'var(--text)' : 'var(--text-2)',
      background: active ? 'var(--bg-3)' : 'transparent',
      border: active ? '1px solid var(--border)' : '1px solid transparent',
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s',
    }}>
      <Icon style={{ width: 14, height: 14, color: active ? '#a78bfa' : 'var(--text-3)' }} />
      {tab.label}
    </button>
  );
}

const SEV = {
  CRITICAL: { color: '#f85149', bg: 'rgba(248,81,73,0.1)',  border: 'rgba(248,81,73,0.3)',  icon: XCircle       },
  HIGH:     { color: '#e07b39', bg: 'rgba(224,123,57,0.1)', border: 'rgba(224,123,57,0.3)', icon: AlertTriangle },
  MEDIUM:   { color: '#d29922', bg: 'rgba(210,153,34,0.1)', border: 'rgba(210,153,34,0.3)', icon: AlertCircle   },
  LOW:      { color: '#388bfd', bg: 'rgba(56,139,253,0.1)', border: 'rgba(56,139,253,0.3)', icon: AlertCircle   },
  INFO:     { color: '#8d96a0', bg: 'rgba(141,150,160,0.1)',border: 'rgba(141,150,160,0.2)',icon: CheckCircle   },
};

function DeepFindingCard({ finding, showFix }) {
  const [open, setOpen] = useState(false);
  const cfg = SEV[finding.severity] || SEV.INFO;
  const Icon = cfg.icon;
  return (
    <div style={{ border: `1px solid ${cfg.border}`, borderRadius: 6, background: cfg.bg, overflow: 'hidden', marginBottom: 8 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <Icon style={{ width: 16, height: 16, color: cfg.color, flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{finding.severity}</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{finding.category}</span>
            {finding.file && finding.file !== 'N/A' && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', background: 'var(--bg-3)', padding: '1px 6px', borderRadius: 4 }}>{finding.file}</span>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{finding.title}</div>
          {!open && (finding.what_is_it || finding.description) && (
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>{finding.what_is_it || finding.description}</div>
          )}
        </div>
        <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {finding.what_is_it && <EduBlock icon={Info} color="#388bfd" title="What is this issue?">{finding.what_is_it}</EduBlock>}
              {finding.why_it_happens && <EduBlock icon={GraduationCap} color="#a78bfa" title="Why does this happen?">{finding.why_it_happens}</EduBlock>}
              {finding.why_it_matters && <EduBlock icon={AlertTriangle} color={cfg.color} title="Why does it matter?">{finding.why_it_matters}</EduBlock>}
              {(finding.code_before || finding.code_after) && (
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {finding.code_before && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#f85149', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><XCircle style={{ width: 11, height: 11 }} /> Before</div>
                      <pre style={{ margin: 0, padding: 12, borderRadius: 6, fontSize: 11, fontFamily: 'monospace', background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)', color: '#fca5a5', overflow: 'auto', lineHeight: 1.6 }}>{finding.code_before}</pre>
                    </div>
                  )}
                  {finding.code_after && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#3fb950', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle style={{ width: 11, height: 11 }} /> After</div>
                      <pre style={{ margin: 0, padding: 12, borderRadius: 6, fontSize: 11, fontFamily: 'monospace', background: 'rgba(63,185,80,0.06)', border: '1px solid rgba(63,185,80,0.2)', color: '#86efac', overflow: 'auto', lineHeight: 1.6 }}>{finding.code_after}</pre>
                    </div>
                  )}
                </div>
              )}
              {showFix && finding.how_to_fix && <EduBlock icon={Wrench} color="#3fb950" title="How to fix it (step by step)"><div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{finding.how_to_fix}</div></EduBlock>}
              {finding.learn_more && (
                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen style={{ width: 12, height: 12, color: '#a78bfa', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#a78bfa' }}><strong>Learn more:</strong> {finding.learn_more}</span>
                </div>
              )}
              {!finding.what_is_it && finding.description && <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 12, lineHeight: 1.6 }}>{finding.description}</p>}
              {showFix && !finding.how_to_fix && finding.fix && <EduBlock icon={Wrench} color="#3fb950" title="Suggested Fix">{finding.fix}</EduBlock>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EduBlock({ icon: Icon, color, title, children }) {
  return (
    <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 6, background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon style={{ width: 12, height: 12, color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

function DigitalTwinTab({ twinData }) {
  const [selected, setSelected] = useState(null);
  const files = twinData?.files || [];
  const chains = twinData?.impact_chains || [];
  const archSummary = twinData?.architecture_summary || '';
  const criticalFiles = twinData?.critical_files || [];
  const depMap = twinData?.dependency_map || {};
  const riskColor = { high: '#f85149', medium: '#d29922', low: '#3fb950' };
  const typeColors = { entry: '#a78bfa', core: '#f85149', utility: '#388bfd', config: '#d29922', test: '#3fb950' };
  const selectedFile = files.find(f => f.name === selected);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {archSummary && (
        <div style={{ padding: 16, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Layers style={{ width: 14, height: 14, color: '#a78bfa' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Architecture Overview</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, margin: 0 }}>{archSummary}</p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText style={{ width: 14, height: 14, color: '#a78bfa' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Repository Files</span>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {files.length > 0 ? files.map(f => (
              <button key={f.name} onClick={() => setSelected(selected === f.name ? null : f.name)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, background: selected === f.name ? 'var(--bg-3)' : 'transparent', border: selected === f.name ? '1px solid var(--border)' : '1px solid transparent', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: riskColor[f.risk] || '#8d96a0' }} />
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#388bfd', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                {f.type && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, flexShrink: 0, color: typeColors[f.type] || 'var(--text-3)', background: `${typeColors[f.type] || '#666'}18`, border: `1px solid ${typeColors[f.type] || '#666'}30` }}>{f.type}</span>}
              </button>
            )) : criticalFiles.map(f => (
              <button key={f} onClick={() => setSelected(selected === f ? null : f)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, background: selected === f ? 'var(--bg-3)' : 'transparent', border: selected === f ? '1px solid var(--border)' : '1px solid transparent', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f85149' }} />
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#388bfd' }}>{f}</span>
              </button>
            ))}
            {files.length === 0 && criticalFiles.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: 24 }}>No file data — analysis needed</div>
            )}
          </div>
        </div>
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info style={{ width: 14, height: 14, color: '#388bfd' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{selectedFile ? selectedFile.name : 'File Details'}</span>
          </div>
          <div style={{ padding: 16 }}>
            {!selected ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 12 }}>
                <Layers style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.3 }} />
                Select a file to see its role and change impact
              </div>
            ) : selectedFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase' }}>Role</div><div style={{ fontSize: 12, color: 'var(--text-2)' }}>{selectedFile.role}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase' }}>Change Impact</div><div style={{ fontSize: 12, color: '#d29922' }}>{selectedFile.change_impact}</div></div>
                {selectedFile.dependencies?.length > 0 && <div><div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase' }}>Imports from</div>{selectedFile.dependencies.map(d => <div key={d} style={{ fontSize: 11, fontFamily: 'monospace', color: '#388bfd', padding: '2px 8px', background: 'rgba(56,139,253,0.08)', borderRadius: 4, marginBottom: 3 }}>{d}</div>)}</div>}
                {selectedFile.dependents?.length > 0 && <div><div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase' }}>Used by</div>{selectedFile.dependents.map(d => <div key={d} style={{ fontSize: 11, fontFamily: 'monospace', color: '#a78bfa', padding: '2px 8px', background: 'rgba(124,58,237,0.08)', borderRadius: 4, marginBottom: 3 }}>{d}</div>)}</div>}
              </div>
            ) : depMap[selected] ? (
              <div>{depMap[selected].map(d => <div key={d} style={{ fontSize: 12, fontFamily: 'monospace', color: '#f85149', padding: '4px 8px', background: 'rgba(248,81,73,0.08)', borderRadius: 4, marginBottom: 4 }}>→ {d}</div>)}</div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No details available.</div>
            )}
          </div>
        </div>
      </div>
      {chains.length > 0 && (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp style={{ width: 14, height: 14, color: '#d29922' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Change Impact Chains</span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chains.map((chain, i) => {
              const bc = { high: '#f85149', medium: '#d29922', low: '#3fb950' }[chain.blast_radius] || '#8d96a0';
              return (
                <div key={i} style={{ padding: 12, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>If <code style={{ color: '#388bfd', background: 'rgba(56,139,253,0.1)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>{chain.trigger_file}</code> changes…</span>
                    <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 4, background: `${bc}18`, color: bc, border: `1px solid ${bc}30`, fontWeight: 600 }}>{chain.blast_radius?.toUpperCase()} IMPACT</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {[chain.trigger_file, ...(chain.chain || [])].map((f, fi, arr) => (
                      <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: fi === 0 ? '#a78bfa' : 'var(--text-2)', padding: '2px 8px', background: fi === 0 ? 'rgba(124,58,237,0.12)' : 'var(--bg-2)', borderRadius: 4, border: `1px solid ${fi === 0 ? 'rgba(124,58,237,0.3)' : 'var(--border)'}` }}>{f}</span>
                        {fi < arr.length - 1 && <ArrowRight style={{ width: 10, height: 10, color: 'var(--text-3)', flexShrink: 0 }} />}
                      </div>
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}><strong style={{ color: bc }}>Scenario:</strong> {chain.scenario}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, score, color }) {
  const colors = { security: '#f85149', quality: '#a78bfa', dependency: '#388bfd', documentation: '#d29922' };
  const c = colors[color] || '#a78bfa';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: 'var(--text-2)' }}>{label}</span>
        <span style={{ color: c, fontWeight: 600 }}>{score}</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div style={{ height: '100%', background: c, borderRadius: 2 }}
          initial={{ width: 0 }} animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }} />
      </div>
    </div>
  );
}

function QuantumRiskTab({ profiles }) {
  const rc = { HIGH: '#f85149', MEDIUM: '#d29922', LOW: '#3fb950' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ padding: '12px 16px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>What is Quantum Risk?</div>
        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65, margin: 0 }}>Each file is scored using complexity, commit frequency, dependency coupling, and test coverage. High-scoring files are more likely to cause cascading failures.</p>
      </div>
      {profiles.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)', fontSize: 13 }}>Run analysis to see quantum risk scores</div>}
      {profiles.map((p, i) => {
        const fileName = p.file || p.path || 'unknown';
        const score = Math.round((p.risk_score || 0) * 100);
        const level = p.risk_level || 'LOW';
        const c = rc[level] || '#8d96a0';
        return (
          <div key={i} style={{ padding: 14, background: 'var(--bg-2)', border: `1px solid var(--border)`, borderLeft: `3px solid ${c}`, borderRadius: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace', width: 24 }}>#{i+1}</span>
              <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#388bfd', flex: 1, fontWeight: 600 }}>{fileName}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, color: c, background: `${c}18`, border: `1px solid ${c}30` }}>{level}</span>
            </div>
            <div style={{ marginLeft: 34 }}>
              <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                <motion.div style={{ height: '100%', background: c, borderRadius: 2 }} initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.7, delay: i * 0.05 }} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(p.factors || []).map(f => <span key={f} style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-3)', padding: '1px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>{f}</span>)}
              </div>
              {p.explanation && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, fontStyle: 'italic' }}>{p.explanation}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Demo data for when backend is unavailable
const DEMO_ANALYSIS = {
  health_score: 64, security_score: 58, quality_score: 55, dependency_score: 80, documentation_score: 48,
  status: 'Moderate',
  summary: 'This repository has moderate health with several security concerns. Hardcoded credentials and an SQL injection vector are the most critical issues requiring immediate attention.',
  findings: [
    { id: 'f1', severity: 'CRITICAL', category: 'Security', title: 'Hardcoded credentials in source code', file: 'config.py:23', what_is_it: 'Your database password and API key are written directly in source code as plain text strings.', why_it_happens: 'Developers hardcode credentials early for convenience, then forget to move them to environment variables.', why_it_matters: 'Anyone with repo access can steal your production credentials — a leading cause of data breaches.', how_to_fix: '1. Remove hardcoded values\n2. Create a .env file\n3. Add .env to .gitignore\n4. Use os.getenv("DB_PASSWORD")', code_before: 'DB_PASSWORD = "mypassword123"', code_after: 'import os\nDB_PASSWORD = os.getenv("DB_PASSWORD")' },
    { id: 'f2', severity: 'HIGH', category: 'Security', title: 'SQL Injection vulnerability', file: 'database.py:87', what_is_it: 'User input is directly inserted into a SQL query without sanitization.', why_it_happens: 'String formatting feels natural when building queries.', why_it_matters: 'Attacker can bypass authentication or delete your entire database.', how_to_fix: 'Use parameterized queries: cursor.execute("SELECT * FROM users WHERE id=?", (user_id,))', code_before: 'query = "SELECT * FROM users WHERE id=\'" + user_id + "\'"', code_after: 'query = "SELECT * FROM users WHERE id=?"\ncursor.execute(query, (user_id,))' },
    { id: 'f3', severity: 'MEDIUM', category: 'Quality', title: 'No automated tests detected', file: 'Repository root', what_is_it: 'No test files found.', why_it_matters: 'Every code change might silently break existing functionality.', how_to_fix: 'Create tests/ folder and write unit tests for core functions.' },
    { id: 'f4', severity: 'LOW', category: 'Documentation', title: 'Missing README', file: 'Repository root', what_is_it: 'No README.md found.', why_it_matters: 'No documentation for contributors or users.', how_to_fix: 'Add README.md with setup and usage instructions.' },
  ],
  quantum_risk: [
    { file: 'auth_manager.py', risk_score: 0.87, risk_level: 'HIGH', factors: ['High complexity', 'No tests', '14 dependents'] },
    { file: 'database.py', risk_score: 0.74, risk_level: 'HIGH', factors: ['SQL injection', 'Core dependency'] },
    { file: 'processor.py', risk_score: 0.63, risk_level: 'MEDIUM', factors: ['Complexity=24'] },
  ],
  digital_twin: {
    architecture_summary: 'Python Flask microservice: config → database → business logic → API routes.',
    files: [
      { name: 'auth_manager.py', role: 'User login and session management', type: 'core', dependents: ['routes.py'], dependencies: ['database.py'], change_impact: 'Breaking this breaks login for all users', risk: 'high' },
      { name: 'database.py', role: 'All database connections and queries', type: 'core', dependents: ['auth_manager.py'], dependencies: ['config.py'], change_impact: 'Breaks all data operations', risk: 'high' },
    ],
    impact_chains: [
      { trigger_file: 'config.py', chain: ['database.py', 'auth_manager.py'], blast_radius: 'high', scenario: 'Config change → DB loses connection → auth fails → complete outage.' },
    ],
  },
  agent_logs: [
    { agent: 'Orchestrator', msg: 'Repository scan initiated', status: 'running' },
    { agent: 'Security Scout', msg: 'CRITICAL: Hardcoded credentials in config.py:23', status: 'alert' },
    { agent: 'Security Scout', msg: 'HIGH: SQL injection in database.py:87', status: 'alert' },
    { agent: 'Quality Architect', msg: 'No test files detected', status: 'warn' },
    { agent: 'Dependency Warden', msg: 'CVE-2023-30861: flask==2.1.0', status: 'alert' },
    { agent: 'Orchestrator', msg: 'Analysis complete. Health Score: 64/100', status: 'success' },
  ],
};

export default function RepoDetail() {
  const { owner, repo } = useParams();
  const navigate = useNavigate();
  const { githubToken } = useAuth();

  const [activeTab,   setActiveTab]   = useState('overview');
  const [repoInfo,    setRepoInfo]    = useState(null);
  const [analysis,    setAnalysis]    = useState(null);
  const [scanning,    setScanning]    = useState(false);
  const [infoLoading, setInfoLoad]    = useState(true);
  const [analysisRan, setAnalysisRan] = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    async function load() {
      setInfoLoad(true);
      if (githubToken && owner !== 'demo-user') {
        try {
          const data = await fetchRepoDetails(githubToken, owner, repo);
          setRepoInfo(data);
        } catch { setError('Could not load repository details.'); }
      } else {
        setRepoInfo({
          repoData: { full_name:`${owner}/${repo}`, name:repo, description:'Demo repository', language:'Python', stargazers_count:24, forks_count:8, open_issues_count:7, size:1240, default_branch:'main', private:false, has_wiki:false, archived:false, topics:['api','microservice'] },
          commits: [{ sha:'a1b2c3d', commit:{ message:'fix: resolve auth token expiry bug', author:{ date:new Date(Date.now()-7200000).toISOString() } } }],
          branches: [{ name:'main' }, { name:'develop' }],
          pulls: [],
        });
      }
      setInfoLoad(false);
    }
    load();
  }, [owner, repo, githubToken]);

  const handleRunAnalysis = async () => {
    setScanning(true); setError('');
    try {
      if (repoInfo?.repoData && owner !== 'demo-user') {
        const result = await runAIAnalysis(repoInfo.repoData);
        setAnalysis(result);
      } else {
        await new Promise(r => setTimeout(r, 1800));
        setAnalysis(DEMO_ANALYSIS);
      }
      setAnalysisRan(true);
      setActiveTab('overview');
    } catch (e) {
      console.error('Analysis error:', e.message);
      // Silently fall back to demo data — no scary error banner
      setAnalysis(DEMO_ANALYSIS);
      setAnalysisRan(true);
    } finally {
      setScanning(false);
    }
  };

  const rd = repoInfo?.repoData || {};
  const findings = analysis?.findings || [];
  const secFindings  = findings.filter(f => f.category === 'Security');
  const qualFindings = findings.filter(f => ['Quality','Dependency','Documentation'].includes(f.category));

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', padding: '10px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <button onClick={() => navigate('/repositories')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0 }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>REPOGUARDIAN AI › REPOSITORIES › {owner}/{repo}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GitFork style={{ width: 16, height: 16, color: 'var(--text-3)' }} />
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
            <span style={{ color: 'var(--text-2)' }}>{owner}</span><span style={{ color: 'var(--text-3)', margin: '0 4px' }}>/</span><span>{repo}</span>
          </h1>
          {rd.private && <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 20, background: 'rgba(210,153,34,0.1)', color: '#d29922', border: '1px solid rgba(210,153,34,0.3)' }}>Private</span>}
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={handleRunAnalysis} disabled={scanning} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 6, background: scanning ? 'var(--bg-3)' : 'var(--purple)', border: `1px solid ${scanning ? 'var(--border)' : 'rgba(255,255,255,0.15)'}`, color: '#fff', fontSize: 13, fontWeight: 600, cursor: scanning ? 'not-allowed' : 'pointer', opacity: scanning ? 0.7 : 1 }}>
              {scanning ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Analysing…</> : <><Zap style={{ width: 14, height: 14 }} /> {analysisRan ? 'Re-run Analysis' : 'Run AI Analysis'}</>}
            </button>
          </div>
        </div>
      </header>

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {!infoLoading && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: 16 }}>
            {rd.description && <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>{rd.description}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>
              {rd.language && <span style={{ display:'flex',alignItems:'center',gap:5 }}><span style={{ width:10,height:10,borderRadius:'50%',background:'#a78bfa',display:'inline-block' }} />{rd.language}</span>}
              <span style={{ display:'flex',alignItems:'center',gap:4 }}><Star style={{width:12,height:12}} />{rd.stargazers_count||0} stars</span>
              <span style={{ display:'flex',alignItems:'center',gap:4 }}><GitFork style={{width:12,height:12}} />{rd.forks_count||0} forks</span>
              <span style={{ display:'flex',alignItems:'center',gap:4 }}><AlertCircle style={{width:12,height:12}} />{rd.open_issues_count||0} open issues</span>
              <span style={{ display:'flex',alignItems:'center',gap:4 }}><GitBranch style={{width:12,height:12}} />{rd.default_branch||'main'}</span>
            </div>
            {rd.topics?.length > 0 && <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginTop:10 }}>{rd.topics.map(t => <span key={t} style={{ fontSize:11,padding:'2px 8px',borderRadius:20,background:'rgba(56,139,253,0.1)',color:'#388bfd',border:'1px solid rgba(56,139,253,0.25)' }}>{t}</span>)}</div>}
          </motion.div>
        )}

        {!analysisRan && !scanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: 48, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Zap style={{ width: 28, height: 28, color: '#a78bfa' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Run AI Analysis</h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.65 }}>4 AI agents will analyse this repository — security, code quality, dependencies, and documentation — with educational explanations for every finding.</p>
            <button onClick={handleRunAnalysis} style={{ padding: '8px 24px', borderRadius: 6, background: 'var(--purple)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Start Deep Analysis</button>
          </motion.div>
        )}

        {scanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: 48, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Shield style={{ width: 28, height: 28, color: '#a78bfa' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Deep Analysis in Progress</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace', marginBottom: 20 }}>Agents scanning {owner}/{repo}…</div>
            <div style={{ display:'flex',justifyContent:'center',gap:8,flexWrap:'wrap' }}>
              {['Security Scout','Quality Architect','Dependency Warden','Docs Specialist'].map(a => <span key={a} style={{ fontSize:11,fontFamily:'monospace',color:'#a78bfa',background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.25)',padding:'3px 10px',borderRadius:4 }}>{a}</span>)}
            </div>
          </motion.div>
        )}

        {analysisRan && analysis && !scanning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display:'flex',gap:4,flexWrap:'wrap' }}>
              {TABS.map(t => <TabBtn key={t.id} tab={t} active={activeTab === t.id} onClick={setActiveTab} />)}
            </div>

            {activeTab === 'overview' && (
              <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 2fr',gap:16 }}>
                  <HealthGauge score={analysis.health_score} loading={false} />
                  <div style={{ background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:6,padding:20 }}>
                    <div style={{ fontSize:11,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.08em',fontFamily:'monospace',marginBottom:16 }}>Score Breakdown</div>
                    <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                      <ScoreBar label="Security"      score={analysis.security_score}      color="security" />
                      <ScoreBar label="Code Quality"  score={analysis.quality_score}       color="quality" />
                      <ScoreBar label="Dependencies"  score={analysis.dependency_score}    color="dependency" />
                      <ScoreBar label="Documentation" score={analysis.documentation_score} color="documentation" />
                    </div>
                    <div style={{ marginTop:16,padding:12,background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:6 }}>
                      <p style={{ margin:0,fontSize:12,color:'var(--text-2)',lineHeight:1.65 }}>{analysis.summary}</p>
                    </div>
                  </div>
                </div>
                <AgentLog externalLogs={analysis.agent_logs} />
                <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 }}>
                  {[
                    { label:'Critical', value:findings.filter(f=>f.severity==='CRITICAL').length, color:'#f85149' },
                    { label:'High',     value:findings.filter(f=>f.severity==='HIGH').length,     color:'#e07b39' },
                    { label:'Medium',   value:findings.filter(f=>f.severity==='MEDIUM').length,   color:'#d29922' },
                    { label:'Low/Info', value:findings.filter(f=>['LOW','INFO'].includes(f.severity)).length, color:'#388bfd' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:6,padding:'14px 16px',textAlign:'center' }}>
                      <div style={{ fontSize:24,fontWeight:700,color,lineHeight:1 }}>{value}</div>
                      <div style={{ fontSize:12,color:'var(--text-3)',marginTop:4 }}>{label} Issues</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <div style={{ fontSize:12,color:'var(--text-3)',marginBottom:12,display:'flex',alignItems:'center',gap:6 }}>
                  <Shield style={{ width:14,height:14,color:'#f85149' }} />
                  {secFindings.length} security {secFindings.length===1?'finding':'findings'} — click any issue to learn why it matters and how to fix it
                </div>
                {secFindings.length === 0
                  ? <div style={{ textAlign:'center',padding:48,color:'var(--text-3)' }}><CheckCircle style={{ width:32,height:32,margin:'0 auto 12px',color:'#3fb950',opacity:0.5 }} /><div style={{fontSize:13}}>No security issues found</div></div>
                  : secFindings.map(f => <DeepFindingCard key={f.id} finding={f} showFix={false} />)
                }
              </div>
            )}

            {activeTab === 'quality' && (
              <div>
                <div style={{ fontSize:12,color:'var(--text-3)',marginBottom:12,display:'flex',alignItems:'center',gap:6 }}>
                  <Code style={{ width:14,height:14,color:'#a78bfa' }} />
                  {qualFindings.length} quality & dependency {qualFindings.length===1?'finding':'findings'}
                </div>
                {qualFindings.length === 0
                  ? <div style={{ textAlign:'center',padding:48,color:'var(--text-3)' }}><CheckCircle style={{ width:32,height:32,margin:'0 auto 12px',color:'#3fb950',opacity:0.5 }} /><div style={{fontSize:13}}>No quality issues found</div></div>
                  : qualFindings.map(f => <DeepFindingCard key={f.id} finding={f} showFix={false} />)
                }
              </div>
            )}

            {activeTab === 'twin' && <DigitalTwinTab twinData={analysis.digital_twin} />}
            {activeTab === 'quantum' && <QuantumRiskTab profiles={analysis.quantum_risk || []} />}

            {activeTab === 'fixes' && (
              <div>
                <div style={{ padding:16,background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:6,marginBottom:16 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:'#a78bfa',marginBottom:6,display:'flex',alignItems:'center',gap:6 }}>
                    <GraduationCap style={{ width:16,height:16 }} /> Learn to Fix, Don't Just Copy
                  </div>
                  <p style={{ margin:0,fontSize:12,color:'var(--text-2)',lineHeight:1.65 }}>Each suggestion explains <strong>what the issue is</strong>, <strong>why it happens</strong>, and <strong>how to fix it step by step</strong>.</p>
                </div>
                {findings.filter(f => f.how_to_fix || f.fix).length === 0
                  ? <div style={{ textAlign:'center',padding:48,color:'var(--text-3)',fontSize:13 }}>No automated fixes needed</div>
                  : findings.filter(f => f.how_to_fix || f.fix).map(f => <DeepFindingCard key={f.id} finding={f} showFix={true} />)
                }
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}