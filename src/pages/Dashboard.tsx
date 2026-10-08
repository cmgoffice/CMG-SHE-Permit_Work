import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDocs } from "firebase/firestore";
import { usersRef } from "../firebase";
import type { UserProfile } from "../types/auth";
import { useAuth } from "../contexts/AuthContext";
import { logout } from "../services/authService";

export default function Dashboard() {
  const { userProfile, sessionMinutesLeft } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<(UserProfile & { id: string })[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const roleList = userProfile?.role;
  const roles = Array.isArray(roleList) ? roleList : [];
  const canManageUsers = roles.includes("SuperAdmin") || roles.includes("Admin");

  useEffect(() => {
    if (!canManageUsers) return;
    setUsersLoading(true);
    getDocs(usersRef())
      .then((snap) => {
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as UserProfile & { id: string }));
        setUsers(list);
      })
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [canManageUsers]);

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Sarabun', sans-serif" }}>
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-600">
            สิ้นสุดเซสชันใน {sessionMinutesLeft} นาที
          </span>
          <span className="text-sm text-gray-700">
            {userProfile?.firstName} {userProfile?.lastName} ({userProfile?.email})
          </span>
          <Link
            to="/account"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            บัญชีของฉัน
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">ยินดีต้อนรับ</h2>
          <p className="text-gray-600 mb-4">
            คุณเข้าสู่ระบบแล้ว บทบาท: {roles.length ? roles.join(", ") : "-"}
          </p>
          <Link
            to="/app"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ไปยัง JSA & Work Method
          </Link>
        </div>

        {canManageUsers && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">จัดการผู้ใช้งาน</h2>
            </div>
            {usersLoading ? (
              <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="px-6 py-3 font-semibold">อีเมล</th>
                    <th className="px-6 py-3 font-semibold">ชื่อ-นามสกุล</th>
                    <th className="px-6 py-3 font-semibold">ตำแหน่ง</th>
                    <th className="px-6 py-3 font-semibold">บทบาท</th>
                    <th className="px-6 py-3 font-semibold">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{u.email}</td>
                      <td className="px-6 py-4">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-6 py-4">{u.position || "-"}</td>
                      <td className="px-6 py-4">{Array.isArray(u.role) ? u.role.join(", ") : "-"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            u.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : u.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="px-6 py-3 text-sm text-gray-500 border-t border-gray-100">
              การอนุมัติ/แก้ไขบทบาท: อัปเดตสถานะและ role ใน Firestore ที่{" "}
              <code className="bg-gray-100 px-1 rounded">JSA Work Method/root/users/{"{uid}"}</code>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
