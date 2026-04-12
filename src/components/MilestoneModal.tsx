import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { LEVEL_NAMES } from '../context/AppContext';
import type { Milestone } from '../types';

const CONFETTI_COLORS = ['#576038', '#974400', '#FFD700', '#EF4444', '#10B981', '#8B9467'];

const ConfettiPiece: React.FC<{ color: string; delay: number; x: number }> = ({ color, delay, x }) => (
  <div style={{
    position: 'absolute',
    top: -10,
    left: `${x}%`,
    width: 8,
    height: 8,
    background: color,
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    animation: `confettiFall 2s ${delay}s ease-in forwards`,
    opacity: 0,
  }} />
);

export const MilestoneModal: React.FC = () => {
  const { state, markMilestoneSeen } = useApp();
  const [current, setCurrent] = useState<Milestone | null>(null);
  const [visible, setVisible] = useState(false);
  const [confetti] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.5,
      x: Math.random() * 100,
    }))
  );

  useEffect(() => {
    const unseen = state.milestones.filter(m => !m.seen);
    if (unseen.length > 0 && !visible) {
      // Show newest first
      const newest = unseen.sort((a, b) => b.achievedAt.localeCompare(a.achievedAt))[0];
      setCurrent(newest);
      setVisible(true);
    }
  }, [state.milestones, visible]);

  const dismiss = () => {
    if (current) markMilestoneSeen(current.id);
    setVisible(false);
    setCurrent(null);
  };

  if (!visible || !current) return null;

  const isLevelUp = current.type === 'level_up';

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
        }
        @keyframes milestoneIn {
          0% { transform: scale(0.7) translateY(40px); opacity: 0; }
          60% { transform: scale(1.05) translateY(-4px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes iconPop {
          0% { transform: scale(0); }
          60% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }}
        onClick={dismiss}
      >
        {/* Confetti */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {confetti.map(c => <ConfettiPiece key={c.id} color={c.color} delay={c.delay} x={c.x} />)}
        </div>

        {/* Card */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#FAFAF7',
            borderRadius: 28,
            padding: '40px 32px 32px',
            maxWidth: 360,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
            animation: 'milestoneIn 0.5s ease forwards',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background glow */}
          <div style={{
            position: 'absolute', inset: 0,
            background: isLevelUp
              ? 'radial-gradient(ellipse at 50% 0%, rgba(87,96,56,0.12) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at 50% 0%, rgba(151,68,0,0.10) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Icon */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: isLevelUp
              ? 'linear-gradient(135deg, #576038, #8B9467)'
              : 'linear-gradient(135deg, #974400, #C05200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '2.2rem',
            boxShadow: isLevelUp
              ? '0 8px 30px rgba(87,96,56,0.4)'
              : '0 8px 30px rgba(151,68,0,0.4)',
            animation: 'iconPop 0.4s 0.1s ease forwards',
            opacity: 0,
          }}>
            {current.icon}
          </div>

          {/* Eyebrow */}
          <div style={{
            fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: isLevelUp ? '#576038' : '#974400',
            marginBottom: 8,
          }}>
            {isLevelUp ? 'Level Up' : current.type === 'streak' ? 'Streak Milestone' : current.type === 'workout_count' ? 'Workout Milestone' : 'Achievement'}
          </div>

          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1A1A1A', marginBottom: 8, lineHeight: 1.2 }}>
            {current.label}
          </div>

          <div style={{ fontSize: '0.9rem', color: 'rgba(26,26,26,0.6)', marginBottom: 32, lineHeight: 1.5 }}>
            {current.description}
          </div>

          {isLevelUp && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(87,96,56,0.08), rgba(139,148,103,0.08))',
              border: '1px solid rgba(87,96,56,0.15)',
              borderRadius: 14,
              padding: '12px 16px',
              marginBottom: 24,
              fontSize: '0.82rem',
              color: '#576038',
              fontWeight: 600,
            }}>
              Keep logging, training, and hitting your habits to level up further.
            </div>
          )}

          <button
            onClick={dismiss}
            style={{
              width: '100%', padding: '14px 0',
              background: isLevelUp ? '#576038' : '#974400',
              border: 'none', borderRadius: 14,
              color: '#fff', fontWeight: 800, fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: isLevelUp ? '0 4px 16px rgba(87,96,56,0.3)' : '0 4px 16px rgba(151,68,0,0.3)',
            }}
          >
            Let's Go!
          </button>
        </div>
      </div>
    </>
  );
};
