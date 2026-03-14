import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell, Calculator, Check, Download, Edit2, Trash2, Upload, X,
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

// ── Local layout primitives ──────────────────────────────────────────────────

const Card: React.FC<{
  children: React.ReactNode;
  accent?: string;
  style?: React.CSSProperties;
}> = ({ children, accent, style }) => (
  <div style={{
    backgroundColor: 'var(--bg-card)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.07)',
    overflow: 'hidden',
    position: 'relative',
    ...style,
  }}>
    {accent && (
      <div style={{
        position: 'absolute',
        top: 0,
        left: '15%',
        right: '15%',
        height: '2px',
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        pointerEvents: 'none',
      }} />
    )}
    <div style={{ padding: '0 1rem' }}>
      {children}
    </div>
  </div>
);

const RowDivider: React.FC = () => (
  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '0 -1rem' }} />
);

const GoalBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span style={{
    fontSize: '0.625rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color,
    backgroundColor: `${color}1A`,
    border: `1px solid ${color}40`,
    borderRadius: '9999px',
    padding: '2px 8px',
  }}>
    {label}
  </span>
);

// ── Connected apps config ────────────────────────────────────────────────────

const INTEGRATIONS = [
  { id: 'apple_health', name: 'Apple Health', sub: 'Steps, HRV, sleep · iOS', emoji: '🍎' },
  { id: 'google_fit',   name: 'Google Fit',   sub: 'Steps, activity · Android', emoji: '🏃' },
  { id: 'garmin',       name: 'Garmin Connect', sub: 'HRV, recovery, workouts', emoji: '⌚' },
  { id: 'whoop',        name: 'Whoop',        sub: 'Strain, recovery, sleep', emoji: '💪' },
] as const;

// ── Programs config ──────────────────────────────────────────────────────────

const PROGRAMS = [
  {
    id: 'female_phase1' as const,
    emoji: '🍑',
    name: 'Glute & Tone Focus',
    tag: 'Female · Phase 1',
    desc: 'Lower-body emphasis with upper accessory work. Designed for lean muscle, shape, and tone.',
    split: 'Lower · Upper · 4 days/week',
    accent: '#fb923c',
  },
  {
    id: 'male_phase2' as const,
    emoji: '💪',
    name: 'Strength & Size',
    tag: 'Male · Phase 2',
    desc: 'Push-Pull-Legs-Upper split focused on hypertrophy and progressive overload.',
    split: 'Push · Pull · Legs · Upper · 4 days/week',
    accent: '#60a5fa',
  },
];

// ── Main component ───────────────────────────────────────────────────────────

