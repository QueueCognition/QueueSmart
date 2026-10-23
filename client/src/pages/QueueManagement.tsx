import { useEffect, useState } from "react";
import {
  getAdminServiceWaitSummaries,
  serveNextInQueue,
  type AdminServiceQueueSummary,
} from "../services/adminQueueService";
import "../styles/queuemanagement.css";

function QueueManagement() {
  const [summaries, setSummaries] = useState<AdminServiceQueueSummary[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [serving, setServing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const data = await getAdminServiceWaitSummaries();
        if (active) {
          setSummaries(data);
          setSelectedServiceId(
            (current) => current || data[0]?.service.id || "",
          );
          setError("");
          setLoading(false);
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Failed to load queue information.",
          );
          setLoading(false);
        }
      }
    }

    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const selectedSummary = summaries.find(
    (item) => item.service.id === selectedServiceId,
  );
  const queue = selectedSummary?.waitingList ?? [];

  async function handleServeNext() {
    if (!selectedSummary || queue.length === 0) return;

    setServing(true);
    setError("");
    try {
      await serveNextInQueue(selectedSummary.service.id);
      setSummaries(await getAdminServiceWaitSummaries());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to serve the next user.",
      );
    } finally {
      setServing(false);
    }
  }

  return (
    <main className="queue-management">
      <header className="queue-management__header">
        <div>
          <h1>Queue Management</h1>
          <p>Monitor and serve users waiting for each service.</p>
        </div>

        <div className="queue-management__service">
          <label htmlFor="service-select">Service</label>
          <select
            id="service-select"
            value={selectedServiceId}
            onChange={(event) => setSelectedServiceId(event.target.value)}
          >
            {summaries.map(({ service }) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading queue...</p>
      ) : (
        <>
          <section className="queue-summary">
            <div className="queue-summary__item">
              <span>People waiting</span>
              <strong>{selectedSummary?.waitingCount ?? 0}</strong>
            </div>

            <div className="queue-summary__item">
              <span>Next user</span>
              <strong>
                {queue[0]?.customerName ?? "No one waiting"}
              </strong>
            </div>

            <button
              className="queue-button queue-button--primary"
              onClick={handleServeNext}
              disabled={queue.length === 0 || serving}
            >
              {serving ? "Serving..." : "Serve Next"}
            </button>
          </section>

          <section className="queue-card">
            <div className="queue-card__header">
              <h2>{selectedSummary?.service.name ?? "Queue"}</h2>
              <p>
                {selectedSummary?.waitingCount ?? 0} users currently in the
                queue
              </p>
            </div>

            {queue.length === 0 ? (
              <div className="queue-empty">
                <h3>Queue is empty</h3>
                <p>There are currently no users waiting for this service.</p>
              </div>
            ) : (
              <div className="queue-list">
                {queue.map((user) => (
                  <div className="queue-user" key={user.id}>
                    <div className="queue-user__position">#{user.position}</div>

                    <div className="queue-user__info">
                      <div className="queue-user__name-row">
                        <h3>{user.customerName ?? "Customer"}</h3>
                        <span
                          className={`priority-pill priority-pill--${user.priority ?? "medium"}`}
                        >
                          {user.priority ?? "medium"}
                        </span>
                      </div>

                      <p>
                        Estimated wait:{" "}
                        <strong>{user.estimatedWaitMinutes} min</strong>
                      </p>

                      <span
                        className={`queue-status queue-status--${user.status === "almost_ready" ? "ready" : "waiting"}`}
                      >
                        {user.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default QueueManagement;
