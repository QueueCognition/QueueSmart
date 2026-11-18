import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isStaff } from "../utils/roleUtils";
import NavDropdown from "./NavDropdown";

function Navbar() {
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

        <NavDropdown
          label="Schedule ▾"
          items={[
            { label: "Schedule Appointment", to: "/schedule/join-queue" },
            { label: "Check Queue Status", to: "/schedule/queue-status" },
          ]}
        />

        {isAuthenticated && (
          <>
            {isStaff(user) && (
              <NavDropdown
                label="Management ▾"
                items={[
                  { label: "Admin Dashboard", to: "/admin" },
                  { label: "Service Management", to: "/admin/services" },
                  { label: "Queue Management", to: "/admin/queues" },
                ]}
              />
            )}

            <NavDropdown
              alignRight
              label={
                user ? `${user.firstName} ${user.lastName} ▾` : "Account ▾"
              }
              items={[
                { label: "My profile", to: "/profile" },
                { label: "Sign out", onSelect: logout },
              ]}
            />
          </>
        )}

        {!isAuthenticated && !isInitializing && (
          <NavLink to="/login" className="navbar-link">
            Sign in
          </NavLink>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
