import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, AlertTriangle, CheckCircle, Loader, Zap, Filter, Trash2, Download, Circle } from 'lucide-react';

const AGENT_COLOR = {
  'Security Scout':    { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
  'Quality Architect': { text: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20'    },
  'Dependency Warden': { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  'AI Fix Agent':      { text: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20'  },
  'Docs Specialist':   { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  'Orchestrator':      { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

const DEFAULT_AGENT = { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };

const STATUS_STYLES = {
  running: { icon: Loader, cls: 'text-cyan-400', spin: true   },
  alert:   { icon: AlertTriangle, cls: 'text-red-400',    spin: false },
  warn:    { icon: AlertTriangle, cls: 'text-amber-400',  spin: false },
  success: { icon: CheckCircle,   cls: 'text-emerald-400', spin: false },
  info:    { icon: Circle,        cls: 'text-slate-400',  spin: false },
};

const FULL_LOG_STREAM = [
  { id: 1,  ts: '09:41:02', agent: 'Orchestrator',      msg: 'RepoGuardian AI system boot — v2.4.1',                                 status: 'success' },
  { id: 2,  ts: '09:41:03', agent: 'Orchestrator',      msg: 'Connecting to repository index...',                                     status: 'running' },
  { id: 3,  ts: '09:41:05', agent: 'Orchestrator',      msg: '5 repositories registered for monitoring',                             status: 'success' },
  { id: 4,  ts: '09:41:06', agent: 'Security Scout',    msg: 'Initialising SAST engine — OWASP ruleset loaded',                      status: 'running' },
  { id: 5,  ts: '09:41:08', agent: 'Security Scout',    msg: 'Scanning auth-service (47 files)...',                                  status: 'running' },
  { id: 6,  ts: '09:41:14', agent: 'Security Scout',    msg: 'CRITICAL: Hardcoded API key — auth-service/config.py:23',              status: 'alert'   },
  { id: 7,  ts: '09:41:15', agent: 'Security Scout',    msg: 'HIGH: SQL injection vector — auth-service/database.py:87',             status: 'alert'   },
  { id: 8,  ts: '09:41:16', agent: 'Security Scout',    msg: 'MEDIUM: Missing input validation — auth-service/routes.py:55',         status: 'warn'    },
  { id: 9,  ts: '09:41:17', agent: 'Quality Architect', msg: 'Calculating cyclomatic complexity across all modules...',               status: 'running' },
  { id: 10, ts: '09:41:20', agent: 'Quality Architect', msg: 'processor.py — complexity: 24 (threshold: 10) ⚠ EXCEEDED',            status: 'warn'    },
  { id: 11, ts: '09:41:21', agent: 'Quality Architect', msg: 'routes.py — complexity: 18 (threshold: 10) ⚠ EXCEEDED',               status: 'warn'    },
  { id: 12, ts: '09:41:22', agent: 'Quality Architect', msg: 'auth_manager.py — 0% test coverage detected',                          status: 'warn'    },
  { id: 13, ts: '09:41:23', agent: 'Dependency Warden', msg: 'Scanning requirements.txt against NVD CVE database...',                status: 'running' },
  { id: 14, ts: '09:41:26', agent: 'Dependency Warden', msg: 'CVE-2023-30861 — flask==2.1.0 (CVSS: 7.5 HIGH)',                      status: 'alert'   },
  { id: 15, ts: '09:41:27', agent: 'Dependency Warden', msg: 'CVE-2022-29361 — pyjwt==1.7.1 (CVSS: 9.1 CRITICAL)',                  status: 'alert'   },
  { id: 16, ts: '09:41:28', agent: 'Dependency Warden', msg: '3 packages with available security updates',                           status: 'warn'    },
  { id: 17, ts: '09:41:29', agent: 'Docs Specialist',   msg: 'Analysing docstring coverage...',                                      status: 'running' },
  { id: 18, ts: '09:41:31', agent: 'Docs Specialist',   msg: 'Docstring coverage: 33% (required: 80%) — BELOW THRESHOLD',           status: 'warn'    },
  { id: 19, ts: '09:41:32', agent: 'Docs Specialist',   msg: 'README.md last updated 8 months ago — review recommended',             status: 'info'    },
  { id: 20, ts: '09:41:33', agent: 'AI Fix Agent',      msg: 'Generating fixes for 4 high-priority issues...',                      status: 'running' },
  { id: 21, ts: '09:41:36', agent: 'AI Fix Agent',      msg: 'Patch generated: replace hardcoded key with os.getenv() — conf 97%',  status: 'success' },
  { id: 22, ts: '09:41:38', agent: 'AI Fix Agent',      msg: 'Patch generated: parameterised SQL queries — confidence 99%',         status: 'success' },
  { id: 23, ts: '09:41:39', agent: 'AI Fix Agent',      msg: 'Flask upgrade path identified: 2.1.0 → 2.3.3 — no breaking changes',  status: 'success' },
  { id: 24, ts: '09:41:40', agent: 'Orchestrator',      msg: 'Health Score calculated: 64 / 100 — Status: MODERATE',                status: 'warn'    },
  { id: 25, ts: '09:41:41', agent: 'Orchestrator',      msg: 'Quantum risk analysis in progress...',                                 status: 'running' },
  { id: 26, ts: '09:41:43', agent: 'Orchestrator',      msg: 'High-risk file identified: auth_manager.py (score: 0.87)',             status: 'alert'   },
  { id: 27, ts: '09:41:44', agent: 'Orchestrator',      msg: 'Report generated — 7 findings, 3 AI patches ready',                   status: 'success' },
  { id: 28, ts: '09:41:45', agent: 'Orchestrator',      msg: 'Next scheduled scan: 6 hours',                                        status: 'info'    },
];

const AGENTS = ['All', ...Object.keys(AGENT_COLOR)];
const STATUSES = ['All', 'alert', 'warn', 'success', 'running', 'info'];

function LogRow({ log, index }) {
  const ac = AGENT_COLOR[log.agent] || DEFAULT_AGENT;
  const sc = STATUS_STYLES[log.status] || STATUS_STYLES.info;
  const Icon = sc.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      className="flex items-start gap-3 px-4 py-3 border-b border-[#1a2240]/60 hover:bg-[#0d1220]/50 transition-colors group"
    >
      <span className="text-[10px] font-mono text-slate-600 shrink-0 mt-0.5 w-14">{log.ts}</span>
      <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${sc.cls} ${sc.spin ? 'animate-spin' : ''}`} />
      <span className={`text-[10px] font-mono px-2 py-0.5 rounded shrink-0 ${ac.text} ${ac.bg} border ${ac.border}`}>
        {log.agent}
      </span>
      <span className="text-xs font-mono text-slate-300 leading-relaxed">{log.msg}</span>
    </motion.div>
  );
}

export default function AgentLogsPage() {
  const [agentFilter,  setAgentFilter]  = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search,       setSearch]       = useState('');
  const [paused,       setPaused]       = useState(false);
  const [visibleCount, setVisible]      = useState(12);
  const [streaming,    setStreaming]     = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setVisible(v => Math.min(v + 1, FULL_LOG_STREAM.length));
    }, 1800);
    return () => clearInterval(intervalRef.current);
  }, [paused]);

  const filtered = FULL_LOG_STREAM.slice(0, visibleCount).filter(l => {
    if (agentFilter  !== 'All' && l.agent  !== agentFilter)  return false;
    if (statusFilter !== 'All' && l.status !== statusFilter)  return false;
    if (search && !l.msg.toLowerCase().includes(search.toLowerCase()) && !l.agent.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = FULL_LOG_STREAM.reduce((a, l) => { a[l.status] = (a[l.status] || 0) + 1; return a; }, {});

  return (
    <div className="bg-[#050810] bg-grid min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[#1a2240] bg-[#050810]/95 backdrop-blur-sm px-6 py-3.5 flex items-center gap-4">
        <div>
          <div className="text-[10px] font-mono text-slate-600 tracking-widest">REPOGUARDIAN AI › AGENT LOGS</div>
          <h1 className="text-base font-display font-bold text-slate-100 tracking-wider mt-0.5">Live Agent Feed</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
            <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${!paused ? 'animate-pulse' : ''}`} />
            {paused ? 'Paused' : 'Live'}
          </div>
          <button onClick={() => setPaused(p => !p)}
            className="px-3 py-1.5 text-xs font-mono bg-[#090d1a] border border-[#1a2240] text-slate-400 rounded-lg hover:border-slate-600 hover:text-slate-200 transition-all">
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={() => setVisible(FULL_LOG_STREAM.length)}
            className="px-3 py-1.5 text-xs font-mono bg-[#090d1a] border border-[#1a2240] text-slate-400 rounded-lg hover:border-slate-600 hover:text-slate-200 transition-all">
            Load All
          </button>
        </div>
      </header>

      <div className="p-6 space-y-4">

        {/* Stat pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Alerts',   count: counts.alert,   cls: 'text-red-400 border-red-500/20 bg-red-500/5'      },
            { label: 'Warnings', count: counts.warn,    cls: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
            { label: 'Success',  count: counts.success, cls: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
            { label: 'Running',  count: counts.running, cls: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5'   },
          ].map(({ label, count, cls }) => (
            <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cls} text-xs font-mono`}>
              <span className="font-bold">{count || 0}</span> {label}
            </div>
          ))}
        </div>

        {/* Agent status pills */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(AGENT_COLOR).map(([name, style]) => (
            <div key={name} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${style.border} ${style.bg} text-[10px] font-mono ${style.text}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {name}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..."
            className="flex-1 min-w-48 px-3 py-2 text-xs font-mono bg-[#090d1a] border border-[#1a2240] rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40" />
          <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
            className="px-3 py-2 text-xs font-mono bg-[#090d1a] border border-[#1a2240] rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500/40">
            {AGENTS.map(a => <option key={a}>{a}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-mono bg-[#090d1a] border border-[#1a2240] rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500/40">
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Log panel */}
        <div className="cyber-border rounded-xl bg-[#090d1a] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a2240]">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">Agent Activity Stream</span>
            </div>
            <span className="text-[10px] font-mono text-slate-600">{filtered.length} entries</span>
          </div>

          <div className="divide-y-0">
            <AnimatePresence>
              {filtered.map((log, i) => <LogRow key={log.id} log={log} index={i} />)}
            </AnimatePresence>
          </div>

          {!paused && visibleCount < FULL_LOG_STREAM.length && (
            <div className="flex items-center gap-2 px-4 py-3 text-[10px] font-mono text-cyan-400 animate-pulse">
              <Loader className="w-3 h-3 animate-spin" /> Streaming live agent activity...
            </div>
          )}

          {visibleCount >= FULL_LOG_STREAM.length && (
            <div className="px-4 py-3 text-[10px] font-mono text-slate-600 text-center">
              — End of log stream —
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
