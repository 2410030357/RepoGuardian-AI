import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GitFork, Search, Star, Lock, BookOpen, Clock, Filter, RefreshCw, AlertCircle, Github, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGitHubRepos } from '../hooks/useGitHub';

const panelV = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff/86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff/2592000)}mo ago`;
  return `${Math.floor(diff/31536000)}y ago`;
}

const LANG_COLORS = {
  JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3776ab', Java: '#ed8b00',
  Go: '#00add8', Rust: '#ce422b', Ruby: '#cc342d', 'C++': '#00599c', C: '#555555',
  PHP: '#8892bf', Swift: '#ff6b35', Kotlin: '#7f52ff', Dart: '#00b4ab',
};

function RepoRow({ repo, onClick }) {
  const lc = LANG_COLORS[repo.language] || '#64748b';
  return (
    <motion.div variants={panelV}
      onClick={onClick}
      className="flex items-center gap-4 px-5 py-4 border-b border-[#1a2240] hover:bg-[#0d1220] cursor-pointer group transition-colors">

      <div className="shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors">
        {repo.private
          ? <Lock className="w-4 h-4 text-amber-500/70" />
          : <BookOpenIcon className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors truncate">{repo.name}</span>
          {repo.private && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400/80 shrink-0">Private</span>
          )}
          {repo.fork && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-600 text-slate-500 shrink-0">Fork</span>
          )}
        </div>
        {repo.description && (
          <p className="text-xs text-slate-500 truncate">{repo.description}</p>
        )}
      </div>

      <div className="hidden md:flex items-center gap-5 text-xs font-mono text-slate-500 shrink-0">
        {repo.language && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: lc }} />
            {repo.language}
          </span>
        )}
        <span className="flex items-center gap-1"><StarIcon className="w-3.5 h-3.5" />{repo.stargazers_count}</span>
        <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" />{repo.forks_count}</span>
        <span className="flex items-center gap-1 text-slate-600"><Clock className="w-3.5 h-3.5" />{timeAgo(repo.updated_at)}</span>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
    </motion.div>
  );
}

function BookOpenIcon({ className }) {
  return <svg className={className} viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"/></svg>;
}
function StarIcon({ className }) {
  return <svg className={className} viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/></svg>;
}

const DEMO_REPOS = [
  { id: 1, name: 'auth-service', description: 'Authentication microservice with JWT and OAuth2', language: 'Python', stargazers_count: 24, forks_count: 8, updated_at: new Date(Date.now()-3600000).toISOString(), private: false, fork: false, owner: { login: 'demo-user' } },
  { id: 2, name: 'api-gateway', description: 'Central API gateway with rate limiting', language: 'Go', stargazers_count: 41, forks_count: 12, updated_at: new Date(Date.now()-86400000).toISOString(), private: false, fork: false, owner: { login: 'demo-user' } },
  { id: 3, name: 'frontend-app', description: 'React + TypeScript + Tailwind CSS app', language: 'TypeScript', stargazers_count: 18, forks_count: 5, updated_at: new Date(Date.now()-172800000).toISOString(), private: true, fork: false, owner: { login: 'demo-user' } },
  { id: 4, name: 'data-pipeline', description: 'ETL pipeline for large dataset processing', language: 'Python', stargazers_count: 7, forks_count: 2, updated_at: new Date(Date.now()-604800000).toISOString(), private: false, fork: false, owner: { login: 'demo-user' } },
  { id: 5, name: 'infra-terraform', description: 'Infrastructure as code using Terraform', language: 'JavaScript', stargazers_count: 15, forks_count: 6, updated_at: new Date(Date.now()-1209600000).toISOString(), private: true, fork: false, owner: { login: 'demo-user' } },
  { id: 6, name: 'notification-service', description: 'Email and push notification service', language: 'TypeScript', stargazers_count: 9, forks_count: 3, updated_at: new Date(Date.now()-2592000000).toISOString(), private: false, fork: false, owner: { login: 'demo-user' } },
  { id: 7, name: 'ml-training', description: 'ML model training pipeline with MLflow', language: 'Python', stargazers_count: 33, forks_count: 11, updated_at: new Date(Date.now()-5184000000).toISOString(), private: false, fork: false, owner: { login: 'demo-user' } },
];

export default function Repositories() {
  const navigate = useNavigate();
  const { githubToken } = useAuth();
  const { repos: ghRepos, loading, error, refetch } = useGitHubRepos(githubToken);

  const repos = githubToken ? ghRepos : DEMO_REPOS;

  const [search, setSearch]   = useState('');
  const [langFilter, setLang] = useState('All');
  const [typeFilter, setType] = useState('All'); // All | Public | Private

  const languages = useMemo(() => {
    const s = new Set(repos.map(r => r.language).filter(Boolean));
    return ['All', ...s];
  }, [repos]);

  const filtered = useMemo(() => {
    let list = repos;
    if (search) list = list.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()));
    if (langFilter !== 'All') list = list.filter(r => r.language === langFilter);
    if (typeFilter === 'Public') list = list.filter(r => !r.private);
    if (typeFilter === 'Private') list = list.filter(r => r.private);
    return list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }, [repos, search, langFilter, typeFilter]);

  return (
    <div className="bg-[#050810] bg-grid min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[#1a2240] bg-[#050810]/95 backdrop-blur-sm px-6 py-3.5 flex items-center gap-4">
        <div>
          <div className="text-[10px] font-mono text-slate-600 tracking-widest">REPOGUARDIAN AI › MY REPOSITORIES</div>
          <h1 className="text-base font-display font-bold text-slate-100 tracking-wider mt-0.5">Repositories</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!githubToken && (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded flex items-center gap-1.5">
              <Github className="w-3 h-3" /> Demo mode — connect GitHub in Settings
            </span>
          )}
          <button onClick={refetch} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#090d1a] border border-[#1a2240] text-slate-400 text-xs font-mono hover:border-slate-600 hover:text-slate-200 transition-all disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a repository..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#090d1a] border border-[#1a2240] rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 font-mono" />
          </div>
          <select value={typeFilter} onChange={e => setType(e.target.value)}
            className="px-3 py-2 text-xs font-mono bg-[#090d1a] border border-[#1a2240] rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500/40">
            <option>All</option><option>Public</option><option>Private</option>
          </select>
          <select value={langFilter} onChange={e => setLang(e.target.value)}
            className="px-3 py-2 text-xs font-mono bg-[#090d1a] border border-[#1a2240] rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500/40">
            {languages.map(l => <option key={l}>{l}</option>)}
          </select>
          <div className="text-xs font-mono text-slate-500 ml-auto">{filtered.length} repositories</div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}

        {/* List */}
        <div className="cyber-border rounded-xl bg-[#090d1a] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
              <div className="text-xs font-mono text-slate-500">Syncing repositories from GitHub...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <GitFork className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <div className="text-sm font-mono">No repositories match your filters.</div>
            </div>
          ) : (
            <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }}>
              {filtered.map(repo => (
                <RepoRow
                  key={repo.id}
                  repo={repo}
                  onClick={() => navigate(`/repositories/${repo.owner?.login || 'demo-user'}/${repo.name}`)}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
