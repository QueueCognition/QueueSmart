import { useNotifications } from "../context/NotificationContext";
import { useQueueStatus } from "../hooks/useQueueStatus";
import { useQuery } from "@tanstack/react-query";
import { useServices } from "../hooks/useServices";
import "../styles/dashboard.css";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { queryKeys } from "../lib/queryClient";
import { describeApiError } from "../services/apiClient";
import { getMyQueue, getQueueHistory } from "../services/queueService";
import { toDateKey } from "../utils/dateUtils";

function Dashboard() {
  const { user } = useAuth();
  const { notifications, markRead } = useNotifications();
  const { entry, error: queueError, loading: queueLoading } = useQueueStatus();
  const servicesQuery = useServices();
  const services = servicesQuery.data ?? [];

  const myQueueQuery = useQuery({
    queryKey: queryKeys.myQueue,
    queryFn: getMyQueue,
    enabled: Boolean(user),
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.queueHistory,
    queryFn: getQueueHistory,
    enabled: Boolean(user),
  });

  const myQueue = myQueueQuery.data ?? [];
  const queueHistory = historyQuery.data ?? [];
  const historyLoading = myQueueQuery.isPending || historyQuery.isPending;
  const historyError = myQueueQuery.isError
    ? describeApiError(myQueueQuery.error, "Failed to load queue history.")
    : historyQuery.isError
      ? describeApiError(historyQuery.error, "Failed to load queue history.")
      : "";

  const todayString = toDateKey(new Date());

  const upcomingAppointments = myQueue
    .filter(
      (entry) =>
        entry.date &&
        entry.date >= todayString &&
        (entry.status === "waiting" || entry.status === "almost_ready"),
    )
    .sort((a, b) => {
      return `${a.date} ${a.timeSlot ?? ""}`.localeCompare(
        `${b.date} ${b.timeSlot ?? ""}`,
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
              <p className="dashboard-queue-number">#{entry.position}</p>

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
            {historyLoading ? (
              <li>Loading upcoming appointments...</li>
            ) : historyError ? (
              <li role="alert">{historyError}</li>
            ) : upcomingAppointments.length === 0 ? (
              <li>No upcoming appointments.</li>
            ) : (
              upcomingAppointments.map((appointment) => {
                const service = services.find(
                  (service) => service.id === appointment.serviceId,
                );

                return (
                  <li key={appointment.id}>
                    <strong>
                      {service?.name ?? `Service ${appointment.serviceId}`}
                    </strong>
                    <br />
                    {appointment.date} at {appointment.timeSlot}
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
                    <strong>
                      {service?.name ?? `Service ${item.serviceId}`}
                    </strong>
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
            {notifications.filter((notification) => !notification.read)
              .length === 0 ? (
              <p className="notifications-empty">You're all caught up!</p>
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
