import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { usersRef } from "../firebase";
import type { UserProfile } from "../types/auth";
import { useAuth } from "../contexts/AuthContext";
import { logout } from "../services/authService";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const { userProfile, sessionMinutesLeft } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<(UserProfile & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(usersRef());
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as UserProfile & { id: string }));
        setUsers(list);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Sarabun', sans-serif" }}>
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">จัดการ User</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-600">เซสชัน: {sessionMinutesLeft} นาที</span>
          <Link to="/account" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
            บัญชีของฉัน
          </Link>
          <Link to="/dashboard" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
            กลับ Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">รายชื่อผู้ใช้</h2>
          </div>
          {loading ? (
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
        </div>
        <p className="mt-4 text-sm text-gray-500">
          การอนุมัติ/แก้ไขบทบาท: อัปเดตสถานะและ role ใน Firestore โดยตรงที่{" "}
          <code className="bg-gray-100 px-1 rounded">JSA Work Method/root/users/{"{uid}"}</code>
        </p>
      </main>
    </div>
  );
}
