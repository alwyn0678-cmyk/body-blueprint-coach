import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, Activity, Dumbbell, HeartPulse } from 'lucide-react';

export const Header: React.FC = () => {
  const navStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    color: isActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.4)',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
    position: 'relative' as const,
    flex: 1
  });

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '0 1rem',
      paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
      zIndex: 50,
      pointerEvents: 'none'
    }}>
      <header style={{
        backgroundColor: 'rgba(28, 28, 30, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-full)',
        padding: '0.75rem 0.5rem',
        display: 'flex',
        justifyContent: 'space-around',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        pointerEvents: 'auto',
        maxWidth: '460px',
        margin: '0 auto'
      }}>
        <NavLink to="/" style={navStyle}>
          {({ isActive }) => (
            <>
              <Home size={22} />
              <span className="text-caption" style={{ fontSize: '9px', fontWeight: isActive ? 700 : 500, color: 'inherit' }}>Home</span>
            </>
          )}
        </NavLink>
        
        <NavLink to="/log" style={navStyle}>
          {({ isActive }) => (
            <>
              <PlusCircle size={22} />
              <span className="text-caption" style={{ fontSize: '9px', fontWeight: isActive ? 700 : 500, color: 'inherit' }}>Log</span>
            </>
          )}
        </NavLink>
        
        <NavLink to="/progress" style={navStyle}>
          {({ isActive }) => (
            <>
              <Activity size={22} />
              <span className="text-caption" style={{ fontSize: '9px', fontWeight: isActive ? 700 : 500, color: 'inherit' }}>Analytics</span>
            </>
          )}
        </NavLink>

        <NavLink to="/training" style={navStyle}>
          {({ isActive }) => (
             <>
              <Dumbbell size={22} />
              <span className="text-caption" style={{ fontSize: '9px', fontWeight: isActive ? 700 : 500, color: 'inherit' }}>Train</span>
            </>
          )}
        </NavLink>

        <NavLink to="/health" style={navStyle}>
          {({ isActive }) => (
             <>
              <HeartPulse size={22} />
              <span className="text-caption" style={{ fontSize: '9px', fontWeight: isActive ? 700 : 500, color: 'inherit' }}>Health</span>
            </>
          )}
        </NavLink>
      </header>
    </div>
  );
};
