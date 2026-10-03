import { useState } from 'react'
import '../styles/queuemanagement.css'

type QueueUser = {
  id: number
  name: string
  service: string
  priority: 'low' | 'medium' | 'high'
  waitTime: number
  status: 'waiting' | 'almost ready'
}

const initialQueue: QueueUser[] = [
  {
    id: 1,
    name: 'Alex Johnson',
    service: 'Financial Aid Consultation',
    priority: 'high',
    waitTime: 5,
    status: 'almost ready',
  },
  {
    id: 2,
    name: 'Maria Garcia',
    service: 'Financial Aid Consultation',
    priority: 'medium',
    waitTime: 12,
    status: 'waiting',
  },
  {
    id: 3,
    name: 'Demo User',
    service: 'Financial Aid Consultation',
    priority: 'low',
    waitTime: 20,
    status: 'waiting',
  },
  {
    id: 4,
    name: 'Sarah Lee',
    service: 'Financial Aid Consultation',
    priority: 'medium',
    waitTime: 28,
    status: 'waiting',
  },
]

function QueueManagement() {
  const [queue, setQueue] = useState<QueueUser[]>(initialQueue)
  const [selectedService, setSelectedService] = useState(
    'Financial Aid Consultation'
  )

  const moveUser = (index: number, direction: 'up' | 'down') => {
    const newQueue = [...queue]
    const newIndex = direction === 'up' ? index - 1 : index + 1

    if (newIndex < 0 || newIndex >= newQueue.length) {
      return
    }

    ;[newQueue[index], newQueue[newIndex]] = [
      newQueue[newIndex],
      newQueue[index],
    ]

    setQueue(newQueue)
  }

  const removeUser = (id: number) => {
    setQueue(queue.filter((user) => user.id !== id))
  }

  const serveNext = () => {
    if (queue.length === 0) {
      return
    }

    setQueue(queue.slice(1))
  }

  return (
    <main className="queue-management">
      <header className="queue-management__header">
        <div>
          <h1>Queue Management</h1>
          <p>Monitor and manage users waiting for each service.</p>
        </div>

        <div className="queue-management__service">
          <label htmlFor="service-select">Service</label>
          <select
            id="service-select"
            value={selectedService}
            onChange={(event) => setSelectedService(event.target.value)}
          >
            <option>Financial Aid Consultation</option>
            <option>Student ID Card</option>
            <option>DMV License Renewal</option>
          </select>
        </div>
      </header>

      <section className="queue-summary">
        <div className="queue-summary__item">
          <span>People waiting</span>
          <strong>{queue.length}</strong>
        </div>

        <div className="queue-summary__item">
          <span>Next user</span>
          <strong>{queue[0]?.name ?? 'No one waiting'}</strong>
        </div>

        <button
          className="queue-button queue-button--primary"
          onClick={serveNext}
          disabled={queue.length === 0}
        >
          Serve Next
        </button>
      </section>

      <section className="queue-card">
        <div className="queue-card__header">
          <div>
            <h2>{selectedService}</h2>
            <p>{queue.length} users currently in the queue</p>
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="queue-empty">
            <h3>Queue is empty</h3>
            <p>There are currently no users waiting for this service.</p>
          </div>
        ) : (
          <div className="queue-list">
            {queue.map((user, index) => (
              <div className="queue-user" key={user.id}>
                <div className="queue-user__position">
                  #{index + 1}
                </div>

                <div className="queue-user__info">
                  <div className="queue-user__name-row">
                    <h3>{user.name}</h3>

                    <span
                      className={`priority-pill priority-pill--${user.priority}`}
                    >
                      {user.priority}
                    </span>
                  </div>

                  <p>
                    Estimated wait: <strong>{user.waitTime} min</strong>
                  </p>

                  <span
                    className={`queue-status queue-status--${user.status === 'almost ready' ? 'ready' : 'waiting'}`}
                  >
                    {user.status}
                  </span>
                </div>

                <div className="queue-user__actions">
                  <button
                    className="queue-action"
                    onClick={() => moveUser(index, 'up')}
                    disabled={index === 0}
                    title="Move user up"
                  >
                    ↑
                  </button>

                  <button
                    className="queue-action"
                    onClick={() => moveUser(index, 'down')}
                    disabled={index === queue.length - 1}
                    title="Move user down"
                  >
                    ↓
                  </button>

                  <button
                    className="queue-action queue-action--remove"
                    onClick={() => removeUser(user.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default QueueManagement