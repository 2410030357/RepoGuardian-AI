import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Loader, Zap } from 'lucide-react';

const MOCK_LOGS = [
  { agent: 'Orchestrator',      msg: 'Cloning repository and building file manifest...',        status: 'running' },
  { agent: 'Security Scout',    msg: 'Starting SAST scan across 47 Python files...',            status: 'running' },
  { agent: 'Security Scout',    msg: 'CRITICAL: Hardcoded secret found at src/auth/jwt.py:47', status: 'alert'   },
  { agent: 'Security Scout',    msg: 'HIGH: SQL injection vector in db/queries.py:112',         status: 'alert'   },
  { agent: 'Quality Architect', msg: 'Calculating cyclomatic complexity for all modules...',    status: 'running' },
  { agent: 'Quality Architect', msg: 'routes.py complexity=24 exceeds threshold of 10',         status: 'warn'    },
  { agent: 'Dependency Warden', msg: 'Resolving 124 dependencies against NVD CVE database...', status: 'running' },
  { agent: 'Dependency Warden', msg: 'CVE-2023-30861 matched: flask==2.1.0 (CVSS 7.5)',         status: 'alert'   },
  { agent: 'AI Fix Agent',      msg: 'Generating patch for jwt.py:47 — confidence 97%',        status: 'success' },
  { agent: 'Docs Specialist',   msg: 'Docstring coverage: 23% — below 80% threshold',          status: 'warn'    },
  { agent: 'AI Fix Agent',      msg: 'Parameterised query patch generated for queries.py',     status: 'success' },
  { agent: 'Orchestrator',      msg: 'Analysis complete. Health Score: 74 / 100',              status: 'success' },
];

const AGENT_COLORS = {
  'Security Scout':    '#f85149',
  'Quality Architect': '#a78bfa',
  'Dependency Warden': '#d29922',
  'AI Fix Agent':      '#388bfd',
  'Docs Specialist':   '#58a6ff',
  'Orchestrator':      '#3fb950',
};

function StatusIcon({ status }) {
  if (status === 'running') return <Loader style={{ width: 12, height: 12, color: '#a78bfa', flexShrink: 0 }} className="animate-spin" />;
  if (status === 'alert')   return <AlertTriangle style={{ width: 12, height: 12, color: '#f85149', flexShrink: 0 }} />;
  if (status === 'warn')    return <AlertTriangle style={{ width: 12, height: 12, color: '#d29922', flexShrink: 0 }} />;
  if (status === 'success') return <CheckCircle   style={{ width: 12, height: 12, color: '#3fb950', flexShrink: 0 }} />;
  return null;
}

function pad(n) { return String(n).padStart(2, '0'); }

export default function AgentLog({ externalLogs }) {
  const [visible, setVisible] = useState([]);
  const [idx, setIdx]         = useState(0);
  const logs    = externalLogs?.length ? externalLogs : MOCK_LOGS;
  const endRef  = useRef(null);

  useEffect(() => {
    if (idx >= logs.length) {
      const t = setTimeout(() => { setVisible([]); setIdx(0); }, 4000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setVisible(p => [logs[idx], ...p].slice(0, 14));
      setIdx(i => i + 1);
    }, 1500);
    return () => clearTimeout(t);
  }, [idx, logs]);

  // Generate fake timestamps going backwards
  const getTs = (offset) => {
    const d = new Date(Date.now() - offset * 90000);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100%',
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap style={{ width: 14, height: 14, color: '#a78bfa' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Live Agent Feed</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#3fb950', fontFamily: 'monospace' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3fb950', display: 'inline-block' }} />
          {idx}/{logs.length} events
        </div>
      </div>

      {/* ── Terminal prompt bar ── */}
      <div style={{
        padding: '6px 16px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        fontFamily: 'monospace', fontSize: 12,
      }}>
        <span style={{ color: '#3fb950' }}>$</span>
        <span style={{ color: 'var(--text-2)', marginLeft: 6 }}>repoguardian --watch --agents=4</span>
      </div>

      {/* ── Log rows ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0', background: 'var(--bg)' }}>
        {visible.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>
            Initialising agents...
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((log, i) => {
              const agentColor = AGENT_COLORS[log.agent] || 'var(--text-2)';
              return (
                <motion.div
                  key={`${log.msg}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '5px 16px',
                    borderBottom: '1px solid var(--bg-2)',
                  }}
                >
                  {/* Timestamp */}
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-3)', flexShrink: 0, width: 38 }}>
                    {getTs(i)}
                  </span>

                  {/* Status icon */}
                  <div style={{ marginTop: 1, flexShrink: 0 }}>
                    <StatusIcon status={log.status} />
                  </div>

                  {/* Agent name */}
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: agentColor, fontWeight: 700, flexShrink: 0 }}>
                    {log.agent}:
                  </span>

                  {/* Message */}
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-2)', flex: 1 }}>
                    {log.msg}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}