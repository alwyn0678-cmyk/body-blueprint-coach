/**
 * FoodScanner — camera/image food analysis via Claude Vision
 *
 * Flow:
 *  1. User uploads or captures an image
 *  2. Claude analyses the plate and returns estimated foods + macros
 *  3. User can adjust amounts before logging
 *  4. onLog() receives confirmed items → caller adds to log
 */

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, AlertCircle, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { analyzeFoodImage, DetectedFood } from '../services/aiCoach';
import { FoodItem, MealType } from '../types';

interface FoodScannerProps {
  onLog: (mealType: MealType, foods: { food: FoodItem; amount: number }[]) => void;
  onClose: () => void;
  defaultMealType?: MealType;
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

const CONFIDENCE_COLOR: Record<DetectedFood['confidence'], string> = {
  high: '#22C55E',
  medium: '#F59E0B',
  low: '#EF4444',
};

const CONFIDENCE_LABEL: Record<DetectedFood['confidence'], string> = {
  high: 'High confidence',
  medium: 'Estimate',
  low: 'Uncertain',
};

export const FoodScanner: React.FC<FoodScannerProps> = ({ onLog, onClose, defaultMealType = 'lunch' }) => {
  const [phase, setPhase] = useState<'pick' | 'analyzing' | 'review' | 'error'>('pick');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imageType, setImageType] = useState<'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'>('image/jpeg');
  const [foods, setFoods] = useState<DetectedFood[]>([]);
  const [amounts, setAmounts] = useState<Record<number, number>>({}); // index → grams override
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [disclaimer, setDisclaimer] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      // Extract base64 and media type from data URL
      const [header, base64] = dataUrl.split(',');
      setImageBase64(base64);
      const mimeMatch = header.match(/data:([^;]+);/);
      const mime = (mimeMatch?.[1] ?? 'image/jpeg') as typeof imageType;
      setImageType(mime);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleAnalyse = async () => {
    if (!imageBase64) return;
    setPhase('analyzing');
    const result = await analyzeFoodImage(imageBase64, imageType);
    if ('error' in result) {
      setErrorMsg(result.error);
      setPhase('error');
      return;
    }
    setFoods(result.foods);
    setDisclaimer(result.disclaimer);
    // Pre-select all, set default amounts = estimatedGrams
    const initialAmounts: Record<number, number> = {};
    const initialSelected = new Set<number>();
    result.foods.forEach((f, i) => {
      initialAmounts[i] = f.estimatedGrams;
      initialSelected.add(i);
    });
    setAmounts(initialAmounts);
    setSelected(initialSelected);
    setPhase('review');
  };

  const getScaledNutrition = (food: DetectedFood, grams: number) => {
    const ratio = grams / Math.max(food.estimatedGrams, 1);
    return {
      calories: Math.round(food.calories * ratio),
      protein: Math.round(food.protein * ratio),
      carbs: Math.round(food.carbs * ratio),
      fats: Math.round(food.fats * ratio),
    };
  };

  const totalNutrition = foods.reduce((acc, food, i) => {
    if (!selected.has(i)) return acc;
    const grams = amounts[i] ?? food.estimatedGrams;
    const n = getScaledNutrition(food, grams);
    return {
      calories: acc.calories + n.calories,
      protein: acc.protein + n.protein,
      carbs: acc.carbs + n.carbs,
      fats: acc.fats + n.fats,
    };
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const handleConfirm = () => {
    const items: { food: FoodItem; amount: number }[] = [];
    foods.forEach((food, i) => {
      if (!selected.has(i)) return;
      const grams = amounts[i] ?? food.estimatedGrams;
      const n = getScaledNutrition(food, grams);
      items.push({
        food: {
          id: `scan_${Date.now()}_${i}`,
          name: food.name,
          calories: n.calories,
          protein: n.protein,
          carbs: n.carbs,
          fats: n.fats,
          servingSize: grams,
          servingUnit: 'g',
          source: 'custom',
        } as FoodItem,
        amount: 1, // nutrition already scaled to actual grams
      });
    });
    if (items.length > 0) onLog(mealType, items);
    onClose();
  };

  const bg = 'var(--bg-primary, #07070f)';
  const card = 'rgba(255,255,255,0.04)';
  const border = '1px solid rgba(255,255,255,0.07)';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: bg, zIndex: 9020,
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.2rem 1.25rem 0.75rem',
        borderBottom: border,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.35rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
            Scan Meal
          </h2>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2, fontWeight: 600 }}>
            {phase === 'review' ? 'Review & adjust before logging' : 'Take a photo or upload an image'}
          </p>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <X size={18} color="rgba(255,255,255,0.6)" />
        </button>
      </div>

