import "../styles/joinqueue.css";
import { useEffect, useState } from "react";
import type { Service } from "../types/queue";
import { getServices, joinQueue } from "../services/queueService";
import { useNotifications } from "../context/NotificationContext";

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
  const [submitting, setSubmitting] = useState(false);
  const { push } = useNotifications();

  useEffect(() => {
    getServices().then(setServices);
  }, []);

  const selectedService = services.find((s) => s.id === serviceId);

  function validate() {
    const next: Record<string, string> = {};
    if (!serviceId) next.serviceId = "Please select a service";
    if (!date) next.date = "Please select a date";
    if (!timeSlot) next.timeSlot = "Please select a time slot";
    if (!fullName.trim()) next.fullName = "Full name is required";
    else if (fullName.length > 100)
      next.fullName = "Name must be under 100 characters";
    if (!email.trim()) next.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email))
      next.email = "Enter a valid email address";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    await joinQueue(serviceId);
    push({
      message: `Appointment requested for ${selectedService?.name} on ${date} at ${timeSlot}`,
      type: "queue_update",
    });
    setSubmitting(false);
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
            <p className="wait-estimate">
              Estimated duration: {selectedService.expectedDuration} min ·{" "}
              <span
                className={`priority-pill priority-${selectedService.priority}`}
              >
                {selectedService.priority} priority
              </span>
            </p>
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

          <button type="submit" className="submit-button" disabled={submitting}>
            {submitting ? "Booking Appointment..." : "Book Appointment"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default JoinQueue;
