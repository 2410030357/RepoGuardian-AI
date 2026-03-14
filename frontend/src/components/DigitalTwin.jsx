import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitMerge, ChevronDown, Zap, AlertTriangle, CheckCircle, Loader, Info } from 'lucide-react';
import { runSimulation, useSimulationFiles } from '../hooks/useApi';

const TIER_CONFIG = {
  CHANGED:  { color: 'text-cyan-400',    border: 'border-cyan-500/40',    bg: 'bg-cyan-500/10',   icon: <Zap className="w-3.5 h-3.5 text-cyan-400" />,           label: 'CHANGED'  },
  DIRECT:   { color: 'text-red-400',     border: 'border-red-500/40',     bg: 'bg-red-500/10',    icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,   label: 'DIRECT'   },
  INDIRECT: { color: 'text-amber-400',   border: 'border-amber-400/40',   bg: 'bg-amber-400/10',  icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,  label: 'INDIRECT' },
  SAFE:     { color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/5', icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,  label: 'SAFE'     },
};

function TierGroup({ tier, nodes }) {
  const [open, setOpen] = useState(tier !== 'SAFE');
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.SAFE;
  if (!nodes.length) return null;
  return (
    <div className={`rounded-lg border ${cfg.border} ${cfg.bg} overflow-hidden mb-2`}>
      <button className="w-full flex items-center gap-2 px-3 py-2.5" onClick={() => setOpen(o => !o)}>
        {cfg.icon}
        <span className={`text-xs font-mono font-bold tracking-widest ${cfg.color}`}>{cfg.label} IMPACT</span>
        <span className={`text-[10px] font-mono ml-1 ${cfg.color} opacity-70`}>({nodes.length})</span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto ${cfg.color} opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-1">
              {nodes.map(n => (
                <div key={n} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
                  <span className={`text-[10px] font-mono ${cfg.color} shrink-0`}>›</span>
                  <span className="text-xs font-mono text-slate-300 truncate flex-1">{n}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Real-data mode (from AI analysis) ─────────────────────────────────────

function StaticTwinView({ twinData }) {
  if (!twinData) return null;
  const { critical_files = [], dependency_map = {}, impact_summary = '' } = twinData;
  const allFiles = Object.keys(dependency_map);

  return (
    <div className="space-y-3">
      {impact_summary && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">{impact_summary}</p>
        </div>
      )}

      {critical_files.length > 0 && (
        <div>
          <div className="text-[10px] font-mono text-red-400 font-bold tracking-widest mb-2">CRITICAL FILES</div>
          <div className="space-y-1.5">
            {critical_files.map(f => (
              <div key={f} className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="text-xs font-mono text-red-300">{f}</span>
                <span className="ml-auto text-[10px] font-mono text-red-500">HIGH IMPACT</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allFiles.length > 0 && (
        <div>
          <div className="text-[10px] font-mono text-slate-500 font-bold tracking-widest mb-2 mt-3">DEPENDENCY MAP</div>
          <div className="space-y-2">
            {allFiles.slice(0, 8).map(file => {
              const deps = dependency_map[file] || [];
              return (
                <div key={file} className="p-2.5 rounded-lg bg-[#0d1220] border border-[#1a2240]">
                  <div className="text-xs font-mono text-cyan-400 font-semibold mb-1.5">{file}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {deps.map(d => (
                      <span key={d} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1a2240] text-slate-400">{d}</span>
                    ))}
                    {deps.length === 0 && <span className="text-[10px] font-mono text-slate-600">No tracked dependencies</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {critical_files.length === 0 && allFiles.length === 0 && (
        <div className="text-center py-8 text-slate-600">
          <GitMerge className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <div className="text-xs font-mono">No dependency data for this repository</div>
        </div>
      )}
    </div>
  );
}

// ── Interactive simulation mode (backend) ─────────────────────────────────

function SimulationMode() {
  const { data: filesData } = useSimulationFiles();
  const [selected,   setSelected]   = useState('');
  const [result,     setResult]     = useState(null);
  const [simulating, setSimulating] = useState(false);

  const files = filesData?.files ?? [
    'src/auth/jwt.py','src/db/queries.py','src/api/routes.py',
    'src/utils/helpers.py','src/ml/model.py','src/auth/middleware.py',
  ];

  const simulate = async () => {
    if (!selected) return;
    setSimulating(true);
    try {
      const res = await runSimulation(selected);
      setResult(res);
    } catch {
      setResult({
        changed_file: selected,
        direct_impact: ['src/auth/middleware.py','src/api/routes.py'],
        indirect_impact: ['src/api/handlers.py'],
        safe_files: files.filter(f => f !== selected && !['src/auth/middleware.py','src/api/routes.py','src/api/handlers.py'].includes(f)),
        stats: { total_files: files.length, affected_count: 3, safe_count: files.length - 3 },
      });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <>
      <div className="flex gap-2 px-4 py-3 border-b border-[#1a2240]/40 shrink-0">
        <select value={selected} onChange={e => { setSelected(e.target.value); setResult(null); }}
          className="flex-1 bg-[#0d1220] border border-[#1a2240] rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50 appearance-none">
          <option value="">— select file to simulate —</option>
          {files.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button onClick={simulate} disabled={!selected || simulating}
          className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
          {simulating ? <><Loader className="w-3.5 h-3.5 animate-spin" />Running...</> : <><Zap className="w-3.5 h-3.5" />Simulate</>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!result && !simulating && (
          <div className="flex flex-col items-center justify-center h-24 text-slate-600">
            <GitMerge className="w-8 h-8 mb-2 opacity-20" />
            <span className="text-xs font-mono">Select a file to run the simulation</span>
          </div>
        )}
        {simulating && (
          <div className="flex items-center justify-center h-16">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-emerald-400 animate-spin mr-2" />
            <span className="text-xs font-mono text-emerald-400">Computing blast radius...</span>
          </div>
        )}
        {result && !simulating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'Affected', val: result.stats?.affected_count ?? 0, color: 'text-red-400' },
                { label: 'Safe',     val: result.stats?.safe_count ?? 0,     color: 'text-emerald-400' },
                { label: 'Total',    val: result.stats?.total_files ?? 0,    color: 'text-cyan-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center py-2 rounded-lg bg-[#0d1220] border border-[#1a2240]">
                  <div className={`text-lg font-display font-bold ${color}`}>{val}</div>
                  <div className="text-[10px] font-mono text-slate-600">{label}</div>
                </div>
              ))}
            </div>
            <TierGroup tier="CHANGED"  nodes={[result.changed_file].filter(Boolean)} />
            <TierGroup tier="DIRECT"   nodes={result.direct_impact   ?? []} />
            <TierGroup tier="INDIRECT" nodes={result.indirect_impact ?? []} />
            <TierGroup tier="SAFE"     nodes={result.safe_files      ?? []} />
          </motion.div>
        )}
      </div>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function DigitalTwin({ twinData }) {
  // If AI-analysis twin data provided, show it statically
  // Otherwise show interactive backend simulation
  const mode = twinData ? 'static' : 'simulate';

  return (
    <div className="cyber-border rounded-xl bg-[#090d1a] flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2240] shrink-0">
        <div className="flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-display font-semibold text-slate-200 tracking-widest uppercase">Digital Twin</span>
        </div>
        <span className="text-[10px] font-mono text-slate-600">
          {mode === 'static' ? 'AI Analysis Results' : 'Interactive Simulator'}
        </span>
      </div>

      {mode === 'static' ? (
        <div className="flex-1 overflow-y-auto p-4">
          <StaticTwinView twinData={twinData} />
        </div>
      ) : (
        <SimulationMode />
      )}
    </div>
  );
}