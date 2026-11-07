import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdminQueues } from "../hooks/useAdminQueues";
import "../styles/admin-dashboard.css";

function AdminDashboard() {
  const { user } = useAuth();
  const {
    summaries,
    loading,
    error,
    lastRefreshed,
    servingServiceId,
    refresh,
    serveNext,
  } = useAdminQueues();

  const [actionNotice, setActionNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState("all");

  useEffect(() => {
    if (!actionNotice) return;

    const timer = window.setTimeout(() => setActionNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  async function handleServeNext(serviceId: string, serviceName: string) {
    const outcome = await serveNext(serviceId);

    if (!outcome) return;

    const { served } = outcome;
    setActionNotice(
      `${served.customerName || served.ticketNumber || "The next customer"} was served for ${serviceName}.`,
    );
  }

  const totalServices = summaries.length;
  const availableServices = summaries.filter(
    (item) => item.service.isAvailable,
  );

  const totalPeopleWaiting = summaries.reduce(
    (total, item) => total + item.waitingCount,
    0,
  );

  const highestWaitService = useMemo(() => {
    if (summaries.length === 0) return null;
    return [...summaries].sort((a, b) => b.waitingCount - a.waitingCount)[0];
  }, [summaries]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isSearching = normalizedSearch !== "";

  const filteredSummaries = useMemo(() => {
    return summaries
      .filter((item) => {
        if (selectedServiceFilter === "all") return true;
        return item.service.id === selectedServiceFilter;
      })
      .map((item) => {
        if (!normalizedSearch) return item;

        const filteredList = item.waitingList.filter(
          (q) =>
            q.customerName?.toLowerCase().includes(normalizedSearch) ||
            q.ticketNumber?.toLowerCase().includes(normalizedSearch) ||
            q.customerEmail?.toLowerCase().includes(normalizedSearch) ||
            q.timeSlot?.toLowerCase().includes(normalizedSearch),
        );

        return {
          ...item,
          waitingList: filteredList,
        };
      });
  }, [summaries, selectedServiceFilter, normalizedSearch]);

  const isDegraded = error !== "";

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-title-group">
          <h1>Admin Dashboard</h1>
          <p>Overview of services and customer wait queues.</p>
        </div>

        <div className="admin-header-actions">
          <span className="admin-live-badge">
            <span
              className={
                isDegraded
                  ? "admin-live-dot admin-live-dot--idle"
                  : "admin-live-dot"
              }
            />
            {isDegraded ? "Sync Failed" : "Live Sync"}
          </span>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={refresh}
            title="Refresh dashboard data"
          >
            Refresh ({lastRefreshed ? lastRefreshed.toLocaleTimeString() : "—"})
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

      {error && (
        <div className="admin-alert" role="alert">
          {error}
        </div>
      )}

      {actionNotice && (
        <div className="admin-alert admin-alert--success" role="status">
          {actionNotice}
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
            className={
              isDegraded
                ? "admin-stat-value admin-stat-value--warn"
                : "admin-stat-value admin-stat-value--ok"
            }
          >
            {isDegraded ? "Degraded" : "Operational"}
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
        ) : summaries.length === 0 ? (
          <div className="admin-empty-waitlist">
            <span className="admin-empty-icon">&#9432;</span>
            <p>No services are configured yet.</p>
            <Link
              to="/admin/services"
              className="admin-btn admin-btn-secondary admin-btn-sm"
            >
              Create a service
            </Link>
          </div>
        ) : (
          <div className="admin-services-grid">
            {summaries.map(
              ({ service, waitingCount, estimatedWaitMinutes }) => {
                const isAvailable = service.isAvailable;
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
              }) => {
                const isServing = servingServiceId === service.id;

                return (
                  <div key={service.id} className="admin-service-waitlist-card">
                    <div className="admin-waitlist-header">
                      <div className="admin-waitlist-service-info">
                        <span className="admin-waitlist-service-title">
                          {service.name}
                        </span>
                        <span className="admin-badge-count">
                          {waitingList.length} in line
                        </span>
                        <span
                          className={`admin-pill admin-pill-priority-${service.priority}`}
                        >
                          {service.priority} priority
                        </span>
                        {!service.isAvailable && (
                          <span className="admin-pill admin-pill-paused">
                            Paused
                          </span>
                        )}
                      </div>

                      <div className="admin-waitlist-stats">
                        <span className="admin-service-est-time">
                          {isSearching
                            ? "Full queue wait: "
                            : "Total queue wait: "}
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
                        <p>
                          {isSearching
                            ? `No customers match "${searchTerm.trim()}".`
                            : `No customers currently on wait for ${service.name}.`}
                        </p>
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
                                    {entry.ticketNumber ||
                                      `T-${entry.position}`}
                                  </span>
                                </td>
                                <td>
                                  <div className="admin-customer-cell">
                                    <span className="admin-customer-name">
                                      {entry.customerName ||
                                        "Anonymous Customer"}
                                    </span>
                                    {entry.customerEmail && (
                                      <span className="admin-customer-email">
                                        {entry.customerEmail}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  {entry.timeSlot || "Walk-in / Immediate"}
                                </td>
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
                                      handleServeNext(service.id, service.name)
                                    }
                                    disabled={entry.position !== 1 || isServing}
                                    title={
                                      entry.position === 1
                                        ? "Serve the next person in this queue"
                                        : "Only the next person can be served"
                                    }
                                  >
                                    {isServing ? "Serving..." : "Serve Next"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {waitingCount !== waitingList.length && (
                      <p className="admin-waitlist-note">
                        Showing {waitingList.length} of {waitingCount}{" "}
                        customers.
                      </p>
                    )}
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
