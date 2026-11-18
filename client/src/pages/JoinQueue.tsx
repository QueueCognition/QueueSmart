import "../styles/joinqueue.css";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { QueueEntry } from "../types/queue";
import { getMyQueue, joinQueue, leaveQueue } from "../services/queueService";
import { describeApiError } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import { useServices, useWaitEstimate } from "../hooks/useServices";
import { queryKeys } from "../lib/queryClient";
import { joinQueueSchema, type JoinQueueValues } from "../validation/schemas";
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

const DEFAULT_VALUES: JoinQueueValues = {
  serviceId: "",
  date: "",
  timeSlot: "",
  fullName: "",
  email: "",
};

function JoinQueue() {
  const servicesQuery = useServices();
  const services = servicesQuery.data ?? [];
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated } = useAuth();
  const client = useQueryClient();

  const {
    register,
    handleSubmit,
    resetField,
    control,
    formState: { errors },
  } = useForm<JoinQueueValues>({
    resolver: zodResolver(joinQueueSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const serviceId = useWatch({ control, name: "serviceId" });

  const myQueueQuery = useQuery({
    queryKey: queryKeys.myQueue,
    queryFn: getMyQueue,
    enabled: isAuthenticated,
  });
  const myQueue = myQueueQuery.data ?? [];

  const waitEstimateQuery = useWaitEstimate(serviceId || undefined);
  const waitEstimate = waitEstimateQuery.data ?? null;

  const selectedService = services.find((s) => s.id === serviceId);

  const loadError =
    (servicesQuery.isError &&
      describeApiError(servicesQuery.error, "Failed to load services.")) ||
    (myQueueQuery.isError &&
      describeApiError(myQueueQuery.error, "Failed to load your queue.")) ||
    (waitEstimateQuery.isError &&
      describeApiError(
        waitEstimateQuery.error,
        "Failed to load the wait estimate.",
      )) ||
    "";

  async function onSubmit(values: JoinQueueValues) {
    const service = services.find((item) => item.id === values.serviceId);
    if (!service) return;

    if (!isAuthenticated) {
      setFormError("Sign in before joining the queue.");
      return;
    }

    if (!service.isAvailable) {
      setFormError("This service is not accepting new entries right now.");
      return;
    }

    setFormError("");
    setSubmitting(true);
    try {
      await joinQueue({
        serviceId: values.serviceId,
        fullName: values.fullName,
        email: values.email,
        date: values.date,
        timeSlot: values.timeSlot,
      });
      await client.invalidateQueries({ queryKey: queryKeys.myQueue });
      resetField("serviceId");
      resetField("date");
      resetField("timeSlot");
    } catch (error) {
      setFormError(describeApiError(error, "Failed to join the queue."));
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
      await client.invalidateQueries({ queryKey: queryKeys.myQueue });
    } catch (error) {
      setFormError(describeApiError(error, "Failed to leave the queue."));
    }
  }
  return (
    <div className="join-queue-page">
      <div className="appointment-card">
        <h1>Schedule Your Visit</h1>
        <p className="subtitle">
          Select a service and preferred time to join the queue
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label htmlFor="service">Service</label>
            <select
              id="service"
              aria-invalid={Boolean(errors.serviceId)}
              aria-describedby={errors.serviceId ? "service-error" : undefined}
              {...register("serviceId")}
            >
              <option value="">Select a service...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id} disabled={!s.isAvailable}>
                  {s.name}
                  {s.isAvailable ? "" : " (paused)"}
                </option>
              ))}
            </select>
            {errors.serviceId && (
              <span className="field-error" id="service-error">
                {errors.serviceId.message}
              </span>
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
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "date-error" : undefined}
                {...register("date")}
              />
              {errors.date && (
                <span className="field-error" id="date-error">
                  {errors.date.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="timeSlot">Preferred Time</label>
              <select
                id="timeSlot"
                aria-invalid={Boolean(errors.timeSlot)}
                aria-describedby={
                  errors.timeSlot ? "timeSlot-error" : undefined
                }
                {...register("timeSlot")}
              >
                <option value="">Select a time...</option>
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.timeSlot && (
                <span className="field-error" id="timeSlot-error">
                  {errors.timeSlot.message}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              maxLength={100}
              placeholder="Jamie Win"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
              {...register("fullName")}
            />
            {errors.fullName && (
              <span className="field-error" id="fullName-error">
                {errors.fullName.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="jamie@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <span className="field-error" id="email-error">
                {errors.email.message}
              </span>
            )}
          </div>

          {(formError || loadError) && (
            <p className="field-error" role="alert">
              {formError || loadError}{" "}
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
                      {services.find(
                        (service) => service.id === entry.serviceId,
                      )?.name ?? entry.serviceId}
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
