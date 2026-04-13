import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FoodItem, MealType } from '../types';
import { Search, ScanLine, Plus, CheckCircle2, Loader2, Globe, Database, Heart, Clock, X, Camera, PenLine, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useApp } from '../context/AppContext';
import { searchFoods, lookupBarcode as lookupBarcodeService } from '../services/foodService';

interface FoodSearchProps {
  mealType: MealType;
  onAdd: (food: FoodItem, amount: number) => void;
  onCancel: () => void;
}

const DEBOUNCE_MS = 600;
type Tab = 'search' | 'barcode' | 'recent' | 'favorites';

// ── Skeleton row ──────────────────────────────────────────────────────────────
const SkeletonFoodRow: React.FC = () => (
  <div style={{
    display: 'flex', alignItems: 'center',
    padding: '0.85rem 0.75rem',
    borderBottom: '1px solid rgba(0,0,0,0.04)',
    gap: '12px',
  }}>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <div style={{
        height: '13px', borderRadius: '7px', width: '62%',
        backgroundColor: 'rgba(0,0,0,0.08)',
        animation: 'fsSkPulse 1.4s ease-in-out infinite',
      }} />
      <div style={{
        height: '10px', borderRadius: '5px', width: '38%',
        backgroundColor: 'rgba(0,0,0,0.05)',
        animation: 'fsSkPulse 1.4s ease-in-out infinite 0.2s',
      }} />
    </div>
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <div style={{
        height: '20px', width: '36px', borderRadius: '6px',
        backgroundColor: 'rgba(0,0,0,0.06)',
        animation: 'fsSkPulse 1.4s ease-in-out infinite 0.15s',
      }} />
      <div style={{
        height: '28px', width: '28px', borderRadius: '50%',
        backgroundColor: 'rgba(0,0,0,0.06)',
        animation: 'fsSkPulse 1.4s ease-in-out infinite 0.1s',
      }} />
    </div>
  </div>
);

// Section label style
const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'rgba(0,0,0,0.28)',
};

