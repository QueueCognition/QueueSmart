import "../styles/queuestatus.css";
import { useQueueStatus } from "../hooks/useQueueStatus";
import { useAuth } from "../context/AuthContext";

const STAGES = ["waiting", "almost_ready", "served"];

// Same people and order as initialQueue in QueueManagement.tsx
const demoQueue = [
  { id: 1, firstName: "Alex", lastName: "Johnson", waitTime: 5 },
  { id: 2, firstName: "Maria", lastName: "Garcia", waitTime: 12 },
  { id: 3, firstName: "Demo", lastName: "User", waitTime: 20 },
  { id: 4, firstName: "Sarah", lastName: "Lee", waitTime: 28 },
];

// "Alex Johnson" -> "Ale J."
function formatPatientName(firstName: string, lastName: string): string {
  return `${firstName.slice(0, 3)} ${lastName.charAt(0).toUpperCase()}.`;
}

// Appointment time = now + estimated wait, e.g. "9:12 AM"
function appointmentTime(waitMinutes: number): string {
  return new Date(Date.now() + waitMinutes * 60 * 1000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function QueueStatus() {
  const { isAuthenticated } = useAuth();
  const entry = useQueueStatus("q1");

  const currentStageIndex = entry ? STAGES.indexOf(entry.status) : -1;

  return (
    <div className="queue-status-page">
      {isAuthenticated && (
        <div className="status-card">
          <h1>Your Queue Status</h1>

          {!entry ? (
            <p>Loading your queue status...</p>
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
                Estimated wait: <strong>{entry.estimatedWaitMinutes} min</strong>
              </p>
            </>
          )}
        </div>
      )}

      <div className="queue-table-card">
        <h2>Today's Queue</h2>

        <table className="queue-table">
          <thead>
            <tr>
              <th>Time of appointment</th>
              <th>Patient</th>
              <th>Position</th>
            </tr>
          </thead>
          <tbody>
            {demoQueue.map((row, index) => (
              <tr key={row.id}>
                <td>{appointmentTime(row.waitTime)}</td>
                <td>{formatPatientName(row.firstName, row.lastName)}</td>
                <td>#{index + 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default QueueStatus;