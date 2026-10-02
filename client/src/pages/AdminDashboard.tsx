import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import {
  getAdminServiceWaitSummaries,
  toggleAdminServiceAvailability,
  updateAdminQueueStatus,
  type AdminQueueEntry,
  type AdminServiceQueueSummary,
} from "../services/adminQueueService";
import type { QueueStatus } from "../types/queue";
import "../styles/admin-dashboard.css";

function AdminDashboard() {
  const { user } = useAuth();
  const { push } = useNotifications();
  const [summaries, setSummaries] = useState<AdminServiceQueueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState("all");

  const refreshDashboard = useCallback(() => {
    void getAdminServiceWaitSummaries()
      .then((data) => {
        setSummaries(data);
        setLastRefreshed(new Date());
      })
      .catch(() => {
        push({
          message: "Failed to load queue summaries.",
          type: "status_change",
        });
      });
  }, [push]);

  useEffect(() => {
    let mounted = true;

    void getAdminServiceWaitSummaries()
      .then((data) => {
        if (!mounted) return;
        setSummaries(data);
        setLastRefreshed(new Date());
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
        push({
          message: "Failed to load queue summaries.",
          type: "status_change",
        });
      });

    const interval = setInterval(() => {
      void getAdminServiceWaitSummaries().then((data) => {
        if (!mounted) return;
        setSummaries(data);
        setLastRefreshed(new Date());
      });
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [push]);

  const handleToggleAvailability = async (
    serviceId: string,
    serviceName: string,
  ) => {
    try {
      const isAvailable = await toggleAdminServiceAvailability(serviceId);
      push({
        message: `${serviceName} status updated to ${isAvailable ? "Available" : "Paused"}.`,
        type: "status_change",
      });
      refreshDashboard();
    } catch {
      push({
        message: `Failed to update status for ${serviceName}.`,
        type: "status_change",
      });
    }
  };

  const handleUpdateStatus = async (
    entry: AdminQueueEntry,
    nextStatus: QueueStatus,
    serviceName: string,
  ) => {
    try {
      await updateAdminQueueStatus(entry.id, nextStatus);
      const label =
        nextStatus === "almost_ready"
          ? "called for service"
          : "marked as served";
      push({
        message: `${entry.customerName || entry.ticketNumber} ${label} for ${serviceName}.`,
        type: "queue_update",
      });
      refreshDashboard();
    } catch {
      push({
        message: "Failed to update queue entry status.",
        type: "status_change",
      });
    }
  };

  const totalServices = summaries.length;
  const availableServices = summaries.filter(
    (item) => (item.service as { isAvailable?: boolean }).isAvailable !== false,
  );
  const totalPeopleWaiting = summaries.reduce(
    (total, item) => total + item.waitingCount,
    0,
  );

  const highestWaitService = useMemo(() => {
    if (summaries.length === 0) return null;
    return [...summaries].sort((a, b) => b.waitingCount - a.waitingCount)[0];
  }, [summaries]);

  const filteredSummaries = useMemo(() => {
    return summaries
      .filter((item) => {
        if (selectedServiceFilter === "all") return true;
        return item.service.id === selectedServiceFilter;
      })
      .map((item) => {
        if (!searchTerm.trim()) return item;
        const normalized = searchTerm.trim().toLowerCase();
        const filteredList = item.waitingList.filter(
          (q) =>
            q.customerName?.toLowerCase().includes(normalized) ||
            q.ticketNumber?.toLowerCase().includes(normalized) ||
            q.customerEmail?.toLowerCase().includes(normalized) ||
            q.timeSlot?.toLowerCase().includes(normalized),
        );
        return {
          ...item,
          waitingList: filteredList,
        };
      });
  }, [summaries, selectedServiceFilter, searchTerm]);

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-title-group">
          <h1>Admin Dashboard</h1>
          <p>Overview of services and customer wait queues.</p>
        </div>

        <div className="admin-header-actions">
          <span className="admin-live-badge">
            <span className="admin-live-dot" />
            Live Sync
          </span>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={refreshDashboard}
            title="Refresh dashboard data"
          >
            Refresh ({lastRefreshed.toLocaleTimeString()})
          </button>
        </div>
      </header>

      {user && (
        <div className="admin-preview-banner">
          <span>
            Signed in as {user.firstName} {user.lastName} &middot; Role:{" "}
            {user.role}
          </span>
          <Link
            to="/dashboard"
            className="admin-btn admin-btn-secondary admin-btn-sm"
          >
            User Dashboard
          </Link>
        </div>
      )}

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-label">Services Available</span>
          <span className="admin-stat-value">
            {availableServices.length} / {totalServices}
          </span>
          <span className="admin-stat-subtext">Active services</span>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-label">People Waiting</span>
          <span className="admin-stat-value">{totalPeopleWaiting}</span>
          <span className="admin-stat-subtext">Across all lines</span>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-label">Longest Queue</span>
          <span className="admin-stat-value">
            {highestWaitService?.waitingCount ?? 0}
          </span>
          <span className="admin-stat-subtext">
            {highestWaitService?.service.name ?? "None"}
          </span>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-label">Status</span>
          <span
            className="admin-stat-value"
            style={{ color: "#059669", fontSize: "1.75rem" }}
          >
            Operational
          </span>
          <span className="admin-stat-subtext">Auto-refresh: 5s</span>
        </div>
      </div>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">
            Services Available
            <span className="admin-badge-count">
              {availableServices.length} Active
            </span>
          </h2>
        </div>

        {loading ? (
          <p>Loading services...</p>
        ) : (
          <div className="admin-services-grid">
            {summaries.map(
              ({ service, waitingCount, estimatedWaitMinutes }) => {
                const isAvailable =
                  (service as { isAvailable?: boolean }).isAvailable !== false;
                return (
                  <div key={service.id} className="admin-service-card">
                    <div className="admin-service-card-top">
                      <h3 className="admin-service-name">{service.name}</h3>
                      <span
                        className={`admin-pill ${
                          isAvailable
                            ? "admin-pill-available"
                            : "admin-pill-paused"
                        }`}
                      >
                        {isAvailable ? "Available" : "Paused"}
                      </span>
                    </div>

                    <p className="admin-service-desc">{service.description}</p>

                    <div className="admin-service-meta">
                      <span className="admin-pill admin-pill-duration">
                        ~{service.expectedDuration} mins
                      </span>
                      <span
                        className={`admin-pill admin-pill-priority-${service.priority}`}
                      >
                        {service.priority} priority
                      </span>
                    </div>

                    <div className="admin-service-queue-summary">
                      <div className="admin-service-wait-count">
                        <span className="admin-wait-number">
                          {waitingCount}
                        </span>
                        <span className="admin-wait-label">waiting</span>
                      </div>

                      <div className="admin-service-est-time">
                        <span>Est. Wait</span>
                        <br />
                        <strong>{estimatedWaitMinutes} min</strong>
                      </div>

                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={() =>
                          handleToggleAvailability(service.id, service.name)
                        }
                      >
                        {isAvailable ? "Pause" : "Activate"}
                      </button>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">
            People Waiting by Service
            <span className="admin-badge-count">
              {totalPeopleWaiting} Waiting
            </span>
          </h2>
        </div>

        <div className="admin-search-bar">
          <input
            type="search"
            className="admin-search-input"
            placeholder="Search by name, ticket, email, slot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="admin-filter-select"
            value={selectedServiceFilter}
            onChange={(e) => setSelectedServiceFilter(e.target.value)}
          >
            <option value="all">All Services ({totalServices})</option>
            {summaries.map((item) => (
              <option key={item.service.id} value={item.service.id}>
                {item.service.name} ({item.waitingCount})
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p>Loading queues...</p>
        ) : (
          <div className="admin-waitlist-container">
            {filteredSummaries.map(
              ({
                service,
                waitingCount,
                estimatedWaitMinutes,
                waitingList,
              }) => (
                <div key={service.id} className="admin-service-waitlist-card">
                  <div className="admin-waitlist-header">
                    <div className="admin-waitlist-service-info">
                      <span className="admin-waitlist-service-title">
                        {service.name}
                      </span>
                      <span className="admin-badge-count">
                        {waitingCount} in line
                      </span>
                      <span
                        className={`admin-pill admin-pill-priority-${service.priority}`}
                      >
                        {service.priority} priority
                      </span>
                    </div>

                    <div className="admin-waitlist-stats">
                      <span className="admin-service-est-time">
                        Total queue wait:{" "}
                        <strong>{estimatedWaitMinutes} min</strong>
                      </span>
                      <Link
                        to="/schedule/join-queue"
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                      >
                        + Add to Queue
                      </Link>
                    </div>
                  </div>

                  {waitingList.length === 0 ? (
                    <div className="admin-empty-waitlist">
                      <span className="admin-empty-icon">&#10003;</span>
                      <p>No customers currently on wait for {service.name}.</p>
                    </div>
                  ) : (
                    <div className="admin-table-wrapper">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Position</th>
                            <th>Ticket #</th>
                            <th>Customer</th>
                            <th>Appointment Slot</th>
                            <th>Joined</th>
                            <th>Est. Wait</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {waitingList.map((entry) => (
                            <tr key={entry.id}>
                              <td>
                                <span className="admin-pos-badge">
                                  #{entry.position}
                                </span>
                              </td>
                              <td>
                                <span className="admin-ticket-tag">
                                  {entry.ticketNumber || `T-${entry.position}`}
                                </span>
                              </td>
                              <td>
                                <div className="admin-customer-cell">
                                  <span className="admin-customer-name">
                                    {entry.customerName || "Anonymous Customer"}
                                  </span>
                                  {entry.customerEmail && (
                                    <span className="admin-customer-email">
                                      {entry.customerEmail}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>{entry.timeSlot || "Walk-in / Immediate"}</td>
                              <td>
                                {new Date(entry.joinedAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </td>
                              <td>
                                <strong>
                                  {entry.estimatedWaitMinutes} min
                                </strong>
                              </td>
                              <td>
                                <span
                                  className={`admin-status-pill admin-status-${entry.status}`}
                                >
                                  {entry.status.replace("_", " ")}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-sm admin-btn-primary"
                                  onClick={() =>
                                    handleUpdateStatus(
                                      entry,
                                      "served",
                                      service.name,
                                    )
                                  }
                                >
                                  Mark Served
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
