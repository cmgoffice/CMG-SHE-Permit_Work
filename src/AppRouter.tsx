import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import MyAccountPage from "./pages/MyAccountPage";
import AdminPanel from "./pages/AdminPanel";
import App from "./App";

export default function AppRouter() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pending" element={<ProtectedRoute requireApproved={false}><PendingApprovalPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><App /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><MyAccountPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requireRoles={["SuperAdmin", "Admin"]}><AdminPanel /></ProtectedRoute>} />
        <Route path="/app" element={<ProtectedRoute><App /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
