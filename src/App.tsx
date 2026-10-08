import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Plus,
  FileText,
  Trash2,
  Pencil,
  ArrowLeft,
  Save,
  Download,
  Printer,
  Info,
  Shield,
  ShieldAlert,
  LayoutDashboard,
  PlusCircle,
  MinusCircle,
  ImagePlus,
  Filter,
  Loader2,
  Briefcase,
  Wifi,
  Database,
  Users,
  Paperclip,
  Link as LinkIcon,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  UserCircle,
  ClipboardCheck,
} from "lucide-react";

import {
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import { setDoc, deleteDoc, onSnapshot, getDoc, query, where } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";

import {
  auth,
  projectsRef,
  wmsDocumentsRef,
  jsaDocumentsRef,
  usersRef,
  rolesRef,
  userDoc,
  projectDoc,
  wmsDoc,
  jsaDoc,
  metaDoc,
  storage,
} from "./firebase";
import { getDocs } from "firebase/firestore";
import { api, useApiForSave } from "./api";
import { useAuth } from "./contexts/AuthContext";
import { logout as authLogout } from "./services/authService";
import WorkPermitView from "./components/WorkPermitView";
// Database Master View
import DatabaseView from "./components/DatabaseView";
import RoleManagementView from "./components/RoleManagementView";
import {
  getAccessibleModules,
  getAccessibleActions,
  canAccessModule,
  getRoleGuide,
  type ModuleId,
} from "./constants/roleModules";
import type { UserProfile, UserRole, UserStatus } from "./types/auth";
import { USER_ROLES } from "./types/auth";

/** แก้ path รูปและลิงก์ให้ Word เปิดได้ (ต้องเป็น URL เต็ม) */
const prepareHtmlForWordExport = (fragment: string): string => {
  if (typeof window === "undefined") return fragment;
  const base = window.location.origin;
  return fragment
    .replace(/src="\//g, `src="${base}/`)
    .replace(/href="\//g, `href="${base}/`);
};

const buildWordExportStyles = (
  isLandscape: boolean,
  colorMode: PrintColorMode = "color"
): string => {
  const pageRule = isLandscape
    ? `@page { size: A4 landscape; margin: 9mm 11mm; }`
    : `@page { size: A4 portrait; margin: 11mm 13mm; }`;
  const isGrayscale = colorMode === "grayscale";
  const jsaHeaderBg = isGrayscale ? "#ffffff" : "#fae6d1";
  const jsaBodyBg = isGrayscale ? "#ffffff" : "#e6f2e6";
  const sectionBg = isGrayscale ? "#ffffff" : "#f3f4f6";
  const subtleText = isGrayscale ? "#000000" : "#374151";
  const codeText = isGrayscale ? "#000000" : "#4b5563";
  const projectText = isGrayscale ? "#000000" : "#1e40af";
  return `
        ${pageRule}
        @font-face {
          font-family: 'TH SarabunPSK';
          src: url('https://cdn.jsdelivr.net/gh/SarabunConsortium/TH-Sarabun-PSK@master/THSarabunPSK%20Regular.ttf') format('truetype');
          font-weight: 400;
          font-style: normal;
        }
        @font-face {
          font-family: 'TH SarabunPSK';
          src: url('https://cdn.jsdelivr.net/gh/SarabunConsortium/TH-Sarabun-PSK@master/THSarabunPSK%20Bold.ttf') format('truetype');
          font-weight: 700;
          font-style: normal;
        }
        body {
          font-family: 'TH SarabunPSK', 'Sarabun', 'Cordia New', sans-serif;
          font-size: 18pt;
          line-height: 1.35;
          color: #111827;
          margin: 0;
          padding: 0;
          background: #fff;
        }
        .document-export-preview {
          font-family: 'TH SarabunPSK', 'Sarabun', 'Cordia New', sans-serif;
          font-size: 18pt;
          line-height: 1.35;
          text-align: left;
          background: #fff;
        }
        .document-export-preview table { font-size: inherit; }
        p { margin: 0.15em 0; font-size: 18pt; line-height: 1.35; }
        h1, h2, h3 { font-family: 'TH SarabunPSK', 'Sarabun', 'Cordia New', sans-serif; }

        /* Word: แปลงเฉพาะตารางนอก (หัวซ้ำ) เป็นบล็อก — ใช้ > ไม่ให้กระทบตาราง JSA ด้านใน */
        table.wms-print-outer-table > thead,
        table.wms-print-outer-table > tbody,
        table.wms-print-outer-table > thead > tr,
        table.wms-print-outer-table > tbody > tr,
        table.wms-print-outer-table > thead > tr > th,
        table.wms-print-outer-table > tbody > tr > td,
        table.jsa-print-outer-table > thead,
        table.jsa-print-outer-table > tbody,
        table.jsa-print-outer-table > thead > tr,
        table.jsa-print-outer-table > tbody > tr,
        table.jsa-print-outer-table > thead > tr > th,
        table.jsa-print-outer-table > tbody > tr > td {
          display: block !important;
          width: 100% !important;
          height: auto !important;
        }

        .wms-export-title-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8pt;
          border-bottom: 2.25pt solid #1f2937;
        }
        .wms-export-title-table td {
          border: none;
          vertical-align: top;
          padding: 0 6pt 8pt 6pt;
        }
        .wms-export-title-table h1 {
          font-size: 22pt;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0;
          letter-spacing: 0.02em;
        }
        .wms-export-title-table h2 {
          font-size: 20pt;
          font-weight: 600;
          margin: 4pt 0 0 0;
        }
        .wms-export-title-table h3 {
          font-size: 18pt;
          font-weight: normal;
          color: ${subtleText};
          margin: 4pt 0 0 0;
        }
        .wms-export-title-table .wms-fm-code {
          font-size: 17pt;
          font-weight: 600;
          color: ${codeText};
        }
        .wms-export-title-table img { max-width: 200px; height: auto; display: block; }

        .wms-export-meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10pt;
          border: 1pt solid #9ca3af;
        }
        .wms-export-meta-table th,
        .wms-export-meta-table td {
          border: 1pt solid #9ca3af;
          padding: 4pt 8pt;
          font-size: 18pt;
          vertical-align: middle;
        }
        .wms-export-meta-table th {
          background: ${sectionBg};
          font-weight: bold;
          text-align: left;
          width: 22%;
        }
        .wms-export-meta-table td { text-align: center; }
        .wms-export-meta-table td.wms-proj-val {
          color: ${projectText};
          font-weight: bold;
        }

        .wms-export-heading {
          font-weight: bold;
          background-color: ${sectionBg};
          padding: 4pt 8pt;
          text-transform: uppercase;
          font-size: 19pt;
          margin-top: 8pt;
          margin-bottom: 3pt;
          border: 1pt solid #e5e7eb;
          line-height: 1.25;
        }
        .wms-export-sub {
          font-weight: 600;
          font-size: 18.5pt;
          margin: 6pt 0 2pt 0;
          padding-left: 10pt;
        }
        .wms-export-sections { margin-top: 4pt; }
        .wms-export-sections > div { margin-bottom: 2pt; }

        .wms-export-body, .content {
          margin-left: 12pt;
          margin-top: 2pt;
          margin-bottom: 8pt;
          white-space: pre-wrap;
          font-size: 18pt;
          line-height: 1.32;
        }
        .content p { margin: 0.12em 0; font-size: 18pt; line-height: 1.32; }
        .content img {
          max-width: 100%;
          height: auto;
          border: 1pt solid #d1d5db;
          margin: 8pt 0;
          display: block;
        }

        /* JSA — Word ไม่เข้าใจ grid ของ Tailwind */
        .jsa-header {
          background-color: ${jsaHeaderBg};
          border: 1pt solid #000;
          padding: 8pt 10pt;
          margin-bottom: 8pt;
        }
        .jsa-header-top-table,
        .jsa-header-meta-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin: 0;
        }
        .jsa-header-top-table {
          border-bottom: 1pt solid #000;
          margin-bottom: 6pt;
        }
        .jsa-header-top-table td,
        .jsa-header-meta-table td {
          border: none;
          font-size: 18pt;
          padding: 0;
          vertical-align: top;
        }
        .jsa-header-top-logo { width: 28%; padding: 0 8pt 6pt 0; }
        .jsa-header-top-title { padding: 0 8pt 6pt; text-align: center; }
        .jsa-header-top-code { width: 18%; padding: 0 0 6pt 8pt; text-align: right; white-space: nowrap; }
        .jsa-header-title { margin: 0; }
        .jsa-header-meta-grid { margin-top: 2pt; }
        .jsa-header-field { display: block; min-height: 34pt; }
        .jsa-header-field > span:first-child,
        .jsa-header-field-label {
          display: block;
          font-weight: 700;
          line-height: 1.02;
          margin-bottom: 2pt;
        }
        .jsa-header-field-value {
          display: block;
          min-height: 18pt;
          padding: 0 2pt 1pt;
          border-bottom: 1pt solid #000;
          line-height: 1.08;
        }
        .jsa-header-field-value--project { color: ${projectText}; font-weight: 700; }
        .jsa-header-field--ghost::after { content: ""; display: block; margin-top: 20pt; border-bottom: 1pt solid #000; }
        .jsa-print-outer-td > table {
          width: 100%;
          border-collapse: collapse;
          border: 1pt solid #000;
        }
        .jsa-print-outer-td > table th,
        .jsa-print-outer-td > table td {
          border: 1pt solid #000;
          padding: 3pt 5pt;
          font-size: 17pt;
          vertical-align: top;
        }
        .jsa-print-outer-td > table thead th { background: ${jsaHeaderBg}; text-align: center; }
        .jsa-print-outer-td > table tbody td { background: ${jsaBodyBg}; }
        .dotted-border td { border-bottom: 1pt dotted #000; }
      `;
};

const compareTextValues = (a: string, b: string) =>
  a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base",
  });

