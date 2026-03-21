import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Plus, Ruler, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateWeightTrend, computeWeeklyStats } from '../utils/aiCoachingEngine';
import { BodyMeasurement } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Timeframe = '2W' | '1M' | '3M' | 'All';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
const todayStr = () => new Date().toISOString().split('T')[0];

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ fontSize: '0.78rem', fontWeight: 800, color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
};

// Glow dot on last chart data point
const GlowDot: React.FC<any> = (props) => {
  const { cx, cy, index, data, color } = props;
  if (index !== (data?.length ?? 0) - 1) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.15} />
      <circle cx={cx} cy={cy} r={4} fill={color} opacity={0.4} />
      <circle cx={cx} cy={cy} r={2.5} fill={color} />
    </g>
  );
};

// ─── Measurement form ─────────────────────────────────────────────────────────

const MEASUREMENT_FIELDS = [
  { key: 'weight', label: 'Weight', suffix: 'kg' },
  { key: 'bodyFat', label: 'Body fat', suffix: '%' },
  { key: 'chest', label: 'Chest', suffix: 'cm' },
  { key: 'waist', label: 'Waist', suffix: 'cm' },
  { key: 'hips', label: 'Hips', suffix: 'cm' },
  { key: 'neck', label: 'Neck', suffix: 'cm' },
  { key: 'leftArm', label: 'L Arm', suffix: 'cm' },
  { key: 'rightArm', label: 'R Arm', suffix: 'cm' },
  { key: 'leftThigh', label: 'L Thigh', suffix: 'cm' },
  { key: 'rightThigh', label: 'R Thigh', suffix: 'cm' },
] as const;

