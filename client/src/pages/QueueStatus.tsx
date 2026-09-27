import '../styles/queuestatus.css';
import { useQueueStatus } from '../hooks/useQueueStatus';

const STAGES = ['waiting', 'almost_ready', 'served'];

function QueueStatus() {
  const entry = useQueueStatus('q1');

  if (!entry) return <p>Loading your queue status...</p>;

  const currentStageIndex = STAGES.indexOf(entry.status);

  return (
    <div className="queue-status-page">
      <div className="status-card">
        <h1>Your Queue Status</h1>

        <div className="status-position-circle">
          <span className="position-number">#{entry.position}</span>
          <span className="position-label">in line</span>
        </div>

        <span className={`status-badge status-${entry.status}`}>
          {entry.status.replace('_', ' ')}
        </span>

        <div className="status-progress-track">
          {STAGES.map((stage, i) => (
            <div
              key={stage}
              className={`status-progress-step ${i <= currentStageIndex ? 'active' : ''}`}
            />
          ))}
        </div>

        <p className="wait-time">
          Estimated wait: <strong>{entry.estimatedWaitMinutes} min</strong>
        </p>
      </div>
    </div>
  );
}

export default QueueStatus;