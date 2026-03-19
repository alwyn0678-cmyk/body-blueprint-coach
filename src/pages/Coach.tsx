import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, ChevronRight, TrendingUp, TrendingDown, Minus,
  CheckCircle2, AlertCircle, Info, ChevronDown, ChevronUp,
  Zap, Target, BarChart3, Dumbbell, Apple, Moon,
  RefreshCw, Send, Lock, Sparkles, MessageCircle, Bot, ArrowUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { coachService } from '../services/aiCoach';
import { computeWeeklyStats, calculateWeightTrend, evaluateWeeklyCheckIn } from '../utils/aiCoachingEngine';
import { calculateTargets } from '../utils/macroEngine';
import { CoachInsight, WeeklyCheckIn } from '../types';

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
  const color = insight.priority === 'high' ? '#EF4444'
    : insight.priority === 'medium' ? '#F59E0B' : '#6366F1';
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
  const adjColor = adjustment.recommendation === 'maintain' ? '#22C55E'
    : adjustment.recommendation === 'decrease_calories' ? '#EF4444' : '#3B82F6';

  return (
    <div style={{ borderRadius: 20, background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.06) 100%)', border: '1px solid rgba(99,102,241,0.25)', padding: '18px 18px', position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A5B4FC', marginBottom: 3 }}>Weekly Check-In</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            {completed ? 'This week reviewed' : 'Week in review'}
          </div>
        </div>
        {completed ? <CheckCircle2 size={22} color="#22C55E" /> : <RefreshCw size={18} color="#A5B4FC" />}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Cal adherence', value: `${stats.calorieAdherence}%`, color: stats.calorieAdherence >= 80 ? '#22C55E' : '#F59E0B' },
          { label: 'Protein avg', value: `${stats.avgProtein}g`, color: stats.proteinAdherence >= 80 ? '#22C55E' : '#F59E0B' },
          { label: 'Workouts', value: `${stats.workoutsCompleted}`, color: '#3B82F6' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 10px' }}>
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
          {loading ? <span className="btn-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : <Brain size={14} />}
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

  const color = evaluation.recommendation === 'decrease_calories' ? '#EF4444' : '#3B82F6';

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

  // ── AI Chat state (after data vars are declared) ───────────────────────────
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string; id: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasGroqKey = !!localStorage.getItem('bbc_groq_api_key') || !!import.meta.env.VITE_GROQ_API_KEY;

  // ── AI Chat Agent state (bottom section) ──────────────────────────────────
  const [agentMessages, setAgentMessages] = useState<{role: 'user'|'assistant', text: string}[]>([]);
  const [agentInput, setAgentInput] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const agentEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    agentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages]);

  const sendChat = async () => {
    const msg = agentInput.trim();
    if (!msg || agentLoading) return;
    setAgentInput('');
    const newMessages = [...agentMessages, {role: 'user' as const, text: msg}];
    setAgentMessages(newMessages);
    setAgentLoading(true);

    try {
      const key = localStorage.getItem('bbc_groq_api_key');
      if (!key) {
        setAgentMessages(prev => [...prev, {role: 'assistant' as const, text: 'No API key found. Go to Settings → AI Coach, paste your Groq key, and come back. Get a free key at console.groq.com'}]);
        setAgentLoading(false);
        return;
      }

      const systemPrompt = `You are an elite fitness coach AI assistant for the Evolved app. You specialise in hypertrophy, Mark Carroll methodology, RPE-based training, and macro nutrition. Be concise, direct, and motivating. Answer in 2-4 sentences max unless more detail is requested.`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`},
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 400,
          messages: [
            {role: 'system', content: systemPrompt},
            ...newMessages.map(m => ({role: m.role, content: m.text})),
          ],
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message ?? `HTTP ${res.status}`;
        setAgentMessages(prev => [...prev, {role: 'assistant' as const, text: `API error: ${errMsg}. Check your key in Settings is correct.`}]);
        setAgentLoading(false);
        return;
      }
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? 'Sorry, I had trouble responding. Try again.';
      setAgentMessages(prev => [...prev, {role: 'assistant' as const, text: reply}]);
    } catch (e: any) {
      setAgentMessages(prev => [...prev, {role: 'assistant' as const, text: `Connection error: ${e?.message ?? 'unknown'}. Check your internet connection.`}]);
    }
    setAgentLoading(false);
  };

  const handleChat = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    const userMsg = { role: 'user' as const, content: msg, id: `u_${Date.now()}` };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const reply = await coachService.chat(
        { user, weeklyStats, recentWorkouts: [], weightTrend: weightDelta < -0.1 ? 'losing' : weightDelta > 0.1 ? 'gaining' : 'maintaining', weightDelta7d: weightDelta, currentEma: currentEma ?? undefined },
        msg,
        chatMessages.map(m => ({ role: m.role, content: m.content })),
      );
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: reply ?? `I need a Groq API key to reply. Add one for free at console.groq.com, then paste it in Settings → AI Coach. It unlocks LLaMA 3.3-70B powered coaching.`,
        id: `a_${Date.now()}`,
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, chatMessages, user, weeklyStats, weightDelta, currentEma]);

  // Coach insights (static library)
  const allInsights = useMemo(() => coachService.getInsights(user, weeklyStats), [user, weeklyStats]);
  const activeInsights = allInsights.filter(i => !state.coachInsights.find(s => s.id === i.id && s.dismissed));
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
      const reviewText = await coachService.getWeeklyReview({
        user, weeklyStats,
        recentWorkouts: [],
        weightTrend: weightDelta < -0.1 ? 'losing' : weightDelta > 0.1 ? 'gaining' : 'maintaining',
        weightDelta7d: weightDelta,
        currentEma: currentEma ?? undefined,
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

  const insightColor = dailyInsight.priority === 'high' ? '#EF4444'
    : dailyInsight.priority === 'medium' ? '#F59E0B' : '#6366F1';

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
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #6366F1, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <AnimatePresence>
              {activeInsights.slice(0, 6).map(insight => (
                <InsightCard key={insight.id} insight={insight}
                  onDismiss={() => dismissCoachInsight(insight.id)} />
              ))}
            </AnimatePresence>
            {activeInsights.length === 0 && (
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
            {!hasGroqKey && (
              <div style={{ borderRadius: 16, padding: '14px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Lock size={15} color="#A5B4FC" />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>AI Chat requires a Groq key</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    Free at console.groq.com → enter in Settings → AI Coach. Powered by LLaMA 3.3-70B.
                  </div>
                </div>
              </div>
            )}

            {/* Intro if no messages */}
            {chatMessages.length === 0 && (
              <div style={{ borderRadius: 18, padding: '18px 16px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.06) 100%)', border: '1px solid rgba(99,102,241,0.22)', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg, #6366F1, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={16} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.07em' }}>AI Coach</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Ask me anything</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    'Why am I not losing weight?',
                    'How should I adjust my macros?',
                    'Best exercises for muscle growth?',
                    'When should I do a refeed day?',
                  ].map(q => (
                    <button key={q} onClick={() => { setChatInput(q); }}
                      style={{ textAlign: 'left', padding: '9px 13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
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
                      <div style={{ width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(135deg, #6366F1, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                        <Brain size={11} color="white" />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '86%', padding: '10px 14px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                      background: m.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                      border: m.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      fontSize: '0.84rem', fontWeight: 500, lineHeight: 1.55, color: 'var(--text-primary)',
                      boxShadow: m.role === 'user' ? '0 4px 12px rgba(59,130,246,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: 'linear-gradient(135deg, #6366F1, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                      <Brain size={11} color="white" />
                    </div>
                    <div style={{ padding: '10px 16px', borderRadius: '4px 18px 18px 18px', background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1', animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
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
                  placeholder={hasGroqKey ? 'Ask your coach...' : 'Set Groq key in Settings to chat...'}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
                  disabled={!hasGroqKey}
                  style={{ paddingRight: '3rem', fontSize: '0.9rem' }}
                />
              </div>
              <button
                onClick={handleChat}
                disabled={!chatInput.trim() || chatLoading || !hasGroqKey}
                style={{ width: 44, height: 44, borderRadius: 14, background: chatInput.trim() && !chatLoading && hasGroqKey ? 'linear-gradient(135deg, #6366F1, #A855F7)' : 'rgba(255,255,255,0.07)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: chatInput.trim() && !chatLoading && hasGroqKey ? 'pointer' : 'default', flexShrink: 0, transition: 'background 0.2s', boxShadow: chatInput.trim() && hasGroqKey ? '0 4px 12px rgba(99,102,241,0.4)' : 'none' }}>
                <Send size={16} color={chatInput.trim() && !chatLoading && hasGroqKey ? 'white' : 'rgba(255,255,255,0.3)'} />
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
                <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#A5B4FC', marginBottom: 8 }}>Coach Review</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {thisWeekCheckIn.coachResponse}
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
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: ci.calorieAdherence >= 80 ? '#22C55E' : '#F59E0B' }}>
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
                  { label: 'Calories', value: `${user.targets.calories}`, unit: 'kcal', color: '#EF4444' },
                  { label: 'Protein', value: `${user.targets.protein}`, unit: 'g/day', color: '#F59E0B' },
                  { label: 'Carbs', value: `${user.targets.carbs}`, unit: 'g/day', color: '#3B82F6' },
                  { label: 'Fats', value: `${user.targets.fats}`, unit: 'g/day', color: '#22C55E' },
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
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Science notes */}
            <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px 16px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A5B4FC', marginBottom: 10 }}>How your plan is calculated</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                <strong style={{ color: 'var(--text-primary)' }}>TDEE:</strong> Mifflin-St Jeor BMR × activity multiplier, refined weekly using actual weight trend vs. calories consumed.<br /><br />
                <strong style={{ color: 'var(--text-primary)' }}>Protein:</strong> {(user.targets.protein / user.weight).toFixed(1)}g/kg — optimised for {user.goalType === 'muscle_gain' ? 'maximising MPS during surplus' : user.goalType === 'fat_loss' ? 'maximum muscle retention in deficit' : 'body recomposition'}.<br /><br />
                <strong style={{ color: 'var(--text-primary)' }}>Adaptive adjustment:</strong> If your weight trend diverges from the expected rate of change for your goal, the engine adjusts calories in 100 kcal increments at check-in.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chat Agent */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={14} color="#fff" />
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)' }}>AI Coach Chat</span>
        </div>

        {/* Messages */}
        <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 18, padding: '12px', marginBottom: 10, minHeight: 80, maxHeight: 260, overflowY: 'auto' }}>
          {agentMessages.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.82rem', fontWeight: 500, textAlign: 'center', padding: '16px 0' }}>
              Ask me anything about training, nutrition, or recovery...
            </div>
          ) : (
            agentMessages.map((m, i) => (
              <div key={i} style={{ marginBottom: 10, display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%', padding: '8px 12px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role === 'user' ? 'linear-gradient(135deg, #3B82F6, #6366F1)' : 'rgba(255,255,255,0.07)',
                  fontSize: '0.82rem', fontWeight: 500, lineHeight: 1.5,
                  color: m.role === 'user' ? '#fff' : 'rgba(255,255,255,0.85)',
                }}>
                  {m.text}
                </div>
              </div>
            ))
          )}
          {agentLoading && (
            <div style={{ display: 'flex', gap: 4, padding: '4px 8px' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(99,102,241,0.6)', animation: `chatDot 1.2s ease-in-out ${i*0.2}s infinite` }} />
              ))}
            </div>
          )}
          <div ref={agentEndRef} />
        </div>

        {/* Input row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={agentInput}
            onChange={e => setAgentInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendChat()}
            placeholder="Ask your AI coach..."
            style={{
              flex: 1, padding: '0.75rem 1rem', borderRadius: 14,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: '0.88rem', fontWeight: 500, outline: 'none',
            }}
          />
          <button
            onClick={sendChat}
            disabled={!agentInput.trim() || agentLoading}
            style={{
              width: 44, height: 44, borderRadius: 14, border: 'none', cursor: 'pointer',
              background: agentInput.trim() && !agentLoading ? 'linear-gradient(135deg, #3B82F6, #6366F1)' : 'rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <ArrowUp size={18} color={agentInput.trim() && !agentLoading ? '#fff' : 'rgba(255,255,255,0.25)'} />
          </button>
        </div>
      </div>

      <style>{`@keyframes chatDot { 0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
};
