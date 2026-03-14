import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FoodItem, MealType } from '../types';
import { ArrowLeft, Search, ScanLine, Plus, CheckCircle2, Loader2, Globe, Database, Heart, Clock, X, Camera, PenLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useApp } from '../context/AppContext';
import { FoodRow, EmptyState } from '../components/SharedUI';
import { searchFoods, lookupBarcode as lookupBarcodeService } from '../services/foodService';

interface FoodSearchProps {
  mealType: MealType;
  onAdd: (food: FoodItem, amount: number) => void;
  onCancel: () => void;
}

const DEBOUNCE_MS = 600;
type Tab = 'search' | 'recent' | 'favorites';


export const FoodSearch: React.FC<FoodSearchProps> = ({ mealType, onAdd, onCancel }) => {
  const { state, showToast, toggleFavoriteFood, trackRecentFood, addCustomFood } = useApp();
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [localResults, setLocalResults] = useState<FoodItem[]>([]);
  const [apiResults, setApiResults] = useState<FoodItem[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'found' | 'notfound' | 'error'>('idle');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [measurementValue, setMeasurementValue] = useState('1');
  const [measurementUnit, setMeasurementUnit] = useState('serving');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const SCANNER_ID = 'bbc-qr-scanner';

  // ── Set up measurement defaults on food selection ────────────────────────
  useEffect(() => {
    if (selectedFood) {
      setMeasurementValue(selectedFood.servingSize.toString());
      setMeasurementUnit(selectedFood.servingUnit || 'g');
    }
  }, [selectedFood]);

  // ── Stop scanner on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  // ── Unified search via foodService ─────────────────────────────────────
  useEffect(() => {
    const q = query.trim();
    if (q === '') {
      // Show popular/default foods when no query
      searchFoods('', state.customFoods).then(r => {
        setLocalResults(r.local.slice(0, 12));
        setApiResults([]);
      });
      return;
    }

    // Instant local results
    searchFoods(q, state.customFoods).then(r => {
      setLocalResults(r.local);
    });

    // Debounced API search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setApiResults([]); setIsApiLoading(false); return; }
    setIsApiLoading(true);
    debounceRef.current = setTimeout(async () => {
      const r = await searchFoods(q, state.customFoods);
      setApiResults(r.api);
      setIsApiLoading(false);
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, state.customFoods]);

  // ── Serving amount → multiplier ──────────────────────────────────────────
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

  // ── Scanner using html5-qrcode (works on iOS Safari + all browsers) ──────
  const stopCamera = async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch { /* ignore stop errors */ }
      html5QrRef.current = null;
    }
  };

  const startCamera = async () => {
    setScanStatus('scanning');
    // Wait a tick for the scanner div to mount in the DOM
    await new Promise(r => setTimeout(r, 100));
    try {
      const scanner = new Html5Qrcode(SCANNER_ID);
      html5QrRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 150 }, aspectRatio: 1.6 },
        async (decodedText) => {
          // Barcode detected — stop scanning immediately
          setScanStatus('found');
          await stopCamera();
          await handleBarcodeResult(decodedText);
        },
        () => { /* scan error (no barcode visible) — called continuously, ignore */ }
      );
    } catch (err: any) {
      setScanStatus('error');
      const msg = String(err).includes('Permission') || String(err).includes('permission')
        ? 'Camera access denied — allow camera in browser settings'
        : 'Camera not available on this device';
      showToast(msg, 'error');
    }
  };

  const [scanNotFound, setScanNotFound] = useState(false);

  const handleBarcodeResult = async (barcode: string) => {
    try {
      const result = await lookupBarcodeService(barcode);
      if (result) {
        setIsScanning(false);
        setScanNotFound(false);
        setSelectedFood(result);
        showToast(`Found: ${result.name}`, 'success');
      } else {
        setScanStatus('notfound');
        setScanNotFound(true);
        setIsScanning(false);
        showToast('Product not found — try searching by name', 'info');
      }
    } catch {
      setScanStatus('error');
      setIsScanning(false);
      showToast('Lookup failed — try searching by name', 'error');
    }
  };

  const openScanner = () => {
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
  };

  const [manualBarcode, setManualBarcode] = useState('');

  // ── Custom food creation ─────────────────────────────────────────────────
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
    setCustomName('');
    setCustomBrand('');
    setCustomServingSize('100');
    setCustomServingUnit('g');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFats('');
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

  const handleManualBarcodeSubmit = async () => {
    const code = manualBarcode.trim();
    if (!code) return;
    showToast('Looking up barcode...', 'info');
    setScanStatus('scanning');
    await handleBarcodeResult(code);
    setManualBarcode('');
  };

  // recentFoods and favoriteFoods now store full FoodItem objects
  const recentFoodItems = state.recentFoods;
  const favoriteFoodItems = state.favoriteFoods;

  // ── Deduplicate local+API results ────────────────────────────────────────
  const localIds = new Set(localResults.map(f => f.id));
  const deduplicatedApi = apiResults.filter(f => !localIds.has(f.id));

  const handleQuickAdd = (f: FoodItem, e: React.MouseEvent) => {
    e.stopPropagation();
    trackRecentFood(f);
    onAdd(f, 1); // 1 = 1 serving multiplier
    showToast(`${f.name} added to ${mealType}`, 'success');
  };

  const renderFoodRow = (f: FoodItem, isApi = false) => {
    const isFav = state.favoriteFoods.some(fav => fav.id === f.id);
    return (
      <div
        key={f.id}
        onClick={() => setSelectedFood(f)}
        className="flex-row justify-between"
        style={{ padding: '0.85rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', alignItems: 'center' }}
      >
        <div className="flex-col gap-1" style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="text-body font-bold" style={{ color: '#fff', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {f.name}
            </span>
            {f.source === 'custom' && (
              <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.12)', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>CUSTOM</span>
            )}
          </div>
          <span className="text-caption" style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.68rem' }}>
            {f.brand ? `${f.brand} · ` : ''}{f.servingSize}{f.servingUnit}
            {isApi && <span style={{ color: 'rgba(10,132,255,0.7)', marginLeft: '4px' }}>· online</span>}
          </span>
        </div>
        <div className="flex-row gap-2 align-center" style={{ flexShrink: 0 }}>
          <div className="flex-col align-end" style={{ marginRight: '4px' }}>
            <span style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1, fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{Math.round(f.calories)}</span>
            <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.28)', fontWeight: 700 }}>KCAL</span>
          </div>
          {f.protein > 0 && (
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-protein)', backgroundColor: 'rgba(255,159,10,0.1)', padding: '2px 6px', borderRadius: '6px' }}>{Math.round(f.protein)}P</span>
          )}
          <button
            onClick={e => { e.stopPropagation(); toggleFavoriteFood(f); }}
            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex' }}
          >
            <Heart size={14} color={isFav ? 'var(--accent-red)' : 'rgba(255,255,255,0.2)'} fill={isFav ? 'var(--accent-red)' : 'none'} />
          </button>
          <button
            onClick={e => handleQuickAdd(f, e)}
            style={{ background: 'var(--accent-blue)', border: 'none', color: '#fff', padding: '0.4rem 0.5rem', borderRadius: '9px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            title="Quick add 1 serving"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
    );
  };

  // ── Custom Food Creation Overlay ─────────────────────────────────────────
  if (showCustomForm) {
    const inputStyle: React.CSSProperties = {
      width: '100%',
      padding: '0.85rem 1rem',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.12)',
      backgroundColor: 'rgba(255,255,255,0.05)',
      color: '#fff',
      fontSize: '0.95rem',
      fontWeight: 500,
      outline: 'none',
      boxSizing: 'border-box',
    };
    const labelStyle: React.CSSProperties = {
      fontSize: '0.65rem',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      color: 'rgba(255,255,255,0.35)',
      marginBottom: '4px',
    };
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9005, backgroundColor: '#000', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', paddingTop: 'calc(1rem + env(safe-area-inset-top))', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Create Food</span>
          <button
            onClick={() => { setShowCustomForm(false); resetCustomForm(); }}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
          {/* Name */}
          <div>
            <div style={labelStyle}>Name <span style={{ color: 'var(--accent-red)' }}>*</span></div>
            <input type="text" placeholder="e.g. Homemade granola" value={customName} onChange={e => setCustomName(e.target.value)} style={inputStyle} />
          </div>

          {/* Brand */}
          <div>
            <div style={labelStyle}>Brand <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></div>
            <input type="text" placeholder="e.g. Homemade" value={customBrand} onChange={e => setCustomBrand(e.target.value)} style={inputStyle} />
          </div>

          {/* Serving size + unit */}
          <div>
            <div style={labelStyle}>Serving size</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="number" placeholder="100" value={customServingSize} onChange={e => setCustomServingSize(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <input type="text" placeholder="g" value={customServingUnit} onChange={e => setCustomServingUnit(e.target.value)} style={{ ...inputStyle, width: '80px', flex: 'none' }} />
            </div>
          </div>

          {/* Calories */}
          <div>
            <div style={labelStyle}>Calories (kcal)</div>
            <input type="number" placeholder="0" value={customCalories} onChange={e => setCustomCalories(e.target.value)} style={inputStyle} />
          </div>

          {/* Macros row */}
          <div>
            <div style={labelStyle}>Macros (g per serving)</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ ...labelStyle, color: 'var(--color-protein)', marginBottom: '4px' }}>Protein</div>
                <input type="number" placeholder="0" value={customProtein} onChange={e => setCustomProtein(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...labelStyle, color: 'var(--color-carbs)', marginBottom: '4px' }}>Carbs</div>
                <input type="number" placeholder="0" value={customCarbs} onChange={e => setCustomCarbs(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...labelStyle, color: 'var(--color-fats)', marginBottom: '4px' }}>Fats</div>
                <input type="number" placeholder="0" value={customFats} onChange={e => setCustomFats(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1rem 1.25rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))', backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.07)', zIndex: 9006 }}>
          <button
            onClick={handleSaveCustomFood}
            style={{ width: '100%', padding: '1.1rem', borderRadius: '16px', backgroundColor: '#fff', color: '#000', fontWeight: 800, fontSize: '1rem', border: 'none', cursor: 'pointer' }}
          >
            Save Food
          </button>
        </div>
      </div>
    );
  }

  // ── Food Detail / Amount Selection Screen ────────────────────────────────
  if (selectedFood) {
    const mult = getMultiplier();
    const isFav = state.favoriteFoods.some(f => f.id === selectedFood.id);
    return (
      <div className="flex-col gap-4 p-4 animate-slide-up" style={{ backgroundColor: '#000', minHeight: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9002, paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        <div className="flex-row justify-between align-center">
          <button onClick={() => setSelectedFood(null)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', padding: 0, fontWeight: 600, fontSize: '0.9rem' }}>
            <ArrowLeft size={20} /> Back
          </button>
          <button
            onClick={() => toggleFavoriteFood(selectedFood)}
            style={{ background: 'none', border: 'none', display: 'flex', padding: 0, cursor: 'pointer' }}
          >
            <Heart size={22} color={isFav ? 'var(--accent-red)' : 'rgba(255,255,255,0.3)'} fill={isFav ? 'var(--accent-red)' : 'none'} />
          </button>
        </div>

        <div className="mt-3">
          <h2 className="text-h1" style={{ color: '#fff', lineHeight: 1.1, fontSize: '2rem', fontWeight: 800 }}>{selectedFood.name}</h2>
          <p className="text-subtitle mt-1" style={{ color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, fontSize: '0.8rem' }}>
            {selectedFood.brand || 'Generic'}{selectedFood.source === 'openfoodfacts' ? ' · Open Food Facts' : ''}
          </p>
        </div>

        {/* Macro breakdown */}
        <div className="flex-col gap-3 mt-2 p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex-row justify-between align-end" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '1rem' }}>
            <span style={{ fontSize: '3.5rem', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', lineHeight: 0.9 }}>
              {Math.round(selectedFood.calories * mult)}
            </span>
            <span className="text-caption font-semibold uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Calories</span>
          </div>
          <div className="flex-row justify-between mt-1">
            {[
              { label: 'Protein', value: selectedFood.protein * mult, color: 'var(--color-protein)' },
              { label: 'Carbs', value: selectedFood.carbs * mult, color: 'var(--color-carbs)' },
              { label: 'Fats', value: selectedFood.fats * mult, color: 'var(--color-fats)' },
            ].map(m => (
              <div key={m.label} className="flex-col">
                <span className="text-h2" style={{ color: m.color, fontVariantNumeric: 'tabular-nums', fontSize: '1.5rem' }}>{Math.round(m.value)}g</span>
                <span className="text-caption" style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: '2px' }}>{m.label}</span>
              </div>
            ))}
          </div>
          {(selectedFood.fiber !== undefined || selectedFood.sodium !== undefined) && (
            <div className="flex-row gap-4 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {selectedFood.fiber !== undefined && (
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                  Fiber: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{Math.round(selectedFood.fiber * mult)}g</strong>
                </span>
              )}
              {selectedFood.sodium !== undefined && (
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                  Sodium: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{Math.round(selectedFood.sodium * mult)}mg</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Serving size input */}
        <div className="flex-col gap-2 mt-2">
          <label className="text-caption font-semibold uppercase" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>
            Serving Amount
          </label>
          <div className="flex-row gap-3">
            <input
              type="number"
              value={measurementValue}
              onChange={e => setMeasurementValue(e.target.value)}
              style={{ flex: 1, padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', fontSize: '1.4rem', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontVariantNumeric: 'tabular-nums', outline: 'none' }}
            />
            <select
              value={measurementUnit}
              onChange={e => setMeasurementUnit(e.target.value)}
              style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.95rem', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}
            >
              <option value="g">Grams (g)</option>
              <option value="oz">Ounces (oz)</option>
              <option value="lbs">Pounds (lbs)</option>
              <option value="ml">Milliliters (ml)</option>
              <option value="serving">Serving</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => { trackRecentFood(selectedFood); onAdd(selectedFood, mult); showToast(`${selectedFood.name} added`, 'success'); }}
          className="flex-row justify-center align-center gap-2"
          style={{ marginTop: 'auto', padding: '1.3rem', width: '100%', fontSize: '1.1rem', fontWeight: 800, borderRadius: '20px', backgroundColor: '#fff', color: '#000', boxShadow: '0 8px 24px rgba(255,255,255,0.15)', border: 'none' }}
        >
          <CheckCircle2 size={22} /> Log to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
        </button>
      </div>
    );
  }

  // ── Barcode Scanner Overlay ──────────────────────────────────────────────
  if (isScanning) {
    return (
      <div className="animate-fade-in" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 150, backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-row justify-between p-4 mt-4 align-center" style={{ zIndex: 160, position: 'relative' }}>
          <div>
            <span style={{ fontSize: '0.6rem', color: 'var(--accent-blue)', letterSpacing: '2px', fontWeight: 700 }}>BARCODE SCANNER</span>
            <h2 className="text-h2" style={{ marginTop: '-2px' }}>Scan Product</h2>
          </div>
          <button onClick={closeScanner} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <X size={16} />
          </button>
        </div>

        {/* html5-qrcode renders into this div — do not remove or hide it */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#111' }}>
          <div
            id={SCANNER_ID}
            style={{ width: '100%', height: '100%' }}
          />
          {/* Status badge overlay */}
          <div style={{ position: 'absolute', bottom: '1.5rem', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', zIndex: 10 }}>
            {scanStatus === 'found' && (
              <span style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 800, backgroundColor: 'rgba(0,0,0,0.8)', padding: '0.5rem 1.2rem', borderRadius: '20px' }}>
                ✓ Barcode found!
              </span>
            )}
            {scanStatus === 'error' && (
              <span style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.8)', padding: '0.5rem 1.2rem', borderRadius: '20px' }}>
                Camera not available
              </span>
            )}
            {(scanStatus === 'scanning' || scanStatus === 'idle') && (
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, backgroundColor: 'rgba(0,0,0,0.65)', padding: '0.4rem 1rem', borderRadius: '20px' }}>
                Point camera at barcode
              </span>
            )}
          </div>
        </div>

        {/* Manual fallback */}
        <div style={{ padding: '1rem 1.25rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>Or enter barcode manually</p>
          <div className="flex-row gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 5000112637939"
              value={manualBarcode}
              onChange={e => setManualBarcode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualBarcodeSubmit()}
              style={{ flex: 1, padding: '0.75rem 1rem', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: '#fff', fontSize: '0.95rem', fontWeight: 600, outline: 'none' }}
            />
            <button
              onClick={handleManualBarcodeSubmit}
              disabled={!manualBarcode.trim()}
              style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--accent-blue)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', opacity: manualBarcode.trim() ? 1 : 0.4, cursor: 'pointer' }}
            >
              Look up
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Search Screen ───────────────────────────────────────────────────
  return (
    <div className="flex-col p-4 animate-slide-up" style={{ backgroundColor: '#000', minHeight: '100vh', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9002, paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>

      {/* Header */}
      <div className="flex-row gap-3 mb-4 mt-1 align-center">
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', padding: 0, display: 'flex' }}>
          <ArrowLeft size={26} />
        </button>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
          <input
            type="text"
            placeholder={`Search foods for ${mealType}...`}
            value={query}
            onChange={e => { setQuery(e.target.value); if (tab !== 'search') setTab('search'); }}
            style={{ width: '100%', padding: '0.95rem 0.95rem 0.95rem 2.8rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '1rem', fontWeight: 500, outline: 'none' }}
            autoFocus
          />
          {isApiLoading && (
            <Loader2 size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} />
          )}
        </div>
        <button
          onClick={openScanner}
          style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.85rem', display: 'flex' }}
        >
          <Camera size={22} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex-row gap-1 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '3px' }}>
        {([
          { id: 'search' as Tab, icon: <Search size={13} />, label: 'Search' },
          { id: 'recent' as Tab, icon: <Clock size={13} />, label: `Recent${recentFoodItems.length > 0 ? ` (${recentFoodItems.length})` : ''}` },
          { id: 'favorites' as Tab, icon: <Heart size={13} />, label: `Saved${favoriteFoodItems.length > 0 ? ` (${favoriteFoodItems.length})` : ''}` },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-row align-center justify-center gap-1"
            style={{ flex: 1, padding: '0.5rem 0.25rem', borderRadius: '9px', backgroundColor: tab === t.id ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.15s' }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-col" style={{ flex: 1, overflowY: 'auto' }}>

        {tab === 'recent' && (
          recentFoodItems.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
              <Clock size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p>No recent foods yet. Log some food to see them here.</p>
            </div>
          ) : (
            <>
              <div className="flex-row align-center gap-2 mb-2 px-1">
                <Clock size={12} color="rgba(255,255,255,0.3)" />
                <span className="text-caption font-semibold" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>
                  Recently Logged
                </span>
              </div>
              {recentFoodItems.map(f => renderFoodRow(f, false))}
            </>
          )
        )}

        {tab === 'favorites' && (
          favoriteFoodItems.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
              <Heart size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p>No saved foods yet. Tap the heart icon on any food to save it.</p>
            </div>
          ) : (
            <>
              <div className="flex-row align-center gap-2 mb-2 px-1">
                <Heart size={12} color="var(--accent-red)" />
                <span className="text-caption font-semibold" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>
                  Saved Foods
                </span>
              </div>
              {favoriteFoodItems.map(f => renderFoodRow(f, false))}
            </>
          )
        )}

        {tab === 'search' && (
          <>
            {/* Create Custom Food button */}
            <button
              onClick={() => setShowCustomForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '0.75rem 0.875rem', marginBottom: '0.75rem', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: '12px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <PenLine size={14} />
              <span>Create custom food</span>
            </button>

            {/* Local Database Results */}
            {localResults.length > 0 && (
              <>
                <div className="flex-row align-center gap-2 mb-2 px-1">
                  <Database size={12} color="rgba(255,255,255,0.3)" />
                  <span className="text-caption font-semibold" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>
                    {query ? 'Local Database' : 'Frequently Logged'}
                  </span>
                </div>
                {localResults.map(f => renderFoodRow(f, false))}
              </>
            )}

            {/* Online Results (OpenFoodFacts) */}
            {query.length >= 2 && (
              <div style={{ marginTop: localResults.length > 0 ? '1.5rem' : 0 }}>
                <div className="flex-row align-center gap-2 mb-2 px-1">
                  <Globe size={12} color="var(--accent-blue)" />
                  <span className="text-caption font-semibold" style={{ color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>
                    Online Database
                  </span>
                  {isApiLoading && (
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>searching...</span>
                  )}
                </div>

                {isApiLoading && deduplicatedApi.length === 0 && (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                    <div>Searching Open Food Facts...</div>
                  </div>
                )}

                {!isApiLoading && deduplicatedApi.length === 0 && query.length >= 2 && (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                    No online results found
                  </div>
                )}

                {deduplicatedApi.map(f => renderFoodRow(f, true))}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
