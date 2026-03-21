import React from 'react';

// ── Toast interface (shared — AppContext uses its own inline version) ──────────
export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  /** high = 5 s stay + stronger border; normal/low = 3 s */
  priority?: 'low' | 'normal' | 'high';
}

// ── CSS keyframes injected once ───────────────────────────────────────────────
const KEYFRAMES = `
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
@keyframes pulse-ring {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.45; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

let _injected = false;
function injectKeyframes() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}
injectKeyframes();

// ── Shared style tokens ────────────────────────────────────────────────────────
const T = {
  bg:       '#000000',
  card:     '#0D0D0D',
  cardAlt:  '#141414',
  border:   'rgba(0,0,0,0.06)',
  borderMd: 'rgba(0,0,0,0.08)',
  text:     '#FFFFFF',
  muted:    'rgba(0,0,0,0.30)',
  subtle:   'rgba(0,0,0,0.14)',
  accent:   'var(--accent-primary, #576038)',
  green:    'var(--accent-green, #576038)',
  red:      '#EF4444',
  amber:    '#F59E0B',
  radius:   {
    xs:  '6px',
    sm:  '10px',
    md:  '14px',
    lg:  '18px',
    xl:  '22px',
    full:'9999px',
  },
};

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
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: T.radius.full,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: color,
          borderRadius: T.radius.full,
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
      <div style={{ height: 3, width: '100%', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: T.radius.full, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: T.radius.full, transition: 'width 0.5s ease' }} />
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
          backgroundColor: badgeColor ? `${badgeColor}18` : 'rgba(0,0,0,0.05)',
          borderRadius: T.radius.full,
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
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const size = 60;
  const stroke = 5;
  const radius = (size / 2) - (stroke / 2);
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex-col align-center gap-1">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} fill="transparent" />
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

// ── EmptyState ────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, emoji, title, subtitle, action }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1.5rem',
    gap: '0.75rem',
    textAlign: 'center',
  }}>
    {icon && (
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '9999px',
        backgroundColor: 'rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.25rem',
        color: 'rgba(0,0,0,0.28)',
      }}>
        {icon}
      </div>
    )}
    {!icon && emoji && (
      <div style={{ fontSize: '2.5rem', lineHeight: 1, marginBottom: '0.25rem' }}>
        {emoji}
      </div>
    )}
    <span style={{
      fontSize: '1rem',
      fontWeight: 700,
      color: T.text,
      letterSpacing: '-0.01em',
    }}>
      {title}
    </span>
    {subtitle && (
      <span style={{
        fontSize: '0.875rem',
        fontWeight: 400,
        color: T.muted,
        maxWidth: '22rem',
        lineHeight: 1.5,
      }}>
        {subtitle}
      </span>
    )}
    {action && (
      <button
        onClick={action.onClick}
        style={{
          marginTop: '0.5rem',
          padding: '0.625rem 1.5rem',
          backgroundColor: T.accent,
          color: T.text,
          border: 'none',
          borderRadius: T.radius.full,
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {action.label}
      </button>
    )}
  </div>
);

// ── LoadingSkeleton ───────────────────────────────────────────────────────────
interface LoadingSkeletonProps {
  rows?: number;
  type?: 'list' | 'card' | 'chart';
  variant?: 'text' | 'card' | 'food-row' | 'chart';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ rows = 3, type = 'list', variant }) => {
  // variant takes priority over legacy type prop
  const resolvedVariant = variant ?? (type === 'card' ? 'card' : type === 'chart' ? 'chart' : 'text');

  if (resolvedVariant === 'card') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Skeleton width="100%" height="120px" borderRadius={T.radius.md} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton width="60%" height="14px" borderRadius={T.radius.xs} />
          <Skeleton width="30%" height="14px" borderRadius={T.radius.xs} />
        </div>
      </div>
    );
  }

  if (resolvedVariant === 'chart') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '120px', gap: '6px' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              width="100%"
              height={`${40 + Math.round(Math.random() * 60)}px`}
              borderRadius={T.radius.xs}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} width="100%" height="10px" borderRadius={T.radius.xs} />
          ))}
        </div>
      </div>
    );
  }

  if (resolvedVariant === 'food-row') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton width="55%" height="14px" borderRadius={T.radius.xs} />
              <Skeleton width="35%" height="11px" borderRadius={T.radius.xs} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <Skeleton width="36px" height="16px" borderRadius={T.radius.xs} />
              <Skeleton width="28px" height="11px" borderRadius={T.radius.xs} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // text (default)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} width={i % 3 === 2 ? '70%' : '100%'} height="14px" borderRadius={T.radius.xs} />
      ))}
    </div>
  );
};

// ── SettingsRow ───────────────────────────────────────────────────────────────
interface SettingsRowProps {
  label: string;
  subtitle?: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  chevron?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  label, subtitle, value, icon, onPress, danger, chevron,
}) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        backgroundColor: hovered && onPress ? 'rgba(0,0,0,0.03)' : 'transparent',
        cursor: onPress ? 'pointer' : 'default',
        transition: 'background-color 0.15s ease',
        borderRadius: T.radius.sm,
        userSelect: 'none',
      }}
    >
      {icon && (
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: T.radius.xs,
          backgroundColor: 'rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: T.muted,
          flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.9375rem',
          fontWeight: 500,
          color: danger ? T.red : T.text,
          lineHeight: 1.3,
        }}>
          {label}
        </div>
        {subtitle && (
          <div style={{
            fontSize: '0.8125rem',
            color: T.muted,
            marginTop: '1px',
            lineHeight: 1.4,
          }}>
            {subtitle}
          </div>
        )}
      </div>
      {value && (
        <div style={{ fontSize: '0.875rem', color: T.muted, flexShrink: 0 }}>
          {value}
        </div>
      )}
      {chevron && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
          <path d="M6 4L10 8L6 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
};

// ── ToggleRow ─────────────────────────────────────────────────────────────────
interface ToggleRowProps {
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({ label, subtitle, value, onChange, disabled }) => (
  <div
    onClick={() => !disabled && onChange(!value)}
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 0',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      userSelect: 'none',
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: T.text, lineHeight: 1.3 }}>
        {label}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.8125rem', color: T.muted, marginTop: '1px', lineHeight: 1.4 }}>
          {subtitle}
        </div>
      )}
    </div>
    {/* iOS-style toggle */}
    <div style={{
      width: '44px',
      height: '26px',
      borderRadius: T.radius.full,
      backgroundColor: value ? T.green : 'rgba(0,0,0,0.10)',
      position: 'relative',
      flexShrink: 0,
      transition: 'background-color 0.2s ease',
    }}>
      <div style={{
        position: 'absolute',
        top: '3px',
        left: value ? '21px' : '3px',
        width: '20px',
        height: '20px',
        borderRadius: T.radius.full,
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  </div>
);

// ── MetricCard ────────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  color?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label, value, unit, trend, trendValue, color, onClick, icon,
}) => {
  const trendColor = trend === 'up' ? T.green : trend === 'down' ? T.red : T.muted;
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—';

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.md,
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        cursor: onClick ? 'pointer' : 'default',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted }}>
          {label}
        </span>
        {icon && <span style={{ color: color || T.muted, display: 'flex' }}>{icon}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: '4px' }}>
        <span style={{
          fontSize: '1.625rem',
          fontWeight: 800,
          color: color || T.text,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: T.muted }}>
            {unit}
          </span>
        )}
      </div>
      {(trend || trendValue) && (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: trendColor }}>
            {trendArrow}
          </span>
          {trendValue && (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: trendColor }}>
              {trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ── ActionRow ─────────────────────────────────────────────────────────────────
interface ActionRowItem {
  label: string;
  emoji?: string;
  icon?: React.ReactNode;
  color?: string;
  onClick: () => void;
}

interface ActionRowProps {
  items: ActionRowItem[];
}

export const ActionRow: React.FC<ActionRowProps> = ({ items }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '2px',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  } as React.CSSProperties}>
    {items.map((item, i) => (
      <button
        key={i}
        onClick={item.onClick}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '6px',
          padding: '0.5rem 1rem',
          backgroundColor: item.color ? `${item.color}18` : 'rgba(0,0,0,0.06)',
          border: `1px solid ${item.color ? `${item.color}35` : T.border}`,
          borderRadius: T.radius.full,
          color: item.color || T.text,
          fontSize: '0.8125rem',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          transition: 'background-color 0.15s ease',
        }}
      >
        {item.emoji && <span style={{ fontSize: '0.9rem' }}>{item.emoji}</span>}
        {item.icon && <span style={{ display: 'flex', fontSize: '14px' }}>{item.icon}</span>}
        {item.label}
      </button>
    ))}
  </div>
);

// ── WorkoutCard ───────────────────────────────────────────────────────────────
interface WorkoutCardProps {
  name: string;
  date: string;
  durationMinutes: number;
  exerciseCount: number;
  totalVolume?: number;
  onClick?: () => void;
}

export const WorkoutCard: React.FC<WorkoutCardProps> = ({
  name, date, durationMinutes, exerciseCount, totalVolume, onClick,
}) => (
  <div
    onClick={onClick}
    style={{
      backgroundColor: T.card,
      border: `1px solid ${T.border}`,
      borderLeft: `3px solid ${T.accent}`,
      borderRadius: T.radius.md,
      padding: '0.875rem 1rem',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '0.75rem',
      cursor: onClick ? 'pointer' : 'default',
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: T.text, lineHeight: 1.2, marginBottom: '4px' }}>
        {name}
      </div>
      <div style={{ fontSize: '0.8125rem', color: T.muted }}>
        {date}
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
      <span style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color: T.muted,
        backgroundColor: 'rgba(0,0,0,0.05)',
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.full,
        padding: '2px 8px',
      }}>
        {durationMinutes}m
      </span>
      <span style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color: T.muted,
        backgroundColor: 'rgba(0,0,0,0.05)',
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.full,
        padding: '2px 8px',
      }}>
        {exerciseCount} ex
      </span>
      {totalVolume != null && (
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: T.muted,
          backgroundColor: 'rgba(0,0,0,0.05)',
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.full,
          padding: '2px 8px',
        }}>
          {totalVolume.toLocaleString()}kg
        </span>
      )}
    </div>
  </div>
);

// ── FoodRow ───────────────────────────────────────────────────────────────────
interface FoodRowProps {
  name: string;
  brand?: string;
  calories: number;
  protein?: number;
  serving?: string;
  onAdd?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  source?: 'local' | 'api' | 'custom';
}

export const FoodRow: React.FC<FoodRowProps> = ({
  name, brand, calories, protein, serving, onAdd, onFavorite, isFavorite, source,
}) => (
  <div style={{
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 0',
    borderBottom: `1px solid ${T.border}`,
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
        <span style={{
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: T.text,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
        {source === 'custom' && (
          <span style={{
            fontSize: '0.625rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: T.accent,
            backgroundColor: 'rgba(59,130,246,0.12)',
            borderRadius: T.radius.full,
            padding: '1px 6px',
            flexShrink: 0,
          }}>
            Custom
          </span>
        )}
      </div>
      <span style={{ fontSize: '0.8125rem', color: T.muted }}>
        {[brand, serving].filter(Boolean).join(' · ')}
      </span>
    </div>

    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
          {calories}
        </span>
        {protein != null && (
          <span style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: '#974400',
            backgroundColor: 'rgba(151,68,0,0.10)',
            borderRadius: T.radius.full,
            padding: '1px 6px',
          }}>
            {protein}g P
          </span>
        )}
      </div>

      {onFavorite && (
        <button
          onClick={onFavorite}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: isFavorite ? '#EF4444' : T.subtle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
            <path d="M9 14.5S2.5 11 2.5 6.5A3.5 3.5 0 019 4a3.5 3.5 0 016.5 2.5C15.5 11 9 14.5 9 14.5z" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {onAdd && (
        <button
          onClick={onAdd}
          style={{
            width: '30px',
            height: '30px',
            borderRadius: T.radius.full,
            backgroundColor: T.accent,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: T.text,
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  </div>
);

// ── StatusBadge ───────────────────────────────────────────────────────────────
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'disabled';

interface StatusBadgeProps {
  status: ConnectionStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; color: string; bg: string; pulse?: boolean }> = {
  disconnected: { label: 'Disconnected', color: 'rgba(0,0,0,0.30)', bg: 'rgba(0,0,0,0.06)' },
  connecting:   { label: 'Connecting',   color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', pulse: true },
  connected:    { label: 'Connected',    color: '#576038', bg: 'rgba(87,96,56,0.12)' },
  failed:       { label: 'Failed',       color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  disabled:     { label: 'Disabled',     color: 'rgba(0,0,0,0.16)', bg: 'rgba(0,0,0,0.03)' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const cfg = STATUS_CONFIG[status];
  const dotSize = size === 'sm' ? 6 : 8;
  const fontSize = size === 'sm' ? '0.6875rem' : '0.75rem';
  const padding = size === 'sm' ? '2px 8px' : '4px 10px';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding,
      backgroundColor: cfg.bg,
      borderRadius: T.radius.full,
      fontSize,
      fontWeight: 600,
      color: cfg.color,
    }}>
      <span style={{
        width: dotSize,
        height: dotSize,
        borderRadius: T.radius.full,
        backgroundColor: cfg.color,
        flexShrink: 0,
        animation: cfg.pulse ? 'pulse-ring 1.4s ease-in-out infinite' : undefined,
      }} />
      {cfg.label}
    </span>
  );
};

// ── SectionDivider ────────────────────────────────────────────────────────────
interface SectionDividerProps {
  label?: string;
}

export const SectionDivider: React.FC<SectionDividerProps> = ({ label }) => {
  if (!label) {
    return (
      <div style={{
        height: '1px',
        backgroundColor: T.border,
        width: '100%',
        margin: '0.25rem 0',
      }} />
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '0.75rem',
      margin: '0.5rem 0',
    }}>
      <div style={{ flex: 1, height: '1px', backgroundColor: T.border }} />
      <span style={{
        fontSize: '0.6875rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: T.muted,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', backgroundColor: T.border }} />
    </div>
  );
};

// ── InfoCard ──────────────────────────────────────────────────────────────────
interface InfoCardProps {
  title: string;
  body: string;
  color?: string;
  icon?: React.ReactNode;
  onDismiss?: () => void;
}

export const InfoCard: React.FC<InfoCardProps> = ({ title, body, color = T.accent, icon, onDismiss }) => (
  <div style={{
    backgroundColor: T.card,
    border: `1px solid ${T.border}`,
    borderLeft: `3px solid ${color}`,
    borderRadius: T.radius.md,
    padding: '1rem',
    display: 'flex',
    flexDirection: 'row',
    gap: '0.75rem',
    position: 'relative',
  }}>
    {icon && (
      <div style={{ color, flexShrink: 0, marginTop: '1px', display: 'flex' }}>
        {icon}
      </div>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: T.text, marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ fontSize: '0.875rem', color: T.muted, lineHeight: 1.5 }}>
        {body}
      </div>
    </div>
    {onDismiss && (
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: T.muted,
          padding: '0',
          display: 'flex',
          alignItems: 'flex-start',
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    )}
  </div>
);

// ── PrimaryButton ─────────────────────────────────────────────────────────────
interface PrimaryButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const BTN_SIZE = {
  sm: { padding: '0.5rem 1rem',   fontSize: '0.8125rem', height: '34px' },
  md: { padding: '0.625rem 1.25rem', fontSize: '0.9375rem', height: '42px' },
  lg: { padding: '0.75rem 1.75rem', fontSize: '1rem',      height: '50px' },
};

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label, onClick, disabled, loading, fullWidth, icon, size = 'md',
}) => {
  const s = BTN_SIZE[size];
  return (
    <button
      onClick={loading ? undefined : onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: s.padding,
        height: s.height,
        backgroundColor: disabled || loading ? 'rgba(0,0,0,0.08)' : '#FFFFFF',
        color: disabled || loading ? 'rgba(0,0,0,0.28)' : '#000000',
        border: 'none',
        borderRadius: T.radius.full,
        fontSize: s.fontSize,
        fontWeight: 700,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : undefined,
        transition: 'background-color 0.15s ease, opacity 0.15s ease',
        letterSpacing: '-0.01em',
      }}
    >
      {loading && <span className="btn-spinner" />}
      {!loading && icon && <span style={{ display: 'flex', fontSize: '16px' }}>{icon}</span>}
      {!loading && label}
    </button>
  );
};

// ── SecondaryButton ───────────────────────────────────────────────────────────
interface SecondaryButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  label, onClick, disabled, loading, icon, color = T.accent, size = 'md',
}) => {
  const s = BTN_SIZE[size];
  const isDisabled = disabled || loading;
  return (
    <button
      onClick={loading ? undefined : onClick}
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: s.padding,
        height: s.height,
        backgroundColor: isDisabled ? 'rgba(0,0,0,0.03)' : `${color}14`,
        color: isDisabled ? T.muted : color,
        border: `1px solid ${isDisabled ? T.border : `${color}50`}`,
        borderRadius: T.radius.full,
        fontSize: s.fontSize,
        fontWeight: 600,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.15s ease',
      }}
    >
      {loading && <span className="btn-spinner" style={{ borderColor: `${color}40`, borderTopColor: color } as React.CSSProperties} />}
      {!loading && icon && <span style={{ display: 'flex', fontSize: '16px' }}>{icon}</span>}
      {!loading && label}
    </button>
  );
};

// ── DangerButton ──────────────────────────────────────────────────────────────
interface DangerButtonProps {
  label: string;
  onClick: () => void;
  loading?: boolean;
}

export const DangerButton: React.FC<DangerButtonProps> = ({ label, onClick, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    style={{
      display: 'inline-flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      padding: '0.625rem 1.25rem',
      height: '42px',
      backgroundColor: loading ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.15)',
      color: loading ? 'rgba(239,68,68,0.5)' : T.red,
      border: `1px solid ${loading ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.35)'}`,
      borderRadius: T.radius.full,
      fontSize: '0.9375rem',
      fontWeight: 600,
      cursor: loading ? 'not-allowed' : 'pointer',
      transition: 'background-color 0.15s ease',
    }}
  >
    {loading ? (
      <span style={{
        width: '16px',
        height: '16px',
        border: '2px solid rgba(239,68,68,0.25)',
        borderTopColor: T.red,
        borderRadius: T.radius.full,
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block',
      }} />
    ) : label}
  </button>
);

