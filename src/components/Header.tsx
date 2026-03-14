import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, BarChart2, Dumbbell, HeartPulse, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',         Icon: Home,       label: 'Home' },
  { to: '/log',      Icon: PlusCircle, label: 'Log' },
  { to: '/progress', Icon: BarChart2,  label: 'Progress' },
  { to: '/training', Icon: Dumbbell,   label: 'Train' },
  { to: '/health',   Icon: HeartPulse, label: 'Health' },
  { to: '/settings', Icon: Settings,   label: 'Settings' },
];

export const Header: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '480px',
      padding: '0 0.875rem',
      paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom))',
      zIndex: 45,
      pointerEvents: 'none',
    }}>
      <nav style={{
        backgroundColor: 'rgba(18,18,18,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '9999px',
        padding: '0.5rem 0.5rem',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        pointerEvents: 'auto',
      }}>
        {NAV_ITEMS.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
          >
            {({ isActive }) => (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '0.4rem 0.2rem',
                borderRadius: '9999px',
                minWidth: 44,
                transition: 'all 0.2s ease',
              }}>
                <div style={{
                  width: 38,
                  height: 32,
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  transition: 'background-color 0.2s ease',
                }}>
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.38)'}
                    style={{ transition: 'color 0.2s ease' }}
                  />
                </div>
                <span style={{
                  fontSize: '9.5px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                  transition: 'color 0.2s ease',
                }}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
