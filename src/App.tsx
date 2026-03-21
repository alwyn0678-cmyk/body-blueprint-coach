import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

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
import { AppProvider, useApp } from './context/AppContext';
import { Header, TopBar } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { LogFood } from './pages/LogFood';
import { Progress } from './pages/Progress';
import { Onboarding } from './pages/Onboarding';
import { Settings } from './pages/Settings';
import { Training } from './pages/Training';
import { Health } from './pages/Health';
import { Coach } from './pages/Coach';
import { Habits } from './pages/Habits';
import { ProgramBuilder } from './pages/ProgramBuilder';

const AppRoutes: React.FC = () => {
  const { state } = useApp();

  if (!state.user?.onboarded) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <TopBar />
      <main style={{ flex: 1, backgroundColor: 'var(--bg-primary)', paddingTop: 64 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<LogFood />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/training" element={<Training />} />
          <Route path="/health" element={<Health />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/programs" element={<ProgramBuilder />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Header />
    </div>
  );
};

export const App = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
