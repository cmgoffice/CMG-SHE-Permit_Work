import React, { useState, useEffect, useMemo } from "react";
import {
  Database,
  Building2,
  Briefcase,
  FileSpreadsheet,
  MapPin,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  Download,
  AlertCircle,
} from "lucide-react";
import { onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { masterDataRef, masterDataDoc } from "../firebase";

export type MasterCategory = "companies" | "workTypes" | "subPermits" | "areas";

export interface MasterItem {
  id: string;
  name: string;
  code?: string;
  detail?: string;
  extra?: string; // contact for company, riskLevel for area, etc.
  status: "Active" | "Inactive";
  createdAt?: string;
}

const CATEGORY_CONFIG: Record<
  MasterCategory,
  {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    nameLabel: string;
    codeLabel: string;
    detailLabel: string;
    extraLabel?: string;
    extraOptions?: string[];
    namePlaceholder: string;
    codePlaceholder: string;
    detailPlaceholder: string;
    extraPlaceholder?: string;
  }
> = {
  companies: {
    title: "บริษัท",
    icon: Building2,
    nameLabel: "ชื่อบริษัท / ผู้รับเหมา",
    codeLabel: "รหัสบริษัท",
    detailLabel: "ผู้ประสานงาน / หมายเหตุ",
    extraLabel: "เบอร์ติดต่อ",
    namePlaceholder: "เช่น บริษัท ปตท. จำกัด (มหาชน)",
    codePlaceholder: "เช่น PTT-01",
    detailPlaceholder: "รายละเอียดหรือผู้ประสานงานหลัก",
    extraPlaceholder: "เช่น 02-537-2000",
  },
  workTypes: {
    title: "ประเภทงาน",
    icon: Briefcase,
    nameLabel: "ชื่อประเภทงาน",
    codeLabel: "รหัสย่อ",
    detailLabel: "รายละเอียดประเภทงาน",
    extraLabel: "อายุใบงาน (ชม.)",
    namePlaceholder: "เช่น งานที่มีความร้อน (Hot Work)",
    codePlaceholder: "เช่น HW",
    detailPlaceholder: "ขอบเขตและลักษณะงาน",
    extraPlaceholder: "เช่น 8 ชม.",
  },
  subPermits: {
    title: "ใบงานย่อย",
    icon: FileSpreadsheet,
    nameLabel: "ชื่อใบงานย่อย",
    codeLabel: "รหัสย่อ",
    detailLabel: "รายละเอียดใบงานย่อย",
    extraLabel: "ประเภทงานหลักที่เกี่ยวข้อง",
    namePlaceholder: "เช่น การตัดแยกพลังงาน (LOTO)",
    codePlaceholder: "เช่น SP-LOTO",
    detailPlaceholder: "คำอธิบายขั้นตอนหรือข้อกำหนดของใบงานย่อย",
    extraPlaceholder: "เช่น งานซ่อมบำรุงระบบไฟฟ้า",
  },
  areas: {
    title: "พื้นที่",
    icon: MapPin,
    nameLabel: "ชื่อพื้นที่ / จุดปฏิบัติงาน",
    codeLabel: "รหัสพื้นที่",
    detailLabel: "อาคาร / โซน",
    extraLabel: "ระดับความเสี่ยง",
    extraOptions: ["ต่ำ", "ปานกลาง", "สูง", "สูงมาก"],
    namePlaceholder: "เช่น LMPT1 (พื้นที่นอกกระบวนการผลิต)",
    codePlaceholder: "เช่น LMPT1",
    detailPlaceholder: "เช่น อาคารสำนักงาน / Admin Building",
  },
};

const INITIAL_DEFAULT_DATA: Record<MasterCategory, MasterItem[]> = {
  companies: [
    { id: "comp-1", name: "บริษัท ปตท. จำกัด (มหาชน)", code: "PTT-01", extra: "02-537-2000", detail: "สำนักงานใหญ่", status: "Active" },
    { id: "comp-2", name: "บริษัท ซีเอ็มจี คอนสตรัคชั่น จำกัด", code: "CON-02", extra: "038-123-456", detail: "ผู้รับเหมาหลักงานโยธา", status: "Active" },
    { id: "comp-3", name: "ห้างหุ้นส่วนจำกัด ไทยเซฟตี้ เซอร์วิส", code: "SUB-03", extra: "081-987-6543", detail: "งานความปลอดภัยและตรวจสอบ", status: "Active" },
  ],
  workTypes: [
    { id: "wt-1", name: "ใบอนุญาตทำงานที่มีความร้อน (Hot Work)", code: "HW", extra: "8", detail: "งานเชื่อม เจียร ตัด หรือทำให้เกิดประกายไฟ", status: "Active" },
    { id: "wt-2", name: "ใบอนุญาตทำงานทั่วไป (General / Cold Work)", code: "CW", extra: "8", detail: "งานซ่อมบำรุงทั่วไปที่ไม่เกิดประกายไฟ", status: "Active" },
    { id: "wt-3", name: "ใบอนุญาตทำงานในที่อับอากาศ (Confined Space)", code: "CSE", extra: "4", detail: "งานภายในบ่อ ถัง ท่อ ที่มีการระบายอากาศจำกัด", status: "Active" },
    { id: "wt-4", name: "ใบอนุญาตทำงานบนที่สูง (Working at Height)", code: "WAH", extra: "8", detail: "งานที่ระดับความสูงเกิน 2 เมตรขึ้นไป", status: "Active" },
  ],
  subPermits: [
    { id: "sp-1", name: "การตัดแยกพลังงาน (LOTO)", code: "LOTO", extra: "งานระบบไฟฟ้า/เครื่องกล", detail: "Lockout & Tagout ก่อนเริ่มปฏิบัติงาน", status: "Active" },
    { id: "sp-2", name: "งานขุดและเจาะดิน (Excavation Work)", code: "EXC", extra: "งานโยธา", detail: "งานขุดลึกเกิน 1.5 เมตร", status: "Active" },
    { id: "sp-3", name: "การใช้งานรังสี (Radiation Work)", code: "RAD", extra: "งาน NDT", detail: "งานตรวจสอบแนวเชื่อมด้วยรังสี", status: "Active" },
  ],
  areas: [
    { id: "area-1", name: "LMPT1 (พื้นที่นอกกระบวนการผลิต (สำนักงาน))", code: "LMPT1", extra: "ต่ำ", detail: "อาคารสำนักงานและบริเวณโดยรอบ", status: "Active" },
    { id: "area-2", name: "LMPT2 (พื้นที่กระบวนการผลิตหลัก (Process Area))", code: "LMPT2", extra: "สูงมาก", detail: "หน่วยกลั่นและระบบท่อส่งสารเคมี", status: "Active" },
    { id: "area-3", name: "LMPT3 (พื้นที่คลังสินค้าและจัดเก็บสารเคมี)", code: "LMPT3", extra: "สูง", detail: "Warehouse โซนจัดเก็บวัตถุไวไฟ", status: "Active" },
  ],
};

export default function DatabaseView() {
  const [activeCategory, setActiveCategory] = useState<MasterCategory>("companies");
  const [dataStore, setDataStore] = useState<Record<MasterCategory, MasterItem[]>>(INITIAL_DEFAULT_DATA);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDetail, setFormDetail] = useState("");
  const [formExtra, setFormExtra] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");
  const [formError, setFormError] = useState("");

  // Sync with Firestore for active category
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        masterDataRef(activeCategory),
        (snap) => {
          if (!snap.empty) {
            const list: MasterItem[] = [];
            snap.forEach((d) => {
              const data = d.data();
              list.push({
                id: d.id,
                name: data.name || "",
                code: data.code || "",
                detail: data.detail || "",
                extra: data.extra || "",
                status: data.status || "Active",
                createdAt: data.createdAt || "",
              });
            });
            setDataStore((prev) => ({ ...prev, [activeCategory]: list }));
          }
        },
        (err) => {
          console.warn(`Firestore onSnapshot for master_${activeCategory} failed, using local:`, err);
        }
      );
      return () => unsub();
    } catch {
      // Offline fallback
    }
  }, [activeCategory]);

  const currentConfig = CATEGORY_CONFIG[activeCategory];
  const items = dataStore[activeCategory] || [];

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.detail && item.detail.toLowerCase().includes(q)) ||
        (item.extra && item.extra.toLowerCase().includes(q))
    );
  }, [items, searchTerm]);

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormName("");
    setFormCode("");
    setFormDetail("");
    setFormExtra(currentConfig.extraOptions ? currentConfig.extraOptions[0] : "");
    setFormStatus("Active");
    setFormError("");
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: MasterItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCode(item.code || "");
    setFormDetail(item.detail || "");
    setFormExtra(item.extra || "");
    setFormStatus(item.status);
    setFormError("");
    setIsModalOpen(true);
  };

  // Save Item (Add or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError(`กรุณาระบุ${currentConfig.nameLabel}`);
      return;
    }

    setIsSaving(true);
    const id = editingItem ? editingItem.id : `id_${Date.now()}`;
    const payload: MasterItem = {
      id,
      name: formName.trim(),
      code: formCode.trim(),
      detail: formDetail.trim(),
      extra: formExtra.trim(),
      status: formStatus,
      createdAt: editingItem?.createdAt || new Date().toISOString(),
    };

    try {
      // 1. Update in Firestore
      await setDoc(masterDataDoc(activeCategory, id), payload, { merge: true });
    } catch (err) {
      console.warn("Save to Firestore failed, saving locally:", err);
    }

    // 2. Update local state immediately
    setDataStore((prev) => {
      const existing = prev[activeCategory] || [];
      const updated = editingItem
        ? existing.map((i) => (i.id === id ? payload : i))
        : [payload, ...existing];
      return { ...prev, [activeCategory]: updated };
    });

    setIsSaving(false);
    setIsModalOpen(false);
  };

  // Delete Item
  const handleDelete = async (item: MasterItem) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายการ "${item.name}"?`)) return;

    try {
      await deleteDoc(masterDataDoc(activeCategory, item.id));
    } catch (err) {
      console.warn("Delete from Firestore failed, deleting locally:", err);
    }

    setDataStore((prev) => ({
      ...prev,
      [activeCategory]: (prev[activeCategory] || []).filter((i) => i.id !== item.id),
    }));
  };

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen text-slate-800 font-sans pb-16">
      {/* 1. Header Card */}
      <div className="bg-white border-b border-gray-200 px-6 sm:px-8 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-100 text-cyan-700 rounded-xl flex-shrink-0">
              <Database size={26} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                ฐานข้อมูลหลัก (Database Master)
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                จัดการข้อมูลหลักสำหรับนำไปใช้ในตัวเลือกของระบบ Work Permit (บริษัท, ประเภทงาน, ใบงานย่อย, พื้นที่)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ปุ่มเพิ่มข้อมูลใหม่ */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>เพิ่มข้อมูล{currentConfig.title}</span>
            </button>
          </div>
        </div>

        {/* 2. Sub-Tabs (บริษัท, ประเภทงาน, ใบงานย่อย, พื้นที่) */}
        <div className="flex items-center gap-2 mt-6 border-b border-gray-100 overflow-x-auto pb-px">
          {(["companies", "workTypes", "subPermits", "areas"] as MasterCategory[]).map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.icon;
            const isActive = activeCategory === cat;
            const count = (dataStore[cat] || []).length;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCategory(cat);
                  setSearchTerm("");
                }}
                className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-blue-600 text-blue-700 font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                <span>{cfg.title}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? "bg-blue-100 text-blue-700 font-bold" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        {/* 3. Search and Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder={`ค้นหาในตาราง ${currentConfig.title}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>

          <div className="text-xs text-gray-500">
            แสดงทั้งหมด <strong>{filteredItems.length}</strong> รายการ
          </div>
        </div>

        {/* 4. Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[750px]">
              <thead className="bg-[#1b55b8] text-white">
                <tr>
                  <th className="py-3 px-4 font-semibold w-24 text-center">จัดการ</th>
                  <th className="py-3 px-4 font-semibold w-36">{currentConfig.codeLabel}</th>
                  <th className="py-3 px-4 font-semibold">{currentConfig.nameLabel}</th>
                  {currentConfig.extraLabel && (
                    <th className="py-3 px-4 font-semibold w-44">{currentConfig.extraLabel}</th>
                  )}
                  <th className="py-3 px-4 font-semibold">{currentConfig.detailLabel}</th>
                  <th className="py-3 px-4 font-semibold w-28 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={currentConfig.extraLabel ? 6 : 5}
                      className="py-12 text-center text-gray-400"
                    >
                      ไม่พบข้อมูล {currentConfig.title} ในระบบ
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* จัดการ */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-400">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            title="แก้ไข"
                            className="p-1 hover:text-blue-600 transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-blue-500" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            title="ลบ"
                            className="p-1 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </td>

                      {/* รหัส */}
                      <td className="py-3 px-4 font-medium text-blue-700 whitespace-nowrap">
                        {item.code || "-"}
                      </td>

                      {/* ชื่อ */}
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {item.name}
                      </td>

                      {/* ข้อมูลเสริม (Extra) */}
                      {currentConfig.extraLabel && (
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                          {activeCategory === "areas" ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                item.extra === "สูงมาก"
                                  ? "bg-red-100 text-red-800"
                                  : item.extra === "สูง"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {item.extra || "ต่ำ"}
                            </span>
                          ) : (
                            item.extra || "-"
                          )}
                        </td>
                      )}

                      {/* รายละเอียด */}
                      <td className="py-3 px-4 text-gray-600 max-w-[280px] truncate" title={item.detail}>
                        {item.detail || "-"}
                      </td>

                      {/* สถานะ */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === "Active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.status === "Active" ? "ใช้งาน" : "ระงับ"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. MODAL FORM DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  {React.createElement(currentConfig.icon, { className: "w-5 h-5" })}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    {editingItem ? `แก้ไขข้อมูล${currentConfig.title}` : `เพิ่มข้อมูล${currentConfig.title}ใหม่`}
                  </h3>
                  <p className="text-xs text-gray-500">
                    กรอกข้อมูลสำหรับใช้เป็นตัวเลือกในระบบ Work Permit
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSave}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Name field (Required) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {currentConfig.nameLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (formError) setFormError("");
                    }}
                    placeholder={currentConfig.namePlaceholder}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Code field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {currentConfig.codeLabel}
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder={currentConfig.codePlaceholder}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Extra field if configured */}
                {currentConfig.extraLabel && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {currentConfig.extraLabel}
                    </label>
                    {currentConfig.extraOptions ? (
                      <select
                        value={formExtra}
                        onChange={(e) => setFormExtra(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {currentConfig.extraOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formExtra}
                        onChange={(e) => setFormExtra(e.target.value)}
                        placeholder={currentConfig.extraPlaceholder}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                )}

                {/* Detail field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {currentConfig.detailLabel}
                  </label>
                  <textarea
                    rows={2}
                    value={formDetail}
                    onChange={(e) => setFormDetail(e.target.value)}
                    placeholder={currentConfig.detailPlaceholder}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Status Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    สถานะการใช้งาน
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="itemStatus"
                        checked={formStatus === "Active"}
                        onChange={() => setFormStatus("Active")}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>ใช้งาน (Active)</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-gray-500">
                      <input
                        type="radio"
                        name="itemStatus"
                        checked={formStatus === "Inactive"}
                        onChange={() => setFormStatus("Inactive")}
                        className="text-gray-400 focus:ring-gray-400"
                      />
                      <span>ระงับ (Inactive)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100 bg-gray-50/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingItem ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
