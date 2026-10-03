import { useNotifications } from "../context/NotificationContext";
import { useQueueStatus } from "../hooks/useQueueStatus";
import { useEffect, useState } from "react";
import { getAppointments } from "../services/appointmentService";
import { mockServices, type MockAppointment } from "../services/mockData";
import "../styles/dashboard.css";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const { user } = useAuth();
  const { notifications, markRead } = useNotifications();
  const entry = useQueueStatus("q1");

  const [appointments, setAppointments] = useState<MockAppointment[]>([]);

  useEffect(() => {
    if (!user) return;

    getAppointments(user.id).then(setAppointments);
  }, [user]);

  const todayString = new Date().toISOString().split("T")[0];

  const upcomingAppointments = appointments
    .filter(
      (appointment) =>
        appointment.date >= todayString &&
        appointment.status === "upcoming",
    )
    .sort((a, b) => {
      return `${a.date} ${a.time}`.localeCompare(
        `${b.date} ${b.time}`,
      );
    });

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>Welcome back, {user?.firstName}!</h1>
        <p>Here's an overview of your QueueSmart activity.</p>
      </header>

      <div className="dashboard-grid">
        <section className="dashboard-card">
          <h2>Current Queue</h2>

          <p className="dashboard-queue-label">Your position in the queue</p>
          {entry ? (
            <>
              <p className="dashboard-queue-number">
                #{entry.position}
              </p>

              <p className="dashboard-wait">
                Estimated wait:{" "}
                <strong>{entry.estimatedWaitMinutes} minutes</strong>
              </p>
            </>
          ) : (
            <p>Loading your queue status...</p>
          )}

          <Link to="/schedule/queue-status" className="dashboard-link">
            View queue status →
          </Link>
        </section>

        <section className="dashboard-card">
          <h2>Upcoming Appointments</h2>
          <ul className="dashboard-services">
            {upcomingAppointments.length === 0 ? (
              <li>No upcoming appointments.</li>
            ) : (
              upcomingAppointments.map((appointment) => {
                const service = mockServices.find(
                  (service) => service.id === appointment.serviceId,
                );

                return (
                  <li key={appointment.id}>
                    <strong>{service?.name}</strong>
                    <br />
                    {appointment.date} at {appointment.time}
                  </li>
                );
              })
            )}
          </ul>

          <Link to="/schedule/join-queue" className="dashboard-button">
            Make an Appointment
          </Link>

          <Link to="/calendar" className="dashboard-link">
            View calendar →
          </Link>
        </section>
        
        <section className="dashboard-card">
          <h2>Past Appointments</h2>

          <ul className="dashboard-services">
            {appointments
              .filter((appointment) => appointment.status === "completed")
              .sort((a, b) =>
                `${b.date} ${b.time}`.localeCompare(
                  `${a.date} ${a.time}`,
                ),
              )
              .map((appointment) => {
                const service = mockServices.find(
                  (service) => service.id === appointment.serviceId,
                );

                return (
                  <li key={appointment.id}>
                    <strong>{service?.name}</strong>
                    <br />
                    {appointment.date} at {appointment.time}
                  </li>
                );
              })}
          </ul>

          {appointments.filter(
            (appointment) => appointment.status === "completed",
          ).length === 0 && <p>No past appointments.</p>}
        </section>

        <section className="dashboard-card dashboard-card--full">
          <h2>Notifications</h2>

          <div className="dashboard-notifications">
            {notifications.filter((notification) => !notification.read).length === 0 ? (
              <p className="notifications-empty">
                You're all caught up!
              </p>
            ) : (
              notifications
                .filter((notification) => !notification.read)
                .map((notification) => (
                  <div key={notification.id} className="notification-item">
                    <span className="notification-text">
                      {notification.message}
                    </span>

                    <button
                      type="button"
                      className="cross-btn"
                      onClick={() => markRead(notification.id)}
                      aria-label="Dismiss notification"
                      title="Dismiss"
                    >
                      &times;
                    </button>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
