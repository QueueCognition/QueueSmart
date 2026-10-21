import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  getServices,
  createService,
  updateService,
  deleteService,
} from '../services/serviceApi'
import type { Service, Priority } from '../services/serviceApi'
import '../styles/servicemanagement.css'

function ServiceManagement() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false

    getServices()
      .then((data) => {
        if (!cancelled) {
          setServices(data)
          setApiError('')
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setApiError(
            error instanceof Error
              ? error.message
              : 'Failed to load services.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const resetForm = () => {
    setName('')
    setDescription('')
    setDuration('')
    setPriority('medium')
    setEditingId(null)
    setErrors({})
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    const parsedDuration = Number(duration)

    if (!name.trim()) {
      newErrors.name = 'Service name is required.'
    } else if (name.trim().length > 100) {
      newErrors.name = 'Service name must be 100 characters or less.'
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required.'
    }

    if (!duration.trim()) {
      newErrors.duration = 'Expected duration is required.'
    } else if (
      !Number.isFinite(parsedDuration) ||
      parsedDuration <= 0
    ) {
      newErrors.duration = 'Duration must be a positive number.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validate() || saving) {
      return
    }

    setSaving(true)
    setApiError('')

    const serviceData = {
      name: name.trim(),
      description: description.trim(),
      duration: Number(duration),
      priority,
    }

    try {
      if (editingId !== null) {
        const updatedService = await updateService(editingId, serviceData)

        setServices((currentServices) =>
          currentServices.map((service) =>
            service.id === editingId ? updatedService : service,
          ),
        )
      } else {
        const newService = await createService(serviceData)

        setServices((currentServices) => [
          ...currentServices,
          newService,
        ])
      }

      resetForm()
    } catch (error: unknown) {
      setApiError(
        error instanceof Error
          ? error.message
          : 'Failed to save the service.',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (service: Service) => {
    setEditingId(service.id)
    setName(service.name)
    setDescription(service.description)
    setDuration(String(service.duration))
    setPriority(service.priority)
    setErrors({})
    setApiError('')
  }

  const handleRemove = async (id: number) => {
    if (saving) {
      return
    }

    const confirmed = window.confirm(
      'Are you sure you want to remove this service?',
    )

    if (!confirmed) {
      return
    }

    setSaving(true)
    setApiError('')

    try {
      await deleteService(id)

      setServices((currentServices) =>
        currentServices.filter((service) => service.id !== id),
      )

      if (editingId === id) {
        resetForm()
      }
    } catch (error: unknown) {
      setApiError(
        error instanceof Error
          ? error.message
          : 'Failed to remove the service.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="service-management">
      <div className="service-management__header">
        <h1>Service Management</h1>
        <p>
          Create and manage the services available through QueueSmart.
        </p>
      </div>

      {apiError && (
        <div className="service-error" role="alert">
          {apiError}
        </div>
      )}

      <section className="service-card">
        <h2>
          {editingId !== null ? 'Edit Service' : 'Create New Service'}
        </h2>

        <form onSubmit={handleSubmit} className="service-form">
          <div className="service-field">
            <label htmlFor="service-name">Service Name</label>
            <input
              id="service-name"
              type="text"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter service name"
              className={
                errors.name
                  ? 'service-input service-input--error'
                  : 'service-input'
              }
            />
            {errors.name && (
              <span className="service-error">{errors.name}</span>
            )}
          </div>

          <div className="service-field">
            <label htmlFor="service-description">Description</label>
            <textarea
              id="service-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the service"
              rows={4}
              className={
                errors.description
                  ? 'service-input service-input--error'
                  : 'service-input'
              }
            />
            {errors.description && (
              <span className="service-error">
                {errors.description}
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
                step="any"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                placeholder="e.g. 30"
                className={
                  errors.duration
                    ? 'service-input service-input--error'
                    : 'service-input'
                }
              />
              {errors.duration && (
                <span className="service-error">
                  {errors.duration}
                </span>
              )}
            </div>

            <div className="service-field">
              <label htmlFor="service-priority">Priority Level</label>
              <select
                id="service-priority"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as Priority)
                }
                className="service-input"
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
                ? 'Saving...'
                : editingId !== null
                  ? 'Save Changes'
                  : 'Create Service'}
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
                  className="service-action service-action--remove"
                  onClick={() => handleRemove(service.id)}
                  disabled={saving}
                >
                  {saving ? 'Please wait...' : 'Remove'}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  )
}

export default ServiceManagement