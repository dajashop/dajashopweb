import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/base.css';
import AppProviders from './AppProviders.jsx';
import { recoverChunkLoad } from './utils/chunkRecovery.js';

window.addEventListener('vite:preloadError', event => {
  if (recoverChunkLoad(event.payload)) event.preventDefault();
});

const root = document.getElementById('root');
const dataElement = document.getElementById('daja-page-data');
const pageData = dataElement ? JSON.parse(dataElement.textContent) : null;
const app = (
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders pageData={pageData}><App /></AppProviders>
    </BrowserRouter>
  </React.StrictMode>,
);
if (pageData && root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
