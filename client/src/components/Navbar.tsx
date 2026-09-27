import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

function Navbar() {
  const [scheduleOpen, setScheduleOpen] = useState(false)

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
      </div>
    </nav>
  )
}

export default Navbar