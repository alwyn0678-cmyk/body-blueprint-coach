import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, BarChart2, Dumbbell, Brain, CheckSquare, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',         Icon: Home,        label: 'Home',     activeColor: '#16A34A' },
  { to: '/log',      Icon: PlusCircle,  label: 'Log',      activeColor: '#16A34A' },
  { to: '/training', Icon: Dumbbell,    label: 'Train',    activeColor: '#3B82F6' },
  { to: '/coach',    Icon: Brain,       label: 'Coach',    activeColor: '#4F46E5' },
  { to: '/habits',   Icon: CheckSquare, label: 'Habits',   activeColor: '#7C3AED' },
  { to: '/progress', Icon: BarChart2,   label: 'Progress', activeColor: '#D97706' },
];

export const Header: React.FC = () => {
  return (
    <div className="nav-bar">
      <nav className="nav-pill">
        {NAV_ITEMS.map(({ to, Icon, label, activeColor }) => (
          <NavLink key={to} to={to} end={to === '/'} className="nav-item">
            {({ isActive }) => (
              <div className={`nav-item-inner${isActive ? ' active' : ''}`}>
                <div className="nav-item-icon-wrap" style={{
                  background: isActive ? `${activeColor}15` : 'transparent',
                }}>
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.3 : 1.6}
                    className="nav-item-icon"
                    style={{ color: isActive ? activeColor : 'var(--nav-icon-inactive)' }}
                  />
                </div>
                <span className="nav-label" style={{
                  fontWeight: isActive ? 800 : 500,
                  color: isActive ? activeColor : 'var(--nav-icon-inactive)',
                  letterSpacing: isActive ? '-0.01em' : '0.01em',
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
