import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { logout } from "../services/authService";

export default function MyAccountPage() {
  const { userProfile, sessionMinutesLeft } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const roleList = userProfile?.role;
  const roles = Array.isArray(roleList) ? roleList : [];
  const canManageUsers = roles.includes("SuperAdmin") || roles.includes("Admin");

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Sarabun', sans-serif" }}>
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">บัญชีของฉัน</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-600">เซสชัน: {sessionMinutesLeft} นาที</span>
          <Link
            to="/dashboard"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            กลับ Dashboard
          </Link>
          {canManageUsers && (
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              จัดการผู้ใช้งาน
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">ข้อมูลบัญชี</h2>
          </div>
          <div className="p-6 space-y-4">
            {userProfile?.photoURL && (
              <div className="flex justify-center mb-4">
                <img
                  src={userProfile.photoURL}
                  alt="โปรไฟล์"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
              </div>
            )}
            <div className="grid gap-3">
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 text-gray-500 text-sm shrink-0">อีเมล</span>
                <span className="text-gray-800 font-medium">{userProfile?.email ?? "-"}</span>
              </div>
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 text-gray-500 text-sm shrink-0">ชื่อ</span>
                <span className="text-gray-800">
                  {userProfile?.firstName} {userProfile?.lastName}
                </span>
              </div>
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 text-gray-500 text-sm shrink-0">ตำแหน่ง</span>
                <span className="text-gray-800">{userProfile?.position || "-"}</span>
              </div>
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 text-gray-500 text-sm shrink-0">บทบาท</span>
                <span className="text-gray-800">{roles.length ? roles.join(", ") : "-"}</span>
              </div>
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 text-gray-500 text-sm shrink-0">สถานะ</span>
                <span
                  className={`font-medium ${
                    userProfile?.status === "approved"
                      ? "text-green-600"
                      : userProfile?.status === "pending"
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}
                >
                  {userProfile?.status === "approved"
                    ? "อนุมัติแล้ว"
                    : userProfile?.status === "pending"
                    ? "รอการอนุมัติ"
                    : userProfile?.status === "rejected"
                    ? "ไม่อนุมัติ"
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
