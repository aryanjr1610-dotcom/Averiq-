import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/app/App';

import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';

import '@/styles/globals.css';
import 'katex/dist/katex.min.css';

/** Runs before paint — set data-theme + visual mode from storage, no FOUC. */
(function bootTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const stored = localStorage.getItem("averiq:theme");
  const theme = stored ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-visual-mode", localStorage.getItem("averiq:visual") ?? "full");
})();

const root = document.getElementById('root');

if (!root) {
  throw new Error(
    'The application root element is missing.',
  );
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Offline shell + asset caching. Downloaded academic content lives in IndexedDB.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
