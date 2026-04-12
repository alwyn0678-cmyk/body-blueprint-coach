import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, Calendar, X, ChevronRight, Clock, Users, Loader2, BookOpen, ShoppingCart, Check, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateMealPlan, generateRecipe, Recipe } from '../services/aiCoach';
import type { MealPlan as MealPlanType, PlannedMealItem, MealType } from '../types';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
  dessert: 'Dessert',
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#974400',
  lunch: '#576038',
  dinner: '#3E4528',
  snacks: '#8B9467',
  dessert: '#7C3F8E',
};

// ── Macro Badge ───────────────────────────────────────────────────────────────

const MacroBadge: React.FC<{ label: string; value: number; unit?: string; color: string }> = React.memo(
  ({ label, value, unit = 'g', color }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 48 }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color, letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--text-primary)' }}>
        {Math.round(value)}{unit === 'kcal' ? '' : unit}
      </span>
    </div>
  )
);

// ── Meal Item Row ─────────────────────────────────────────────────────────────

const MealItemRow: React.FC<{ item: PlannedMealItem; onTap: () => void }> = React.memo(
  ({ item, onTap }) => (
    <div
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onTap()}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '11px 0', borderBottom: '1px solid rgba(87,96,56,0.07)',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          {item.foodName}
        </div>
        <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
          {item.servingNote}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#974400' }}>{item.protein}g P</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#576038' }}>{item.calories} kcal</span>
        <ChevronRight size={13} color="rgba(87,96,56,0.35)" />
      </div>
    </div>
  )
);

// ── Recipe Modal ──────────────────────────────────────────────────────────────