const getJSARevisionRank = (rev: unknown): number => {
  if (typeof rev === "number" && Number.isFinite(rev)) return rev;

  const rawRev = `${rev ?? ""}`.trim();
  if (!rawRev) return Number.NEGATIVE_INFINITY;

  const numericMatch = rawRev.match(/-?\d+(?:\.\d+)?/);
  if (!numericMatch) return Number.NEGATIVE_INFINITY;

  const parsed = Number.parseFloat(numericMatch[0]);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const compareJSADocuments = (a: any, b: any) => {
  const titleA = (a.jobTitle || "").trim();
  const titleB = (b.jobTitle || "").trim();

  if (!titleA && !titleB) return 0;
  if (!titleA) return 1;
  if (!titleB) return -1;

  const titleComparison = compareTextValues(titleA, titleB);
  if (titleComparison !== 0) return titleComparison;

  const revisionDiff = getJSARevisionRank(b.rev) - getJSARevisionRank(a.rev);
  if (revisionDiff !== 0) return revisionDiff;

  const rawRevComparison = compareTextValues(`${b.rev ?? ""}`, `${a.rev ?? ""}`);
  if (rawRevComparison !== 0) return rawRevComparison;

  return compareTextValues(`${b.date ?? ""}`, `${a.date ?? ""}`);
};

const getJSAGroupKey = (doc: any) => {
  const jobTitle = (doc.jobTitle || "").trim().toLowerCase();
  if (!jobTitle) return `untitled::${doc.id}`;

  const project = (doc.project || "").trim().toLowerCase();
  return `${project}::${jobTitle}`;
};

type PrintColorMode = "color" | "grayscale";

type PrintPreviewState = {
  title: string;
  elementId: string;
  filename: string;
  isLandscape: boolean;
  previewHtml: string;
  previewClassName: string;
  previewMaxWidth?: string;
};

type PrintPreviewPagination = {
  pageHeight: number;
  pageOffsets: number[];
};

// --- Helper Function: Export to MS Word ---
const exportToWord = (
  elementId: string,
  filename: string = "Document.doc",
  isLandscape: boolean = false,
  colorMode: PrintColorMode = "color"
) => {
  const preHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Export</title>
      <!--[if gte mso 9]><xml>
        <w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument>
      </xml><![endif]-->
      <style>
        ${buildWordExportStyles(isLandscape, colorMode)}
      </style>
    </head>
    <body>
  `;
  const postHtml = "</body></html>";
  const element = document.getElementById(elementId);
  if (!element) return;

  const exportedHtml = prepareHtmlForWordExport(element.innerHTML);
  const wrapperClassName = element.className || "";
  const wrapperStyle = element.getAttribute("style") || "";
  const html =
    preHtml +
    `<div class="${wrapperClassName}" style="${wrapperStyle}">${exportedHtml}</div>` +
    postHtml;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url =
    "data:application/vnd.ms-word;charset=utf-8," + encodeURIComponent(html);

  const downloadLink = document.createElement("a");
  document.body.appendChild(downloadLink);
  if ((navigator as any).msSaveOrOpenBlob) {
    (navigator as any).msSaveOrOpenBlob(blob, filename);
  } else {
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.click();
  }
  document.body.removeChild(downloadLink);
};

// --- CMG Logo Component ---
const CMGLogo = ({ className = "" }) => (
  <div className={`bg-white flex items-center ${className}`} style={{ minWidth: "180px", maxWidth: "220px" }}>
    <img
      src="/logo.png"
      alt="CMG Logo"
      className="w-full h-auto object-contain"
    />
  </div>
);

// --- Custom Rich Text Editor with Image Paste Support ---
const RichTextEditor = ({ name, value, onChange, placeholder }: { name: string; value: string; onChange: any; placeholder?: string }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (onChange && editorRef.current) {
      onChange({ target: { name, value: editorRef.current.innerHTML } });
    }
  };

  const processAndInsertImage = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        const imgTag = `<br/><img src="${dataUrl}" style="max-width: 100%; border-radius: 8px; margin: 10px 0; border: 1px solid #ddd;" alt="Pasted Document Image" /><br/>`;

        if (editorRef.current) {
          editorRef.current.focus();
          document.execCommand("insertHTML", false, imgTag);
          handleInput();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) processAndInsertImage(file);
        break;
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAndInsertImage(file);
    e.target.value = "";
  };

  return (
    <div className="relative mb-4 mt-2">
      <div className="absolute -top-7 right-0">
        <label className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs flex items-center bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors shadow-sm border border-blue-100 font-medium z-10">
          <ImagePlus size={14} className="mr-1" /> แทรกรูป/Snap (Paste ได้)
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </label>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors min-h-[120px] bg-white cursor-text overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner"
      />
    </div>
  );
};

// --- Initial States ---
const initialProjectFormState = {
  id: "",
  projectNo: "",
  projectName: "",
  location: "",
  projectManager: "",
  constructionManager: "",
  projectStart: "",
  projectFinish: "",
  mainContractor: "",
  subContractor: "",
  clientName: "",
  projectNote: "",
};

const initialWMSFormState = {
  id: "",
  project: "",
  documentTitle: "",
  status: "Under Preparing",
  rev: "00",
  issueDate: new Date().toISOString().split("T")[0],
  description: "Initial Issue",
  preparedBy: "",
  reviewedBy: "",
  approvedBy: "",
  scope: "",
  definition: "",
  reference: "",
  equipment: "",
  personnel: "",
  orgChart: "",
  responsibility: "",
  preparation: "",
  procedure: "",
  finishWork: "",
  inspectTesting: "",
  jsa: "",
  documentedInfo: "",
  attachments: [] as {
    type: "document" | "photo" | "url";
    name: string;
    data?: string;
    url?: string;
    path?: string;
    uploadedAt?: string;
    contentType?: string;
  }[],
};

const getAttachmentUrl = (attachment: { url?: string; data?: string } | null | undefined): string =>
  attachment?.url || attachment?.data || "";

const normalizeJSAItems = (items: any[]): any[] => {
  if (!items) return [];
  return items.map((item: any) => {
    if (item.hazards && Array.isArray(item.hazards)) {
      return {
        id: item.id || Date.now() + Math.random(),
        step: item.step || "",
        hazards: item.hazards.map((h: any) => ({
          id: h.id || Date.now() + Math.random(),
          hazard: h.hazard || "",
          controls: (h.controls || []).map((c: any) => ({
            id: c.id || Date.now() + Math.random(),
            control: c.control || "",
            responder: c.responder || ""
          }))
        }))
      };
    }
    // Convert old flat format
    return {
      id: item.id || Date.now() + Math.random(),
      step: item.step || "",
      hazards: [
        {
          id: Date.now() + Math.random(),
          hazard: item.hazard || "",
          controls: [
            {
              id: Date.now() + Math.random(),
              control: item.control || "",
              responder: item.responder || ""
            }
          ]
        }
      ]
    };
  });
};

const initialJSAFormState = {
  id: "",
  client: "",
  project: "",
  jobTitle: "",
  status: "Under Preparing",
  preparedBy: "",
  reviewedBy: "",
  approvedBy: "",
  date: new Date().toISOString().split("T")[0],
  rev: "00",
  items: [
    {
      id: Date.now(),
      step: "",
      hazards: [
        {
          id: Date.now() + 1,
          hazard: "",
          controls: [
            {
              id: Date.now() + 2,
              control: "",
              responder: "",
            }
          ]
        }
      ]
    }
  ],
  attachments: [] as {
    name: string;
    url: string;
    path: string;
    uploadedAt: string;
    contentType?: string;
  }[],
};

const DOCUMENT_STATUS_OPTIONS = ["Under Preparing", "Submiting", "Approved"];

export default function App() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"project" | "wms" | "jsa" | "work_permit" | "database" | "users">("project");
  /** แท็บย่อยในหน้าจัดการผู้ใช้งาน */
  const [userMgmtSubTab, setUserMgmtSubTab] = useState<"list" | "roleGuide" | "manageRoles">("list");
  const [availableRoleNames, setAvailableRoleNames] = useState<string[]>([...USER_ROLES]);
  const [view, setView] = useState("list"); // 'list', 'form', 'detail'
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const { userProfile } = useAuth();
  const roleList = userProfile?.role;
  const roles = Array.isArray(roleList)
    ? (roleList.map((r) => (typeof r === "string" ? (r.trim() as UserRole) : r)))
    : [];
  const accessibleModules = useMemo(() => getAccessibleModules(roles), [roleList]);
  const accessibleActions = useMemo(() => getAccessibleActions(roles), [roleList]);
  const canAccess = (moduleId: ModuleId) => accessibleModules.has(moduleId);
  const canCreate = accessibleActions.has("create");
  const canEdit   = accessibleActions.has("edit");
  const canDelete = accessibleActions.has("delete");
  const canManageUsers = canAccess("users");

  // Auth & UI State
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("All"); // ตัวกรองโครงการ
  const [adminUsers, setAdminUsers] = useState<(UserProfile & { id: string })[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);

  // นับจำนวนผู้ใช้ที่รออนุมัติ (ใช้สำหรับ badge แจ้งเตือน)
  const pendingUsersCount = useMemo(
    () => adminUsers.filter((u) => u.status === "pending").length,
    [adminUsers]
  );

  // Project State
  const [projects, setProjects] = useState<any[]>([]);
  const [projectFormData, setProjectFormData] = useState<any>(
    initialProjectFormState
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // WMS State
  const [wmsDocuments, setWmsDocuments] = useState<any[]>([]);
  const [wmsFormData, setWmsFormData] = useState<any>(initialWMSFormState);
  const [currentWMSDoc, setCurrentWMSDoc] = useState<any>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [printPreview, setPrintPreview] = useState<PrintPreviewState | null>(null);
  const [printColorMode, setPrintColorMode] = useState<PrintColorMode>("color");
  const [isPrinting, setIsPrinting] = useState(false);
  const [printPreviewPagination, setPrintPreviewPagination] = useState<PrintPreviewPagination>({
    pageHeight: 0,
    pageOffsets: [0],
  });
  const printPreviewMeasureRef = useRef<HTMLDivElement>(null);

  // JSA State
  const [jsaDocuments, setJsaDocuments] = useState<any[]>([]);
  const [jsaFormData, setJsaFormData] = useState<any>(initialJSAFormState);
  const [currentJSADoc, setCurrentJSADoc] = useState<any>(null);
  const [expandedJSAGroups, setExpandedJSAGroups] = useState<Record<string, boolean>>({});

  // ป้องกันการบันทึกซ้ำ (Realtime safe)
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isSavingWMS, setIsSavingWMS] = useState(false);
  const [isSavingJSA, setIsSavingJSA] = useState(false);
  const [isUploadingWMSFiles, setIsUploadingWMSFiles] = useState(false);
  const [isUploadingJSAFiles, setIsUploadingJSAFiles] = useState(false);

  // Modal แก้ไข User
  const [editUserModal, setEditUserModal] = useState<(UserProfile & { id: string }) | null>(null);
  const [editUserRoles, setEditUserRoles] = useState<UserRole[]>([]);
  const [editUserStatus, setEditUserStatus] = useState<UserStatus>("pending");
  const [editUserPosition, setEditUserPosition] = useState("");
  const [editUserAssignedProjects, setEditUserAssignedProjects] = useState<string[]>([]);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // ปิด dropdown โปรไฟล์เมื่อคลิกนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileDropdownOpen]);

  // ถ้าไม่มีสิทธิ์เข้าถึง tab ปัจจุบัน ให้สลับไป tab แรกที่เข้าถึงได้
  useEffect(() => {
    if (!roles.length) return;
    const map: Record<string, ModuleId> = { project: "projects", wms: "wms", jsa: "jsa", work_permit: "work_permit", database: "database", users: "users" };
    const currentModule = map[activeTab];
    if (currentModule && !accessibleModules.has(currentModule)) {
      const order: ModuleId[] = ["projects", "wms", "jsa", "work_permit", "database", "users"];
      const first = order.find((m) => accessibleModules.has(m));
      if (first) {
        const tab = first === "projects" ? "project" : first === "wms" ? "wms" : first === "jsa" ? "jsa" : first === "work_permit" ? "work_permit" : first === "database" ? "database" : "users";
        setActiveTab(tab);
        setView("list");
      }
    }
  }, [roles, activeTab, accessibleModules]);

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.removeAttribute("data-print-color-mode");
      document.documentElement.removeAttribute("data-print-color-mode");
      setIsPrinting(false);
      setPrintPreview(null);
      setPrintColorMode("color");
    };

    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  useEffect(() => {
    if (!printPreview) {
      setPrintPreviewPagination({
        pageHeight: 0,
        pageOffsets: [0],
      });
      return;
    }

    let frameId = 0;
    let resizeObserver: ResizeObserver | null = null;

    const updatePagination = () => {
      const measureElement = printPreviewMeasureRef.current;
      if (!measureElement) return;

      const contentWidth = Math.ceil(measureElement.getBoundingClientRect().width);
      const contentHeight = Math.ceil(
        Math.max(measureElement.scrollHeight, measureElement.getBoundingClientRect().height)
      );

      if (!contentWidth || !contentHeight) return;

      const pageRatio = printPreview.isLandscape ? 210 / 297 : 297 / 210;
      const pageHeight = Math.max(1, Math.round(contentWidth * pageRatio));
      const pageCount = Math.max(1, Math.ceil(contentHeight / pageHeight));
      const pageOffsets = Array.from({ length: pageCount }, (_, index) => index * pageHeight);

      setPrintPreviewPagination((current) => {
        const sameHeight = current.pageHeight === pageHeight;
        const sameOffsets =
          current.pageOffsets.length === pageOffsets.length &&
          current.pageOffsets.every((offset, index) => offset === pageOffsets[index]);

        if (sameHeight && sameOffsets) return current;

        return {
          pageHeight,
          pageOffsets,
        };
      });
    };

    const queuePagination = () => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updatePagination);
    };

    queuePagination();
    window.addEventListener("resize", queuePagination);

    if (typeof ResizeObserver !== "undefined" && printPreviewMeasureRef.current) {
      resizeObserver = new ResizeObserver(queuePagination);
      resizeObserver.observe(printPreviewMeasureRef.current);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", queuePagination);
      resizeObserver?.disconnect();
    };
  }, [printPreview]);

  const openPrintPreview = (config: {
    title: string;
    elementId: string;
    filename: string;
    isLandscape: boolean;
  }) => {
    const element = document.getElementById(config.elementId);
    if (!element) return;

    setPrintColorMode("color");
    setPrintPreview({
      ...config,
      previewHtml: element.innerHTML,
      previewClassName: element.className,
      previewMaxWidth: element.style.maxWidth || undefined,
    });
  };

  const closePrintPreview = () => {
    if (isPrinting) return;
    document.body.removeAttribute("data-print-color-mode");
    document.documentElement.removeAttribute("data-print-color-mode");
    setPrintPreview(null);
    setPrintColorMode("color");
  };

  const applyPrintColorMode = (mode: PrintColorMode) => {
    document.body.setAttribute("data-print-color-mode", mode);
    document.documentElement.setAttribute("data-print-color-mode", mode);
  };

  const handlePrintFromPreview = () => {
    if (!printPreview || isPrinting) return;
    applyPrintColorMode(printColorMode);
    setIsPrinting(true);
    window.print();
  };

  const handleExportWordFromPreview = () => {
    if (!printPreview) return;
    exportToWord(
      printPreview.elementId,
      printPreview.filename,
      printPreview.isLandscape,
      printColorMode
    );
  };

  useEffect(() => {
    if (activeTab !== "users") setUserMgmtSubTab("list");
  }, [activeTab]);

  useEffect(() => {
    try {
      const unsub = onSnapshot(rolesRef(), (snap) => {
        if (!snap.empty) {
          const names: string[] = [];
          snap.forEach((d) => {
            const data = d.data();
            const rName = (data.name || d.id || "").trim();
            if (rName && !names.includes(rName)) names.push(rName);
          });
          if (names.length > 0) setAvailableRoleNames(names);
        }
      });
      return () => unsub();
    } catch {
      // offline fallback
    }
  }, []);

  // --- 1. Firebase Auth: ถ้ามี user (จาก Login/Google) อยู่แล้ว ไม่ต้อง anonymous ---
  useEffect(() => {
    let cancelled = false;
    const initAuth = async () => {
      try {
        if (!auth.currentUser) await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Init Error:", error);
        if (!cancelled) setLoadingAuth(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!cancelled) {
        setUser(u);
        setLoadingAuth(false);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);


  // --- โหลดรายชื่อผู้ใช้ (Realtime — สำหรับ SuperAdmin/Admin) ---
  useEffect(() => {
    if (!canManageUsers) return;
    setAdminUsersLoading(true);
    const unsub = onSnapshot(
      usersRef(),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as UserProfile & { id: string }));
        setAdminUsers(list);
        setAdminUsersLoading(false);
      },
      () => {
        setAdminUsers([]);
        setAdminUsersLoading(false);
      }
    );
    return () => unsub();
  }, [canManageUsers]);

  // --- 2. Firestore Real-time Sync ---
  useEffect(() => {
    if (!user) return;

    // Sync Projects (JSA Work Method > root > projects)
    const unsubProj = onSnapshot(
      projectsRef(),
      (snapshot) => {
        const docs: any[] = [];
        snapshot.forEach((d) => docs.push(d.data()));
        setProjects(
          docs.sort((a, b) =>
            (b.updatedAt || "").localeCompare(a.updatedAt || "")
          )
        );
      },
      (err) => console.error("Project Sync Error:", err)
    );

    // Sync WMS (JSA Work Method > root > wms_documents)
    const unsubWms = onSnapshot(
      wmsDocumentsRef(),
      (snapshot) => {
        const docs: any[] = [];
        snapshot.forEach((d) => docs.push(d.data()));
        setWmsDocuments(
          docs.sort((a, b) =>
            (b.updatedAt || "").localeCompare(a.updatedAt || "")
          )
        );
      },
      (err) => console.error("WMS Sync Error:", err)
    );

    // Sync JSA (JSA Work Method > root > jsa_documents)
    const unsubJsa = onSnapshot(
      jsaDocumentsRef(),
      (snapshot) => {
        const docs: any[] = [];
        snapshot.forEach((d) => docs.push(d.data()));
        setJsaDocuments(
          docs.sort((a, b) =>
            (b.updatedAt || "").localeCompare(a.updatedAt || "")
          )
        );
      },
      (err) => console.error("JSA Sync Error:", err)
    );

    return () => {
      unsubProj();
      unsubWms();
      unsubJsa();
    };
  }, [user]);

  // === Project Handlers ===
  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProjectFormData((prev: Record<string, any>) => ({ ...prev, [name]: value }));
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProject) return;
    if (!user) return alert("รอการยืนยันตัวตนสักครู่...");
    const isNew = !projectFormData.id;
    const docId = isNew ? Date.now().toString() : projectFormData.id;
    const docToSave = {
      ...projectFormData,
      id: docId,
      updatedAt: new Date().toISOString(),
    };
    setIsSavingProject(true);
    try {
      if (useApiForSave()) {
        await api.saveProject(docToSave);
      } else {
        await setDoc(projectDoc(docId), docToSave);
      }
      setView("list");
      setProjectFormData(initialProjectFormState);
    } catch (err) {
      console.error("Error saving Project:", err);
      alert("ไม่สามารถบันทึกข้อมูลโครงการได้");
    } finally {
      setIsSavingProject(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (confirm("ยืนยันการลบข้อมูลโครงการนี้?")) {
      try {
        if (useApiForSave()) {
          await api.deleteProject(id);
        } else {
          await deleteDoc(projectDoc(id));
        }
      } catch (err) {
        console.error("Error deleting Project:", err);
        alert("ไม่สามารถลบข้อมูลโครงการได้");
      }
    }
  };

  // === WMS Handlers ===
  const handleWMSChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setWmsFormData((prev: Record<string, any>) => ({ ...prev, [name]: value }));
  };

  const handleWMSFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "document" | "photo") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // ตรวจสอบขนาดไฟล์ก่อนอัพโหลด
    // WMS เก็บแบบ base64 ใน Firestore (จำกัด 1MB ต่อ document)
    // ดังนั้นจำกัดไฟล์แต่ละไฟล์ไว้ที่ 400KB เพื่อป้องกัน document เกิน 1MB
    const MAX_FILE_SIZE = 400 * 1024; // 400KB
    const oversizedFiles = Array.from(files).filter((f) => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      const names = oversizedFiles.map((f) => `"${f.name}" (${(f.size / 1024).toFixed(0)} KB)`).join(", ");
      alert(
        `ไฟล์ต่อไปนี้มีขนาดใหญ่เกิน 400KB:\n${names}\n\n` +
        `เนื่องจาก WMS เก็บไฟล์แบบ Embedded ใน Database กรุณาใช้ไฟล์ขนาดเล็กลง\n` +
        `หรือใช้วิธีแนบ URL แทน`
      );
      e.target.value = "";
      return;
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onerror = () => {
        alert(`ไม่สามารถอ่านไฟล์ "${file.name}" ได้ กรุณาลองใหม่อีกครั้ง`);
      };
      reader.onload = (ev) => {
        const data = ev.target?.result as string;
        setWmsFormData((prev: Record<string, any>) => ({
          ...prev,
          attachments: [
            ...(prev.attachments || []),
            { type, name: file.name, data },
          ],
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleWMSStorageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "document" | "photo") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!user) {
      alert("รอการยืนยันตัวตนสักครู่...");
      e.target.value = "";
      return;
    }

    const ensuredDocId = wmsFormData.id || Date.now().toString();
    if (!wmsFormData.id) {
      setWmsFormData((prev: Record<string, any>) => ({ ...prev, id: ensuredDocId }));
    }

    setIsUploadingWMSFiles(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `permit_to_work/wms_attachments/${ensuredDocId}/${Date.now()}_${safeName}`;
          const fileRef = storageRef(storage, path);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          return {
            type,
            name: file.name,
            url,
            path,
            uploadedAt: new Date().toISOString(),
            contentType: file.type || undefined,
          };
        })
      );

      setWmsFormData((prev: Record<string, any>) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...uploaded],
      }));
    } catch (err: any) {
      console.error("Error uploading WMS files:", err);

      let errorMessage = "อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
      if (err?.code === "storage/unauthorized") {
        errorMessage = "ไม่มีสิทธิ์อัปโหลดไฟล์ กรุณาตรวจสอบการตั้งค่า Storage Rules";
      } else if (err?.code === "storage/canceled") {
        errorMessage = "การอัปโหลดถูกยกเลิก";
      } else if (err?.code === "storage/unknown") {
        errorMessage = "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
      } else if (err?.message) {
        errorMessage = err.message;
      }

      alert(errorMessage);
    } finally {
      setIsUploadingWMSFiles(false);
      e.target.value = "";
    }
  };

  const [wmsUrlInput, setWmsUrlInput] = useState("");
  const [wmsUrlNameInput, setWmsUrlNameInput] = useState("");

  const handleWMSAddUrl = () => {
    const url = wmsUrlInput.trim();
    if (!url) return;
    const name = wmsUrlNameInput.trim() || url;
    setWmsFormData((prev: Record<string, any>) => ({
      ...prev,
      attachments: [
        ...(prev.attachments || []),
        { type: "url", name, data: "", url },
      ],
    }));
    setWmsUrlInput("");
    setWmsUrlNameInput("");
  };

  const handleWMSRemoveAttachment = (index: number) => {
    setWmsFormData((prev: Record<string, any>) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const handleWMSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingWMS || isUploadingWMSFiles) return;
    if (!user) return alert("รอการยืนยันตัวตนสักครู่...");
    const isNew = !wmsFormData.id;
    const docId = isNew ? Date.now().toString() : wmsFormData.id;
    const docToSave = {
      ...wmsFormData,
      id: docId,
      updatedAt: new Date().toISOString(),
    };
    setIsSavingWMS(true);
    try {
      if (useApiForSave()) {
        await api.saveWMS(docToSave);
      } else {
        await setDoc(wmsDoc(docId), docToSave);
      }
      setView("list");
      setWmsFormData(initialWMSFormState);
      setSelectedProjectFilter(docToSave.project || "All");
    } catch (err) {
      console.error("Error saving WMS:", err);
      alert("ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setIsSavingWMS(false);
    }
  };

  const deleteWMS = async (id: string) => {
    if (confirm("ยืนยันการลบเอกสาร WMS นี้?")) {
      try {
        if (useApiForSave()) {
          await api.deleteWMS(id);
        } else {
          await deleteDoc(wmsDoc(id));
        }
      } catch (err) {
        console.error("Error deleting WMS:", err);
        alert("ไม่สามารถลบเอกสาร WMS ได้");
      }
    }
  };

  // === JSA Handlers ===
  const handleJSAChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setJsaFormData((prev: Record<string, any>) => ({ ...prev, [name]: value }));
  };

  const handleJSAStepChange = (stepIndex: number, value: string) => {
    const newItems = [...jsaFormData.items];
    newItems[stepIndex].step = value;
    setJsaFormData({ ...jsaFormData, items: newItems });
  };

  const addJSAStep = () => {
    const stepId = Date.now();
    setJsaFormData({
      ...jsaFormData,
      items: [
        ...jsaFormData.items,
        {
          id: stepId,
          step: "",
          hazards: [
            {
              id: stepId + 1,
              hazard: "",
              controls: [
                {
                  id: stepId + 2,
                  control: "",
                  responder: ""
                }
              ]
            }
          ]
        }
      ]
    });
  };

  const removeJSAStep = (stepIndex: number) => {
    if (jsaFormData.items.length === 1) return;
    const newItems = jsaFormData.items.filter((_: any, i: number) => i !== stepIndex);
    setJsaFormData({ ...jsaFormData, items: newItems });
  };

  const handleJSAHazardChange = (stepIndex: number, hazardIndex: number, value: string) => {
    const newItems = [...jsaFormData.items];
    newItems[stepIndex].hazards[hazardIndex].hazard = value;
    setJsaFormData({ ...jsaFormData, items: newItems });
  };

  const addJSAHazard = (stepIndex: number) => {
    const newItems = [...jsaFormData.items];
    const hazardId = Date.now();
    newItems[stepIndex].hazards.push({
      id: hazardId,
      hazard: "",
      controls: [
        {
          id: hazardId + 1,
          control: "",
          responder: ""
        }
      ]
    });
    setJsaFormData({ ...jsaFormData, items: newItems });
  };

  const removeJSAHazard = (stepIndex: number, hazardIndex: number) => {
    const newItems = [...jsaFormData.items];
    newItems[stepIndex].hazards = newItems[stepIndex].hazards.filter((_: any, i: number) => i !== hazardIndex);
    setJsaFormData({ ...jsaFormData, items: newItems });
  };

  const handleJSAControlChange = (stepIndex: number, hazardIndex: number, controlIndex: number, field: "control" | "responder", value: string) => {
    const newItems = [...jsaFormData.items];
    newItems[stepIndex].hazards[hazardIndex].controls[controlIndex][field] = value;
    setJsaFormData({ ...jsaFormData, items: newItems });
  };

  const addJSAControl = (stepIndex: number, hazardIndex: number) => {
    const newItems = [...jsaFormData.items];
    newItems[stepIndex].hazards[hazardIndex].controls.push({
      id: Date.now(),
      control: "",
      responder: ""
    });
    setJsaFormData({ ...jsaFormData, items: newItems });
  };

  const removeJSAControl = (stepIndex: number, hazardIndex: number, controlIndex: number) => {
    const newItems = [...jsaFormData.items];
    newItems[stepIndex].hazards[hazardIndex].controls = newItems[stepIndex].hazards[hazardIndex].controls.filter((_: any, i: number) => i !== controlIndex);
    setJsaFormData({ ...jsaFormData, items: newItems });
  };

  const handleJSAFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!user) {
      alert("รอการยืนยันตัวตนสักครู่...");
      e.target.value = "";
      return;
    }

    const ensuredDocId = jsaFormData.id || Date.now().toString();
    if (!jsaFormData.id) {
      setJsaFormData((prev: Record<string, any>) => ({ ...prev, id: ensuredDocId }));
    }

    setIsUploadingJSAFiles(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          // ตรวจสอบขนาดไฟล์ (ไม่เกิน 10MB)
          if (file.size > 10 * 1024 * 1024) {
            throw new Error(`ไฟล์ "${file.name}" มีขนาดใหญ่เกิน 10MB`);
          }
          
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `permit_to_work/jsa_attachments/${ensuredDocId}/${Date.now()}_${safeName}`;
          const fileRef = storageRef(storage, path);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          return {
            name: file.name,
            url,
            path,
            uploadedAt: new Date().toISOString(),
            contentType: file.type || undefined,
          };
        })
      );

      setJsaFormData((prev: Record<string, any>) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...uploaded],
      }));
    } catch (err: any) {
      console.error("Error uploading JSA files:", err);
      
      // แสดงข้อความข้อผิดพลาดที่ชัดเจนขึ้น
      let errorMessage = "อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
      
      if (err?.code === 'storage/unauthorized') {
        errorMessage = "ไม่มีสิทธิ์อัปโหลดไฟล์ กรุณาตรวจสอบการตั้งค่า Storage Rules";
      } else if (err?.code === 'storage/canceled') {
        errorMessage = "การอัปโหลดถูกยกเลิก";
      } else if (err?.code === 'storage/unknown') {
        errorMessage = "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsUploadingJSAFiles(false);
      e.target.value = "";
    }
  };

  const handleJSARemoveAttachment = (index: number) => {
    setJsaFormData((prev: Record<string, any>) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const handleJSASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingJSA || isUploadingJSAFiles) return;
    if (!user) return alert("รอการยืนยันตัวตนสักครู่...");
    const isNew = !jsaFormData.id;
    const docId = isNew ? Date.now().toString() : jsaFormData.id;
    const docToSave = {
      ...jsaFormData,
      id: docId,
      updatedAt: new Date().toISOString(),
    };
    setIsSavingJSA(true);
    try {
      if (useApiForSave()) {
        await api.saveJSA(docToSave);
      } else {
        await setDoc(jsaDoc(docId), docToSave);
      }
      setView("list");
      setJsaFormData(initialJSAFormState);
      setSelectedProjectFilter(docToSave.project || "All");
    } catch (err) {
      console.error("Error saving JSA:", err);
      alert("ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setIsSavingJSA(false);
    }
  };

  const deleteJSA = async (id: string) => {
    if (confirm("ยืนยันการลบเอกสาร JSA นี้?")) {
      try {
        if (useApiForSave()) {
          await api.deleteJSA(id);
        } else {
          await deleteDoc(jsaDoc(id));
        }
      } catch (err) {
        console.error("Error deleting JSA:", err);
        alert("ไม่สามารถลบเอกสาร JSA ได้");
      }
    }
  };

  // === User Management Handlers ===
  const openEditUserModal = (u: UserProfile & { id: string }) => {
    setEditUserModal(u);
    setEditUserRoles(Array.isArray(u.role) ? [...u.role] : []);
    setEditUserStatus(u.status);
    setEditUserPosition(u.position || "");
    setEditUserAssignedProjects(Array.isArray(u.assignedProjects) ? [...u.assignedProjects] : []);
  };

  const toggleEditRole = (role: UserRole) => {
    setEditUserRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleEditAssignedProject = (projectName: string) => {
    setEditUserAssignedProjects((prev) =>
      prev.includes(projectName)
        ? prev.filter((name) => name !== projectName)
        : [...prev, projectName]
    );
  };

  const handleSaveUser = async () => {
    if (!editUserModal || isSavingUser) return;
    if (editUserRoles.length === 0) {
      alert("ต้องกำหนดบทบาทอย่างน้อย 1 บทบาท");
      return;
    }
    setIsSavingUser(true);
    try {
      await setDoc(
        userDoc(editUserModal.id),
        {
          role: editUserRoles,
          status: editUserStatus,
          position: editUserPosition,
          assignedProjects: editUserAssignedProjects,
        },
        { merge: true }
      );
      setAdminUsers((prev) =>
        prev.map((u) =>
          u.id === editUserModal.id
            ? {
                ...u,
                role: editUserRoles,
                status: editUserStatus,
                position: editUserPosition,
                assignedProjects: editUserAssignedProjects,
              }
            : u
        )
      );
      setEditUserModal(null);
    } catch (err) {
      console.error("Error updating user:", err);
      alert("ไม่สามารถบันทึกข้อมูลผู้ใช้งานได้");
    } finally {
      setIsSavingUser(false);
    }
  };

  // --- Filtering Logic (แยกตามโครงการ) ---
  const projectNameToDisplay = new Map(
    projects.map((p) => [p.projectName, p.projectNo || p.projectName])
  );

  const allProjectNames = Array.from(
    new Set([
      ...projects.map((p) => p.projectName),
      ...wmsDocuments.map((d) => d.project || "ไม่ได้ระบุโครงการ"),
      ...jsaDocuments.map((d) => d.project || "ไม่ได้ระบุโครงการ"),
    ])
  )
    .filter(Boolean)
    .sort();

  const projectFilterOptions = allProjectNames.map((projectName) => ({
    value: projectName,
    label: projectNameToDisplay.get(projectName) || projectName,
  }));

  const assignableProjectNames = Array.from(
    new Set(projects.map((p) => p.projectName).filter(Boolean))
  ).sort();

  const filteredWMS = wmsDocuments.filter(
    (d) =>
      selectedProjectFilter === "All" ||
      (d.project || "ไม่ได้ระบุโครงการ") === selectedProjectFilter
  );
  const filteredJSA = jsaDocuments.filter(
    (d) =>
      selectedProjectFilter === "All" ||
      (d.project || "ไม่ได้ระบุโครงการ") === selectedProjectFilter
  );

  // สำหรับการ Render Table List
  const sortedJSA = [...filteredJSA].sort(compareJSADocuments);

  const groupedJSA = useMemo(() => {
    const grouped = new Map<string, any[]>();

    sortedJSA.forEach((doc) => {
      const groupKey = getJSAGroupKey(doc);
      const existing = grouped.get(groupKey);
      if (existing) {
        existing.push(doc);
        return;
      }

      grouped.set(groupKey, [doc]);
    });

    return Array.from(grouped.entries()).map(([groupKey, docs]) => ({
      groupKey,
      latestDoc: docs[0],
      olderDocs: docs.slice(1),
    }));
  }, [sortedJSA]);

  const displayJSARows = useMemo(
    () =>
      groupedJSA.flatMap(({ groupKey, latestDoc, olderDocs }) => {
        const isExpanded = !!expandedJSAGroups[groupKey];

        return [
          {
            ...latestDoc,
            _rowKind: "latest",
            _groupKey: groupKey,
            _hasOlderDocs: olderDocs.length > 0,
            _olderDocsCount: olderDocs.length,
            _isExpanded: isExpanded,
          },
          ...(!isExpanded
            ? []
            : olderDocs.map((doc) => ({
                ...doc,
                _rowKind: "older",
                _groupKey: groupKey,
                _hasOlderDocs: false,
                _olderDocsCount: 0,
                _isExpanded: false,
              }))),
        ];
      }),
    [expandedJSAGroups, groupedJSA]
  );

  let displayDocuments: any[] = [];
  if (activeTab === "wms") displayDocuments = filteredWMS;
  if (activeTab === "jsa") displayDocuments = displayJSARows;

  const hasNoDisplayDocuments =
    activeTab === "jsa" ? groupedJSA.length === 0 : displayDocuments.length === 0;

  const openProjectFromRow = (proj: any) => {
    if (!canEdit) return;
    setProjectFormData({ ...initialProjectFormState, ...proj });
    setView("form");
  };

  const openDocumentDetail = (doc: any) => {
    if (activeTab === "wms") setCurrentWMSDoc(doc);
    if (activeTab === "jsa") setCurrentJSADoc(doc ? { ...doc, items: normalizeJSAItems(doc.items) } : null);
    setView("detail");
  };

  const openDocumentDetailFromKeyboard = (
    e: React.KeyboardEvent<HTMLTableRowElement>,
    doc: any
  ) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    openDocumentDetail(doc);
  };

  const toggleJSAGroup = (groupKey: string) => {
    setExpandedJSAGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const renderDocumentActionButtons = (doc: any) => (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => {
          activeTab === "wms"
            ? setCurrentWMSDoc(doc)
            : setCurrentJSADoc(doc ? { ...doc, items: normalizeJSAItems(doc.items) } : null);
          setView("detail");
        }}
        className={`hidden ${
          activeTab === "wms"
            ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
            : "bg-orange-50 text-orange-600 hover:bg-orange-100"
        }`}
      >
        เปิดดู
      </button>
      {canEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (activeTab === "wms") {
              setWmsFormData({ ...doc, attachments: doc.attachments || [] });
              setView("form");
            } else {
              setJsaFormData({ ...doc, items: normalizeJSAItems(doc.items), attachments: doc.attachments || [] });
              setView("form");
            }
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[0px] font-semibold transition-colors bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
          title="แก้ไข"
        >
          <Pencil className="w-3.5 h-3.5" />
          แก้ไข
        </button>
      )}
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            activeTab === "wms"
              ? deleteWMS(doc.id)
              : deleteJSA(doc.id);
          }}
          className="inline-flex h-7 w-7 items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors"
          title="ลบ"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  // === Render Helpers ===
  const renderInput = (
    label: string,
    name: string,
    value: any,
    onChange: any,
    hint: string = "",
    type: string = "text",
    required: boolean = false,
    options: string[] = []
  ) => (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <label className="block text-sm font-semibold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      </div>
      {type === "textarea" ? (
        <RichTextEditor
          name={name}
          value={value}
          onChange={onChange}
          placeholder="พิมพ์ข้อความ... หรือใช้คำสั่ง Ctrl+V / Cmd+V เพื่อวางรูปภาพในนี้ได้เลย"
        />
      ) : type === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
        >
          <option value="">-- เลือกโครงการ --</option>
          {options.map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          placeholder="กรอกข้อมูล..."
        />
      )}
      {hint && type !== "textarea" && (
        <p className="mt-1 text-xs text-gray-500 flex items-center">
          <Info className="w-3 h-3 mr-1" /> {hint}
        </p>
      )}
    </div>
  );

  // --- Loading View ---
  if (loadingAuth) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700">
          กำลังเชื่อมต่อฐานข้อมูล...
        </h2>
      </div>
    );
  }

  // --- Project Form (inline เพื่อไม่ให้เคอร์เซอร์เด้งออกตอนพิมพ์) ---
  const projectFormJSX = view === "form" && activeTab === "project" && (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
      <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center text-white">
          <button
            onClick={() => setView("list")}
            className="mr-4 hover:bg-emerald-700 p-2 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">
            ข้อมูลโครงการ (Project Information)
          </h1>
        </div>
      </div>
      <form onSubmit={handleProjectSubmit} className="p-6 md:p-8 space-y-6">
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 mb-4">
          <h3 className="font-semibold text-emerald-800 mb-4 border-b border-emerald-200 pb-2">
            A1 ข้อมูลโครงการ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput(
              "Project No.",
              "projectNo",
              projectFormData.projectNo,
              handleProjectChange,
              "",
              "text",
              true
            )}
            {renderInput(
              "Project Name",
              "projectName",
              projectFormData.projectName,
              handleProjectChange,
              "",
              "text",
              true
            )}
            <div className="md:col-span-2">
              {renderInput(
                "Location",
                "location",
                projectFormData.location,
                handleProjectChange
              )}
            </div>
            {renderInput(
              "Project Manager (PM)",
              "projectManager",
              projectFormData.projectManager,
              handleProjectChange
            )}
            {renderInput(
              "Construction Manager (CM)",
              "constructionManager",
              projectFormData.constructionManager,
              handleProjectChange
            )}
            {renderInput(
              "Project Start",
              "projectStart",
              projectFormData.projectStart,
              handleProjectChange,
              "",
              "date"
            )}
            {renderInput(
              "Project Finish",
              "projectFinish",
              projectFormData.projectFinish,
              handleProjectChange,
              "",
              "date"
            )}
            {renderInput(
              "Main Contractor",
              "mainContractor",
              projectFormData.mainContractor,
              handleProjectChange
            )}
            {renderInput(
              "Sub-Contractor",
              "subContractor",
              projectFormData.subContractor,
              handleProjectChange
            )}
            {renderInput(
              "Client Name",
              "clientName",
              projectFormData.clientName,
              handleProjectChange
            )}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Project Note
            </label>
            <textarea
              name="projectNote"
              value={projectFormData.projectNote}
              onChange={handleProjectChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="หมายเหตุเพิ่มเติม..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t pt-4">
          <button
            type="button"
            onClick={() => setView("list")}
            className="px-6 py-2 border rounded-lg text-gray-700"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSavingProject}
            className="px-6 py-2 bg-emerald-600 rounded-lg text-white flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSavingProject ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            {isSavingProject ? "กำลังบันทึก..." : "บันทึกข้อมูลโครงการ"}
          </button>
        </div>
      </form>
    </div>
  );

  // --- WMS Form (inline) ---
  const wmsFormJSX = view === "form" && activeTab === "wms" && (
    <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
      <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center text-white">
          <button
            onClick={() => setView("list")}
            className="mr-4 hover:bg-blue-700 p-2 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">{wmsFormData.id ? "แก้ไข Work Method Statement" : "จัดทำ Work Method Statement"}</h1>
        </div>
      </div>
      <form onSubmit={handleWMSSubmit} className="p-6 md:p-8 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
            ข้อมูลทั่วไป (Header)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Selection with Fallback */}
            {projects.length > 0
              ? renderInput(
                  "โครงการ (Project)",
                  "project",
                  wmsFormData.project,
                  handleWMSChange,
                  "เลือกโครงการที่ได้สร้างไว้",
                  "select",
                  true,
                  projects.map((p) => p.projectName)
                )
              : renderInput(
                  "โครงการ (Project)",
                  "project",
                  wmsFormData.project,
                  handleWMSChange,
                  "ระบุชื่อโครงการสำหรับการจัดเก็บ",
                  "text",
                  true
                )}
            {renderInput(
              "ชื่องาน (Document Title)",
              "documentTitle",
              wmsFormData.documentTitle,
              handleWMSChange,
              "ระบุชื่องาน",
              "text",
              true
            )}
            {renderInput(
              "Revision",
              "rev",
              wmsFormData.rev,
              handleWMSChange,
              ""
            )}
            {renderInput(
              "วันที่ออกเอกสาร (Issue Date)",
              "issueDate",
              wmsFormData.issueDate,
              handleWMSChange,
              "",
              "date"
            )}
            {renderInput(
              "รายละเอียดการแก้ไข",
              "description",
              wmsFormData.description,
              handleWMSChange,
              ""
            )}
            {renderInput(
              "ผู้จัดทำ (Prepared by)",
              "preparedBy",
              wmsFormData.preparedBy,
              handleWMSChange,
              ""
            )}
            {renderInput(
              "ผู้อนุมัติ (Approved by)",
              "approvedBy",
              wmsFormData.approvedBy,
              handleWMSChange,
              ""
            )}
            <div className="mb-4">
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Status
                </label>
              </div>
              <select
                name="status"
                value={wmsFormData.status || "Under Preparing"}
                onChange={handleWMSChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
              >
                {DOCUMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
        <section>
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
            เนื้อหาเอกสาร (Content)
          </h2>
          {renderInput(
            "1. SCOPE / ขอบข่ายของงาน",
            "scope",
            wmsFormData.scope,
            handleWMSChange,
            "",
            "textarea"
          )}
          {renderInput(
            "2. DEFINITION / คำนิยาม",
            "definition",
            wmsFormData.definition,
            handleWMSChange,
            "",
            "textarea"
          )}
          {renderInput(
            "3. REFERENCE / เอกสารอ้างอิง",
            "reference",
            wmsFormData.reference,
            handleWMSChange,
            "",
            "textarea"
          )}

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">
              4. EQUIPMENT AND PERSONNEL / เครื่องมืออุปกรณ์ และบุคลากร
            </h3>
            {renderInput(
              "4.1 EQUIPMENT / เครื่องมืออุปกรณ์",
              "equipment",
              wmsFormData.equipment,
              handleWMSChange,
              "",
              "textarea"
            )}
            {renderInput(
              "4.2 PERSONNEL / บุคลากร",
              "personnel",
              wmsFormData.personnel,
              handleWMSChange,
              "",
              "textarea"
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">
              5. ORGANIZATION / แผนผังองค์กร
            </h3>
            {renderInput(
              "5.1 ORGANIZATION CHART / แผนผังองค์กร",
              "orgChart",
              wmsFormData.orgChart,
              handleWMSChange,
              "",
              "textarea"
            )}
            {renderInput(
              "5.2 RESPONSIBILITY / หน้าที่และความรับผิดชอบ",
              "responsibility",
              wmsFormData.responsibility,
              handleWMSChange,
              "",
              "textarea"
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">
              6. PROCEDURE DESCRIPTION / วิธีการดำเนินการ
            </h3>
            {renderInput(
              "6.1 PREPARATION / การเตรียมการก่อนเริ่มงาน",
              "preparation",
              wmsFormData.preparation,
              handleWMSChange,
              "",
              "textarea"
            )}
            {renderInput(
              "6.2 PROCEDURE / ขั้นตอนการปฏิบัติงาน",
              "procedure",
              wmsFormData.procedure,
              handleWMSChange,
              "อธิบายขั้นตอนการทำงานทีละขั้นตอน",
              "textarea"
            )}
            {renderInput(
              "6.3 FINISH OF WORK / เมื่อเสร็จสิ้นปฏิบัติงาน",
              "finishWork",
              wmsFormData.finishWork,
              handleWMSChange,
              "",
              "textarea"
            )}
          </div>

          {renderInput(
            "7. INSPECTION AND TESTING / วิธีการตรวจสอบ และการทดสอบ",
            "inspectTesting",
            wmsFormData.inspectTesting,
            handleWMSChange,
            "",
            "textarea"
          )}
          {renderInput(
            "8. JOB SAFETY ANALYSIS / การวิเคราะห์งานเพื่อความปลอดภัย",
            "jsa",
            wmsFormData.jsa,
            handleWMSChange,
            "อันตรายที่อาจเกิดขึ้น (อ้างอิงฟอร์ม JSA)",
            "textarea"
          )}
          {renderInput(
            "9. DOCUMENTED INFORMATION / เอกสารแนบ",
            "documentedInfo",
            wmsFormData.documentedInfo,
            handleWMSChange,
            "",
            "textarea"
          )}
        </section>

        {/* Attachments Section */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
            <Paperclip size={18} /> ไฟล์แนบ (Attachments)
          </h2>

          {/* Upload Buttons Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Document Upload */}
            <div className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center gap-2 bg-gray-50 transition-colors ${isUploadingWMSFiles ? "border-gray-200 opacity-60 cursor-not-allowed" : "border-gray-300 hover:border-blue-400 cursor-pointer"}`} onClick={() => !isUploadingWMSFiles && document.getElementById('wms-doc-upload')?.click()}>
              <Paperclip size={24} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">อัปโหลดเอกสาร</span>
              <span className="text-xs text-gray-400">PDF, DOC, XLSX, ฯลฯ</span>
              <input
                id="wms-doc-upload"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                className="hidden"
                onChange={(e) => handleWMSStorageUpload(e, "document")}
              />
            </div>

            {/* Photo Upload */}
            <div className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center gap-2 bg-gray-50 transition-colors ${isUploadingWMSFiles ? "border-gray-200 opacity-60 cursor-not-allowed" : "border-gray-300 hover:border-green-400 cursor-pointer"}`} onClick={() => !isUploadingWMSFiles && document.getElementById('wms-photo-upload')?.click()}>
              <ImagePlus size={24} className="text-green-500" />
              <span className="text-sm font-medium text-gray-700">อัปโหลดรูปภาพ</span>
              <span className="text-xs text-gray-400">JPG, PNG, GIF, WebP</span>
              <input
                id="wms-photo-upload"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleWMSStorageUpload(e, "photo")}
              />
            </div>

            {/* URL Input */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col gap-2 bg-gray-50">
              <div className="flex items-center gap-1 mb-1">
                <LinkIcon size={18} className="text-purple-500" />
                <span className="text-sm font-medium text-gray-700">เพิ่ม URL / ลิงก์</span>
              </div>
              <input
                type="text"
                placeholder="ชื่อลิงก์ (ไม่บังคับ)"
                value={wmsUrlNameInput}
                onChange={(e) => setWmsUrlNameInput(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <input
                type="url"
                placeholder="https://..."
                value={wmsUrlInput}
                onChange={(e) => setWmsUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleWMSAddUrl())}
                className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <button
                type="button"
                onClick={handleWMSAddUrl}
                className="w-full py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
              >
                + เพิ่มลิงก์
              </button>
            </div>
          </div>

          {/* Attachments List */}
          {(wmsFormData.attachments || []).length > 0 && (
            <div className="space-y-2">
              {(wmsFormData.attachments as any[]).map((att: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm">
                  {att.type === "photo" ? (
                    <img src={getAttachmentUrl(att)} alt={att.name} className="w-12 h-12 object-cover rounded border flex-shrink-0" />
                  ) : att.type === "url" ? (
                    <div className="w-12 h-12 flex items-center justify-center bg-purple-100 rounded border flex-shrink-0">
                      <LinkIcon size={20} className="text-purple-600" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded border flex-shrink-0">
                      <Paperclip size={20} className="text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{att.name}</p>
                    <p className="text-xs text-gray-400">
                      {att.type === "photo" ? "รูปภาพ" : att.type === "url" ? "ลิงก์ URL" : "เอกสาร"}
                    </p>
                  </div>
                  {att.type === "url" && att.url && (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    >
                      <Eye size={16} />
                    </a>
                  )}
                  {att.type === "photo" && (
                    <a
                      href={getAttachmentUrl(att)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      <Eye size={16} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleWMSRemoveAttachment(idx)}
                    className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(wmsFormData.attachments || []).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีไฟล์แนบ</p>
          )}
        </section>

        <div className="flex justify-end gap-4 border-t pt-4">
          <button
            type="button"
            onClick={() => setView("list")}
            className="px-6 py-2 border rounded-lg text-gray-700"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSavingWMS || isUploadingWMSFiles}
            className="px-6 py-2 bg-blue-600 rounded-lg text-white flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSavingWMS || isUploadingWMSFiles ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            {isSavingWMS ? "กำลังบันทึก..." : "บันทึกเอกสารลง Cloud"}
          </button>
        </div>
      </form>
    </div>
  );

  // --- WMS Detail (inline) ---
  const wmsDetailJSX = view === "detail" && activeTab === "wms" && (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => setView("list")}
          className="flex items-center text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> กลับหน้ารายการ
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() =>
              openPrintPreview({
                title: currentWMSDoc?.documentTitle || "WMS Document",
                elementId: "printable-wms",
                filename: `${currentWMSDoc?.documentTitle || "WMS_Doc"}.doc`,
                isLandscape: false,
              })
            }
            className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg"
          >
            <Printer className="w-4 h-4 mr-2" /> Print Preview
          </button>
          <button
            onClick={() =>
              exportToWord(
                "printable-wms",
                `${currentWMSDoc?.documentTitle || "WMS_Doc"}.doc`
              )
            }
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            <Download className="w-4 h-4 mr-2" /> Export Word
          </button>
        </div>
      </div>

      {/* Two-column layout: left = attachments sidebar, right = printable preview */}
      <div className="flex gap-6 items-start print:block">

        {/* LEFT: Attachments Sidebar */}
        <div className="w-72 flex-shrink-0 print:hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
            <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
              <Paperclip size={16} className="text-white" />
              <span className="text-white font-semibold text-sm">ไฟล์แนบ (Attachments)</span>
              <span className="ml-auto bg-gray-600 text-gray-200 text-xs px-2 py-0.5 rounded-full">
                {(currentWMSDoc?.attachments || []).length}
              </span>
            </div>

            {(currentWMSDoc?.attachments || []).length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Paperclip size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">ไม่มีไฟล์แนบ</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Documents */}
                {(currentWMSDoc?.attachments as any[] || []).filter((a: any) => a.type === "document").length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Paperclip size={12} /> เอกสาร
                    </p>
                    <div className="space-y-1">
                      {(currentWMSDoc?.attachments as any[] || []).filter((a: any) => a.type === "document").map((att: any, idx: number) => (
                        <a
                          key={idx}
                          href={getAttachmentUrl(att)}
                          download={att.name}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 transition-colors group cursor-pointer"
                        >
                          <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded flex-shrink-0 group-hover:bg-blue-200">
                            <Paperclip size={14} className="text-blue-600" />
                          </div>
                          <span className="text-xs text-gray-700 truncate flex-1 group-hover:text-blue-700">{att.name}</span>
                          <Download size={12} className="text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos */}
                {(currentWMSDoc?.attachments as any[] || []).filter((a: any) => a.type === "photo").length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <ImagePlus size={12} /> รูปภาพ
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {(currentWMSDoc?.attachments as any[] || []).filter((a: any) => a.type === "photo").map((att: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setLightboxSrc(getAttachmentUrl(att))}
                          className="relative group aspect-square overflow-hidden rounded border border-gray-200 hover:border-green-400 transition-colors"
                          title={att.name}
                        >
                          <img src={getAttachmentUrl(att)} alt={att.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye size={14} className="text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* URLs */}
                {(currentWMSDoc?.attachments as any[] || []).filter((a: any) => a.type === "url").length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <LinkIcon size={12} /> ลิงก์ URL
                    </p>
                    <div className="space-y-1">
                      {(currentWMSDoc?.attachments as any[] || []).filter((a: any) => a.type === "url").map((att: any, idx: number) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-purple-50 transition-colors group"
                        >
                          <div className="w-8 h-8 flex items-center justify-center bg-purple-100 rounded flex-shrink-0 group-hover:bg-purple-200">
                            <LinkIcon size={14} className="text-purple-600" />
                          </div>
                          <span className="text-xs text-gray-700 truncate flex-1 group-hover:text-purple-700">{att.name}</span>
                          <Eye size={12} className="text-gray-400 group-hover:text-purple-600 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Preview Document */}
        <div className="flex-1 min-w-0">
      <div
        id="printable-wms"
        className="document-export-preview wms-print-document bg-white p-6 md:p-10 rounded-xl shadow-md mx-auto min-h-[297mm] print:min-h-0 print:rounded-none print:shadow-none print:p-0"
        style={{ maxWidth: "210mm" }}
      >
        {/* ตาราง HTML จริง — เบราว์เซอร์ซ้ำ <thead> ทุกหน้าตอนพิมพ์ (div + display:table มักไม่ซ้ำ) */}
        <table className="wms-print-outer-table w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th scope="colgroup" className="wms-print-outer-th p-0 align-top text-left font-normal border-0">
        <table className="wms-export-title-table w-full border-collapse mb-3" role="presentation">
          <tbody>
            <tr>
              <td style={{ width: "25%", verticalAlign: "top" }}>
                <CMGLogo />
              </td>
              <td style={{ width: "50%", textAlign: "center", verticalAlign: "top" }}>
                <h1 className="text-[1.4em] font-bold uppercase tracking-wide leading-tight">
                  Method Statement
                </h1>
                <h2 className="text-[1.2em] mt-1 font-semibold leading-tight">วิธีการปฏิบัติงาน</h2>
                <h3 className="text-[1.08em] mt-1 text-gray-700 leading-snug">
                  {currentWMSDoc?.documentTitle}
                </h3>
              </td>
              <td style={{ width: "25%", textAlign: "right", verticalAlign: "top" }}>
                <span className="wms-fm-code text-[0.95em] text-gray-600 font-semibold">
                  FM-SHE-013-00
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="wms-export-meta-table w-full border-collapse border border-gray-400 mb-0 print:mb-0">
          <tbody>
            <tr>
              <th className="border border-gray-400 py-1 px-2 bg-gray-100 w-1/4 text-left align-middle">
                Project.
              </th>
              <td className="wms-proj-val border border-gray-400 py-1 px-2 text-center font-semibold text-blue-800 align-middle">
                {currentWMSDoc?.project}
              </td>
              <th className="border border-gray-400 py-1 px-2 bg-gray-100 w-1/4 text-left align-middle">
                Issue Date
              </th>
              <td className="border border-gray-400 py-1 px-2 text-center align-middle">
                {currentWMSDoc?.issueDate}
              </td>
            </tr>
            <tr>
              <th className="border border-gray-400 py-1 px-2 bg-gray-100 w-1/4 text-left align-middle">
                Rev.
              </th>
              <td className="border border-gray-400 py-1 px-2 text-center align-middle">
                {currentWMSDoc?.rev}
              </td>
              <th className="border border-gray-400 py-1 px-2 bg-gray-100 text-left align-middle">
                Description
              </th>
              <td className="border border-gray-400 py-1 px-2 text-center align-middle">
                {currentWMSDoc?.description}
              </td>
            </tr>
            <tr>
              <th className="border border-gray-400 py-1 px-2 bg-gray-100 text-left align-middle">
                Prepared by
              </th>
              <td className="border border-gray-400 py-1 px-2 text-center align-middle">
                {currentWMSDoc?.preparedBy}
              </td>
              <th className="border border-gray-400 py-1 px-2 bg-gray-100 text-left align-middle">
                Approved by
              </th>
              <td className="border border-gray-400 py-1 px-2 text-center align-middle">
                {currentWMSDoc?.approvedBy}
              </td>
            </tr>
          </tbody>
        </table>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="wms-print-outer-td p-0 align-top border-0">
        <div className="wms-export-sections space-y-2 text-gray-900 leading-snug">
          <div>
            <div className="wms-export-heading font-bold bg-gray-100 py-1 px-2 uppercase text-[1.06em] leading-tight">
              1. SCOPE / ขอบข่ายของงาน
            </div>
            <div
              className="wms-export-body mt-1 ml-3 whitespace-pre-wrap content"
              dangerouslySetInnerHTML={{ __html: currentWMSDoc?.scope || "-" }}
            />
          </div>

          <div>
            <div className="wms-export-heading font-bold bg-gray-100 py-1 px-2 uppercase text-[1.06em] leading-tight">
              2. DEFINITION / คำนิยาม
            </div>
            <div
              className="wms-export-body mt-1 ml-3 whitespace-pre-wrap content"
              dangerouslySetInnerHTML={{
                __html: currentWMSDoc?.definition || "-",
              }}
            />
          </div>

          <div>
            <div className="wms-export-heading font-bold bg-gray-100 py-1 px-2 uppercase text-[1.06em] leading-tight">
              3. REFERENCE / เอกสารอ้างอิง
            </div>
            <div
              className="wms-export-body mt-1 ml-3 whitespace-pre-wrap content"
              dangerouslySetInnerHTML={{
                __html: currentWMSDoc?.reference || "-",
              }}
            />
          </div>

          <div>
            <div className="wms-export-heading font-bold bg-gray-100 py-1 px-2 uppercase text-[1.06em] leading-tight">
              4. EQUIPMENT AND PERSONNEL / เครื่องมืออุปกรณ์ และบุคลากร
            </div>
            <div className="mt-1 ml-3">
              <div className="wms-export-sub font-semibold mb-0.5 text-[1.03em] leading-tight">
                4.1 EQUIPMENT / เครื่องมืออุปกรณ์ที่นำมาใช้ในงาน
              </div>
              <div
                className="wms-export-body mb-2 whitespace-pre-wrap content pl-3"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.equipment || "-",
                }}
              />
              <div className="wms-export-sub font-semibold mb-0.5 text-[1.03em] leading-tight">4.2 PERSONNEL / บุคลากร</div>
              <div
                className="wms-export-body whitespace-pre-wrap content pl-3"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.personnel || "-",
                }}
              />
            </div>
          </div>

          <div>
            <div className="wms-export-heading font-bold bg-gray-100 py-1 px-2 uppercase text-[1.06em] leading-tight">
              5. ORGANIZATION / แผนผังองค์กร
            </div>
            <div className="mt-1 ml-3">
              <div className="wms-export-sub font-semibold mb-0.5 text-[1.03em] leading-tight">
                5.1 ORGANIZATION CHART / แผนผังองค์กร
              </div>
              <div
                className="wms-export-body mb-2 whitespace-pre-wrap content pl-3"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.orgChart || "-",
                }}
              />
              <div className="wms-export-sub font-semibold mb-0.5 text-[1.03em] leading-tight">
                5.2 RESPONSIBILITY / หน้าที่และความรับผิดชอบ
              </div>
              <div
                className="wms-export-body whitespace-pre-wrap content pl-3"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.responsibility || "-",
                }}
              />
            </div>
          </div>

          <div>
            <div className="wms-export-heading font-bold bg-gray-100 py-1 px-2 uppercase text-[1.06em] leading-tight">
              6. PROCEDURE DESCRIPTION / วิธีการดำเนินการ
            </div>
            <div className="mt-1 ml-3">
              <div className="wms-export-sub font-semibold mb-0.5 text-[1.03em] leading-tight">
                6.1 PREPARATION / การเตรียมการก่อนการเริ่มงาน
              </div>
              <div
                className="wms-export-body mb-2 whitespace-pre-wrap content pl-3"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.preparation || "-",
                }}
              />
              <div className="wms-export-sub font-semibold mb-0.5 text-[1.03em] leading-tight">
                6.2 PROCEDURE / ขั้นตอนการปฏิบัติงาน
              </div>
              <div
                className="wms-export-body mb-2 whitespace-pre-wrap content pl-3"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.procedure || "-",
                }}
              />
              <div className="wms-export-sub font-semibold mb-0.5 text-[1.03em] leading-tight">
                6.3 FINISH OF WORK / เมื่อเสร็จสิ้นการปฏิบัติงาน
              </div>
              <div
                className="wms-export-body whitespace-pre-wrap content pl-3"
                dangerouslySetInnerHTML={{
                  __html: currentWMSDoc?.finishWork || "-",
                }}
              />
            </div>
          </div>

          <div>
            <div className="wms-export-heading font-bold bg-gray-100 py-1 px-2 uppercase text-[1.06em] leading-tight">
              7. INSPECTION AND TESTING / วิธีการตรวจสอบ และการทดสอบ
            </div>
            <div
              className="wms-export-body mt-1 ml-3 whitespace-pre-wrap content"
              dangerouslySetInnerHTML={{
                __html: currentWMSDoc?.inspectTesting || "-",
              }}
            />
          </div>

          <div>
            <div className="wms-export-heading font-bold bg-gray-100 py-1 px-2 uppercase text-[1.06em] leading-tight">
              8. JOB SAFETY ANALYSIS / การวิเคราะห์งานเพื่อความปลอดภัย
            </div>
            <div
              className="wms-export-body mt-1 ml-3 whitespace-pre-wrap content"
              dangerouslySetInnerHTML={{ __html: currentWMSDoc?.jsa || "-" }}
            />
          </div>

          <div>
            <div className="wms-export-heading font-bold bg-gray-100 py-1 px-2 uppercase text-[1.06em] leading-tight">
              9. DOCUMENTED INFORMATION / เอกสารแนบ
            </div>
            <div
              className="wms-export-body mt-1 ml-3 whitespace-pre-wrap content"
              dangerouslySetInnerHTML={{
                __html: currentWMSDoc?.documentedInfo || "-",
              }}
            />
          </div>
        </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
        </div>{/* end right column */}
      </div>{/* end two-column flex */}

      {/* Lightbox for photo preview */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 print:hidden"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 flex items-center gap-1 text-sm"
            >
              <X size={18} /> ปิด
            </button>
            <img src={lightboxSrc} alt="preview" className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );

  // --- JSA Form (inline) ---
  const jsaFormJSX = view === "form" && activeTab === "jsa" && (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
      <div className="bg-orange-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center text-white">
          <button
            onClick={() => setView("list")}
            className="mr-4 hover:bg-orange-700 p-2 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">{jsaFormData.id ? "แก้ไข JOB SAFETY ANALYSIS (JSA)" : "จัดทำ JOB SAFETY ANALYSIS (JSA)"}</h1>
        </div>
      </div>
      <form onSubmit={handleJSASubmit} className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-orange-50 p-6 rounded-lg border border-orange-100">
          {renderInput(
            "Client/เจ้าของโครงการ",
            "client",
            jsaFormData.client,
            handleJSAChange
          )}
          {projects.length > 0
            ? renderInput(
                "Project/โครงการ",
                "project",
                jsaFormData.project,
                handleJSAChange,
                "เลือกโครงการอ้างอิง",
                "select",
                true,
                projects.map((p) => p.projectName)
              )
            : renderInput(
                "Project/โครงการ",
                "project",
                jsaFormData.project,
                handleJSAChange,
                "ระบุชื่อโครงการ",
                "text",
                true
              )}
          {renderInput(
            "Job Title/งานที่วิเคราะห์",
            "jobTitle",
            jsaFormData.jobTitle,
            handleJSAChange,
            "",
            "text",
            true
          )}
          {renderInput(
            "ผู้จัดทำ (Prepared by)",
            "preparedBy",
            jsaFormData.preparedBy,
            handleJSAChange
          )}
          {renderInput(
            "ผู้ตรวจสอบ (Reviewed by)",
            "reviewedBy",
            jsaFormData.reviewedBy,
            handleJSAChange
          )}
          {renderInput(
            "ผู้อนุมัติ (Approved by)",
            "approvedBy",
            jsaFormData.approvedBy,
            handleJSAChange
          )}
          {renderInput(
            "Date./วันที่",
            "date",
            jsaFormData.date,
            handleJSAChange,
            "",
            "date"
          )}
          {renderInput(
            "Rev./ปรับปรุงครั้งที่",
            "rev",
            jsaFormData.rev,
            handleJSAChange
          )}
          <div className="mb-4">
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-semibold text-gray-700">
                Status
              </label>
            </div>
            <select
              name="status"
              value={jsaFormData.status || "Under Preparing"}
              onChange={handleJSAChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors bg-white"
            >
              {DOCUMENT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-left bg-white">
            <thead className="bg-gray-100 text-gray-700 text-sm">
              <tr>
                <th className="p-3 w-12 text-center">No.</th>
                <th className="p-3 w-1/4">ขั้นตอนการปฏิบัติงาน (Job step)</th>
                <th className="p-3 w-1/4">อันตรายที่อาจเกิดขึ้น (Hazard)</th>
                <th className="p-3 w-1/4">
                  มาตรการแก้ไขและควบคุม (Control measure)
                </th>
                <th className="p-3">ผู้รับผิดชอบ</th>
                <th className="p-3 w-16 text-center">ลบ</th>
              </tr>
            </thead>
            <tbody>
              {jsaFormData.items.map((step: any, sIdx: number) => {
                const stepRowsCount = step.hazards.reduce((acc: number, h: any) => acc + Math.max(1, h.controls.length), 0) || 1;

                return step.hazards.flatMap((hazard: any, hIdx: number) => {
                  const hazardRowsCount = Math.max(1, hazard.controls.length);

                  return hazard.controls.map((control: any, cIdx: number) => {
                    const isFirstStepRow = hIdx === 0 && cIdx === 0;
                    const isFirstHazardRow = cIdx === 0;

                    return (
                      <tr key={`${step.id}-${hazard.id}-${control.id}`} className="border-t">
                        {isFirstStepRow && (
                          <>
                            <td rowSpan={stepRowsCount} className="p-2 text-center align-top font-medium text-gray-500 border-r">
                              {sIdx + 1}
                            </td>
                            <td rowSpan={stepRowsCount} className="p-2 align-top border-r w-1/4">
                              <div className="flex flex-col h-full justify-between gap-2">
                                <textarea
                                  rows={4}
                                  className="w-full p-2 border rounded resize-none text-sm outline-none focus:ring-1 focus:ring-orange-500"
                                  value={step.step}
                                  onChange={(e) =>
                                    handleJSAStepChange(sIdx, e.target.value)
                                  }
                                  required
                                  placeholder="ระบุขั้นตอน..."
                                />
                                <button
                                  type="button"
                                  onClick={() => addJSAHazard(sIdx)}
                                  className="flex items-center self-start text-xs font-semibold px-2.5 py-1 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded border border-orange-200 transition"
                                >
                                  <Plus size={12} className="mr-1" /> เพิ่มอันตราย (+ Hazard)
                                </button>
                              </div>
                            </td>
                          </>
                        )}

                        {isFirstHazardRow && (
                          <td rowSpan={hazardRowsCount} className="p-2 align-top border-r w-1/4">
                            <div className="flex flex-col h-full justify-between gap-2">
                              <div className="flex gap-1 items-start">
                                <span className="text-xs text-gray-400 font-semibold mt-2.5">{sIdx + 1}.{hIdx + 1}</span>
                                <textarea
                                  rows={3}
                                  className="w-full p-2 border rounded resize-none text-sm outline-none focus:ring-1 focus:ring-orange-500"
                                  value={hazard.hazard}
                                  onChange={(e) =>
                                    handleJSAHazardChange(sIdx, hIdx, e.target.value)
                                  }
                                  required
                                  placeholder="ระบุอันตราย..."
                                />
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                <button
                                  type="button"
                                  onClick={() => addJSAControl(sIdx, hIdx)}
                                  className="flex items-center text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200 transition"
                                >
                                  <Plus size={12} className="mr-1" /> เพิ่มมาตรการ (+ Control)
                                </button>
                                {step.hazards.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeJSAHazard(sIdx, hIdx)}
                                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-1 py-0.5 rounded transition"
                                    title="ลบอันตรายนี้"
                                  >
                                    ลบอันตราย
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        )}

                        <td className="p-2 align-top border-r w-1/4">
                          <div className="flex gap-1 items-start">
                            <span className="text-xs text-gray-400 font-semibold mt-2.5">{sIdx + 1}.{hIdx + 1}.{cIdx + 1}</span>
                            <textarea
                              rows={3}
                              className="w-full p-2 border rounded resize-none text-sm outline-none focus:ring-1 focus:ring-orange-500"
                              value={control.control}
                              onChange={(e) =>
                                handleJSAControlChange(sIdx, hIdx, cIdx, "control", e.target.value)
                              }
                              required
                              placeholder="ระบุมาตรการ..."
                            />
                          </div>
                        </td>

                        <td className="p-2 align-top border-r">
                          <div className="flex flex-col gap-2 h-full justify-between">
                            <input
                              type="text"
                              className="w-full p-2 border rounded text-sm outline-none focus:ring-1 focus:ring-orange-500"
                              value={control.responder}
                              onChange={(e) =>
                                handleJSAControlChange(sIdx, hIdx, cIdx, "responder", e.target.value)
                              }
                              placeholder="ชื่อ/ตำแหน่ง"
                            />
                            {hazard.controls.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeJSAControl(sIdx, hIdx, cIdx)}
                                className="text-xs text-red-500 hover:text-red-700 self-end hover:bg-red-50 px-1 py-0.5 rounded transition"
                              >
                                ลบมาตรการ
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="p-2 text-center align-middle">
                          {isFirstStepRow && (
                            <button
                              type="button"
                              onClick={() => removeJSAStep(sIdx)}
                              className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded transition"
                              title="ลบขั้นตอนงานนี้"
                            >
                              <MinusCircle size={20} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  });
                });
              })}
            </tbody>
          </table>
          <div className="p-3 bg-gray-50 border-t flex justify-center">
            <button
              type="button"
              onClick={addJSAStep}
              className="flex items-center px-4 py-2 bg-green-100 text-green-700 font-semibold rounded-lg hover:bg-green-200 transition shadow-sm border border-green-200"
            >
              <PlusCircle size={18} className="mr-2" /> เพิ่มขั้นตอน (Add Row)
            </button>
          </div>
        </div>

        <section className="border rounded-lg p-4 bg-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">ไฟล์แนบ (JSA Attachments)</h3>
              <p className="text-xs text-gray-500">ไฟล์ที่อัปโหลดจะถูกจัดเก็บบน Firebase Storage และสามารถเปิดดูในแท็บใหม่ได้</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="jsa-file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleJSAFileUpload}
              />
              <button
                type="button"
                onClick={() => document.getElementById("jsa-file-upload")?.click()}
                disabled={isUploadingJSAFiles}
                className="inline-flex items-center px-3 py-2 bg-orange-100 text-orange-700 rounded-md text-sm font-medium border border-orange-200 hover:bg-orange-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isUploadingJSAFiles ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />}
                {isUploadingJSAFiles ? "กำลังอัปโหลด..." : "อัปโหลดไฟล์"}
              </button>
            </div>
          </div>

          {(jsaFormData.attachments || []).length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีไฟล์แนบ</p>
          ) : (
            <div className="space-y-2">
              {(jsaFormData.attachments as any[]).map((att: any, idx: number) => (
                <div key={`${att.path || att.url || att.name}-${idx}`} className="flex items-center gap-3 p-2.5 border rounded-lg bg-gray-50">
                  <Paperclip className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-orange-700 hover:text-orange-800 hover:underline truncate"
                    title={att.name}
                  >
                    {att.name || "ไฟล์แนบ"}
                  </a>
                  <div className="ml-auto flex items-center gap-1">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-orange-600 hover:bg-orange-100 rounded transition-colors"
                      title="เปิดไฟล์"
                    >
                      <Eye size={16} />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleJSARemoveAttachment(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="ลบรายการไฟล์"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-end gap-4 border-t pt-4">
          <button
            type="button"
            onClick={() => setView("list")}
            className="px-6 py-2 border rounded-lg text-gray-700"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSavingJSA || isUploadingJSAFiles}
            className="px-6 py-2 bg-orange-600 rounded-lg text-white flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSavingJSA ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            {isSavingJSA ? "กำลังบันทึก..." : "บันทึก JSA ลง Cloud"}
          </button>
        </div>
      </form>
    </div>
  );

  // --- JSA Detail (inline) ---
  const jsaDetailJSX = view === "detail" && activeTab === "jsa" && (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => setView("list")}
          className="flex items-center text-gray-600 hover:text-orange-600"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> กลับหน้ารายการ
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() =>
              openPrintPreview({
                title: currentJSADoc?.jobTitle || "JSA Document",
                elementId: "printable-jsa",
                filename: `JSA_${currentJSADoc?.jobTitle || "Document"}.doc`,
                isLandscape: true,
              })
            }
            className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg"
          >
            <Printer className="w-4 h-4 mr-2" /> Print Preview
          </button>
          <button
            onClick={() =>
              exportToWord(
                "printable-jsa",
                `JSA_${currentJSADoc?.jobTitle || "Document"}.doc`,
                true
              )
            }
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg"
          >
            <Download className="w-4 h-4 mr-2" /> Export Word
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start print:block">
        <div className="w-80 flex-shrink-0 print:hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
            <div className="bg-orange-600 px-4 py-3 flex items-center gap-2">
              <Paperclip size={16} className="text-white" />
              <span className="text-white font-semibold text-sm">ไฟล์แนบ JSA</span>
              <span className="ml-auto bg-orange-500 text-orange-50 text-xs px-2 py-0.5 rounded-full">
                {(currentJSADoc?.attachments || []).length}
              </span>
            </div>

            {(currentJSADoc?.attachments || []).length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Paperclip size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">ไม่มีไฟล์แนบ</p>
              </div>
            ) : (
              <div className="px-4 py-3 space-y-2">
                {(currentJSADoc?.attachments as any[] || []).map((att: any, idx: number) => {
                  const attachmentUrl = att.url || att.data;
                  if (!attachmentUrl) return null;

                  return (
                    <a
                      key={`${att.path || attachmentUrl}-${idx}`}
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-orange-100 bg-orange-50/60 p-3 hover:bg-orange-100 transition-colors group"
                      title={att.name || attachmentUrl}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 flex items-center justify-center bg-white rounded-lg border border-orange-200 flex-shrink-0 group-hover:border-orange-300">
                          <LinkIcon size={16} className="text-orange-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-orange-800 truncate">
                            {att.name || "ไฟล์แนบ"}
                          </p>
                          <p className="text-xs text-orange-700/80 break-all mt-1 line-clamp-2">
                            {attachmentUrl}
                          </p>
                        </div>
                        <Eye size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      {/* Printable Area - Designed for Landscape A4 */}
      <div
        id="printable-jsa"
        className="document-export-preview jsa-print-document bg-white shadow-md mx-auto print:shadow-none min-h-[210mm] print:min-h-0 p-3 sm:p-4 print:p-0 flex-1"
        style={{ maxWidth: "297mm" }}
      >
        <table className="jsa-print-outer-table w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th scope="colgroup" className="jsa-print-outer-th p-0 align-top text-left font-normal border-0">
        {/* JSA Header Section */}
        <div className="jsa-header bg-[#fae6d1] border border-black mb-0 p-2 rounded-sm leading-snug print:rounded-none">
          <table className="jsa-header-top-table">
            <tbody>
              <tr>
                <td className="jsa-header-top-logo">
                  <CMGLogo className="jsa-header-logo" />
                </td>
                <td className="jsa-header-top-title">
                  <h1 className="jsa-header-title text-[1.22em] font-bold leading-tight">
                JOB SAFETY ANALYSIS / การวิเคราะห์งานเพื่อความปลอดภัย
                  </h1>
                </td>
                <td className="jsa-header-top-code text-right text-[0.92em] font-semibold">
                  FM-SHE-005/00
                </td>
              </tr>
            </tbody>
          </table>

          <div className="jsa-header-meta-grid grid grid-cols-12 gap-x-3 gap-y-2">
            <div className="jsa-header-field jsa-header-field--wide col-span-5">
              <span className="jsa-header-field-label">
                Client/เจ้าของโครงการ :
              </span>
              <span className="jsa-header-field-value">
                {currentJSADoc?.client}
              </span>
            </div>
            <div className="jsa-header-field jsa-header-field--mid col-span-4">
              <span className="w-24 font-semibold">ผู้จัดทำ :</span>
              <span className="jsa-header-field-value">
                {currentJSADoc?.preparedBy}
              </span>
            </div>
            <div className="jsa-header-field jsa-header-field--narrow col-span-3">
              <span className="w-28 font-semibold">Date./วันที่ :</span>
              <span className="jsa-header-field-value">
                {currentJSADoc?.date}
              </span>
            </div>

            <div className="jsa-header-field jsa-header-field--wide col-span-5">
              <span className="w-40 font-semibold">Project/โครงการ :</span>
              <span className="jsa-header-field-value jsa-header-field-value--project">
                {currentJSADoc?.project}
              </span>
            </div>
            <div className="jsa-header-field jsa-header-field--mid col-span-4">
              <span className="w-24 font-semibold">ผู้ตรวจสอบ :</span>
              <span className="jsa-header-field-value">
                {currentJSADoc?.reviewedBy}
              </span>
            </div>
            <div className="jsa-header-field jsa-header-field--narrow col-span-3">
              <span className="w-28 font-semibold">
                Rev./ปรับปรุงครั้งที่ :
              </span>
              <span className="jsa-header-field-value">
                {currentJSADoc?.rev}
              </span>
            </div>

            <div className="jsa-header-field jsa-header-field--wide col-span-5">
              <span className="w-40 font-semibold">
                Job Title/งานที่วิเคราะห์ :
              </span>
              <span className="jsa-header-field-value">
                {currentJSADoc?.jobTitle}
              </span>
            </div>
            <div className="jsa-header-field jsa-header-field--mid col-span-4">
              <span className="w-24 font-semibold">ผู้อนุมัติ :</span>
              <span className="jsa-header-field-value">
                {currentJSADoc?.approvedBy}
              </span>
            </div>
            <div className="jsa-header-field jsa-header-field--ghost col-span-3" aria-hidden="true"></div>
          </div>
        </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="jsa-print-outer-td p-0 align-top border-0 pt-2 print:pt-1">
        {/* JSA Table Section */}
        <table className="jsa-print-grid w-full border-collapse border border-black leading-snug">
          <thead>
            <tr className="bg-[#fae6d1]">
              <th className="border border-black py-1 px-1.5 w-12 text-center">
                ลำดับที่
                <br />
                <span className="text-[0.78em] font-normal">No.</span>
              </th>
              <th className="border border-black py-1 px-1.5 w-[25%] text-center">
                ขั้นตอนการปฏิบัติงาน
                <br />
                <span className="text-[0.78em] font-normal">Job step</span>
              </th>
              <th className="border border-black py-1 px-1.5 w-[30%] text-center">
                อันตรายที่อาจเกิดขึ้น
                <br />
                <span className="text-[0.78em] font-normal">
                  Hazard Identification
                </span>
              </th>
              <th className="border border-black py-1 px-1.5 w-[30%] text-center">
                มาตรการดำเนินการเพื่อแก้ไขและควบคุม
                <br />
                <span className="text-[0.78em] font-normal">
                  Control/Reduce measure activities
                </span>
              </th>
              <th className="border border-black py-1 px-1.5 w-32 text-center">
                ผู้รับผิดชอบ
                <br />
                <span className="text-[0.78em] font-normal">Responded by</span>
              </th>
            </tr>
          </thead>
          {normalizeJSAItems(currentJSADoc?.items).flatMap((step: any, sIdx: number) => {
              return step.hazards.flatMap((hazard: any, hIdx: number) => {
                const controls =
                  hazard.controls && hazard.controls.length
                    ? hazard.controls
                    : [{ id: `empty-control-${hazard.id}`, control: "", responder: "" }];

                return controls.map((control: any, cIdx: number) => {
                  const isFirstStepRow = hIdx === 0 && cIdx === 0;
                  const isFirstHazardRow = cIdx === 0;

                  return (
                    <tbody
                      key={`${step.id}-${hazard.id}-${control.id}`}
                      className="jsa-print-row-group bg-[#e6f2e6]"
                    >
                      <tr className="border border-black dotted-border">
                        <td className="border-r border-l border-black py-1 px-1.5 text-center align-top border-b border-dotted">
                          {isFirstStepRow ? sIdx + 1 : ""}
                        </td>
                        <td className="border-r border-black py-1 px-1.5 align-top whitespace-pre-wrap border-b border-dotted">
                          {isFirstStepRow ? step.step : ""}
                        </td>
                        <td className="border-r border-black py-1 px-1.5 align-top whitespace-pre-wrap border-b border-dotted">
                          {isFirstHazardRow ? `${sIdx + 1}.${hIdx + 1} ${hazard.hazard}` : ""}
                        </td>
                        <td className="border-r border-black py-1 px-1.5 align-top whitespace-pre-wrap border-b border-dotted">
                          {`${sIdx + 1}.${hIdx + 1}.${cIdx + 1} ${control.control}`}
                        </td>
                        <td className="border-r border-black py-1 px-1.5 align-top text-center border-b border-dotted whitespace-pre-wrap">
                          {control.responder}
                        </td>
                      </tr>
                    </tbody>
                  );
                });
              });
            })}
            {/* Add empty rows if items are few, to make it look like a full form */}
            {(() => {
              const totalRows = normalizeJSAItems(currentJSADoc?.items).reduce(
                (acc: number, step: any) =>
                  acc +
                  step.hazards.reduce(
                    (hAcc: number, h: any) => hAcc + Math.max(1, h.controls.length),
                    0
                  ),
                0
              );
              return Array.from({
                length: Math.max(0, 5 - totalRows),
              }).map((_, i) => (
                <tbody key={`empty-group-${i}`} className="bg-[#e6f2e6]">
                  <tr
                    key={`empty-${i}`}
                    className="border border-black dotted-border h-7"
                  >
                    <td className="border-r border-l border-black border-b border-dotted"></td>
                    <td className="border-r border-black border-b border-dotted"></td>
                    <td className="border-r border-black border-b border-dotted"></td>
                    <td className="border-r border-black border-b border-dotted"></td>
                    <td className="border-r border-black border-b border-dotted"></td>
                  </tr>
                </tbody>
              ));
            })()}
        </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );

  // --- Main Layout ---
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans print:h-auto print:min-h-0 print:overflow-visible">
      {/* Sidebar - Hidden on print */}
      <div
        className={`${
          sidebarCollapsed ? "w-16" : "w-64"
        } bg-gray-900 text-white flex flex-col print:hidden shadow-xl z-10 transition-all duration-300 ease-in-out flex-shrink-0`}
      >
        {/* โปรไฟล์ Card บนสุด Sidebar */}
        <div className="flex-shrink-0 border-b border-gray-800 p-3">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
              {(user?.photoURL ?? userProfile?.photoURL) ? (
                <img src={(user?.photoURL ?? userProfile?.photoURL) as string} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-6 h-6 text-gray-400" />
              )}
            </div>
            {!sidebarCollapsed && userProfile && (
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate text-white">
                  {userProfile.firstName} {userProfile.lastName}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {Array.isArray(userProfile.role) ? userProfile.role.join(", ") : ""}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Header + Toggle */}
        <div className="flex items-center justify-between border-b border-gray-800 h-12 px-3 flex-shrink-0">
          {!sidebarCollapsed && (
            <span className="font-bold text-lg tracking-wider truncate">SHE System</span>
          )}
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className={`flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0 ${
              sidebarCollapsed ? "mx-auto" : "ml-auto"
            }`}
            title={sidebarCollapsed ? "ขยาย Sidebar" : "ย่อ Sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        <nav className="flex-1 pt-4 pb-4 space-y-1 px-2">
          {/* Project */}
          {canAccess("projects") && (
          <button
            onClick={() => { setActiveTab("project"); setView("list"); }}
            title="ข้อมูลโครงการ"
            className={`w-full flex items-center rounded-lg transition-colors ${
              sidebarCollapsed ? "justify-center px-2 py-3" : "px-4 py-3"
            } ${
              activeTab === "project"
                ? "bg-emerald-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Briefcase className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && (
              <div className="text-left ml-3 min-w-0">
                <div className="font-semibold text-sm leading-tight">ข้อมูลโครงการ</div>
                <div className="text-[11px] opacity-70 leading-tight mt-0.5">Projects</div>
              </div>
            )}
          </button>
          )}

          {/* WMS */}
          {canAccess("wms") && (
          <button
            onClick={() => { setActiveTab("wms"); setView("list"); }}
            title="Method Statement"
            className={`w-full flex items-center rounded-lg transition-colors ${
              sidebarCollapsed ? "justify-center px-2 py-3" : "px-4 py-3"
            } ${
              activeTab === "wms"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && (
              <div className="text-left ml-3 min-w-0">
                <div className="font-semibold text-sm leading-tight">Method Statement</div>
                <div className="text-[11px] opacity-70 leading-tight mt-0.5">WMS Document</div>
              </div>
            )}
          </button>
          )}

          {/* JSA */}
          {canAccess("jsa") && (
          <button
            onClick={() => { setActiveTab("jsa"); setView("list"); }}
            title="Job Safety Analysis"
            className={`w-full flex items-center rounded-lg transition-colors ${
              sidebarCollapsed ? "justify-center px-2 py-3" : "px-4 py-3"
            } ${
              activeTab === "jsa"
                ? "bg-orange-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && (
              <div className="text-left ml-3 min-w-0">
                <div className="font-semibold text-sm leading-tight">Job Safety Analysis</div>
                <div className="text-[11px] opacity-70 leading-tight mt-0.5">JSA Form</div>
              </div>
            )}
          </button>
          )}

          {/* Work Permit */}
          {canAccess("work_permit") && (
          <button
            onClick={() => { setActiveTab("work_permit"); setView("list"); }}
            title="Work Permit"
            className={`w-full flex items-center rounded-lg transition-colors ${
              sidebarCollapsed ? "justify-center px-2 py-3" : "px-4 py-3"
            } ${
              activeTab === "work_permit"
                ? "bg-amber-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <ClipboardCheck className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && (
              <div className="text-left ml-3 min-w-0">
                <div className="font-semibold text-sm leading-tight">Work Permit</div>
                <div className="text-[11px] opacity-70 leading-tight mt-0.5">ใบอนุญาตทำงาน</div>
              </div>
            )}
          </button>
          )}

          {/* Database */}
          {canAccess("database") && (
          <button
            onClick={() => { setActiveTab("database"); setView("list"); }}
            title="Database"
            className={`w-full flex items-center rounded-lg transition-colors ${
              sidebarCollapsed ? "justify-center px-2 py-3" : "px-4 py-3"
            } ${
              activeTab === "database"
                ? "bg-cyan-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Database className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && (
              <div className="text-left ml-3 min-w-0">
                <div className="font-semibold text-sm leading-tight">Database</div>
                <div className="text-[11px] opacity-70 leading-tight mt-0.5">ฐานข้อมูลอ้างอิง</div>
              </div>
            )}
          </button>
          )}
        </nav>

        {/* จัดการผู้ใช้งาน - เฉพาะ SuperAdmin/Admin */}
        {canManageUsers && (
          <div className="border-t border-gray-800 pt-2 px-2 pb-2">
            <button
              onClick={() => { setActiveTab("users"); setView("list"); }}
              title={`จัดการผู้ใช้งาน${pendingUsersCount > 0 ? ` (${pendingUsersCount} รออนุมัติ)` : ""}`}
              className={`w-full flex items-center rounded-lg transition-colors relative ${
                sidebarCollapsed ? "justify-center px-2 py-3" : "px-4 py-3"
              } ${
                activeTab === "users"
                  ? "bg-violet-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {/* ไอคอน Users พร้อม badge แจ้งเตือน */}
              <div className="relative flex-shrink-0">
                <Users className="w-5 h-5" />
                {pendingUsersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {pendingUsersCount > 99 ? "99+" : pendingUsersCount}
                  </span>
                )}
              </div>

              {!sidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between ml-3 min-w-0">
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-sm leading-tight">จัดการผู้ใช้งาน</div>
                    <div className="text-[11px] opacity-70 leading-tight mt-0.5">User Management</div>
                  </div>
                  {pendingUsersCount > 0 && (
                    <span className="flex-shrink-0 ml-2 min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {pendingUsersCount > 99 ? "99+" : pendingUsersCount}
                    </span>
                  )}
                </div>
              )}
            </button>
          </div>
        )}

        {/* Firebase Status Indicator */}
        <div className="p-3 border-t border-gray-800">
          <div className={`flex items-center ${
            sidebarCollapsed ? "justify-center" : "justify-between"
          }`}>
            <div className="flex items-center text-xs">
              {user ? (
                <>
                  <div className="flex items-center">
                    <Wifi className="w-3 h-3 text-green-400" />
                    {!sidebarCollapsed && <Database className="w-3 h-3 text-green-400 ml-1 mr-2" />}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
                      <span className="text-green-400 font-medium">Connected</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center">
                    <Wifi className="w-3 h-3 text-red-400 opacity-50" />
                    {!sidebarCollapsed && <Database className="w-3 h-3 text-red-400 opacity-50 ml-1 mr-2" />}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-red-400 rounded-full mr-1.5"></div>
                      <span className="text-red-400 font-medium">Offline</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto print:overflow-visible print:h-auto print:min-h-0 relative flex flex-col">
        {/* แถบมุมขวาบน: โปรไฟล์ + Dropdown (อัพเดทโปรไฟล์ / Logout) */}
        <div className="flex-shrink-0 sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200 print:hidden">
          <div className="flex items-center justify-end h-14 px-4 md:px-6">
            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-gray-100 transition-colors"
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {(user?.photoURL ?? userProfile?.photoURL) ? (
                    <img src={(user?.photoURL ?? userProfile?.photoURL) as string} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${profileDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-1 w-52 py-1 bg-white rounded-lg shadow-lg border border-gray-200 z-30">
                  <Link
                    to="/account"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <UserCircle className="w-4 h-4" /> อัพเดทโปรไฟล์
                  </Link>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      setProfileDropdownOpen(false);
                      await authLogout();
                      navigate("/login");
                    }}
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic List Views based on activeTab */}
        {view === "list" && (
          activeTab === "work_permit" ? (
            <WorkPermitView />
          ) : activeTab === "database" ? (
            <DatabaseView />
          ) : (
            <div className="w-full max-w-screen-2xl 2xl:max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-10 py-6 md:py-8 print:hidden text-[15px] sm:text-base leading-normal antialiased">
            {/* Header Card — layout เดียวกันทุกเมนู */}
            <div className="flex flex-row justify-between items-center gap-4 mb-5 bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100 min-h-[88px]">
              {/* ซ้าย: ไอคอน + ชื่อเมนู */}
              <div className="flex items-center">
                <div
                  className={`p-3 rounded-lg mr-4 flex-shrink-0 ${
                    activeTab === "wms"
                      ? "bg-blue-100 text-blue-600"
                      : activeTab === "jsa"
                      ? "bg-orange-100 text-orange-600"
                      : activeTab === "users"
                      ? "bg-violet-100 text-violet-600"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {activeTab === "wms" ? (
                    <LayoutDashboard size={28} />
                  ) : activeTab === "jsa" ? (
                    <ShieldAlert size={28} />
                  ) : activeTab === "users" ? (
                    <Users size={28} />
                  ) : (
                    <Briefcase size={28} />
                  )}
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-snug">
                    {activeTab === "wms"
                      ? "Method Statement (WMS)"
                      : activeTab === "jsa"
                      ? "Job Safety Analysis (JSA)"
                      : activeTab === "users"
                      ? "จัดการผู้ใช้งาน"
                      : "ข้อมูลโครงการ (Projects)"}
                  </h1>
                  <p className="text-gray-500 text-sm mt-1 leading-snug max-w-2xl">
                    {activeTab === "wms"
                      ? "ระบบจัดการรายการเอกสารวิธีการปฏิบัติงาน"
                      : activeTab === "jsa"
                      ? "ระบบจัดการรายการการวิเคราะห์ความปลอดภัย"
                      : activeTab === "users"
                      ? "User Management (SuperAdmin/Admin)"
                      : "ระบบจัดการข้อมูลโครงการหลักอ้างอิง"}
                  </p>
                </div>
              </div>

              {/* ขวา: ปุ่ม action หรือ badge (ขนาดเท่ากันทุกเมนู) */}
              <div className="flex-shrink-0 ml-4">
                {activeTab === "users" ? (
                  /* Users: แสดงจำนวนรออนุมัติ */
                  pendingUsersCount > 0 ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                      <span className="text-sm font-semibold text-red-700">
                        {pendingUsersCount} รออนุมัติ
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                      <span className="text-sm font-semibold text-green-700">อนุมัติครบแล้ว</span>
                    </div>
                  )
                ) : canCreate ? (
                  /* เมนูอื่น: ปุ่มสร้างใหม่ */
                  <button
                    onClick={() => {
                      if (activeTab === "wms") setWmsFormData(initialWMSFormState);
                      if (activeTab === "jsa") setJsaFormData(initialJSAFormState);
                      if (activeTab === "project") setProjectFormData(initialProjectFormState);
                      setView("form");
                    }}
                    className={`flex items-center px-5 py-2.5 text-white rounded-lg shadow-sm transition-all text-sm font-semibold ${
                      activeTab === "wms"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : activeTab === "jsa"
                        ? "bg-orange-600 hover:bg-orange-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    <Plus className="w-5 h-5 mr-2" /> สร้างใหม่
                  </button>
                ) : null}
              </div>
            </div>

            {activeTab === "users" && (
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setUserMgmtSubTab("list")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    userMgmtSubTab === "list"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  รายการผู้ใช้
                </button>
                <button
                  type="button"
                  onClick={() => setUserMgmtSubTab("roleGuide")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                    userMgmtSubTab === "roleGuide"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Info className="w-4 h-4 flex-shrink-0" />
                  คำอธิบายบทบาท (Role)
                </button>
                <button
                  type="button"
                  onClick={() => setUserMgmtSubTab("manageRoles")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                    userMgmtSubTab === "manageRoles"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  จัดการ Role
                </button>
              </div>
            )}

            {/* Filter Section (Only for WMS/JSA) */}
            {(activeTab === "wms" || activeTab === "jsa") && (
              <div className="mb-4 flex flex-wrap items-center gap-2 bg-white px-3 py-2.5 rounded-lg shadow-sm border border-gray-200 w-full sm:w-fit sm:max-w-full">
                <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="font-medium text-gray-700 text-sm">
                  ตัวกรองโครงการ :
                </span>
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block py-2 px-3 outline-none min-w-[200px] flex-1 sm:flex-none"
                >
                  <option value="All">แสดงทั้งหมด (All Projects)</option>
                  {projectFilterOptions.map((option, i) => (
                    <option key={i} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Conditional Table Rendering based on Tab */}

              {/* จัดการผู้ใช้งาน */}
              {activeTab === "users" &&
                (adminUsersLoading ? (
                  <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
                ) : userMgmtSubTab === "manageRoles" ? (
                  <RoleManagementView adminUsers={adminUsers} />
                ) : userMgmtSubTab === "roleGuide" ? (
                  <div className="p-6 md:p-8">
                    <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                      สรุปสิทธิ์ตาม Role แต่ละแบบ: <strong>เมนูใน Sidebar</strong> คือเมนูที่เห็นและเข้าได้ด้านซ้าย
                      และการกระทำใน <strong>ข้อมูลโครงการ / Method Statement / JSA</strong> คือปุ่มที่ใช้กับรายการในแต่ละเมนูนั้น
                      หาก Role มีเมนูจัดการผู้ใช้งาน จะมีคำอธิบายเพิ่มด้านล่างการ์ด ผู้ใช้ที่มีหลาย Role ระบบจะรวมสิทธิ์จากทุก Role
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {USER_ROLES.map((role) => {
                        const { sidebarMenus, listActions, userMgmtDescription } = getRoleGuide(role);
                        return (
                          <div
                            key={role}
                            className="border border-gray-200 rounded-xl p-5 bg-gradient-to-br from-violet-50/80 to-white"
                          >
                            <h3 className="text-lg font-bold text-violet-900 mb-3">{role}</h3>
                            <div className="mb-4">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                เมนูใน Sidebar
                              </div>
                              <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                                {sidebarMenus.map((label) => (
                                  <li key={`${role}-m-${label}`}>{label}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="mb-4">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                ในรายการ โครงการ / WMS / JSA
                              </div>
                              <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                                {listActions.map((label) => (
                                  <li key={`${role}-a-${label}`}>{label}</li>
                                ))}
                              </ul>
                            </div>
                            {userMgmtDescription && (
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                  จัดการผู้ใช้งาน
                                </div>
                                <p className="text-sm text-gray-800 leading-relaxed">{userMgmtDescription}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    <table className="list-data-table w-full text-left">
                      <thead className="bg-gray-50 text-gray-700 border-b">
                        <tr>
                          <th className="font-semibold w-14">รูป</th>
                          <th className="font-semibold">อีเมล</th>
                          <th className="font-semibold">ชื่อ-นามสกุล</th>
                          <th className="font-semibold">ตำแหน่ง</th>
                          <th className="font-semibold">บทบาท</th>
                          <th className="font-semibold">สถานะ</th>
                          <th className="font-semibold w-28 text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {adminUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td>
                              <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <UserCircle className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                            </td>
                            <td className="text-gray-700">{u.email}</td>
                            <td className="font-medium text-gray-800">{u.firstName} {u.lastName}</td>
                            <td className="text-gray-600">{u.position || "-"}</td>
                            <td>
                              <div className="flex flex-nowrap gap-1 overflow-hidden">
                                {Array.isArray(u.role) && u.role.length > 0
                                  ? u.role.map((r) => (
                                      <span key={r} className="px-1.5 py-0.5 rounded-full text-[11px] leading-none font-medium bg-violet-100 text-violet-800 flex-shrink-0">{r}</span>
                                    ))
                                  : <span className="text-gray-400">-</span>}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[11px] leading-none font-medium ${
                                  u.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : u.status === "pending"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {u.status === "approved" ? "อนุมัติแล้ว" : u.status === "pending" ? "รออนุมัติ" : "ถูกปฏิเสธ"}
                              </span>
                            </td>
                            <td className="text-right">
                              <button
                                onClick={() => openEditUserModal(u)}
                                className="inline-flex h-7 w-7 items-center justify-center bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-md font-medium transition-colors text-[0px]"
                                title="แก้ไข"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                แก้ไข
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ))}

              {/* Project Table */}
              {activeTab === "project" &&
                (projects.length === 0 ? (
                  <div className="p-16 text-center text-gray-500">
                    <div className="flex justify-center mb-4 opacity-50">
                      <Briefcase size={48} />
                    </div>
                    <p className="text-base leading-relaxed">ยังไม่มีข้อมูลโครงการในระบบ</p>
                  </div>
                ) : (
                  <table className="list-data-table w-full text-left">
                    <thead className="bg-gray-50 text-gray-700 border-b">
                      <tr>
                        <th className="font-semibold w-36">
                          Project No.
                        </th>
                        <th className="font-semibold">
                          Project Name
                        </th>
                        <th className="font-semibold">Location</th>
                        <th className="font-semibold">Client</th>
                        {canDelete && (
                          <th className="font-semibold w-28 text-right">จัดการ</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {projects.map((proj) => (
                        <tr
                          key={proj.id}
                          className={`hover:bg-gray-50 ${canEdit ? "cursor-pointer" : ""}`}
                          onClick={() => openProjectFromRow(proj)}
                        >
                          <td className="font-medium text-emerald-700">
                            {proj.projectNo || "-"}
                          </td>
                          <td className="font-medium text-gray-800">
                            {proj.projectName || "(ไม่มีชื่อโครงการ)"}
                          </td>
                          <td className="text-gray-600">
                            {proj.location || "-"}
                          </td>
                          <td className="text-gray-600">
                            {proj.clientName || "-"}
                          </td>
                          {canDelete && (
                          <td className="text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProject(proj.id);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                              title="ลบ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}

              {/* WMS / JSA Table */}
              {(activeTab === "wms" || activeTab === "jsa") &&
                (hasNoDisplayDocuments ? (
                  <div className="p-16 text-center text-gray-500">
                    <div className="flex justify-center mb-4 opacity-50">
                      {activeTab === "wms" ? (
                        <FileText size={48} />
                      ) : (
                        <ShieldAlert size={48} />
                      )}
                    </div>
                    <p className="text-base leading-relaxed max-w-md mx-auto">
                      ยังไม่มีรายการเอกสารในหมวดหมู่นี้ หรือ โครงการที่คุณเลือก
                    </p>
                  </div>
                ) : (
                  <table className="list-data-table w-full text-left">
                    <thead className="bg-gray-50 text-gray-700 border-b">
                      <tr>
                        <th className="font-semibold w-52">
                          โครงการ (Project)
                        </th>
                        <th className="font-semibold">
                          ชื่องาน (Job Title)
                        </th>
                        <th className="font-semibold w-40 text-center">
                          Status
                        </th>
                        <th className="font-semibold w-24 text-center">
                          Rev.
                        </th>
                        <th className="font-semibold w-36">
                          วันที่ (Date)
                        </th>
                        <th className="font-semibold w-36">
                          ผู้จัดทำ
                        </th>
                        {(canEdit || canDelete) && (
                          <th className="font-semibold w-20 text-right">
                          จัดการ
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayDocuments.map((doc) => (
                        <tr
                          key={doc.id}
                          className={`cursor-pointer focus:outline-none ${
                            activeTab === "jsa" && doc._rowKind === "older"
                              ? "bg-orange-50/40 hover:bg-orange-50 focus:bg-orange-100/70"
                              : "hover:bg-gray-50 focus:bg-blue-50/60"
                          }`}
                          onClick={() => openDocumentDetail(doc)}
                          onKeyDown={(e) => openDocumentDetailFromKeyboard(e, doc)}
                          role="button"
                          tabIndex={0}
                          title="เปิดดูรายละเอียด"
                        >
                          <td
                            className={`text-blue-700 ${
                              activeTab === "jsa" && doc._rowKind === "older"
                                ? "font-normal opacity-80"
                                : "font-semibold"
                            }`}
                          >
                            {activeTab === "jsa" ? (
                              <div className="flex items-center gap-2">
                                {doc._rowKind === "latest" && doc._hasOlderDocs ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleJSAGroup(doc._groupKey);
                                    }}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-100"
                                    title={doc._isExpanded ? "ซ่อน Rev. เก่า" : "แสดง Rev. เก่า"}
                                    aria-label={doc._isExpanded ? "ซ่อน Rev. เก่า" : "แสดง Rev. เก่า"}
                                    aria-expanded={doc._isExpanded}
                                  >
                                    {doc._isExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </button>
                                ) : doc._rowKind === "older" ? (
                                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-[11px] font-medium text-orange-700">
                                    เก่า
                                  </span>
                                ) : (
                                  <span className="inline-flex h-7 w-7 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <div>{doc.project || "-"}</div>
                                  {doc._rowKind === "latest" && doc._hasOlderDocs && (
                                    <div className="text-xs font-normal text-gray-500">
                                      ซ่อน Rev. เก่า {doc._olderDocsCount} รายการ
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              doc.project || "-"
                            )}
                          </td>
                          <td className="font-medium text-gray-800">
                            {activeTab === "wms"
                              ? doc.documentTitle
                              : doc.jobTitle || "(ไม่มีชื่อ)"}
                          </td>
                          <td className="text-center">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] leading-none font-medium bg-gray-100 text-gray-700">
                              {doc.status || "Under Preparing"}
                            </span>
                          </td>
                          <td
                            className={`text-center text-gray-600 ${
                              activeTab === "jsa" && doc._rowKind === "latest"
                                ? "font-semibold"
                                : ""
                            }`}
                          >
                            {doc.rev}
                          </td>
                          <td className="text-gray-600">
                            {activeTab === "wms" ? doc.issueDate : doc.date}
                          </td>
                          <td className="text-gray-600">
                            {doc.preparedBy || "-"}
                          </td>
                          {(canEdit || canDelete) && (
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* ปุ่มเปิดดู: ทุก role เห็น */}
                              <button
                                onClick={() => {
                                  activeTab === "wms"
                                    ? setCurrentWMSDoc(doc)
                                    : setCurrentJSADoc(doc ? { ...doc, items: normalizeJSAItems(doc.items) } : null);
                                  setView("detail");
                                }}
                                className={`hidden ${
                                  activeTab === "wms"
                                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                    : "bg-orange-50 text-orange-600 hover:bg-orange-100"
                                }`}
                              >
                                เปิดดู
                              </button>
                              {/* ปุ่มแก้ไข: เฉพาะ role ที่มีสิทธิ์ edit */}
                              {canEdit && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeTab === "wms") {
                                    setWmsFormData({ ...doc, attachments: doc.attachments || [] });
                                    setView("form");
                                  } else {
                                    setJsaFormData({ ...doc, items: normalizeJSAItems(doc.items), attachments: doc.attachments || [] });
                                    setView("form");
                                  }
                                }}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[0px] font-semibold transition-colors bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                title="แก้ไข"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                แก้ไข
                              </button>
                              )}
                              {/* ปุ่มลบ: เฉพาะ role ที่มีสิทธิ์ delete */}
                              {canDelete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  activeTab === "wms"
                                    ? deleteWMS(doc.id)
                                    : deleteJSA(doc.id);
                                }}
                                className="inline-flex h-7 w-7 items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                title="ลบ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              )}
                            </div>
                          </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}

            </div>
          </div>
          )
        )}

        {/* Dynamic Form & Detail Views (inline เพื่อไม่ให้เคอร์เซอร์เด้งออกตอนพิมพ์) */}
        <div className="print:p-0">
          {projectFormJSX}
          {wmsFormJSX}
          {wmsDetailJSX}
          {jsaFormJSX}
          {jsaDetailJSX}
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block; /* For Firefox */
        }
      `,
        }}
      />

      {/* ===== Modal แก้ไขสิทธิ์ผู้ใช้งาน ===== */}
      {printPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm print:hidden">
          <div className="flex h-full flex-col px-4 py-4 md:px-6 md:py-5">
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Print Preview
                  </p>
                  <h2 className="truncate text-lg font-semibold text-slate-900 md:text-xl">
                    {printPreview.title}
                  </h2>
                  <p className="text-sm text-slate-500">
                    ตรวจสอบรูปแบบก่อนพิมพ์ และเลือกได้ว่าจะพิมพ์แบบสีหรือขาวดำ
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setPrintColorMode("color")}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        printColorMode === "color"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      พิมพ์สี
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintColorMode("grayscale")}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        printColorMode === "grayscale"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      ขาวดำ
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={closePrintPreview}
                    disabled={isPrinting}
                    className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="mr-2 h-4 w-4" /> ปิด
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-slate-200/70 p-4 md:p-6">
                <div className="mx-auto flex min-h-full w-full items-start justify-center">
                  <div className="w-full">
                    <div
                      className="mx-auto h-0 overflow-hidden opacity-0 pointer-events-none"
                      style={{ maxWidth: printPreview.previewMaxWidth || "297mm" }}
                      aria-hidden="true"
                    >
                      <div
                        ref={printPreviewMeasureRef}
                        className={printPreview.previewClassName}
                        style={{
                          width: "100%",
                          maxWidth: printPreview.previewMaxWidth || "297mm",
                        }}
                        dangerouslySetInnerHTML={{ __html: printPreview.previewHtml }}
                      />
                    </div>

                    <div className="mx-auto flex w-full flex-col items-center gap-6">
                      {printPreviewPagination.pageOffsets.map((pageOffset, index) => (
                        <div
                          key={`${printPreview.elementId}-page-${index + 1}`}
                          className={`print-preview-sheet relative w-full overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-xl ${
                            printColorMode === "grayscale" ? "print-mode-grayscale" : ""
                          }`}
                          style={{
                            maxWidth: printPreview.previewMaxWidth || "297mm",
                            height: printPreviewPagination.pageHeight
                              ? `${printPreviewPagination.pageHeight}px`
                              : "auto",
                            minHeight: printPreviewPagination.pageHeight
                              ? `${printPreviewPagination.pageHeight}px`
                              : undefined,
                          }}
                        >
                          <div
                            className="absolute inset-x-0 top-0"
                            style={{ transform: `translateY(-${pageOffset}px)` }}
                          >
                            <div
                              className={printPreview.previewClassName}
                              style={{
                                width: "100%",
                                maxWidth: printPreview.previewMaxWidth || "297mm",
                              }}
                              dangerouslySetInnerHTML={{ __html: printPreview.previewHtml }}
                            />
                          </div>

                          {printPreviewPagination.pageOffsets.length > 1 && (
                            <div className="pointer-events-none absolute bottom-3 right-4 rounded-full bg-slate-900/75 px-2.5 py-1 text-xs font-medium text-white">
                              {index + 1} / {printPreviewPagination.pageOffsets.length}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                <p className="text-sm text-slate-500">
                  โหมดขาวดำจะพรีวิวด้วย grayscale เพื่อให้ใกล้เคียงผลพิมพ์จริงมากขึ้น
                </p>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleExportWordFromPreview}
                    className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    <Download className="mr-2 h-4 w-4" /> Export Word
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintFromPreview}
                    disabled={isPrinting}
                    className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPrinting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="mr-2 h-4 w-4" />
                    )}
                    {isPrinting ? "กำลังเปิดหน้าต่างพิมพ์..." : "พิมพ์เอกสาร"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-violet-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">แก้ไขผู้ใช้งาน</h2>
              <button
                type="button"
                onClick={() => setEditUserModal(null)}
                className="text-white/80 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* User Info (read-only) */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                {editUserModal.photoURL ? (
                  <img src={editUserModal.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-base">{editUserModal.firstName} {editUserModal.lastName}</p>
                <p className="text-gray-500 text-sm">{editUserModal.email}</p>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="px-6 py-4 space-y-5">
              {/* ตำแหน่ง */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ตำแหน่ง (Position)</label>
                <input
                  type="text"
                  value={editUserPosition}
                  onChange={(e) => setEditUserPosition(e.target.value)}
                  placeholder="เช่น Site Engineer, Safety Officer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                />
              </div>

              {/* สถานะ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">สถานะบัญชี (Status)</label>
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value as UserStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none bg-white"
                >
                  <option value="approved">อนุมัติแล้ว (Approved)</option>
                  <option value="pending">รออนุมัติ (Pending)</option>
                  <option value="rejected">ถูกปฏิเสธ (Rejected)</option>
                </select>
              </div>

              {/* โครงการที่รับผิดชอบ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">โครงการที่รับผิดชอบ (Projects)</label>
                  <span className="text-xs text-gray-500">เลือกแล้ว {editUserAssignedProjects.length} โครงการ</span>
                </div>
                {assignableProjectNames.length === 0 ? (
                  <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    ยังไม่มีโครงการในระบบสำหรับกำหนดให้ผู้ใช้งาน
                  </p>
                ) : (
                  <div className="max-h-40 overflow-auto border border-gray-200 rounded-lg p-2 bg-gray-50 space-y-1.5">
                    {assignableProjectNames.map((projectName) => (
                      <label
                        key={projectName}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="accent-violet-600 w-4 h-4"
                          checked={editUserAssignedProjects.includes(projectName)}
                          onChange={() => toggleEditAssignedProject(projectName)}
                        />
                        <span className="text-sm text-gray-700">{projectName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* บทบาท */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">บทบาท (Roles) — เลือกได้มากกว่า 1</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableRoleNames.map((role) => (
                    <label
                      key={role}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        editUserRoles.includes(role as any)
                          ? "border-violet-400 bg-violet-50 text-violet-800"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-violet-600 w-4 h-4"
                        checked={editUserRoles.includes(role as any)}
                        onChange={() => toggleEditRole(role as any)}
                      />
                      <span className="text-sm font-medium">{role}</span>
                    </label>
                  ))}
                </div>
                {editUserRoles.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">ต้องเลือกบทบาทอย่างน้อย 1 บทบาท</p>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditUserModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                disabled={isSavingUser || editUserRoles.length === 0}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSavingUser ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
