import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproved?: boolean;
  requireRoles?: UserRole[];
}

export function ProtectedRoute({
  children,
  requireApproved = true,
  requireRoles,
}: ProtectedRouteProps) {
  const { firebaseUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ fontFamily: "'Sarabun', sans-serif" }}>
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (firebaseUser && userProfile === null && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ fontFamily: "'Sarabun', sans-serif" }}>
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">กำลังโหลดโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  if (userProfile?.status === "pending" && location.pathname !== "/pending") {
    return <Navigate to="/pending" replace />;
  }

  if (userProfile?.status === "rejected") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireApproved && userProfile?.status !== "approved") {
    return <Navigate to="/pending" replace />;
  }

  if (requireRoles && requireRoles.length > 0 && userProfile?.role) {
    const hasRole = requireRoles.some((r) => userProfile.role?.includes(r));
    if (!hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
