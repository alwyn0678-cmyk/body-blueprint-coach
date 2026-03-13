import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, Activity, Settings } from 'lucide-react';

export const Header: React.FC = () => {
  const navStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    color: isActive ? 'var(--accent-primary)' : 'var(--text-light)',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
    position: 'relative' as const,
    flex: 1
  });

  return (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '0 1rem',
      paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
      zIndex: 50,
      pointerEvents: 'none' // Allow clicking through the container edges
    }}>
      <header style={{
        backgroundColor: 'rgba(28, 30, 35, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: 'var(--radius-full)',
        padding: '0.75rem 0.5rem',
        display: 'flex',
        justifyContent: 'space-around',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        pointerEvents: 'auto', // Re-enable pointer events for the bar itself
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <NavLink to="/" style={navStyle}>
          {({ isActive }) => (
            <>
              <Home size={24} />
              <span className="text-caption" style={{ fontSize: '10px', fontWeight: isActive ? 700 : 600 }}>Home</span>
              {isActive && <div style={{ position: 'absolute', bottom: -12, width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)' }} />}
            </>
          )}
        </NavLink>
        
        <NavLink to="/log" style={navStyle}>
          {({ isActive }) => (
            <>
              <PlusCircle size={24} />
              <span className="text-caption" style={{ fontSize: '10px', fontWeight: isActive ? 700 : 600 }}>Log</span>
              {isActive && <div style={{ position: 'absolute', bottom: -12, width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)' }} />}
            </>
          )}
        </NavLink>
        
        <NavLink to="/progress" style={navStyle}>
          {({ isActive }) => (
            <>
              <Activity size={24} />
              <span className="text-caption" style={{ fontSize: '10px', fontWeight: isActive ? 700 : 600 }}>Progress</span>
              {isActive && <div style={{ position: 'absolute', bottom: -12, width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)' }} />}
            </>
          )}
        </NavLink>
        
        <NavLink to="/settings" style={navStyle}>
          {({ isActive }) => (
             <>
              <Settings size={24} />
              <span className="text-caption" style={{ fontSize: '10px', fontWeight: isActive ? 700 : 600 }}>Settings</span>
              {isActive && <div style={{ position: 'absolute', bottom: -12, width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)' }} />}
            </>
          )}
        </NavLink>
      </header>
    </div>
  );
};
