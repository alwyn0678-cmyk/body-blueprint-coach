import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, CheckCircle2, ChevronDown, ChevronUp,
  Zap, Target, BarChart3, Dumbbell, Apple, Moon,
  RefreshCw, Send, Lock, Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { coachService, TrainingContext } from '../services/aiCoach';
import { computeWeeklyStats, calculateWeightTrend, evaluateWeeklyCheckIn } from '../utils/aiCoachingEngine';
import {
  buildVolumeLandmarks, calculateProgression, assessDeloadNeed,
  getVolumeStatus, VOLUME_STATUS_LABELS, ProgressionSuggestion,
} from '../utils/volumeLandmarks';
import { CoachInsight, WeeklyCheckIn } from '../types';

// ─── Markdown renderer ────────────────────────────────────────────────────────

const renderInline = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>
      : part
  );
};

const ChatMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Collect bullet list
    if (/^[-•*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-•*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-•*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ paddingLeft: 16, margin: '5px 0', listStyleType: 'disc' }}>
          {items.map((it, bi) => (
            <li key={bi} style={{ marginBottom: 3, lineHeight: 1.5 }}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }
    // Collect numbered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} style={{ paddingLeft: 18, margin: '5px 0' }}>
          {items.map((it, ni) => (
            <li key={ni} style={{ marginBottom: 3, lineHeight: 1.5 }}>{renderInline(it)}</li>
          ))}
        </ol>
      );
      continue;
    }
    // Empty line → spacer
    if (line.trim() === '') {
      if (elements.length > 0) elements.push(<div key={`sp-${i}`} style={{ height: 6 }} />);
      i++;
      continue;
    }
    // Normal line
    const prevLine = lines[i - 1];
    const needsBr = i > 0 && prevLine !== undefined && prevLine.trim() !== '' && !/^[-•*\d]/.test(prevLine);
    elements.push(
      <span key={`ln-${i}`}>
        {needsBr && <br />}
        {renderInline(line)}
      </span>
    );
    i++;
  }
  return <>{elements}</>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];
const weekStartStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1);
  return d.toISOString().split('T')[0];
};

// ─── Insight card ─────────────────────────────────────────────────────────────

