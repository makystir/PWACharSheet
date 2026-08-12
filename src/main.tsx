import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './styles/global.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Remove splash screen after React mounts first meaningful content
const splash = document.getElementById('splash');
if (splash) {
  // Fade out splash
  splash.style.opacity = '0';

  // Remove from DOM after fade transition completes
  const removeSplash = () => {
    splash.remove();
    clearTimeout(fallbackTimeout);
  };
  splash.addEventListener('transitionend', removeSplash, { once: true });

  // Fallback: force-remove after 2 seconds if transition event never fires
  const fallbackTimeout = setTimeout(removeSplash, 2000);
}

// Service worker registration is handled by SWUpdateProvider in useSWUpdate.ts
// (which calls registerServiceWorker from sw-register.ts).
// Do NOT register separately here — a duplicate registration races with the
// SWUpdateProvider and can cause update notifications to be missed.
