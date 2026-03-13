import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: (e: React.MouseEvent<HTMLDivElement>) => void }> = ({ children, className = '', style, onClick }) => (
  <div 
    className={`card ${className}`} 
    style={{ ...style, cursor: onClick ? 'pointer' : 'default' }} 
    onClick={onClick}
  >
    {children}
  </div>
);

// Progress Bar Component
interface ProgressBarProps {
  current: number;
  max: number;
  color?: string; // CSS color string or variable
  label?: string;
  showValues?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  current, 
  max, 
  color = 'var(--accent-primary)', 
  label,
  showValues = true
}) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100)) || 0;
  
  return (
    <div className="flex-col gap-1 w-full" style={{ width: '100%' }}>
      {(label || showValues) && (
        <div className="flex-row justify-between w-full" style={{ marginBottom: '4px' }}>
          {label && <span className="text-body font-medium" style={{ color: 'var(--text-main)', letterSpacing: '0.02em' }}>{label}</span>}
          {showValues && (
            <span className="text-caption" style={{ color: 'var(--text-muted)' }}>
              {Math.round(current)}<span style={{ color: 'var(--text-light)', margin: '0 2px' }}>/</span>{max}
            </span>
          )}
        </div>
      )}
      <div 
        style={{ 
          height: '10px', 
          width: '100%', 
          backgroundColor: 'var(--bg-card-hover)', 
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
        }}
      >
        <div 
          style={{ 
            height: '100%', 
            width: `${percentage}%`, 
            backgroundColor: color,
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
            boxShadow: `0 0 10px ${color}` // Native glow effect
          }} 
        />
      </div>
    </div>
  );
};
