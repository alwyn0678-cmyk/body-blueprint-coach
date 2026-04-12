import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, SkipForward, Timer } from 'lucide-react';

interface RestTimerProps {
  onClose: () => void;
  defaultSeconds?: number;
}

const PRESETS = [60, 90, 120, 180, 240, 300];

const hapticVibrate = (pattern: number | number[]) => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const RestTimer: React.FC<RestTimerProps> = ({ onClose, defaultSeconds = 120 }) => {
  const [total, setTotal] = useState(defaultSeconds);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback((freq: number, duration: number) => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration / 1000);
    } catch {}
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          // Done — beep and vibrate
          playBeep(880, 300);
          setTimeout(() => playBeep(880, 300), 400);
          setTimeout(() => playBeep(1100, 600), 800);
          hapticVibrate([100, 100, 100, 100, 300]);
          setRunning(false);
          return 0;
        }
        // Warning beeps at 10s and 5s
        if (prev === 11) {
          playBeep(660, 150);
          hapticVibrate(50);
        }
        if (prev <= 6 && prev > 1) {
          playBeep(440, 100);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running, playBeep]);

  const reset = (seconds: number) => {
    clearInterval(intervalRef.current!);
    setTotal(seconds);
    setRemaining(seconds);
    setRunning(true);
  };

  const togglePause = () => {
    setRunning(r => !r);
    hapticVibrate(30);
  };

  const skip = () => {
    clearInterval(intervalRef.current!);
    setRemaining(0);
    setRunning(false);
    hapticVibrate([50, 50]);
  };

  const progress = total > 0 ? (total - remaining) / total : 1;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isDone = remaining === 0;

  // Color shifts from green → yellow → orange as time runs out
  const pct = remaining / total;
  const timerColor = pct > 0.5 ? '#576038' : pct > 0.25 ? '#974400' : '#EF4444';

  const circumference = 2 * Math.PI * 54;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(8px)',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#FAFAF7',
        borderRadius: '28px 28px 0 0',
        padding: '28px 24px',
        paddingBottom: `calc(28px + env(safe-area-inset-bottom))`,
        boxShadow: '0 -20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '1rem', color: '#1A1A1A' }}>
            <Timer size={18} color={timerColor} /> Rest Timer
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: '#999' }}>
            <X size={20} />
          </button>
        </div>

        {/* Circle timer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginBottom: 28 }}>
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={70} cy={70} r={54} fill="none" stroke="rgba(87,96,56,0.12)" strokeWidth={8} />
              <circle
                cx={70} cy={70} r={54} fill="none"
                stroke={isDone ? '#10B981' : timerColor}
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              {isDone ? (
                <span style={{ fontSize: '1.8rem' }}>✓</span>
              ) : (
                <span style={{ fontSize: '2.2rem', fontWeight: 900, color: timerColor, fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </span>
              )}
              {isDone && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10B981', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Rest complete
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button
              onClick={skip}
              style={{
                width: 44, height: 44, borderRadius: '50%', border: '1.5px solid rgba(87,96,56,0.2)',
                background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <SkipForward size={18} color="#576038" />
            </button>
            <button
              onClick={togglePause}
              style={{
                width: 60, height: 60, borderRadius: '50%', border: 'none',
                background: timerColor, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                boxShadow: `0 4px 16px ${timerColor}44`,
              }}
            >
              {running ? <Pause size={24} color="#fff" fill="#fff" /> : <Play size={24} color="#fff" fill="#fff" />}
            </button>
            <div style={{ width: 44, height: 44 }} />
          </div>
        </div>

        {/* Presets */}
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(26,26,26,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Quick set
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRESETS.map(s => (
              <button
                key={s}
                onClick={() => reset(s)}
                style={{
                  flex: '1 1 auto', minWidth: 52, padding: '8px 4px', borderRadius: 10,
                  border: `1.5px solid ${total === s ? timerColor : 'rgba(87,96,56,0.18)'}`,
                  background: total === s ? `${timerColor}18` : 'transparent',
                  fontWeight: 700, fontSize: '0.78rem',
                  color: total === s ? timerColor : '#576038',
                  cursor: 'pointer',
                }}
              >
                {s < 60 ? `${s}s` : `${s / 60}m`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
