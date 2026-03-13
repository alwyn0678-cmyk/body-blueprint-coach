import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, Activity, Settings } from 'lucide-react';

export const Header: React.FC = () => {
  const navStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    color: isActive ? 'var(--accent-terracotta)' : 'var(--text-light)',
    transition: 'color 0.2s',
  });

  return (
    <header style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'var(--bg-card)',
      borderTop: '1px solid var(--border-color)',
      padding: '0.75rem 1rem',
      paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
      display: 'flex',
      justifyContent: 'space-around',
      zIndex: 50,
      boxShadow: '0 -4px 12px rgba(0,0,0,0.03)'
    }}>
      <NavLink to="/" style={navStyle}>
        <Home size={24} />
        <span className="text-caption" style={{ fontSize: '10px' }}>Home</span>
      </NavLink>
      
      <NavLink to="/log" style={navStyle}>
        <PlusCircle size={24} />
        <span className="text-caption" style={{ fontSize: '10px' }}>Log</span>
      </NavLink>
      
      <NavLink to="/progress" style={navStyle}>
        <Activity size={24} />
        <span className="text-caption" style={{ fontSize: '10px' }}>Progress</span>
      </NavLink>
      
      <NavLink to="/settings" style={navStyle}>
        <Settings size={24} />
        <span className="text-caption" style={{ fontSize: '10px' }}>Settings</span>
      </NavLink>
    </header>
  );
};
