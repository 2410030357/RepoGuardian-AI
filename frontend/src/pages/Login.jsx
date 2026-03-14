import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  Shield, Lock, Eye, EyeOff, ArrowRight, GitBranch,
  Activity, Zap, AlertCircle, Github, Key, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SyncOverlay from '../components/SyncOverlay';
import { fetchGitHubUser } from '../hooks/useGitHub';

const FEATURES = [
  { icon: Shield,    text: 'Autonomous Vulnerability Detection' },
  { icon: Activity,  text: 'Real-time Code Health Monitoring'   },
  { icon: Zap,       text: 'AI-Powered Auto-Fix Suggestions'    },
  { icon: GitBranch, text: 'Multi-Repository Management'        },
];

// ── Google OAuth via Google Identity Services (no npm package needed) ──
function useGoogleAuth(onSuccess) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') return; // skip if not configured
      window.google?.accounts?.id?.initialize({
        client_id: clientId,
        callback: (response) => {
          // Decode the JWT credential
          try {
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            onSuccess({
              name:           payload.name,
              email:          payload.email,
              picture:        payload.picture,
              given_name:     payload.given_name,
              verified_email: payload.email_verified,
            });
          } catch (e) {
            console.error('Google token decode failed', e);
          }
        },
      });
    };
    document.head.appendChild(script);
  }, [onSuccess]);

  const signIn = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
      alert('Google login requires VITE_GOOGLE_CLIENT_ID in your .env file.\n\nUse Email login or GitHub login instead for the demo.');
      return;
    }
    window.google?.accounts?.id?.prompt();
  }, []);

  return { signIn };
}

