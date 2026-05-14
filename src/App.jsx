import { Routes, Route, NavLink } from 'react-router-dom'
import { useEffect } from 'react'
import RegisterPage from './pages/RegisterPage'
import SqlPage from './pages/SqlPage'
import LogsPage from './pages/LogsPage'

export default function App() {
  useEffect(() => {
    // Red herring: fires a request to a non-existent endpoint on every page load
    fetch('/api/analytics').catch(() => {})
  }, [])

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-logo">V</div>
          <span className="brand-name">Velora</span>
        </div>
        <div className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Register
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Logs
          </NavLink>
          <NavLink to="/sql" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            SQL Console
          </NavLink>
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<RegisterPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/sql" element={<SqlPage />} />
        </Routes>
      </main>
    </div>
  )
}