      <div style={{ flex: 1, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* PHASE: pick */}
        {phase === 'pick' && (
          <>
            {/* Image area */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                borderRadius: 20, border: imagePreview ? 'none' : '2px dashed rgba(255,255,255,0.12)',
                background: card, overflow: 'hidden',
                minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexDirection: 'column', gap: 12,
              }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="meal" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 20 }} />
              ) : (
                <>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Camera size={28} color="#0A84FF" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>Take a photo of your meal</p>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 4, fontWeight: 600 }}>
                      or tap to upload from your camera roll
                    </p>
                  </div>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />

            {imagePreview && (
              <button
                onClick={() => { setImagePreview(null); setImageBase64(''); }}
                style={{
                  background: 'rgba(255,255,255,0.05)', border,
                  borderRadius: 12, padding: '0.6rem', color: 'rgba(255,255,255,0.5)',
                  fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Upload size={14} /> Change photo
              </button>
            )}

            {/* Disclaimer */}
            <div style={{
              background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.15)',
              borderRadius: 14, padding: '10px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <AlertCircle size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                AI estimates are based on visual appearance. Values may vary by ±20–30%. Always review before logging.
              </p>
            </div>

            {imagePreview && (
              <button
                onClick={handleAnalyse}
                style={{
                  width: '100%', padding: '1.1rem',
                  background: 'linear-gradient(135deg, #0A84FF, #5AC8FA)',
                  border: 'none', borderRadius: 18,
                  color: '#fff', fontWeight: 900, fontSize: '1rem',
                  fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.01em',
                  cursor: 'pointer', boxShadow: '0 8px 32px rgba(10,132,255,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Camera size={18} /> Analyse Meal
              </button>
            )}
          </>
        )}

        {/* PHASE: analyzing */}
        {phase === 'analyzing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, minHeight: 300 }}>
            {imagePreview && (
              <div style={{ position: 'relative', width: '100%', maxHeight: 200, borderRadius: 16, overflow: 'hidden' }}>
                <img src={imagePreview} alt="meal" style={{ width: '100%', objectFit: 'cover', opacity: 0.4 }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader size={32} color="#0A84FF" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
              Identifying foods and estimating macros…
            </p>
          </div>
        )}

        {/* PHASE: error */}
        {phase === 'error' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: 260, textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertCircle size={24} color="#EF4444" />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: '0.95rem', margin: '0 0 6px' }}>Analysis failed</p>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, margin: 0 }}>{errorMsg}</p>
            </div>
            <button
              onClick={() => setPhase('pick')}
              style={{
                padding: '0.7rem 1.5rem', background: 'rgba(255,255,255,0.07)', border,
                borderRadius: 14, color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}

        {/* PHASE: review */}
        {phase === 'review' && (
          <>
            {/* Thumbnail */}
            {imagePreview && (
              <div style={{ borderRadius: 14, overflow: 'hidden', maxHeight: 160 }}>
                <img src={imagePreview} alt="meal" style={{ width: '100%', objectFit: 'cover' }} />
              </div>
            )}

            {/* Meal type selector */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {(Object.keys(MEAL_LABELS) as MealType[]).map(mt => (
                <button
                  key={mt}
                  onClick={() => setMealType(mt)}
                  style={{
                    flexShrink: 0, padding: '6px 14px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 800,
                    border: 'none', cursor: 'pointer',
                    background: mealType === mt ? '#0A84FF' : 'rgba(255,255,255,0.07)',
                    color: mealType === mt ? '#fff' : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.15s',
                  }}
                >{MEAL_LABELS[mt]}</button>
              ))}
            </div>

            {/* Total */}
            <div style={{
              background: 'rgba(10,132,255,0.07)', border: '1px solid rgba(10,132,255,0.15)',
              borderRadius: 16, padding: '12px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                  {totalNutrition.calories}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>kcal total</div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'P', value: totalNutrition.protein, color: '#F59E0B' },
                  { label: 'C', value: totalNutrition.carbs, color: '#3B82F6' },
                  { label: 'F', value: totalNutrition.fats, color: '#EF4444' },
                ].map(m => (
                  <div key={m.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: m.color, fontVariantNumeric: 'tabular-nums' }}>{m.value}g</div>
                    <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Food list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {foods.map((food, i) => {
                const isChecked = selected.has(i);
                const grams = amounts[i] ?? food.estimatedGrams;
                const n = getScaledNutrition(food, grams);
                const isExpanded = expandedIdx === i;
                return (
                  <div
                    key={i}
                    style={{
                      background: isChecked ? 'rgba(255,255,255,0.05)' : card,
                      border: isChecked ? '1px solid rgba(255,255,255,0.1)' : border,
                      borderRadius: 16, overflow: 'hidden',
                      opacity: isChecked ? 1 : 0.4,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {/* Row header */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 12 }}>
                      {/* Checkbox */}
                      <div
                        onClick={() => setSelected(prev => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i); else next.add(i);
                          return next;
                        })}
                        style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                          background: isChecked ? '#22C55E' : 'rgba(255,255,255,0.08)',
                          border: isChecked ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {isChecked && <Check size={13} color="#000" />}
                      </div>

                      {/* Name + confidence */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {food.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: CONFIDENCE_COLOR[food.confidence] }}>
                            {CONFIDENCE_LABEL[food.confidence]}
                          </span>
                          <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.15)' }}>·</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0A84FF', fontVariantNumeric: 'tabular-nums' }}>
                            {n.calories} kcal
                          </span>
                          <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.15)' }}>·</span>
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#F59E0B', fontVariantNumeric: 'tabular-nums' }}>
                            {n.protein}P
                          </span>
                        </div>
                      </div>

                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedIdx(isExpanded ? null : i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
                      >
                        {isExpanded
                          ? <ChevronUp size={16} color="rgba(255,255,255,0.3)" />
                          : <ChevronDown size={16} color="rgba(255,255,255,0.3)" />
                        }
                      </button>
                    </div>

                    {/* Expanded: gram adjuster */}
                    {isExpanded && (
                      <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {/* Gram input */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>Portion (g)</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                              <button
                                onClick={() => setAmounts(prev => ({ ...prev, [i]: Math.max(10, (prev[i] ?? food.estimatedGrams) - 25) }))}
                                style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border, color: '#fff', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >−</button>
                              <input
                                type="number"
                                value={grams}
                                onChange={e => setAmounts(prev => ({ ...prev, [i]: Math.max(1, parseInt(e.target.value) || 1) }))}
                                style={{
                                  width: 72, textAlign: 'center', padding: '6px',
                                  background: 'rgba(255,255,255,0.08)', border,
                                  borderRadius: 10, color: '#fff', fontWeight: 800, fontSize: '0.95rem', outline: 'none',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              />
                              <button
                                onClick={() => setAmounts(prev => ({ ...prev, [i]: (prev[i] ?? food.estimatedGrams) + 25 }))}
                                style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border, color: '#fff', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >+</button>
                            </div>
                          </div>

                          {/* Macro breakdown */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            {[
                              { label: 'Protein', value: n.protein, color: '#F59E0B' },
                              { label: 'Carbs', value: n.carbs, color: '#3B82F6' },
                              { label: 'Fats', value: n.fats, color: '#EF4444' },
                            ].map(m => (
                              <div key={m.label} style={{
                                flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                                padding: '6px 8px', textAlign: 'center',
                              }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: m.color, fontVariantNumeric: 'tabular-nums' }}>{m.value}g</div>
                                <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{m.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Disclaimer */}
            <div style={{
              background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)',
              borderRadius: 12, padding: '8px 12px',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <AlertCircle size={13} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                {disclaimer}
              </p>
            </div>

            {/* Log button */}
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              style={{
                width: '100%', padding: '1.1rem',
                background: selected.size > 0
                  ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                  : 'rgba(255,255,255,0.07)',
                border: 'none', borderRadius: 18,
                color: selected.size > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                fontWeight: 900, fontSize: '1rem',
                fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.01em',
                cursor: selected.size > 0 ? 'pointer' : 'default',
                boxShadow: selected.size > 0 ? '0 8px 32px rgba(34,197,94,0.3)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Check size={18} />
              Log {selected.size} item{selected.size !== 1 ? 's' : ''} to {MEAL_LABELS[mealType]}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