export default function Login() {
  const { login, isAuthenticated, connectGitHub } = useAuth();
  const navigate = useNavigate();

  const [step,      setStep]      = useState('login'); // 'login' | 'github'
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [remember,  setRemember]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [pending,   setPending]   = useState(null);
  const [showSync,  setShowSync]  = useState(false);
  const [syncName,  setSyncName]  = useState('');

  // GitHub PAT state
  const [ghToken,   setGhToken]   = useState('');
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError,   setGhError]   = useState('');
  const [ghSuccess, setGhSuccess] = useState(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const startSync = useCallback((profile, rememberMe) => {
    setPending({ profile, remember: rememberMe });
    setSyncName(profile.name);
    setShowSync(true);
    setLoading(false);
  }, []);

  const onSyncDone = useCallback(() => {
    if (pending) login(pending.profile, pending.remember);
  }, [pending, login]);

  // Google success handler
  const handleGoogleSuccess = useCallback((profile) => {
    setError('');
    startSync(profile, remember);
  }, [remember, startSync]);

  const { signIn: googleSignIn } = useGoogleAuth(handleGoogleSuccess);

  // Email login
  const handleEmail = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Enter your email and password.'); return; }
    setError(''); setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const profile = {
      name:           email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      email,
      picture:        null,
      given_name:     email.split('@')[0],
      verified_email: true,
    };
    if (ghSuccess) { profile.githubToken = ghToken; profile.githubUser = ghSuccess; }
    startSync(profile, remember);
  };

  // GitHub PAT verify
  const handleGitHubConnect = async () => {
    if (!ghToken.trim()) { setGhError('Paste your GitHub Personal Access Token.'); return; }
    setGhError(''); setGhLoading(true);
    try {
      const user = await fetchGitHubUser(ghToken.trim());
      setGhSuccess(user);
    } catch {
      setGhError('Invalid token. Make sure it has "repo" scope.');
    } finally {
      setGhLoading(false);
    }
  };

  // GitHub full login
  const handleGitHubLogin = async () => {
    if (!ghSuccess) { setGhError('Verify your token first.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    startSync({
      name:           ghSuccess.name || ghSuccess.login,
      email:          ghSuccess.email || `${ghSuccess.login}@github.com`,
      picture:        ghSuccess.avatar_url,
      given_name:     ghSuccess.login,
      verified_email: true,
      githubToken:    ghToken.trim(),
      githubUser:     ghSuccess,
    }, remember);
  };

  const hasGoogleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID &&
    import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID';

  return (
    <>
      <AnimatePresence>{showSync && <SyncOverlay userName={syncName} onComplete={onSyncDone} />}</AnimatePresence>

      <div className="min-h-screen flex bg-[#050810]">

        {/* ── Hero left panel ── */}
        <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden flex-col">
          <div className="absolute inset-0 bg-hero-gradient" />
          <div className="absolute inset-0 bg-grid opacity-60" />
          <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
              style={{ animation: 'scanMove 6s linear infinite', top: 0 }} />
          </div>
          <div className="relative z-10 flex flex-col h-full px-14 py-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center glow-cyan">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-sm font-display font-bold text-slate-100 tracking-widest">REPOGUARDIAN</div>
                <div className="text-[10px] font-mono text-cyan-400/60 tracking-widest">AUTONOMOUS AI SYSTEM</div>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center max-w-lg">
              <div className="text-xs font-mono text-cyan-400 tracking-[0.3em] mb-4">▸ MULTI-AGENT INTELLIGENCE</div>
              <h1 className="text-5xl font-display font-bold text-white leading-tight mb-6">
                Your Repository,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                  Managed by Autonomous Intelligence.
                </span>
              </h1>
              <p className="text-slate-400 text-base leading-relaxed">
                Four AI agents run 24/7 — detecting vulnerabilities, analysing quality,
                resolving dependencies, and generating fixes before threats become incidents.
              </p>
              <div className="mt-10 space-y-3">
                {FEATURES.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                      <Icon className="w-3 h-3 text-cyan-400" />
                    </div>
                    <span className="text-slate-300 text-sm">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex items-center justify-center px-8 relative">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="relative z-10 w-full max-w-md">
            <div className="cyber-border rounded-2xl p-8 bg-[#090d1a]">

              {/* Tab bar */}
              <div className="flex rounded-lg bg-[#0d1220] border border-[#1a2240] p-1 mb-6">
                <button onClick={() => setStep('login')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-mono transition-all ${step === 'login' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Lock className="w-3 h-3" /> Email Login
                </button>
                <button onClick={() => setStep('github')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-mono transition-all ${step === 'github' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Github className="w-3 h-3" /> GitHub Login
                </button>
              </div>

              {/* ── GITHUB TAB ── */}
              {step === 'github' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-slate-100 mb-1">Connect GitHub</h2>
                    <p className="text-slate-500 text-sm mb-4">Sync all your repositories instantly</p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0d1220] border border-[#1a2240] text-xs font-mono text-slate-400 space-y-1">
                    <div className="text-cyan-400 font-semibold mb-2">How to get a token:</div>
                    <div>1. github.com → Settings → Developer settings</div>
                    <div>2. Personal access tokens → Tokens (classic)</div>
                    <div>3. Generate → select <span className="text-cyan-400">repo</span> + <span className="text-cyan-400">read:user</span></div>
                    <div>4. Copy and paste below</div>
                  </div>

                  {ghError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                      <AlertCircle className="w-4 h-4 shrink-0" />{ghError}
                    </div>
                  )}

                  {ghSuccess && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <img src={ghSuccess.avatar_url} alt={ghSuccess.login} className="w-8 h-8 rounded-full" />
                      <div>
                        <div className="text-xs font-semibold text-emerald-400">{ghSuccess.name || ghSuccess.login}</div>
                        <div className="text-[10px] text-slate-500 font-mono">@{ghSuccess.login} · {ghSuccess.public_repos} repos</div>
                      </div>
                      <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-mono text-slate-500 tracking-widest uppercase block mb-2">Personal Access Token</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      <input type="password" value={ghToken}
                        onChange={e => { setGhToken(e.target.value); setGhSuccess(null); setGhError(''); }}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        className="w-full bg-[#0d1220] border border-[#1a2240] rounded-lg pl-10 pr-3 py-3 text-sm text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-500/50 transition-all" />
                    </div>
                  </div>

                  {!ghSuccess
                    ? <button onClick={handleGitHubConnect} disabled={ghLoading}
                        className="w-full py-3 rounded-lg bg-[#0d1220] border border-cyan-500/30 text-cyan-400 font-mono text-sm hover:bg-cyan-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                        {ghLoading
                          ? <><div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" /> Verifying...</>
                          : <><Github className="w-4 h-4" /> Verify Token</>}
                      </button>
                    : <button onClick={handleGitHubLogin} disabled={loading || showSync}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-[#050810] font-display font-bold text-sm tracking-wider transition-all glow-cyan flex items-center justify-center gap-2 disabled:opacity-70">
                        {loading ? 'Launching...' : <>ACCESS COMMAND CENTER <ArrowRight className="w-4 h-4" /></>}
                      </button>
                  }
                </div>
              )}

              {/* ── EMAIL TAB ── */}
              {step === 'login' && (
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-100 mb-1">Welcome back</h2>
                  <p className="text-slate-500 text-sm mb-6">Sign in to your command center</p>

                  {error && (
                    <div className="flex items-start gap-2.5 p-3 mb-5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
                    </div>
                  )}

                  {/* ── Google Sign-In button ── */}
                  <button
                    onClick={googleSignIn}
                    disabled={loading || showSync}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-[#1a2240] bg-[#0d1220] hover:bg-[#111828] hover:border-slate-600 transition-all text-slate-200 text-sm font-medium mb-4 group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {/* Google SVG logo */}
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Continue with Google</span>
                    {!hasGoogleClientId && (
                      <span className="ml-auto text-[10px] font-mono text-amber-400/70"> </span>
                    )}
                  </button>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-[#1a2240]" />
                    <span className="text-xs font-mono text-slate-600">OR</span>
                    <div className="flex-1 h-px bg-[#1a2240]" />
                  </div>

                  {/* Optional GitHub link */}
                  {ghSuccess ? (
                    <div className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <img src={ghSuccess.avatar_url} alt={ghSuccess.login} className="w-7 h-7 rounded-full" />
                      <div className="flex-1 text-xs">
                        <div className="text-emerald-400 font-semibold">GitHub connected</div>
                        <div className="text-slate-500 font-mono">@{ghSuccess.login}</div>
                      </div>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="p-3 mb-4 rounded-lg bg-[#0d1220] border border-[#1a2240]">
                      <div className="text-xs text-slate-500 mb-2 font-mono">Optional: connect GitHub to sync repos</div>
                      <div className="flex gap-2">
                        <input type="password" value={ghToken} onChange={e => setGhToken(e.target.value)}
                          placeholder="ghp_xxxx... (optional)"
                          className="flex-1 bg-[#050810] border border-[#1a2240] rounded px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500/40" />
                        <button onClick={handleGitHubConnect} disabled={!ghToken || ghLoading}
                          className="px-3 py-1.5 text-xs font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/20 transition-all disabled:opacity-40">
                          {ghLoading ? '...' : 'Link'}
                        </button>
                      </div>
                      {ghError && <div className="text-[10px] text-red-400 font-mono mt-1">{ghError}</div>}
                    </div>
                  )}

                  <form onSubmit={handleEmail} className="space-y-4">
                    <div>
                      <label className="text-xs font-mono text-slate-500 tracking-widest uppercase block mb-2">Email</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="admin@example.com"
                        className="w-full bg-[#0d1220] border border-[#1a2240] rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-500/50 transition-all" />
                    </div>
                    <div>
                      <label className="text-xs font-mono text-slate-500 tracking-widest uppercase block mb-2">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input type={showPass ? 'text' : 'password'} value={password}
                          onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                          className="w-full bg-[#0d1220] border border-[#1a2240] rounded-lg pl-10 pr-10 py-3 text-sm text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-500/50 transition-all" />
                        <button type="button" onClick={() => setShowPass(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                        <div onClick={() => setRemember(r => !r)}
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${remember ? 'bg-cyan-500/20 border-cyan-500/60' : 'bg-[#0d1220] border-[#1a2240]'}`}>
                          {remember && <svg className="w-2.5 h-2.5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span className="text-xs text-slate-400">Remember me</span>
                      </label>
                    </div>
                    <button type="submit" disabled={loading || showSync}
                      className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-[#050810] font-display font-bold text-sm tracking-wider transition-all glow-cyan flex items-center justify-center gap-2 mt-2 disabled:opacity-70">
                      {loading && !showSync
                        ? <><div className="w-4 h-4 border-2 border-[#050810]/30 border-t-[#050810] rounded-full animate-spin" />Authenticating...</>
                        : <>ACCESS COMMAND CENTER <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>
                </div>
              )}

              <p className="text-center text-xs text-slate-600 font-mono mt-6">
                Protected by RepoGuardian AI Security Engine™
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
