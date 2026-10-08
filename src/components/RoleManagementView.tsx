import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  X,
  AlertCircle,
  Users,
  CheckCircle2,
  Lock,
  Layers,
  Activity,
  FileText,
  Database,
  UserCheck,
} from "lucide-react";
import { onSnapshot, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { rolesRef, roleDoc } from "../firebase";
import {
  MODULES,
  MODULE_SIDEBAR_LABELS,
  ModuleId,
  Action,
} from "../constants/roleModules";

export interface RoleItem {
  id: string;
  name: string;
  description: string;
  modules: ModuleId[];
  actions: Action[];
  isSystem?: boolean;
  createdAt?: string;
}

const DEFAULT_ROLES: RoleItem[] = [
  {
    id: "SuperAdmin",
    name: "SuperAdmin",
    description: "ผู้ดูแลระบบสูงสุด มีสิทธิ์เข้าถึงทุกเมนูและจัดการระบบทั้งหมด",
    modules: ["projects", "wms", "jsa", "work_permit", "database", "users"],
    actions: ["view", "create", "edit", "delete"],
    isSystem: true,
  },
  {
    id: "Admin",
    name: "Admin",
    description: "ผู้ดูแลระบบ สามารถจัดการโครงการ, เอกสาร และผู้ใช้งานได้",
    modules: ["projects", "wms", "jsa", "work_permit", "database", "users"],
    actions: ["view", "create", "edit", "delete"],
    isSystem: true,
  },
  {
    id: "Manager",
    name: "Manager",
    description: "ผู้จัดการ สามารถดู สร้าง แก้ไข และลบเอกสารงานต่างๆ ได้",
    modules: ["projects", "wms", "jsa", "work_permit", "database"],
    actions: ["view", "create", "edit", "delete"],
    isSystem: false,
  },
  {
    id: "Staff",
    name: "Staff",
    description: "เจ้าหน้าที่ สามารถดู สร้าง และแก้ไขเอกสารได้ (ไม่สามารถลบได้)",
    modules: ["projects", "wms", "jsa", "work_permit", "database"],
    actions: ["view", "create", "edit"],
    isSystem: false,
  },
  {
    id: "Viewer",
    name: "Viewer",
    description: "ผู้เข้าชม สามารถเปิดดูข้อมูลและเอกสารต่างๆ ได้อย่างเดียว",
    modules: ["projects", "wms", "jsa", "work_permit", "database"],
    actions: ["view"],
    isSystem: false,
  },
];

const ACTION_LABELS: Record<Action, { label: string; desc: string }> = {
  view: { label: "ดูรายการ (View)", desc: "เปิดดูรายละเอียดและข้อมูลในเมนู" },
  create: { label: "สร้างใหม่ (Create)", desc: "สร้างรายการหรือเอกสารใหม่" },
  edit: { label: "แก้ไข (Edit)", desc: "แก้ไขเปลี่ยนแปลงข้อมูลเอกสาร" },
  delete: { label: "ลบ (Delete)", desc: "ลบรายการหรือเอกสารออกจากระบบ" },
};

const MODULE_ICONS: Record<ModuleId, React.ReactNode> = {
  projects: <Layers className="w-4 h-4 text-blue-600" />,
  wms: <FileText className="w-4 h-4 text-emerald-600" />,
  jsa: <Activity className="w-4 h-4 text-amber-600" />,
  work_permit: <CheckCircle2 className="w-4 h-4 text-indigo-600" />,
  database: <Database className="w-4 h-4 text-cyan-600" />,
  users: <UserCheck className="w-4 h-4 text-purple-600" />,
};

interface RoleManagementViewProps {
  adminUsers?: any[];
}

export default function RoleManagementView({ adminUsers = [] }: RoleManagementViewProps) {
  const [roles, setRoles] = useState<RoleItem[]>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    modules: ModuleId[];
    actions: Action[];
  }>({
    name: "",
    description: "",
    modules: ["projects", "wms", "jsa", "work_permit", "database"],
    actions: ["view"],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Delete Confirm Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);

  // Sync Roles from Firestore
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      unsubscribe = onSnapshot(
        rolesRef(),
        async (snapshot) => {
          if (snapshot.empty) {
            // First time: seed default roles into Firestore
            try {
              for (const r of DEFAULT_ROLES) {
                await setDoc(roleDoc(r.id), r);
              }
            } catch (err) {
              console.warn("Could not seed default roles into Firestore:", err);
            }
            setRoles(DEFAULT_ROLES);
          } else {
            const list: RoleItem[] = [];
            snapshot.forEach((d) => {
              const data = d.data() as RoleItem;
              list.push({ ...data, id: d.id });
            });
            // Keep default order priority, then custom roles
            list.sort((a, b) => {
              const idxA = DEFAULT_ROLES.findIndex((dr) => dr.id === a.id);
              const idxB = DEFAULT_ROLES.findIndex((dr) => dr.id === b.id);
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;
              return a.name.localeCompare(b.name);
            });
            setRoles(list);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Roles fetch error:", error);
          setRoles(DEFAULT_ROLES);
          setLoading(false);
        }
      );
    } catch {
      setRoles(DEFAULT_ROLES);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Calculate users count per role
  const userCountsByRole = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of adminUsers) {
      if (Array.isArray(u.role)) {
        for (const r of u.role) {
          const clean = String(r).trim();
          map[clean] = (map[clean] || 0) + 1;
        }
      }
    }
    return map;
  }, [adminUsers]);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
    );
  }, [roles, searchQuery]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      modules: ["projects", "wms", "jsa", "work_permit", "database"],
      actions: ["view"],
    });
    setErrorMessage("");
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (role: RoleItem) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      modules: [...role.modules],
      actions: [...role.actions],
    });
    setErrorMessage("");
    setModalOpen(true);
  };

  // Toggle Module
  const handleToggleModule = (mod: ModuleId) => {
    setFormData((prev) => {
      const exists = prev.modules.includes(mod);
      return {
        ...prev,
        modules: exists ? prev.modules.filter((m) => m !== mod) : [...prev.modules, mod],
      };
    });
  };

  // Toggle Action
  const handleToggleAction = (act: Action) => {
    setFormData((prev) => {
      const exists = prev.actions.includes(act);
      return {
        ...prev,
        actions: exists ? prev.actions.filter((a) => a !== act) : [...prev.actions, act],
      };
    });
  };

  // Select all modules
  const handleSelectAllModules = () => {
    setFormData((prev) => ({ ...prev, modules: [...MODULES] }));
  };

  // Clear modules
  const handleClearModules = () => {
    setFormData((prev) => ({ ...prev, modules: [] }));
  };

  // Select all actions
  const handleSelectAllActions = () => {
    setFormData((prev) => ({ ...prev, actions: ["view", "create", "edit", "delete"] }));
  };

  // Clear actions
  const handleClearActions = () => {
    setFormData((prev) => ({ ...prev, actions: [] }));
  };

  // Save Role
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formData.name.trim();

    if (!cleanName) {
      setErrorMessage("กรุณาระบุชื่อ Role");
      return;
    }

    // Check duplicate name
    if (!editingRole) {
      const isDuplicate = roles.some(
        (r) => r.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (isDuplicate) {
        setErrorMessage(`มี Role ชื่อ "${cleanName}" อยู่แล้วในระบบ`);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const docId = editingRole ? editingRole.id : cleanName.replace(/\s+/g, "_");
      const rolePayload: RoleItem = {
        id: docId,
        name: cleanName,
        description: formData.description.trim(),
        modules: formData.modules,
        actions: formData.actions,
        isSystem: editingRole ? editingRole.isSystem : false,
        createdAt: editingRole?.createdAt || new Date().toISOString(),
      };

      await setDoc(roleDoc(docId), rolePayload);
      setModalOpen(false);
    } catch (err: any) {
      console.error("Save role error:", err);
      setErrorMessage(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Role
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    if (roleToDelete.isSystem) {
      alert("ไม่สามารถลบ Role หลักของระบบได้");
      setDeleteModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteDoc(roleDoc(roleToDelete.id));
      setDeleteModalOpen(false);
      setRoleToDelete(null);
    } catch (err: any) {
      console.error("Delete role error:", err);
      alert("เกิดข้อผิดพลาดในการลบ Role: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-violet-50 to-indigo-50/50 p-5 rounded-2xl border border-violet-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                จัดการบทบาทและสิทธิ์ผู้ใช้งาน (Role Management)
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                กำหนดและแก้ไขบทบาท (Role), สิทธิ์การเข้าถึงเมนู และสิทธิ์การทำงานในระบบ
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm rounded-xl transition-all shadow-sm active:scale-95 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่ม Role ใหม่</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ Role, คำอธิบาย..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        <div className="text-xs text-gray-500 font-medium">
          ทั้งหมด <span className="font-bold text-violet-700">{filteredRoles.length}</span> บทบาท
        </div>
      </div>

      {/* Role Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-500">กำลังโหลดข้อมูล Role...</div>
      ) : filteredRoles.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 text-gray-400">
          ไม่พบ Role ตามเงื่อนไขที่ค้นหา
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredRoles.map((role) => {
            const userCount = userCountsByRole[role.name] || 0;
            const isSystemRole = role.isSystem || ["SuperAdmin", "Admin"].includes(role.name);

            return (
              <div
                key={role.id}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3 bg-gradient-to-r from-gray-50/50 to-white">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isSystemRole
                          ? "bg-violet-100 text-violet-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {role.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-base">{role.name}</h3>
                        {isSystemRole ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Lock className="w-2.5 h-2.5" /> ระบบหลัก
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            กำหนดเอง
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {role.description || "ไม่มีคำอธิบายเพิ่มเติม"}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(role)}
                      className="p-1.5 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                      title="แก้ไข Role"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!isSystemRole && (
                      <button
                        type="button"
                        onClick={() => {
                          setRoleToDelete(role);
                          setDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบ Role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4 flex-1 text-xs">
                  {/* Assigned Users Count */}
                  <div className="flex items-center justify-between text-gray-600 pb-2 border-b border-gray-100">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      ผู้ใช้งานที่ได้รับ Role นี้:
                    </span>
                    <span className="font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">
                      {userCount} คน
                    </span>
                  </div>

                  {/* Modules Permissions */}
                  <div>
                    <span className="block font-semibold text-gray-700 mb-2">
                      เมนูที่เข้าถึงได้ ({role.modules.length}/{MODULES.length}) :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {role.modules.length === 0 ? (
                        <span className="text-gray-400 italic">ไม่มีสิทธิ์เข้าถึงเมนูใดๆ</span>
                      ) : (
                        role.modules.map((m) => (
                          <span
                            key={m}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 font-medium"
                          >
                            {MODULE_ICONS[m]}
                            <span>{MODULE_SIDEBAR_LABELS[m]}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Actions Permissions */}
                  <div>
                    <span className="block font-semibold text-gray-700 mb-2">
                      สิทธิ์การทำงาน ({role.actions.length}/4) :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {role.actions.length === 0 ? (
                        <span className="text-gray-400 italic">ไม่มีสิทธิ์ดำเนินการ</span>
                      ) : (
                        role.actions.map((act) => {
                          const isDelete = act === "delete";
                          const isCreate = act === "create";
                          const isEdit = act === "edit";
                          return (
                            <span
                              key={act}
                              className={`px-2 py-0.5 rounded-md font-medium border ${
                                isDelete
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : isCreate
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isEdit
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {ACTION_LABELS[act]?.label || act}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT ROLE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-violet-600" />
                <h3 className="font-bold text-gray-900 text-base">
                  {editingRole ? `แก้ไข Role: ${editingRole.name}` : "เพิ่ม Role ใหม่"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveRole} className="p-6 overflow-y-auto space-y-5 flex-1">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Role Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ชื่อ Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={editingRole?.isSystem}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น Supervisor, SafetyOfficer, Inspector"
                  className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {editingRole?.isSystem && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Role ระบบหลักไม่สามารถเปลี่ยนชื่อได้
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  คำอธิบายบทบาท
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ระบุหน้าที่ หรือคำอธิบายสำหรับบทบาทนี้..."
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              {/* Modules Permissions */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="block text-xs font-semibold text-gray-800">
                    สิทธิ์การเข้าถึงเมนูใน Sidebar
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectAllModules}
                      className="text-violet-600 hover:underline"
                    >
                      เลือกทั้งหมด
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearModules}
                      className="text-gray-500 hover:underline"
                    >
                      ล้าง
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODULES.map((mod) => {
                    const isChecked = formData.modules.includes(mod);
                    return (
                      <label
                        key={mod}
                        onClick={() => handleToggleModule(mod)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-violet-50/70 border-violet-300 text-violet-900"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 pointer-events-none"
                        />
                        <div className="flex items-center gap-2">
                          {MODULE_ICONS[mod]}
                          <span>{MODULE_SIDEBAR_LABELS[mod]}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Actions Permissions */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="block text-xs font-semibold text-gray-800">
                    สิทธิ์การดำเนินงาน (Actions)
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectAllActions}
                      className="text-violet-600 hover:underline"
                    >
                      เลือกทั้งหมด
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearActions}
                      className="text-gray-500 hover:underline"
                    >
                      ล้าง
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(["view", "create", "edit", "delete"] as Action[]).map((act) => {
                    const isChecked = formData.actions.includes(act);
                    return (
                      <label
                        key={act}
                        onClick={() => handleToggleAction(act)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-violet-50/70 border-violet-300 text-violet-900"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 mt-0.5 text-violet-600 rounded focus:ring-violet-500 pointer-events-none"
                        />
                        <div>
                          <div className="font-semibold text-gray-800">
                            {ACTION_LABELS[act].label}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {ACTION_LABELS[act].desc}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึก Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteModalOpen && roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">ยืนยันการลบ Role?</h3>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              คุณต้องการลบ Role <strong className="text-gray-900 font-bold">{roleToDelete.name}</strong> ออกจากระบบใช่หรือไม่?
              {userCountsByRole[roleToDelete.name] ? (
                <span className="block mt-2 text-amber-600 font-medium">
                  ⚠️ ปัจจุบันมีผู้ใช้งาน {userCountsByRole[roleToDelete.name]} คน ที่ถือ Role นี้อยู่
                </span>
              ) : null}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteRole}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "กำลังลบ..." : "ยืนยันลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
