import "../styles/joinqueue.css";
import { useEffect, useState } from "react";
import type { QueueEntry, Service } from "../types/queue";
import {
  getMyQueue,
  getServices,
  getWaitEstimate,
  joinQueue,
  leaveQueue,
} from "../services/queueService";
import type { WaitEstimate } from "../types/queue";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const TIME_SLOTS = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
];

function JoinQueue() {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myQueue, setMyQueue] = useState<QueueEntry[]>([]);
  const [waitEstimate, setWaitEstimate] = useState<WaitEstimate | null>(null);
  const { push } = useNotifications();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let active = true;
    getServices()
      .then((data) => {
        if (active) setServices(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setFormError(
            error instanceof Error ? error.message : "Failed to load services.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    getMyQueue()
      .then((entries) => {
        if (active) setMyQueue(entries);
      })
      .catch((error: unknown) => {
        if (active) {
          setFormError(
            error instanceof Error ? error.message : "Failed to load your queue.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const selectedService = services.find((s) => s.id === serviceId);

  useEffect(() => {
    if (!serviceId) return;

    let active = true;
    getWaitEstimate(serviceId)
      .then((estimate) => {
        if (active) setWaitEstimate(estimate);
      })
      .catch((error: unknown) => {
        if (active) {
          setWaitEstimate(null);
          setFormError(
            error instanceof Error
              ? error.message
              : "Failed to load the wait estimate.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [serviceId]);

  function validate() {
    const next: Record<string, string> = {};
    if (!serviceId) next.serviceId = "Please select a service";
    if (!date) next.date = "Please select a date";
    if (!timeSlot) next.timeSlot = "Please select a time slot";
    if (!fullName.trim()) next.fullName = "Full name is required";
    else if (fullName.trim().length > 100)
      next.fullName = "Name must be 100 characters or fewer";
    if (!email.trim()) next.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email))
      next.email = "Enter a valid email address";
    else if (email.trim().length > 254)
      next.email = "Email must be 254 characters or fewer";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !selectedService) return;
    if (!isAuthenticated) {
      setFormError("Sign in before joining the queue.");
      return;
    }

    setFormError("");
    setSubmitting(true);
    try {
      const entry = await joinQueue({
        serviceId,
        fullName,
        email,
        date,
        timeSlot,
      });
      setMyQueue((current) => [...current, entry]);
      push({
        message: `You joined the queue for ${selectedService.name}.`,
        type: "queue_update",
      });
      setServiceId("");
      setDate("");
      setTimeSlot("");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to join the queue.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLeave(entry: QueueEntry) {
    const serviceName =
      services.find((service) => service.id === entry.serviceId)?.name ??
      entry.serviceId;
    if (!window.confirm(`Leave the queue for ${serviceName}?`)) return;
    setFormError("");
    try {
      await leaveQueue(entry.id);
      setMyQueue((current) => current.filter((item) => item.id !== entry.id));
      push({
        message: `You left the queue for ${serviceName}.`,
        type: "queue_update",
      });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to leave the queue.",
      );
    }
  }

  return (
    <div className="join-queue-page">
      <div className="appointment-card">
        <h1>Schedule Your Visit</h1>
        <p className="subtitle">
          Select a service and preferred time to join the queue
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="service">Service</label>
            <select
              id="service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">Select a service...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.serviceId && (
              <span className="field-error">{errors.serviceId}</span>
            )}
          </div>

          {selectedService && (
            <div className="wait-estimate">
              <p className="wait-estimate-main">
                Estimated wait:{" "}
                <strong>
                  {waitEstimate
                    ? `~${waitEstimate.estimatedWaitMinutes} min`
                    : "Loading..."}
                </strong>
                <span className="wait-estimate-ahead">
                  {waitEstimate &&
                    ` (${waitEstimate.waitingCount} ${
                      waitEstimate.waitingCount === 1 ? "person" : "people"
                    } currently waiting)`}
                </span>
              </p>
              <p>
                Appointment length: {selectedService.expectedDuration} min ·{" "}
                <span
                  className={`priority-pill priority-${selectedService.priority}`}
                >
                  {selectedService.priority} priority
                </span>
              </p>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Preferred Date</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {errors.date && (
                <span className="field-error">{errors.date}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="timeSlot">Preferred Time</label>
              <select
                id="timeSlot"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
              >
                <option value="">Select a time...</option>
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.timeSlot && (
                <span className="field-error">{errors.timeSlot}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              maxLength={100}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jamie Win"
            />
            {errors.fullName && (
              <span className="field-error">{errors.fullName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jamie@example.com"
            />
            {errors.email && (
              <span className="field-error">{errors.email}</span>
            )}
          </div>

          {formError && (
            <p className="field-error" role="alert">
              {formError}{" "}
              {!isAuthenticated && <Link to="/login">Sign in</Link>}
            </p>
          )}

          <button type="submit" className="submit-button" disabled={submitting}>
            {submitting ? "Booking Appointment..." : "Book Appointment"}
          </button>
        </form>
      </div>

      {isAuthenticated && (
        <div className="my-queue-card">
          <h2>Your Queue</h2>

          {myQueue.length === 0 ? (
            <p className="my-queue-empty">
              You're not in any queues right now.
            </p>
          ) : (
            <ul className="my-queue-list">
              {myQueue.map((entry) => (
                <li key={entry.id} className="my-queue-item">
                  <div className="my-queue-info">
                    <span className="my-queue-service">
                      {services.find((service) => service.id === entry.serviceId)
                        ?.name ?? entry.serviceId}
                    </span>
                    <span className="my-queue-meta">
                      {entry.date} at {entry.timeSlot}
                    </span>
                    <span className="my-queue-meta">
                      Position #{entry.position} · ~{entry.estimatedWaitMinutes}{" "}
                      min wait
                    </span>
                  </div>

                  <button
                    type="button"
                    className="leave-button"
                    onClick={() => handleLeave(entry)}
                  >
                    Leave queue
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default JoinQueue;