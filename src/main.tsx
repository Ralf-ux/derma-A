import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', padding: 32,
          fontFamily: 'Inter, sans-serif', background: '#f8faf7',
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: 32, maxWidth: 480,
            width: '100%', border: '1px solid rgba(239,68,68,0.15)',
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>
              ERREUR DE RENDU
            </p>
            <p style={{ fontSize: 14, color: '#374151', marginBottom: 16 }}>
              {(this.state.error as Error).message}
            </p>
            <pre style={{
              fontSize: 11, color: '#9ca3af', whiteSpace: 'pre-wrap',
              background: '#f9fafb', padding: 12, borderRadius: 12,
            }}>
              {(this.state.error as Error).stack?.slice(0, 400)}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
