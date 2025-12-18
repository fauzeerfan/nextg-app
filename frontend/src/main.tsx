// Path: src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Pastikan ini mengarah ke App.tsx
import './index.css'    // Wajib ada agar Tailwind (index.css) termuat

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)