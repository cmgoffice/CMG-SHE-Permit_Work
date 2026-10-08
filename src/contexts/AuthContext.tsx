/**
 * AuthContext.tsx
 *
 * จัดการ Authentication State ด้วย Firebase onAuthStateChanged
 *
 * Flow:
 *  1. เมื่อ App โหลด → loading = true (Firebase กำลัง restore Token จาก localStorage)
 *  2. onAuthStateChanged trigger → ถ้ามี user ดึง profile จาก Firestore → loading = false
 *  3. ถ้าไม่มี user → loading = false ทันที
 *
 * สำคัญ: ห้ามแสดงหน้า Login จนกว่า loading จะเป็น false
 * เพื่อป้องกันการกระพริบของหน้า Login ก่อนที่ Firebase จะ Redirect ไปหน้าหลัก
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { fetchProfile } from "../services/authService";
import { getRemainingMinutes, isSessionExpired } from "../utils/session";
import { SESSION_CHECK_INTERVAL_MS } from "../constants/auth";
import type { UserProfile } from "../types/auth";
import type { AuthContextValue } from "../types/auth";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<import("firebase/auth").User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  /**
   * loading = true หมายถึง Firebase ยังไม่ได้แจ้ง Auth State ครั้งแรก
   * (กำลัง restore Token จาก localStorage / IndexedDB)
   *
   * ต้องรอให้ loading = false ก่อนที่จะ Redirect หรือแสดงหน้าใดก็ตาม
   */
  const [loading, setLoading] = useState(true);
  const [sessionMinutesLeft, setSessionMinutesLeft] = useState(0);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setUserProfile(null);
      return;
    }
    try {
      const profile = await fetchProfile(auth.currentUser.uid);
      setUserProfile(profile);
    } catch {
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    /**
     * onAuthStateChanged จะถูกเรียกครั้งแรกเสมอเมื่อ Firebase ตรวจ Token เสร็จ
     * ไม่ว่า user จะ login อยู่หรือไม่ก็ตาม
     * → นี่คือจุดที่เราตั้ง loading = false เพื่อปลดล็อกการ Render
     */
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        // ไม่มี Token → ล้าง profile และหยุด loading
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // มี Token → ดึง profile จาก Firestore ก่อนหยุด loading
      try {
        const profile = await fetchProfile(user.uid);
        setUserProfile(profile);
      } catch {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ตรวจสอบ custom session expiry (ใช้คู่กับ Firebase token)
  useEffect(() => {
    setSessionMinutesLeft(getRemainingMinutes());
    const interval = setInterval(() => {
      setSessionMinutesLeft(getRemainingMinutes());
      if (isSessionExpired() && auth.currentUser) {
        import("../services/authService").then((m) => m.logout()).catch(() => {});
      }
    }, SESSION_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const value: AuthContextValue = {
    firebaseUser,
    userProfile,
    loading,
    sessionMinutesLeft,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
