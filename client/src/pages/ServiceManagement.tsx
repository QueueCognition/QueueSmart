import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import {
  createService,
  updateService,
  deleteService,
  setServiceAvailability,
} from "../services/serviceApi";
import type { Service } from "../services/serviceApi";
import { useManagedServices } from "../hooks/useServices";
import { queryKeys } from "../lib/queryClient";
import { serviceSchema, type ServiceValues } from "../validation/schemas";
import "../styles/servicemanagement.css";

const DEFAULT_VALUES: ServiceValues = {
  name: "",
  description: "",
  duration: "",
  priority: "medium",
};

function ServiceManagement() {
  const client = useQueryClient();
  const servicesQuery = useManagedServices();
  const services = servicesQuery.data ?? [];
  const loading = servicesQuery.isPending;
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const apiError =
    saveError ||
    (servicesQuery.isError
      ? servicesQuery.error instanceof Error
        ? servicesQuery.error.message
        : "Failed to load services."
      : "");

  const refreshServices = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.adminServices }),
      client.invalidateQueries({ queryKey: queryKeys.services }),
    ]);

  const resetForm = () => {
    reset(DEFAULT_VALUES);
    setEditingId(null);
  };

  const onSubmit = async (values: ServiceValues) => {
    if (saving) {
      return;
    }

    setSaving(true);
    setSaveError("");

    const serviceData = {
      name: values.name,
      description: values.description,
      duration: Number(values.duration),
      priority: values.priority,
    };

    try {
      if (editingId !== null) {
        await updateService(editingId, serviceData);
      } else {
        await createService(serviceData);
      }

      await refreshServices();
      resetForm();
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save the service.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    reset({
      name: service.name,
      description: service.description,
      duration: String(service.duration),
      priority: service.priority,
    });
    setSaveError("");
  };

  const handleToggleAvailability = async (service: Service) => {
    if (saving) {
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      await setServiceAvailability(service.id, !service.isAvailable);
      await refreshServices();
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to update the service availability.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (saving) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this service?",
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      await deleteService(id);

      await refreshServices();

      if (editingId === id) {
        resetForm();
      }
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to remove the service.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="service-management">
      <div className="service-management__header">
        <h1>Service Management</h1>
        <p>Create and manage the services available through QueueSmart.</p>
      </div>

      {apiError && (
        <div className="service-error" role="alert">
          {apiError}
        </div>
      )}

      <section className="service-card">
        <h2>{editingId !== null ? "Edit Service" : "Create New Service"}</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="service-form">
          <div className="service-field">
            <label htmlFor="service-name">Service Name</label>
            <input
              id="service-name"
              type="text"
              maxLength={100}
              placeholder="Enter service name"
              className={clsx("service-input", {
                "service-input--error": errors.name,
              })}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "service-name-error" : undefined}
              {...register("name")}
            />
            {errors.name && (
              <span className="service-error" id="service-name-error">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="service-field">
            <label htmlFor="service-description">Description</label>
            <textarea
              id="service-description"
              placeholder="Describe the service"
              rows={4}
              className={clsx("service-input", {
                "service-input--error": errors.description,
              })}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
                errors.description ? "service-description-error" : undefined
              }
              {...register("description")}
            />
            {errors.description && (
              <span className="service-error" id="service-description-error">
                {errors.description.message}
              </span>
            )}
          </div>

          <div className="service-form-row">
            <div className="service-field">
              <label htmlFor="service-duration">
                Expected Duration (minutes)
              </label>
              <input
                id="service-duration"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 30"
                className={clsx("service-input", {
                  "service-input--error": errors.duration,
                })}
                aria-invalid={Boolean(errors.duration)}
                aria-describedby={
                  errors.duration ? "service-duration-error" : undefined
                }
                {...register("duration")}
              />
              {errors.duration && (
                <span className="service-error" id="service-duration-error">
                  {errors.duration.message}
                </span>
              )}
            </div>

            <div className="service-field">
              <label htmlFor="service-priority">Priority Level</label>
              <select
                id="service-priority"
                className="service-input"
                {...register("priority")}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="service-form-actions">
            <button
              type="submit"
              className="service-button"
              disabled={saving || loading}
            >
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Save Changes"
                  : "Create Service"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="service-button service-button--secondary"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="service-list">
        <div className="service-list__header">
          <h2>Existing Services</h2>
          <span>{services.length} services</span>
        </div>

        {loading ? (
          <p>Loading services...</p>
        ) : services.length === 0 ? (
          <p>No services available yet.</p>
        ) : (
          services.map((service) => (
            <article key={service.id} className="service-item">
              <div className="service-item__content">
                <div className="service-item__title-row">
                  <h3>{service.name}</h3>
                  <span
                    className={`priority-pill priority-pill--${service.priority}`}
                  >
                    {service.priority}
                  </span>
                  {!service.isAvailable && (
                    <span className="availability-pill availability-pill--paused">
                      Paused
                    </span>
                  )}
                </div>

                <p>{service.description}</p>

                <span className="service-duration">
                  Expected duration: {service.duration} minutes
                </span>
              </div>

              <div className="service-item__actions">
                <button
                  type="button"
                  className="service-action service-action--edit"
                  onClick={() => handleEdit(service)}
                  disabled={saving}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="service-action service-action--availability"
                  onClick={() => handleToggleAvailability(service)}
                  disabled={saving}
                >
                  {service.isAvailable ? "Pause" : "Resume"}
                </button>

                <button
                  type="button"
                  className="service-action service-action--remove"
                  onClick={() => handleRemove(service.id)}
                  disabled={saving}
                >
                  {saving ? "Please wait..." : "Remove"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default ServiceManagement;
