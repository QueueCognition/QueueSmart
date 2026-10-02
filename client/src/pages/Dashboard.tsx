
import { useState } from 'react';
import '../styles/dashboard.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user } = useAuth();

    const [notifications, setNotifications] = useState([
    { id: 1, text: 'Notification 1' },
    { id: 2, text: 'Notification 2.' },
    { id: 3, text: 'Notification 3.' },
    { id: 4, text: 'Notification 4' },
    { id: 5, text: 'NOtification 5' },
    ]);

    const dismissNotification = (id: number) => {
    setNotifications((previous) =>
        previous.filter((notification) => notification.id !== id)
    );
    };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>Welcome back, {user?.firstName}!</h1>
        <p>Here's an overview of your QueueSmart activity.</p>
      </header>

      <div className="dashboard-grid">
        <section className="dashboard-card">
          <h2>Current Queue</h2>

          <p className="dashboard-queue-label">
            Your position in the queue
          </p>
          <p className="dashboard-queue-number">#3</p>

          <p className="dashboard-wait">
            Estimated wait: <strong>12 minutes</strong>
          </p>

          <Link to="/schedule/queue-status" className="dashboard-link">
            View queue status →
          </Link>
        </section>

        <section className="dashboard-card">
          <h2>Upcoming Appointments</h2>

          <ul className="dashboard-services">
            <li>Appointment 1</li>
            <li>Appointment 2</li>
            <li>Appointment 3</li>
          </ul>

          <Link to="/calendar" className="dashboard-link">
            View calendar →
          </Link>
        </section>

        <section className="dashboard-card dashboard-card--full">
        <h2>Notifications</h2>

        <div className="dashboard-notifications">
            {notifications.map((notification) => (
            <div
                key={notification.id}
                className="notification-item"
            >
                <span className="notification-text">
                {notification.text}
                </span>

                <button
                type="button"
                className="cross-btn"
                onClick={() => dismissNotification(notification.id)}
                aria-label="Dismiss notification"
                title="Dismiss"
                >
                &times;
                </button>
            </div>
            ))}
        </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;