// ── MacroRing (upgraded MacroCircle) ──────────────────────────────────────────
interface MacroRingProps {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  size?: number;
}

export const MacroRing: React.FC<MacroRingProps> = ({
  calories, protein, carbs, fats,
  targetCalories, targetProtein, targetCarbs, targetFats,
  size = 160,
}) => {
  const cx = size / 2;
  const cy = size / 2;

  // Outer ring: calories
  const outerStroke = 10;
  const outerR = (size / 2) - (outerStroke / 2) - 4;
  const outerCirc = 2 * Math.PI * outerR;
  const calPct = targetCalories > 0 ? Math.min(1, calories / targetCalories) : 0;
  const calOffset = outerCirc * (1 - calPct);

  // Inner rings: P / C / F stacked at decreasing radii
  const innerStroke = 7;
  const gap = 10;
  const macros = [
    { pct: targetProtein > 0 ? Math.min(1, protein / targetProtein) : 0, color: '#974400' },
    { pct: targetCarbs   > 0 ? Math.min(1, carbs   / targetCarbs)   : 0, color: '#8B9467' },
    { pct: targetFats    > 0 ? Math.min(1, fats    / targetFats)    : 0, color: '#576038' },
  ];

  const remaining = Math.max(0, targetCalories - calories);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track rings */}
        <circle cx={cx} cy={cy} r={outerR} stroke="rgba(0,0,0,0.05)" strokeWidth={outerStroke} fill="none" />
        {macros.map((m, i) => {
          const r = outerR - outerStroke - (i * (innerStroke + gap / 2)) - gap;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} stroke="rgba(0,0,0,0.05)" strokeWidth={innerStroke} fill="none" />
          );
        })}

        {/* Calories arc */}
        <circle
          cx={cx} cy={cy} r={outerR}
          stroke="var(--accent-primary, #576038)"
          strokeWidth={outerStroke}
          fill="none"
          strokeDasharray={outerCirc}
          strokeDashoffset={calOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.25,1,0.5,1)' }}
        />

        {/* Macro arcs */}
        {macros.map((m, i) => {
          const r = outerR - outerStroke - (i * (innerStroke + gap / 2)) - gap;
          const circ = 2 * Math.PI * r;
          const offset = circ * (1 - m.pct);
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              stroke={m.color}
              strokeWidth={innerStroke}
              fill="none"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.25,1,0.5,1)' }}
            />
          );
        })}
      </svg>

      {/* Center label */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1px',
      }}>
        <span style={{
          fontSize: size < 120 ? '1.25rem' : '1.625rem',
          fontWeight: 800,
          color: T.text,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}>
          {remaining.toLocaleString()}
        </span>
        <span style={{
          fontSize: '0.6rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: T.muted,
        }}>
          kcal left
        </span>
      </div>
    </div>
  );
};