const RecipeModal: React.FC<{
  item: PlannedMealItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [noKey, setNoKey] = useState(false);
  const [failed, setFailed] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const key = localStorage.getItem('bbc_gemini_api_key') ?? localStorage.getItem('bbc_claude_api_key');
    if (!key?.trim()) {
      setNoKey(true);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const result = await generateRecipe(item.foodName, item.servingNote);
        if (!mountedRef.current) return;
        if (result) {
          setRecipe(result);
        } else {
          setFailed(true);
        }
      } catch {
        if (mountedRef.current) setFailed(true);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
    return () => { mountedRef.current = false; };
  }, [item.foodName, item.servingNote]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9010,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-primary)',
        borderRadius: '28px 28px 0 0',
        maxHeight: '88dvh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        animation: 'slideUpSheet 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.14)', borderRadius: 4, margin: '12px auto 0' }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(87,96,56,0.08)',
        }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div style={{
              fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: '#8B9467', marginBottom: 4,
            }}>
              Recipe
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.25 }}>
              {item.foodName}
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginTop: 3 }}>
              {item.servingNote} · {item.calories} kcal · {item.protein}g protein
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: 'rgba(0,0,0,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={15} color="rgba(0,0,0,0.50)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(87,96,56,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader2 size={22} color="#576038" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.40)', fontWeight: 600 }}>
                Generating recipe...
              </div>
              {/* Skeleton lines */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                {[80, 65, 72, 58, 75].map((w, i) => (
                  <div key={i} style={{
                    height: 12, borderRadius: 6, background: 'rgba(0,0,0,0.07)',
                    width: `${w}%`,
                    animation: `fsSkPulse 1.4s ease-in-out infinite ${i * 0.1}s`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* No API key */}
          {!loading && noKey && (
            <div style={{
              textAlign: 'center', padding: '32px 16px',
              background: 'rgba(87,96,56,0.04)', borderRadius: 16,
              border: '1.5px dashed rgba(87,96,56,0.18)',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>🤖</div>
              <div style={{ fontWeight: 800, color: '#576038', marginBottom: 8 }}>AI Recipe Generation</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', lineHeight: 1.6, marginBottom: 16 }}>
                Add a free Gemini API key in <strong>Settings → AI Coach</strong> to get full step-by-step recipes generated for any meal in your plan.
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(87,96,56,0.10)', borderRadius: 20,
                padding: '6px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#576038',
              }}>
                <BookOpen size={13} /> Get free key at aistudio.google.com
              </div>
            </div>
          )}

          {/* Failed */}
          {!loading && failed && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⚠️</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Couldn't generate recipe</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Check your connection or API key and try again.</div>
            </div>
          )}

          {/* Recipe */}
          {!loading && recipe && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Time + servings chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { icon: <Users size={13} />, label: recipe.servings },
                  { icon: <Clock size={13} />, label: `Prep ${recipe.prepTime}` },
                  { icon: <Clock size={13} />, label: `Cook ${recipe.cookTime}` },
                ].map(({ icon, label }) => (
                  <div key={label} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 20,
                    background: 'rgba(87,96,56,0.08)', border: '1px solid rgba(87,96,56,0.12)',
                    fontSize: '0.75rem', fontWeight: 700, color: '#576038',
                  }}>
                    {icon}{label}
                  </div>
                ))}
              </div>

              {/* Ingredients */}
              <div>
                <div style={{
                  fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'rgba(0,0,0,0.32)',
                  marginBottom: 10,
                }}>
                  Ingredients
                </div>
                <div style={{
                  background: 'var(--bg-card)', borderRadius: 14,
                  border: '1px solid rgba(87,96,56,0.08)',
                  overflow: 'hidden',
                }}>
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      borderBottom: i < recipe.ingredients.length - 1 ? '1px solid rgba(87,96,56,0.06)' : 'none',
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: '#8B9467',
                      }} />
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {ing}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <div style={{
                  fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'rgba(0,0,0,0.32)',
                  marginBottom: 10,
                }}>
                  Method
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recipe.steps.map((step, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                      padding: '12px 14px',
                      background: 'var(--bg-card)',
                      borderRadius: 12, border: '1px solid rgba(87,96,56,0.08)',
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #576038, #8B9467)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 900, color: '#fff',
                        marginTop: 1,
                      }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, flex: 1 }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              {recipe.tips && (
                <div style={{
                  background: 'rgba(87,96,56,0.06)',
                  borderRadius: 12, padding: '12px 14px',
                  borderLeft: '3px solid #8B9467',
                }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#8B9467', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 5 }}>
                    Chef's Tip
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {recipe.tips}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUpSheet {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fsSkPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
};

// ── Grocery List Modal ────────────────────────────────────────────────────────

interface GroceryItem {
  name: string;
  servings: string[];
}

// Build deduplicated grocery list from all 7 days
function buildGroceryItems(plan: MealPlanType): GroceryItem[] {
  const map = new Map<string, { name: string; servings: Set<string> }>();
  for (const day of plan.days) {
    for (const items of Object.values(day.meals)) {
      for (const item of items) {
        const key = item.foodName.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, { name: item.foodName, servings: new Set() });
        }
        map.get(key)!.servings.add(item.servingNote);
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, servings }) => ({ name, servings: [...servings] }));
}

const GroceryListModal: React.FC<{
  plan: MealPlanType;
  onClose: () => void;
}> = ({ plan, onClose }) => {
  const items = buildGroceryItems(plan);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const toggle = useCallback((name: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleCopy = useCallback(async () => {
    const text = 'Grocery List\n\n' + items.map(i => `• ${i.name}`).join('\n');
    // iOS-safe clipboard write: use execCommand fallback if async API fails
    const writeViaExecCommand = () => {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(el);
    };
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        writeViaExecCommand();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      writeViaExecCommand();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [items]);

  const uncheckedCount = items.length - checked.size;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9020,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-primary)',
        borderRadius: '28px 28px 0 0',
        maxHeight: '88dvh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        animation: 'slideUpSheet 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.14)', borderRadius: 4, margin: '12px auto 0' }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px 14px',
          borderBottom: '1px solid rgba(87,96,56,0.08)',
        }}>
          <div>
            <div style={{
              fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: '#8B9467', marginBottom: 4,
            }}>
              Weekly Plan
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              Grocery List
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
              {uncheckedCount} of {items.length} items remaining
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 20,
                border: '1.5px solid rgba(87,96,56,0.25)',
                background: copied ? 'rgba(87,96,56,0.10)' : 'transparent',
                color: '#576038', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: 'rgba(0,0,0,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={15} color="rgba(0,0,0,0.50)" />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16,
            border: '1px solid rgba(87,96,56,0.08)', overflow: 'hidden',
          }}>
            {items.map((item, i) => {
              const done = checked.has(item.name);
              return (
                <div
                  key={item.name}
                  onClick={() => toggle(item.name)}
                  role="checkbox"
                  aria-checked={done}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && toggle(item.name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px',
                    borderBottom: i < items.length - 1 ? '1px solid rgba(87,96,56,0.06)' : 'none',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                    border: done ? 'none' : '2px solid rgba(87,96,56,0.30)',
                    background: done ? '#576038' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    {done && <Check size={12} color="#fff" strokeWidth={3} />}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.88rem', fontWeight: 700,
                      color: done ? 'rgba(26,26,26,0.35)' : 'var(--text-primary)',
                      textDecoration: done ? 'line-through' : 'none',
                      transition: 'color 0.2s',
                      lineHeight: 1.3,
                    }}>
                      {item.name}
                    </div>
                    {item.servings.length > 0 && (
                      <div style={{
                        fontSize: '0.71rem', color: done ? 'rgba(26,26,26,0.25)' : 'var(--text-tertiary)',
                        marginTop: 2, transition: 'color 0.2s',
                      }}>
                        {item.servings.join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(26,26,26,0.4)', fontSize: '0.85rem' }}>
              No items in this plan
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUpSheet {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ── Day Card ──────────────────────────────────────────────────────────────────

const DayCard: React.FC<{
  day: MealPlanType['days'][0];
  targets: { calories: number; protein: number };
  onLogMeal: (mealType: MealType, items: PlannedMealItem[]) => void;
}> = React.memo(({ day, targets, onLogMeal }) => {
  const [expanded, setExpanded] = useState(false);
  const [openMeal, setOpenMeal] = useState<string | null>(null);
  const [recipeItem, setRecipeItem] = useState<PlannedMealItem | null>(null);

  const calPct = Math.min((day.totalCalories / targets.calories) * 100, 100);
  const proPct = Math.min((day.totalProtein / targets.protein) * 100, 100);

  const toggleExpanded = useCallback(() => setExpanded(e => !e), []);
  const toggleMeal = useCallback((mealKey: string) => setOpenMeal(prev => prev === mealKey ? null : mealKey), []);

  return (
    <>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 18,
        boxShadow: '0 2px 16px rgba(26,26,26,0.05)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        {/* Day header */}
        <button
          onClick={toggleExpanded}
          style={{ width: '100%', padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{day.dayLabel}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <MacroBadge label="kcal" value={day.totalCalories} unit="kcal" color="#974400" />
                <MacroBadge label="protein" value={day.totalProtein} color="#576038" />
              </div>
              {expanded ? <ChevronUp size={16} color="#999" /> : <ChevronDown size={16} color="#999" />}
            </div>
          </div>

          {/* Progress bars */}
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              { label: 'CAL', pct: calPct, bg: 'rgba(151,68,0,0.12)', fill: '#974400', textColor: 'rgba(151,68,0,0.6)' },
              { label: 'PRO', pct: proPct, bg: 'rgba(87,96,56,0.12)', fill: '#576038', textColor: 'rgba(87,96,56,0.6)' },
            ].map(({ label, pct, bg, fill, textColor }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(26,26,26,0.4)', width: 40, flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, height: 4, borderRadius: 4, background: bg }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: fill, transition: 'width 0.4s ease' }} />
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: textColor, width: 32, textAlign: 'right' }}>{Math.round(pct)}%</span>
              </div>
            ))}
          </div>
        </button>

        {/* Expanded meals */}
        {expanded && (
          <div style={{ borderTop: '1px solid rgba(87,96,56,0.08)' }}>
            {(Object.entries(day.meals) as [string, PlannedMealItem[]][]).map(([mealKey, items]) => {
              if (!items.length) return null;
              const isOpen = openMeal === mealKey;
              const mealCalories = items.reduce((a, x) => a + x.calories, 0);
              const color = MEAL_COLORS[mealKey] ?? '#576038';

              return (
                <div key={mealKey} style={{ borderBottom: '1px solid rgba(87,96,56,0.06)' }}>
                  <button
                    onClick={() => toggleMeal(mealKey)}
                    style={{
                      width: '100%', padding: '12px 18px', background: 'none',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                      <span style={{ fontWeight: 800, fontSize: '0.82rem', color }}>{MEAL_LABELS[mealKey]}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{Math.round(mealCalories)} kcal</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={e => { e.stopPropagation(); onLogMeal(mealKey as MealType, items); }}
                        style={{
                          padding: '4px 10px', borderRadius: 20, border: `1px solid ${color}40`,
                          background: `${color}12`, color, fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer',
                        }}
                      >
                        Log
                      </button>
                      {isOpen ? <ChevronUp size={14} color="#999" /> : <ChevronDown size={14} color="#999" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 18px 12px' }}>
                      {items.map((item, idx) => (
                        <MealItemRow
                          key={idx}
                          item={item}
                          onTap={() => setRecipeItem(item)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recipe modal */}
      {recipeItem && (
        <RecipeModal
          item={recipeItem}
          onClose={() => setRecipeItem(null)}
        />
      )}
    </>
  );
});

// ── Main Page ─────────────────────────────────────────────────────────────────

export const MealPlan: React.FC = () => {
  const { state, saveMealPlan, deleteMealPlan, addFoodToLog, showToast } = useApp();
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'saved'>('current');
  const [showGroceryList, setShowGroceryList] = useState(false);

  const currentPlan = state.mealPlans[0] ?? null;
  const savedPlans = state.mealPlans.slice(1);

  const today = new Date().toISOString().split('T')[0];
  const todayDayOfWeek = new Date().getDay();
  const todayIndex = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
  // Determine effective nutrition targets (AI program phase overrides user defaults)
  const targets = (() => {
    const activeId = state.activeAIProgramId;
    const startDate = state.activeAIProgramStartDate;
    if (activeId && startDate) {
      const program = state.aiPrograms.find(p => p.id === activeId);
      if (program) {
        const daysElapsed = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
        const currentWeek = Math.min(Math.floor(daysElapsed / 7) + 1, 12);
        let phaseIndex = 0;
        for (let i = 0; i < program.phases.length; i++) {
          const parts = program.phases[i].weeks.split('-').map(Number);
          if (currentWeek >= (parts[0] ?? 1) && currentWeek <= (parts[1] ?? 12)) { phaseIndex = i; break; }
        }
        const nutPhase = program.nutrition.phases[phaseIndex];
        if (nutPhase) {
          return { calories: nutPhase.calories, protein: nutPhase.protein };
        }
      }
    }
    return {
      calories: state.user?.targets.calories ?? 2000,
      protein: state.user?.targets.protein ?? 150,
    };
  })();

  const handleGenerate = useCallback(async () => {
    if (!state.user) return;
    setGenerating(true);
    try {
      // If an AI program is active, use the current phase's nutrition targets
      let userForPlan = state.user;
      const activeId = state.activeAIProgramId;
      const startDate = state.activeAIProgramStartDate;
      if (activeId && startDate) {
        const program = state.aiPrograms.find(p => p.id === activeId);
        if (program) {
          const daysElapsed = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
          const currentWeek = Math.min(Math.floor(daysElapsed / 7) + 1, 12);
          let phaseIndex = 0;
          for (let i = 0; i < program.phases.length; i++) {
            const parts = program.phases[i].weeks.split('-').map(Number);
            if (currentWeek >= (parts[0] ?? 1) && currentWeek <= (parts[1] ?? 12)) { phaseIndex = i; break; }
          }
          const nutPhase = program.nutrition.phases[phaseIndex];
          if (nutPhase) {
            userForPlan = {
              ...state.user,
              targets: {
                calories: nutPhase.calories,
                protein: nutPhase.protein,
                carbs: nutPhase.carbs,
                fats: nutPhase.fats,
              },
            };
          }
        }
      }
      const plan = await generateMealPlan(userForPlan);
      saveMealPlan(plan);
      showToast('Meal plan generated!', 'success');
      setActiveTab('current');
    } catch {
      showToast('Failed to generate plan. Try again.', 'error');
    } finally {
      setGenerating(false);
    }
  }, [state.user, state.activeAIProgramId, state.activeAIProgramStartDate, state.aiPrograms, saveMealPlan, showToast]);

  const handleLogMeal = useCallback((mealType: MealType, items: PlannedMealItem[]) => {
    items.forEach(item => {
      const food = {
        id: `planned_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: item.foodName,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        fiber: 0,
        servingSize: 1,
        servingUnit: item.servingNote,
        source: 'custom' as const,
      };
      addFoodToLog(today, mealType, food, 1);
    });
    showToast(`${MEAL_LABELS[mealType]} logged to today!`, 'success');
  }, [today, addFoodToLog, showToast]);

  const todayPlan = currentPlan?.days.find(d => d.dayIndex === todayIndex) ?? currentPlan?.days[0] ?? null;

  return (
    <div className="animate-fade-in" style={{ padding: '20px 16px', paddingBottom: 120, maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>Meal Plan</h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
          {state.user
            ? `${targets.calories} kcal · ${targets.protein}g protein target`
            : 'Set up your profile to personalise'}
        </p>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        style={{
          width: '100%', padding: '16px 20px', borderRadius: 16, border: 'none',
          background: generating ? 'rgba(87,96,56,0.4)' : 'linear-gradient(135deg, #576038, #8B9467)',
          color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: generating ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginBottom: 24,
          boxShadow: '0 6px 24px rgba(87,96,56,0.3)',
        }}
      >
        {generating ? (
          <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />Generating your plan...</>
        ) : (
          <><Sparkles size={18} />{currentPlan ? 'Regenerate Plan' : 'Generate My Meal Plan'}</>
        )}
      </button>

      {!currentPlan && !generating && (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'rgba(87,96,56,0.04)', borderRadius: 20,
          border: '2px dashed rgba(87,96,56,0.15)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🥗</div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#576038', marginBottom: 6 }}>No meal plan yet</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
            Tap the button above to generate a personalised 7-day plan based on your targets
          </div>
        </div>
      )}

      {currentPlan && (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(87,96,56,0.07)', borderRadius: 12, padding: 4 }}>
            {(['current', 'saved'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 9, border: 'none',
                  background: activeTab === tab ? 'var(--bg-card)' : 'transparent',
                  fontWeight: 800, fontSize: '0.8rem', color: activeTab === tab ? '#576038' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {tab === 'current' ? 'This Week' : `Saved (${savedPlans.length})`}
              </button>
            ))}
          </div>

          {activeTab === 'current' && (
            <>
              {/* Today's highlight */}
              {todayPlan && (
                <div style={{
                  background: 'linear-gradient(135deg, #576038, #8B9467)',
                  borderRadius: 18, padding: '16px 20px', marginBottom: 16, color: '#fff',
                }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', opacity: 0.8, marginBottom: 6, textTransform: 'uppercase' }}>
                    Today — {todayPlan.dayLabel}
                  </div>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>{todayPlan.totalCalories}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>kcal planned</div>
                    </div>
                    <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.2)' }} />
                    <div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>{todayPlan.totalProtein}g</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>protein</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <button
                        onClick={() => Object.entries(todayPlan.meals).forEach(([mealKey, items]) => {
                          if (items.length) handleLogMeal(mealKey as MealType, items);
                        })}
                        style={{
                          padding: '8px 14px', borderRadius: 20, border: '1.5px solid rgba(255,255,255,0.4)',
                          background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontSize: '0.78rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <Plus size={14} /> Log All
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* All days */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {currentPlan.days.map(day => (
                  <DayCard
                    key={day.dayIndex}
                    day={day}
                    targets={targets}
                    onLogMeal={handleLogMeal}
                  />
                ))}
              </div>

              {/* Grocery list button */}
              <button
                onClick={() => setShowGroceryList(true)}
                style={{
                  width: '100%', marginTop: 16, padding: '14px 20px', borderRadius: 16,
                  border: '1.5px solid rgba(87,96,56,0.22)',
                  background: 'rgba(87,96,56,0.05)',
                  color: '#576038', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <ShoppingCart size={16} />
                View Grocery List
              </button>

              {/* Plan info */}
              <div style={{
                marginTop: 12, padding: '12px 16px',
                background: 'rgba(87,96,56,0.05)', borderRadius: 12,
                fontSize: '0.75rem', color: 'rgba(26,26,26,0.5)', textAlign: 'center',
              }}>
                <Calendar size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                Generated {new Date(currentPlan.createdAt).toLocaleDateString()}
                {' · '}Target: {currentPlan.targetCalories} kcal / {currentPlan.targetProtein}g protein
              </div>
            </>
          )}

          {activeTab === 'saved' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {savedPlans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(26,26,26,0.4)', fontSize: '0.85rem' }}>
                  Previous plans will appear here
                </div>
              ) : savedPlans.map(plan => (
                <div key={plan.id} style={{
                  background: '#fff', borderRadius: 16, padding: '16px 18px',
                  border: '1px solid rgba(87,96,56,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A' }}>{plan.name}</div>
                    <div style={{ fontSize: '0.73rem', color: 'rgba(26,26,26,0.5)', marginTop: 2 }}>
                      {plan.targetCalories} kcal · {plan.targetProtein}g protein
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMealPlan(plan.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#999' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Grocery list modal */}
      {showGroceryList && currentPlan && (
        <GroceryListModal
          plan={currentPlan}
          onClose={() => setShowGroceryList(false)}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
