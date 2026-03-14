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
// AI ANALYSIS — upgraded prompt asking for deep educational content
// ─────────────────────────────────────────────────────────────────────────────
async function runAIAnalysis(repoData) {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const res = await fetch(`${API_BASE}/analyze-repo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo_name:      repoData.full_name || repoData.name,
      language:       repoData.language || 'Unknown',
      stars:          repoData.stargazers_count || 0,
      open_issues:    repoData.open_issues_count || 0,
      size:           repoData.size || 0,
      topics:         repoData.topics || [],
      description:    repoData.description || '',
      default_branch: repoData.default_branch || 'main',
      has_wiki:       repoData.has_wiki || false,
      archived:       repoData.archived || false,
    }),
  });
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
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

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const SEV = {
  CRITICAL: { color: '#f85149', bg: 'rgba(248,81,73,0.1)',  border: 'rgba(248,81,73,0.3)',  icon: XCircle       },
  HIGH:     { color: '#e07b39', bg: 'rgba(224,123,57,0.1)', border: 'rgba(224,123,57,0.3)', icon: AlertTriangle },
  MEDIUM:   { color: '#d29922', bg: 'rgba(210,153,34,0.1)', border: 'rgba(210,153,34,0.3)', icon: AlertCircle   },
  LOW:      { color: '#388bfd', bg: 'rgba(56,139,253,0.1)', border: 'rgba(56,139,253,0.3)', icon: AlertCircle   },
  INFO:     { color: '#8d96a0', bg: 'rgba(141,150,160,0.1)',border: 'rgba(141,150,160,0.2)',icon: CheckCircle   },
};

// ─────────────────────────────────────────────────────────────────────────────
// DEEP FINDING CARD (educational)
// ─────────────────────────────────────────────────────────────────────────────
function DeepFindingCard({ finding, showFix }) {
  const [open, setOpen] = useState(false);
  const cfg = SEV[finding.severity] || SEV.INFO;
  const Icon = cfg.icon;

  return (
    <div style={{ border: `1px solid ${cfg.border}`, borderRadius: 6, background: cfg.bg, overflow: 'hidden', marginBottom: 8 }}>
      {/* Header — always visible */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16,
        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <Icon style={{ width: 16, height: 16, color: cfg.color, flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            }}>{finding.severity}</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{finding.category}</span>
            {finding.file && finding.file !== 'N/A' && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', background: 'var(--bg-3)', padding: '1px 6px', borderRadius: 4 }}>
                {finding.file}
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{finding.title}</div>
          {/* Preview of what_is_it when collapsed */}
          {!open && finding.what_is_it && (
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>{finding.what_is_it}</div>
          )}
        </div>
        <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {/* Expanded educational content */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

              {/* What is it */}
              {finding.what_is_it && (
                <EduBlock icon={Info} color="#388bfd" title="What is this issue?">
                  {finding.what_is_it}
                </EduBlock>
              )}

              {/* Why it happens */}
              {finding.why_it_happens && (
                <EduBlock icon={GraduationCap} color="#a78bfa" title="Why does this happen?">
                  {finding.why_it_happens}
                </EduBlock>
              )}

              {/* Why it matters */}
              {finding.why_it_matters && (
                <EduBlock icon={AlertTriangle} color={cfg.color} title="Why does it matter?">
                  {finding.why_it_matters}
                </EduBlock>
              )}

              {/* Bad code → good code */}
              {(finding.code_before || finding.code_after) && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {finding.code_before && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#f85149', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <XCircle style={{ width: 11, height: 11 }} /> Before (problematic)
                        </div>
                        <pre style={{
                          margin: 0, padding: 12, borderRadius: 6, fontSize: 11,
                          fontFamily: 'monospace', background: 'rgba(248,81,73,0.06)',
                          border: '1px solid rgba(248,81,73,0.2)', color: '#fca5a5',
                          overflow: 'auto', lineHeight: 1.6,
                        }}>{finding.code_before}</pre>
                      </div>
                    )}
                    {finding.code_after && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#3fb950', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle style={{ width: 11, height: 11 }} /> After (fixed)
                        </div>
                        <pre style={{
                          margin: 0, padding: 12, borderRadius: 6, fontSize: 11,
                          fontFamily: 'monospace', background: 'rgba(63,185,80,0.06)',
                          border: '1px solid rgba(63,185,80,0.2)', color: '#86efac',
                          overflow: 'auto', lineHeight: 1.6,
                        }}>{finding.code_after}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* How to fix */}
              {showFix && finding.how_to_fix && (
                <EduBlock icon={Wrench} color="#3fb950" title="How to fix it (step by step)">
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{finding.how_to_fix}</div>
                </EduBlock>
              )}

              {/* Learn more */}
              {finding.learn_more && (
                <div style={{
                  marginTop: 12, padding: '8px 12px', borderRadius: 6,
                  background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <BookOpen style={{ width: 12, height: 12, color: '#a78bfa', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#a78bfa' }}><strong>Learn more:</strong> {finding.learn_more}</span>
                </div>
              )}

              {/* Fallback for old format */}
              {!finding.what_is_it && finding.description && (
                <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 12, lineHeight: 1.6 }}>{finding.description}</p>
              )}
              {showFix && !finding.how_to_fix && finding.fix && (
                <EduBlock icon={Wrench} color="#3fb950" title="Suggested Fix">
                  {finding.fix}
                </EduBlock>
              )}
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

// ─────────────────────────────────────────────────────────────────────────────
// DIGITAL TWIN — educational dependency map
// ─────────────────────────────────────────────────────────────────────────────
function DigitalTwinTab({ twinData }) {
  const [selected, setSelected] = useState(null);

  const files     = twinData?.files       || [];
  const chains    = twinData?.impact_chains || [];
  const archSummary = twinData?.architecture_summary || '';

  // Fallback for old format
  const criticalFiles = twinData?.critical_files || [];
  const depMap        = twinData?.dependency_map  || {};

  const riskColor = { high: '#f85149', medium: '#d29922', low: '#3fb950' };
  const typeColors = { entry: '#a78bfa', core: '#f85149', utility: '#388bfd', config: '#d29922', test: '#3fb950' };

  const selectedFile = files.find(f => f.name === selected);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Architecture summary */}
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

        {/* File map */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText style={{ width: 14, height: 14, color: '#a78bfa' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Repository Files</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>Click to inspect</span>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {files.length > 0 ? files.map(f => (
              <button key={f.name} onClick={() => setSelected(selected === f.name ? null : f.name)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6,
                background: selected === f.name ? 'var(--bg-3)' : 'transparent',
                border: selected === f.name ? '1px solid var(--border)' : '1px solid transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: riskColor[f.risk] || '#8d96a0',
                }} />
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#388bfd', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                {f.type && (
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                    color: typeColors[f.type] || 'var(--text-3)',
                    background: `${typeColors[f.type]}18` || 'var(--bg-3)',
                    border: `1px solid ${typeColors[f.type]}30` || 'var(--border)',
                  }}>{f.type}</span>
                )}
              </button>
            )) : criticalFiles.map(f => (
              <button key={f} onClick={() => setSelected(selected === f ? null : f)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6,
                background: selected === f ? 'var(--bg-3)' : 'transparent',
                border: selected === f ? '1px solid var(--border)' : '1px solid transparent',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f85149' }} />
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#388bfd' }}>{f}</span>
              </button>
            ))}
          </div>
        </div>

        {/* File detail */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info style={{ width: 14, height: 14, color: '#388bfd' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {selectedFile ? selectedFile.name : 'File Details'}
            </span>
          </div>
          <div style={{ padding: 16 }}>
            {!selected ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 12 }}>
                <Layers style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.3 }} />
                Select a file to see its role, dependencies, and change impact
              </div>
            ) : selectedFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <InfoRow label="Role" value={selectedFile.role} />
                <InfoRow label="Change Impact" value={selectedFile.change_impact} highlight />
                {selectedFile.dependencies?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase' }}>Imports from</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {selectedFile.dependencies.map(d => (
                        <div key={d} style={{ fontSize: 11, fontFamily: 'monospace', color: '#388bfd', padding: '2px 8px', background: 'rgba(56,139,253,0.08)', borderRadius: 4 }}>{d}</div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedFile.dependents?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase' }}>Used by</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {selectedFile.dependents.map(d => (
                        <div key={d} style={{ fontSize: 11, fontFamily: 'monospace', color: '#a78bfa', padding: '2px 8px', background: 'rgba(124,58,237,0.08)', borderRadius: 4 }}>{d}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : depMap[selected] ? (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>Affects these files:</div>
                {depMap[selected].map(d => (
                  <div key={d} style={{ fontSize: 12, fontFamily: 'monospace', color: '#f85149', padding: '4px 8px', background: 'rgba(248,81,73,0.08)', borderRadius: 4, marginBottom: 4 }}>→ {d}</div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No details available for this file.</div>
            )}
          </div>
        </div>
      </div>

      {/* Impact chains */}
      {chains.length > 0 && (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp style={{ width: 14, height: 14, color: '#d29922' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Change Impact Chains</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>What breaks if you change a file</span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chains.map((chain, i) => (
              <ImpactChain key={i} chain={chain} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ImpactChain({ chain }) {
  const blastColor = { high: '#f85149', medium: '#d29922', low: '#3fb950' };
  const bc = blastColor[chain.blast_radius] || '#8d96a0';
  return (
    <div style={{ padding: 12, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
          If <code style={{ color: '#388bfd', background: 'rgba(56,139,253,0.1)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>{chain.trigger_file}</code> changes…
        </span>
        <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 4, background: `${bc}18`, color: bc, border: `1px solid ${bc}30`, fontWeight: 600 }}>
          {chain.blast_radius?.toUpperCase()} IMPACT
        </span>
      </div>
      {/* Chain visualization */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {[chain.trigger_file, ...(chain.chain || [])].map((f, i, arr) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: i === 0 ? '#a78bfa' : 'var(--text-2)', padding: '2px 8px', background: i === 0 ? 'rgba(124,58,237,0.12)' : 'var(--bg-2)', borderRadius: 4, border: `1px solid ${i === 0 ? 'rgba(124,58,237,0.3)' : 'var(--border)'}` }}>
              {f}
            </span>
            {i < arr.length - 1 && <ArrowRight style={{ width: 10, height: 10, color: 'var(--text-3)', flexShrink: 0 }} />}
          </div>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
        <strong style={{ color: bc }}>Scenario:</strong> {chain.scenario}
      </p>
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 12, color: highlight ? '#d29922' : 'var(--text-2)', lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE BAR
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// QUANTUM RISK TAB
// ─────────────────────────────────────────────────────────────────────────────
function QuantumRiskTab({ profiles }) {
  const rc = { HIGH: '#f85149', MEDIUM: '#d29922', LOW: '#3fb950' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ padding: '12px 16px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>What is Quantum Risk?</div>
        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65, margin: 0 }}>
          Each file is scored using a weighted combination of complexity, commit frequency, dependency coupling, and test coverage. Files with high scores are statistically more likely to contain bugs or cause cascading failures when changed.
        </p>
      </div>
      {profiles.map((p, i) => {
        const fileName = p.file || p.path || 'unknown';
        const score    = Math.round((p.risk_score || 0) * 100);
        const level    = p.risk_level || 'LOW';
        const c        = rc[level] || '#8d96a0';
        return (
          <div key={i} style={{ padding: 14, background: 'var(--bg-2)', border: `1px solid var(--border)`, borderLeft: `3px solid ${c}`, borderRadius: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace', width: 24 }}>#{i+1}</span>
              <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#388bfd', flex: 1, fontWeight: 600 }}>{fileName}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, color: c, background: `${c}18`, border: `1px solid ${c}30` }}>{level}</span>
            </div>
            <div style={{ marginLeft: 34 }}>
              <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                <motion.div style={{ height: '100%', background: c, borderRadius: 2 }}
                  initial={{ width: 0 }} animate={{ width: `${score}%` }}
                  transition={{ duration: 0.7, delay: i * 0.05 }} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: p.explanation ? 8 : 0 }}>
                {(p.factors || []).map(f => (
                  <span key={f} style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-3)', padding: '1px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>{f}</span>
                ))}
              </div>
              {p.explanation && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, fontStyle: 'italic' }}>{p.explanation}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_ANALYSIS = {
  health_score: 64, security_score: 58, quality_score: 55, dependency_score: 80, documentation_score: 48,
  status: 'Moderate',
  summary: 'This repository has moderate health with several security concerns. Hardcoded credentials and an SQL injection vector are the most critical issues requiring immediate attention.',
  findings: [
    {
      id: 'f1', severity: 'CRITICAL', category: 'Security', title: 'Hardcoded credentials in source code',
      file: 'config.py:23',
      what_is_it: 'Your database password and API key are written directly in the source code as plain text strings, visible to anyone who can read the file.',
      why_it_happens: 'Developers often hardcode credentials early in development for convenience, then forget to move them to environment variables before pushing to version control.',
      why_it_matters: 'Anyone with read access to your repository — including GitHub search bots — can steal your production database credentials. This is one of the most common causes of data breaches.',
      how_to_fix: '1. Remove the hardcoded values immediately from config.py\n2. Create a .env file in your project root\n3. Add .env to your .gitignore file\n4. Use os.getenv("DB_PASSWORD") to read them\n5. Rotate the compromised credentials immediately',
      learn_more: 'Study OWASP Top 10 A02:2021 — Cryptographic Failures and the Twelve-Factor App methodology for config management',
      code_before: '# config.py\nDB_PASSWORD = "mypassword123"\nAPI_KEY = "sk-prod-abc123xyz"',
      code_after: '# config.py\nimport os\nDB_PASSWORD = os.getenv("DB_PASSWORD")\nAPI_KEY = os.getenv("API_KEY")\nif not DB_PASSWORD:\n    raise ValueError("DB_PASSWORD not set")',
    },
    {
      id: 'f2', severity: 'HIGH', category: 'Security', title: 'SQL Injection vulnerability',
      file: 'database.py:87',
      what_is_it: 'User-provided input is being directly inserted into a SQL query string using string formatting or concatenation, without any sanitization.',
      why_it_happens: 'String formatting feels natural when building queries, especially for beginners. Many tutorials still show this pattern without warning about its dangers.',
      why_it_matters: 'An attacker can input specially crafted strings like `\' OR \'1\'=\'1` to bypass authentication, extract all database records, or even delete your entire database.',
      how_to_fix: '1. Never concatenate user input directly into SQL strings\n2. Use parameterized queries (also called prepared statements)\n3. Pass user values as a separate tuple, not as part of the string\n4. Consider using an ORM like SQLAlchemy for an extra safety layer',
      learn_more: 'Study OWASP Top 10 A03:2021 — Injection and read about parameterized queries in Python\'s DB-API 2.0 specification',
      code_before: '# Dangerous — never do this\nquery = "SELECT * FROM users WHERE username = \'" + username + "\'"\ncursor.execute(query)',
      code_after: '# Safe — parameterized query\nquery = "SELECT * FROM users WHERE username = ?"\ncursor.execute(query, (username,))',
    },
    {
      id: 'f3', severity: 'HIGH', category: 'Quality', title: 'Function too complex — cyclomatic complexity 24',
      file: 'processor.py:142',
      what_is_it: 'The process_data() function has 24 independent paths through it (branches, loops, conditions). This is called cyclomatic complexity, and anything above 10 is considered hard to maintain.',
      why_it_happens: 'Functions grow organically as new requirements are added. Each new if/else or loop adds complexity without anyone realizing the function has become a monolith.',
      why_it_matters: 'High complexity means bugs hide easily, tests are hard to write (you need 24 test cases to fully cover it), and new developers take much longer to understand the code.',
      how_to_fix: '1. Identify natural "chunks" in the function — groups of lines that do one thing\n2. Extract each chunk into its own named helper function\n3. Each helper should be 5-15 lines and do ONE thing\n4. Use the Single Responsibility Principle as a guide',
      learn_more: 'Read about Cyclomatic Complexity by Thomas McCabe and the Single Responsibility Principle (SRP) from SOLID design principles',
      code_before: 'def process_data(data):\n    # 95 lines with nested ifs...\n    if data.type == "A":\n        if data.value > 100:\n            # ... 20 more lines',
      code_after: 'def process_data(data):\n    validated = validate_input(data)\n    transformed = transform_by_type(validated)\n    return enrich_with_metadata(transformed)\n\ndef validate_input(data): ...\ndef transform_by_type(data): ...',
    },
    {
      id: 'f4', severity: 'MEDIUM', category: 'Dependency', title: 'Flask 2.1.0 has known CVE-2023-30861',
      file: 'requirements.txt',
      what_is_it: 'You are using Flask version 2.1.0, which has a documented security vulnerability (CVE-2023-30861) related to session cookie handling.',
      why_it_happens: 'Dependencies are pinned to specific versions for stability, but this means security patches in newer versions are not automatically applied.',
      why_it_matters: 'CVE-2023-30861 has a CVSS score of 7.5 (HIGH). It allows attackers to potentially forge session cookies, leading to authentication bypass.',
      how_to_fix: '1. Open requirements.txt\n2. Change flask==2.1.0 to flask>=2.3.3\n3. Run: pip install -r requirements.txt\n4. Test your application to ensure nothing broke\n5. Commit and deploy the updated requirements',
      learn_more: 'Use pip-audit or safety to automatically scan for vulnerable dependencies. Set up Dependabot on GitHub for automatic security PRs',
      code_before: '# requirements.txt\nflask==2.1.0\nWerkzeug==2.0.3',
      code_after: '# requirements.txt\nflask>=2.3.3\nWerkzeug>=2.3.7',
    },
    {
      id: 'f5', severity: 'MEDIUM', category: 'Documentation', title: 'Public functions missing docstrings',
      file: 'Multiple files',
      what_is_it: '67% of your public functions have no docstrings explaining what they do, what arguments they accept, or what they return.',
      why_it_happens: 'Documentation is often treated as optional or "will do later," but "later" rarely comes when under development pressure.',
      why_it_matters: 'Without docstrings, new team members spend hours reverse-engineering what functions do. IDE autocomplete shows no hints. Tools like Sphinx cannot generate API docs.',
      how_to_fix: '1. Add a docstring to every public function before merging PRs\n2. Use Google or NumPy docstring format for consistency\n3. Document: what it does, args (name, type, description), returns, raises\n4. Run pydocstyle or pylint --disable=all --enable=C0114,C0115,C0116',
      learn_more: 'Read PEP 257 — Docstring Conventions and PEP 484 — Type Hints for modern Python documentation practices',
      code_before: 'def calculate_risk(file_data, threshold):\n    result = file_data["complexity"] * 0.4\n    return result > threshold',
      code_after: 'def calculate_risk(file_data: dict, threshold: float) -> bool:\n    """Calculate whether a file exceeds the risk threshold.\n\n    Args:\n        file_data: Dict with complexity and churn metrics.\n        threshold: Risk score cutoff (0.0-1.0).\n\n    Returns:\n        True if file risk exceeds threshold.\n    """\n    result = file_data["complexity"] * 0.4\n    return result > threshold',
    },
  ],
  quantum_risk: [
    { file: 'auth_manager.py', risk_score: 0.87, risk_level: 'HIGH', factors: ['High complexity', '14 dependents', 'Frequent commits', 'No tests'], explanation: 'Central authentication file with no tests, touched frequently, and depended on by 14 other modules — any bug here breaks login for all users.' },
    { file: 'database.py',     risk_score: 0.74, risk_level: 'HIGH', factors: ['SQL injection vectors', 'Core dependency', '847 lines'], explanation: 'Large file with security vulnerabilities that forms the data layer — errors here can expose or corrupt all user data.' },
    { file: 'processor.py',    risk_score: 0.63, risk_level: 'MEDIUM', factors: ['Complexity=24', '5 dependencies', 'Poor docs'], explanation: 'Overly complex function chains make this file fragile — small changes often cause unexpected side effects downstream.' },
    { file: 'routes.py',       risk_score: 0.51, risk_level: 'MEDIUM', factors: ['All API endpoints', 'Input validation gaps'], explanation: 'Handles all HTTP endpoints with insufficient input validation, making it the primary attack surface.' },
    { file: 'config.py',       risk_score: 0.38, risk_level: 'LOW',  factors: ['Hardcoded values', 'Shared across modules'], explanation: 'Contains hardcoded credentials that all other modules read — a security risk but low structural complexity.' },
  ],
  digital_twin: {
    architecture_summary: 'This is a Python Flask microservice with a clear layered structure: config → database → business logic → API routes. The authentication manager sits at the center and is the highest-risk single point of failure.',
    files: [
      { name: 'auth_manager.py', role: 'Handles all user login, logout, and session management', type: 'core', dependents: ['routes.py', 'middleware.py', 'user_service.py'], dependencies: ['database.py', 'config.py'], change_impact: 'Changing this file can break login for all users and invalidate active sessions', risk: 'high' },
      { name: 'database.py', role: 'Provides all database connection and query functions', type: 'core', dependents: ['auth_manager.py', 'user_service.py', 'processor.py'], dependencies: ['config.py'], change_impact: 'All data operations depend on this — breaking it takes down the entire application', risk: 'high' },
      { name: 'config.py', role: 'Stores application configuration including credentials', type: 'config', dependents: ['database.py', 'auth_manager.py', 'All modules'], dependencies: [], change_impact: 'Read by every module — wrong config crashes the entire app at startup', risk: 'medium' },
      { name: 'routes.py', role: 'Defines all HTTP API endpoints and request handlers', type: 'entry', dependents: [], dependencies: ['auth_manager.py', 'processor.py', 'user_service.py'], change_impact: 'Direct impact on API behavior — changes affect all API consumers', risk: 'medium' },
      { name: 'processor.py', role: 'Core business logic for data processing and transformation', type: 'core', dependents: ['routes.py', 'worker.py'], dependencies: ['database.py', 'utils.py'], change_impact: 'Complex logic — changes often introduce subtle bugs that only appear in edge cases', risk: 'medium' },
    ],
    impact_chains: [
      { trigger_file: 'config.py', chain: ['database.py', 'auth_manager.py', 'routes.py'], blast_radius: 'high', scenario: 'If config.py changes (e.g., DB host changes), database.py loses its connection, auth_manager.py cannot verify users, and all API routes return 500 errors — complete outage.' },
      { trigger_file: 'auth_manager.py', chain: ['routes.py', 'middleware.py', 'user_service.py'], blast_radius: 'high', scenario: 'If auth_manager.py changes token validation logic, all protected routes reject valid tokens, users get logged out, and new logins may fail silently.' },
      { trigger_file: 'database.py', chain: ['processor.py', 'user_service.py', 'auth_manager.py'], blast_radius: 'high', scenario: 'Schema changes in database.py propagate to all query functions — processor.py may return wrong data, user_service.py may fail to create records.' },
    ],
  },
  agent_logs: [
    { agent: 'Orchestrator', msg: 'Repository scan initiated — building file manifest', status: 'running' },
    { agent: 'Security Scout', msg: 'Starting SAST scan across source files', status: 'running' },
    { agent: 'Security Scout', msg: 'CRITICAL: Hardcoded credentials in config.py:23', status: 'alert' },
    { agent: 'Security Scout', msg: 'HIGH: SQL injection vector in database.py:87', status: 'alert' },
    { agent: 'Quality Architect', msg: 'Calculating cyclomatic complexity...', status: 'running' },
    { agent: 'Quality Architect', msg: 'processor.py complexity=24 exceeds threshold', status: 'warn' },
    { agent: 'Dependency Warden', msg: 'Resolving dependencies against NVD CVE database', status: 'running' },
    { agent: 'Dependency Warden', msg: 'CVE-2023-30861 matched: flask==2.1.0 (CVSS 7.5)', status: 'alert' },
    { agent: 'Docs Specialist', msg: 'Docstring coverage: 33% — below 80% threshold', status: 'warn' },
    { agent: 'AI Fix Agent', msg: 'Generating educational fix explanations...', status: 'running' },
    { agent: 'AI Fix Agent', msg: 'Fix explanations generated for 5 issues', status: 'success' },
    { agent: 'Orchestrator', msg: 'Analysis complete. Health Score: 64/100', status: 'success' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff/86400)}d ago`;
  return `${Math.floor(diff/2592000)}mo ago`;
}

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
          repoData: { full_name:`${owner}/${repo}`, name:repo, description:'Demo repository', language:'Python', stargazers_count:24, forks_count:8, open_issues_count:7, size:1240, default_branch:'main', private:false, has_wiki:false, has_pages:false, archived:false, topics:['api','microservice'] },
          commits:  [{ sha:'a1b2c3d', commit:{ message:'fix: resolve auth token expiry bug', author:{ name:'Dev', date:new Date(Date.now()-7200000).toISOString() } } }],
          branches: [{ name:'main' }, { name:'develop' }],
          pulls:    [],
          contributors: [{ login:'dev', contributions:142 }],
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
        await new Promise(r => setTimeout(r, 2000));
        setAnalysis(DEMO_ANALYSIS);
      }
      setAnalysisRan(true);
      setActiveTab('overview');
    } catch {
      setError('AI analysis failed. Showing demo data.');
      setAnalysis(DEMO_ANALYSIS);
      setAnalysisRan(true);
    } finally {
      setScanning(false);
    }
  };

  const rd       = repoInfo?.repoData || {};
  const findings = analysis?.findings || [];
  const secFindings  = findings.filter(f => f.category === 'Security');
  const qualFindings = findings.filter(f => f.category === 'Quality' || f.category === 'Dependency' || f.category === 'Documentation');

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg-2)', borderBottom: '1px solid var(--border)',
        padding: '10px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <button onClick={() => navigate('/repositories')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0 }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
            REPOGUARDIAN AI › REPOSITORIES › {owner}/{repo}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GitFork style={{ width: 16, height: 16, color: 'var(--text-3)' }} />
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
            <span style={{ color: 'var(--text-2)' }}>{owner}</span>
            <span style={{ color: 'var(--text-3)', margin: '0 4px' }}>/</span>
            <span style={{ color: 'var(--text)' }}>{repo}</span>
          </h1>
          {rd.private && <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 20, background: 'rgba(210,153,34,0.1)', color: '#d29922', border: '1px solid rgba(210,153,34,0.3)' }}>Private</span>}
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={handleRunAnalysis} disabled={scanning} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 6,
              background: scanning ? 'var(--bg-3)' : 'var(--purple)',
              border: `1px solid ${scanning ? 'var(--border)' : 'rgba(255,255,255,0.15)'}`,
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: scanning ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s', opacity: scanning ? 0.7 : 1,
            }}>
              {scanning
                ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Analysing…</>
                : <><Zap style={{ width: 14, height: 14 }} /> {analysisRan ? 'Re-run Analysis' : 'Run AI Analysis'}</>}
            </button>
          </div>
        </div>
      </header>

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(210,153,34,0.08)', border: '1px solid rgba(210,153,34,0.3)', color: '#d29922', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle style={{ width: 14, height: 14 }} />{error}
          </div>
        )}

        {/* Repo meta */}
        {!infoLoading && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: 16 }}>
            {rd.description && <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>{rd.description}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>
              {rd.language && <span style={{ display:'flex',alignItems:'center',gap:5 }}><span style={{ width:10,height:10,borderRadius:'50%',background:'#3776ab',display:'inline-block' }} />{rd.language}</span>}
              <span style={{ display:'flex',alignItems:'center',gap:4 }}><Star style={{width:12,height:12}} />{rd.stargazers_count} stars</span>
              <span style={{ display:'flex',alignItems:'center',gap:4 }}><GitFork style={{width:12,height:12}} />{rd.forks_count} forks</span>
              <span style={{ display:'flex',alignItems:'center',gap:4 }}><AlertCircle style={{width:12,height:12}} />{rd.open_issues_count} open issues</span>
              <span style={{ display:'flex',alignItems:'center',gap:4 }}><GitBranch style={{width:12,height:12}} />{rd.default_branch}</span>
            </div>
            {rd.topics?.length > 0 && (
              <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginTop:10 }}>
                {rd.topics.map(t => <span key={t} style={{ fontSize:11,padding:'2px 8px',borderRadius:20,background:'rgba(56,139,253,0.1)',color:'#388bfd',border:'1px solid rgba(56,139,253,0.25)' }}>{t}</span>)}
              </div>
            )}
          </motion.div>
        )}

        {/* CTA if not run */}
        {!analysisRan && !scanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: 48, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Zap style={{ width: 28, height: 28, color: '#a78bfa' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Run AI Analysis</h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24, maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.65 }}>
              Our 4 AI agents will deeply analyse this repository and produce educational explanations — not just a list of issues, but <em>why</em> they happen, <em>what</em> they mean, and <em>how</em> to fix them step by step.
            </p>
            <button onClick={handleRunAnalysis} style={{
              padding: '8px 24px', borderRadius: 6, background: 'var(--purple)',
              border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Start Deep Analysis</button>
            <div style={{ display:'flex',justifyContent:'center',gap:20,marginTop:20,fontSize:11,color:'var(--text-3)',fontFamily:'monospace' }}>
              <span>Security Scan</span><span>·</span><span>Quality Check</span><span>·</span><span>Dep. Audit</span><span>·</span><span>Docs Review</span>
            </div>
          </motion.div>
        )}

        {/* Scanning */}
        {scanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: 48, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Shield style={{ width: 28, height: 28, color: '#a78bfa' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Deep Analysis in Progress</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace', marginBottom: 20 }}>Agents are scanning and generating educational explanations…</div>
            <div style={{ display:'flex',justifyContent:'center',gap:8,flexWrap:'wrap' }}>
              {['Security Scout','Quality Architect','Dependency Warden','Docs Specialist'].map(a => (
                <span key={a} style={{ fontSize:11,fontFamily:'monospace',color:'#a78bfa',background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.25)',padding:'3px 10px',borderRadius:4 }}>{a}</span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {analysisRan && analysis && !scanning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Tab bar */}
            <div style={{ display:'flex',gap:4,flexWrap:'wrap' }}>
              {TABS.map(t => <TabBtn key={t.id} tab={t} active={activeTab === t.id} onClick={setActiveTab} />)}
            </div>

            {/* ── OVERVIEW ── */}
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

            {/* ── SECURITY ── */}
            {activeTab === 'security' && (
              <div>
                <div style={{ fontSize:12,color:'var(--text-3)',marginBottom:12,display:'flex',alignItems:'center',gap:6 }}>
                  <Shield style={{ width:14,height:14,color:'#f85149' }} />
                  {secFindings.length} security {secFindings.length===1?'finding':'findings'} — click any issue to learn why it matters and how to fix it
                </div>
                {secFindings.length===0
                  ? <div style={{ textAlign:'center',padding:48,color:'var(--text-3)',fontSize:13 }}><CheckCircle style={{ width:32,height:32,margin:'0 auto 12px',color:'#3fb950',opacity:0.5 }} /><div>No security issues found</div></div>
                  : secFindings.map(f => <DeepFindingCard key={f.id} finding={f} showFix={false} />)}
              </div>
            )}

            {/* ── QUALITY ── */}
            {activeTab === 'quality' && (
              <div>
                <div style={{ fontSize:12,color:'var(--text-3)',marginBottom:12,display:'flex',alignItems:'center',gap:6 }}>
                  <Code style={{ width:14,height:14,color:'#a78bfa' }} />
                  {qualFindings.length} quality & dependency {qualFindings.length===1?'finding':'findings'} — understand the root causes, not just the symptoms
                </div>
                {qualFindings.map(f => <DeepFindingCard key={f.id} finding={f} showFix={false} />)}
              </div>
            )}

            {/* ── DIGITAL TWIN ── */}
            {activeTab === 'twin' && <DigitalTwinTab twinData={analysis.digital_twin} />}

            {/* ── QUANTUM RISK ── */}
            {activeTab === 'quantum' && <QuantumRiskTab profiles={analysis.quantum_risk || []} />}

            {/* ── AI FIX SUGGESTIONS ── */}
            {activeTab === 'fixes' && (
              <div>
                <div style={{ padding:16,background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:6,marginBottom:16 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:'#a78bfa',marginBottom:6,display:'flex',alignItems:'center',gap:6 }}>
                    <GraduationCap style={{ width:16,height:16 }} /> Learn to Fix, Don't Just Copy
                  </div>
                  <p style={{ margin:0,fontSize:12,color:'var(--text-2)',lineHeight:1.65 }}>
                    Each suggestion below explains <strong>what the issue is</strong>, <strong>why it happens</strong>, and <strong>how to fix it step by step</strong> — along with before/after code. The goal is to help you understand the pattern so you can prevent it in the future, not just patch this one instance.
                  </p>
                </div>
                {findings.filter(f => f.how_to_fix || f.fix).map(f => (
                  <DeepFindingCard key={f.id} finding={f} showFix={true} />
                ))}
              </div>
            )}

          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}