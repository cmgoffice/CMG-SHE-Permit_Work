import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  User as FirebaseUser,
} from "firebase/auth";
import { getDoc, setDoc, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db, userDoc, appMetaConfigDoc } from "../firebase";
import { setSessionExpiry, clearSession } from "../utils/session";
import { logActivity } from "../utils/activityLog";
import type { UserProfile } from "../types/auth";
import type { UserRole } from "../types/auth";

const googleProvider = new GoogleAuthProvider();

function toUserProfile(data: Record<string, unknown>, uid: string): UserProfile {
  const createdAt = data.createdAt as Timestamp | undefined;
  return {
    uid,
    email: (data.email as string) ?? "",
    firstName: (data.firstName as string) ?? "",
    lastName: (data.lastName as string) ?? "",
    position: (data.position as string) ?? "",
    role: Array.isArray(data.role)
      ? (data.role.map((r: unknown) => (typeof r === "string" ? r.trim() : r)) as UserRole[])
      : typeof data.role === "string"
      ? [((data.role as string).trim()) as UserRole]
      : [],
    status: (data.status as UserProfile["status"]) ?? "pending",
    assignedProjects: Array.isArray(data.assignedProjects) ? (data.assignedProjects as string[]) : [],
    createdAt: createdAt ?? Timestamp.now(),
    photoURL: data.photoURL as string | undefined,
    isFirstUser: Boolean(data.isFirstUser),
  };
}

export async function fetchProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(userDoc(uid));
    if (!snap.exists()) return null;
    return toUserProfile(snap.data(), uid);
  } catch {
    return null;
  }
}

async function createUserProfileFromGoogle(user: FirebaseUser): Promise<void> {
  const displayName = user.displayName ?? "";
  const parts = displayName.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") ?? "";
  await setDoc(userDoc(user.uid), {
    uid: user.uid,
    email: user.email ?? "",
    firstName,
    lastName,
    position: "",
    role: ["Staff"],
    status: "pending",
    assignedProjects: [],
    createdAt: serverTimestamp(),
    photoURL: user.photoURL ?? undefined,
    isFirstUser: false,
  });
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<UserProfile> {
  // ตั้งค่า persistence เป็น LOCAL เพื่อให้ Firebase จำ Token ใน localStorage
  await setPersistence(auth, browserLocalPersistence);
  const uc = await signInWithEmailAndPassword(auth, email, password);
  setSessionExpiry();
  const profile = await fetchProfile(uc.user.uid);
  if (!profile) throw new Error("user-profile-not-found");
  logActivity("LOGIN", uc.user.uid, email, { method: "email" });
  return profile;
}

export async function loginWithGoogle(): Promise<UserProfile> {
  // ตั้งค่า persistence เป็น LOCAL เพื่อให้ Firebase จำ Token ใน localStorage
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, googleProvider);
  setSessionExpiry();
  let profile = await fetchProfile(result.user.uid).catch(() => null);
  if (!profile) {
    await createUserProfileFromGoogle(result.user);
    profile = await fetchProfile(result.user.uid);
  }
  if (!profile) throw new Error("user-profile-not-found");
  logActivity("LOGIN", result.user.uid, result.user.email ?? "", { method: "google" });
  return profile;
}

export async function registerWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  position: string
): Promise<UserProfile> {
  // ตั้งค่า persistence เป็น LOCAL เพื่อให้ Firebase จำ Token ใน localStorage
  await setPersistence(auth, browserLocalPersistence);
  const uc = await createUserWithEmailAndPassword(auth, email, password);
  setSessionExpiry();

  const uid = uc.user.uid;

  try {
    await runTransaction(db, async (transaction) => {
      const configRef = appMetaConfigDoc();
      const configSnap = await transaction.get(configRef);
      const isFirst =
        !configSnap.exists() || !(configSnap.data()?.firstUserRegistered === true);
      const newTotal = configSnap.exists()
        ? (configSnap.data()?.totalUsers ?? 0) + 1
        : 1;
      const role: UserRole[] = isFirst ? ["SuperAdmin"] : ["Staff"];
      const status: UserProfile["status"] = isFirst ? "approved" : "pending";

      transaction.set(configRef, {
        firstUserRegistered: true,
        totalUsers: newTotal,
        createdAt: configSnap.exists() ? configSnap.data()?.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      transaction.set(userDoc(uid), {
        uid,
        email,
        firstName,
        lastName,
        position,
        role,
        status,
        assignedProjects: [],
        createdAt: serverTimestamp(),
        isFirstUser: isFirst,
      });
    });
  } catch {
    const appMetaSnap = await getDoc(appMetaConfigDoc());
    const isFirst = !appMetaSnap.exists() || !appMetaSnap.data()?.firstUserRegistered;
    await setDoc(appMetaConfigDoc(), {
      firstUserRegistered: true,
      totalUsers: (appMetaSnap.data()?.totalUsers ?? 0) + 1,
      createdAt: appMetaSnap.exists() ? appMetaSnap.data()?.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(userDoc(uid), {
      uid,
      email,
      firstName,
      lastName,
      position,
      role: isFirst ? ["SuperAdmin"] : ["Staff"],
      status: isFirst ? "approved" : "pending",
      assignedProjects: [],
      createdAt: serverTimestamp(),
      isFirstUser: isFirst,
    });
  }

  logActivity("REGISTER", uid, email);
  const profile = await fetchProfile(uid);
  if (!profile) throw new Error("user-profile-not-found");
  return profile;
}

export function logout(): Promise<void> {
  clearSession();
  return signOut(auth);
}
