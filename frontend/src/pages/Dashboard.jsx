import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield, GitFork, Activity, Star, Clock,
  ArrowRight, Bell, ChevronRight, Lock, BookOpen,
  Github,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGitHubRepos } from '../hooks/useGitHub';
import HealthGauge from '../components/HealthGauge';
import AgentLog from '../components/AgentLog';

const containerV = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const panelV     = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } };

const LANG_COLORS = {
  JavaScript:'#f7df1e', TypeScript:'#3178c6', Python:'#3776ab', Java:'#ed8b00',
  Go:'#00add8', Rust:'#ce422b', Ruby:'#cc342d', 'C++':'#00599c', C:'#555',
  PHP:'#8892bf', Swift:'#ff6b35', Kotlin:'#7f52ff',
};

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff/86400)}d`;
  if (diff < 31536000) return `${Math.floor(diff/2592000)}mo`;
  return `${Math.floor(diff/31536000)}y`;
}

/* ── Stat card ── */
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    purple: { text: '#a78bfa', bg: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.25)' },
    green:  { text: '#3fb950', bg: 'rgba(63,185,80,0.1)',   border: 'rgba(63,185,80,0.25)'  },
    yellow: { text: '#d29922', bg: 'rgba(210,153,34,0.1)',  border: 'rgba(210,153,34,0.25)' },
    blue:   { text: '#388bfd', bg: 'rgba(56,139,253,0.1)',  border: 'rgba(56,139,253,0.25)' },
  };
  const c = colors[color] || colors.purple;
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 6, flexShrink: 0,
        background: c.bg, border: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon style={{ width: 16, height: 16, color: c.text }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: c.text, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

/* ── Repo card ── */
function RepoCard({ repo, onClick }) {
  const lc = LANG_COLORS[repo.language] || '#8d96a0';
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 6, padding: 16, cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
          {repo.private
            ? <Lock style={{ width: 14, height: 14, color: '#d29922', flexShrink: 0 }} />
            : <BookOpen style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }} />}
          <span style={{
            fontSize: 14, fontWeight: 600, color: '#388bfd',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{repo.name}</span>
          {repo.private && (
            <span style={{
              fontSize: 11, padding: '1px 7px', borderRadius: 20,
              background: 'rgba(210,153,34,0.12)', color: '#d29922',
              border: '1px solid rgba(210,153,34,0.25)', flexShrink: 0,
            }}>Private</span>
          )}
        </div>
        <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0, marginLeft: 6 }} />
      </div>

      {repo.description && (
        <p style={{
          fontSize: 12, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.5,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{repo.description}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>
        {repo.language && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: lc, display: 'inline-block', flexShrink: 0 }} />
            {repo.language}
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Star style={{ width: 12, height: 12 }} />{repo.stargazers_count ?? 0}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <GitFork style={{ width: 12, height: 12 }} />{repo.forks_count ?? 0}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <Clock style={{ width: 12, height: 12 }} />{timeAgo(repo.updated_at)}
        </span>
      </div>
    </div>
  );
}

const DEMO_REPOS = [
  { id:1, name:'auth-service',        description:'Authentication microservice with JWT and OAuth2 support', language:'Python',     stargazers_count:24, forks_count:8,  updated_at:new Date(Date.now()-3600000).toISOString(),    private:false, owner:{login:'demo-user'} },
  { id:2, name:'api-gateway',         description:'Central API gateway with rate limiting and load balancing', language:'Go',       stargazers_count:41, forks_count:12, updated_at:new Date(Date.now()-86400000).toISOString(),   private:false, owner:{login:'demo-user'} },
  { id:3, name:'frontend-app',        description:'React application with TypeScript and Tailwind CSS',      language:'TypeScript', stargazers_count:18, forks_count:5,  updated_at:new Date(Date.now()-172800000).toISOString(),  private:true,  owner:{login:'demo-user'} },
  { id:4, name:'data-pipeline',       description:'ETL pipeline for processing large datasets',             language:'Python',     stargazers_count:7,  forks_count:2,  updated_at:new Date(Date.now()-604800000).toISOString(),  private:false, owner:{login:'demo-user'} },
  { id:5, name:'infra-terraform',     description:'Infrastructure as code using Terraform and AWS',         language:'JavaScript', stargazers_count:15, forks_count:6,  updated_at:new Date(Date.now()-1209600000).toISOString(), private:true,  owner:{login:'demo-user'} },
  { id:6, name:'notification-service',description:'Email and push notification microservice',               language:'TypeScript', stargazers_count:9,  forks_count:3,  updated_at:new Date(Date.now()-2592000000).toISOString(), private:false, owner:{login:'demo-user'} },
];

export default function Dashboard() {
  const { user, githubToken, githubUser } = useAuth();
  const navigate = useNavigate();
  const { repos, loading: reposLoading } = useGitHubRepos(githubToken);

  const displayName  = githubUser?.name || githubUser?.login || user?.given_name || user?.name || 'Developer';
  const totalStars   = repos.reduce((a, r) => a + (r.stargazers_count || 0), 0);
  const recentRepos  = [...repos].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 6);
  const displayRepos = githubToken ? recentRepos : DEMO_REPOS;

  const portfolioScore = repos.length > 0
    ? Math.min(100, Math.round(75 + (repos.filter(r => !r.archived).length / repos.length) * 10 - (repos.filter(r => r.open_issues_count > 10).length / repos.length) * 15))
    : null;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg-2)', borderBottom: '1px solid var(--border)',
        padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            RepoGuardian AI › Dashboard
          </div>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!githubToken && (
            <button
              onClick={() => navigate('/settings')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 6,
                background: 'rgba(210,153,34,0.1)', border: '1px solid rgba(210,153,34,0.3)',
                color: '#d29922', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <Github style={{ width: 12, height: 12 }} /> Connect GitHub
            </button>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#3fb950' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3fb950', display: 'inline-block' }} />
            4 agents active
          </span>
          <button style={{
            background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6,
            padding: '5px 8px', color: 'var(--text-2)', cursor: 'pointer',
          }}>
            <Bell style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Good day,</div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>
            Welcome back,{' '}
            <span style={{ color: '#a78bfa' }}>{displayName}</span>
          </h2>
          {!githubToken && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>
              Showing demo data —{' '}
              <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', padding: 0, color: '#a78bfa', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}>
                connect GitHub
              </button>{' '}
              to see your real repositories
            </p>
          )}
        </motion.div>

        {/* Stats row */}
        <motion.div variants={containerV} initial="hidden" animate="show"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <motion.div variants={panelV}>
            <StatCard icon={GitFork}  label="Total Repos"   value={githubToken ? (repos.length || '–') : DEMO_REPOS.length} color="blue" />
          </motion.div>
          <motion.div variants={panelV}>
            <StatCard icon={Activity} label="Active Agents"  value="4" color="green" />
          </motion.div>
          <motion.div variants={panelV}>
            <StatCard icon={Star}     label="Total Stars"    value={githubToken ? (totalStars || '–') : '–'} color="yellow" />
          </motion.div>
          <motion.div variants={panelV}>
            <StatCard icon={Shield}   label="Public Repos"   value={githubToken ? (repos.filter(r=>!r.private).length || '–') : '–'} color="purple" />
          </motion.div>
        </motion.div>

        {/* Health + Agent log */}
        <motion.div variants={containerV} initial="hidden" animate="show"
          style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <motion.div variants={panelV}>
            <HealthGauge score={portfolioScore ?? 0} loading={reposLoading} placeholder={!portfolioScore && !reposLoading} />
          </motion.div>
          <motion.div variants={panelV}>
            <AgentLog />
          </motion.div>
        </motion.div>

        {/* Repos */}
        <motion.div variants={containerV} initial="hidden" animate="show">
          <motion.div variants={panelV}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  {githubToken ? 'Your Repositories' : 'Demo Repositories'}
                </span>
                {!githubToken && (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 20,
                    background: 'rgba(210,153,34,0.1)', color: '#d29922',
                    border: '1px solid rgba(210,153,34,0.25)',
                  }}>Connect GitHub to sync</span>
                )}
              </div>
              <button onClick={() => navigate('/repositories')} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>
                View all <ArrowRight style={{ width: 12, height: 12 }} />
              </button>
            </div>

            {reposLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[...Array(6)].map((_,i) => (
                  <div key={i} style={{ height: 100, borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--border)' }} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {displayRepos.map(r => (
                  <RepoCard key={r.id} repo={r}
                    onClick={() => navigate(`/repositories/${r.owner?.login ?? 'demo-user'}/${r.name}`)} />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}