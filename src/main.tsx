import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure iframe safe defaults for alert/confirm
if (typeof window !== 'undefined') {
  window.alert = (msg?: any) => {
    console.warn('[CapitalControl Alert]:', msg);
  };
  window.confirm = (msg?: any) => {
    console.warn('[CapitalControl Confirm]:', msg);
    return true;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
