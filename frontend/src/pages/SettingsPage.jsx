import { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Key, CheckCircle, AlertCircle, Shield, Bell, Eye, Trash2, ExternalLink, RefreshCw, User, Lock, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchGitHubUser } from '../hooks/useGitHub';

const panelV = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const containerV = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

function Section({ title, icon: Icon, children }) {
  return (
    <motion.div variants={panelV} className="cyber-border rounded-xl bg-[#090d1a] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1a2240]">
        <Icon className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-display font-semibold text-slate-200 tracking-wide">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

function Toggle({ label, sub, value, onChange }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-[#1a2240] last:border-0">
      <div>
        <div className="text-sm text-slate-200">{label}</div>
        {sub && <div className="text-xs text-slate-500 font-mono mt-0.5">{sub}</div>}
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative w-10 h-5.5 rounded-full transition-all shrink-0 ${value ? 'bg-cyan-500' : 'bg-[#1a2240]'}`}
        style={{ height: 22, width: 40 }}>
        <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all shadow`}
          style={{ width: 18, height: 18, left: value ? 20 : 2 }} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user, githubToken, githubUser, connectGitHub, logout } = useAuth();

  const [ghInput,  setGhInput]  = useState('');
  const [ghLoad,   setGhLoad]   = useState(false);
  const [ghErr,    setGhErr]    = useState('');
  const [ghOk,     setGhOk]     = useState(false);

  const [notifyAlerts, setNotifyAlerts] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(false);
  const [autoScan,     setAutoScan]     = useState(true);
  const [darkMode,     setDarkMode]     = useState(true);

  const displayName  = githubUser?.name  || user?.name  || 'User';
  const displayEmail = githubUser?.email || user?.email || '—';
  const avatar       = githubUser?.avatar_url || user?.picture;
  const initials     = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleConnectGitHub = async () => {
    if (!ghInput.trim()) { setGhErr('Paste your GitHub Personal Access Token.'); return; }
    setGhErr(''); setGhLoad(true);
    try {
      const ghU = await fetchGitHubUser(ghInput.trim());
      connectGitHub(ghInput.trim(), ghU);
      setGhOk(true);
      setGhInput('');
    } catch {
      setGhErr('Invalid token. Ensure it has "repo" and "read:user" scopes.');
    } finally {
      setGhLoad(false);
    }
  };

  const handleDisconnectGitHub = () => {
    connectGitHub(null, null);
    setGhOk(false);
  };

  return (
    <div className="bg-[#050810] bg-grid min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[#1a2240] bg-[#050810]/95 backdrop-blur-sm px-6 py-3.5">
        <div className="text-[10px] font-mono text-slate-600 tracking-widest">REPOGUARDIAN AI › SETTINGS</div>
        <h1 className="text-base font-display font-bold text-slate-100 tracking-wider mt-0.5">Settings</h1>
      </header>

      <div className="p-6 max-w-2xl space-y-5">
        <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-5">

          {/* Profile */}
          <Section title="Profile" icon={User}>
            <div className="flex items-center gap-4 mb-5">
              {avatar
                ? <img src={avatar} alt={displayName} referrerPolicy="no-referrer" className="w-14 h-14 rounded-full ring-2 ring-cyan-500/30" />
                : <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-lg font-bold text-white">{initials}</div>
              }
              <div>
                <div className="text-base font-semibold text-slate-100">{displayName}</div>
                <div className="text-sm text-slate-500 font-mono">{displayEmail}</div>
                {githubUser && <div className="text-xs text-cyan-400 font-mono mt-0.5">@{githubUser.login} · {githubUser.public_repos} public repos</div>}
              </div>
            </div>
            <button onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono hover:bg-red-500/20 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Sign Out
            </button>
          </Section>

          {/* GitHub Connection */}
          <Section title="GitHub Integration" icon={Github}>
            {githubToken && githubUser ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <img src={githubUser.avatar_url} alt={githubUser.login} className="w-9 h-9 rounded-full" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-emerald-400">{githubUser.name || githubUser.login}</div>
                    <div className="text-xs text-slate-500 font-mono">@{githubUser.login} · {githubUser.public_repos} repos · {githubUser.followers} followers</div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-[#0d1220] border border-[#1a2240]">
                    <div className="text-lg font-display font-bold text-slate-100">{githubUser.public_repos}</div>
                    <div className="text-[10px] font-mono text-slate-500">Public Repos</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0d1220] border border-[#1a2240]">
                    <div className="text-lg font-display font-bold text-slate-100">{githubUser.total_private_repos || 0}</div>
                    <div className="text-[10px] font-mono text-slate-500">Private Repos</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0d1220] border border-[#1a2240]">
                    <div className="text-lg font-display font-bold text-slate-100">{githubUser.followers}</div>
                    <div className="text-[10px] font-mono text-slate-500">Followers</div>
                  </div>
                </div>
                <a href={`https://github.com/${githubUser.login}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors">
                  <ExternalLink className="w-3 h-3" /> View GitHub Profile
                </a>
                <button onClick={handleDisconnectGitHub}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono hover:bg-red-500/20 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Disconnect GitHub
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {(ghOk && !githubToken) && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                    <CheckCircle className="w-4 h-4" /> Connected successfully! Reload the page to see your repos.
                  </div>
                )}

                <div className="p-3 rounded-lg bg-[#0d1220] border border-[#1a2240] text-xs font-mono text-slate-400 space-y-1.5">
                  <div className="text-cyan-400 font-semibold mb-2">How to create a Personal Access Token:</div>
                  <div>1. Visit <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">github.com/settings/tokens</a></div>
                  <div>2. Click <span className="text-slate-200">Generate new token (classic)</span></div>
                  <div>3. Select scopes: <span className="text-cyan-400">repo</span>, <span className="text-cyan-400">read:user</span></div>
                  <div>4. Generate and paste below</div>
                </div>

                {ghErr && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                    <AlertCircle className="w-4 h-4" />{ghErr}
                  </div>
                )}

                <div>
                  <label className="text-xs font-mono text-slate-500 tracking-widest uppercase block mb-2">Personal Access Token</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input type="password" value={ghInput} onChange={e => setGhInput(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#0d1220] border border-[#1a2240] rounded-lg text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-500/40" />
                    </div>
                    <button onClick={handleConnectGitHub} disabled={ghLoad}
                      className="px-4 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono hover:bg-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap">
                      {ghLoad ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying</> : <><Github className="w-3.5 h-3.5" /> Connect</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Notifications */}
          <Section title="Notifications" icon={Bell}>
            <Toggle label="Critical alerts" sub="Get notified when CRITICAL vulnerabilities are found" value={notifyAlerts} onChange={setNotifyAlerts} />
            <Toggle label="Weekly summary" sub="Receive a weekly repository health digest" value={notifyWeekly} onChange={setNotifyWeekly} />
          </Section>

          {/* Analysis */}
          <Section title="Analysis Settings" icon={Shield}>
            <Toggle label="Automatic scanning" sub="Run AI analysis every 6 hours on all repositories" value={autoScan} onChange={setAutoScan} />
            <div className="pt-3">
              <div className="text-sm text-slate-200 mb-1">Scan frequency</div>
              <select className="px-3 py-2 text-xs font-mono bg-[#0d1220] border border-[#1a2240] rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500/40" disabled={!autoScan}>
                <option>Every 6 hours</option>
                <option>Every 12 hours</option>
                <option>Every 24 hours</option>
                <option>Weekly</option>
              </select>
            </div>
          </Section>

          {/* Appearance */}
          <Section title="Appearance" icon={Eye}>
            <Toggle label="Dark mode" sub="Use dark theme (recommended)" value={darkMode} onChange={setDarkMode} />
          </Section>

          {/* About */}
          <motion.div variants={panelV} className="text-center py-4">
            <div className="text-xs font-mono text-slate-600">RepoGuardian AI v2.4.1 · Built with Claude AI</div>
            <div className="text-xs font-mono text-slate-700 mt-1">Autonomous Multi-Agent Repository Intelligence</div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