export const Settings: React.FC = () => {
  const {
    state, resetApp, showToast,
    updateSettings, updateConnectionStatus, updateUnits,
    setAssignedProgram, updateUser,
  } = useApp();
  const { user, settings } = state;

  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showProgramPicker, setShowProgramPicker] = useState(false);
  // Reset flow: 'idle' | 'confirm1' | 'confirm2'
  const [resetStep, setResetStep] = useState<'idle' | 'confirm1' | 'confirm2'>('idle');
  const [exportingJSON, setExportingJSON] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  // Integration "coming soon" modal
  const [comingSoonApp, setComingSoonApp] = useState<{ name: string; id: string } | null>(null);
  const [notifyEnabled, setNotifyEnabled] = useState<Record<string, boolean>>({});
  const importRef = useRef<HTMLInputElement>(null);

  if (!user) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
      No profile found.
    </div>
  );

  const tdee = calculateTDEEBreakdown(user);
  const goalLabel = user.goalType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const goalColor = user.goalType === 'fat_loss' ? '#fb923c' : user.goalType === 'muscle_gain' ? '#60a5fa' : user.goalType === 'recomposition' ? '#a78bfa' : '#4ade80';
  const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const currentProgram = PROGRAMS.find(p => p.id === state.assignedProgram);
  const isMetric = (settings.units ?? 'metric') === 'metric';

  // Weight/height display with unit awareness
  const weightDisplay = isMetric
    ? `${user.weight} kg`
    : `${kgToLbs(user.weight)} lbs`;
  const heightFtIn = cmToFtIn(user.height);
  const heightDisplay = isMetric
    ? `${user.height} cm`
    : `${heightFtIn.ft}'${heightFtIn.inches}"`;
  const goalWeightDisplay = user.goalWeight
    ? isMetric
      ? `${user.goalWeight} kg`
      : `${kgToLbs(user.goalWeight)} lbs`
    : '—';

  // ── Handlers ──

  const handleExportJSON = () => {
    setExportingJSON(true);
    setTimeout(() => {
      try {
        const data = localStorage.getItem('bbc_state') || '{}';
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `body-blueprint-${new Date().toISOString().split('T')[0]}.json`;
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
        a.download = `body-blueprint-history-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        showToast('History exported as CSV', 'success');
      } catch { showToast('CSV export failed', 'error'); }
      setExportingCSV(false);
    }, 300);
  };

  const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImportError(null);
    setImportSuccess(null);
    if (!file) return;

    // File size guard
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

        // Detect schema version
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

  const handleConnectApp = (id: string, name: string) => {
    setComingSoonApp({ id, name });
  };

  const handleResetConfirm = () => {
    // Clear ALL bbc_ keys from localStorage
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
      // Requesting to enable
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

  // ── Render ──

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '1rem',
        paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100dvh',
      }}
    >

      {/* ── Page header ── */}
      <div style={{ paddingTop: '0.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '2px' }}>
          Profile, targets & preferences
        </p>
      </div>

      {/* ══ 1. PROFILE SECTION ════════════════════════════════════════════════ */}
      <section>
        <SectionLabel title="Profile" />
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Blue top accent */}
          <div style={{
            position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.5), transparent)',
          }} />

          {/* Avatar + name row */}
          <div style={{ padding: '1.1rem 1.1rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Avatar circle with initials */}
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(167,139,250,0.2))',
                border: '1.5px solid rgba(96,165,250,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em',
                color: '#93c5fd', flexShrink: 0,
              }}>
                {initials}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em', marginBottom: '5px' }}>
                  {user.name}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  <GoalBadge label={goalLabel} color={goalColor} />
                  {currentProgram && (
                    <GoalBadge label={currentProgram.name} color={currentProgram.accent} />
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowProfileEdit(true)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}
                aria-label="Edit profile"
              >
                <Edit2 size={14} color="rgba(255,255,255,0.6)" />
              </button>
            </div>

            {/* Metrics row */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px', marginTop: '14px', paddingTop: '14px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
              {[
                { label: 'Weight', value: weightDisplay },
                { label: 'Height', value: heightDisplay },
                { label: 'Age',    value: `${user.age}y` },
                { label: 'Goal',   value: goalWeightDisplay },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                    {m.value}
                  </div>
                  <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '3px' }}>
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TDEE breakdown */}
          {tdee && (
            <>
              <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '14px 0 0' }} />
              <div style={{ padding: '0.75rem 1.1rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Calculator size={12} color="#fb923c" />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    TDEE Breakdown · Mifflin-St Jeor
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { label: 'BMR',    value: `${tdee.bmr}`, sub: 'at rest' },
                    { label: 'TDEE',   value: `${tdee.tdee}`, sub: 'with activity' },
                    { label: 'Target', value: `${tdee.targetCalories}`, sub: `${Math.abs(tdee.deficit)} kcal ${tdee.deficit < 0 ? 'deficit' : 'surplus'}` },
                  ].map(item => (
                    <div key={item.label} style={{
                      backgroundColor: 'rgba(251,146,60,0.07)',
                      border: '1px solid rgba(251,146,60,0.15)',
                      borderRadius: '12px',
                      padding: '0.6rem 0.7rem',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fb923c', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                        {item.value}
                      </div>
                      <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '3px' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginTop: '2px', lineHeight: 1.3 }}>
                        {item.sub}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ══ 2. NUTRITION TARGETS ═════════════════════════════════════════════ */}
      <section>
        <SectionLabel title="Nutrition Targets" />
        {/* Macro cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <MetricCard
            label="Calories"
            value={user.targets.calories}
            unit="kcal"
            color="#ffffff"
          />
          <MetricCard
            label="Protein"
            value={user.targets.protein}
            unit="g"
            color="var(--color-protein, #3B82F6)"
          />
          <MetricCard
            label="Carbs"
            value={user.targets.carbs}
            unit="g"
            color="var(--color-carbs, #A855F7)"
          />
          <MetricCard
            label="Fats"
            value={user.targets.fats}
            unit="g"
            color="var(--color-fats, #F97316)"
          />
        </div>

        {/* Units toggle */}
        <Card>
          <ToggleRow
            label="Metric Units (kg / cm)"
            subtitle={isMetric ? 'Currently using kg and cm' : 'Currently using lbs and ft/in'}
            value={isMetric}
            onChange={(v) => {
              updateUnits(v ? 'metric' : 'imperial');
              showToast(`Switched to ${v ? 'metric' : 'imperial'} units`, 'info');
            }}
          />
        </Card>
      </section>

      {/* ══ 3. TRAINING PROGRAM ══════════════════════════════════════════════ */}
      <section>
        <SectionLabel title="Training Program" />
        <Card accent={currentProgram?.accent}>
          <div style={{ padding: '1rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                {currentProgram ? (
                  <>
                    <span style={{ fontSize: '1.75rem', lineHeight: 1, flexShrink: 0 }}>{currentProgram.emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '2px' }}>
                        {currentProgram.name}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                        {currentProgram.split}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>
                      No program selected
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600, marginTop: '2px' }}>
                      Tap Change to choose a training split
                    </div>
                  </div>
                )}
              </div>
              <SecondaryButton
                label="Change"
                onClick={() => setShowProgramPicker(true)}
                size="sm"
              />
            </div>

            {/* Program day preview pills */}
            {currentProgram && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {currentProgram.split.split(' · ').filter(s => !s.includes('days')).map(day => (
                  <span key={day} style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    color: currentProgram.accent,
                    backgroundColor: `${currentProgram.accent}14`,
                    border: `1px solid ${currentProgram.accent}30`,
                    borderRadius: '9999px',
                    padding: '3px 10px',
                  }}>
                    {day}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* ══ 4. COACHING & INTELLIGENCE ══════════════════════════════════════ */}
      <section>
        <SectionLabel title="Coaching & Intelligence" />
        <Card>
          <ToggleRow
            label="Adaptive Coaching"
            subtitle="Adjusts targets based on weight trend & adherence"
            value={settings.adaptiveCoaching}
            onChange={() => toggleCoaching('adaptiveCoaching')}
          />
          <RowDivider />
          <ToggleRow
            label="Plateau Detection"
            subtitle="Detects stalls and suggests interventions"
            value={settings.plateauDetection}
            onChange={() => toggleCoaching('plateauDetection')}
          />
          <RowDivider />
          <ToggleRow
            label="Weekly Check-In"
            subtitle="Evaluates progress every 7 days"
            value={settings.weeklyCheckIn}
            onChange={() => toggleCoaching('weeklyCheckIn')}
          />
          <RowDivider />
          <ToggleRow
            label="Notifications"
            subtitle="Daily logging reminders"
            value={settings.notificationsEnabled ?? false}
            onChange={handleNotificationsToggle}
          />
        </Card>
      </section>

      {/* ══ 5. CONNECTED APPS ═══════════════════════════════════════════════ */}
      <section>
        <SectionLabel title="Connected Apps" />
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}>
          {INTEGRATIONS.map((integration, i) => (
            <React.Fragment key={integration.id}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0.9rem 1.1rem',
              }}>
                {/* App icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: '11px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.15rem', flexShrink: 0,
                }}>
                  {integration.emoji}
                </div>

                {/* Name + sub */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '2px' }}>
                    {integration.name}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                    {integration.sub}
                  </div>
                </div>

                {/* Coming soon button */}
                <button
                  onClick={() => handleConnectApp(integration.id, integration.name)}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '9999px',
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Connect
                </button>
              </div>
              {i < INTEGRATIONS.length - 1 && (
                <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.04)', margin: '0 1.1rem' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ══ 6. DATA & PRIVACY ═══════════════════════════════════════════════ */}
      <section>
        <SectionLabel title="Data & Privacy" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* Export buttons */}
          <Card>
            <div style={{ padding: '0.75rem 0' }}>
              <button
                disabled={exportingJSON}
                onClick={handleExportJSON}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', background: 'none', border: 'none', cursor: exportingJSON ? 'not-allowed' : 'pointer',
                  padding: '0.5rem 0', color: exportingJSON ? 'rgba(255,255,255,0.3)' : '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Download size={16} color={exportingJSON ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)'} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {exportingJSON ? 'Preparing export...' : 'Export All Data'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>Full backup as JSON</div>
                  </div>
                </div>
              </button>
            </div>
            <RowDivider />
            <div style={{ padding: '0.75rem 0' }}>
              <button
                disabled={exportingCSV}
                onClick={handleExportCSV}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', background: 'none', border: 'none', cursor: exportingCSV ? 'not-allowed' : 'pointer',
                  padding: '0.5rem 0', color: exportingCSV ? 'rgba(255,255,255,0.3)' : '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Download size={16} color={exportingCSV ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)'} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {exportingCSV ? 'Preparing export...' : 'Export History'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>Log history as CSV spreadsheet</div>
                  </div>
                </div>
              </button>
            </div>
            <RowDivider />
            <div style={{ padding: '0.75rem 0' }}>
              <button
                onClick={() => importRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0', color: '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Upload size={16} color="rgba(255,255,255,0.5)" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Import Data</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
                      Restore from JSON backup · Max 5MB
                    </div>
                  </div>
                </div>
              </button>
              {importError && (
                <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '6px', fontWeight: 600 }}>
                  {importError}
                </p>
              )}
              {importSuccess && (
                <p style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '6px', fontWeight: 600 }}>
                  {importSuccess}
                </p>
              )}
            </div>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </Card>

          <p style={{
            fontSize: '0.68rem',
            color: 'rgba(255,255,255,0.2)',
            textAlign: 'center',
            padding: '0 1rem',
            lineHeight: 1.5,
          }}>
            All data is stored locally on this device. Nothing is sent to any server.
          </p>

          {/* ── Reset Flow ── */}
          {resetStep === 'idle' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <DangerButton
                label="Reset All Data"
                onClick={() => setResetStep('confirm1')}
              />
            </div>
          )}

          {resetStep === 'confirm1' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setResetStep('confirm2')}
                style={{
                  padding: '0.7rem 1.4rem',
                  backgroundColor: 'rgba(248,113,113,0.12)',
                  border: '1px solid rgba(248,113,113,0.35)',
                  borderRadius: '14px',
                  color: '#f87171',
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
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: '18px',
              padding: '1.1rem',
              backgroundColor: 'rgba(248,113,113,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', justifyContent: 'center' }}>
                <Trash2 size={16} color="#f87171" />
                <p style={{ color: '#f87171', fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>
                  This permanently deletes all your data.
                </p>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textAlign: 'center', margin: '0 0 14px' }}>
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <SecondaryButton
                  label="Cancel"
                  onClick={() => setResetStep('idle')}
                  size="md"
                />
                <button
                  onClick={handleResetConfirm}
                  style={{
                    flex: 1, padding: '0.75rem', backgroundColor: '#ef4444', color: '#fff',
                    border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  }}
                >
                  Yes, delete everything
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══ 7. ABOUT ════════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel title="About" />
        <Card>
          <SettingsRow
            label="App Version"
            value={<span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem' }}>2.0.0</span>}
          />
          <RowDivider />
          <SettingsRow
            label="Schema Version"
            value={<span style={{ fontSize: '0.875rem' }}>v4</span>}
          />
          <RowDivider />
          <SettingsRow
            label="Storage"
            subtitle="Local device only · no cloud sync"
            value={<span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>localStorage</span>}
          />
        </Card>
        <p style={{
          textAlign: 'center',
          fontSize: '0.62rem',
          color: 'rgba(255,255,255,0.12)',
          fontWeight: 600,
          letterSpacing: '0.07em',
          marginTop: '12px',
          textTransform: 'uppercase',
        }}>
          Body Blueprint Coach · Built with care
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

      {/* ── Integration Coming Soon Modal ── */}
      {comingSoonApp && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9020,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setComingSoonApp(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '1.5rem',
              paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
              width: '100%',
              maxWidth: 480,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>{comingSoonApp.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  {comingSoonApp.name} integration is coming soon — we're working on it.
                </p>
              </div>
              <button onClick={() => setComingSoonApp(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <X size={16} color="rgba(255,255,255,0.6)" />
              </button>
            </div>

            {/* Notify me toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bell size={16} color="rgba(255,255,255,0.5)" />
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Notify me when available</span>
              </div>
              <button
                onClick={() => setNotifyEnabled(prev => ({ ...prev, [comingSoonApp.id]: !prev[comingSoonApp.id] }))}
                style={{
                  width: 44, height: 26, borderRadius: '13px',
                  backgroundColor: notifyEnabled[comingSoonApp.id] ? '#4ade80' : 'rgba(255,255,255,0.12)',
                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s ease',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3,
                  left: notifyEnabled[comingSoonApp.id] ? 21 : 3,
                  width: 20, height: 20, borderRadius: '50%',
                  backgroundColor: '#fff', transition: 'left 0.2s ease',
                }} />
              </button>
            </div>

            <button
              onClick={() => setComingSoonApp(null)}
              style={{ marginTop: '1rem', width: '100%', padding: '0.8rem', backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ══ Profile Edit Sheet ═══════════════════════════════════════════════════════

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

  // Inline field validation
  const weight = parseFloat(form.weight);
  const height = parseFloat(form.height);
  const age = parseInt(form.age);

  const weightErr = form.weight && (isNaN(weight) || weight < 20 || weight > 400)
    ? 'Weight must be between 20–400 kg' : null;
  const heightErr = form.height && (isNaN(height) || height < 100 || height > 250)
    ? 'Height must be between 100–250 cm' : null;
  const ageErr = form.age && (isNaN(age) || age < 13 || age > 100)
    ? 'Age must be between 13–100' : null;

  const isValid = Boolean(
    form.name.trim() &&
    form.weight && !weightErr &&
    form.height && !heightErr &&
    form.age && !ageErr
  );

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
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const inputErrorStyle: React.CSSProperties = {
    ...inputStyle,
    border: '1px solid rgba(248,113,113,0.5)',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.3)' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
  };

  const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
      fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '5px',
    }}>
      {children}
    </div>
  );

  const FieldError: React.FC<{ msg: string | null }> = ({ msg }) =>
    msg ? <p style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600, marginTop: '4px' }}>{msg}</p> : null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-primary)', zIndex: 9010, overflowY: 'auto' }}>
      <div style={{ padding: '1.25rem', paddingBottom: '3rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Edit Profile</h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '2px' }}>
              Changes recalculate your targets
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
              width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={18} color="rgba(255,255,255,0.7)" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div>
            <FieldLabel>Name</FieldLabel>
            <input style={inputStyle} type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
              width: '100%', padding: '0.9rem',
              backgroundColor: saveState === 'saved' ? '#4ade80' : isValid ? '#fff' : 'rgba(255,255,255,0.15)',
              color: saveState === 'saved' ? '#000' : isValid ? '#000' : 'rgba(255,255,255,0.3)',
              border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '0.95rem',
              cursor: isValid ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            {saveState === 'saved'
              ? <><Check size={16} /> Changes saved</>
              : 'Save & Recalculate Targets'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ══ Program Picker Sheet ═════════════════════════════════════════════════════

const ProgramPickerSheet: React.FC<{
  current: 'male_phase2' | 'female_phase1' | null;
  onSelect: (p: 'male_phase2' | 'female_phase1') => void;
  onClose: () => void;
}> = ({ current, onSelect, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-primary)', zIndex: 9010, overflowY: 'auto' }}>
    <div style={{ padding: '1.25rem', paddingBottom: '3rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Choose Program</h2>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '2px' }}>
            Your training split for the week
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
            width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <X size={18} color="rgba(255,255,255,0.7)" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {PROGRAMS.map(p => {
          const isSelected = current === p.id;
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '20px',
                border: `1px solid ${isSelected ? p.accent + '60' : 'rgba(255,255,255,0.07)'}`,
                padding: '1.25rem',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px',
                  background: `linear-gradient(90deg, transparent, ${p.accent}, transparent)`,
                }} />
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{p.name}</span>
                    {isSelected && <Check size={16} color={p.accent} />}
                  </div>
                  <div style={{
                    fontSize: '0.65rem', fontWeight: 700, color: p.accent,
                    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px',
                  }}>
                    {p.tag}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: '0 0 8px' }}>
                    {p.desc}
                  </p>
                  {/* Day pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {p.split.split(' · ').filter(s => !s.includes('days')).map(day => (
                      <span key={day} style={{
                        fontSize: '0.62rem', fontWeight: 700,
                        color: p.accent,
                        backgroundColor: `${p.accent}14`,
                        border: `1px solid ${p.accent}30`,
                        borderRadius: '9999px',
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
