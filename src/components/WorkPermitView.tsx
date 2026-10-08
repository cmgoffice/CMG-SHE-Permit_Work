import React, { useState, useEffect, useMemo } from "react";
import { onSnapshot } from "firebase/firestore";
import { masterDataRef } from "../firebase";
import WorkPermitForm from "./WorkPermitForm";
import {
  Download,
  SlidersHorizontal,
  Plus,
  Search,
  RotateCcw,
  Calendar,
  Pencil,
  Trash2,
  MoreVertical,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Lock,
  XCircle,
  Clock,
  Settings,
  FileCheck,
  Hourglass,
  UserCog,
  FileText,
  AlertCircle,
  Eye,
} from "lucide-react";

export interface WorkPermitItem {
  id: string;
  code: string;
  status: "closed" | "rejected" | "pending" | "in_progress" | "draft" | "returned" | "request_close" | "request_extension" | "change_supervisor";
  statusLabel: string;
  approvers: { current: number; total: number };
  startDate: string;
  permitType: string;
  description: string;
  subPermit: string;
  location: string;
  company: string;
  isMyPermit?: boolean;
}

const INITIAL_PERMITS: WorkPermitItem[] = [
  {
    id: "1",
    code: "PTTLNG-T1-26-HW-26577",
    status: "closed",
    statusLabel: "ปิดใบงาน",
    approvers: { current: 3, total: 3 },
    startDate: "07/10/26 08:00",
    permitType: "ใบอนุญาตทำงานที่มีความร้อน (Hot Work)",
    description: "1. ติดตั้งซัพพอร์ทท่อ 2. ซ่อมแซมติดตั้งไฟที่จะหล่นในห้องประชุม",
    subPermit: "-",
    location: "LMPT1 (พื้นที่นอกกระบวนการผลิต (สำนักงาน))",
    company: "บริษัท ปตท. จำกัด (มหาชน)",
    isMyPermit: true,
  },
  {
    id: "2",
    code: "PTTLNG-T1-26-HW-24972",
    status: "closed",
    statusLabel: "ปิดใบงาน",
    approvers: { current: 3, total: 3 },
    startDate: "23/09/26 08:00",
    permitType: "ใบอนุญาตทำงานที่มีความร้อน (Hot Work)",
    description: "งานรื้อฝ้าเพดาน และเช็คท่อน้ำ",
    subPermit: "-",
    location: "LMPT1 (พื้นที่นอกกระบวนการผลิต (สำนักงาน))",
    company: "บริษัท ปตท. จำกัด (มหาชน)",
    isMyPermit: true,
  },
  {
    id: "3",
    code: "PTTLNG-T1-26-HW-05608",
    status: "rejected",
    statusLabel: "ไม่อนุมัติ",
    approvers: { current: 0, total: 4 },
    startDate: "23/09/26 08:00",
    permitType: "ใบอนุญาตทำงานที่มีความร้อน (Hot Work)",
    description: "เช็คระบบท่อน้ำ/เปลี่ยนวาล์วท่อน้ำ",
    subPermit: "-",
    location: "LMPT1 (พื้นที่นอกกระบวนการผลิต (สำนักงาน))",
    company: "บริษัท ปตท. จำกัด (มหาชน)",
    isMyPermit: false,
  },
  {
    id: "4",
    code: "PTTLNG-T1-26-CW-07738",
    status: "closed",
    statusLabel: "ปิดใบงาน",
    approvers: { current: 3, total: 3 },
    startDate: "21/09/26 08:00",
    permitType: "ใบอนุญาตทำงานทั่วไป",
    description: "เปลี่ยนสายชำระ/เช็คระบบโถฉี่/งานสุขภัณฑ์",
    subPermit: "-",
    location: "LMPT1 (พื้นที่นอกกระบวนการผลิต (สำนักงาน))",
    company: "บริษัท ปตท. จำกัด (มหาชน)",
    isMyPermit: true,
  },
  {
    id: "5",
    code: "PTTLNG-T1-26-CW-07500",
    status: "closed",
    statusLabel: "ปิดใบงาน",
    approvers: { current: 3, total: 3 },
    startDate: "11/09/26 08:00",
    permitType: "ใบอนุญาตทำงานทั่วไป",
    description: "เปลี่ยนสายชำระ/เช็คระบบโถฉี่/งานสุขภัณฑ์",
    subPermit: "-",
    location: "LMPT1 (พื้นที่นอกกระบวนการผลิต (สำนักงาน))",
    company: "บริษัท ปตท. จำกัด (มหาชน)",
    isMyPermit: true,
  },
];

