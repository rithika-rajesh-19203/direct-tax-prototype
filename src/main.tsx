import React from 'react'
import ReactDOM from 'react-dom/client'
// Renders the selected prototype version; versions are listed in src/versions/registry.ts.
import VersionRoot from './VersionRoot'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <VersionRoot />
  </React.StrictMode>,
)
