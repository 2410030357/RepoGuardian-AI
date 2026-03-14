import { motion } from 'framer-motion';
import { Cpu, TrendingUp } from 'lucide-react';

const LEVEL_CONFIG = {
  CRITICAL: { bar: 'bg-red-500',    text: 'text-red-400',    border: 'border-red-500/30',    badge: 'bg-red-500/10'    },
  HIGH:     { bar: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/30', badge: 'bg-orange-500/10' },
  MEDIUM:   { bar: 'bg-amber-400',  text: 'text-amber-400',  border: 'border-amber-400/30',  badge: 'bg-amber-400/10'  },
  LOW:      { bar: 'bg-blue-400',   text: 'text-blue-400',   border: 'border-blue-400/30',   badge: 'bg-blue-400/10'   },
};

function RiskRow({ profile, index }) {
  // Support both old shape (profile.path) and new AI shape (profile.file)
  const fileName = profile.file || profile.path || 'unknown';
  const riskLevel = profile.risk_level || 'LOW';
  const riskScore = profile.risk_score ?? 0;
  const factors   = profile.factors || (profile.dominant_factor ? [profile.dominant_factor] : []);

  const cfg = LEVEL_CONFIG[riskLevel] ?? LEVEL_CONFIG.LOW;
  const pct = Math.round(riskScore * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.055 }}
      className={`p-3 rounded-lg border ${cfg.border} ${cfg.badge} group hover:brightness-110 transition-all`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-5 text-center text-[10px] font-mono text-slate-600 shrink-0">#{index + 1}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-slate-300 truncate">{fileName}</div>
        </div>
        <div className={`shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${cfg.badge} ${cfg.border} ${cfg.text} tracking-widest`}>
          {riskLevel}
        </div>
      </div>
      <div className="ml-8">
        <div className="h-1.5 bg-[#1a2240] rounded-full overflow-hidden mb-1">
          <motion.div className={`h-full rounded-full ${cfg.bar}`}
            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay: index * 0.055 + 0.2, ease: 'easeOut' }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {factors.slice(0, 3).map(f => (
              <span key={f} className="text-[9px] font-mono text-slate-600 bg-[#0d1220] px-1.5 py-0.5 rounded">{f}</span>
            ))}
          </div>
          <div className={`text-[10px] font-mono ${cfg.text} font-bold`}>{pct}%</div>
        </div>
      </div>
    </motion.div>
  );
}

export default function QuantumRisk({ profiles = [], loading = false }) {
  return (
    <div className="cyber-border rounded-xl bg-[#090d1a] flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2240] shrink-0">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-display font-semibold text-slate-200 tracking-widest uppercase">Quantum Risk Explorer</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-violet-400/70">
          <TrendingUp className="w-3 h-3" /> Risk Scores
        </div>
      </div>

      <div className="flex gap-3 px-4 py-2 border-b border-[#1a2240]/40 shrink-0">
        {Object.entries(LEVEL_CONFIG).map(([lvl, cfg]) => (
          <div key={lvl} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${cfg.bar}`} />
            <span className={`text-[10px] font-mono ${cfg.text}`}>{lvl}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-violet-400 animate-spin" />
          </div>
        )}
        {!loading && profiles.length === 0 && (
          <div className="text-center text-slate-600 text-xs font-mono pt-8">No risk data — run analysis first</div>
        )}
        {!loading && profiles.map((p, i) => <RiskRow key={p.file || p.path || i} profile={p} index={i} />)}
      </div>
    </div>
  );
}
