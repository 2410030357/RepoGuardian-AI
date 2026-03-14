import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, GitFork, ScrollText, Settings,
  Shield, LogOut, ChevronRight, Circle, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/repositories', icon: GitFork,          label: 'My Repositories' },
  { to: '/logs',         icon: ScrollText,        label: 'Agent Logs'      },
  { to: '/settings',     icon: Settings,          label: 'Settings'        },
];

export default function Sidebar() {
  const { user, logout, githubUser } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const displayName  = githubUser?.name  || githubUser?.login || user?.name  || 'User';
  const displayEmail = githubUser?.login ? `@${githubUser.login}` : user?.email || '—';
  const avatar       = githubUser?.avatar_url || user?.picture;
  const initials     = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <aside style={{
      width: 240, flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      background: 'var(--bg-2)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 20,
      transition: 'background 0.2s, border-color 0.2s',
    }}>

      {/* Logo + theme toggle */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield style={{ width: 14, height: 14, color: '#a78bfa' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>RepoGuardian</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>AI v2.4</div>
          </div>
        </div>

        {/* ── Theme toggle ── */}
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-3)', border: '1px solid var(--border)', cursor: 'pointer',
            color: 'var(--text-2)', transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--purple-fg)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
        >
          {theme === 'dark'
            ? <Sun style={{ width: 13, height: 13 }} />
            : <Moon style={{ width: 13, height: 13 }} />
          }
        </button>
      </div>

      {/* Agents pill */}
      <div style={{ margin: '10px 10px 4px', padding: '7px 12px', background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.2)', borderRadius: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Circle style={{ width: 8, height: 8, color: '#3fb950', fill: '#3fb950' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>4 Agents Active</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Running continuous scans</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, marginBottom: 2,
              fontSize: 13, fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--text)' : 'var(--text-2)',
              background: isActive ? 'var(--bg-3)' : 'transparent',
              border: isActive ? '1px solid var(--border)' : '1px solid transparent',
              textDecoration: 'none', transition: 'all 0.12s',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon style={{ width: 15, height: 15, flexShrink: 0, color: isActive ? 'var(--purple-fg)' : 'var(--text-3)' }} />
                <span style={{ flex: 1 }}>{label}</span>
                {isActive && <ChevronRight style={{ width: 12, height: 12, color: 'var(--text-3)' }} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User strip */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {avatar
            ? <img src={avatar} alt={displayName} referrerPolicy="no-referrer"
                style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', flexShrink: 0 }} />
            : <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#7c3aed,#388bfd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                {initials}
              </div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayEmail}</div>
          </div>
          <button onClick={handleLogout} title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'var(--text-3)', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
            <LogOut style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>
    </aside>
  );
}