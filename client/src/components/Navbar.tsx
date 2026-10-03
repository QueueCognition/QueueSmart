import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isStaff } from "../utils/roleUtils";

function Navbar() {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const { user, isAuthenticated, isInitializing, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        QueueSmart
      </Link>

      <div className="navbar-links">
        {isAuthenticated && (
          <NavLink to="/dashboard" className="navbar-link">
            Dashboard
          </NavLink>
        )}

        {isAuthenticated && (
          <NavLink to="/calendar" className="navbar-link">
            Calendar
          </NavLink>
        )}

        <div
          className="navbar-dropdown"
          onMouseEnter={() => setScheduleOpen(true)}
          onMouseLeave={() => setScheduleOpen(false)}
        >
          <button
            type="button"
            className="navbar-link navbar-dropdown-trigger"
            onClick={() => setScheduleOpen((prev) => !prev)}
          >
            Schedule ▾
          </button>

          {scheduleOpen && (
            <div className="navbar-dropdown-menu">
              <Link
                to="/schedule/join-queue"
                className="navbar-dropdown-item"
              >
                Schedule Appointment
              </Link>

              <Link
                to="/schedule/queue-status"
                className="navbar-dropdown-item"
              >
                Check Queue Status
              </Link>
            </div>
          )}
        </div>

        {isAuthenticated ? (
          isStaff(user) ? (
            <div
              className="navbar-dropdown"
              onMouseEnter={() => setManagementOpen(true)}
              onMouseLeave={() => setManagementOpen(false)}
            >
              <button
                type="button"
                className="navbar-link navbar-dropdown-trigger"
                onClick={() => setManagementOpen((prev) => !prev)}
              >
                Management ▾
              </button>

              {managementOpen && (
                <div className="navbar-dropdown-menu">
                  <Link
                    to="/admin"
                    className="navbar-dropdown-item"
                    onClick={() => setManagementOpen(false)}
                  >
                    Admin Dashboard
                  </Link>

                  <Link
                    to="/admin/services"
                    className="navbar-dropdown-item"
                    onClick={() => setManagementOpen(false)}
                  >
                    Service Management
                  </Link>

                  <Link
                    to="/admin/queues"
                    className="navbar-dropdown-item"
                    onClick={() => setManagementOpen(false)}
                  >
                    Queue Management
                  </Link>

                  <button
                    type="button"
                    className="navbar-dropdown-item navbar-dropdown-button"
                    onClick={() => {
                      setManagementOpen(false);
                      logout();
                    }}
                  >
                    Sign out
                    {user ? ` (${user.firstName} ${user.lastName})` : ""}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="navbar-link"
              onClick={logout}
            >
              Sign out{user ? ` (${user.firstName} ${user.lastName})` : ""}
            </button>
          )
        ) : isInitializing ? null : (
          <NavLink to="/login" className="navbar-link">
            Sign in
          </NavLink>
        )}
      </div>
    </nav>
  );
}

export default Navbar;