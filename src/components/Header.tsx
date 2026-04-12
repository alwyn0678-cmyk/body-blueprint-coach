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
      background: 'rgba(250,249,246,0.75)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 24px', height: 64,
      borderBottom: '1px solid rgba(87,96,56,0.06)',
    }}>
      {/* Left: avatar + brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, #576038, #974400)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 900, color: '#fff',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: '1.2rem', fontWeight: 900,
          color: '#576038', letterSpacing: '0.18em',
        }}>
          VITALITY
        </span>
      </div>

      {/* Right: settings */}
      <button
        onClick={() => navigate('/settings')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 6,
          color: '#576038', opacity: 0.85,
          transition: 'opacity 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Settings size={22} strokeWidth={1.8} />
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
      padding: '10px 16px',
      paddingBottom: `calc(20px + env(safe-area-inset-bottom))`,
      background: 'rgba(250,249,246,0.80)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 -12px 40px rgba(26,28,26,0.06)',
      borderTop: '1px solid rgba(87,96,56,0.06)',
      zIndex: 50,
    }}>
      {NAV_ITEMS.map(({ to, Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'} style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: isActive ? '7px 10px' : '7px 7px',
              borderRadius: 9999,
              background: isActive ? '#576038' : 'transparent',
              transition: 'all 0.2s ease',
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
              gap: 3,
            }}
              onTouchStart={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(87,96,56,0.08)'; }}
              onTouchEnd={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.6}
                style={{ color: isActive ? '#FAF9F6' : '#46483d' }}
              />
              <span style={{
                fontSize: '0.5rem', fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: isActive ? '#FAF9F6' : '#46483d',
                lineHeight: 1,
              }}>
                {label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