export default function WorkPermitView() {
  const [viewMode, setViewMode] = useState<"list" | "create">("list");
  // Top nav sub tabs
  const [topTab, setTopTab] = useState<"Monitor" | "Work Permit" | "Sub Permit" | "JSEA" | "Vehicle Permit">("Work Permit");

  // Filter states
  const [isMyPermitOnly, setIsMyPermitOnly] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [selectedPermitType, setSelectedPermitType] = useState("All");
  const [selectedSubPermit, setSelectedSubPermit] = useState("All");
  const [selectedArea, setSelectedArea] = useState("All");
  const [dateFilterType, setDateFilterType] = useState<"today" | "custom">("custom");
  const [dateRange, setDateRange] = useState("08/09/26 - 08/11/26");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("all");

  // Items and pagination
  const [permits, setPermits] = useState<WorkPermitItem[]>(INITIAL_PERMITS);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Dynamic Master Data options from Database
  const [masterCompanies, setMasterCompanies] = useState<string[]>([
    "บริษัท ปตท. จำกัด (มหาชน)",
    "บริษัท ซีเอ็มจี คอนสตรัคชั่น จำกัด",
    "ห้างหุ้นส่วนจำกัด ไทยเซฟตี้ เซอร์วิส",
  ]);
  const [masterWorkTypes, setMasterWorkTypes] = useState<string[]>([
    "ใบอนุญาตทำงานที่มีความร้อน (Hot Work)",
    "ใบอนุญาตทำงานทั่วไป (General / Cold Work)",
    "ใบอนุญาตทำงานในที่อับอากาศ (Confined Space)",
    "ใบอนุญาตทำงานบนที่สูง (Working at Height)",
  ]);
  const [masterSubPermits, setMasterSubPermits] = useState<string[]>([
    "การตัดแยกพลังงาน (LOTO)",
    "งานขุดและเจาะดิน (Excavation Work)",
    "การใช้งานรังสี (Radiation Work)",
  ]);
  const [masterAreas, setMasterAreas] = useState<string[]>([
    "LMPT1 (พื้นที่นอกกระบวนการผลิต (สำนักงาน))",
    "LMPT2 (พื้นที่กระบวนการผลิตหลัก (Process Area))",
    "LMPT3 (พื้นที่คลังสินค้าและจัดเก็บสารเคมี)",
  ]);

  useEffect(() => {
    try {
      const u1 = onSnapshot(masterDataRef("companies"), (snap) => {
        if (!snap.empty) {
          const list: string[] = [];
          snap.forEach((d) => {
            const data = d.data();
            if (data.status !== "Inactive" && data.name) list.push(data.name);
          });
          if (list.length) setMasterCompanies(list);
        }
      });
      const u2 = onSnapshot(masterDataRef("workTypes"), (snap) => {
        if (!snap.empty) {
          const list: string[] = [];
          snap.forEach((d) => {
            const data = d.data();
            if (data.status !== "Inactive" && data.name) list.push(data.name);
          });
          if (list.length) setMasterWorkTypes(list);
        }
      });
      const u3 = onSnapshot(masterDataRef("subPermits"), (snap) => {
        if (!snap.empty) {
          const list: string[] = [];
          snap.forEach((d) => {
            const data = d.data();
            if (data.status !== "Inactive" && data.name) list.push(data.name);
          });
          if (list.length) setMasterSubPermits(list);
        }
      });
      const u4 = onSnapshot(masterDataRef("areas"), (snap) => {
        if (!snap.empty) {
          const list: string[] = [];
          snap.forEach((d) => {
            const data = d.data();
            if (data.status !== "Inactive" && data.name) list.push(data.name);
          });
          if (list.length) setMasterAreas(list);
        }
      });
      return () => {
        u1();
        u2();
        u3();
        u4();
      };
    } catch {
      // offline fallback
    }
  }, []);

  // Status counters
  const counts = useMemo(() => {
    return {
      all: permits.length,
      draft: permits.filter((p) => p.status === "draft").length,
      pending: permits.filter((p) => p.status === "pending").length,
      returned: permits.filter((p) => p.status === "returned").length,
      in_progress: permits.filter((p) => p.status === "in_progress").length,
      rejected: permits.filter((p) => p.status === "rejected").length,
      request_close: permits.filter((p) => p.status === "request_close").length,
      closed: permits.filter((p) => p.status === "closed").length,
      request_extension: permits.filter((p) => p.status === "request_extension").length,
      change_supervisor: permits.filter((p) => p.status === "change_supervisor").length,
    };
  }, [permits]);

  // Filtered list
  const filteredPermits = useMemo(() => {
    return permits.filter((p) => {
      if (isMyPermitOnly && !p.isMyPermit) return false;
      if (activeStatusFilter !== "all" && p.status !== activeStatusFilter) return false;
      if (selectedCompany !== "All" && p.company !== selectedCompany) return false;
      if (selectedPermitType !== "All" && !p.permitType.includes(selectedPermitType)) return false;
      if (selectedArea !== "All" && !p.location.includes(selectedArea)) return false;
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchCode = p.code.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchType = p.permitType.toLowerCase().includes(q);
        const matchLoc = p.location.toLowerCase().includes(q);
        if (!matchCode && !matchDesc && !matchType && !matchLoc) return false;
      }
      return true;
    });
  }, [permits, isMyPermitOnly, activeStatusFilter, selectedCompany, selectedPermitType, selectedArea, searchKeyword]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedCompany("All");
    setSelectedPermitType("All");
    setSelectedSubPermit("All");
    setSelectedArea("All");
    setDateFilterType("custom");
    setSearchKeyword("");
    setActiveStatusFilter("all");
    setIsMyPermitOnly(false);
  };

  const handleDeletePermit = (id: string) => {
    if (window.confirm("คุณต้องการลบรายการ Work Permit นี้ใช่หรือไม่?")) {
      setPermits((prev) => prev.filter((p) => p.id !== id));
    }
  };

  if (viewMode === "create") {
    return (
      <WorkPermitForm
        onBack={() => setViewMode("list")}
        onSubmitSuccess={(newPermit) => {
          setPermits((prev) => [newPermit, ...prev]);
          setViewMode("list");
        }}
      />
    );
  }

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen text-slate-800 font-sans pb-16">
      {/* 1. TOP SUB-TABS NAVIGATION */}
      <div className="bg-white border-b border-gray-200 px-6 sm:px-8">
        <div className="flex items-center space-x-8 text-sm">
          {(["Monitor", "Work Permit", "Sub Permit", "JSEA", "Vehicle Permit"] as const).map((tab) => {
            const isActive = topTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setTopTab(tab)}
                className={`py-3.5 px-2 font-medium transition-colors relative whitespace-nowrap ${
                  isActive
                    ? "text-blue-600 font-semibold"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 rounded-t-sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 sm:p-5 lg:p-6 space-y-4">
        {/* 2. TITLE BAR & MAIN ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              รายละเอียด Work Permit
            </h1>
            <label className="inline-flex items-center gap-2 cursor-pointer ml-3 select-none">
              <input
                type="radio"
                name="permitScope"
                checked={isMyPermitOnly}
                onChange={() => setIsMyPermitOnly(!isMyPermitOnly)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700">งานของฉัน</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            {/* Export / Download */}
            <button
              type="button"
              title="ส่งออกข้อมูล"
              className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* View / Filter Config */}
            <button
              type="button"
              title="ตั้งค่ามุมมอง"
              className="w-10 h-10 flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm transition-colors"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>

            {/* + Work Permit Button */}
            <button
              type="button"
              onClick={() => setViewMode("create")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Work Permit</span>
            </button>
          </div>
        </div>

        {/* 3. FILTER CONTROLS ROW */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
            {/* บริษัท */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">บริษัท</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">เลือกทั้งหมด</option>
                {masterCompanies.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* ประเภทงาน */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">ประเภทงาน</label>
              <select
                value={selectedPermitType}
                onChange={(e) => setSelectedPermitType(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">เลือกทั้งหมด</option>
                {masterWorkTypes.map((wt, i) => (
                  <option key={i} value={wt}>{wt}</option>
                ))}
              </select>
            </div>

            {/* ใบงานย่อย */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">ใบงานย่อย</label>
              <select
                value={selectedSubPermit}
                onChange={(e) => setSelectedSubPermit(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">เลือกทั้งหมด</option>
                <option value="-">-</option>
                {masterSubPermits.map((sp, i) => (
                  <option key={i} value={sp}>{sp}</option>
                ))}
              </select>
            </div>

            {/* พื้นที่ */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">พื้นที่</label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">เลือกทั้งหมด</option>
                {masterAreas.map((a, i) => (
                  <option key={i} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* วันที่ และ Datepicker */}
            <div className="lg:col-span-4 flex flex-col gap-1">
              <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={dateFilterType === "today"}
                    onChange={() => setDateFilterType("today")}
                    className="w-3.5 h-3.5 text-blue-600"
                  />
                  <span>วันนี้</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={dateFilterType === "custom"}
                    onChange={() => setDateFilterType("custom")}
                    className="w-3.5 h-3.5 text-blue-600"
                  />
                  <span>เลือกวันที่</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-9 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar Sub-row */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="ค้นหาเลขที่ใบงาน, รายละเอียด..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>

            {/* Reset / Clear Button (Red) */}
            <button
              type="button"
              onClick={handleResetFilters}
              title="ล้างค่าตัวกรอง"
              className="w-10 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-colors flex-shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Search Button (Blue) */}
            <button
              type="button"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex-shrink-0"
            >
              ค้นหา
            </button>
          </div>
        </div>

        {/* 4. STATUS COUNTERS / TABS BAR */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs sm:text-sm">
          {/* งานทั้งหมด */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("all")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors ${
              activeStatusFilter === "all"
                ? "border-purple-500 bg-purple-50 text-purple-700 font-semibold shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FileText className="w-4 h-4 text-purple-600" />
            <span>งานทั้งหมด</span>
            <span className="font-bold ml-0.5">{counts.all}</span>
          </button>

          {/* บันทึกร่าง */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("draft")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors ${
              activeStatusFilter === "draft"
                ? "border-gray-500 bg-gray-100 text-gray-800 font-semibold"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FileText className="w-4 h-4 text-gray-400" />
            <span>บันทึกร่าง</span>
            <span className="font-bold ml-0.5">{counts.draft}</span>
          </button>

          {/* รออนุมัติ */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("pending")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors ${
              activeStatusFilter === "pending"
                ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Clock className="w-4 h-4 text-blue-500" />
            <span>รออนุมัติ</span>
            <span className="font-bold ml-0.5">{counts.pending}</span>
          </button>

          {/* ส่งกลับไปแก้ไข */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("returned")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors ${
              activeStatusFilter === "returned"
                ? "border-amber-500 bg-amber-50 text-amber-700 font-semibold"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <RotateCcw className="w-4 h-4 text-amber-500" />
            <span>ส่งกลับไปแก้ไข</span>
            <span className="font-bold ml-0.5">{counts.returned}</span>
          </button>

          {/* ระหว่างปฏิบัติงาน */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("in_progress")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors ${
              activeStatusFilter === "in_progress"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Settings className="w-4 h-4 text-emerald-600" />
            <span>ระหว่างปฏิบัติงาน</span>
            <span className="font-bold ml-0.5">{counts.in_progress}</span>
          </button>

          {/* ไม่อนุมัติ */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("rejected")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors ${
              activeStatusFilter === "rejected"
                ? "border-red-500 bg-red-50 text-red-700 font-semibold"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <XCircle className="w-4 h-4 text-red-500" />
            <span>ไม่อนุมัติ</span>
            <span className="font-bold ml-0.5">{counts.rejected}</span>
          </button>

          {/* ขอปิดใบงาน */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("request_close")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors ${
              activeStatusFilter === "request_close"
                ? "border-orange-500 bg-orange-50 text-orange-700 font-semibold"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FileCheck className="w-4 h-4 text-orange-500" />
            <span>ขอปิดใบงาน</span>
            <span className="font-bold ml-0.5">{counts.request_close}</span>
          </button>

          {/* ปิดใบงาน */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("closed")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors ${
              activeStatusFilter === "closed"
                ? "border-red-600 bg-red-50 text-red-700 font-semibold"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Lock className="w-4 h-4 text-red-600" />
            <span>ปิดใบงาน</span>
            <span className="font-bold ml-0.5">{counts.closed}</span>
          </button>

          {/* ขอต่อเวลา */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("request_extension")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors ${
              activeStatusFilter === "request_extension"
                ? "border-gray-500 bg-gray-100 text-gray-800 font-semibold"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Hourglass className="w-4 h-4 text-gray-400" />
            <span>ขอต่อเวลา</span>
            <span className="font-bold ml-0.5">{counts.request_extension}</span>
          </button>

          {/* เปลี่ยนผู้ควบคุมงาน */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("change_supervisor")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors ${
              activeStatusFilter === "change_supervisor"
                ? "border-orange-500 bg-orange-50 text-orange-700 font-semibold"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <UserCog className="w-4 h-4 text-orange-500" />
            <span>เปลี่ยนผู้ควบคุมงาน</span>
            <span className="font-bold ml-0.5">{counts.change_supervisor}</span>
          </button>
        </div>

        {/* 5. DATA TABLE */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
              {/* Table Header (Deep Royal Blue) */}
              <thead className="bg-[#1b55b8] text-white select-none">
                <tr>
                  <th className="py-3 px-3 font-semibold text-center w-24">จัดการ</th>
                  <th className="py-3 px-3 font-semibold w-48">สถานะรายการ</th>
                  <th className="py-3 px-3 font-semibold w-36">วันที่เริ่มปฏิบัติงาน</th>
                  <th className="py-3 px-3 font-semibold w-48">รหัส</th>
                  <th className="py-3 px-3 font-semibold w-56">ประเภทใบงาน</th>
                  <th className="py-3 px-3 font-semibold">รายละเอียดงาน</th>
                  <th className="py-3 px-3 font-semibold text-center w-24">ใบงานย่อย</th>
                  <th className="py-3 px-3 font-semibold w-56">พื้นที่</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredPermits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      ไม่พบข้อมูลใบงาน Work Permit ตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredPermits.map((item) => {
                    const isClosed = item.status === "closed";
                    const isRejected = item.status === "rejected";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/40 transition-colors relative group"
                        onMouseEnter={() => setHoveredRowId(item.id)}
                        onMouseLeave={() => setHoveredRowId(null)}
                      >
                        {/* 1. จัดการ (Actions) */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-gray-400">
                            {/* Pencil / Edit */}
                            <button
                              type="button"
                              title="แก้ไข"
                              className="p-1 hover:text-blue-600 transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-blue-500" />
                            </button>

                            {/* Trash / Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeletePermit(item.id)}
                              title="ลบ"
                              className="p-1 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                            </button>

                            {/* More Options */}
                            <button
                              type="button"
                              title="ตัวเลือกเพิ่มเติม"
                              className="p-1 hover:text-gray-700 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        </td>

                        {/* 2. สถานะรายการ (Status) */}
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-between gap-2 max-w-[170px]">
                            {/* Status label with icon */}
                            <div className="flex items-center gap-1.5">
                              {isClosed ? (
                                <Lock className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                              ) : isRejected ? (
                                <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              )}
                              <span
                                className={`text-xs font-semibold ${
                                  isClosed
                                    ? "text-red-700"
                                    : isRejected
                                    ? "text-red-600"
                                    : "text-blue-600"
                                }`}
                              >
                                {item.statusLabel}
                              </span>
                            </div>

                            {/* Approvers count badge */}
                            <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
                              <span className={item.approvers.current === item.approvers.total ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                                {item.approvers.current}/{item.approvers.total}
                              </span>
                              <Users className="w-3 h-3 text-gray-400" />
                            </div>
                          </div>
                        </td>

                        {/* 3. วันที่เริ่มปฏิบัติงาน */}
                        <td className="py-3 px-3 text-gray-700 font-normal whitespace-nowrap">
                          {item.startDate}
                        </td>

                        {/* 4. รหัส */}
                        <td className="py-3 px-3 font-medium text-gray-900 tracking-tight whitespace-nowrap">
                          {item.code}
                        </td>

                        {/* 5. ประเภทใบงาน */}
                        <td className="py-3 px-3 text-gray-700 truncate max-w-[220px]" title={item.permitType}>
                          {item.permitType}
                        </td>

                        {/* 6. รายละเอียดงาน */}
                        <td className="py-3 px-3 text-gray-700 relative max-w-[280px]">
                          <div className="truncate" title={item.description}>
                            {item.description}
                          </div>

                          {/* Hover Tooltip (Matching image tooltip example) */}
                          {hoveredRowId === item.id && (
                            <div className="absolute left-3 top-full -mt-1 z-30 hidden group-hover:block bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded shadow-lg whitespace-nowrap pointer-events-none">
                              {item.description}
                            </div>
                          )}
                        </td>

                        {/* 7. ใบงานย่อย */}
                        <td className="py-3 px-3 text-center text-gray-500 font-medium">
                          {item.subPermit}
                        </td>

                        {/* 8. พื้นที่ */}
                        <td className="py-3 px-3 text-gray-600 truncate max-w-[220px]" title={item.location}>
                          {item.location}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 6. PAGINATION FOOTER */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-6 px-6 py-3 border-t border-gray-200 bg-white text-xs text-gray-600">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <span>Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Total items info */}
            <div>
              1 - {filteredPermits.length} of {filteredPermits.length}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1 text-gray-500">
              <button
                type="button"
                disabled={currentPage === 1}
                className="p-1 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="หน้าแรก"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={currentPage === 1}
                className="p-1 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled
                className="p-1 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="หน้าถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled
                className="p-1 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="หน้าสุดท้าย"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
