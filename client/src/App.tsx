import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Navbar from "./components/Navbar";
import NotificationBell from "./components/NotificationBell";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import JoinQueue from "./pages/JoinQueue";
import QueueStatus from "./pages/QueueStatus";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import NotificationTester from "./components/NotificationTester";

function App() {
  return (
    <NotificationProvider>
      <BrowserRouter>
        <AuthProvider>
          <div className="app-navbar">
            <Navbar />
            <NotificationBell />
          </div>
          <NotificationTester />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/schedule/join-queue" element={<JoinQueue />} />
            <Route path="/schedule/queue-status" element={<QueueStatus />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute minRole="staff">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute minRole="staff">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/services"
              element={
                <ProtectedRoute minRole="staff">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;