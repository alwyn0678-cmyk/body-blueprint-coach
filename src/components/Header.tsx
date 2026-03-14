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
    <div className="nav-bar">
      <nav className="nav-pill">
        {NAV_ITEMS.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="nav-item"
          >
            {({ isActive }) => (
              <div className="nav-item-inner">
                <div className={`nav-item-icon-wrap${isActive ? ' active' : ''}`}>
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.38)'}
                    className="nav-item-icon"
                  />
                </div>
                <span
                  className="nav-label"
                  style={{
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                  }}
                >
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
