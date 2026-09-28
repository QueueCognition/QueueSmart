import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import JoinQueue from './pages/JoinQueue'
import QueueStatus from './pages/QueueStatus'
import ServiceManagement from './pages/ServiceManagement'

function App() {
  return (
    <NotificationProvider>
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/schedule/join-queue" element={<JoinQueue />} />
            <Route path="/schedule/queue-status" element={<QueueStatus />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/admin/services" element={<ServiceManagement />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </NotificationProvider>
  )
}

export default App