import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { logout } from "../services/authService";
import { useNavigate } from "react-router-dom";

const REFRESH_INTERVAL_MS = 15_000; // ตรวจสอบสถานะทุก 15 วินาที

export default function PendingApprovalPage() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  // ถ้าแอดมินอนุมัติแล้วใน Firestore → ส่งไป Dashboard
  useEffect(() => {
    if (userProfile?.status === "approved") {
      navigate("/dashboard", { replace: true });
    }
  }, [userProfile?.status, navigate]);

  // ดึงสถานะล่าสุดจาก Firestore ทันทีเมื่อเปิดหน้านี้ (แก้กรณีแคชเก่า)
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // ดึงซ้ำทุก 15 วินาที เผื่อแอดมินเพิ่งอนุมัติ
  useEffect(() => {
    const t = setInterval(() => {
      refreshProfile();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [refreshProfile]);

  const handleCheckAgain = async () => {
    setChecking(true);
    await refreshProfile();
    setChecking(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-100 px-4"
      style={{ fontFamily: "'Sarabun', sans-serif" }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">รอการอนุมัติ</h1>
        <p className="text-gray-600 mb-6">
          บัญชีของคุณ ({userProfile?.email}) กำลังรอการอนุมัติจากผู้ดูแลระบบ
          เมื่ออนุมัติแล้วคุณจะสามารถใช้งานระบบได้
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleCheckAgain}
            disabled={checking}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {checking ? "กำลังตรวจสอบ..." : "ตรวจสอบอีกครั้ง"}
          </button>
          <button
            onClick={handleLogout}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
