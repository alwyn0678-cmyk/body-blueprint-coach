import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ChevronLeft, ChevronRight, Plus, Minus,
} from 'lucide-react';
import { evaluateWeeklyCheckIn, calculateWeightTrend, calculateStreak, getMacrosFromLog } from '../utils/aiCoachingEngine';
import { getLocalISOString, formatReadableDate } from '../utils/dateUtils';
import { DailyLog } from '../types';
import { BottomSheet } from '../components/MotionUI';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNavigate } from 'react-router-dom';
import {
  HeroRingCard,
  QuickLogRow,
  ProgramSnapshotCard,
  CoachingInsightCard,
  WeeklyPauseCard,
  WeeklyChartCard,
  StreakCard,
  RecoveryCard,
  SectionLabel,
} from '../components/DashboardCards';

export const Dashboard: React.FC = () => {
  const { state, updateUser, showToast, updateDailyLog } = useApp();
  const { user, logs, settings } = state;
  const navigate = useNavigate();

  const todayDate = getLocalISOString();

  const [selectedDate, setSelectedDate]       = useState(todayDate);
  const [isWaterSheetOpen, setIsWaterSheetOpen]   = useState(false);
  const [isWeightSheetOpen, setIsWeightSheetOpen] = useState(false);
  const [isStepsSheetOpen, setIsStepsSheetOpen]   = useState(false);
  const [tempWeight, setTempWeight] = useState(user?.weight || 0);
  const [tempSteps, setTempSteps]   = useState(0);

  // Guard: user must exist before any derived computation
  if (!user) return null;

  // Safe number helper
  const safeNum = (v: number | undefined | null, fallback = 0): number => {
    if (v === undefined || v === null || isNaN(v) || !isFinite(v)) return fallback;
    return v;
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const todayLog: DailyLog = logs[selectedDate] || {
    id: selectedDate, date: selectedDate, steps: 0, waterGlasses: 0,
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    workouts: [], health: {}, adherenceScore: 0,
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const next = getLocalISOString(d);
    if (next > todayDate) return;
    setSelectedDate(next);
  };

  const rawConsumed = getMacrosFromLog(todayLog);
  const consumed = {
    calories: safeNum(rawConsumed.calories),
    protein:  safeNum(rawConsumed.protein),
    carbs:    safeNum(rawConsumed.carbs),
    fats:     safeNum(rawConsumed.fats),
  };
  const targets = user.targets;

  // Weekly chart
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = getLocalISOString(d);
    const rawMacros = logs[dateStr] ? getMacrosFromLog(logs[dateStr]) : { calories: 0, protein: 0 };
    const isFuture = dateStr > todayDate;
    return {
      day: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()],
      dateStr,
      calories: Math.max(0, Math.round(isNaN(rawMacros.calories) ? 0 : rawMacros.calories)),
      protein:  Math.max(0, Math.round(isNaN(rawMacros.protein)  ? 0 : rawMacros.protein)),
      target:   targets.calories,
      isToday:  dateStr === todayDate,
      isFuture,
    };
  });

  const activeDays = weeklyData.filter(d => !d.isFuture && d.calories > 0);
  const weekAvgCal = activeDays.length > 0
    ? Math.round(activeDays.reduce((sum, d) => sum + d.calories, 0) / activeDays.length)
    : 0;
  const activeDaysCount = activeDays.length;

  // AI coaching
  const trendData  = calculateWeightTrend(logs, user.weight);
  const currentEma = trendData.length > 0 ? trendData[trendData.length - 1].trend : null;
  let evaluation: ReturnType<typeof evaluateWeeklyCheckIn>;
  try {
    evaluation = evaluateWeeklyCheckIn(user, logs, currentEma, { plateauDetection: settings.plateauDetection });
  } catch {
    evaluation = {
      recommendation: 'maintain',
      reasoning: 'Keep logging consistently — coaching insights will appear here once there is enough data.',
      urgency: 'low',
    };
  }
  const streak = calculateStreak(logs);

  // Weight delta
  const weekAgoEma  = trendData.length >= 7 ? trendData[trendData.length - 7]?.trend : null;
  const weightDelta = (currentEma != null && weekAgoEma != null && !isNaN(currentEma) && !isNaN(weekAgoEma))
    ? currentEma - weekAgoEma
    : null;

  // Recovery
  const rec = todayLog.health?.recoveryScore;
  const recColor = rec
    ? rec >= 85 ? 'var(--accent-green)'
      : rec >= 70 ? 'var(--accent-blue)'
      : rec >= 50 ? 'var(--accent-orange)'
      : 'var(--accent-red)'
    : 'rgba(255,255,255,0.25)';

  const assignedProgram = state.assignedProgram;
  const programName = assignedProgram === 'male_phase2'   ? 'Strength & Size'
    : assignedProgram === 'female_phase1' ? 'Glute & Tone Focus'
    : null;

  const recCTA = rec
    ? rec >= 50
      ? { label: 'Start Session', path: '/training' }
      : { label: 'View Recovery', path: '/health' }
    : { label: 'Log Vitals', path: '/health' };

  const isToday = selectedDate === todayDate;

  // ── Format date for nav ───────────────────────────────────────────────────────
  const formatNavDate = (dateStr: string): string => {
    const d = new Date(dateStr + 'T12:00:00');
    if (isToday) return 'Today';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleWaterUpdate = (n: number) => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    const v = Math.max(0, Math.min(20, todayLog.waterGlasses + n));
    updateDailyLog(todayDate, { waterGlasses: v });
  };

  const handleWeightSave = () => {
    if (!tempWeight || isNaN(tempWeight)) return;
    updateUser({ weight: tempWeight });
    updateDailyLog(selectedDate, { weight: tempWeight });
    showToast('Weight logged', 'success');
    setIsWeightSheetOpen(false);
  };

  const handleStepsSave = () => {
    updateDailyLog(todayDate, { steps: tempSteps });
    showToast('Steps logged', 'success');
    setIsStepsSheetOpen(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="animate-fade-in"
      style={{
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100dvh',
        paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── 1. DATE NAV ── */}
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Left chevron */}
          <button
            onClick={() => changeDate(-1)}
            style={{
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)',
              padding: 0,
            }}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Date label */}
          <span style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}>
            {formatNavDate(selectedDate)}
          </span>

          {/* Right chevron */}
          <button
            onClick={() => changeDate(1)}
            disabled={isToday}
            style={{
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none',
              cursor: isToday ? 'default' : 'pointer',
              color: isToday ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)',
              padding: 0,
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* ── 2. HERO RING CARD ── */}
        <HeroRingCard
          calories={consumed.calories}
          protein={consumed.protein}
          carbs={consumed.carbs}
          fats={consumed.fats}
          targets={targets}
        />

        {/* ── 3. QUICK LOG ROW ── */}
        <QuickLogRow
          water={todayLog.waterGlasses}
          weight={user.weight}
          steps={todayLog.steps || 0}
          onWaterOpen={() => setIsWaterSheetOpen(true)}
          onWeightOpen={() => { setTempWeight(user.weight); setIsWeightSheetOpen(true); }}
          onStepsOpen={() => { setTempSteps(todayLog.steps || 0); setIsStepsSheetOpen(true); }}
        />

        {/* ── 4. PROGRAM SNAPSHOT ── */}
        <div>
          <SectionLabel style={{ marginBottom: 8, display: 'block' }}>Today's Workout</SectionLabel>
          <ProgramSnapshotCard
            programName={programName}
            onStartSession={() => navigate('/training')}
            onSetProgram={() => navigate('/training')}
          />
        </div>

        {/* ── 5. COACHING INSIGHT ── */}
        {settings.adaptiveCoaching && (
          <div>
            <SectionLabel style={{ marginBottom: 8, display: 'block' }}>Coaching</SectionLabel>
            {settings.weeklyCheckIn ? (
              <CoachingInsightCard
                reasoning={evaluation.reasoning}
                urgency={evaluation.urgency}
                newTargets={evaluation.newTargets}
                onApply={evaluation.newTargets ? () => {
                  updateUser({ targets: evaluation.newTargets });
                  showToast('Calorie target updated', 'success');
                } : undefined}
              />
            ) : (
              <WeeklyPauseCard />
            )}
          </div>
        )}

        {/* ── 6. WEEKLY CHART ── */}
        <div>
          <WeeklyChartCard
            data={weeklyData}
            weekAvg={weekAvgCal}
            target={targets.calories}
            activeDays={activeDaysCount}
          />
        </div>

        {/* ── 7. STREAK + RECOVERY ROW ── */}
        <div>
          <SectionLabel style={{ marginBottom: 8, display: 'block' }}>Stats</SectionLabel>
          <div style={{ display: 'flex', gap: 10 }}>
            <StreakCard streak={streak} />
            <RecoveryCard
              score={rec}
              recColor={recColor}
              recLabel={null}
              recCTA={recCTA}
              onNavigate={navigate}
            />
          </div>
        </div>

      </div>

      {/* ── Water Sheet ── */}
      <BottomSheet isOpen={isWaterSheetOpen} onClose={() => setIsWaterSheetOpen(false)}>
        <div className="flex-col align-center gap-6 pb-2">
          <div style={{ textAlign: 'center' }}>
            <h2 className="text-h2" style={{ marginBottom: '0.25rem' }}>Hydration</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Target: 8 glasses per day</p>
          </div>
          <div className="flex-row justify-center align-center gap-8">
            <button
              onClick={() => handleWaterUpdate(-1)}
              style={{
                width: 48, height: 48, borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <Minus size={20} />
            </button>
            <span style={{
              fontSize: '4.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              width: '70px', textAlign: 'center', letterSpacing: '-0.04em', lineHeight: 1,
            }}>
              {todayLog.waterGlasses}
            </span>
            <button
              onClick={() => handleWaterUpdate(1)}
              style={{
                width: 48, height: 48, borderRadius: 'var(--radius-full)',
                border: 'none', backgroundColor: 'var(--accent-blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <Plus size={20} color="white" />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                onClick={() => updateDailyLog(todayDate, { waterGlasses: i + 1 })}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  backgroundColor: i < todayLog.waterGlasses ? 'var(--accent-blue)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${i < todayLog.waterGlasses ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                  cursor: 'pointer', transition: 'background-color 0.2s',
                }}
              />
            ))}
          </div>
          <button
            className="btn-primary w-full"
            style={{ padding: '0.9rem' }}
            onClick={() => setIsWaterSheetOpen(false)}
          >
            Done
          </button>
        </div>
      </BottomSheet>

      {/* ── Weight Sheet ── */}
      <BottomSheet isOpen={isWeightSheetOpen} onClose={() => setIsWeightSheetOpen(false)}>
        <div className="flex-col align-center gap-6 pb-2">
          <div style={{ textAlign: 'center' }}>
            <h2 className="text-h2" style={{ marginBottom: '0.25rem' }}>Log Weight</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Morning measurement recommended</p>
          </div>
          <div className="flex-row justify-center align-baseline gap-2">
            <input
              type="number"
              step="0.1"
              value={tempWeight}
              onChange={e => setTempWeight(Number(e.target.value))}
              style={{
                fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums', width: '160px', textAlign: 'center',
                background: 'transparent', border: 'none',
                borderBottom: '2px solid rgba(255,255,255,0.15)', outline: 'none',
                letterSpacing: '-0.04em', paddingBottom: '4px',
              }}
            />
            <span style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>kg</span>
          </div>
          {currentEma != null && !isNaN(currentEma) && (
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: 'var(--radius-md)',
              padding: '0.625rem 1.25rem',
              border: '1px solid var(--border-default)',
            }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Trend: <strong style={{ color: 'var(--text-primary)' }}>{currentEma.toFixed(1)} kg</strong>
              </span>
            </div>
          )}
          <button className="btn-primary w-full" style={{ padding: '0.9rem' }} onClick={handleWeightSave}>
            Save Weight
          </button>
        </div>
      </BottomSheet>

      {/* ── Steps Sheet ── */}
      <BottomSheet isOpen={isStepsSheetOpen} onClose={() => setIsStepsSheetOpen(false)}>
        <div className="flex-col align-center gap-6 pb-2">
          <div style={{ textAlign: 'center' }}>
            <h2 className="text-h2" style={{ marginBottom: '0.25rem' }}>Log Steps</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Target: {(user.stepsTarget || 8000).toLocaleString()} steps
            </p>
          </div>
          <input
            type="number"
            value={tempSteps}
            onChange={e => setTempSteps(Number(e.target.value))}
            style={{
              fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums', width: '220px', textAlign: 'center',
              background: 'transparent', border: 'none',
              borderBottom: '2px solid rgba(255,255,255,0.15)', outline: 'none',
              letterSpacing: '-0.03em', paddingBottom: '4px',
            }}
          />
          <div className="flex-row gap-2" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            {[2000, 5000, 8000, 10000, 12000].map(n => (
              <button
                key={n}
                onClick={() => setTempSteps(n)}
                style={{
                  padding: '0.4rem 0.875rem',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${tempSteps === n ? 'var(--accent-green)' : 'var(--border-default)'}`,
                  backgroundColor: tempSteps === n ? 'rgba(48,209,88,0.12)' : 'transparent',
                  color: tempSteps === n ? 'var(--accent-green)' : 'var(--text-secondary)',
                  fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
                }}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
          <button className="btn-primary w-full" style={{ padding: '0.9rem' }} onClick={handleStepsSave}>
            Save Steps
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};
