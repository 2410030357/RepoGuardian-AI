/**
 * CommitActivity.jsx  v3  –  Complete rewrite
 * ──────────────────────────────────────────────────────────────
 * MODE 1 — "feed"      : Real commit list, silent, always visible
 * MODE 2 — "analyzing" : Agent logs play once on new commit, then
 *                         auto-return to MODE 1 after 3 seconds
 * ──────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitCommit, ExternalLink, Clock, Zap,
  Github, ArrowRight, CheckCircle, AlertTriangle,
  Loader, Bot, GitPullRequest, X,
} from 'lucide-react';
import { buildAgentLogs } from '../hooks/useCommitWatch';

// ── Colours per agent ─────────────────────────────────────────────────────
const AGENT_COLOR = {
  'Orchestrator':      '#3fb950',
  'Security Scout':    '#f85149',
  'Quality Architect': '#a78bfa',
  'Dependency Warden': '#d29922',
  'Docs Specialist':   '#58a6ff',
  'AI Fix Agent':      '#388bfd',
};

function pad(n) { return String(n).padStart(2,'0'); }
function nowTs() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function timeAgo(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function StatusIcon({ status }) {
  if (status === 'running') return <Loader        style={{ width:12, height:12, color:'#a78bfa', flexShrink:0 }} className="animate-spin" />;
  if (status === 'alert')   return <AlertTriangle style={{ width:12, height:12, color:'#f85149', flexShrink:0 }} />;
  if (status === 'warn')    return <AlertTriangle style={{ width:12, height:12, color:'#d29922', flexShrink:0 }} />;
  if (status === 'success') return <CheckCircle   style={{ width:12, height:12, color:'#3fb950', flexShrink:0 }} />;
  return null;
}

// ── Agent log panel (plays once, then calls onDone) ───────────────────────
function AgentLogPanel({ logs, triggerInfo, onDone }) {
  const [visible, setVisible] = useState([]);
  const [idx, setIdx]         = useState(0);
  const doneCalledRef         = useRef(false);

  useEffect(() => {
    if (idx >= logs.length) {
      if (!doneCalledRef.current) {
        doneCalledRef.current = true;
        const t = setTimeout(onDone, 3000);
        return () => clearTimeout(t);
      }
      return;
    }
    const t = setTimeout(() => {
      setVisible(p => [{ ...logs[idx], ts: nowTs() }, ...p].slice(0, 14));
      setIdx(i => i + 1);
    }, 1400);
    return () => clearTimeout(t);
  }, [idx, logs, onDone]);

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Trigger strip */}
      <div style={{
        padding:'7px 14px', flexShrink:0,
        background:'rgba(63,185,80,0.06)',
        borderBottom:'1px solid rgba(63,185,80,0.2)',
        fontSize:11, fontFamily:'monospace',
        color:'var(--text-2)', display:'flex', alignItems:'center', gap:8,
      }}>
        <Bot style={{ width:12, height:12, color:'#3fb950', flexShrink:0 }} />
        <span>
          Triggered by <span style={{ color:'#3fb950', fontWeight:700 }}>{triggerInfo?.author}</span>
          's commit on <span style={{ color:'#a78bfa', fontWeight:700 }}>{triggerInfo?.branch}</span>
          {' '}· <span style={{ color:'var(--text-3)' }}>"{triggerInfo?.msg?.slice(0,50)}"</span>
        </span>
      </div>

      {/* Terminal prompt */}
      <div style={{ padding:'5px 14px', background:'var(--bg)', borderBottom:'1px solid var(--border)', fontFamily:'monospace', fontSize:12, flexShrink:0 }}>
        <span style={{ color:'#3fb950' }}>$</span>
        <span style={{ color:'var(--text-2)', marginLeft:6 }}>repoguardian --analyze --trigger=commit --agents=4</span>
      </div>

      {/* Log rows */}
      <div style={{ flex:1, overflowY:'auto', background:'var(--bg)' }}>
        {visible.length === 0 && (
          <div style={{ padding:20, textAlign:'center', fontSize:12, color:'var(--text-3)', fontFamily:'monospace' }}>
            Initialising agents...
          </div>
        )}
        <AnimatePresence initial={false}>
          {visible.map((log, i) => (
            <motion.div key={`${log.msg}-${i}`}
              initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.2 }}
              style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'5px 14px', borderBottom:'1px solid var(--bg-2)' }}>
              <span style={{ fontSize:11, fontFamily:'monospace', color:'var(--text-3)', flexShrink:0, width:40 }}>{log.ts}</span>
              <div style={{ marginTop:1, flexShrink:0 }}><StatusIcon status={log.status} /></div>
              <span style={{ fontSize:11, fontFamily:'monospace', fontWeight:700, flexShrink:0, color: AGENT_COLOR[log.agent] || 'var(--text-2)' }}>
                {log.agent}:
              </span>
              <span style={{ fontSize:11, fontFamily:'monospace', color:'var(--text-2)', flex:1 }}>{log.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── PR suggestion banner (non-default branch, no open PR) ─────────────────
function PRBanner({ note, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:-6 }} transition={{ duration:0.2 }}
      style={{
        display:'flex', alignItems:'flex-start', gap:8,
        padding:'9px 12px', margin:'8px 8px 0',
        background: note.bg, border:`1px solid ${note.border}`,
        borderRadius:6, flexShrink:0,
      }}>
      <div style={{ width:3, borderRadius:4, background:note.color, alignSelf:'stretch', flexShrink:0 }} />
      <span style={{ fontSize:10, fontFamily:'monospace', fontWeight:700, padding:'2px 6px', borderRadius:4, background:note.badgeBg, color:note.color, flexShrink:0, marginTop:1 }}>
        {note.badge}
      </span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:2 }}>{note.headline}</div>
        <div style={{ fontSize:11, fontFamily:'monospace', color:'var(--text-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{note.detail}</div>
      </div>
      <button onClick={() => window.open(note.actionUrl,'_blank','noopener')}
        style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:5, cursor:'pointer', background:note.bg, border:`1px solid ${note.border}`, color:note.color, fontSize:11, fontWeight:600, fontFamily:'inherit', flexShrink:0, whiteSpace:'nowrap' }}>
        <GitPullRequest style={{ width:11, height:11 }} />{note.action}
      </button>
      <button onClick={onDismiss} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', padding:2, flexShrink:0, display:'flex', alignItems:'center' }}>
        <X style={{ width:13, height:13 }} />
      </button>
    </motion.div>
  );
}

