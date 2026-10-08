/**
 * API สำหรับการบันทึก (สร้าง/แก้ไข/ลบ)
 * ใช้ VITE_API_URL หรือ REACT_APP_API_URL จาก .env
 * รูปแบบที่คาดหวังจาก Backend:
 *   POST /api/projects     body: { ...project }
 *   DELETE /api/projects/:id
 *   POST /api/wms         body: { ...wms }
 *   DELETE /api/wms/:id
 *   POST /api/jsa         body: { ...jsa }
 *   DELETE /api/jsa/:id
 */

import { getEnv } from "./env";

const BASE = getEnv("API_URL");

function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = BASE ? `${BASE.replace(/\/$/, "")}${path}` : "";
  if (!url) {
    return Promise.reject(new Error("VITE_API_URL หรือ REACT_APP_API_URL ไม่ได้ตั้งค่าใน .env"));
  }
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return res.json();
    }
    return undefined as T;
  });
}

export type ProjectPayload = Record<string, unknown>;
export type WMSPayload = Record<string, unknown>;
export type JSAPayload = Record<string, unknown>;

export const api = {
  async saveProject(data: ProjectPayload): Promise<void> {
    await request("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteProject(id: string): Promise<void> {
    await request(`/api/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async saveWMS(data: WMSPayload): Promise<void> {
    await request("/api/wms", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteWMS(id: string): Promise<void> {
    await request(`/api/wms/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async saveJSA(data: JSAPayload): Promise<void> {
    await request("/api/jsa", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteJSA(id: string): Promise<void> {
    await request(`/api/jsa/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};

/** ถ้ามีการตั้งค่า API URL แล้ว จะใช้ API ในการบันทึก */
export function useApiForSave(): boolean {
  return Boolean(BASE.trim());
}
