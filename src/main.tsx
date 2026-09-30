import React from 'react'
import ReactDOM from 'react-dom/client'
// Toggle between versions:
// import App from './App'           // v1.0 (legacy with custom components)
import App from './App-canonical'  // v2.0 (canonical with design system)
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