const InsightCard: React.FC<{ insight: CoachInsight; onDismiss: () => void }> = ({ insight, onDismiss }) => {
  const [expanded, setExpanded] = useState(false);
  const color = insight.priority === 'high' ? '#974400'
    : insight.priority === 'medium' ? '#974400' : '#576038';
  const Icon = insight.type === 'nutrition' ? Apple
    : insight.type === 'training' ? Dumbbell
    : insight.type === 'recovery' ? Moon
    : Brain;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      style={{ borderRadius: 16, border: `1px solid ${color}22`, background: `${color}06`, overflow: 'hidden' }}
    >
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={16} color={color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color }}>
                {insight.type}
              </span>
              <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 6, background: `${color}15`, color, fontWeight: 700 }}>
                {insight.priority}
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: 4 }}>
              {insight.title}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.55 }}
              className={expanded ? '' : 'truncate-2'}>
              {insight.message}
            </div>
            {insight.action && expanded && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, background: `${color}12`, border: `1px solid ${color}20` }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Action</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{insight.action}</div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <button onClick={() => setExpanded(e => !e)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, color: 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
            {expanded ? <><ChevronUp size={12} /> Less</> : <><ChevronDown size={12} /> More</>}
          </button>
          <button onClick={onDismiss}
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Weekly check-in card ─────────────────────────────────────────────────────

const WeeklyCheckInCard: React.FC<{
  stats: any;
  checkIn?: WeeklyCheckIn;
  adjustment: any;
  onComplete: () => void;
  loading: boolean;
}> = ({ stats, checkIn, adjustment, onComplete, loading }) => {
  const completed = !!checkIn?.completedAt;
  const adjColor = adjustment.recommendation === 'maintain' ? '#576038'
    : adjustment.recommendation === 'decrease_calories' ? '#974400' : '#576038';

  return (
    <div style={{ borderRadius: 20, background: 'linear-gradient(135deg, rgba(87,96,56,0.10) 0%, rgba(151,68,0,0.05) 100%)', border: '1px solid rgba(87,96,56,0.20)', padding: '18px 18px', position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(87,96,56,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(87,96,56,0.6)', marginBottom: 3 }}>Weekly Check-In</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            {completed ? 'This week reviewed' : 'Week in review'}
          </div>
        </div>
        {completed ? <CheckCircle2 size={22} color="#576038" /> : <RefreshCw size={18} color="rgba(87,96,56,0.6)" />}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Cal adherence', value: `${stats.calorieAdherence}%`, color: stats.calorieAdherence >= 80 ? '#576038' : '#974400' },
          { label: 'Protein avg', value: `${stats.avgProtein}g`, color: stats.proteinAdherence >= 80 ? '#576038' : '#974400' },
          { label: 'Workouts', value: `${stats.workoutsCompleted}`, color: '#576038' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: '10px 10px' }}>
            <div style={{ fontSize: '0.56rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 900, letterSpacing: '-0.03em', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Adjustment recommendation */}
      <div style={{ padding: '12px 14px', borderRadius: 12, background: `${adjColor}10`, border: `1px solid ${adjColor}25`, marginBottom: 14 }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: adjColor, marginBottom: 4 }}>
          Adaptive engine → {adjustment.recommendation.replace('_', ' ')}
        </div>
        <div style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {adjustment.reasoning}
        </div>
        {adjustment.newTargets && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: `${adjColor}15`, color: adjColor }}>
              New target: {adjustment.newTargets.calories} kcal
            </span>
          </div>
        )}
      </div>

      {!completed && (
        <button
          className="btn btn-coach" style={{ width: '100%', justifyContent: 'center', gap: 8 }}
          onClick={onComplete} disabled={loading}
        >
          {loading ? <span className="btn-spinner" style={{ borderColor: 'rgba(0,0,0,0.20)', borderTopColor: 'white' }} /> : <Brain size={14} />}
          {loading ? 'Analysing...' : 'Complete check-in'}
        </button>
      )}
    </div>
  );
};

// ─── Adaptive TDEE card ───────────────────────────────────────────────────────

const AdaptiveTDEECard: React.FC<{ user: any; weeklyStats: any; currentEma: number | null }> = ({ user, weeklyStats, currentEma }) => {
  const { updateUser, showToast } = useApp();
  const evaluation = useMemo(() => evaluateWeeklyCheckIn(user, {}, currentEma, { plateauDetection: true }), [user, currentEma]);

  const handleApply = () => {
    if (!evaluation.newTargets) return;
    updateUser({ targets: evaluation.newTargets });
    showToast(`Targets updated: ${evaluation.newTargets.calories} kcal`, 'success');
  };

  if (evaluation.recommendation === 'maintain') return null;

  const color = evaluation.recommendation === 'decrease_calories' ? '#974400' : '#576038';

  return (
    <div style={{ borderRadius: 16, background: `${color}08`, border: `1px solid ${color}20`, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Target size={15} color={color} />
        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color }}>Adaptive Adjustment</span>
        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: `${color}15`, color }}>
          {evaluation.urgency}
        </span>
      </div>
      <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: evaluation.newTargets ? 12 : 0 }}>
        {evaluation.reasoning}
      </div>
      {evaluation.newTargets && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {user.targets.calories} → {evaluation.newTargets.calories} kcal
          </div>
          <button
            onClick={handleApply}
            style={{ padding: '6px 14px', borderRadius: 20, background: color, color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Coach page ──────────────────────────────────────────────────────────

export const Coach: React.FC = () => {
  const { state, dismissCoachInsight, saveWeeklyCheckIn, addCoachInsight, showToast } = useApp();
  const user = state.user!;

  const [activeTab, setActiveTab] = useState<'insights' | 'chat' | 'checkin' | 'plan'>('insights');
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const weeklyStats = useMemo(() => computeWeeklyStats(state.logs, user.targets), [state.logs, user.targets]);

  const weightTrendData = useMemo(() => {
    const data = calculateWeightTrend(state.logs, user.weight);
    return data.filter(d => d.trend !== null).slice(-14);
  }, [state.logs, user.weight]);

  const currentEma = weightTrendData[weightTrendData.length - 1]?.trend ?? null;
  const prevEma = weightTrendData.length >= 7 ? weightTrendData[Math.max(0, weightTrendData.length - 8)]?.trend ?? null : null;
  const weightDelta = currentEma !== null && prevEma !== null ? currentEma - prevEma : 0;

  const weekAdjustment = useMemo(() => evaluateWeeklyCheckIn(
    user, state.logs, currentEma, { plateauDetection: state.settings.plateauDetection }
  ), [user, state.logs, currentEma]);

  const thisWeekCheckIn = state.weeklyCheckIns.find(c => c.weekStart === weekStartStr());

  // ── Training Intelligence ──────────────────────────────────────────────────
  const exerciseHistories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; history: Array<{ date: string; bestSet: { weight: number; reps: number }; rpe?: number }> }>();
    Object.entries(state.logs).sort(([a], [b]) => a.localeCompare(b)).forEach(([date, log]) => {
      log.workouts.forEach(w => {
        w.exercises.forEach(ex => {
          if (!map.has(ex.exerciseId)) map.set(ex.exerciseId, { id: ex.exerciseId, name: ex.name, history: [] });
          const completedSets = ex.sets.filter(s => s.weight > 0 && s.reps > 0);
          if (completedSets.length === 0) return;
          const bestSet = completedSets.reduce((b, s) => s.weight * s.reps > b.weight * b.reps ? s : b);
          const rpes = completedSets.filter(s => s.rpe);
          const avgRpe = rpes.length ? rpes.reduce((a, s) => a + (s.rpe ?? 0), 0) / rpes.length : undefined;
          map.get(ex.exerciseId)!.history.push({ date, bestSet: { weight: bestSet.weight, reps: bestSet.reps }, rpe: avgRpe });
        });
      });
    });
    return map;
  }, [state.logs]);

  const progressionSuggestions = useMemo<ProgressionSuggestion[]>(() => {
    const results: ProgressionSuggestion[] = [];
    exerciseHistories.forEach(({ id, name, history }) => {
      if (history.length < 1) return;
      const s = calculateProgression(name, id, history.slice(-4));
      if (s && (s.type === 'weight_increase' || s.type === 'deload')) results.push(s);
    });
    return results.slice(0, 6);
  }, [exerciseHistories]);

  const thisWeekStart = weekStartStr();
  const volumeLandmarkData = useMemo(() => buildVolumeLandmarks(state.logs, thisWeekStart), [state.logs, thisWeekStart]);
  const activeMuscles = useMemo(() => volumeLandmarkData.filter(v => v.currentVolume > 0), [volumeLandmarkData]);
  const musclesUnderMEV = useMemo(() => volumeLandmarkData.filter(v => v.currentVolume > 0 && v.currentVolume < v.mev).map(v => v.muscle), [volumeLandmarkData]);

  const avgSessionRPE = useMemo(() => {
    const recent = Object.values(state.logs).flatMap(l => l.workouts).filter(w => w.sessionRPE).slice(-5);
    return recent.length ? recent.reduce((a, w) => a + (w.sessionRPE ?? 0), 0) / recent.length : undefined;
  }, [state.logs]);

  const deloadRec = useMemo(() => assessDeloadNeed(
    state.activeMesocycle?.currentWeek ?? 0,
    state.activeMesocycle?.totalWeeks ?? 4,
    avgSessionRPE,
    volumeLandmarkData.filter(v => v.currentVolume >= v.mrv * 0.9).length,
    weeklyStats.workoutsCompleted,
  ), [volumeLandmarkData, avgSessionRPE, weeklyStats.workoutsCompleted, state.activeMesocycle]);

  // Build TrainingContext for AI chat
  const trainingContext = useMemo<TrainingContext>(() => {
    const recentSessions = Object.values(state.logs)
      .flatMap(log => log.workouts)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 5)
      .map(w => ({
        name: w.name,
        date: w.timestamp.split('T')[0],
        durationMinutes: w.durationMinutes,
        sessionRPE: w.sessionRPE,
        exercises: w.exercises.map(ex => {
          const completedSets = ex.sets.filter(s => s.weight > 0 && s.reps > 0);
          const bestSet = completedSets.length
            ? completedSets.reduce((b, s) => s.weight * s.reps > b.weight * b.reps ? s : b)
            : { weight: 0, reps: 0 };
          return { name: ex.name, sets: completedSets.length, bestSet: { weight: bestSet.weight, reps: bestSet.reps } };
        }).filter(e => e.sets > 0),
      }));

    return {
      recentSessions,
      progressionReady: progressionSuggestions.map(s => ({
        exerciseName: s.exerciseName,
        reasoning: s.reasoning,
        type: s.type,
      })),
      deloadRecommended: deloadRec.recommended,
      deloadReasons: deloadRec.reasons,
      musclesUnderMEV,
      musclesAboveMEV: activeMuscles.filter(v => v.currentVolume >= v.mev).map(v => v.muscle),
    };
  }, [state.logs, progressionSuggestions, deloadRec, musclesUnderMEV, activeMuscles]);

  // ── AI Chat state ──────────────────────────────────────────────────────────
  type ChatMsg = { role: 'user' | 'assistant'; content: string; id: string };
  const SESSION_KEY = 'evolved_coach_chat';

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? (JSON.parse(saved) as ChatMsg[]) : [];
    } catch { return []; }
  });
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [hasClaudeKey, setHasClaudeKey] = useState(
    () => !!localStorage.getItem('bbc_claude_api_key')
  );
  useEffect(() => {
    const check = () => setHasClaudeKey(!!localStorage.getItem('bbc_claude_api_key'));
    window.addEventListener('storage', check);
    const interval = setInterval(check, 2000);
    return () => { window.removeEventListener('storage', check); clearInterval(interval); };
  }, []);

  // Persist chat to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(chatMessages)); } catch { /* quota */ }
  }, [chatMessages]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMessage = useCallback(async (msg: string) => {
    if (!msg.trim() || chatLoading) return;
    setChatInput('');
    const userMsg: ChatMsg = { role: 'user', content: msg.trim(), id: `u_${Date.now()}` };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const weightTrend = weightDelta < -0.1 ? 'losing' as const : weightDelta > 0.1 ? 'gaining' as const : 'maintaining' as const;
      const history = [...chatMessages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const reply = await coachService.chat(
        {
          user,
          weeklyStats,
          recentWorkouts: [],
          weightTrend,
          weightDelta7d: weightDelta,
          currentEma: currentEma ?? undefined,
          trainingContext,
        },
        msg.trim(),
        history.slice(0, -1), // history excludes the current message (passed separately)
      );
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply, id: `a_${Date.now()}` }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, chatMessages, user, weeklyStats, weightDelta, currentEma, trainingContext]);

  const handleChat = useCallback(() => sendMessage(chatInput), [chatInput, sendMessage]);

  // Coach insights (static library)
  const allInsights = useMemo(() => coachService.getInsights(user, weeklyStats), [user, weeklyStats]);
  const activeInsights = allInsights.filter(i => !state.coachInsights.find(s => s.id === i.id && s.dismissed));

  // Personalized chat starter questions based on actual user data
  const suggestedQuestions = useMemo(() => {
    const questions: string[] = [];
    if (weeklyStats.proteinAdherence < 70 && weeklyStats.daysLogged >= 3)
      questions.push(`I'm only hitting ${weeklyStats.proteinAdherence}% protein adherence — what's the fix?`);
    if (progressionSuggestions.some(s => s.type === 'deload'))
      questions.push(`Should I deload on ${progressionSuggestions.find(s => s.type === 'deload')!.exerciseName}?`);
    if (musclesUnderMEV.length > 0)
      questions.push(`My ${musclesUnderMEV[0]} volume is below MEV — how should I fix this?`);
    if (weightDelta > 0.1 && user.goalType === 'fat_loss')
      questions.push('My weight is trending up despite a deficit — why could this be?');
    if (progressionSuggestions.some(s => s.type === 'weight_increase')) {
      const p = progressionSuggestions.find(s => s.type === 'weight_increase')!;
      questions.push(`How do I execute a weight increase on ${p.exerciseName}?`);
    }
    if (deloadRec.recommended)
      questions.push('What should my deload week look like?');
    // Goal-specific fallbacks
    const fallbacks = user.goalType === 'fat_loss'
      ? ['How do I preserve muscle while cutting?', 'When should I schedule a refeed day?', 'What\'s the right cardio approach for fat loss?']
      : user.goalType === 'muscle_gain'
      ? ['How do I optimise training volume for muscle growth?', 'How important is sleep for hypertrophy?', 'How do I avoid gaining too much fat while bulking?']
      : ['How do I know if I\'m making real progress?', 'What\'s the most important habit to build right now?', 'How should I structure my training week?'];
    for (const fb of fallbacks) { if (questions.length >= 4) break; questions.push(fb); }
    return questions.slice(0, 4);
  }, [weeklyStats, progressionSuggestions, musclesUnderMEV, user.goalType, weightDelta, deloadRec]);
  const dailyInsight = useMemo(() => coachService.getDailyInsight({
    user, weeklyStats,
    recentWorkouts: Object.values(state.logs).flatMap(l => l.workouts)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 3),
    weightTrend: weightDelta < -0.1 ? 'losing' : weightDelta > 0.1 ? 'gaining' : 'maintaining',
    weightDelta7d: weightDelta,
    currentEma: currentEma ?? undefined,
  }), [user, weeklyStats, weightDelta]);

  const handleCompleteCheckIn = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const weightTrend = weightDelta < -0.1 ? 'losing' as const : weightDelta > 0.1 ? 'gaining' as const : 'maintaining' as const;
      const reviewText = await coachService.getWeeklyReview({
        user, weeklyStats,
        recentWorkouts: [],
        weightTrend,
        weightDelta7d: weightDelta,
        currentEma: currentEma ?? undefined,
        trainingContext,
      });

      const checkIn: WeeklyCheckIn = {
        id: `ci_${Date.now()}`,
        weekStart: weekStartStr(),
        completedAt: new Date().toISOString(),
        weightLogged: !!currentEma,
        avgCalories: weeklyStats.avgCalories,
        avgProtein: weeklyStats.avgProtein,
        calorieAdherence: weeklyStats.calorieAdherence,
        proteinAdherence: weeklyStats.proteinAdherence,
        workoutsCompleted: weeklyStats.workoutsCompleted,
        coachResponse: reviewText,
        adjustmentMade: weekAdjustment.newTargets ? {
          type: 'calories',
          delta: weekAdjustment.newTargets.calories - user.targets.calories,
          reason: weekAdjustment.reasoning,
        } : undefined,
      };

      saveWeeklyCheckIn(checkIn);
      showToast('Weekly check-in complete!', 'success');
    } finally {
      setWeeklyLoading(false);
    }
  }, [user, weeklyStats, weightDelta, currentEma, weekAdjustment]);

  const insightColor = dailyInsight.priority === 'high' ? '#974400'
    : dailyInsight.priority === 'medium' ? '#974400' : '#576038';

  return (
    <div className="page page-top-pad safe-bottom" style={{ gap: 14 }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="page-header" style={{ paddingBottom: 8 }}>
          <div>
            <div className="page-title">Coach</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Science-based adaptive coaching
            </div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #576038, #C2CB9A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={18} color="white" />
          </div>
        </div>
      </motion.div>

      {/* ── Daily priority insight ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <div style={{ borderRadius: 20, background: `${insightColor}08`, border: `1px solid ${insightColor}25`, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `${insightColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color={insightColor} />
            </div>
            <div>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: insightColor }}>Today's Priority</div>
              <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{dailyInsight.type} · {dailyInsight.priority} importance</div>
            </div>
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', marginBottom: 6 }}>
            {dailyInsight.title}
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {dailyInsight.message}
          </div>
          {dailyInsight.action && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: `${insightColor}12`, border: `1px solid ${insightColor}20` }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: insightColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action: </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{dailyInsight.action}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Adaptive TDEE adjustment ── */}
      {weeklyStats.daysLogged >= 5 && weekAdjustment.recommendation !== 'maintain' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <AdaptiveTDEECard user={user} weeklyStats={weeklyStats} currentEma={currentEma} />
        </motion.div>
      )}

      {/* ── Tabs ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <div className="pill-tabs">
          {(['insights', 'chat', 'checkin', 'plan'] as const).map(tab => (
            <button key={tab} className={`pill-tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}>
              {tab === 'insights' ? 'Insights' : tab === 'chat' ? 'Chat' : tab === 'checkin' ? 'Check-In' : 'Plan'}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">

        {/* INSIGHTS */}
        {activeTab === 'insights' && (
          <motion.div key="insights" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Training Intelligence card */}
            {(activeMuscles.length > 0 || progressionSuggestions.length > 0 || deloadRec.recommended) && (
              <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ borderRadius: 16, border: '1px solid rgba(87,96,56,0.18)', background: 'rgba(87,96,56,0.05)', overflow: 'hidden', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <BarChart3 size={14} color="rgba(87,96,56,0.6)" />
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(87,96,56,0.6)' }}>Training Intelligence</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 6, background: 'rgba(87,96,56,0.12)', color: 'rgba(87,96,56,0.6)' }}>This week</span>
                  </div>

                  {/* Volume landmark bars */}
                  {activeMuscles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
                      {activeMuscles.slice(0, 6).map(v => {
                        const status = getVolumeStatus(v.currentVolume, v.mev, v.mav, v.mrv);
                        const info = VOLUME_STATUS_LABELS[status];
                        const pct = Math.min((v.currentVolume / v.mrv) * 100, 100);
                        return (
                          <div key={v.muscle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{v.muscle}</span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: info.color }}>{v.currentVolume} sets · {info.label}</span>
                            </div>
                            <div style={{ height: 4, borderRadius: 3, background: 'rgba(0,0,0,0.06)' }}>
                              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: info.color, transition: 'width 0.5s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Exercises ready to progress */}
                  {progressionSuggestions.filter(s => s.type === 'weight_increase').length > 0 && (
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(87,96,56,0.08)', border: '1px solid rgba(87,96,56,0.18)', marginBottom: 8 }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#576038', marginBottom: 5 }}>Ready to Progress</div>
                      {progressionSuggestions.filter(s => s.type === 'weight_increase').slice(0, 3).map(s => (
                        <div key={s.exerciseId} style={{ fontSize: '0.73rem', color: 'var(--text-primary)', marginBottom: 3 }}>
                          <span style={{ fontWeight: 700 }}>{s.exerciseName}</span>
                          <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}> — {s.reasoning}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stalled exercises */}
                  {progressionSuggestions.filter(s => s.type === 'deload').length > 0 && (
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', marginBottom: 8 }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#974400', marginBottom: 5 }}>Stalled — Consider Deload</div>
                      {progressionSuggestions.filter(s => s.type === 'deload').slice(0, 2).map(s => (
                        <div key={s.exerciseId} style={{ fontSize: '0.73rem', color: 'var(--text-primary)', marginBottom: 3 }}>
                          <span style={{ fontWeight: 700 }}>{s.exerciseName}</span>
                          <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}> — {s.reasoning}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Deload signal */}
                  {deloadRec.recommended && (
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(151,68,0,0.07)', border: '1px solid rgba(151,68,0,0.20)' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#974400', marginBottom: 4 }}>
                        Deload Signal · {deloadRec.urgency.replace('_', ' ')}
                      </div>
                      <div style={{ fontSize: '0.73rem', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {deloadRec.reasons[0]}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {activeInsights.slice(0, 6).map(insight => (
                <InsightCard key={insight.id} insight={insight}
                  onDismiss={() => dismissCoachInsight(insight.id)} />
              ))}
            </AnimatePresence>
            {activeInsights.length === 0 && activeMuscles.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">✨</div>
                <div className="empty-state-title">All insights reviewed</div>
                <div className="empty-state-body">You've been through all current coaching points. Keep logging to generate new ones.</div>
              </div>
            )}
          </motion.div>
        )}

        {/* AI CHAT */}
        {activeTab === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>

            {/* Key required banner */}
            {!hasClaudeKey && (
              <div style={{ borderRadius: 16, padding: '14px 16px', background: 'rgba(87,96,56,0.08)', border: '1px solid rgba(87,96,56,0.18)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(87,96,56,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Lock size={15} color="rgba(87,96,56,0.6)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>AI Chat requires a Claude key</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    Enter your Claude key in Settings → AI Coach. Powered by Claude Haiku.
                  </div>
                </div>
              </div>
            )}

            {/* Intro if no messages */}
            {chatMessages.length === 0 && (
              <div style={{ borderRadius: 18, padding: '18px 16px', background: 'linear-gradient(135deg, rgba(87,96,56,0.08) 0%, rgba(151,68,0,0.05) 100%)', border: '1px solid rgba(87,96,56,0.18)', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg, #576038, #C2CB9A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={16} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'rgba(87,96,56,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>AI Coach</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Ask me anything</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {suggestedQuestions.map(q => (
                    <button key={q}
                      onClick={() => { if (!chatLoading && hasClaudeKey) sendMessage(q); else setChatInput(q); }}
                      style={{ textAlign: 'left', padding: '9px 13px', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {chatMessages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {chatMessages.map(m => (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {m.role === 'assistant' && (
                      <div style={{ width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(135deg, #576038, #C2CB9A)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                        <Brain size={11} color="white" />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '86%', padding: '10px 14px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                      background: m.role === 'user' ? 'linear-gradient(135deg, #576038, #3E4528)' : 'var(--bg-elevated)',
                      border: m.role === 'assistant' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                      fontSize: '0.84rem', fontWeight: 500, lineHeight: 1.6, color: 'var(--text-primary)',
                      boxShadow: m.role === 'user' ? '0 4px 12px rgba(87,96,56,0.25)' : '0 2px 8px rgba(0,0,0,0.06)',
                    }}>
                      {m.role === 'assistant' ? <ChatMarkdown text={m.content} /> : m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(135deg, #576038, #C2CB9A)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                      <Brain size={11} color="white" />
                    </div>
                    <div style={{ padding: '10px 16px', borderRadius: '4px 18px 18px 18px', background: 'var(--bg-elevated)', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#576038', animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Input */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  className="input-field"
                  placeholder={hasClaudeKey ? 'Ask your coach...' : 'Set Claude key in Settings to chat...'}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
                  disabled={!hasClaudeKey}
                  style={{ paddingRight: '3rem', fontSize: '0.9rem' }}
                />
              </div>
              <button
                onClick={handleChat}
                disabled={!chatInput.trim() || chatLoading || !hasClaudeKey}
                style={{ width: 44, height: 44, borderRadius: 14, background: chatInput.trim() && !chatLoading && hasClaudeKey ? 'linear-gradient(135deg, #576038, #C2CB9A)' : 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: chatInput.trim() && !chatLoading && hasClaudeKey ? 'pointer' : 'default', flexShrink: 0, transition: 'background 0.2s', boxShadow: chatInput.trim() && hasClaudeKey ? '0 4px 12px rgba(87,96,56,0.25)' : 'none' }}>
                <Send size={16} color={chatInput.trim() && !chatLoading && hasClaudeKey ? 'white' : 'rgba(0,0,0,0.20)'} />
              </button>
            </div>
          </motion.div>
        )}

        {/* WEEKLY CHECK-IN */}
        {activeTab === 'checkin' && (
          <motion.div key="checkin" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <WeeklyCheckInCard
              stats={weeklyStats}
              checkIn={thisWeekCheckIn}
              adjustment={weekAdjustment}
              onComplete={handleCompleteCheckIn}
              loading={weeklyLoading}
            />
            {thisWeekCheckIn?.coachResponse && (
              <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(87,96,56,0.6)', marginBottom: 8 }}>Coach Review</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  <ChatMarkdown text={thisWeekCheckIn.coachResponse} />
                </div>
              </div>
            )}
            {/* Past check-ins */}
            {state.weeklyCheckIns.length > 1 && (
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Past check-ins</div>
                {state.weeklyCheckIns.slice(1, 5).map(ci => (
                  <div key={ci.id} style={{ borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '12px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                        Week of {new Date(ci.weekStart).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                      </span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: ci.calorieAdherence >= 80 ? '#576038' : '#974400' }}>
                        {ci.calorieAdherence}% adherence
                      </span>
                    </div>
                    {ci.coachResponse && (
                      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', lineHeight: 1.5 }} className="truncate-2">
                        {ci.coachResponse}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* YOUR PLAN */}
        {activeTab === 'plan' && (
          <motion.div key="plan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Current targets */}
            <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '16px 18px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 12 }}>Current Targets</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Calories', value: `${user.targets.calories}`, unit: 'kcal', color: '#974400' },
                  { label: 'Protein', value: `${user.targets.protein}`, unit: 'g/day', color: '#974400' },
                  { label: 'Carbs', value: `${user.targets.carbs}`, unit: 'g/day', color: '#576038' },
                  { label: 'Fats', value: `${user.targets.fats}`, unit: 'g/day', color: '#576038' },
                ].map(({ label, value, unit, color }) => (
                  <div key={label} className="metric-tile" style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.04em', color }}>{value}</div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{unit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Goal context */}
            <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px 16px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 10 }}>Goal Context</div>
              {[
                { label: 'Goal', value: user.goalType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                { label: 'Speed', value: user.preferredDietSpeed.replace(/\b\w/g, c => c.toUpperCase()) },
                { label: 'Current weight', value: `${user.weight}${state.settings.units === 'imperial' ? ' lbs' : ' kg'}` },
                ...(user.goalWeight ? [{ label: 'Goal weight', value: `${user.goalWeight}${state.settings.units === 'imperial' ? ' lbs' : ' kg'}` }] : []),
                { label: 'Training', value: `${user.trainingFrequency}x / week` },
                { label: 'Protein per kg', value: `${(user.targets.protein / user.weight).toFixed(1)} g/kg` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Science notes */}
            <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px 16px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(87,96,56,0.6)', marginBottom: 10 }}>How your plan is calculated</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                <strong style={{ color: 'var(--text-primary)' }}>TDEE:</strong> Mifflin-St Jeor BMR × activity multiplier, refined weekly using actual weight trend vs. calories consumed.<br /><br />
                <strong style={{ color: 'var(--text-primary)' }}>Protein:</strong> {(user.targets.protein / user.weight).toFixed(1)}g/kg — optimised for {user.goalType === 'muscle_gain' ? 'maximising MPS during surplus' : user.goalType === 'fat_loss' ? 'maximum muscle retention in deficit' : 'body recomposition'}.<br /><br />
                <strong style={{ color: 'var(--text-primary)' }}>Adaptive adjustment:</strong> If your weight trend diverges from the expected rate of change for your goal, the engine adjusts calories in 100 kcal increments at check-in.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
