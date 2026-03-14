import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar, ChevronLeft, ChevronRight, Settings, Plus, Minus,
} from 'lucide-react';
import { evaluateWeeklyCheckIn, calculateWeightTrend, calculateStreak, getMacrosFromLog } from '../utils/aiCoachingEngine';
import { getLocalISOString, formatReadableDate } from '../utils/dateUtils';
import { BottomSheet } from '../components/MotionUI';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNavigate } from 'react-router-dom';
import {
  MacroSummaryCard,
  DailyHabitsCard,
  WeeklyChartCard,
  CoachingInsightCard,
  WeeklyPauseCard,
  RecoveryCard,
  WeightCard,
  StreakCard,
} from '../components/DashboardCards';

export const Dashboard: React.FC = () => {
  const { state, updateUser, showToast, updateDailyLog } = useApp();
  const { user, logs, settings } = state;
  const navigate = useNavigate();

  const todayDate = getLocalISOString();

  const [selectedDate, setSelectedDate]     = useState(todayDate);
  const [isWaterSheetOpen, setIsWaterSheetOpen]   = useState(false);
  const [isWeightSheetOpen, setIsWeightSheetOpen] = useState(false);
  const [isStepsSheetOpen, setIsStepsSheetOpen]   = useState(false);
  const [tempWeight, setTempWeight] = useState(user?.weight || 0);
  const [tempSteps, setTempSteps]   = useState(0);

  // Guard: user must exist before any derived computation
  if (!user) return null;

  // ── Derived data ─────────────────────────────────────────────────────────────
  const todayLog  = logs[selectedDate] || {
    id: selectedDate, date: selectedDate, steps: 0, waterGlasses: 0,
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    workouts: [], health: {}, adherenceScore: 0,
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const next = getLocalISOString(d);
    // Guard: never navigate to a future date
    if (next > todayDate) return;
    setSelectedDate(next);
  };

  const rawConsumed = getMacrosFromLog(todayLog as any);
  // Guard all macro values against NaN
  const consumed = {
    calories: isNaN(rawConsumed.calories) ? 0 : Math.max(0, rawConsumed.calories),
    protein:  isNaN(rawConsumed.protein)  ? 0 : Math.max(0, rawConsumed.protein),
    carbs:    isNaN(rawConsumed.carbs)    ? 0 : Math.max(0, rawConsumed.carbs),
    fats:     isNaN(rawConsumed.fats)     ? 0 : Math.max(0, rawConsumed.fats),
  };
  const targets  = user.targets;

  // Weekly chart — clamp calories to 0 to avoid negative bars
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = getLocalISOString(d);
    const rawMacros = logs[dateStr] ? getMacrosFromLog(logs[dateStr] as any) : { calories: 0, protein: 0 };
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

  // AI coaching
  const trendData  = calculateWeightTrend(logs, user.weight);
  const currentEma = trendData.length > 0 ? trendData[trendData.length - 1].trend : null;
  const evaluation = evaluateWeeklyCheckIn(user, logs, currentEma, { plateauDetection: settings.plateauDetection });
  const streak     = calculateStreak(logs);

  // Weight delta — guard against null/NaN
  const weekAgoEma  = trendData.length >= 7 ? trendData[trendData.length - 7]?.trend : null;
  const weightDelta = (currentEma != null && weekAgoEma != null && !isNaN(currentEma) && !isNaN(weekAgoEma))
    ? currentEma - weekAgoEma
    : null;
  const weightDeltaStr  = weightDelta !== null
    ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)}kg`
    : null;
  const weightDeltaGood = weightDelta === null ? null
    : user.goalType === 'fat_loss' ? weightDelta <= 0
    : weightDelta >= 0;

  // Vitals
  const stepsTarget   = user.stepsTarget || 8000;
  const mealsLogged   = Object.values(todayLog.meals).filter((m: any) => m.length > 0).length;
  const workoutsToday = (todayLog.workouts || []).length;

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

  const recLabel = rec
    ? rec >= 85
      ? programName ? `Push hard — perfect day for ${programName}` : 'Excellent — push hard today'
      : rec >= 70
      ? programName ? `${programName} — good to go` : 'Good — normal training'
      : rec >= 50
      ? 'Moderate — consider a lighter session'
      : 'Low — prioritise rest & recovery today'
    : null;

  const recCTA = rec
    ? rec >= 50
      ? { label: 'Start Session', path: '/training' }
      : { label: 'View Recovery', path: '/health' }
    : { label: 'Log Vitals', path: '/health' };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleWaterUpdate = (n: number) => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    const v = Math.max(0, Math.min(20, todayLog.waterGlasses + n));
    updateDailyLog(todayDate, { waterGlasses: v });
    // Auto-close after reaching 0 or 20 would be odd; keep open so user can adjust freely.
    // Sheet stays open — they close it with the sheet handle.
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
      className="flex-col animate-fade-in"
      style={{
        paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100dvh',
      }}
    >
      {/* ── Date nav bar ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, var(--bg-card) 100%)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'relative',
      }}>
        <div className="flex-row justify-between align-center" style={{ padding: '0.75rem 1rem', position: 'relative' }}>
          <button className="btn-icon" onClick={() => changeDate(-1)} style={{ width: 34, height: 34 }}>
            <ChevronLeft size={18} />
          </button>

          <div className="flex-row align-center gap-2" style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 'var(--radius-full)',
            padding: '0.35rem 0.85rem',
            border: '1px solid var(--border-subtle)',
          }}>
            <Calendar size={13} color="var(--accent-blue)" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
              {formatReadableDate(selectedDate)}
            </span>
          </div>

          <div className="flex-row align-center gap-2">
            <button
              onClick={() => navigate('/settings')}
              style={{
                width: 34, height: 34,
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Settings size={15} color="rgba(255,255,255,0.45)" />
            </button>
            <button
              className="btn-icon"
              onClick={() => changeDate(1)}
              disabled={selectedDate >= todayDate}
              style={{ width: 34, height: 34, opacity: selectedDate >= todayDate ? 0.3 : 1 }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Macro hero (ring + P/C/F tiles + Log Food CTA) */}
        <MacroSummaryCard
          calories={consumed.calories}
          protein={consumed.protein}
          carbs={consumed.carbs}
          fats={consumed.fats}
          targets={targets}
          onLogFood={() => navigate('/log')}
        />
      </div>

      {/* ── Content sections ── */}
      <div className="flex-col gap-3" style={{ padding: '1rem' }}>

        {/* TODAY section label */}
        <span style={{
          fontSize: '0.625rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          color: 'var(--text-tertiary)', paddingLeft: '0.25rem',
        }}>
          Today
        </span>

        {/* Quick stats: weight + streak */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <WeightCard
            weight={user.weight}
            weightDeltaStr={weightDeltaStr}
            weightDeltaGood={weightDeltaGood}
            onPress={() => { setTempWeight(user.weight); setIsWeightSheetOpen(true); }}
          />
          <StreakCard streak={streak} />
        </div>

        {/* Daily vitals 2×2 grid */}
        <DailyHabitsCard
          water={todayLog.waterGlasses}
          steps={todayLog.steps || 0}
          targetSteps={stepsTarget}
          mealsLogged={mealsLogged}
          workoutsToday={workoutsToday}
          onWaterOpen={() => setIsWaterSheetOpen(true)}
          onStepsOpen={() => { setTempSteps(todayLog.steps || 0); setIsStepsSheetOpen(true); }}
          onMealsPress={() => navigate('/log')}
          onTrainingPress={() => navigate('/training')}
        />

        {/* Recovery */}
        <RecoveryCard
          score={rec}
          recColor={recColor}
          recLabel={recLabel}
          recCTA={recCTA}
          onNavigate={navigate}
        />

        {/* THIS WEEK section label */}
        <span style={{
          fontSize: '0.625rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          color: 'var(--text-tertiary)', paddingLeft: '0.25rem',
          marginTop: '0.25rem',
        }}>
          This Week
        </span>

        {/* Weekly chart */}
        <WeeklyChartCard
          data={weeklyData}
          weekAvg={weekAvgCal}
          target={targets.calories}
        />

        {/* COACHING section label — only when adaptive coaching is on */}
        {settings.adaptiveCoaching && (
          <span style={{
            fontSize: '0.625rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'var(--text-tertiary)', paddingLeft: '0.25rem',
            marginTop: '0.25rem',
          }}>
            Coaching
          </span>
        )}

        {/* AI Coaching */}
        {settings.adaptiveCoaching && (
          settings.weeklyCheckIn ? (
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
          )
        )}

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
          {/* Done button to close the sheet */}
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