// ── Quiet commit feed ─────────────────────────────────────────────────────
function CommitFeed({ activity }) {
  if (!activity.length) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', color:'var(--text-3)', fontSize:12, fontFamily:'monospace' }}>
          <GitCommit style={{ width:28, height:28, margin:'0 auto 8px', opacity:0.2, display:'block' }} />
          No recent commits
        </div>
      </div>
    );
  }
  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      {activity.map((item, i) => (
        <motion.div key={`${item.repo}-${item.sha}-${i}`}
          initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}
          onClick={() => window.open(item.url,'_blank','noopener')}
          style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background='var(--bg-2)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <GitCommit style={{ width:13, height:13, color:'#a78bfa', flexShrink:0, marginTop:2 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
              <span style={{ fontSize:11, fontFamily:'monospace', fontWeight:700, color:'#388bfd', flexShrink:0 }}>{item.repo}</span>
              <span style={{ fontSize:10, fontFamily:'monospace', color:'var(--text-3)', flexShrink:0 }}>{item.sha}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.msg}</div>
          </div>
          <div style={{ fontSize:10, fontFamily:'monospace', color:'var(--text-3)', flexShrink:0, display:'flex', alignItems:'center', gap:3 }}>
            <Clock style={{ width:9, height:9 }} />{timeAgo(item.date)}
          </div>
          <ExternalLink style={{ width:10, height:10, color:'var(--text-3)', flexShrink:0, marginTop:3 }} />
        </motion.div>
      ))}
    </div>
  );
}

// ── No-token state ────────────────────────────────────────────────────────
function ConnectPrompt({ onConnect }) {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:24 }}>
      <div style={{ width:40, height:40, borderRadius:8, background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Github style={{ width:20, height:20, color:'#a78bfa' }} />
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Connect GitHub to monitor commits</div>
        <div style={{ fontSize:11, color:'var(--text-3)', lineHeight:1.5, maxWidth:220 }}>
          Agents wake up automatically when new code is pushed.
        </div>
      </div>
      <button onClick={onConnect} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 16px', borderRadius:6, background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.35)', color:'#a78bfa', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
        <Github style={{ width:13, height:13 }} /> Connect GitHub <ArrowRight style={{ width:12, height:12 }} />
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function CommitActivity({ notification, agentTrigger, recentActivity, onDismiss, hasToken }) {
  const navigate = useNavigate();
  const [mode,       setMode]       = useState('feed');
  const [agentLogs,  setAgentLogs]  = useState([]);
  const [triggerInfo,setTriggerInfo]= useState(null);

  // When agentTrigger fires → switch to analyzing mode
  useEffect(() => {
    if (!agentTrigger) return;
    const logs = buildAgentLogs(agentTrigger.msg, agentTrigger.repo, agentTrigger.branch);
    setAgentLogs(logs);
    setTriggerInfo(agentTrigger);
    setMode('analyzing');
  }, [agentTrigger]);

  const handleDone = () => {
    setMode('feed');
    onDismiss();
  };

  const isAnalyzing = mode === 'analyzing';

  return (
    <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:6, display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Zap style={{ width:14, height:14, color: isAnalyzing ? '#3fb950' : '#a78bfa' }} />
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>
            {isAnalyzing ? 'Live Agent Feed' : 'Commit Activity'}
          </span>
          {isAnalyzing && triggerInfo && (
            <span style={{ fontSize:10, fontFamily:'monospace', padding:'2px 7px', borderRadius:4, background:'rgba(63,185,80,0.12)', color:'#3fb950', border:'1px solid rgba(63,185,80,0.3)' }}>
              analyzing {triggerInfo.repo}
            </span>
          )}
        </div>
        {!isAnalyzing && hasToken && recentActivity.length > 0 && (
          <span style={{ fontSize:11, color:'var(--text-3)', fontFamily:'monospace' }}>
            {recentActivity.length} recent · auto-refresh 60s
          </span>
        )}
        {isAnalyzing && (
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#3fb950', fontFamily:'monospace' }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#3fb950', display:'inline-block', animation:'pulse 1.2s ease-in-out infinite' }} />
            agents running
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {!hasToken ? (
          <ConnectPrompt onConnect={() => navigate('/settings')} />
        ) : isAnalyzing ? (
          <AgentLogPanel logs={agentLogs} triggerInfo={triggerInfo} onDone={handleDone} />
        ) : (
          <>
            {/* PR suggestion banner — only for feature branches */}
            <AnimatePresence>
              {notification && (
                <PRBanner note={notification} onDismiss={onDismiss} />
              )}
            </AnimatePresence>
            <CommitFeed activity={recentActivity} />
          </>
        )}
      </div>
    </div>
  );
}