import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  FileText,
  Calendar,
  Clock,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  Upload,
  Check,
  File,
  X,
  AlertCircle,
} from "lucide-react";
import { onSnapshot } from "firebase/firestore";
import { masterDataRef, jsaDocumentsRef } from "../firebase";

interface VehicleItem {
  id: string;
  plate: string;
  brand: string;
  type: string;
  stickerVehicle: string;
  stickerProcess: string;
}

interface WorkPermitFormProps {
  onBack: () => void;
  onSubmitSuccess?: (newPermit: any) => void;
  initialData?: any;
}

export default function WorkPermitForm({ onBack, onSubmitSuccess }: WorkPermitFormProps) {
  // Radio: ทำงานภายใต้พื้นที่
  const [workAreaScope, setWorkAreaScope] = useState<"PTTLNG" | "PE LNG">("PTTLNG");

  // Basic Information
  const [permitType, setPermitType] = useState("");
  const [area, setArea] = useState("");
  const [areaType, setAreaType] = useState("");
  const [jsea, setJsea] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [workLocationDetail, setWorkLocationDetail] = useState("");

  // Dynamic Options from master data & JSA
  const [workTypeOptions, setWorkTypeOptions] = useState<string[]>([
    "ใบอนุญาตทำงานที่มีความร้อน (Hot Work)",
    "ใบอนุญาตทำงานทั่วไป (General / Cold Work)",
    "ใบอนุญาตทำงานในที่อับอากาศ (Confined Space)",
    "ใบอนุญาตทำงานบนที่สูง (Working at Height)",
  ]);
  const [areaOptions, setAreaOptions] = useState<string[]>([
    "LMPT1 (พื้นที่นอกกระบวนการผลิต (สำนักงาน))",
    "LMPT2 (พื้นที่กระบวนการผลิตหลัก (Process Area))",
    "LMPT3 (พื้นที่คลังสินค้าและจัดเก็บสารเคมี)",
  ]);
  const [jsaOptions, setJsaOptions] = useState<string[]>([
    "JSEA-001: งานบำรุงรักษาทั่วไป",
    "JSEA-002: งานตัดต่อและเชื่อมท่อ",
    "JSEA-003: งานติดตั้งนั่งร้านและงานบนที่สูง",
  ]);

  useEffect(() => {
    try {
      const u1 = onSnapshot(masterDataRef("work_types"), (snap) => {
        if (!snap.empty) {
          const list: string[] = [];
          snap.forEach((d) => {
            const data = d.data();
            if (data.status !== "Inactive" && data.name) list.push(data.name);
          });
          if (list.length) setWorkTypeOptions(list);
        }
      });
      const u2 = onSnapshot(masterDataRef("areas"), (snap) => {
        if (!snap.empty) {
          const list: string[] = [];
          snap.forEach((d) => {
            const data = d.data();
            if (data.status !== "Inactive" && data.name) list.push(data.name);
          });
          if (list.length) setAreaOptions(list);
        }
      });
      const u3 = onSnapshot(jsaDocumentsRef(), (snap) => {
        if (!snap.empty) {
          const list: string[] = [];
          snap.forEach((d) => {
            const data = d.data();
            const label = data.docNo ? `${data.docNo}: ${data.title || data.jobTitle || "JSA"}` : (data.title || data.jobTitle);
            if (label) list.push(label);
          });
          if (list.length) setJsaOptions(list);
        }
      });
      return () => {
        u1();
        u2();
        u3();
      };
    } catch {
      // offline fallback
    }
  }, []);

  // Dates & Times
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [workDurationDays, setWorkDurationDays] = useState("0");
  const [finishDate, setFinishDate] = useState("");

  // Contractor & Personnel
  const [contractorCompany, setContractorCompany] = useState("บริษัท ซีเอ็มจี เอ็นจิเนียริ่ง แอนด์ คอนสตรัคชั่น จำกัด");
  const [workerCount, setWorkerCount] = useState("");
  const [mocNo, setMocNo] = useState("");

  // Tools & Equipment
  const [inspectionEquipment, setInspectionEquipment] = useState("");
  const [generalTools, setGeneralTools] = useState("");

  // Objective / Work Description
  const [workObjective, setWorkObjective] = useState("");

  // Process system relation
  const [isProcessRelated, setIsProcessRelated] = useState<"not_related" | "related">("not_related");

  // Vehicles
  const [vehicles, setVehicles] = useState<VehicleItem[]>([
    { id: "1", plate: "", brand: "", type: "", stickerVehicle: "", stickerProcess: "" },
  ]);

  // Signatures / Personnel
  const [applicantName, setApplicantName] = useState("นส.เมทินี สนธิสุข");
  const [applicantCompany, setApplicantCompany] = useState("บริษัท ซีเอ็มจี เอ็นจิเนียริ่ง แอนด์ คอนสตรัคชั่น จำกัด");
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorCompany, setSupervisorCompany] = useState("");

  // Attachments Section Collapse state
  const [attachmentSectionOpen, setAttachmentSectionOpen] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Calculation for duration
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    calculateDays(val, endDate);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    calculateDays(startDate, val);
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) {
      setWorkDurationDays("0");
      return;
    }
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    setWorkDurationDays(diff > 0 ? String(diff) : "1");
  };

  // Vehicle handlers
  const handleAddVehicle = () => {
    setVehicles((prev) => [
      ...prev,
      { id: String(Date.now()), plate: "", brand: "", type: "", stickerVehicle: "", stickerProcess: "" },
    ]);
  };

  const handleDeleteVehicle = (id: string) => {
    if (vehicles.length <= 1) {
      setVehicles([{ id: "1", plate: "", brand: "", type: "", stickerVehicle: "", stickerProcess: "" }]);
      return;
    }
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const handleVehicleChange = (id: string, field: keyof VehicleItem, val: string) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: val } : v))
    );
  };

  // File Upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...filesArr]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation for fields with red mark (*)
  const isPermitTypeValid = Boolean(permitType && permitType.trim());
  const isAreaValid = Boolean(area && area.trim());
  const isAreaTypeValid = Boolean(areaType && areaType.trim());
  const isJseaValid = Boolean(jsea && jsea.trim() && jsea !== "ไม่พบข้อมูล");
  const isStartDateValid = Boolean(startDate && startDate.trim());
  const isStartTimeValid = Boolean(startTime && startTime.trim());
  const isEndTimeValid = Boolean(endTime && endTime.trim());
  const isWorkerCountValid = Boolean(workerCount && String(workerCount).trim() && Number(workerCount) > 0);
  const isWorkObjectiveValid = Boolean(workObjective && workObjective.trim());

  const missingFields: string[] = [];
  if (!isPermitTypeValid) missingFields.push("ประเภทใบอนุญาต");
  if (!isAreaValid) missingFields.push("พื้นที่");
  if (!isAreaTypeValid) missingFields.push("ประเภทพื้นที่");
  if (!isJseaValid) missingFields.push("JSEA");
  if (!isStartDateValid) missingFields.push("วันที่เริ่มปฏิบัติงาน");
  if (!isStartTimeValid) missingFields.push("เวลาเริ่มปฏิบัติงาน");
  if (!isEndTimeValid) missingFields.push("เวลาสิ้นสุดปฏิบัติงาน");
  if (!isWorkerCountValid) missingFields.push("จำนวนผู้ปฏิบัติงาน");
  if (!isWorkObjectiveValid) missingFields.push("รายละเอียดการทำงาน/วัตถุประสงค์");

  const isFormValid = missingFields.length === 0;

  // Submit draft or review
  const handleSubmit = (actionType: "draft" | "submit") => {
    if (actionType === "submit" && !isFormValid) {
      alert(`กรุณากรอกข้อมูลที่มีมาร์คสีแดง (*) ให้ครบถ้วนก่อนเสนอพิจารณา:\n\n• ${missingFields.join("\n• ")}`);
      return;
    }

    const newPermit = {
      id: `PTT-${Date.now()}`,
      code: `PTTLNG-T1-26-HW-${Math.floor(10000 + Math.random() * 90000)}`,
      status: actionType === "draft" ? "draft" : "pending",
      statusLabel: actionType === "draft" ? "บันทึกร่าง" : "รออนุมัติ",
      approvers: { current: 0, total: 3 },
      startDate: startDate ? `${startDate} ${startTime || "08:00"}` : "08/10/26 08:00",
      permitType: permitType || "ใบอนุญาตทำงานที่มีความร้อน (Hot Work)",
      description: workObjective || "รายละเอียดงาน",
      subPermit: "-",
      location: area || "LMPT1 (พื้นที่นอกกระบวนการผลิต)",
      company: contractorCompany,
      isMyPermit: true,
    };

    if (onSubmitSuccess) {
      onSubmitSuccess(newPermit);
    } else {
      alert(actionType === "draft" ? "บันทึกร่างเรียบร้อยแล้ว" : "ส่งเสนอพิจารณาเรียบร้อยแล้ว");
      onBack();
    }
  };

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen font-sans pb-24 text-slate-800">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-5 lg:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-xs"
          title="ย้อนกลับ"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
          Work Permit
        </h1>

        <div className="w-9" /> {/* Spacer */}
      </div>

      <div className="w-full px-3 sm:px-5 lg:px-6 py-5 space-y-5">
        {/* Tab pill: ข้อมูลใบอนุญาต */}
        <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-xs inline-block">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-purple-200 bg-purple-50/70 text-purple-700 font-medium text-xs sm:text-sm">
            <FileText className="w-4 h-4 text-purple-600" />
            <span>ข้อมูลใบอนุญาต</span>
          </div>
        </div>

        {/* SECTION 1: รายละเอียดงาน (Image 2 & 3) */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          {/* Section 1 Header: Solid Deep Blue */}
          <div className="bg-[#1955b8] text-white px-5 py-3 font-semibold text-sm flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-white text-[#1955b8] font-bold text-xs flex items-center justify-center">
              1
            </span>
            <span>รายละเอียดงาน</span>
          </div>

          <div className="p-5 sm:p-7 space-y-5">
            {/* ทำงานภายใต้พื้นที่ */}
            <div className="flex items-center gap-4 text-xs sm:text-sm font-medium text-gray-700">
              <span className="text-gray-900 font-semibold">ทำงานภายใต้พื้นที่</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="workAreaScope"
                  checked={workAreaScope === "PTTLNG"}
                  onChange={() => setWorkAreaScope("PTTLNG")}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>PTTLNG</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="workAreaScope"
                  checked={workAreaScope === "PE LNG"}
                  onChange={() => setWorkAreaScope("PE LNG")}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>PE LNG</span>
              </label>
            </div>

            {/* Row 1: ประเภทใบอนุญาต *, พื้นที่ *, ประเภทพื้นที่ * */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ประเภทใบอนุญาต <span className="text-red-500">*</span>
                </label>
                <select
                  value={permitType}
                  onChange={(e) => setPermitType(e.target.value)}
                  className="w-full bg-[#f4f7fc] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">เลือกประเภทใบอนุญาต</option>
                  {workTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  พื้นที่ <span className="text-red-500">*</span>
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full bg-[#f4f7fc] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">เลือกพื้นที่</option>
                  {areaOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ประเภทพื้นที่ <span className="text-red-500">*</span>
                </label>
                <select
                  value={areaType}
                  onChange={(e) => setAreaType(e.target.value)}
                  className="w-full bg-[#f4f7fc] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">เลือกประเภทพื้นที่</option>
                  <option value="พื้นที่ทั่วไป">พื้นที่ทั่วไป</option>
                  <option value="พื้นที่อันตราย">พื้นที่อันตราย</option>
                  <option value="พื้นที่ควบคุม">พื้นที่ควบคุม</option>
                </select>
              </div>
            </div>

            {/* Row 2: JSEA *, พื้นที่ปฏิบัติงาน, รายละเอียดพื้นที่ปฏิบัติงาน */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  JSEA <span className="text-red-500">*</span>
                </label>
                <select
                  value={jsea}
                  onChange={(e) => setJsea(e.target.value)}
                  className="w-full bg-[#f4f7fc] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">เลือก JSEA</option>
                  {jsaOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value="ไม่พบข้อมูล">ไม่พบข้อมูล</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  พื้นที่ปฏิบัติงาน
                </label>
                <select
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  className="w-full bg-[#f4f7fc] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">เลือกพื้นที่ปฏิบัติงาน</option>
                  <option value="Zone A">Zone A - บริเวณรอบอาคาร</option>
                  <option value="Zone B">Zone B - ห้องประชุม</option>
                  <option value="Zone C">Zone C - ฝ้าเพดาน/สุขภัณฑ์</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  รายละเอียดพื้นที่ปฏิบัติงาน
                </label>
                <input
                  type="text"
                  value={workLocationDetail}
                  onChange={(e) => setWorkLocationDetail(e.target.value)}
                  placeholder="รายละเอียดพื้นที่ปฏิบัติงาน"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Row 3: วันที่เริ่มปฏิบัติงาน *, วันที่สิ้นสุดปฏิบัติงาน, เวลาเริ่ม *, เวลาสิ้นสุด *, ระยะเวลา, วันที่สิ้นสุดงาน */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  วันที่เริ่มปฏิบัติงาน <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  วันที่สิ้นสุดปฏิบัติงาน
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  เวลาเริ่มปฏิบัติงาน <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="กรุณาเลือกเวลาเริ่ม"
                    className="w-full bg-[#f4f7fc] border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Clock className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  เวลาสิ้นสุดปฏิบัติงาน <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="กรุณาเลือกเวลาเริ่ม"
                    className="w-full bg-[#f4f7fc] border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Clock className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ระยะเวลาปฏิบัติงาน (วัน)
                </label>
                <input
                  type="text"
                  readOnly
                  value={workDurationDays}
                  className="w-full bg-[#f4f7fc] border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-semibold text-center cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  วันที่สิ้นสุดงาน
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={finishDate}
                    onChange={(e) => setFinishDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 4: บริษัทผู้รับเหมา, จำนวนผู้ปฏิบัติงาน *, MOC No. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  บริษัทผู้รับเหมา
                </label>
                <input
                  type="text"
                  value={contractorCompany}
                  onChange={(e) => setContractorCompany(e.target.value)}
                  className="w-full bg-[#f4f7fc] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  จำนวนผู้ปฏิบัติงาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={workerCount}
                  onChange={(e) => setWorkerCount(e.target.value)}
                  placeholder="กรุณาเลือกจำนวนผู้ปฏิบัติงาน"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  MOC No. (ระบุหากเกี่ยวข้อง)
                </label>
                <input
                  type="text"
                  value={mocNo}
                  onChange={(e) => setMocNo(e.target.value)}
                  placeholder="MOC No."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Row 5: อุปกรณ์ที่ตรวจสภาพ */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                อุปกรณ์ที่ตรวจสภาพ
              </label>
              <textarea
                rows={2}
                value={inspectionEquipment}
                onChange={(e) => setInspectionEquipment(e.target.value)}
                placeholder="ระบุอุปกรณ์ที่ต้องตรวจสภาพความปลอดภัยก่อนใช้งาน..."
                className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>

            {/* Row 6: อุปกรณ์หรือเครื่องมือที่ใช้ทั่วไป */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                อุปกรณ์หรือเครื่องมือที่ใช้ทั่วไป
              </label>
              <textarea
                rows={2}
                value={generalTools}
                onChange={(e) => setGeneralTools(e.target.value)}
                placeholder="ระบุเครื่องมือและอุปกรณ์ทั่วไป..."
                className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>

            {/* Row 7: รายละเอียดการทำงาน/วัตถุประสงค์ * (Image 3) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                รายละเอียดการทำงาน/วัตถุประสงค์ <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={workObjective}
                onChange={(e) => setWorkObjective(e.target.value)}
                placeholder="ระบุรายละเอียดขั้นตอนการปฏิบัติงาน และวัตถุประสงค์ของงานอย่างชัดเจน..."
                className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>

            {/* Warning Note (Red Text - Image 3) */}
            <div className="text-xs text-red-600 font-medium leading-relaxed">
              หากมีการปฏิบัติงาน CM/PM กรุณาขอใบอนุญาตทำงาน ล่วงหน้า โดยยื่นคำขอภายใน 23.59 น. ของวันก่อนวันปฏิบัติงาน
            </div>

            {/* Radio: งานระบบที่เกี่ยวข้องกับกระบวนการผลิต (Image 3) */}
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-medium text-gray-700 pt-1">
              <span>งานระบบที่เกี่ยวข้องกับกระบวนการผลิต เช่น ซอฟต์แวร์/Lan/การส่งก๊าซ/ท่อก๊าซ</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="isProcessRelated"
                  checked={isProcessRelated === "not_related"}
                  onChange={() => setIsProcessRelated("not_related")}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>ไม่เกี่ยวข้อง</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="isProcessRelated"
                  checked={isProcessRelated === "related"}
                  onChange={() => setIsProcessRelated("related")}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>เกี่ยวข้อง</span>
              </label>
            </div>

            {/* Table: ยานพาหนะสำหรับงาน (Image 3) */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-gray-800">
                ยานพาหนะสำหรับงาน
              </label>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead className="bg-[#f8fafc] text-gray-600 border-b border-gray-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-48">เลขทะเบียนรถ</th>
                      <th className="py-2.5 px-3 w-36">ยี่ห้อ</th>
                      <th className="py-2.5 px-3 w-36">ประเภท</th>
                      <th className="py-2.5 px-3">เลขสติกเกอร์ (ตรวจยานพาหนะ)</th>
                      <th className="py-2.5 px-3">เลขสติกเกอร์ (Process)</th>
                      <th className="py-2.5 px-2 w-20 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50/60">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="ระบุเลขทะเบียน"
                            value={v.plate}
                            onChange={(e) => handleVehicleChange(v.id, "plate", e.target.value)}
                            className="w-full bg-[#f4f7fc] border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={v.brand}
                            onChange={(e) => handleVehicleChange(v.id, "brand", e.target.value)}
                            className="w-full bg-[#f4f7fc] border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={v.type}
                            onChange={(e) => handleVehicleChange(v.id, "type", e.target.value)}
                            className="w-full bg-[#f4f7fc] border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={v.stickerVehicle}
                            onChange={(e) => handleVehicleChange(v.id, "stickerVehicle", e.target.value)}
                            className="w-full bg-[#f4f7fc] border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={v.stickerProcess}
                            onChange={(e) => handleVehicleChange(v.id, "stickerProcess", e.target.value)}
                            className="w-full bg-[#f4f7fc] border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteVehicle(v.id)}
                              className="p-1 rounded bg-red-500 hover:bg-red-600 text-white transition-colors"
                              title="ลบ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleAddVehicle}
                              className="p-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                              title="เพิ่มแถว"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Personnel Rows (Image 3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
              {/* ผู้ขอใบอนุญาต */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ผู้ขอใบอนุญาต
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full bg-[#f4f7fc] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none"
                />
              </div>

              {/* บริษัทต้นสังกัด */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  บริษัทต้นสังกัด
                </label>
                <input
                  type="text"
                  value={applicantCompany}
                  onChange={(e) => setApplicantCompany(e.target.value)}
                  className="w-full bg-[#f4f7fc] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none"
                />
              </div>

              {/* ผู้ควบคุมงาน (PTTLNG) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ผู้ควบคุมงาน (PTTLNG)
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="ระบุชื่อผู้ควบคุมงาน"
                  className="w-full bg-[#f4f7fc] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none"
                />
              </div>

              {/* บริษัทต้นสังกัด */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  บริษัทต้นสังกัด
                </label>
                <input
                  type="text"
                  value={supervisorCompany}
                  onChange={(e) => setSupervisorCompany(e.target.value)}
                  placeholder="ระบุบริษัทต้นสังกัด"
                  className="w-full bg-[#f4f7fc] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: เอกสารแนบ (Image 4) */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          {/* Header Bar: Solid Deep Blue with Chevron toggle */}
          <button
            type="button"
            onClick={() => setAttachmentSectionOpen((o) => !o)}
            className="w-full bg-[#1955b8] text-white px-5 py-3 font-semibold text-sm flex items-center justify-between cursor-pointer"
          >
            <span>เอกสารแนบ</span>
            {attachmentSectionOpen ? (
              <ChevronUp className="w-5 h-5 text-white" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white" />
            )}
          </button>

          {attachmentSectionOpen && (
            <div className="p-5 sm:p-7 space-y-4">
              <label className="block text-xs sm:text-sm font-semibold text-gray-800">
                Attachment
              </label>

              {/* Dashed Drag & Drop Box */}
              <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 sm:p-12 text-center bg-white flex flex-col items-center justify-center space-y-2">
                <p className="text-blue-600 font-medium text-xs sm:text-sm">
                  Press Upload to Upload file(s)
                </p>
                <p className="text-red-500 text-xs">
                  JPEG, PNG, PDF formats, up to 10 MB
                </p>

                <label className="mt-3 inline-flex items-center gap-2 px-5 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
                  <Upload className="w-4 h-4" />
                  <span>Browse File</span>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Attached Files List */}
              {attachedFiles.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-gray-700">ไฟล์ที่เลือก:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachedFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <File className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="truncate">{f.name}</span>
                          <span className="text-gray-400 text-[10px]">
                            ({(f.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(i)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR (Image 4) */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-20">
          <div className="text-xs w-full sm:w-auto">
            {!isFormValid ? (
              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  กรุณากรอกข้อมูลมาร์คสีแดง <span className="font-bold text-red-600">(*)</span> ให้ครบถ้วนก่อนเสนอพิจารณา (ยังขาดอีก {missingFields.length} ช่อง)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>กรอกข้อมูลมาร์คสีแดงครบถ้วนแล้ว พร้อมเสนอพิจารณา</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => handleSubmit("draft")}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-lg transition-colors border border-gray-200"
            >
              บันทึกร่าง
            </button>
            <button
              type="button"
              disabled={!isFormValid}
              onClick={() => handleSubmit("submit")}
              className={`px-5 py-2 font-semibold text-sm rounded-lg transition-all border ${
                isFormValid
                  ? "bg-[#d1fae5] hover:bg-[#bbf7d0] text-emerald-800 border-emerald-300 shadow-xs cursor-pointer active:scale-95"
                  : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
              }`}
              title={
                !isFormValid
                  ? `กรุณากรอกข้อมูลมาร์คสีแดง (*) ให้ครบถ้วนก่อน:\n- ${missingFields.join("\n- ")}`
                  : "เสนอพิจารณา"
              }
            >
              เสนอพิจารณา
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
