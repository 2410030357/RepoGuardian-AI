import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Repositories from './pages/Repositories';
import RepoDetail from './pages/RepoDetail';
import AgentLogsPage from './pages/AgentLogsPage';
import SettingsPage from './pages/SettingsPage';
import { Shield } from 'lucide-react';

function Loader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050810] gap-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" style={{ animationDuration: '1.2s' }} />
        <div className="relative w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
          <Shield className="w-6 h-6 text-cyan-400" />
        </div>
      </div>
      <div className="text-xs font-mono text-slate-600 tracking-widest animate-pulse">INITIALISING REPOGUARDIAN...</div>
    </div>
  );
}

function Protected({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function Public({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Loader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Public><Login /></Public>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/repositories" element={<Protected><Repositories /></Protected>} />
        <Route path="/repositories/:owner/:repo" element={<Protected><RepoDetail /></Protected>} />
        <Route path="/logs" element={<Protected><AgentLogsPage /></Protected>} />
        <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
