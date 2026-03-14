import React from 'react';

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  elevated?: boolean;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', style, onClick, elevated, glass }) => {
  const base = glass ? 'card-glass' : elevated ? 'card-elevated' : 'card';
  const interactive = onClick ? ' card-interactive' : '';
  return (
    <div
      className={`${base}${interactive} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// ── Section Label ─────────────────────────────────────────────────────────────
interface SectionLabelProps {
  title: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ title, action, style }) => (
  <div
    className="flex-row justify-between align-center"
    style={{ paddingBottom: '0.25rem', ...style }}
  >
    <span className="section-title">{title}</span>
    {action}
  </div>
);

// ── Progress Bar ──────────────────────────────────────────────────────────────
interface ProgressBarProps {
  current: number;
  max: number;
  color?: string;
  label?: string;
  showValues?: boolean;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  max,
  color = 'var(--accent-primary)',
  label,
  showValues = true,
  height = 5,
}) => {
  const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;

  return (
    <div className="flex-col gap-1 w-full">
      {(label || showValues) && (
        <div className="flex-row justify-between align-center" style={{ marginBottom: '2px' }}>
          {label && (
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {label}
            </span>
          )}
          {showValues && (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(current)}<span style={{ opacity: 0.6, margin: '0 2px' }}>/</span>{max}
            </span>
          )}
        </div>
      )}
      <div style={{
        height,
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: color,
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.5s cubic-bezier(0.25,1,0.5,1)',
        }} />
      </div>
    </div>
  );
};

// ── Macro Bar ─────────────────────────────────────────────────────────────────
interface MacroBarProps {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
}

export const MacroBar: React.FC<MacroBarProps> = ({ label, value, target, color, unit = 'g' }) => {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="flex-col gap-1" style={{ flex: 1 }}>
      <div className="flex-row justify-between align-center">
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(value)}<span style={{ opacity: 0.6 }}>{unit}</span>
        </span>
      </div>
      <div style={{ height: 3, width: '100%', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
};

// ── Stat Block ────────────────────────────────────────────────────────────────
interface StatBlockProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  accent?: string;
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
}

export const StatBlock: React.FC<StatBlockProps> = ({
  label, value, unit, icon, accent, badge, badgeColor, onClick
}) => (
  <div
    className={`flex-col${onClick ? ' card-interactive' : ''}`}
    onClick={onClick}
    style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      padding: '0.875rem',
      gap: '0.5rem',
      cursor: onClick ? 'pointer' : 'default',
    }}
  >
    <div className="flex-row justify-between align-start">
      {icon && <div style={{ color: accent || 'var(--text-secondary)' }}>{icon}</div>}
      {badge && (
        <span style={{
          fontSize: '0.625rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: badgeColor || 'var(--text-tertiary)',
          padding: '0.15rem 0.45rem',
          backgroundColor: badgeColor ? `${badgeColor}18` : 'rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-full)',
        }}>
          {badge}
        </span>
      )}
    </div>
    <div className="flex-col" style={{ gap: '2px' }}>
      <div className="flex-row align-baseline gap-1">
        <span style={{
          fontSize: '1.375rem',
          fontWeight: 800,
          color: accent || 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
            {unit}
          </span>
        )}
      </div>
      <span style={{
        fontSize: '0.625rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: 'var(--text-tertiary)',
      }}>
        {label}
      </span>
    </div>
  </div>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────
export const Skeleton: React.FC<{
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}> = ({ width = '100%', height = '1rem', borderRadius = 'var(--radius-sm)', className = '' }) => (
  <div className={`skeleton ${className}`} style={{ width, height, borderRadius }} />
);

// ── MacroCircle (legacy — kept for backward compat) ───────────────────────────
export const MacroCircle: React.FC<{
  label: string;
  current: number;
  target: number;
  color: string;
}> = ({ label, current, target, color }) => {
  const pct = Math.min((current / target) * 100, 100);
  const size = 60;
  const stroke = 5;
  const radius = (size / 2) - (stroke / 2);
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex-col align-center gap-1">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} fill="transparent" />
          <circle
            cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={stroke} fill="transparent"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(current)}g
        </div>
      </div>
      <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
    </div>
  );
};
