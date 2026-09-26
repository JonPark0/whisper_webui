import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { applyTheme, readTheme } from './lib/theme'
import './index.css'

// Apply the saved theme before the first render to avoid a light/dark flash.
applyTheme(readTheme())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
