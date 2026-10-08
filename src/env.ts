type EnvKey =
  | "API_URL"
  | "FIREBASE_API_KEY"
  | "FIREBASE_AUTH_DOMAIN"
  | "FIREBASE_PROJECT_ID"
  | "FIREBASE_STORAGE_BUCKET"
  | "FIREBASE_MESSAGING_SENDER_ID"
  | "FIREBASE_APP_ID"
  | "FIREBASE_MEASUREMENT_ID";

export function getEnv(key: EnvKey): string {
  const viteKey = `VITE_${key}` as keyof ImportMetaEnv;
  const legacyKey = `REACT_APP_${key}` as keyof ImportMetaEnv;

  return import.meta.env[viteKey] || import.meta.env[legacyKey] || "";
}
