import { addDoc, serverTimestamp } from "firebase/firestore";
import { activityLogsRef } from "../firebase";

const LOG_TYPES = ["REGISTER", "LOGIN"] as const;

export function logActivity(
  type: (typeof LOG_TYPES)[number],
  uid: string,
  email: string,
  extra?: Record<string, unknown>
): void {
  addDoc(activityLogsRef(), {
    type,
    uid,
    email,
    ...extra,
    createdAt: serverTimestamp(),
  }).catch(() => {});
}
