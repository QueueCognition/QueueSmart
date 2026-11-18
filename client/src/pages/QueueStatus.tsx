import "../styles/queuestatus.css";
import { useState } from "react";
import { useQueueStatus } from "../hooks/useQueueStatus";
import { usePublicQueueBoard, useServices } from "../hooks/useServices";
import { useAuth } from "../context/AuthContext";
import { describeApiError } from "../services/apiClient";

const STAGES = ["waiting", "almost_ready", "served"];

function QueueStatus() {
  const { isAuthenticated } = useAuth();
  const {
    entry,
    error: statusError,
    loading: statusLoading,
  } = useQueueStatus();
  const servicesQuery = useServices();
  const [serviceId, setServiceId] = useState("");

  const services = servicesQuery.data ?? [];
  const boardServiceId =
    entry?.serviceId ?? (serviceId || services[0]?.id || "");

  const boardQuery = usePublicQueueBoard(boardServiceId || undefined);
  const board = boardQuery.data ?? [];
  const boardError = boardQuery.isError
    ? describeApiError(boardQuery.error, "Failed to load the queue.")
    : servicesQuery.isError
      ? describeApiError(servicesQuery.error, "Failed to load services.")
      : "";
  const boardLoading = Boolean(boardServiceId) && boardQuery.isPending;

  const currentStageIndex = entry ? STAGES.indexOf(entry.status) : -1;
  const selectedService = services.find(
    (service) => service.id === boardServiceId,
  );

  return (
    <div className="queue-status-page">
      {isAuthenticated && (
        <div className="status-card">
          <h1>Your Queue Status</h1>

          {statusLoading ? (
            <p>Loading your queue status...</p>
          ) : statusError ? (
            <p role="alert">{statusError}</p>
          ) : !entry ? (
            <p>You are not currently in a queue.</p>
          ) : (
            <>
              <div className="status-position-circle">
                <span className="position-number">#{entry.position}</span>
                <span className="position-label">in line</span>
              </div>

              <span className={`status-badge status-${entry.status}`}>
                {entry.status.replace("_", " ")}
              </span>

              <div className="status-progress-track">
                {STAGES.map((stage, i) => (
                  <div
                    key={stage}
                    className={`status-progress-step ${i <= currentStageIndex ? "active" : ""}`}
                  />
                ))}
              </div>

              <p className="wait-time">
                Estimated wait:{" "}
                <strong>{entry.estimatedWaitMinutes} min</strong>
              </p>
            </>
          )}
        </div>
      )}

      <div className="queue-table-card">
        <h2>Current Queue</h2>
        <label htmlFor="board-service">Service</label>{" "}
        {entry ? (
          <strong>{selectedService?.name ?? entry.serviceId}</strong>
        ) : (
          <select
            id="board-service"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        )}
        {boardError && <p role="alert">{boardError}</p>}
        {!boardServiceId && !boardError ? (
          <p>No services are available.</p>
        ) : boardLoading ? (
          <p>Loading queue...</p>
        ) : (
          <table className="queue-table">
            <thead>
              <tr>
                <th>Time slot</th>
                <th>Patient</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {board.map((row) => (
                <tr key={`${row.position}-${row.patient}-${row.timeSlot}`}>
                  <td>{row.timeSlot}</td>
                  <td>{row.patient}</td>
                  <td>#{row.position}</td>
                </tr>
              ))}
              {board.length === 0 && (
                <tr>
                  <td colSpan={3}>No one is currently waiting.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default QueueStatus;