export const FoodSearch: React.FC<FoodSearchProps> = ({ mealType, onAdd, onCancel }) => {
  const { state, showToast, toggleFavoriteFood, trackRecentFood, addCustomFood, clearRecentFoods } = useApp();
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [localResults, setLocalResults] = useState<FoodItem[]>([]);
  const [apiResults, setApiResults] = useState<FoodItem[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'found' | 'notfound' | 'error' | 'permission_denied' | 'unsupported'>('idle');
  const [selectedViaBarcode, setSelectedViaBarcode] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [measurementValue, setMeasurementValue] = useState('1');
  const [measurementUnit, setMeasurementUnit] = useState('serving');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const SCANNER_ID = 'bbc-qr-scanner';

  useEffect(() => {
    if (selectedFood) {
      setMeasurementValue(selectedFood.servingSize.toString());
      setMeasurementUnit(selectedFood.servingUnit || 'g');
    }
  }, [selectedFood]);

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setApiResults([]); setIsApiLoading(false); return; }
    setIsApiLoading(true);
    const r = await searchFoods(q, state.customFoods);
    setApiResults(r.api);
    setApiError(r.apiError);
    setIsApiLoading(false);
  }, [state.customFoods]);

  useEffect(() => {
    const q = query.trim();
    if (q === '') {
      searchFoods('', state.customFoods).then(r => {
        setLocalResults(r.local.slice(0, 12));
        setApiResults([]);
        setApiError(false);
      });
      return;
    }
    searchFoods(q, state.customFoods).then(r => {
      setLocalResults(r.local);
    });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsApiLoading(true);
    setApiError(false);
    debounceRef.current = setTimeout(() => runSearch(q), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, state.customFoods, runSearch]);

  const getMultiplier = (): number => {
    if (!selectedFood) return 0;
    const val = parseFloat(measurementValue) || 0;
    if (val <= 0) return 0;
    const base = (selectedFood.servingUnit || 'g').toLowerCase();
    const input = measurementUnit.toLowerCase();
    if (base === input) return val / selectedFood.servingSize;
    if (input.includes('serving')) return val;
    let valInBase = val;
    if ((base === 'g' || base === 'ml') && input === 'oz') valInBase = val * 28.3495;
    else if ((base === 'g' || base === 'ml') && input === 'lbs') valInBase = val * 453.592;
    return valInBase / selectedFood.servingSize;
  };

  const stopCamera = async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch { /* ignore */ }
      html5QrRef.current = null;
    }
  };

  const startCamera = async () => {
    setScanStatus('scanning');
    await new Promise(r => setTimeout(r, 100));
    try {
      const scanner = new Html5Qrcode(SCANNER_ID);
      html5QrRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 150 }, aspectRatio: 1.6 },
        async (decodedText) => {
          setScanStatus('found');
          await stopCamera();
          await handleBarcodeResult(decodedText);
        },
        () => { /* continuous scan error, ignore */ }
      );
    } catch (err: any) {
      const msg = String(err);
      const isPermissionDenied = msg.includes('Permission') || msg.includes('permission') || msg.includes('NotAllowed') || msg.includes('denied');
      if (isPermissionDenied) {
        setScanStatus('permission_denied');
      } else {
        setScanStatus('error');
        showToast('Camera not available on this device', 'error');
      }
    }
  };

  const [scanNotFound, setScanNotFound] = useState(false);
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [manualBarcodeLookingUp, setManualBarcodeLookingUp] = useState(false);
  const [showManualBarcode, setShowManualBarcode] = useState(false);

  const handleBarcodeResult = async (barcode: string) => {
    setScanStatus('scanning'); // show "looking up..." while we wait
    try {
      const result = await lookupBarcodeService(barcode);
      if (result) {
        setIsScanning(false);
        setScanNotFound(false);
        setSelectedViaBarcode(true);
        setSelectedFood(result);
        showToast(`Found: ${result.name}`, 'success');
      } else {
        // Product not in any database — close scanner, switch to search tab
        // so user can search by name as the natural next step
        setScanStatus('notfound');
        setScanNotFound(true);
        setIsScanning(false);
        await stopCamera();
        // Auto-populate the search query with the barcode so user can try manually
        setQuery(barcode);
        setTab('search');
        showToast('Product not found — searched Open Food Facts + USDA. Try searching by name.', 'info');
      }
    } catch {
      setScanStatus('error');
      setIsScanning(false);
      showToast('Lookup failed — try searching by name', 'error');
    }
  };

  const openScanner = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsScanning(true);
      setScanStatus('unsupported');
      return;
    }
    setScanNotFound(false);
    setIsScanning(true);
    setScanStatus('idle');
    setTimeout(() => startCamera(), 200);
  };

  const closeScanner = async () => {
    await stopCamera();
    setIsScanning(false);
    setScanStatus('idle');
    setScanNotFound(false);
    setShowManualBarcode(false);
    setManualBarcodeInput('');
    setManualBarcodeLookingUp(false);
  };

  const handleManualBarcodeSubmit = async () => {
    const code = manualBarcodeInput.trim();
    if (!code) return;
    setManualBarcodeLookingUp(true);
    try {
      const result = await lookupBarcodeService(code);
      if (result) {
        setIsScanning(false);
        setScanStatus('idle');
        setShowManualBarcode(false);
        setManualBarcodeInput('');
        setSelectedViaBarcode(true);
        setSelectedFood(result);
        showToast(`Found: ${result.name}`, 'success');
      } else {
        showToast('Not found — try searching by name', 'info');
      }
    } catch {
      showToast('Lookup failed — try searching by name', 'error');
    } finally {
      setManualBarcodeLookingUp(false);
    }
  };

  // ── Custom food creation state ────────────────────────────────────────────
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customServingSize, setCustomServingSize] = useState('100');
  const [customServingUnit, setCustomServingUnit] = useState('g');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFats, setCustomFats] = useState('');

  const resetCustomForm = () => {
    setCustomName(''); setCustomBrand(''); setCustomServingSize('100');
    setCustomServingUnit('g'); setCustomCalories(''); setCustomProtein('');
    setCustomCarbs(''); setCustomFats('');
  };

  const handleSaveCustomFood = () => {
    if (!customName.trim()) { showToast('Name is required', 'error'); return; }
    const food: FoodItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      brand: customBrand.trim() || undefined,
      servingSize: parseFloat(customServingSize) || 100,
      servingUnit: customServingUnit.trim() || 'g',
      calories: parseFloat(customCalories) || 0,
      protein: parseFloat(customProtein) || 0,
      carbs: parseFloat(customCarbs) || 0,
      fats: parseFloat(customFats) || 0,
      source: 'custom',
    };
    addCustomFood(food);
    setSelectedFood(food);
    setShowCustomForm(false);
    resetCustomForm();
    showToast('Custom food added', 'success');
  };

  const recentFoodItems = state.recentFoods;
  const favoriteFoodItems = state.favoriteFoods;

  const localIds = new Set(localResults.map(f => f.id));
  const deduplicatedApi = apiResults.filter(f => !localIds.has(f.id));

  const handleQuickAdd = (f: FoodItem, e: React.MouseEvent) => {
    e.stopPropagation();
    trackRecentFood(f);
    onAdd(f, 1);
    showToast(`${f.name} added to ${mealType}`, 'success');
  };

  // Shared input style for custom food form
  const inputFieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: '14px',
    border: '1px solid rgba(0,0,0,0.10)',
    backgroundColor: 'rgba(0,0,0,0.05)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    fontWeight: 500,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const formLabelStyle: React.CSSProperties = {
    ...sectionLabelStyle,
    marginBottom: '6px',
    display: 'block',
  };

  // ── Food row renderer ─────────────────────────────────────────────────────
  const renderFoodRow = (f: FoodItem, isApi = false) => {
    const isFav = state.favoriteFoods.some(fav => fav.id === f.id);
    return (
      <div
        key={f.id}
        onClick={() => setSelectedFood(f)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.85rem 0.75rem',
          borderBottom: '1px solid rgba(0,0,0,0.04)',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
      >
        <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '0.88rem', fontWeight: 700,
              color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {f.name}
            </span>
            {f.source === 'custom' && (
              <span style={{
                fontSize: '0.55rem', fontWeight: 800, color: '#576038',
                backgroundColor: 'rgba(87,96,56,0.10)',
                padding: '1px 5px', borderRadius: '4px', flexShrink: 0,
              }}>CUSTOM</span>
            )}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, display: 'block', marginTop: '2px' }}>
            {f.brand ? `${f.brand} · ` : ''}{f.servingSize}{f.servingUnit}
            {isApi && <span style={{ color: 'rgba(87,96,56,0.60)', marginLeft: '4px' }}>· online</span>}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{ textAlign: 'right', marginRight: '2px' }}>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
              {Math.round(f.calories)}
            </span>
            <span style={{ fontSize: '0.52rem', color: 'rgba(0,0,0,0.30)', fontWeight: 700, letterSpacing: '0.04em' }}>KCAL</span>
          </div>
          {f.protein > 0 && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 800,
              color: 'var(--color-protein)',
              backgroundColor: 'rgba(151,68,0,0.10)',
              border: '1px solid rgba(151,68,0,0.15)',
              padding: '2px 7px', borderRadius: '99px',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {Math.round(f.protein)}P
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); toggleFavoriteFood(f); }}
            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex' }}
          >
            <Heart size={14} color={isFav ? 'var(--accent-red)' : 'rgba(0,0,0,0.20)'} fill={isFav ? 'var(--accent-red)' : 'none'} />
          </button>
          <button
            onClick={e => handleQuickAdd(f, e)}
            style={{
              background: 'var(--accent-blue)', border: 'none',
              color: '#fff', width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
            title="Quick add 1 serving"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    );
  };

  // ── Custom Food Creation overlay ──────────────────────────────────────────
  if (showCustomForm) {
    return (
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9005,
        backgroundColor: 'var(--bg-primary)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          paddingTop: 'calc(1rem + env(safe-area-inset-top))',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Create Food</span>
          <button
            onClick={() => { setShowCustomForm(false); resetCustomForm(); }}
            style={{
              background: 'rgba(0,0,0,0.07)',
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: '50%', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div style={{
          flex: 1, padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '1rem',
          paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))',
        }}>
          <div>
            <label style={formLabelStyle}>Name <span style={{ color: 'var(--accent-red)' }}>*</span></label>
            <input
              type="text" placeholder="e.g. Homemade granola"
              value={customName} onChange={e => setCustomName(e.target.value)}
              className="input-field"
              style={inputFieldStyle}
            />
          </div>
          <div>
            <label style={formLabelStyle}>Brand <span style={{ color: 'rgba(0,0,0,0.20)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <input
              type="text" placeholder="e.g. Homemade"
              value={customBrand} onChange={e => setCustomBrand(e.target.value)}
              className="input-field"
              style={inputFieldStyle}
            />
          </div>
          <div>
            <label style={formLabelStyle}>Serving size</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number" placeholder="100"
                value={customServingSize} onChange={e => setCustomServingSize(e.target.value)}
                className="input-field"
                style={{ ...inputFieldStyle, flex: 1 }}
              />
              <input
                type="text" placeholder="g"
                value={customServingUnit} onChange={e => setCustomServingUnit(e.target.value)}
                className="input-field"
                style={{ ...inputFieldStyle, width: '80px', flex: 'none' }}
              />
            </div>
          </div>
          <div>
            <label style={formLabelStyle}>Calories (kcal)</label>
            <input
              type="number" placeholder="0"
              value={customCalories} onChange={e => setCustomCalories(e.target.value)}
              className="input-field"
              style={inputFieldStyle}
            />
          </div>
          <div>
            <label style={formLabelStyle}>Macros (g per serving)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { label: 'Protein', color: 'var(--color-protein)', val: customProtein, set: setCustomProtein },
                { label: 'Carbs', color: 'var(--color-carbs)', val: customCarbs, set: setCustomCarbs },
                { label: 'Fats', color: 'var(--color-fats)', val: customFats, set: setCustomFats },
              ].map(m => (
                <div key={m.label} style={{ flex: 1 }}>
                  <label style={{ ...formLabelStyle, color: m.color }}>{m.label}</label>
                  <input
                    type="number" placeholder="0"
                    value={m.val} onChange={e => m.set(e.target.value)}
                    className="input-field"
                    style={inputFieldStyle}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save button pinned bottom */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '1rem 1.25rem',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
          backgroundColor: 'rgba(8,8,16,0.92)', backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(0,0,0,0.07)', zIndex: 9006,
        }}>
          <button
            onClick={handleSaveCustomFood}
            style={{
              width: '100%', padding: '1.1rem',
              borderRadius: '16px', backgroundColor: 'var(--accent-blue)',
              color: '#fff', fontWeight: 800, fontSize: '1rem', border: 'none', cursor: 'pointer',
            }}
          >
            Save Food
          </button>
        </div>
      </div>
    );
  }

  // ── Food Detail / Amount Selection screen ─────────────────────────────────
  if (selectedFood) {
    const mult = getMultiplier();
    const isFav = state.favoriteFoods.some(f => f.id === selectedFood.id);
    return (
      // Outer: absolute inside SlideOver (which is position:fixed full-screen).
      // Using absolute avoids the iOS scroll bug with position:fixed + overflow:auto
      // inside a CSS-transformed ancestor (Framer Motion SlideOver).
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}
        className="animate-slide-up"
      >
        {/* Scrollable content — generous paddingBottom so button clears tab bar + home indicator */}
        <div style={{ padding: '1rem', paddingBottom: 'max(10rem, calc(8rem + env(safe-area-inset-bottom)))' }}>
          {/* Top nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <button
              onClick={() => { setSelectedFood(null); setSelectedViaBarcode(false); }}
              style={{
                background: 'rgba(0,0,0,0.07)', border: 'none', borderRadius: '10px',
                display: 'flex', alignItems: 'center', gap: '6px',
                color: 'rgba(0,0,0,0.45)', padding: '0.5rem 0.85rem',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              ← Back
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedViaBarcode && (
                <button
                  onClick={() => { setSelectedFood(null); setSelectedViaBarcode(false); openScanner(); }}
                  title="Scan again"
                  style={{
                    background: 'rgba(87,96,56,0.10)', border: '1px solid rgba(87,96,56,0.18)',
                    borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px',
                    color: '#576038', padding: '0.45rem 0.75rem',
                    fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={13} strokeWidth={2.5} />
                  Rescan
                </button>
              )}
              <button
                onClick={() => toggleFavoriteFood(selectedFood)}
                style={{ background: 'none', border: 'none', display: 'flex', padding: '0.4rem', cursor: 'pointer' }}
              >
                <Heart size={22} color={isFav ? 'var(--accent-red)' : 'rgba(0,0,0,0.28)'} fill={isFav ? 'var(--accent-red)' : 'none'} />
              </button>
            </div>
          </div>

          {/* Food name */}
          <div style={{ marginTop: '1.25rem', marginBottom: '1rem' }}>
            <h2 style={{ color: 'var(--text-primary)', lineHeight: 1.1, fontSize: '1.9rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              {selectedFood.name}
            </h2>
            <p style={{ color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, fontSize: '0.72rem', marginTop: '6px' }}>
              {selectedFood.brand || 'Generic'}{selectedFood.source === 'openfoodfacts' ? ' · Open Food Facts' : ''}
            </p>
          </div>

          {/* Macro card */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '20px',
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.04)',
            padding: '1.25rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
              borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: '1rem', marginBottom: '1rem',
            }}>
              <span style={{
                fontSize: '3.5rem', fontWeight: 900, color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', lineHeight: 0.9,
              }}>
                {Math.round(selectedFood.calories * mult)}
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Calories</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {[
                { label: 'Protein', value: selectedFood.protein * mult, color: 'var(--color-protein)' },
                { label: 'Carbs', value: selectedFood.carbs * mult, color: 'var(--color-carbs)' },
                { label: 'Fats', value: selectedFood.fats * mult, color: 'var(--color-fats)' },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: m.color, fontVariantNumeric: 'tabular-nums', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {Math.round(m.value)}g
                  </span>
                  <span style={{ color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', marginTop: '2px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
            {(selectedFood.fiber !== undefined || selectedFood.sodium !== undefined) && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                {selectedFood.fiber !== undefined && (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.35)' }}>
                    Fiber: <strong style={{ color: 'rgba(0,0,0,0.60)' }}>{Math.round(selectedFood.fiber * mult)}g</strong>
                  </span>
                )}
                {selectedFood.sodium !== undefined && (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.35)' }}>
                    Sodium: <strong style={{ color: 'rgba(0,0,0,0.60)' }}>{Math.round(selectedFood.sodium * mult)}mg</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Serving amount — type="text" fixes iOS decimal point bug */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '0.5rem' }}>
            <label style={{ ...sectionLabelStyle, letterSpacing: '0.08em' }}>Serving Amount</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={measurementValue}
              onChange={e => {
                const raw = e.target.value.replace(',', '.');
                if (/^(\d*\.?\d*)$/.test(raw) || raw === '') setMeasurementValue(raw);
              }}
              style={{
                width: '100%', padding: '1rem 1.25rem', borderRadius: '14px',
                border: '1px solid rgba(0,0,0,0.08)',
                fontSize: '1.6rem', fontWeight: 700, textAlign: 'center',
                backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { val: 'g', label: 'g' },
                { val: 'serving', label: 'srv' },
                { val: 'oz', label: 'oz' },
                { val: 'ml', label: 'ml' },
              ].map(u => (
                <button
                  key={u.val}
                  onClick={() => setMeasurementUnit(u.val)}
                  style={{
                    flex: 1, padding: '0.65rem 0',
                    borderRadius: '12px',
                    border: `1.5px solid ${measurementUnit === u.val ? 'rgba(87,96,56,0.50)' : 'rgba(0,0,0,0.10)'}`,
                    backgroundColor: measurementUnit === u.val ? 'rgba(87,96,56,0.10)' : 'rgba(0,0,0,0.04)',
                    color: measurementUnit === u.val ? '#576038' : 'rgba(0,0,0,0.35)',
                    fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Log button — inline in scroll so tab bar never covers it */}
          <div style={{ marginTop: '1.25rem' }}>
            <button
              onClick={() => { trackRecentFood(selectedFood); onAdd(selectedFood, mult); showToast(`${selectedFood.name} added`, 'success'); }}
              style={{
                padding: '1.1rem', width: '100%',
                fontSize: '1rem', fontWeight: 800, borderRadius: '20px',
                backgroundColor: 'var(--accent-blue)', color: '#fff',
                boxShadow: '0 8px 24px rgba(87,96,56,0.30)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: 'pointer',
              }}
            >
              <CheckCircle2 size={20} /> Log to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Barcode Scanner overlays ──────────────────────────────────────────────
  if (isScanning) {
    if (scanStatus === 'unsupported') {
      return (
        <div className="animate-fade-in" style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 150, backgroundColor: 'var(--bg-primary)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '2rem',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem',
          }}>
            <Camera size={28} color="rgba(0,0,0,0.28)" />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem' }}>Camera not available on this device</h3>
          <p style={{ fontSize: '0.82rem', color: 'rgba(0,0,0,0.38)', textAlign: 'center', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Enter the barcode number manually below
          </p>
          <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text" inputMode="numeric"
              placeholder="e.g. 5000112637939"
              value={manualBarcodeInput}
              onChange={e => setManualBarcodeInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleManualBarcodeSubmit()}
              className="input-field"
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(0,0,0,0.07)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '14px', color: '#fff',
                fontSize: '1rem', fontWeight: 600, outline: 'none',
              }}
            />
            <button
              onClick={handleManualBarcodeSubmit}
              disabled={!manualBarcodeInput.trim() || manualBarcodeLookingUp}
              style={{
                padding: '0.85rem',
                backgroundColor: 'var(--accent-blue)', border: 'none',
                borderRadius: '14px', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                opacity: manualBarcodeInput.trim() && !manualBarcodeLookingUp ? 1 : 0.4,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {manualBarcodeLookingUp ? <><Loader2 size={16} style={{ animation: 'fsSpin 1s linear infinite' }} /> Looking up...</> : 'Look up barcode'}
            </button>
          </div>
          <button
            onClick={closeScanner}
            style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: 'rgba(0,0,0,0.35)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      );
    }

    if (scanStatus === 'permission_denied') {
      return (
        <div className="animate-fade-in" style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 150, backgroundColor: 'var(--bg-primary)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '2rem',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            backgroundColor: 'rgba(151,68,0,0.10)',
            border: '1px solid rgba(151,68,0,0.20)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem',
          }}>
            <Camera size={28} color="var(--accent-orange)" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem' }}>Camera access required</h3>
          <p style={{ fontSize: '0.82rem', color: 'rgba(0,0,0,0.38)', textAlign: 'center', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            Allow camera permission in Settings, then tap retry
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '320px' }}>
            <button
              onClick={() => { setScanStatus('idle'); setTimeout(() => startCamera(), 200); }}
              style={{
                padding: '0.9rem', backgroundColor: 'var(--accent-blue)',
                border: 'none', borderRadius: '14px', color: '#fff',
                fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              Retry
            </button>
            <button
              onClick={() => setShowManualBarcode(true)}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(0,0,0,0.40)', fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer', padding: '0.5rem',
              }}
            >
              Enter barcode manually
            </button>
          </div>
          {showManualBarcode && (
            <div style={{ width: '100%', maxWidth: '320px', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text" inputMode="numeric"
                placeholder="e.g. 5000112637939"
                value={manualBarcodeInput}
                onChange={e => setManualBarcodeInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleManualBarcodeSubmit()}
                autoFocus
                className="input-field"
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(0,0,0,0.07)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '12px', color: '#fff',
                  fontSize: '0.95rem', fontWeight: 600, outline: 'none',
                }}
              />
              <button
                onClick={handleManualBarcodeSubmit}
                disabled={!manualBarcodeInput.trim() || manualBarcodeLookingUp}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(0,0,0,0.10)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                  opacity: manualBarcodeInput.trim() && !manualBarcodeLookingUp ? 1 : 0.4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {manualBarcodeLookingUp ? <><Loader2 size={15} style={{ animation: 'fsSpin 1s linear infinite' }} /> Looking up...</> : 'Look up'}
              </button>
            </div>
          )}
          <button
            onClick={closeScanner}
            style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: 'rgba(0,0,0,0.28)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      );
    }

    // Active scanner view
    return (
      <div className="animate-fade-in" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 150, backgroundColor: '#000',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.25rem',
          paddingTop: 'calc(1rem + env(safe-area-inset-top))',
          zIndex: 160, position: 'relative',
        }}>
          <div>
            <span style={{ fontSize: '0.6rem', color: 'var(--accent-blue)', letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
              Barcode Scanner
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, marginTop: '-2px' }}>Scan Product</h2>
          </div>
          <button
            onClick={closeScanner}
            style={{
              background: 'rgba(0,0,0,0.08)',
              borderRadius: '50%', border: '1px solid rgba(0,0,0,0.08)',
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scanner viewport */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#111' }}>
          {/* Corner markers */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '240px', height: '140px', zIndex: 10, pointerEvents: 'none' }}>
            {['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map(corner => (
              <div key={corner} style={{
                position: 'absolute',
                width: '20px', height: '20px',
                borderColor: '#fff',
                borderStyle: 'solid',
                borderWidth: 0,
                ...(corner === 'topLeft' ? { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: '4px' } : {}),
                ...(corner === 'topRight' ? { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: '4px' } : {}),
                ...(corner === 'bottomLeft' ? { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: '4px' } : {}),
                ...(corner === 'bottomRight' ? { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: '4px' } : {}),
              }} />
            ))}
          </div>

          <div id={SCANNER_ID} style={{ width: '100%', height: '100%' }} />

          {/* Status badge */}
          <div style={{ position: 'absolute', bottom: '1.5rem', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', zIndex: 10 }}>
            {scanStatus === 'found' && (
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 800, backgroundColor: 'rgba(0,0,0,0.8)', padding: '0.5rem 1.2rem', borderRadius: '20px' }}>
                Barcode found!
              </span>
            )}
            {scanStatus === 'error' && (
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-red)', fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.8)', padding: '0.5rem 1.2rem', borderRadius: '20px' }}>
                Camera not available
              </span>
            )}
            {(scanStatus === 'scanning' || scanStatus === 'idle') && (
              <span style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.70)', fontWeight: 600, backgroundColor: 'rgba(0,0,0,0.65)', padding: '0.4rem 1rem', borderRadius: '20px' }}>
                Point camera at barcode
              </span>
            )}
          </div>
        </div>

        {/* Manual fallback */}
        <div style={{
          padding: '1rem 1.25rem',
          paddingBottom: 'max(2.5rem, calc(1rem + env(safe-area-inset-bottom)))',
          borderTop: '1px solid rgba(0,0,0,0.07)',
        }}>
          <p style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.28)', fontWeight: 600, marginBottom: '8px', textAlign: 'center', letterSpacing: '0.04em' }}>
            Or enter barcode manually
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text" inputMode="numeric"
              placeholder="e.g. 5000112637939"
              value={manualBarcodeInput}
              onChange={e => setManualBarcodeInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleManualBarcodeSubmit()}
              className="input-field"
              style={{
                flex: 1, padding: '0.75rem 1rem',
                backgroundColor: 'rgba(0,0,0,0.07)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '12px', color: '#fff',
                fontSize: '0.95rem', fontWeight: 600, outline: 'none',
              }}
            />
            <button
              onClick={handleManualBarcodeSubmit}
              disabled={!manualBarcodeInput.trim() || manualBarcodeLookingUp}
              style={{
                padding: '0.75rem 1rem', backgroundColor: 'var(--accent-blue)',
                border: 'none', borderRadius: '12px', color: '#fff',
                fontWeight: 700, fontSize: '0.85rem',
                opacity: manualBarcodeInput.trim() && !manualBarcodeLookingUp ? 1 : 0.4,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {manualBarcodeLookingUp ? <Loader2 size={15} style={{ animation: 'fsSpin 1s linear infinite' }} /> : null}
              Look up
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Search Screen ────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string }[] = [
    { id: 'search', label: 'Search' },
    { id: 'barcode', label: 'Barcode' },
    { id: 'recent', label: `Recent${recentFoodItems.length > 0 ? ` (${recentFoodItems.length})` : ''}` },
    { id: 'favorites', label: `Saved${favoriteFoodItems.length > 0 ? ` (${favoriteFoodItems.length})` : ''}` },
  ];

  return (
    <div
      className="animate-slide-up"
      style={{
        backgroundColor: 'var(--bg-primary)', minHeight: '100vh',
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9002,
        display: 'flex', flexDirection: 'column',
        paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
        overflowY: 'auto',
      }}
    >
      {/* ── Page Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1rem 0.75rem',
        paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        flexShrink: 0,
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Search Food</h2>
        <button
          onClick={onCancel}
          style={{
            background: 'rgba(0,0,0,0.07)', border: 'none',
            borderRadius: '50%', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(0,0,0,0.45)', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Tab pill row ── */}
      <div style={{
        display: 'flex', gap: '4px', overflowX: 'auto',
        padding: '10px 12px',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        flexShrink: 0,
      } as React.CSSProperties}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id === 'barcode') openScanner(); }}
            style={{
              padding: '6px 14px',
              borderRadius: '99px',
              border: 'none',
              backgroundColor: tab === t.id ? '#ffffff' : 'rgba(0,0,0,0.07)',
              color: tab === t.id ? '#000' : 'rgba(0,0,0,0.40)',
              fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Search input (visible on search tab) ── */}
      {tab === 'search' && (
        <div style={{ padding: '0 12px 10px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.30)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder={`Search foods for ${mealType}...`}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="input-field"
              style={{
                width: '100%', padding: '0.9rem 2.8rem 0.9rem 2.75rem',
                borderRadius: '14px',
                border: '1px solid rgba(0,0,0,0.10)',
                backgroundColor: 'rgba(0,0,0,0.05)',
                color: '#fff', fontSize: '0.95rem', fontWeight: 500,
                outline: 'none', boxSizing: 'border-box',
              }}
              autoFocus
            />
            {isApiLoading && (
              <Loader2
                size={16}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-blue)', animation: 'fsSpin 1s linear infinite' }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── API Error Banner ── */}
      {apiError && tab === 'search' && query.length >= 2 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.6rem 0.9rem', margin: '0 12px 8px',
          backgroundColor: 'rgba(151,68,0,0.07)',
          border: '1px solid rgba(151,68,0,0.15)',
          borderRadius: '12px', gap: '10px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <AlertTriangle size={13} color="var(--accent-orange)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(0,0,0,0.50)', lineHeight: 1.35 }}>
              Live search unavailable — showing local results only.
            </span>
          </div>
          <button
            onClick={() => runSearch(query.trim())}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '0.35rem 0.65rem',
              backgroundColor: 'rgba(151,68,0,0.10)',
              border: '1px solid rgba(151,68,0,0.20)',
              borderRadius: '8px', color: 'var(--accent-orange)',
              fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── RECENT TAB ── */}
        {tab === 'recent' && (
          recentFoodItems.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(0,0,0,0.25)' }}>
              <Clock size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.85rem' }}>No recent foods yet. Log some food to see them here.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={12} color="rgba(0,0,0,0.28)" />
                  <span style={sectionLabelStyle}>Recently Logged</span>
                </div>
                {showClearConfirm ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.40)' }}>Clear recent foods?</span>
                    <button
                      onClick={() => { clearRecentFoods(); setShowClearConfirm(false); }}
                      style={{ background: 'rgba(255,69,58,0.15)', border: '1px solid rgba(255,69,58,0.3)', borderRadius: '6px', color: 'var(--accent-red)', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', cursor: 'pointer' }}
                    >
                      OK
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,0.28)', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,0.28)', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Clear recent
                  </button>
                )}
              </div>
              {recentFoodItems.map(f => renderFoodRow(f, false))}
            </>
          )
        )}

        {/* ── FAVOURITES TAB ── */}
        {tab === 'favorites' && (
          favoriteFoodItems.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(0,0,0,0.25)' }}>
              <Heart size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.85rem' }}>No saved foods yet. Tap the heart icon on any food to save it.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px 6px' }}>
                <Heart size={12} color="var(--accent-red)" />
                <span style={sectionLabelStyle}>Saved Foods</span>
              </div>
              {favoriteFoodItems.map(f => renderFoodRow(f, false))}
            </>
          )
        )}

        {/* ── SEARCH TAB ── */}
        {tab === 'search' && (
          <>
            {/* Create custom food button */}
            <button
              onClick={() => setShowCustomForm(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: 'calc(100% - 24px)', margin: '0 12px 8px',
                padding: '0.75rem 0.875rem',
                backgroundColor: 'rgba(0,0,0,0.03)',
                border: '1px dashed rgba(0,0,0,0.10)',
                borderRadius: '12px',
                color: 'rgba(0,0,0,0.35)', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 600,
                boxSizing: 'border-box',
              }}
            >
              <PenLine size={14} />
              <span>Create custom food</span>
            </button>

            {/* Skeleton rows while searching */}
            {isApiLoading && query.length >= 2 && deduplicatedApi.length === 0 && localResults.length === 0 && (
              <>
                <SkeletonFoodRow />
                <SkeletonFoodRow />
                <SkeletonFoodRow />
              </>
            )}

            {/* LOCAL section */}
            {localResults.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px 4px' }}>
                  <Database size={11} color="rgba(0,0,0,0.28)" />
                  <span style={sectionLabelStyle}>{query ? 'Local Database' : 'Frequently Logged'}</span>
                </div>
                {localResults.map(f => renderFoodRow(f, false))}
              </>
            )}

            {/* ONLINE DATABASE section */}
            {query.length >= 2 && (
              <div style={{ marginTop: localResults.length > 0 ? '12px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px 4px' }}>
                  <Globe size={11} color={apiError ? 'var(--accent-orange)' : 'var(--accent-blue)'} />
                  <span style={{ ...sectionLabelStyle, color: apiError ? 'var(--accent-orange)' : 'rgba(0,0,0,0.28)' }}>
                    {apiError ? 'Online Unavailable' : 'Online Database'}
                  </span>
                  {isApiLoading && (
                    <Loader2 size={11} style={{ color: 'var(--accent-blue)', animation: 'fsSpin 1s linear infinite', marginLeft: '4px' }} />
                  )}
                </div>

                {/* Skeleton while loading online */}
                {isApiLoading && deduplicatedApi.length === 0 && (
                  <>
                    <SkeletonFoodRow />
                    <SkeletonFoodRow />
                    <SkeletonFoodRow />
                  </>
                )}

                {!isApiLoading && !apiError && deduplicatedApi.length === 0 && localResults.length === 0 && query.length >= 2 && (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(0,0,0,0.28)' }}>
                    <Search size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                    <p style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>No results for "{query}"</p>
                    <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>Try a shorter search or scan the barcode</p>
                  </div>
                )}

                {!isApiLoading && !apiError && deduplicatedApi.length === 0 && localResults.length > 0 && query.length >= 2 && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'rgba(0,0,0,0.25)', fontSize: '0.8rem' }}>
                    No additional online results
                  </div>
                )}

                {deduplicatedApi.map(f => renderFoodRow(f, true))}
              </div>
            )}

            {/* Empty state */}
            {query.length >= 2 && !isApiLoading && localResults.length === 0 && deduplicatedApi.length === 0 && !apiError && (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(0,0,0,0.28)' }}>
                <Search size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '4px' }}>No results for "{query}"</p>
                <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>Try a shorter search or scan the barcode</p>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes fsSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fsSkPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
};
