import { FormEvent, useState } from 'react'
import '../styles/servicemanagement.css'

type Priority = 'low' | 'medium' | 'high'

type Service = {
  id: number
  name: string
  description: string
  duration: number
  priority: Priority
}

const initialServices: Service[] = [
  {
    id: 1,
    name: 'Student ID Card',
    description: 'Student identification card services.',
    duration: 15,
    priority: 'medium',
  },
  {
    id: 2,
    name: 'Financial Aid Consultation',
    description: 'Assistance with financial aid questions and applications.',
    duration: 30,
    priority: 'high',
  },
  {
    id: 3,
    name: 'DMV License Renewal',
    description: 'License renewal and related documentation services.',
    duration: 20,
    priority: 'low',
  },
]

function ServiceManagement() {
  const [services, setServices] = useState<Service[]>(initialServices)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')

  const [errors, setErrors] = useState<Record<string, string>>({})

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

    if (!name.trim()) {
      newErrors.name = 'Service name is required.'
    } else if (name.trim().length > 100) {
      newErrors.name = 'Service name must be 100 characters or less.'
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required.'
    }

    if (!duration) {
      newErrors.duration = 'Expected duration is required.'
    } else if (Number(duration) <= 0) {
      newErrors.duration = 'Duration must be greater than 0.'
    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validate()) {
      return
    }

    const serviceData = {
      name: name.trim(),
      description: description.trim(),
      duration: Number(duration),
      priority,
    }

    if (editingId !== null) {
      setServices((currentServices) =>
        currentServices.map((service) =>
          service.id === editingId
            ? { ...service, ...serviceData }
            : service,
        ),
      )
    } else {
      setServices((currentServices) => [
        ...currentServices,
        {
          id: Date.now(),
          ...serviceData,
        },
      ])
    }

    resetForm()
  }

  const handleEdit = (service: Service) => {
    setEditingId(service.id)
    setName(service.name)
    setDescription(service.description)
    setDuration(String(service.duration))
    setPriority(service.priority)
    setErrors({})
  }

  const handleRemove = (id: number) => {
    setServices((currentServices) =>
      currentServices.filter((service) => service.id !== id),
    )

    if (editingId === id) {
      resetForm()
    }
  }

  return (
    <main className="service-management">
      <div className="service-management__header">
        <h1>Service Management</h1>
        <p>Create and manage the services available through QueueSmart.</p>
      </div>

      <section className="service-card">
        <h2>{editingId !== null ? 'Edit Service' : 'Create New Service'}</h2>

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
              className={errors.name ? 'service-input service-input--error' : 'service-input'}
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
              <span className="service-error">{errors.description}</span>
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
                <span className="service-error">{errors.duration}</span>
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
            <button type="submit" className="service-button">
              {editingId !== null ? 'Save Changes' : 'Create Service'}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="service-button service-button--secondary"
                onClick={resetForm}
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

        {services.map((service) => (
          <article key={service.id} className="service-item">
            <div className="service-item__content">
              <div className="service-item__title-row">
                <h3>{service.name}</h3>
                <span className={`priority-pill priority-pill--${service.priority}`}>
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
              >
                Edit
              </button>

              <button
                type="button"
                className="service-action service-action--remove"
                onClick={() => handleRemove(service.id)}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}

export default ServiceManagement
