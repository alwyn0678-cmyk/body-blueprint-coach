import React, { Component, ErrorInfo, ReactNode, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Header, TopBar } from './components/Header';

// ─── Error Boundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[BBC] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: '2rem', textAlign: 'center', background: '#F5F0E8',
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1A1A1A' }}>Something went wrong</div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(26,26,26,0.55)', maxWidth: 280, lineHeight: 1.6 }}>
            {err.message || 'An unexpected error occurred.'}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '0.75rem 1.75rem',
              background: '#576038', border: 'none', borderRadius: 99,
              color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
            }}
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Lazy page imports (code-split per route) ─────────────────────────────────

const Dashboard    = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const LogFood      = lazy(() => import('./pages/LogFood').then(m => ({ default: m.LogFood })));
const Progress     = lazy(() => import('./pages/Progress').then(m => ({ default: m.Progress })));
const Onboarding   = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const Settings     = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Training     = lazy(() => import('./pages/Training').then(m => ({ default: m.Training })));
const Health       = lazy(() => import('./pages/Health').then(m => ({ default: m.Health })));
const Coach        = lazy(() => import('./pages/Coach').then(m => ({ default: m.Coach })));
const Habits       = lazy(() => import('./pages/Habits').then(m => ({ default: m.Habits })));
const ProgramBuilder = lazy(() => import('./pages/ProgramBuilder').then(m => ({ default: m.ProgramBuilder })));
const AIProgram     = lazy(() => import('./pages/AIProgram').then(m => ({ default: m.AIProgram })));
const MealPlan     = lazy(() => import('./pages/MealPlan').then(m => ({ default: m.MealPlan })));

// ─── Page loading fallback — matches bg colour so no flash ───────────────────

const PageLoader: React.FC = () => (
  <div style={{
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
    minHeight: 'calc(100dvh - 128px)',
  }} />
);

// ─── Routes ───────────────────────────────────────────────────────────────────

const AppRoutes: React.FC = () => {
  const { state } = useApp();

  if (!state.user?.onboarded) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <TopBar />
      <main style={{ flex: 1, backgroundColor: 'var(--bg-primary)', paddingTop: 64 }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/log"        element={<LogFood />} />
            <Route path="/progress"   element={<Progress />} />
            <Route path="/training"   element={<Training />} />
            <Route path="/health"     element={<Health />} />
            <Route path="/settings"   element={<Settings />} />
            <Route path="/coach"      element={<Coach />} />
            <Route path="/habits"     element={<Habits />} />
            <Route path="/programs"   element={<ProgramBuilder />} />
            <Route path="/ai-program" element={<AIProgram />} />
            <Route path="/meal-plan"  element={<MealPlan />} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Header />
    </div>
  );
};

export const App = () => (
  <ErrorBoundary>
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  </ErrorBoundary>
);

export default App;
