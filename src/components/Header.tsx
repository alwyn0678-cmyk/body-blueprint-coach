import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Dumbbell, Brain, TrendingUp, Settings, UtensilsCrossed } from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { to: '/',          Icon: Home,             label: 'Home'     },
  { to: '/log',       Icon: ClipboardList,    label: 'Log'      },
  { to: '/meal-plan', Icon: UtensilsCrossed,  label: 'Plan'     },
  { to: '/training',  Icon: Dumbbell,         label: 'Train'    },
  { to: '/coach',     Icon: Brain,            label: 'Coach'    },
  { to: '/progress',  Icon: TrendingUp,       label: 'Progress' },
];

// ── Top App Bar ────────────────────────────────────────────────────────────────
export const TopBar: React.FC = () => {
  const { state } = useApp();
  const navigate = useNavigate();
  const user = state.user;
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      zIndex: 50,
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(40px) saturate(1.8)',
      WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 20px', height: 64,
      borderBottom: '1px solid rgba(255,255,255,0.65)',
      boxShadow: '0 1px 0 rgba(87,96,56,0.06), 0 4px 20px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
    }}>
      {/* Left: avatar + brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'linear-gradient(135deg, #576038, #8B9467)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.72rem', fontWeight: 900, color: '#fff',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(87,96,56,0.35), inset 0 1px 0 rgba(255,255,255,0.20)',
        }}>
          {initials}
        </div>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: '1.05rem', fontWeight: 900,
          color: '#576038', letterSpacing: '0.20em',
        }}>
          VITALITY
        </span>
      </div>

      {/* Right: settings — glass icon button */}
      <button
        onClick={() => navigate('/settings')}
        style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.70)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.82)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#576038',
          transition: 'transform 100ms ease, box-shadow 100ms ease',
        }}
      >
        <Settings size={18} strokeWidth={1.8} />
      </button>
    </header>
  );
};

// ── Bottom Navigation ──────────────────────────────────────────────────────────
export const Header: React.FC = () => {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '10px 12px',
      paddingBottom: `calc(18px + env(safe-area-inset-bottom))`,
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(40px) saturate(1.8)',
      WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
      boxShadow: '0 -1px 0 rgba(255,255,255,0.70), 0 -4px 20px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.90)',
      borderTop: '1px solid rgba(87,96,56,0.06)',
      zIndex: 50,
    }}>
      {NAV_ITEMS.map(({ to, Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'} className="nav-pill-link">
          {({ isActive }) => (
            <div className={`nav-pill${isActive ? ' nav-pill--active' : ''}`}>
              <Icon size={18} strokeWidth={isActive ? 2.3 : 1.6} className="nav-pill-icon" />
              <span className="nav-pill-label">{label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
