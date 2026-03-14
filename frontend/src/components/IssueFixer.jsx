import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle, Code, Wand2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };

export default function IssueFixer({ findings = [], loading = false }) {
  const [expanded, setExpanded] = useState(null);
  const [applied,  setApplied]  = useState(new Set());

  const sorted = [...findings].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
  );

  const apply = (id) => setApplied(s => new Set([...s, id]));

  if (loading) return (
    <div className="cyber-border rounded-xl bg-[#090d1a] p-6 flex items-center justify-center h-full">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent border-cyan-400 animate-spin" />
    </div>
  );

  return (
    <div className="cyber-border rounded-xl bg-[#090d1a] flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2240] shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs font-display font-semibold text-slate-200 tracking-widest uppercase">Issues & Auto-Fix</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">{sorted.length} findings</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-slate-600">
            <CheckCircle className="w-8 h-8 mb-2 text-emerald-500/30" />
            <span className="text-xs font-mono">No issues detected</span>
          </div>
        )}

        {sorted.map((f, i) => {
          const id       = `${f.file}-${f.line}-${i}`;
          const isOpen   = expanded === id;
          const isDone   = applied.has(id);
          const hasFix   = Boolean(f.fix);

          return (
            <div key={id} className={`border-b border-[#1a2240]/40 transition-colors ${isOpen ? 'bg-[#0d1220]' : 'hover:bg-[#0a0f1a]'}`}>
              {/* Row header */}
              <button className="w-full flex items-start gap-3 px-4 py-3 text-left"
                onClick={() => setExpanded(isOpen ? null : id)}>
                <div className="mt-0.5 shrink-0">
                  <StatusBadge status={f.severity?.toLowerCase()} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono font-semibold text-slate-200 truncate">{f.message}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-cyan-400/70">{f.file}{f.line ? `:${f.line}` : ''}</span>
                    {hasFix && !isDone && <span className="text-[10px] font-mono text-violet-400">✦ fix available</span>}
                    {isDone && <span className="text-[10px] font-mono text-emerald-400">✓ applied</span>}
                  </div>
                </div>
                <div className="shrink-0 text-slate-600 mt-0.5">
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {/* Expanded fix panel */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-[#1a2240]/40">
                    <div className="px-4 pb-4 pt-3">
                      {hasFix ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <Code className="w-3.5 h-3.5 text-violet-400" />
                            <span className="text-[10px] font-mono text-violet-400 font-semibold uppercase tracking-wider">AI-Generated Fix</span>
                          </div>
                          <pre className="text-xs font-mono text-emerald-300/90 bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap mb-3">
                            {f.fix}
                          </pre>
                          <button onClick={() => apply(id)} disabled={isDone}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                              isDone
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-default'
                                : 'bg-violet-500/10 border border-violet-500/30 text-violet-400 hover:bg-violet-500/20'
                            }`}>
                            {isDone ? <><CheckCircle className="w-3.5 h-3.5" /> Applied</> : <><Wand2 className="w-3.5 h-3.5" /> Apply Fix</>}
                          </button>
                        </>
                      ) : (
                        <p className="text-xs font-mono text-slate-500">
                          Manual review required. No automated fix available for this finding type.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
