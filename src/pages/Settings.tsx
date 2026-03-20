import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell, Calculator, Check, ChevronRight, Download, Edit2, Trash2, Upload, X,
} from 'lucide-react';
import { calculateTargets, calculateTDEEBreakdown } from '../utils/macroEngine';
import { kgToLbs, cmToFtIn } from '../utils/units';
import { UserProfile } from '../types';
import {
  DangerButton,
  MetricCard,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
  SettingsRow,
  StatusBadge,
  ToggleRow,
} from '../components/SharedUI';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bgPrimary: '#080810',
  bgCard: '#0f0f1a',
  bgElevated: '#161625',
  accentBlue: '#0A84FF',
  accentGreen: '#32D74B',
  accentOrange: '#FF9F0A',
  accentRed: '#FF453A',
  textPrimary: '#F2F2F7',
  textSecondary: 'rgba(242,242,247,0.6)',
  textTertiary: 'rgba(242,242,247,0.35)',
  border: 'rgba(255,255,255,0.06)',
  borderMd: 'rgba(255,255,255,0.1)',
};

// ── Local primitives ──────────────────────────────────────────────────────────

const PageCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    background: C.bgCard,
    borderRadius: 20,
    border: `1px solid ${C.border}`,
    overflow: 'hidden',
    ...style,
  }}>
    {children}
  </div>
);

const RowDivider: React.FC = () => (
  <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 16px' }} />
);

const SecLabel: React.FC<{ text: string }> = ({ text }) => (
  <div style={{
    fontSize: '0.65rem',
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 8,
  }}>
    {text}
  </div>
);

const GoalBadgePill: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span style={{
    fontSize: '0.6rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    color,
    background: `${color}1A`,
    border: `1px solid ${color}40`,
    borderRadius: 9999,
    padding: '2px 8px',
  }}>
    {label}
  </span>
);

// ── Connected apps config ─────────────────────────────────────────────────────

const INTEGRATIONS = [
  { id: 'apple_health', name: 'Apple Health', sub: 'Steps, HRV, sleep · iOS', emoji: '🍎' },
  { id: 'google_fit',   name: 'Google Fit',   sub: 'Steps, activity · Android', emoji: '🏃' },
  { id: 'garmin',       name: 'Garmin Connect', sub: 'HRV, recovery, workouts', emoji: '⌚' },
  { id: 'whoop',        name: 'Whoop',        sub: 'Strain, recovery, sleep', emoji: '💪' },
] as const;

// ── Programs config ───────────────────────────────────────────────────────────

const PROGRAMS = [
  {
    id: 'female_phase1' as const,
    emoji: '🍑',
    name: 'Glute & Tone Focus',
    tag: 'Female · Phase 1',
    desc: 'Lower-body emphasis with upper accessory work. Designed for lean muscle, shape, and tone.',
    split: 'Lower · Upper · 4 days/week',
    accent: '#FF9F0A',
  },
  {
    id: 'male_phase2' as const,
    emoji: '💪',
    name: 'Strength & Size',
    tag: 'Male · Phase 2',
    desc: 'Push-Pull-Legs-Upper split focused on hypertrophy and progressive overload.',
    split: 'Push · Pull · Legs · Upper · 4 days/week',
    accent: '#0A84FF',
  },
];

// ── Toggle switch primitive ───────────────────────────────────────────────────

const ToggleSwitch: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
  <button
    onClick={onChange}
    style={{
      width: 44,
      height: 26,
      borderRadius: 13,
      background: value ? C.accentBlue : 'rgba(255,255,255,0.12)',
      border: 'none',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.2s ease',
      flexShrink: 0,
    }}
  >
    <div style={{
      position: 'absolute',
      top: 3,
      left: value ? 21 : 3,
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: '#fff',
      transition: 'left 0.2s ease',
      boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
    }} />
  </button>
);

// ── Preferences row ───────────────────────────────────────────────────────────

const PrefRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  right: React.ReactNode;
}> = ({ icon, label, subtitle, right }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    gap: 14,
  }}>
    <div style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0, display: 'flex' }}>{icon}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: C.textPrimary }}>{label}</div>
      {subtitle && <div style={{ fontSize: '0.68rem', color: C.textTertiary, fontWeight: 600, marginTop: 1 }}>{subtitle}</div>}
    </div>
    {right}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const Settings: React.FC = () => {
  const {
    state, resetApp, showToast,
    updateSettings, updateConnectionStatus, updateUnits,
    setAssignedProgram, updateUser,
  } = useApp();
  const { user, settings } = state;

  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showProgramPicker, setShowProgramPicker] = useState(false);
  const [resetStep, setResetStep] = useState<'idle' | 'confirm1' | 'confirm2'>('idle');
  const [exportingJSON, setExportingJSON] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [comingSoonApp, setComingSoonApp] = useState<{ name: string; id: string } | null>(null);
  const [notifyEnabled, setNotifyEnabled] = useState<Record<string, boolean>>({});
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('bbc_gemini_api_key') ?? '');
  const [geminiKeySaved, setGeminiKeySaved] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  if (!user) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: C.textTertiary }}>
      No profile found.
    </div>
  );

  const tdee = calculateTDEEBreakdown(user);
  const goalLabel = user.goalType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const goalColor = user.goalType === 'fat_loss' ? C.accentOrange : user.goalType === 'muscle_gain' ? C.accentBlue : user.goalType === 'recomposition' ? '#a78bfa' : C.accentGreen;
  const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const currentProgram = PROGRAMS.find(p => p.id === state.assignedProgram);
  const isMetric = (settings.units ?? 'metric') === 'metric';

  const weightDisplay = isMetric ? `${user.weight} kg` : `${kgToLbs(user.weight)} lbs`;
  const heightFtIn = cmToFtIn(user.height);
  const heightDisplay = isMetric ? `${user.height} cm` : `${heightFtIn.ft}'${heightFtIn.inches}"`;
  const goalWeightDisplay = user.goalWeight
    ? isMetric ? `${user.goalWeight} kg` : `${kgToLbs(user.goalWeight)} lbs`
    : '—';

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleExportJSON = () => {
    setExportingJSON(true);
    setTimeout(() => {
      try {
        const data = localStorage.getItem('bbc_state') || '{}';
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `evolved-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        showToast('Data exported as JSON', 'success');
      } catch { showToast('Export failed', 'error'); }
      setExportingJSON(false);
    }, 300);
  };

  const handleExportCSV = () => {
    setExportingCSV(true);
    setTimeout(() => {
      try {
        const rows = [['Date', 'Weight (kg)', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fats (g)', 'Water (glasses)', 'Steps', 'Recovery Score']];
        Object.entries(state.logs)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([date, log]: [string, any]) => {
            const macros = Object.values(log.meals as Record<string, any[]>).flat().reduce(
              (acc: any, item: any) => ({
                calories: acc.calories + item.nutrition.calories * item.amount,
                protein:  acc.protein  + item.nutrition.protein  * item.amount,
                carbs:    acc.carbs    + item.nutrition.carbs    * item.amount,
                fats:     acc.fats     + item.nutrition.fats     * item.amount,
              }),
              { calories: 0, protein: 0, carbs: 0, fats: 0 }
            );
            rows.push([
              date,
              log.weight?.toString() || '',
              Math.round(macros.calories).toString(),
              Math.round(macros.protein).toString(),
              Math.round(macros.carbs).toString(),
              Math.round(macros.fats).toString(),
              log.waterGlasses?.toString() || '0',
              log.steps?.toString() || '0',
              log.health?.recoveryScore?.toString() || '',
            ]);
          });
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `evolved-history-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        showToast('History exported as CSV', 'success');
      } catch { showToast('CSV export failed', 'error'); }
      setExportingCSV(false);
    }, 300);
  };

  const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImportError(null);
    setImportSuccess(null);
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setImportError('File too large — max 5MB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid structure');
        if (!('logs' in parsed)) throw new Error('Missing required field: logs');
        if (!('user' in parsed) && !('settings' in parsed)) throw new Error('Missing required field: user or settings');
        const fromVersion = parsed.schemaVersion ?? parsed._schema ?? 'unknown';
        const toVersion = 4;
        localStorage.setItem('bbc_state', text);
        const migrationMsg = fromVersion !== 'unknown' && fromVersion !== toVersion
          ? `Imported v${fromVersion} data → migrated to v${toVersion}`
          : 'Data imported successfully';
        setImportSuccess(migrationMsg);
        showToast(`${migrationMsg} — reloading...`, 'success');
        setTimeout(() => window.location.reload(), 1400);
      } catch (err: any) {
        const msg = err.message?.includes('Missing required field')
          ? err.message
          : `Invalid file format: ${err.message || 'parse error'}`;
        setImportError(msg);
        showToast(`Import failed: ${msg}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConnectApp = (id: string, name: string) => setComingSoonApp({ id, name });

  const handleResetConfirm = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bbc_')) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    resetApp();
    setResetStep('idle');
    setTimeout(() => window.location.reload(), 300);
  };

  const toggleCoaching = (key: 'adaptiveCoaching' | 'plateauDetection' | 'weeklyCheckIn') => {
    const current = settings[key];
    updateSettings({ [key]: !current });
    const labels: Record<string, string> = {
      adaptiveCoaching: 'Adaptive Coaching',
      plateauDetection: 'Plateau Detection',
      weeklyCheckIn: 'Weekly Check-In',
    };
    showToast(`${!current ? 'Enabled' : 'Disabled'} ${labels[key]}`, 'info');
  };

  const handleNotificationsToggle = async () => {
    const current = settings.notificationsEnabled ?? false;
    if (!current) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          updateSettings({ notificationsEnabled: true });
          showToast('Notifications enabled', 'success');
        } else {
          updateSettings({ notificationsEnabled: false });
          showToast('Permission denied — enable in browser settings', 'error');
        }
      } else {
        updateSettings({ notificationsEnabled: true });
        showToast('Enabled Notifications', 'info');
      }
    } else {
      updateSettings({ notificationsEnabled: false });
      showToast('Disabled Notifications', 'info');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: '1rem',
        paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
        background: C.bgPrimary,
        minHeight: '100dvh',
      }}
    >
      {/* ── Page header ── */}
      <div style={{ paddingTop: '0.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: C.textPrimary }}>Settings</h1>
        <p style={{ fontSize: '0.78rem', color: C.textTertiary, fontWeight: 600, marginTop: 2 }}>Profile, targets & preferences</p>
      </div>

      {/* ══ 1. PROFILE HEADER ════════════════════════════════════════════════ */}
      <section>
        <SecLabel text="Profile" />
        <PageCard>
          {/* Top accent strip */}
          <div style={{
            height: 2,
            background: `linear-gradient(90deg, transparent, ${goalColor}60, transparent)`,
          }} />

          <div style={{ padding: '16px 16px 0' }}>
            {/* Avatar row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${goalColor}30, ${goalColor}15)`,
                border: `1.5px solid ${goalColor}50`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: 800,
                color: goalColor,
                flexShrink: 0,
                letterSpacing: '-0.02em',
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.01em', color: C.textPrimary, marginBottom: 5 }}>
                  {user.name}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                  <GoalBadgePill label={goalLabel} color={goalColor} />
                  {currentProgram && <GoalBadgePill label={currentProgram.name} color={currentProgram.accent} />}
                </div>
              </div>
              <button
                onClick={() => setShowProfileEdit(true)}
                aria-label="Edit profile"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid ${C.borderMd}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Edit2 size={13} color="rgba(255,255,255,0.55)" />
              </button>
            </div>

            {/* Stat chips row */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingBottom: 14 }}>
              {[
                { label: 'Target', value: `${user.targets.calories} kcal`, color: C.accentBlue },
                { label: 'Current', value: weightDisplay, color: C.textPrimary },
                { label: 'Goal', value: goalWeightDisplay, color: goalColor },
              ].map(chip => (
                <div key={chip.label} style={{
                  flex: 1,
                  background: C.bgElevated,
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  padding: '8px 10px',
                  textAlign: 'center' as const,
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: chip.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                    {chip.value}
                  </div>
                  <div style={{ fontSize: '0.56rem', color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginTop: 3 }}>
                    {chip.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TDEE row */}
          {tdee && (
            <>
              <div style={{ height: 1, background: C.border, margin: '0 16px' }} />
              <div style={{ padding: '12px 16px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                  <Calculator size={11} color={C.accentOrange} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: C.accentOrange, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
                    TDEE · Mifflin-St Jeor
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'BMR', value: `${tdee.bmr}`, sub: 'at rest' },
                    { label: 'TDEE', value: `${tdee.tdee}`, sub: 'with activity' },
                    { label: 'Target', value: `${tdee.targetCalories}`, sub: `${Math.abs(tdee.deficit)} ${tdee.deficit < 0 ? 'deficit' : 'surplus'}` },
                  ].map(item => (
                    <div key={item.label} style={{
                      background: 'rgba(255,159,10,0.07)',
                      border: '1px solid rgba(255,159,10,0.15)',
                      borderRadius: 12,
                      padding: '8px',
                      textAlign: 'center' as const,
                    }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: C.accentOrange, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{item.value}</div>
                      <div style={{ fontSize: '0.52rem', color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginTop: 2 }}>{item.label}</div>
                      <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.22)', marginTop: 1, lineHeight: 1.3 }}>{item.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </PageCard>
      </section>

      {/* ══ 2. DAILY TARGETS ════════════════════════════════════════════════ */}
      <section>
        <SecLabel text="Daily Targets" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Calories', value: user.targets.calories, unit: 'kcal', accent: C.accentRed },
            { label: 'Protein',  value: user.targets.protein,  unit: 'g',    accent: C.accentOrange },
            { label: 'Carbs',    value: user.targets.carbs,    unit: 'g',    accent: C.accentBlue },
            { label: 'Fats',     value: user.targets.fats,     unit: 'g',    accent: C.accentGreen },
          ].map(tile => (
            <div key={tile.label} style={{
              background: C.bgCard,
              borderRadius: 16,
              border: `1px solid ${C.border}`,
              overflow: 'hidden',
              padding: 14,
            }}>
              <div style={{ height: 3, background: tile.accent, borderRadius: '3px 3px 0 0', margin: '-14px -14px 12px', opacity: 0.85 }} />
              <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: C.textTertiary, marginBottom: 4 }}>
                {tile.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: '1.7rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: C.textPrimary, lineHeight: 1 }}>
                  {tile.value}
                </span>
                <span style={{ fontSize: '0.75rem', color: C.textTertiary, fontWeight: 700 }}>{tile.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ 3. PREFERENCES ══════════════════════════════════════════════════ */}
      <section>
        <SecLabel text="Preferences" />
        <PageCard>
          {/* Units toggle pill */}
          <PrefRow
            icon={<span style={{ fontSize: 16 }}>📐</span>}
            label="Units"
            subtitle={isMetric ? 'Metric (kg / cm)' : 'Imperial (lbs / ft)'}
            right={
              <div style={{
                display: 'flex',
                gap: 2,
                background: 'rgba(255,255,255,0.07)',
                borderRadius: 9999,
                padding: 2,
                border: `1px solid ${C.border}`,
              }}>
                {['Metric', 'Imperial'].map(opt => {
                  const active = opt === 'Metric' ? isMetric : !isMetric;
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        updateUnits(opt === 'Metric' ? 'metric' : 'imperial');
                        showToast(`Switched to ${opt.toLowerCase()} units`, 'info');
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 9999,
                        border: 'none',
                        background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                        color: active ? C.textPrimary : C.textTertiary,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            }
          />
          <RowDivider />
          <PrefRow
            icon={<span style={{ fontSize: 16 }}>🧠</span>}
            label="Adaptive Coaching"
            subtitle="Adjusts targets based on weight trend"
            right={<ToggleSwitch value={settings.adaptiveCoaching} onChange={() => toggleCoaching('adaptiveCoaching')} />}
          />
          <RowDivider />
          <PrefRow
            icon={<span style={{ fontSize: 16 }}>📊</span>}
            label="Plateau Detection"
            subtitle="Detects stalls and suggests interventions"
            right={<ToggleSwitch value={settings.plateauDetection} onChange={() => toggleCoaching('plateauDetection')} />}
          />
          <RowDivider />
          <PrefRow
            icon={<span style={{ fontSize: 16 }}>📅</span>}
            label="Weekly Check-In"
            subtitle="Evaluates progress every 7 days"
            right={<ToggleSwitch value={settings.weeklyCheckIn} onChange={() => toggleCoaching('weeklyCheckIn')} />}
          />
          <RowDivider />
          <PrefRow
            icon={<Bell size={18} />}
            label="Notifications"
            subtitle="Daily logging reminders"
            right={<ToggleSwitch value={settings.notificationsEnabled ?? false} onChange={handleNotificationsToggle} />}
          />
        </PageCard>
      </section>

      {/* ══ 4. TRAINING PROGRAM ═════════════════════════════════════════════ */}
      <section>
        <SecLabel text="Training Program" />
        <PageCard>
          {currentProgram && (
            <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${currentProgram.accent}70, transparent)` }} />
          )}
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            {currentProgram ? (
              <>
                <span style={{ fontSize: '1.6rem', lineHeight: 1, flexShrink: 0 }}>{currentProgram.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: C.textPrimary, marginBottom: 2 }}>{currentProgram.name}</div>
                  <div style={{ fontSize: '0.62rem', color: C.textTertiary, fontWeight: 600 }}>{currentProgram.split}</div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>No program selected</div>
                <div style={{ fontSize: '0.62rem', color: C.textTertiary, fontWeight: 600, marginTop: 2 }}>Tap Change to choose a training split</div>
              </div>
            )}
            <button
              onClick={() => setShowProgramPicker(true)}
              style={{
                padding: '6px 14px',
                background: C.bgElevated,
                border: `1px solid ${C.borderMd}`,
                borderRadius: 9999,
                color: C.textSecondary,
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Change
            </button>
          </div>
          {currentProgram && (
            <>
              <div style={{ height: 1, background: C.border, margin: '0 16px' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, padding: '10px 16px 14px' }}>
                {currentProgram.split.split(' · ').filter(s => !s.includes('days')).map(day => (
                  <span key={day} style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: currentProgram.accent,
                    background: `${currentProgram.accent}14`,
                    border: `1px solid ${currentProgram.accent}30`,
                    borderRadius: 9999,
                    padding: '3px 10px',
                  }}>
                    {day}
                  </span>
                ))}
              </div>
            </>
          )}
        </PageCard>
      </section>

      {/* ══ 5. AI COACH ════════════════════════════════════════════════════ */}
      <section>
        <SecLabel text="AI Coach" />
        <PageCard>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>Gemini API Key</div>
            <div style={{ fontSize: '0.72rem', color: C.textTertiary, fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
              Optional — enables Gemini 2.0 Flash AI coaching. Free at aistudio.google.com
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="password"
                placeholder="AIza..."
                value={geminiKey}
                onChange={e => {
                  const val = e.target.value;
                  setGeminiKey(val);
                  setGeminiKeySaved(false);
                  if (val.trim()) {
                    localStorage.setItem('bbc_gemini_api_key', val.trim());
                  } else {
                    localStorage.removeItem('bbc_gemini_api_key');
                  }
                }}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                  color: C.textPrimary, fontSize: '0.9rem', fontWeight: 600, outline: 'none',
                }}
              />
              <button
                onClick={() => {
                  if (geminiKey.trim()) {
                    localStorage.setItem('bbc_gemini_api_key', geminiKey.trim());
                  } else {
                    localStorage.removeItem('bbc_gemini_api_key');
                  }
                  setGeminiKeySaved(true);
                  setTimeout(() => setGeminiKeySaved(false), 2500);
                }}
                style={{
                  padding: '10px 16px', borderRadius: 12,
                  background: geminiKeySaved ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
                  border: `1px solid ${geminiKeySaved ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
                  color: geminiKeySaved ? '#22C55E' : '#6366F1',
                  fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0,
                }}
              >
                {geminiKeySaved ? '✓ Saved' : 'Save'}
              </button>
            </div>
            {geminiKey && (
              <button
                onClick={() => { setGeminiKey(''); localStorage.removeItem('bbc_gemini_api_key'); }}
                style={{ marginTop: 8, background: 'none', border: 'none', color: C.textTertiary, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Clear key
              </button>
            )}
          </div>
        </PageCard>
      </section>

      {/* ══ 6. CONNECT APPS ════════════════════════════════════════════════ */}
      <section>
        <SecLabel text="Connect Apps" />
        <PageCard>
          {INTEGRATIONS.map((integration, i) => (
            <React.Fragment key={integration.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${C.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  flexShrink: 0,
                }}>
                  {integration.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.textPrimary, marginBottom: 2 }}>{integration.name}</div>
                  <div style={{ fontSize: '0.62rem', color: C.textTertiary, fontWeight: 600 }}>{integration.sub}</div>
                </div>
                <span style={{
                  padding: '3px 10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${C.border}`,
                  borderRadius: 9999,
                  color: C.textTertiary,
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  marginRight: 6,
                }}>
                  Coming Soon
                </span>
                <button
                  onClick={() => handleConnectApp(integration.id, integration.name)}
                  style={{
                    padding: '5px 12px',
                    background: 'rgba(255,255,255,0.07)',
                    border: `1px solid ${C.borderMd}`,
                    borderRadius: 9999,
                    color: C.textSecondary,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Connect
                </button>
              </div>
              {i < INTEGRATIONS.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 16px' }} />}
            </React.Fragment>
          ))}
        </PageCard>
      </section>

      {/* ══ 6. DATA & PRIVACY ═══════════════════════════════════════════════ */}
      <section>
        <SecLabel text="Data & Privacy" />
        <PageCard>
          <button
            disabled={exportingJSON}
            onClick={handleExportJSON}
            style={{
              display: 'flex', alignItems: 'center', width: '100%',
              background: 'none', border: 'none', cursor: exportingJSON ? 'not-allowed' : 'pointer',
              padding: '14px 16px', gap: 14,
              opacity: exportingJSON ? 0.45 : 1,
            }}
          >
            <Download size={18} color="rgba(255,255,255,0.4)" />
            <div style={{ flex: 1, textAlign: 'left' as const }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: C.textPrimary }}>{exportingJSON ? 'Preparing export...' : 'Export All Data'}</div>
              <div style={{ fontSize: '0.68rem', color: C.textTertiary, marginTop: 1 }}>Full backup as JSON</div>
            </div>
            <ChevronRight size={16} color={C.textTertiary} />
          </button>
          <RowDivider />
          <button
            disabled={exportingCSV}
            onClick={handleExportCSV}
            style={{
              display: 'flex', alignItems: 'center', width: '100%',
              background: 'none', border: 'none', cursor: exportingCSV ? 'not-allowed' : 'pointer',
              padding: '14px 16px', gap: 14,
              opacity: exportingCSV ? 0.45 : 1,
            }}
          >
            <Download size={18} color="rgba(255,255,255,0.4)" />
            <div style={{ flex: 1, textAlign: 'left' as const }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: C.textPrimary }}>{exportingCSV ? 'Preparing export...' : 'Export History'}</div>
              <div style={{ fontSize: '0.68rem', color: C.textTertiary, marginTop: 1 }}>Log history as CSV spreadsheet</div>
            </div>
            <ChevronRight size={16} color={C.textTertiary} />
          </button>
          <RowDivider />
          <button
            onClick={() => importRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', width: '100%',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '14px 16px', gap: 14,
            }}
          >
            <Upload size={18} color="rgba(255,255,255,0.4)" />
            <div style={{ flex: 1, textAlign: 'left' as const }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: C.textPrimary }}>Import Data</div>
              <div style={{ fontSize: '0.68rem', color: C.textTertiary, marginTop: 1 }}>Restore from JSON backup · Max 5MB</div>
            </div>
            <ChevronRight size={16} color={C.textTertiary} />
          </button>
          {(importError || importSuccess) && (
            <div style={{ padding: '0 16px 12px' }}>
              {importError && <p style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600, margin: 0 }}>{importError}</p>}
              {importSuccess && <p style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 600, margin: 0 }}>{importSuccess}</p>}
            </div>
          )}
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <RowDivider />
          <button
            onClick={() => setResetStep('confirm1')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '14px 16px', gap: 8,
            }}
          >
            <Trash2 size={15} color={C.accentRed} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: C.accentRed }}>Reset All Data</span>
          </button>
        </PageCard>

        <p style={{
          fontSize: '0.65rem',
          color: 'rgba(255,255,255,0.18)',
          textAlign: 'center',
          padding: '0 1rem',
          lineHeight: 1.5,
          marginTop: 8,
        }}>
          All data is stored locally on this device. Nothing is sent to any server.
        </p>

        {resetStep === 'confirm1' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <button
              onClick={() => setResetStep('confirm2')}
              style={{
                padding: '0.7rem 1.4rem',
                background: 'rgba(255,69,58,0.1)',
                border: '1px solid rgba(255,69,58,0.3)',
                borderRadius: 14,
                color: C.accentRed,
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Are you sure? This can't be undone
            </button>
          </div>
        )}

        {resetStep === 'confirm2' && (
          <div style={{
            border: '1px solid rgba(255,69,58,0.25)',
            borderRadius: 18,
            padding: '1.1rem',
            background: 'rgba(255,69,58,0.05)',
            marginTop: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, justifyContent: 'center' }}>
              <Trash2 size={16} color={C.accentRed} />
              <p style={{ color: C.accentRed, fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>This permanently deletes all your data.</p>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textAlign: 'center', margin: '0 0 14px' }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setResetStep('idle')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid ${C.borderMd}`,
                  borderRadius: 14,
                  color: C.textSecondary,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Yes, delete everything
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ══ 7. ABOUT ════════════════════════════════════════════════════════ */}
      <section>
        <SecLabel text="About" />
        <PageCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: C.textSecondary }}>App Version</span>
            <span style={{ fontSize: '0.88rem', fontVariantNumeric: 'tabular-nums', color: C.textTertiary }}>2.0.0</span>
          </div>
          <RowDivider />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: C.textSecondary }}>Schema Version</span>
            <span style={{ fontSize: '0.88rem', color: C.textTertiary }}>v4</span>
          </div>
          <RowDivider />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px' }}>
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: C.textSecondary }}>Storage</span>
              <div style={{ fontSize: '0.65rem', color: C.textTertiary, marginTop: 1 }}>Local device only · no cloud sync</div>
            </div>
            <span style={{ fontSize: '0.72rem', color: C.textTertiary }}>localStorage</span>
          </div>
        </PageCard>
        <p style={{
          textAlign: 'center',
          fontSize: '0.6rem',
          color: 'rgba(255,255,255,0.1)',
          fontWeight: 600,
          letterSpacing: '0.07em',
          marginTop: 12,
          textTransform: 'uppercase' as const,
        }}>
          Evolved · Built with care
        </p>
      </section>

      {/* ══ OVERLAYS ════════════════════════════════════════════════════════ */}

      {showProfileEdit && (
        <ProfileEditSheet
          user={user}
          onSave={(updates) => {
            const newProfile = { ...user, ...updates };
            const targets = calculateTargets(newProfile);
            updateUser({ ...updates, targets });
            showToast('Profile updated · targets recalculated', 'success');
            setShowProfileEdit(false);
          }}
          onClose={() => setShowProfileEdit(false)}
        />
      )}

      {showProgramPicker && (
        <ProgramPickerSheet
          current={state.assignedProgram}
          onSelect={(p) => {
            setAssignedProgram(p);
            showToast('Training program updated', 'success');
            setShowProgramPicker(false);
          }}
          onClose={() => setShowProgramPicker(false)}
        />
      )}

      {comingSoonApp && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9020,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setComingSoonApp(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: C.bgCard,
              borderRadius: '24px 24px 0 0',
              border: `1px solid ${C.borderMd}`,
              padding: '1.5rem',
              paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
              width: '100%',
              maxWidth: 480,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: C.textPrimary }}>{comingSoonApp.name}</h3>
                <p style={{ fontSize: '0.78rem', color: C.textTertiary, marginTop: 4 }}>
                  {comingSoonApp.name} integration is coming soon — we're working on it.
                </p>
              </div>
              <button onClick={() => setComingSoonApp(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <X size={15} color="rgba(255,255,255,0.6)" />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bell size={15} color="rgba(255,255,255,0.5)" />
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: C.textPrimary }}>Notify me when available</span>
              </div>
              <button
                onClick={() => setNotifyEnabled(prev => ({ ...prev, [comingSoonApp.id]: !prev[comingSoonApp.id] }))}
                style={{
                  width: 44, height: 26, borderRadius: 13,
                  background: notifyEnabled[comingSoonApp.id] ? '#4ade80' : 'rgba(255,255,255,0.12)',
                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3,
                  left: notifyEnabled[comingSoonApp.id] ? 21 : 3,
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s ease',
                }} />
              </button>
            </div>
            <button
              onClick={() => setComingSoonApp(null)}
              style={{ marginTop: '1rem', width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.borderMd}`, borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ══ Profile Edit Sheet ════════════════════════════════════════════════════════

const ProfileEditSheet: React.FC<{
  user: UserProfile;
  onSave: (updates: Partial<UserProfile>) => void;
  onClose: () => void;
}> = ({ user, onSave, onClose }) => {
  const [form, setForm] = useState({
    name:               user.name,
    weight:             String(user.weight),
    goalWeight:         user.goalWeight ? String(user.goalWeight) : '',
    height:             String(user.height),
    age:                String(user.age),
    sex:                user.sex,
    activityLevel:      user.activityLevel,
    goalType:           user.goalType,
    preferredDietSpeed: user.preferredDietSpeed,
    trainingFrequency:  String(user.trainingFrequency || 3),
    stepsTarget:        String(user.stepsTarget || 8000),
  });
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const weight = parseFloat(form.weight);
  const height = parseFloat(form.height);
  const age = parseInt(form.age);

  const weightErr = form.weight && (isNaN(weight) || weight < 20 || weight > 400) ? 'Weight must be between 20–400 kg' : null;
  const heightErr = form.height && (isNaN(height) || height < 100 || height > 250) ? 'Height must be between 100–250 cm' : null;
  const ageErr = form.age && (isNaN(age) || age < 13 || age > 100) ? 'Age must be between 13–100' : null;

  const isValid = Boolean(form.name.trim() && form.weight && !weightErr && form.height && !heightErr && form.age && !ageErr);

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      name:               form.name.trim(),
      weight:             parseFloat(form.weight),
      goalWeight:         form.goalWeight ? parseFloat(form.goalWeight) : undefined,
      height:             parseFloat(form.height),
      age:                parseInt(form.age),
      sex:                form.sex as 'male' | 'female',
      activityLevel:      form.activityLevel as any,
      goalType:           form.goalType as any,
      preferredDietSpeed: form.preferredDietSpeed as any,
      trainingFrequency:  parseInt(form.trainingFrequency) || 3,
      stepsTarget:        parseInt(form.stepsTarget) || 8000,
    });
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2000);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: 12,
    border: `1px solid ${C.borderMd}`,
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const inputErrorStyle: React.CSSProperties = { ...inputStyle, border: '1px solid rgba(248,113,113,0.5)' };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.3)' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
  };

  const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>
      {children}
    </div>
  );

  const FieldError: React.FC<{ msg: string | null }> = ({ msg }) =>
    msg ? <p style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600, marginTop: 4 }}>{msg}</p> : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bgPrimary, zIndex: 9010, overflowY: 'auto' }}>
      <div style={{ padding: '1.25rem', paddingBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: C.textPrimary }}>Edit Profile</h2>
            <p style={{ fontSize: '0.75rem', color: C.textTertiary, fontWeight: 600, marginTop: 2 }}>Changes recalculate your targets</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} color="rgba(255,255,255,0.7)" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <FieldLabel>Name</FieldLabel>
            <input style={inputStyle} type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <FieldLabel>Current weight (kg)</FieldLabel>
              <input style={weightErr ? inputErrorStyle : inputStyle} type="number" inputMode="decimal" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="75" />
              <FieldError msg={weightErr} />
            </div>
            <div>
              <FieldLabel>Goal weight (kg)</FieldLabel>
              <input style={inputStyle} type="number" inputMode="decimal" value={form.goalWeight} onChange={e => set('goalWeight', e.target.value)} placeholder="70" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <FieldLabel>Height (cm)</FieldLabel>
              <input style={heightErr ? inputErrorStyle : inputStyle} type="number" inputMode="decimal" value={form.height} onChange={e => set('height', e.target.value)} placeholder="175" />
              <FieldError msg={heightErr} />
            </div>
            <div>
              <FieldLabel>Age</FieldLabel>
              <input style={ageErr ? inputErrorStyle : inputStyle} type="number" inputMode="numeric" value={form.age} onChange={e => set('age', e.target.value)} placeholder="30" />
              <FieldError msg={ageErr} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <FieldLabel>Biological sex</FieldLabel>
              <select style={selectStyle} value={form.sex} onChange={e => set('sex', e.target.value)}>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div>
              <FieldLabel>Training days/week</FieldLabel>
              <input style={inputStyle} type="number" inputMode="numeric" min="0" max="7" value={form.trainingFrequency} onChange={e => set('trainingFrequency', e.target.value)} placeholder="4" />
            </div>
          </div>
          <div>
            <FieldLabel>Goal</FieldLabel>
            <select style={selectStyle} value={form.goalType} onChange={e => set('goalType', e.target.value)}>
              <option value="fat_loss">Fat Loss</option>
              <option value="muscle_gain">Muscle Gain</option>
              <option value="maintenance">Maintenance</option>
              <option value="recomposition">Recomposition</option>
            </select>
          </div>
          <div>
            <FieldLabel>Activity level</FieldLabel>
            <select style={selectStyle} value={form.activityLevel} onChange={e => set('activityLevel', e.target.value)}>
              <option value="sedentary">Sedentary — desk job, little exercise</option>
              <option value="lightly_active">Lightly Active — 1–3 days/week</option>
              <option value="moderately_active">Moderately Active — 3–5 days/week</option>
              <option value="very_active">Very Active — 6–7 days/week</option>
            </select>
          </div>
          <div>
            <FieldLabel>Diet pacing</FieldLabel>
            <select style={selectStyle} value={form.preferredDietSpeed} onChange={e => set('preferredDietSpeed', e.target.value)}>
              <option value="sustainable">Sustainable — slow, easier to maintain</option>
              <option value="moderate">Moderate — recommended balance</option>
              <option value="aggressive">Aggressive — faster, more demanding</option>
            </select>
          </div>
          <div>
            <FieldLabel>Daily step target</FieldLabel>
            <input style={inputStyle} type="number" inputMode="numeric" value={form.stepsTarget} onChange={e => set('stepsTarget', e.target.value)} placeholder="8000" />
          </div>
          <button
            onClick={handleSave}
            disabled={!isValid}
            style={{
              width: '100%',
              padding: '0.9rem',
              background: saveState === 'saved' ? '#4ade80' : isValid ? '#fff' : 'rgba(255,255,255,0.12)',
              color: saveState === 'saved' ? '#000' : isValid ? '#000' : 'rgba(255,255,255,0.3)',
              border: 'none',
              borderRadius: 14,
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: isValid ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {saveState === 'saved' ? <><Check size={16} /> Changes saved</> : 'Save & Recalculate Targets'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ══ Program Picker Sheet ══════════════════════════════════════════════════════

const ProgramPickerSheet: React.FC<{
  current: 'male_phase2' | 'female_phase1' | null;
  onSelect: (p: 'male_phase2' | 'female_phase1') => void;
  onClose: () => void;
}> = ({ current, onSelect, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: C.bgPrimary, zIndex: 9010, overflowY: 'auto' }}>
    <div style={{ padding: '1.25rem', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: C.textPrimary }}>Choose Program</h2>
          <p style={{ fontSize: '0.75rem', color: C.textTertiary, fontWeight: 600, marginTop: 2 }}>Your training split for the week</p>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={18} color="rgba(255,255,255,0.7)" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PROGRAMS.map(p => {
          const isSelected = current === p.id;
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              style={{
                background: C.bgCard,
                borderRadius: 20,
                border: `1px solid ${isSelected ? p.accent + '60' : C.border}`,
                padding: '1.25rem',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 0, left: '15%', right: '15%', height: 2,
                  background: `linear-gradient(90deg, transparent, ${p.accent}, transparent)`,
                }} />
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: C.textPrimary }}>{p.name}</span>
                    {isSelected && <Check size={16} color={p.accent} />}
                  </div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: p.accent, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 6 }}>{p.tag}</div>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: '0 0 8px' }}>{p.desc}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                    {p.split.split(' · ').filter(s => !s.includes('days')).map(day => (
                      <span key={day} style={{
                        fontSize: '0.62rem', fontWeight: 700,
                        color: p.accent,
                        background: `${p.accent}14`,
                        border: `1px solid ${p.accent}30`,
                        borderRadius: 9999,
                        padding: '2px 8px',
                      }}>
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
