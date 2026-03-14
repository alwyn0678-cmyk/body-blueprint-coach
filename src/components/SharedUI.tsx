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
          backgroundColor: 'var(--border-color)', 
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden'
        }}
      >
        <div 
          style={{ 
            height: '100%', 
            width: `${percentage}%`, 
            backgroundColor: color,
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
          }} 
        />
      </div>
    </div>
  );
};

export const Skeleton: React.FC<{ width?: string, height?: string, borderRadius?: string, className?: string }> = ({ width = '100%', height = '1rem', borderRadius = 'var(--radius-sm)', className = '' }) => {
  return (
    <div className={`skeleton ${className}`} style={{ width, height, borderRadius }} />
  );
};

export const MacroCircle: React.FC<{ label: string, current: number, target: number, color: string }> = ({ label, current, target, color }) => {
  const percentage = Math.min((current / target) * 100, 100);
  const size = 60;
  const stroke = 6;
  const radius = (size / 2) - (stroke / 2);
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex-col align-center gap-1">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--bg-primary)"
            strokeWidth={stroke}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.65rem', fontWeight: 700 }}>
          {Math.round(current)}g
        </div>
      </div>
      <span className="text-caption font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
};
