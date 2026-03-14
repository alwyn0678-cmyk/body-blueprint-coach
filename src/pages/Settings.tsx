import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Download, Calculator, Trash2, ChevronRight, Lock, Smartphone, Edit2, X, Check } from 'lucide-react';
import { calculateTargets, calculateTDEEBreakdown } from '../utils/macroEngine';
import { UserProfile } from '../types';

export const Settings: React.FC = () => {
  const { state, resetApp, showToast, updateSettings, setAssignedProgram, updateUser } = useApp();
  const { user, settings } = state;
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showProgramPicker, setShowProgramPicker] = useState(false);

  if (!user) return <div style={{ padding: '1rem' }}>No profile found.</div>;

  const tdee = calculateTDEEBreakdown(user);
  const goalLabel = user.goalType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const handleExportJSON = () => {
    try {
      const data = localStorage.getItem('bbc_state') || '{}';
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `body-blueprint-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      showToast('Data exported', 'success');
    } catch { showToast('Export failed', 'error'); }
  };

  const handleExportCSV = () => {
    try {
      const rows = [['Date', 'Weight (kg)', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fats (g)', 'Water (glasses)', 'Steps', 'Recovery Score']];
      Object.entries(state.logs).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, log]: [string, any]) => {
        const macros = Object.values(log.meals as Record<string, any[]>).flat().reduce(
          (acc: any, item: any) => ({ calories: acc.calories + item.nutrition.calories * item.amount, protein: acc.protein + item.nutrition.protein * item.amount, carbs: acc.carbs + item.nutrition.carbs * item.amount, fats: acc.fats + item.nutrition.fats * item.amount }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );
        rows.push([date, log.weight?.toString() || '', Math.round(macros.calories).toString(), Math.round(macros.protein).toString(), Math.round(macros.carbs).toString(), Math.round(macros.fats).toString(), log.waterGlasses?.toString() || '0', log.steps?.toString() || '0', log.health?.recoveryScore?.toString() || '']);
      });
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `body-blueprint-history-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      showToast('History exported', 'success');
    } catch { showToast('CSV export failed', 'error'); }
  };

  const toggleSetting = (key: 'adaptiveCoaching' | 'plateauDetection' | 'weeklyCheckIn') => {
    updateSettings({ [key]: !settings[key] });
    showToast(`${settings[key] ? 'Disabled' : 'Enabled'} ${key === 'adaptiveCoaching' ? 'Adaptive Coaching' : key === 'plateauDetection' ? 'Plateau Detection' : 'Weekly Check-In'}`, 'info');
  };

  // ── Sub-components ──────────────────────────────────────────────────────────
  const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', paddingLeft: '4px', marginBottom: '8px', marginTop: '4px' }}>
      {children}
    </div>
  );

  const Toggle: React.FC<{ enabled: boolean; onToggle: () => void }> = ({ enabled, onToggle }) => (
    <div onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: enabled ? '#4ade80' : 'rgba(255,255,255,0.1)', position: 'relative', flexShrink: 0, cursor: 'pointer', transition: 'background-color 0.2s' }}>
      <div style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', position: 'absolute', top: 2, left: enabled ? 22 : 2, boxShadow: '0 1px 4px rgba(0,0,0,0.4)', transition: 'left 0.2s' }} />
    </div>
  );

  const SettingsRow: React.FC<{ label: string; desc?: string; right: React.ReactNode; onClick?: () => void }> = ({ label, desc, right, onClick }) => (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 0', cursor: onClick ? 'pointer' : 'default', gap: '12px' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{label}</div>
        {desc && <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px', fontWeight: 600 }}>{desc}</div>}
      </div>
      {right}
    </div>
  );

  const Card: React.FC<{ children: React.ReactNode; accent?: string }> = ({ children, accent }) => (
    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
      {accent && <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px', background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />}
      <div style={{ padding: '0 1.1rem' }}>
        {children}
      </div>
    </div>
  );

  const divider = <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '0 -1.1rem' }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '1rem', paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))', backgroundColor: 'var(--bg-primary)', minHeight: '100dvh' }} className="animate-fade-in">

      {/* ── Header ── */}
      <div style={{ paddingTop: '0.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '2px' }}>Profile, targets & preferences</p>
      </div>

      {/* ── Profile Card ── */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)', padding: '1.1rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.5), transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={24} color="#60a5fa" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{user.name}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{goalLabel} · {user.activityLevel.replace(/_/g, ' ')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{user.weight}<span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginLeft: '2px' }}>kg</span></div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase' }}>current</div>
            </div>
            <button
              onClick={() => setShowProfileEdit(true)}
              style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Edit2 size={14} color="rgba(255,255,255,0.55)" />
            </button>
          </div>
        </div>

        {/* Metrics row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { label: 'Height', value: `${user.height}cm` },
            { label: 'Age', value: `${user.age}y` },
            { label: 'Goal', value: user.goalWeight ? `${user.goalWeight}kg` : '—' },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
              <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Targets ── */}
      <div>
        <SectionLabel>Nutrition Targets</SectionLabel>
        <Card accent="#60a5fa">
          {[
            { label: 'Calories', value: `${user.targets.calories}`, unit: 'kcal', color: '#fff' },
            { label: 'Protein', value: `${user.targets.protein}`, unit: 'g', color: 'var(--color-protein)' },
            { label: 'Carbohydrates', value: `${user.targets.carbs}`, unit: 'g', color: 'var(--color-carbs)' },
            { label: 'Fats', value: `${user.targets.fats}`, unit: 'g', color: 'var(--color-fats)' },
          ].map((row, i, arr) => (
            <React.Fragment key={row.label}>
              <SettingsRow
                label={row.label}
                right={
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: row.color, fontVariantNumeric: 'tabular-nums' }}>
                    {row.value}<span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginLeft: '3px' }}>{row.unit}</span>
                  </span>
                }
              />
              {i < arr.length - 1 && divider}
            </React.Fragment>
          ))}
        </Card>
      </div>

      {/* ── TDEE ── */}
      {tdee && (
        <div>
          <SectionLabel>Metabolic Breakdown</SectionLabel>
          <Card accent="#fb923c">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '0.9rem', paddingBottom: '0.75rem' }}>
              <Calculator size={14} color="#fb923c" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fb923c' }}>Mifflin-St Jeor · auto-updated to your current stats</span>
            </div>
            {divider}
            {[
              { label: 'BMR', desc: 'calories burned at rest', value: `${tdee.bmr} kcal` },
              { label: 'TDEE', desc: 'with activity multiplier', value: `${tdee.tdee} kcal` },
              { label: 'Your target', desc: `${Math.abs(tdee.deficit)} kcal ${tdee.deficit < 0 ? 'deficit' : 'surplus'}`, value: `${tdee.targetCalories} kcal` },
            ].map((row, i, arr) => (
              <React.Fragment key={row.label}>
                <SettingsRow label={row.label} desc={row.desc} right={<span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fb923c', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{row.value}</span>} />
                {i < arr.length - 1 && divider}
              </React.Fragment>
            ))}
          </Card>
        </div>
      )}

      {/* ── Program ── */}
      <div>
        <SectionLabel>Training Program</SectionLabel>
        <Card>
          <SettingsRow
            label={state.assignedProgram === 'male_phase2' ? 'Strength & Size' : state.assignedProgram === 'female_phase1' ? 'Glute & Tone Focus' : 'No program set'}
            desc={state.assignedProgram === 'male_phase2' ? 'Push · Pull · Legs · Upper · 4 days/week' : state.assignedProgram === 'female_phase1' ? 'Lower · Upper · 4 days/week' : 'Tap Change to choose a training program'}
            right={
              <button
                onClick={() => setShowProgramPicker(true)}
                style={{ padding: '0.35rem 0.8rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
              >
                Change
              </button>
            }
          />
        </Card>
      </div>

      {/* ── Coaching Engine ── */}
      <div>
        <SectionLabel>Coaching Engine</SectionLabel>
        <Card>
          {([
            { key: 'adaptiveCoaching' as const, label: 'Adaptive Coaching', desc: 'AI insights & weekly analysis on Dashboard' },
            { key: 'plateauDetection' as const, label: 'Plateau Detection', desc: 'Trigger adjustment when weight stalls for 14 days' },
            { key: 'weeklyCheckIn' as const, label: 'Weekly Check-In', desc: 'Evaluate adherence & suggest calorie adjustments' },
          ]).map((row, i, arr) => (
            <React.Fragment key={row.key}>
              <SettingsRow
                label={row.label}
                desc={row.desc}
                onClick={() => toggleSetting(row.key)}
                right={<Toggle enabled={settings[row.key]} onToggle={() => toggleSetting(row.key)} />}
              />
              {i < arr.length - 1 && divider}
            </React.Fragment>
          ))}
        </Card>
      </div>

      {/* ── Integrations (honest) ── */}
      <div>
        <SectionLabel>Platform Integrations</SectionLabel>
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.85rem 1.1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <Lock size={13} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, lineHeight: 1.4 }}>
              Health platform sync requires the native iOS/Android app. Coming in v3.0.
            </span>
          </div>
          {[
            { name: 'Apple Health', sub: 'Steps, HRV, sleep · iOS only', icon: '🍎' },
            { name: 'Google Fit', sub: 'Steps, activity · Android', icon: '🏃' },
            { name: 'Garmin Connect', sub: 'HRV, recovery, workouts', icon: '⌚' },
            { name: 'Whoop', sub: 'Strain, recovery, sleep', icon: '💪' },
          ].map((item, i, arr) => (
            <React.Fragment key={item.name}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginTop: '1px' }}>{item.sub}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.3rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                  <Smartphone size={11} color="rgba(255,255,255,0.25)" />
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Native only</span>
                </div>
              </div>
              {i < arr.length - 1 && <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.04)', margin: '0 1.1rem' }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Data & Privacy ── */}
      <div>
        <SectionLabel>Data & Privacy</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={handleExportJSON} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '1rem 1.1rem', backgroundColor: 'var(--bg-card)', color: '#fff', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Download size={16} color="rgba(255,255,255,0.5)" />
              Export all data (JSON)
            </div>
            <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
          </button>
          <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '1rem 1.1rem', backgroundColor: 'var(--bg-card)', color: '#fff', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Download size={16} color="rgba(255,255,255,0.5)" />
              Export history (CSV)
            </div>
            <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
          </button>
          <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '0 1rem', lineHeight: 1.5 }}>
            All data is stored locally on this device. Nothing is sent to any server.
          </p>
          {!showResetConfirm ? (
            <button onClick={() => setShowResetConfirm(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '1rem', backgroundColor: 'transparent', color: '#f87171', borderRadius: '16px', border: '1px solid rgba(248,113,113,0.25)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginTop: '4px' }}>
              <Trash2 size={16} /> Reset All Data
            </button>
          ) : (
            <div style={{ border: '1px solid rgba(248,113,113,0.35)', borderRadius: '16px', padding: '1.1rem', backgroundColor: 'rgba(248,113,113,0.05)' }}>
              <p style={{ color: '#f87171', textAlign: 'center', marginBottom: '1rem', fontSize: '0.88rem', fontWeight: 700 }}>This permanently deletes all your data. Are you sure?</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowResetConfirm(false)} style={{ flex: 1, padding: '0.8rem', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => { resetApp(); setShowResetConfirm(false); }} style={{ flex: 1, padding: '0.8rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>Delete Everything</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', paddingBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.15)', fontWeight: 700, letterSpacing: '0.08em' }}>BODY BLUEPRINT COACH · v2.2.0</span>
      </div>

      {/* ══ PROFILE EDIT OVERLAY ══ */}
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

      {/* ══ PROGRAM PICKER OVERLAY ══ */}
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
    </div>
  );
};

// ══ Profile Edit Sheet ══════════════════════════════════════════════════════════
const ProfileEditSheet: React.FC<{
  user: UserProfile;
  onSave: (updates: Partial<UserProfile>) => void;
  onClose: () => void;
}> = ({ user, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: user.name,
    weight: String(user.weight),
    goalWeight: user.goalWeight ? String(user.goalWeight) : '',
    height: String(user.height),
    age: String(user.age),
    sex: user.sex,
    activityLevel: user.activityLevel,
    goalType: user.goalType,
    preferredDietSpeed: user.preferredDietSpeed,
    trainingFrequency: String(user.trainingFrequency || 3),
    stepsTarget: String(user.stepsTarget || 8000),
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim() || !form.weight || !form.height || !form.age) {
      return;
    }
    onSave({
      name: form.name.trim(),
      weight: parseFloat(form.weight),
      goalWeight: form.goalWeight ? parseFloat(form.goalWeight) : undefined,
      height: parseFloat(form.height),
      age: parseInt(form.age),
      sex: form.sex as 'male' | 'female',
      activityLevel: form.activityLevel as any,
      goalType: form.goalType as any,
      preferredDietSpeed: form.preferredDietSpeed as any,
      trainingFrequency: parseInt(form.trainingFrequency) || 3,
      stepsTarget: parseInt(form.stepsTarget) || 8000,
    });
  };

  const inputStyle = {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const selectStyle = {
    ...inputStyle,
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.3)' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 1rem center',
  };

  const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>{children}</div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-primary)', zIndex: 9010, overflowY: 'auto' }}>
      <div style={{ padding: '1.25rem', paddingBottom: '3rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Edit Profile</h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '2px' }}>Changes recalculate your targets</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} color="rgba(255,255,255,0.7)" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Name */}
          <div>
            <Label>Name</Label>
            <input style={inputStyle} type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
          </div>

          {/* Metrics row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <Label>Current weight (kg)</Label>
              <input style={inputStyle} type="number" inputMode="decimal" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="75" />
            </div>
            <div>
              <Label>Goal weight (kg)</Label>
              <input style={inputStyle} type="number" inputMode="decimal" value={form.goalWeight} onChange={e => set('goalWeight', e.target.value)} placeholder="70" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <Label>Height (cm)</Label>
              <input style={inputStyle} type="number" inputMode="decimal" value={form.height} onChange={e => set('height', e.target.value)} placeholder="175" />
            </div>
            <div>
              <Label>Age</Label>
              <input style={inputStyle} type="number" inputMode="numeric" value={form.age} onChange={e => set('age', e.target.value)} placeholder="30" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <Label>Biological sex</Label>
              <select style={selectStyle} value={form.sex} onChange={e => set('sex', e.target.value)}>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div>
              <Label>Training days/week</Label>
              <input style={inputStyle} type="number" inputMode="numeric" min="0" max="7" value={form.trainingFrequency} onChange={e => set('trainingFrequency', e.target.value)} placeholder="4" />
            </div>
          </div>

          <div>
            <Label>Goal</Label>
            <select style={selectStyle} value={form.goalType} onChange={e => set('goalType', e.target.value)}>
              <option value="fat_loss">Fat Loss</option>
              <option value="muscle_gain">Muscle Gain</option>
              <option value="maintenance">Maintenance</option>
              <option value="recomposition">Recomposition</option>
            </select>
          </div>

          <div>
            <Label>Activity level</Label>
            <select style={selectStyle} value={form.activityLevel} onChange={e => set('activityLevel', e.target.value)}>
              <option value="sedentary">Sedentary — desk job, little exercise</option>
              <option value="lightly_active">Lightly Active — 1–3 days/week</option>
              <option value="moderately_active">Moderately Active — 3–5 days/week</option>
              <option value="very_active">Very Active — 6–7 days/week</option>
            </select>
          </div>

          <div>
            <Label>Diet pacing</Label>
            <select style={selectStyle} value={form.preferredDietSpeed} onChange={e => set('preferredDietSpeed', e.target.value)}>
              <option value="sustainable">Sustainable — slow, easier to maintain</option>
              <option value="moderate">Moderate — recommended balance</option>
              <option value="aggressive">Aggressive — faster, more demanding</option>
            </select>
          </div>

          <div>
            <Label>Daily step target</Label>
            <input style={inputStyle} type="number" inputMode="numeric" value={form.stepsTarget} onChange={e => set('stepsTarget', e.target.value)} placeholder="8000" />
          </div>

          <button
            onClick={handleSave}
            disabled={!form.name.trim() || !form.weight || !form.height || !form.age}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '1rem',
              backgroundColor: 'white',
              color: 'black',
              border: 'none',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              opacity: (!form.name.trim() || !form.weight || !form.height || !form.age) ? 0.4 : 1,
              letterSpacing: '-0.01em',
            }}
          >
            Save & Recalculate Targets
          </button>
        </div>
      </div>
    </div>
  );
};

// ══ Program Picker Sheet ════════════════════════════════════════════════════════
const ProgramPickerSheet: React.FC<{
  current: 'male_phase2' | 'female_phase1' | null;
  onSelect: (p: 'male_phase2' | 'female_phase1') => void;
  onClose: () => void;
}> = ({ current, onSelect, onClose }) => {
  const programs = [
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
      desc: 'Push-Pull-Legs-Upper split focused on hypertrophy and progressive overload. For serious muscle-building.',
      split: 'Push · Pull · Legs · Upper · 4 days/week',
      accent: '#60a5fa',
    },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-primary)', zIndex: 9010, overflowY: 'auto' }}>
      <div style={{ padding: '1.25rem', paddingBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Choose Program</h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '2px' }}>Your training split for the week</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} color="rgba(255,255,255,0.7)" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {programs.map(p => {
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
                  <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px', background: `linear-gradient(90deg, transparent, ${p.accent}, transparent)` }} />
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{p.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800 }}>{p.name}</span>
                      {isSelected && <Check size={16} color={p.accent} />}
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: p.accent, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{p.tag}</div>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: '0 0 8px' }}>{p.desc}</p>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{p.split}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
