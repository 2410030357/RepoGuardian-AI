import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle, GitBranch, Cpu, Radar, Lock } from 'lucide-react';

const STEPS = [
  { icon: Lock,     label: 'Authenticating with Google...',            sub: 'Verifying OAuth 2.0 token & identity claims',               accent: '#00e5ff', delay: 0,    duration: 600  },
  { icon: GitBranch,label: 'Connecting to GitHub Repositories...',     sub: 'Fetching repository manifest & branch metadata',            accent: '#00ff88', delay: 700,  duration: 700  },
  { icon: Radar,    label: 'Deploying Autonomous Security Agents...',  sub: 'Spawning Security, Quality, Dependency & AI agents',        accent: '#7c3aed', delay: 1500, duration: 600  },
  { icon: Cpu,      label: 'Initializing Intelligence Engine...',      sub: 'Loading vulnerability models & code analysis pipelines',    accent: '#ffaa00', delay: 2200, duration: 500  },
];
const TOTAL = 3200;

function ScanRing({ radius, duration, color, reverse = false, dashes = 6, opacity = 0.6 }) {
  const c = 2 * Math.PI * radius;
  const dash = c / dashes;
  return (
    <motion.circle cx="100" cy="100" r={radius} fill="none" stroke={color}
      strokeWidth="1.5" strokeDasharray={`${dash * 0.55} ${dash * 0.45}`} strokeOpacity={opacity}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
      style={{ transformOrigin: '100px 100px' }} />
  );
}

function StepRow({ step, visible, active }) {
  const Icon = step.icon;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }} className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `${step.accent}15`, border: `1px solid ${step.accent}40`, boxShadow: active ? `0 0 12px ${step.accent}40` : 'none' }}>
            <Icon className="w-3.5 h-3.5" style={{ color: step.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-mono font-semibold text-slate-200 leading-tight">{step.label}</div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">{step.sub}</div>
          </div>
          <div className="shrink-0 mt-1">
            {active ? (
              <motion.div className="w-4 h-4 rounded-full border-2"
                style={{ borderColor: `${step.accent}80`, borderTopColor: 'transparent' }}
                animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
            ) : <CheckCircle className="w-4 h-4" style={{ color: step.accent }} />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function SyncOverlay({ userName, onComplete }) {
  const [visibleSteps, setVisibleSteps] = useState([]);
  const [activeStep,   setActiveStep]   = useState(0);
  const [progress,     setProgress]     = useState(0);

  const stableOnComplete = useCallback(onComplete, []);

  useEffect(() => {
    const timers = [];
    STEPS.forEach((step, i) => {
      timers.push(setTimeout(() => { setVisibleSteps(p => [...p, i]); setActiveStep(i); }, step.delay));
      timers.push(setTimeout(() => setActiveStep(i + 1), step.delay + step.duration));
    });
    let elapsed = 0;
    const iv = setInterval(() => { elapsed += 60; setProgress(Math.min((elapsed / TOTAL) * 100, 100)); }, 60);
    timers.push(setTimeout(stableOnComplete, TOTAL));
    return () => { timers.forEach(clearTimeout); clearInterval(iv); };
  }, [stableOnComplete]);

  const firstName = userName?.split(' ')[0] ?? 'there';

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.35 }} style={{ background: 'rgba(5,8,16,0.97)', backdropFilter: 'blur(12px)' }}>
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-cyan-500/4 blur-[100px] pointer-events-none" />

      <motion.div className="relative w-full max-w-md mx-4"
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}>
        <div className="absolute -top-px -left-px w-5 h-5 border-t-2 border-l-2 border-cyan-500/60 rounded-tl-lg" />
        <div className="absolute -top-px -right-px w-5 h-5 border-t-2 border-r-2 border-cyan-500/60 rounded-tr-lg" />
        <div className="absolute -bottom-px -left-px w-5 h-5 border-b-2 border-l-2 border-cyan-500/60 rounded-bl-lg" />
        <div className="absolute -bottom-px -right-px w-5 h-5 border-b-2 border-r-2 border-cyan-500/60 rounded-br-lg" />

        <div className="rounded-2xl border border-[#1a2240] bg-[#090d1a]/90 p-8">
          <div className="flex justify-center mb-8">
            <div className="relative w-[200px] h-[200px]">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                <ScanRing radius={92} duration={18} color="#00e5ff" opacity={0.15} dashes={12} />
                <ScanRing radius={85} duration={10} color="#00e5ff" opacity={0.25} dashes={8} />
                <ScanRing radius={76} duration={6}  color="#00ff88" opacity={0.35} dashes={6} reverse />
                <ScanRing radius={67} duration={4}  color="#7c3aed" opacity={0.45} dashes={5} />
                <circle cx="100" cy="100" r={56} fill="none" stroke="#1a2240" strokeWidth="1" />
              </svg>
              {[1,2,3].map(i => (
                <motion.div key={i} className="absolute inset-0 rounded-full border border-cyan-400/20"
                  animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: i * 0.8 }} />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.35)' }}
                  animate={{ boxShadow: ['0 0 30px rgba(0,229,255,0.2)','0 0 60px rgba(0,229,255,0.45)','0 0 30px rgba(0,229,255,0.2)'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
                  <Shield className="w-9 h-9 text-cyan-400" />
                </motion.div>
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-display font-bold text-slate-100 tracking-wider">
              Welcome, <span className="text-cyan-400">{firstName}</span>
            </h2>
            <p className="text-[11px] font-mono text-slate-500 tracking-[0.25em] mt-1 uppercase">Syncing with RepoGuardian AI</p>
          </div>

          <div className="space-y-3 mb-6 min-h-[160px]">
            {STEPS.map((step, i) => (
              <StepRow key={i} step={step} visible={visibleSteps.includes(i)} active={activeStep === i} />
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono text-slate-600">
              <span>SYSTEM BOOT</span><span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 w-full bg-[#1a2240] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-75"
                style={{ background: 'linear-gradient(90deg, #00e5ff, #00ff88)', boxShadow: '0 0 10px rgba(0,229,255,0.6)', width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
