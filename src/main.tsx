import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { AppProviders } from './app/core/providers/AppProviders';
import { startInstallPromptCapture } from './app/core/pwa/install-store';
import './app/styles/index.css';

startInstallPromptCapture();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
