import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Navbar() {
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const { user, isAuthenticated, isInitializing, logout } = useAuth()

  const authControl = isAuthenticated ? (
    <button type="button" className="navbar-link" onClick={logout}>
      Sign out{user ? ` (${user.firstName} ${user.lastName})` : ''}
    </button>
  ) : (
    <NavLink to="/login" className="navbar-link">
      Sign in
    </NavLink>
  )

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">QueueSmart</Link>

      <div className="navbar-links">
        <NavLink to="/" end className="navbar-link">Home</NavLink>

        <div
          className="navbar-dropdown"
          onMouseEnter={() => setScheduleOpen(true)}
          onMouseLeave={() => setScheduleOpen(false)}
        >
          <button className="navbar-link navbar-dropdown-trigger">
            Schedule ▾
          </button>
          {scheduleOpen && (
            <div className="navbar-dropdown-menu">
              <Link to="/schedule/join-queue" className="navbar-dropdown-item">
                Schedule Appointment
              </Link>
              <Link to="/schedule/queue-status" className="navbar-dropdown-item">
                Check Queue Status
              </Link>
            </div>
          )}
        </div>

        {isInitializing ? null : authControl}
      </div>
    </nav>
  )
}

export default Navbar