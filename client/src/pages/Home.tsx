import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="home-page">
      <h1>Welcome to QueueSmart</h1>
      <p>Skip the wait — join a queue remotely and track your status in real time.</p>
      <Link to="/schedule/join-queue" className="cta-button">
        Get Started
      </Link>
    </div>
  )
}

export default Home