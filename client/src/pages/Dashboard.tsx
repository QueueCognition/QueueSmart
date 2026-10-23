import { useNotifications } from "../context/NotificationContext";
import { useQueueStatus } from "../hooks/useQueueStatus";
import { useEffect, useState } from "react";
import { getAppointments } from "../services/appointmentService";
import { mockServices, type MockAppointment } from "../services/mockData";
import "../styles/dashboard.css";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getQueueHistory, getServices} from "../services/queueService"; 
import type { QueueEntry, Service } from "../types/queue";

function Dashboard() {
  const { user } = useAuth();
  const { notifications, markRead } = useNotifications();
  const { entry, error: queueError, loading: queueLoading } = useQueueStatus();

  const [appointments, setAppointments] = useState<MockAppointment[]>([]);
  const [queueHistory, setQueueHistory] = useState<QueueEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    if (!user) return;

    getAppointments(user.id).then(setAppointments);
  }, [user]);


  useEffect(() => {
    if (!user) return;

    let active = true;

    async function loadQueueHistory() {
      try {
        const history = await getQueueHistory();

        if (active) {
          setQueueHistory(history);
          setHistoryError("");
        }
      } catch (cause) {
        if (active) {
          setHistoryError(
            cause instanceof Error
              ? cause.message
              : "Failed to load queue history.",
          );
        }
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    }

    void loadQueueHistory();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let active = true;

    getServices()
      .then((loadedServices) => {
        if (active) {
          setServices(loadedServices);
        }
      })
      .catch((error) => {
        console.error("Failed to load services:", error);
      });

    return () => {
      active = false;
    };
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
          ) : queueError ? (
            <p role="alert">{queueError}</p>
          ) : queueLoading ? (
            <p>Loading your queue status...</p>
          ) : (
            <p>You are not currently in a queue.</p>
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
          <h2>Queue History</h2>

          {historyLoading ? (
            <p>Loading queue history...</p>
          ) : historyError ? (
            <p role="alert">{historyError}</p>
          ) : queueHistory.length === 0 ? (
            <p>No queue history yet.</p>
          ) : (
            <ul className="dashboard-services">
              {queueHistory.map((item) => {
                const service = services.find(
                  (service) => service.id === item.serviceId,
                );

                return (
                  <li key={item.id}>
                    <strong>{service?.name ?? `Service ${item.serviceId}`}</strong>
                    <br />
                    {item.date ?? "Date unavailable"}
                    {item.timeSlot ? ` at ${item.timeSlot}` : ""}
                    <br />
                    Status:{" "}
                    <span>
                      {item.status === "served"
                        ? "Completed"
                        : item.status === "cancelled"
                          ? "Cancelled"
                          : "Joined"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
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
