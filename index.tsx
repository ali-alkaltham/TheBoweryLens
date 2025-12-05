import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as XLSX from 'xlsx';

// Make XLSX available globally if needed for debugging, though we use import
(window as any).XLSX = XLSX;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
