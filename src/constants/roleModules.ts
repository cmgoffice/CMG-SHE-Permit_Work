import type { UserRole } from "../types/auth";

/** โมดูลในระบบ */
export const MODULES = ["projects", "wms", "jsa", "work_permit", "database", "users"] as const;
export type ModuleId = (typeof MODULES)[number];

/** action ที่สามารถทำได้ */
export type Action = "view" | "create" | "edit" | "delete";

/** สิทธิ์เข้าถึงโมดูลของแต่ละ Role */
export const ROLE_MODULES: Record<UserRole, ModuleId[]> = {
  SuperAdmin: ["projects", "wms", "jsa", "work_permit", "database", "users"],
  Admin:      ["projects", "wms", "jsa", "work_permit", "database", "users"],
  Manager:    ["projects", "wms", "jsa", "work_permit", "database"],
  Staff:      ["projects", "wms", "jsa", "work_permit", "database"],
  Viewer:     ["projects", "wms", "jsa", "work_permit", "database"],
};

/**
 * สิทธิ์ action ของแต่ละ Role
 * SuperAdmin / Admin  → ทำได้ทุกอย่าง
 * Manager             → ดู, สร้าง, แก้ไข, ลบ  (ไม่มีสิทธิ์จัดการ Users)
 * Staff               → ดู, สร้าง, แก้ไข       (ลบไม่ได้)
 * Viewer              → ดูอย่างเดียว
 */
export const ROLE_ACTIONS: Record<UserRole, Action[]> = {
  SuperAdmin: ["view", "create", "edit", "delete"],
  Admin:      ["view", "create", "edit", "delete"],
  Manager:    ["view", "create", "edit", "delete"],
  Staff:      ["view", "create", "edit"],
  Viewer:     ["view"],
};

/** คำนวณโมดูลที่เข้าถึงได้ (รวมหลาย role) */
export function getAccessibleModules(roles: UserRole[]): Set<ModuleId> {
  const set = new Set<ModuleId>();
  for (const role of roles) {
    ROLE_MODULES[role]?.forEach((m) => set.add(m));
  }
  return set;
}

/** คำนวณ actions ที่ทำได้ (รวมหลาย role) */
export function getAccessibleActions(roles: UserRole[]): Set<Action> {
  const set = new Set<Action>();
  for (const role of roles) {
    ROLE_ACTIONS[role]?.forEach((a) => set.add(a));
  }
  return set;
}

export function canAccessModule(roles: UserRole[] | undefined, moduleId: ModuleId): boolean {
  if (!roles?.length) return false;
  return getAccessibleModules(roles).has(moduleId);
}

/** ชื่อเมนูใน Sidebar ตาม module (ให้สอดคล้องกับ App.tsx) */
export const MODULE_SIDEBAR_LABELS: Record<ModuleId, string> = {
  projects: "ข้อมูลโครงการ",
  wms: "Method Statement (WMS)",
  jsa: "Job Safety Analysis (JSA)",
  work_permit: "Work Permit",
  database: "ฐานข้อมูล (Database)",
  users: "จัดการผู้ใช้งาน",
};

const ACTION_LABELS_TH: Record<Action, string> = {
  view: "เปิดดูรายละเอียด",
  create: "สร้างรายการใหม่",
  edit: "แก้ไขรายการ",
  delete: "ลบรายการ",
};

/** คำอธิบายสิทธิ์ของ Role หนึ่ง (เมนู Sidebar + การกระทำในรายการโครงการ/WMS/JSA + จัดการผู้ใช้ถ้ามี) */
export function getRoleGuide(role: UserRole): {
  sidebarMenus: string[];
  listActions: string[];
  userMgmtDescription?: string;
} {
  const modules = ROLE_MODULES[role] ?? [];
  const hasUsersModule = modules.includes("users");
  return {
    sidebarMenus: modules.map((m) => MODULE_SIDEBAR_LABELS[m]),
    listActions: (ROLE_ACTIONS[role] ?? []).map((a) => ACTION_LABELS_TH[a]),
    userMgmtDescription: hasUsersModule
      ? "ในเมนูจัดการผู้ใช้งาน: ดูรายการผู้ใช้ และแก้ไขบทบาท (Role) สถานะการอนุมัติ และตำแหน่ง"
      : undefined,
  };
}
