import type { Timestamp } from "firebase/firestore";

/** Role ของระบบ (1 คนสามารถมีได้มากกว่า 1 role) */
export const USER_ROLES = ["SuperAdmin", "Admin", "Staff", "Manager", "Viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type UserStatus = "pending" | "approved" | "rejected";

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  role: UserRole[];
  status: UserStatus;
  assignedProjects: string[];
  createdAt: Timestamp;
  photoURL?: string;
  isFirstUser: boolean;
}

export interface AppMetaConfig {
  firstUserRegistered: boolean;
  totalUsers: number;
  createdAt: Timestamp;
}

export interface AuthContextValue {
  firebaseUser: import("firebase/auth").User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  sessionMinutesLeft: number;
  refreshProfile: () => Promise<void>;
}
