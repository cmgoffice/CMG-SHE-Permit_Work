/** ใช้กับ path Firestore: {APP_NAME}/root/... */
export const APP_NAME = "JSA Work Method";

export const SESSION_DURATION_MINUTES = 60;
export const SESSION_KEY = `${APP_NAME.replace(/\s+/g, "_")}_session_expires`;
export const SESSION_CHECK_INTERVAL_MS = 60_000;
