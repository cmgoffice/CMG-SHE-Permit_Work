/**
 * LoginPage.tsx
 *
 * Handling Loading State (สำคัญมาก):
 * ─────────────────────────────────────────────────────────────────────────────
 * ขณะที่ authLoading === true → Firebase กำลัง restore Token จาก localStorage
 * ห้ามแสดงฟอร์ม Login เด็ดขาด → แสดง Spinner แทน
 *
 * เมื่อ authLoading === false:
 *   • มี firebaseUser  → กำลัง redirect ไปหน้าหลัก (แสดง Spinner)
 *   • ไม่มี firebaseUser → แสดงฟอร์ม Login เต็มรูปแบบ
 *
 * วิธีนี้ป้องกัน "Login Page Flash" ที่เกิดขึ้นเมื่อ user login อยู่แล้ว
 * แต่ Firebase ยังตรวจ Token ไม่เสร็จ
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { loginWithEmail, loginWithGoogle } from "../services/authService";

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  "auth/user-not-found": "ไม่พบผู้ใช้",
  "auth/wrong-password": "รหัสผ่านไม่ถูกต้อง",
  "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
  "auth/popup-closed-by-user": "ยกเลิกการเข้าสู่ระบบด้วย Google",
  "auth/unauthorized-domain": "โดเมนนี้ไม่ได้รับอนุญาต",
};

/** Spinner component ใช้ร่วมกันภายในไฟล์นี้ */
function FullPageSpinner({ message }: { message: string }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50"
      style={{ fontFamily: "'Sarabun', sans-serif" }}
    >
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * ดึง loading จาก AuthContext → นี่คือ "auth loading" ที่บ่งบอกว่า
   * Firebase ยังตรวจสอบ Token อยู่หรือไม่ (ต่างจาก formLoading ด้านล่าง)
   */
  const { firebaseUser, userProfile, loading: authLoading, refreshProfile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  /** formLoading = loading ของ form submit เท่านั้น (ไม่เกี่ยวกับ auth state) */
  const [formLoading, setFormLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/dashboard";

  /**
   * Routing Logic:
   * เมื่อ authLoading สิ้นสุดลงและพบว่ามี userProfile → Redirect ทันที
   * ตามสถานะของ profile (pending / approved / rejected)
   */
  useEffect(() => {
    // รอ auth ตรวจสอบเสร็จก่อน
    if (authLoading) return;
    // ไม่มี user → อยู่หน้า login ปกติ
    if (!firebaseUser) return;
    // มี user แต่ profile ยังโหลดไม่เสร็จ → รอ
    if (!userProfile) return;

    if (userProfile.status === "rejected") {
      setError("บัญชีของคุณถูกปฏิเสธการอนุมัติ กรุณาติดต่อผู้ดูแลระบบ");
      return;
    }
    if (userProfile.status === "pending") {
      navigate("/pending", { replace: true });
      return;
    }
    if (userProfile.status === "approved") {
      navigate(from, { replace: true });
    }
  }, [authLoading, firebaseUser, userProfile, navigate, from]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFormLoading(true);
    try {
      await loginWithEmail(email, password);
      // onAuthStateChanged ใน AuthContext จะ trigger refreshProfile อัตโนมัติ
      // แต่เรียก refreshProfile เพิ่มเพื่อให้ userProfile อัปเดตเร็วขึ้น
      await refreshProfile();
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code
          : "";
      setError(FIREBASE_ERROR_MESSAGES[code] ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setFormLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setFormLoading(true);
    try {
      await loginWithGoogle();
      await refreshProfile();
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code
          : "";
      setError(FIREBASE_ERROR_MESSAGES[code] ?? "เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
    } finally {
      setFormLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // GATE 1: authLoading = true → Firebase ยังตรวจ Token อยู่
  //         ห้ามเรนเดอร์ฟอร์ม Login เด็ดขาด → แสดง Spinner
  // ─────────────────────────────────────────────────────────────────────────
  if (authLoading) {
    return <FullPageSpinner message="กำลังตรวจสอบสถานะการเข้าสู่ระบบ..." />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GATE 2: authLoading = false แต่มี user อยู่แล้ว → กำลัง redirect
  //         แสดง Spinner เพื่อป้องกันหน้า Login กระพริบก่อน navigate
  // ─────────────────────────────────────────────────────────────────────────
  if (firebaseUser && userProfile?.status !== "rejected") {
    return <FullPageSpinner message="กำลังนำทางไปยังระบบ..." />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GATE 3: ไม่มี user → แสดงฟอร์ม Login เต็มรูปแบบ
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-100 px-4"
      style={{ fontFamily: "'Sarabun', sans-serif" }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-6">เข้าสู่ระบบ</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={formLoading}
            className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {formLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-500 text-sm">หรือ</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={formLoading}
          className="w-full py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          เข้าสู่ระบบด้วย Google
        </button>

        <p className="mt-6 text-center text-sm text-gray-600">
          ยังไม่มีบัญชี?{" "}
          <Link to="/register" className="text-blue-600 font-medium hover:underline">
            สมัครสมาชิก
          </Link>
        </p>
      </div>
    </div>
  );
}
