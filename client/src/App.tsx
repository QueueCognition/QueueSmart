import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { NotificationProvider } from './context/NotificationContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import JoinQueue from './pages/JoinQueue'
import QueueStatus from './pages/QueueStatus'

function App() {
  return (
    <NotificationProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schedule/join-queue" element={<JoinQueue />} />
          <Route path="/schedule/queue-status" element={<QueueStatus />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  )
}

export default App