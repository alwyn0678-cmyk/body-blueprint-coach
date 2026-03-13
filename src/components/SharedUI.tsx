import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: (e: React.MouseEvent<HTMLDivElement>) => void }> = ({ children, className = '', style, onClick }) => (
  <div className={`card ${className}`} style={style} onClick={onClick}>
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
  color = 'var(--accent-teal)', 
  label,
  showValues = true
}) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100)) || 0;
  
  return (
    <div className="flex-col gap-1 w-full" style={{ width: '100%' }}>
      {(label || showValues) && (
        <div className="flex-row justify-between w-full">
          {label && <span className="text-subtitle font-medium">{label}</span>}
          {showValues && (
            <span className="text-caption">
              {Math.round(current)} / {max}
            </span>
          )}
        </div>
      )}
      <div 
        style={{ 
          height: '8px', 
          width: '100%', 
          backgroundColor: 'var(--border-color)', 
          borderRadius: '4px',
          overflow: 'hidden'
        }}
      >
        <div 
          style={{ 
            height: '100%', 
            width: `${percentage}%`, 
            backgroundColor: color,
            transition: 'width 0.4s ease'
          }} 
        />
      </div>
    </div>
  );
};