const MeasurementSheet: React.FC<{ onClose: () => void; onSave: (m: BodyMeasurement) => void }> = ({ onClose, onSave }) => {
  const [form, setForm] = useState<Record<string, string>>({});

  const handleSave = () => {
    const m: BodyMeasurement = {
      id: `m_${Date.now()}`,
      date: todayStr(),
    };
    MEASUREMENT_FIELDS.forEach(f => {
      const v = parseFloat(form[f.key]);
      if (isFinite(v) && v > 0) (m as any)[f.key] = v;
    });
    onSave(m);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        style={{ position: 'relative', background: 'var(--bg-sheet)', borderRadius: '24px 24px 0 0', padding: '20px 20px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))', maxHeight: '85dvh', overflowY: 'auto' }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.10)', margin: '0 auto 18px' }} />
        <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 16 }}>Log measurements</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {MEASUREMENT_FIELDS.map(f => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 72, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{f.label}</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number" inputMode="decimal"
                  value={form[f.key] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="input-field"
                  placeholder="—"
                  style={{ flex: 1, fontSize: '0.95rem', fontWeight: 700, padding: '8px 12px', textAlign: 'right' }}
                />
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', width: 26 }}>{f.suffix}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>Save</button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Measurement history card ─────────────────────────────────────────────────

const MeasurementCard: React.FC<{
  measurement: BodyMeasurement;
  prev?: BodyMeasurement;
  onDelete: () => void;
}> = ({ measurement, prev, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const delta = (key: keyof BodyMeasurement): string => {
    const curr = (measurement as any)[key];
    const p = prev ? (prev as any)[key] : undefined;
    if (!curr || !p) return '';
    const d = curr - p;
    return `${d > 0 ? '+' : ''}${d.toFixed(1)}`;
  };
  const deltaColor = (key: keyof BodyMeasurement): string => {
    const curr = (measurement as any)[key];
    const p = prev ? (prev as any)[key] : undefined;
    if (!curr || !p) return 'var(--text-tertiary)';
    const d = curr - p;
    // For weight/fat: down is good (fat_loss); for measurements like arm: up might be good
    return d < 0 ? '#576038' : d > 0 ? '#974400' : 'var(--text-tertiary)';
  };

  return (
    <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px 16px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? 12 : 0 }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>
            {fmtDate(measurement.date)}
          </div>
          {measurement.weight && (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.03em', marginTop: 2 }}>
              {measurement.weight}kg
              {prev?.weight && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, marginLeft: 8, color: deltaColor('weight') }}>
                  {delta('weight')}kg
                </span>
              )}
            </div>
          )}
          {measurement.bodyFat && (
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
              {measurement.bodyFat}% BF
              {prev?.bodyFat && <span style={{ marginLeft: 6, color: deltaColor('bodyFat') }}>{delta('bodyFat')}%</span>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', padding: '4px 8px', borderRadius: 8, fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', cursor: 'pointer' }}>
            {expanded ? 'Less' : 'More'}
          </button>
          <button onClick={onDelete}
            style={{ background: 'rgba(239,68,68,0.1)', border: 'none', padding: 6, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={13} color="#EF4444" />
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          {MEASUREMENT_FIELDS.filter(f => f.key !== 'weight' && f.key !== 'bodyFat').map(f => {
            const val = (measurement as any)[f.key];
            if (!val) return null;
            return (
              <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{f.label}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{val}{f.suffix}</span>
                  {prev && delta(f.key as any) && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: deltaColor(f.key as any) }}>{delta(f.key as any)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Progress page ────────────────────────────────────────────────────────────

export const Progress: React.FC = () => {
  const { state, addMeasurement, deleteMeasurement, showToast } = useApp();
  const user = state.user!;

  const [activeTab, setActiveTab] = useState<'weight' | 'nutrition' | 'body'>('weight');
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [showMeasure, setShowMeasure] = useState(false);

  // Weight trend data
  const allTrendData = useMemo(() => {
    const data = calculateWeightTrend(state.logs, user.weight);
    return data.filter(d => d.weight !== null || d.trend !== null);
  }, [state.logs, user.weight]);

  const tfDays: Record<Timeframe, number> = { '2W': 14, '1M': 30, '3M': 90, 'All': 365 };
  const trendData = allTrendData.slice(-tfDays[timeframe]);

  // Weight stats
  const firstWeight = trendData.find(d => d.trend !== null)?.trend;
  const lastWeight = [...trendData].reverse().find(d => d.trend !== null)?.trend;
  const weightChange = firstWeight && lastWeight ? lastWeight - firstWeight : null;
  const weeklyRate = weightChange !== null && trendData.length > 0 ? (weightChange / trendData.length) * 7 : null;

  // Weekly nutrition chart
  const weeklyStats = useMemo(() => computeWeeklyStats(state.logs, user.targets), [state.logs, user.targets]);
  const nutritionChartData = useMemo(() => {
    const days: { date: string; calories: number; protein: number }[] = [];
    const d = new Date();
    for (let i = 6; i >= 0; i--) {
      const dd = new Date(d); dd.setDate(d.getDate() - i);
      const ds = dd.toISOString().split('T')[0];
      const log = state.logs[ds];
      let cal = 0, pro = 0;
      if (log) {
        Object.values(log.meals).flat().forEach(e => {
          cal += e.nutrition.calories * e.amount;
          pro += e.nutrition.protein * e.amount;
        });
      }
      days.push({ date: dd.toLocaleDateString('en-AU', { weekday: 'short' }), calories: Math.round(cal), protein: Math.round(pro) });
    }
    return days;
  }, [state.logs]);

  // Measurements sorted newest first
  const sortedMeasurements = useMemo(() =>
    [...state.measurements].sort((a, b) => b.date.localeCompare(a.date))
  , [state.measurements]);

  return (
    <div className="page page-top-pad safe-bottom" style={{ gap: 14 }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="page-header" style={{ paddingBottom: 6 }}>
          <div>
            <div className="page-title">Progress</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Track every metric that matters
            </div>
          </div>
          <button onClick={() => setShowMeasure(true)} className="btn-icon" style={{ width: 36, height: 36 }}>
            <Plus size={16} />
          </button>
        </div>
      </motion.div>

      {/* ── Key stats ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Current', value: lastWeight ? `${lastWeight.toFixed(1)}` : `${user.weight}`, unit: 'kg', color: '#576038' },
          { label: `${timeframe} change`, value: weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(2)}` : '—', unit: 'kg', color: weightChange !== null ? (weightChange < 0 && user.goalType === 'fat_loss' ? '#576038' : weightChange > 0 && user.goalType === 'muscle_gain' ? '#576038' : '#974400') : 'var(--text-tertiary)' },
          { label: 'Weekly rate', value: weeklyRate !== null ? `${weeklyRate > 0 ? '+' : ''}${weeklyRate.toFixed(2)}` : '—', unit: 'kg/wk', color: '#576038' },
        ].map(({ label, value, unit, color }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '12px 12px' }}>
            <div style={{ fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.03em', color }}>{value}</div>
            <div style={{ fontSize: '0.58rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{unit}</div>
          </div>
        ))}
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="pill-tabs">
          {(['weight', 'nutrition', 'body'] as const).map(tab => (
            <button key={tab} className={`pill-tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'weight' ? 'Weight' : tab === 'nutrition' ? 'Nutrition' : 'Body'}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── WEIGHT TAB ── */}
        {activeTab === 'weight' && (
          <motion.div key="weight" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Timeframe selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['2W', '1M', '3M', 'All'] as Timeframe[]).map(tf => (
                <button key={tf} onClick={() => setTimeframe(tf)}
                  style={{ flex: 1, padding: '6px', borderRadius: 8, border: 'none', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', background: timeframe === tf ? '#576038' : 'rgba(0,0,0,0.05)', color: timeframe === tf ? 'white' : 'var(--text-tertiary)', transition: 'all 0.15s' }}>
                  {tf}
                </button>
              ))}
            </div>

            {/* Weight chart */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '16px 12px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 12, paddingLeft: 4 }}>
                Weight EMA (smoothed trend)
              </div>
              {trendData.length > 2 ? (
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="weightG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#576038" stopOpacity={0.45} />
                          <stop offset="70%" stopColor="#576038" stopOpacity={0.08} />
                          <stop offset="100%" stopColor="#576038" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(0,0,0,0.24)', fontWeight: 600 }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(trendData.length / 5))} />
                      <YAxis tick={{ fontSize: 9, fill: 'rgba(0,0,0,0.24)', fontWeight: 600 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                      <Tooltip content={<CustomTooltip />} />
                      {user.goalWeight && (
                        <ReferenceLine y={user.goalWeight} stroke="#22C55E" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Goal', fill: '#22C55E', fontSize: 9 }} />
                      )}
                      <Area type="monotone" dataKey="weight" stroke="transparent" fill="none" dot={{ r: 2, fill: 'rgba(87,96,56,0.5)', strokeWidth: 0 }} name="Logged" />
                      <Area type="monotone" dataKey="trend" stroke="#576038" strokeWidth={2.5} fill="url(#weightG)"
                        dot={(props: any) => <GlowDot {...props} data={trendData} color="#576038" />}
                        name="EMA" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <div className="empty-state-icon">⚖️</div>
                  <div className="empty-state-title">Not enough data yet</div>
                  <div className="empty-state-body">Log your weight daily for the EMA trend to appear here.</div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── NUTRITION TAB ── */}
        {activeTab === 'nutrition' && (
          <motion.div key="nutrition" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Weekly adherence */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '16px 14px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 12 }}>Calories — last 7 days</div>
              <div style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nutritionChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap="30%">
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(0,0,0,0.24)', fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'rgba(0,0,0,0.24)', fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={user.targets.calories} stroke="rgba(151,68,0,0.4)" strokeDasharray="3 3" strokeWidth={1.5} />
                    <Bar dataKey="calories" fill="#974400" radius={[4, 4, 0, 0]} name="Calories" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '16px 14px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 12 }}>Protein — last 7 days</div>
              <div style={{ height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nutritionChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap="30%">
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(0,0,0,0.24)', fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'rgba(0,0,0,0.24)', fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={user.targets.protein} stroke="rgba(87,96,56,0.4)" strokeDasharray="3 3" strokeWidth={1.5} />
                    <Bar dataKey="protein" fill="#576038" radius={[4, 4, 0, 0]} name="Protein" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Cal adherence', value: `${weeklyStats.calorieAdherence}%`, color: weeklyStats.calorieAdherence >= 80 ? '#576038' : '#974400' },
                { label: 'Protein adherence', value: `${weeklyStats.proteinAdherence}%`, color: weeklyStats.proteinAdherence >= 80 ? '#576038' : '#974400' },
                { label: 'Avg calories', value: `${weeklyStats.avgCalories}`, color: '#974400' },
                { label: 'Days logged', value: `${weeklyStats.daysLogged}/7`, color: 'var(--text-primary)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.03em', color }}>{value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── BODY TAB ── */}
        {activeTab === 'body' && (
          <motion.div key="body" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Add measurement CTA */}
            <button onClick={() => setShowMeasure(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, background: 'rgba(87,96,56,0.08)', border: '1px dashed rgba(87,96,56,0.25)', cursor: 'pointer', marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(87,96,56,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ruler size={16} color="#576038" />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#576038' }}>Log measurements</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Weight, BF%, circumferences</div>
              </div>
              <Plus size={16} color="#576038" />
            </button>

            {/* Measurements history */}
            {sortedMeasurements.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📏</div>
                <div className="empty-state-title">No measurements yet</div>
                <div className="empty-state-body">Log body measurements to track your physique changes over time.</div>
              </div>
            ) : (
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Measurement history</div>
                {sortedMeasurements.map((m, i) => (
                  <MeasurementCard
                    key={m.id}
                    measurement={m}
                    prev={sortedMeasurements[i + 1]}
                    onDelete={() => { deleteMeasurement(m.id); showToast('Measurement deleted', 'info'); }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Measurement sheet ── */}
      <AnimatePresence>
        {showMeasure && (
          <MeasurementSheet
            onClose={() => setShowMeasure(false)}
            onSave={m => { addMeasurement(m); setShowMeasure(false); showToast('Measurements logged!', 'success'); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
