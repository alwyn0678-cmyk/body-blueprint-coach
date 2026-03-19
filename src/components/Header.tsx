import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, BarChart2, Dumbbell, Brain, CheckSquare, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',         Icon: Home,        label: 'Home',     activeColor: '#22C55E' },
  { to: '/log',      Icon: PlusCircle,  label: 'Log',      activeColor: '#22C55E' },
  { to: '/training', Icon: Dumbbell,    label: 'Train',    activeColor: '#3B82F6' },
  { to: '/coach',    Icon: Brain,       label: 'Coach',    activeColor: '#6366F1' },
  { to: '/habits',   Icon: CheckSquare, label: 'Habits',   activeColor: '#A855F7' },
  { to: '/progress', Icon: BarChart2,   label: 'Progress', activeColor: '#F59E0B' },
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
                  background: isActive ? `${activeColor}18` : 'transparent',
                }}>
                  <Icon
                    size={19}
                    strokeWidth={isActive ? 2.2 : 1.7}
                    color={isActive ? activeColor : 'rgba(255,255,255,0.35)'}
                    className="nav-item-icon"
                  />
                </div>
                <span className="nav-label" style={{
                  fontWeight: isActive ? 800 : 500,
                  color: isActive ? activeColor : 'rgba(255,255,255,0.3)',
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
