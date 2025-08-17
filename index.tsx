import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Use declare to inform TypeScript about global variables from CDN scripts
declare const pdfjsLib: any;

// Configure PDF.js worker. This is the recommended way to avoid initialization errors.
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
} else {
  // This case should ideally not happen if the script is loaded correctly in index.html
  console.error("pdf.js library (pdfjsLib) is not loaded. PDF functionality will not work.");
}

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