"use client";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const toISODateString = (dateVal: any) => {
    if (!dateVal) return undefined;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return undefined;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const calculateHoursDiff = (startTimeStr: string, endTimeStr: string): number => {
    if (!startTimeStr || !endTimeStr) return 0;
    const [sh, sm] = startTimeStr.split(":").map(Number);
    const [eh, em] = endTimeStr.split(":").map(Number);
    
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    
    if (endMins <= startMins) return 0;
    
    const diffMins = endMins - startMins;
    const hours = diffMins / 60;
    
    return Math.round(hours * 100) / 100;
};

const formatTime12h = (timeStr: any): string => {
    if (!timeStr) return "";
    let match = "";
    if (timeStr instanceof Date) {
        const hours = timeStr.getUTCHours().toString().padStart(2, "0");
        const minutes = timeStr.getUTCMinutes().toString().padStart(2, "0");
        match = `${hours}:${minutes}`;
    } else if (typeof timeStr === "string") {
        match = timeStr;
        if (match.includes("T")) {
            match = match.substring(11, 16);
        }
    } else {
        return String(timeStr);
    }
    
    const parts = match.split(":");
    if (parts.length < 2) return match;
    const hour = parseInt(parts[0], 10);
    const min = parseInt(parts[1], 10);
    if (isNaN(hour) || isNaN(min)) return match;
    
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    const minutesStr = min.toString().padStart(2, "0");
    return `${hour12}:${minutesStr} ${ampm}`;
};


import { useState, useEffect, useMemo, useRef } from "react";
import * as htmlToImage from "html-to-image";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { Users, Key, Clock, Lock, Unlock, MessageSquare, Save, Search, ShieldAlert, UserX, UserCheck, ArrowRight, ArrowLeft, Play, LayoutList, ListTodo, CheckSquare, Mail, Eye, EyeOff, GraduationCap, BookOpen, Loader2, HelpCircle, FileText, X, ClipboardList, History, FileSpreadsheet, FileDown, Trash2, ChevronDown, Dices, Shuffle, ChevronLeft, ChevronRight, BarChart3, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatName } from "@/lib/utils";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { formatCalendarDate } from "@/lib/dateUtils";
import { resetStudentPassword, saveAttendanceBatch, saveRemarkBatch, getGroupAttendanceHistory, getGroupRemarksHistory, getTeacherComprehensiveGroupAnalyticsAction, saveSingleAttendanceAction, deleteRemarkAction } from "../actions/groupActions";
import { getRemarkTemplatesAction, createRemarkTemplateAction, updateRemarkTemplateAction, deleteRemarkTemplateAction } from "../actions/remarkActions";
import { getGroupImprovementPlans, upsertImprovementPlan, deleteImprovementPlan, deleteSignedDocument, deleteTeacherSignedDoc, submitTeacherSignedDoc, markPlanViewed } from "@/features/student/actions/improvementPlanActions";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { CourseDocLinks } from "./CourseDocLinks";
import { Roulette } from "./Roulette";
import { GroupGenerator } from "./GroupGenerator";
import { GroupAnalyticsPanel } from "@/components/analytics/GroupAnalyticsPanel";
import { StudentRecords } from "@/features/student/components/StudentRecords";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { GradeManagerPanel } from "./GradeManagerPanel";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";

interface GroupManagerProps {
    groups: any[];
}

export function GroupManager({ groups }: GroupManagerProps) {
    const { data: session } = authClient.useSession();
    const teacherId = session?.user?.id;

    const isDateValidForAttendance = (dateStr: string, courseId: string) => {
        if (!selectedGroup) return false;
        
        // 1. Check if within period (startDate and endDate)
        const dateVal = new Date(dateStr + "T12:00:00Z");
        
        const groupStart = selectedGroup.program?.startDate || selectedGroup.startDate;
        if (groupStart) {
            const startLimit = new Date(toISODateString(groupStart) + "T12:00:00Z");
            if (dateVal < startLimit) return false;
        }
        
        const groupEnd = selectedGroup.program?.endDate || selectedGroup.endDate;
        if (groupEnd) {
            const endLimit = new Date(toISODateString(groupEnd) + "T12:00:00Z");
            if (dateVal > endLimit) return false;
        }
        
        // 2. Check if it's a scheduled day of week for this course
        const course = selectedGroup.courses?.find((c: any) => c.id === courseId);
        if (!course) return false;
        
        const scheduledDays = course.schedules?.map((s: any) => s.dayOfWeek) || [];
        const daysOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
        const dayOfWeekStr = daysOfWeek[dateVal.getUTCDay()];
        
        return scheduledDays.includes(dayOfWeekStr);
    };

    const findClosestValidDate = (refDateStr: string, courseId: string) => {
        if (!selectedGroup) return refDateStr;
        const course = selectedGroup.courses?.find((c: any) => c.id === courseId);
        if (!course) return refDateStr;
        
        const scheduledDays = course.schedules?.map((s: any) => s.dayOfWeek) || [];
        if (scheduledDays.length === 0) return refDateStr;
        
        const daysOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
        
        const groupStart = selectedGroup.program?.startDate || selectedGroup.startDate;
        const groupEnd = selectedGroup.program?.endDate || selectedGroup.endDate;

        // Start date of group/program
        const startLimit = groupStart ? new Date(toISODateString(groupStart) + "T12:00:00Z") : null;
        // End date of group/program
        const endLimit = groupEnd ? new Date(toISODateString(groupEnd) + "T12:00:00Z") : null;
        
        const refDate = new Date(refDateStr + "T12:00:00Z");
        
        // If refDate is already valid and within limits, return it
        const refDayOfWeek = daysOfWeek[refDate.getUTCDay()];
        const isWithinStart = !startLimit || refDate >= startLimit;
        const isWithinEnd = !endLimit || refDate <= endLimit;
        if (scheduledDays.includes(refDayOfWeek) && isWithinStart && isWithinEnd) {
            return refDateStr;
        }
        
        // Search up to 30 days backward and forward to find the closest scheduled day within limits
        for (let offset = 1; offset <= 30; offset++) {
            // Check backward
            const prevDate = new Date(refDate);
            prevDate.setUTCDate(refDate.getUTCDate() - offset);
            const prevDayOfWeek = daysOfWeek[prevDate.getUTCDay()];
            const prevWithinStart = !startLimit || prevDate >= startLimit;
            const prevWithinEnd = !endLimit || prevDate <= endLimit;
            if (scheduledDays.includes(prevDayOfWeek) && prevWithinStart && prevWithinEnd) {
                return toISODateString(prevDate)!;
            }
            
            // Check forward
            const nextDate = new Date(refDate);
            nextDate.setUTCDate(refDate.getUTCDate() + offset);
            const nextDayOfWeek = daysOfWeek[nextDate.getUTCDay()];
            const nextWithinStart = !startLimit || nextDate >= startLimit;
            const nextWithinEnd = !endLimit || nextDate <= endLimit;
            if (scheduledDays.includes(nextDayOfWeek) && nextWithinStart && nextWithinEnd) {
                return toISODateString(nextDate)!;
            }
        }
        
        return refDateStr;
    };

    const getValidClassDaysList = () => {
        if (!selectedGroup || !attCourseId) return [];
        
        // Derive start date: group.startDate > earliest attendance record > 3 months ago
        const attForCourse = attendanceHistory.filter((a: any) => a.courseId === attCourseId);
        const earliestAtt = attForCourse.length > 0
            ? new Date(Math.min(...attForCourse.map((a: any) => new Date(a.date).getTime())))
            : null;
            
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const groupStart = selectedGroup.program?.startDate || selectedGroup.startDate;
        const startDate = groupStart
            ? new Date(groupStart)
            : (earliestAtt ?? threeMonthsAgo);
            
        const groupEnd = selectedGroup.program?.endDate || selectedGroup.endDate;
        const endDate = groupEnd
            ? new Date(groupEnd)
            : new Date();
            
        const dayIndexMap: Record<string, number> = {
            SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
            THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
        };
        
        const course = selectedGroup.courses?.find((c: any) => c.id === attCourseId);
        const scheduledDays = course?.schedules?.map((s: any) => s.dayOfWeek) || [];
        
        const classDays: Date[] = [];
        const cur = new Date(startDate);
        cur.setUTCHours(12, 0, 0, 0); // stable UTC noon
        const end = new Date(endDate);
        end.setUTCHours(12, 0, 0, 0);
        
        while (cur <= end) {
            const jsDay = cur.getUTCDay();
            const isClassDay = scheduledDays.some((d: any) => dayIndexMap[d] === jsDay);
            if (isClassDay) classDays.push(new Date(cur));
            cur.setUTCDate(cur.getUTCDate() + 1);
        }
        
        // Union with actual attendance dates just in case they have historical ones
        const allDateStrings = new Set<string>();
        classDays.forEach(d => {
            const ds = toISODateString(d);
            if (ds) allDateStrings.add(ds);
        });
        attForCourse.forEach((a: any) => {
            const ds = toISODateString(new Date(a.date));
            if (ds) allDateStrings.add(ds);
        });
        
        return Array.from(allDateStrings).sort(); // returns YYYY-MM-DD strings sorted chronologically
    };
    
    const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || "");
    const [activeTab, setActiveTab] = useState<"students" | "attendance" | "remarks" | "analytics" | "grades" | "documentation" | "improvement">("students");

    const selectedGroup = groups.find(g => g.id === selectedGroupId);

    const groupScheduleInfo = useMemo(() => {
        if (!selectedGroup) return null;
        
        const allSchedules = (selectedGroup.courses || []).flatMap((c: any) => c.schedules || []);
        
        if (allSchedules.length === 0) {
            const timeStr = (selectedGroup.startTime && selectedGroup.endTime) 
                ? `${selectedGroup.startTime} - ${selectedGroup.endTime}` 
                : "";
            return {
                days: "Sin días",
                time: timeStr
            };
        }
        
        const dayMap: Record<string, string> = {
            MONDAY: "Lun",
            TUESDAY: "Mar",
            WEDNESDAY: "Mié",
            THURSDAY: "Jue",
            FRIDAY: "Vie",
            SATURDAY: "Sáb",
            SUNDAY: "Dom"
        };
        
        const dayOrder = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
        
        const uniqueDays = Array.from(new Set(allSchedules.map((s: any) => s.dayOfWeek)))
            .sort((a: any, b: any) => dayOrder.indexOf(a) - dayOrder.indexOf(b))
            .map((day: any) => dayMap[day] || day);
            
        const daysStr = uniqueDays.join(", ");
        const uniqueHours = Array.from(new Set(allSchedules.map((s: any) => `${s.startTime} - ${s.endTime}`)));
        const hoursStr = uniqueHours.join(" / ");
        
        return {
            days: daysStr,
            time: hoursStr
        };
    }, [selectedGroup]);

    const timeOptions = useMemo(() => {
        if (!selectedGroup) return [];
        const start = selectedGroup.startTime || "08:00";
        const end = selectedGroup.endTime || "12:00";
        const slots = [];
        try {
            const [sh, sm] = start.split(":").map(Number);
            const [eh, em] = end.split(":").map(Number);
            let currentMin = sh * 60 + sm;
            const endMin = eh * 60 + em;
            while (currentMin <= endMin) {
                const h = Math.floor(currentMin / 60).toString().padStart(2, "0");
                const m = (currentMin % 60).toString().padStart(2, "0");
                slots.push(`${h}:${m}`);
                currentMin += 15;
            }
        } catch (e) {
            console.error("Error generating time slots", e);
        }
        return slots;
    }, [selectedGroup?.startTime, selectedGroup?.endTime]);
    
    // Students Tab State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isResetting, setIsResetting] = useState(false);
    const [studentToResetPassword, setStudentToResetPassword] = useState<any | null>(null);
    const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
    const [selectedStudentForAnalytics, setSelectedStudentForAnalytics] = useState<any>(null);

    // ── Improvement Plan State ──
    const [groupPlans, setGroupPlans] = useState<any[]>([]);
    const [groupPlansLoading, setGroupPlansLoading] = useState(false);
    const [impPlanFormDialog, setImpPlanFormDialog] = useState<{
        open: boolean;
        id?: string;
        studentId: string;
        planNumber: string;
        teacherDocUrl: string;
        startDate: string;
        endDate: string;
        observations: string;
        planScore: number | "";
        finalGrade: number | "";
        evidenceUrl: string;
    } | null>(null);
    const [viewGroupPlanDetail, setViewGroupPlanDetail] = useState<any | null>(null);
    const [impDeleteConfirm, setImpDeleteConfirm] = useState<string | null>(null); // planId to delete
    const [impTeacherSignDialog, setImpTeacherSignDialog] = useState<{ planId: string; url: string } | null>(null);

    const loadGroupPlans = async (gId?: string) => {
        const id = gId || selectedGroupId;
        if (!id) return;
        setGroupPlansLoading(true);
        try {
            const res = await getGroupImprovementPlans(id);
            if (res.success && res.data) setGroupPlans(res.data);
        } catch (e) {
            console.error("Error cargando planes del grupo:", e);
        } finally {
            setGroupPlansLoading(false);
        }
    };

    const handleImpUpsert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!impPlanFormDialog) return;
        if (!impPlanFormDialog.studentId || !impPlanFormDialog.planNumber.trim() || !impPlanFormDialog.startDate || !impPlanFormDialog.endDate) {
            toast.error("Por favor completa los campos requeridos (*)");
            return;
        }
        const toastId = toast.loading("Guardando plan...");
        const res = await upsertImprovementPlan({
            id: impPlanFormDialog.id,
            planNumber: impPlanFormDialog.planNumber.trim(),
            studentId: impPlanFormDialog.studentId,
            teacherDocUrl: impPlanFormDialog.teacherDocUrl.trim() || undefined,
            startDate: impPlanFormDialog.startDate,
            endDate: impPlanFormDialog.endDate,
            observations: impPlanFormDialog.observations.trim() || undefined,
            planScore: impPlanFormDialog.planScore !== "" ? parseFloat(String(impPlanFormDialog.planScore)) : undefined,
            finalGrade: impPlanFormDialog.finalGrade !== "" ? parseFloat(String(impPlanFormDialog.finalGrade)) : undefined,
            evidenceUrl: impPlanFormDialog.evidenceUrl.trim() || undefined,
        });
        if (res.success) {
            toast.success("Plan guardado exitosamente", { id: toastId });
            setImpPlanFormDialog(null);
            loadGroupPlans();
        } else {
            toast.error(res.error || "Error al guardar el plan", { id: toastId });
        }
    };

    const handleImpDelete = async (planId: string) => {
        const toastId = toast.loading("Eliminando plan...");
        const res = await deleteImprovementPlan(planId);
        if (res.success) {
            toast.success("Plan eliminado correctamente", { id: toastId });
            setImpDeleteConfirm(null);
            loadGroupPlans();
        } else {
            toast.error(res.error || "Error al eliminar", { id: toastId });
        }
    };

    const handleImpDeleteSignedDoc = async (planId: string) => {
        const toastId = toast.loading("Eliminando documento firmado...");
        const res = await deleteSignedDocument(planId);
        if (res.success) {
            toast.success("Documento eliminado correctamente", { id: toastId });
            loadGroupPlans();
        } else {
            toast.error(res.error || "Error al eliminar el documento", { id: toastId });
        }
    };

    const handleImpDeleteTeacherSignedDoc = async (planId: string) => {
        const toastId = toast.loading("Eliminando contrafirma del docente...");
        const res = await deleteTeacherSignedDoc(planId);
        if (res.success) {
            toast.success("Contrafirma eliminada correctamente", { id: toastId });
            loadGroupPlans();
        } else {
            toast.error(res.error || "Error al eliminar", { id: toastId });
        }
    };

    const handleImpTeacherSign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!impTeacherSignDialog || !impTeacherSignDialog.url.trim()) {
            toast.error("El enlace no puede estar vacío");
            return;
        }
        const toastId = toast.loading("Guardando contrafirma...");
        const res = await submitTeacherSignedDoc(impTeacherSignDialog.planId, impTeacherSignDialog.url.trim());
        if (res.success) {
            toast.success("Contrafirma guardada exitosamente", { id: toastId });
            setImpTeacherSignDialog(null);
            loadGroupPlans();
        } else {
            toast.error(res.error || "Error al guardar", { id: toastId });
        }
    };

    const handleImpEmail = (plan: any) => {
        const studentEmail = plan.student?.email || "";
        const studentName = formatName(plan.student?.name, plan.student?.profile);
        const teacherName = formatName(plan.teacher?.name, plan.teacher?.profile);
        const subject = encodeURIComponent(`Plan de Mejoramiento Académico - ${plan.planNumber}`);
        let bodyText = `Hola, ${studentName}.\n\n`;
        bodyText += `Se ha registrado el Plan de Mejoramiento Académico N° ${plan.planNumber} en la plataforma AcademiX.\n\n`;
        bodyText += `Detalles del Plan:\n`;
        bodyText += `- Fecha de Inicio: ${format(new Date(plan.startDate), "dd/MM/yyyy")}\n`;
        bodyText += `- Fecha de Finalización: ${format(new Date(plan.endDate), "dd/MM/yyyy")}\n`;
        bodyText += `- Docente: ${teacherName}\n`;
        if (plan.teacherDocUrl) bodyText += `- Documento del Plan: ${plan.teacherDocUrl}\n`;
        if (plan.observations) bodyText += `- Observaciones/Criterios: ${plan.observations}\n`;
        bodyText += `\nPor favor ingresa a la plataforma AcademiX para revisar el plan en detalle, firmarlo y cargar el documento firmado.\n\nAtentamente,\n${teacherName}`;
        window.location.href = `mailto:${studentEmail}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
    };

    useEffect(() => {
        if (activeTab === "improvement" && selectedGroupId) {
            loadGroupPlans(selectedGroupId);
        }
    }, [activeTab, selectedGroupId]);

    // Attendance Tab State
    const [attMode, setAttMode] = useState<"list" | "matrix" | "summary" | "history" | "metrics">("list");
    const printMetricsRef = useRef<HTMLDivElement>(null);
    const matrixRef = useRef<HTMLDivElement>(null);
    const historyRef = useRef<HTMLDivElement>(null);
    const [isSequentialFullscreen, setIsSequentialFullscreen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    const [seqIndex, setSeqIndex] = useState(0);
    const [attDate, setAttDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [hideOtherDates, setHideOtherDates] = useState<boolean>(true);
    const [attCourseId, setAttCourseId] = useState<string>("");
    // We only store ABSENT or LATE in attRecords. If a student is not here, they are PRESENT.
    const [attRecords, setAttRecords] = useState<Record<string, { status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE_EARLY", arrivalTime?: string, departureTime?: string, justification?: string }>>({});
    const [isSavingAtt, setIsSavingAtt] = useState(false);
    const [selectedDayFilter, setSelectedDayFilter] = useState<number | null>(null);
    const [historyStudentFilter, setHistoryStudentFilter] = useState<string>("all");
    const [isRouletteOpen, setIsRouletteOpen] = useState(false);
    const [isGroupGeneratorOpen, setIsGroupGeneratorOpen] = useState(false);
    const [attendanceToDelete, setAttendanceToDelete] = useState<{ studentId: string; studentName: string; date: string } | null>(null);
    const [markAllConfirmOpen, setMarkAllConfirmOpen] = useState<boolean>(false);

    const [isDateLocked, setIsDateLocked] = useState<boolean>(false);
    const [hasEditPermission, setHasEditPermission] = useState<boolean>(true);
    const [limitSettingsActive, setLimitSettingsActive] = useState<boolean>(false);
    const [permissionRequestStatus, setPermissionRequestStatus] = useState<"PENDING" | "APPROVED" | "REJECTED" | null>(null);
    const [permissionReason, setPermissionReason] = useState<string | null>(null);
    const [requestingPermissionReason, setRequestingPermissionReason] = useState<string>("");
    const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);

    const checkEditPermission = async () => {
        if (!attCourseId || !attDate) return;
        const { getAttendanceEditPermissionStatusAction } = await import("../actions/groupActions");
        const res = await getAttendanceEditPermissionStatusAction(attCourseId, attDate);
        if (res.success) {
            setIsDateLocked(res.isLocked || false);
            setHasEditPermission(res.hasPermission || false);
            setPermissionRequestStatus(res.requestStatus as any);
            setPermissionReason(res.reason as any);
            setLimitSettingsActive(res.limitSettingsActive || false);
        }
    };

    useEffect(() => {
        checkEditPermission();
    }, [attDate, attCourseId]);

    // Remarks Tab State
    const [remarkType, setRemarkType] = useState<"ATTENTION" | "COMMENDATION" | "CITATION" | "OTHER">("ATTENTION");
    const [remarkTitle, setRemarkTitle] = useState("");
    const [remarkDesc, setRemarkDesc] = useState("");
    const [remarkCourseId, setRemarkCourseId] = useState("");
    const [isSavingRemark, setIsSavingRemark] = useState(false);
    const [remarkStudentSearch, setRemarkStudentSearch] = useState("");
    const [sendEmailOnSave, setSendEmailOnSave] = useState(false);

    // Remarks Message Templates State
    const [remarkTemplates, setRemarkTemplates] = useState<any[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
    
    // Modal states for creating/editing templates
    const [templateEditId, setTemplateEditId] = useState<string | null>(null);
    const [templateTitle, setTemplateTitle] = useState("");
    const [templateDesc, setTemplateDesc] = useState("");
    const [templateType, setTemplateType] = useState<"ATTENTION" | "COMMENDATION" | "CITATION" | "OTHER">("ATTENTION");
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    const [confirmConfig, setConfirmConfig] = useState<{
        open: boolean;
        title: string;
        description: string;
        onConfirm: () => void | Promise<void>;
    } | null>(null);

    const requestConfirm = (title: string, description: string, onConfirm: () => void | Promise<void>) => {
        setConfirmConfig({
            open: true,
            title,
            description,
            onConfirm,
        });
    };


    const fetchTemplates = async () => {
        try {
            const res = await getRemarkTemplatesAction();
            setRemarkTemplates(res);
        } catch (err) {
            console.error("Error al cargar plantillas:", err);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    useEffect(() => {
        setSelectedTemplateId("");
    }, [remarkType]);

    const [modalFilterType, setModalFilterType] = useState<"ALL" | "ATTENTION" | "COMMENDATION" | "CITATION" | "OTHER">("ALL");

    const filteredModalTemplates = useMemo(() => {
        if (modalFilterType === "ALL") return remarkTemplates;
        return remarkTemplates.filter((t) => t.type === modalFilterType);
    }, [remarkTemplates, modalFilterType]);

    useEffect(() => {
        if (modalFilterType !== "ALL" && !templateEditId) {
            setTemplateType(modalFilterType as any);
        }
    }, [modalFilterType, templateEditId]);

    const getParsedDescription = () => {
        return remarkDesc;
    };

    const handleCopyToClipboard = async () => {
        const textToCopy = getParsedDescription();
        if (!textToCopy.trim()) {
            toast.error("La descripción está vacía.");
            return;
        }
        try {
            await navigator.clipboard.writeText(textToCopy);
            toast.success("Texto copiado al portapapeles. ¡Listo para pegar en tu correo!");
        } catch (err) {
            console.error("Error al copiar al portapapeles:", err);
            toast.error("No se pudo copiar el texto. Inténtalo de nuevo.");
        }
    };


    // History State
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [remarksHistory, setRemarksHistory] = useState<any[]>([]);

    // Details Modal State
    const [detailStudent, setDetailStudent] = useState<any | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const handleShowStudentDetails = (student: any) => {
        setDetailStudent(student);
        setDetailOpen(true);
    };

    // Unsaved Changes Warning State & Logic
    const [initialAttRecords, setInitialAttRecords] = useState<Record<string, any>>({});
    const [pendingAction, setPendingAction] = useState<{
        type: "DATE" | "COURSE" | "TAB" | "GROUP";
        value: string;
    } | null>(null);

    const hasPendingChanges = () => false;

    const confirmPendingAction = () => {
        if (!pendingAction) return;
        const { type, value } = pendingAction;
        
        // Temporarily align them so hasPendingChanges returns false during state updates
        setInitialAttRecords(attRecords);
        
        if (type === "DATE") {
            setAttDate(value);
        } else if (type === "COURSE") {
            setAttCourseId(value);
        } else if (type === "TAB") {
            setActiveTab(value as any);
        } else if (type === "GROUP") {
            setSelectedGroupId(value);
        }
        setPendingAction(null);
    };

    const saveAndConfirmPendingAction = async () => {
        if (isDateLocked && !hasEditPermission) {
            toast.error("Esta fecha pertenece a una semana anterior y está bloqueada.");
            return;
        }
        if (!pendingAction || !attCourseId || !attDate) return;
        
        const recordsArray = filteredStudents.map((s: any) => {
            const rec = attRecords[s.id];
            return {
                studentId: s.id,
                status: rec?.status || "PRESENT",
                arrivalTime: rec?.arrivalTime || undefined,
                departureTime: rec?.departureTime || undefined,
                justification: rec?.justification || undefined
            };
        });

        const toastId = toast.loading("Guardando cambios y continuando...");
        try {
            const res = await saveAttendanceBatch(attCourseId, attDate, recordsArray);
            if (res.success) {
                toast.success("Asistencia guardada correctamente", { id: toastId });
                
                const { type, value } = pendingAction;
                setInitialAttRecords(attRecords);
                
                if (type === "DATE") {
                    setAttDate(value);
                } else if (type === "COURSE") {
                    setAttCourseId(value);
                } else if (type === "TAB") {
                    setActiveTab(value as any);
                } else if (type === "GROUP") {
                    setSelectedGroupId(value);
                }
                
                if (type !== "GROUP" && selectedGroup) {
                    await loadHistory(selectedGroup.id);
                }
            } else {
                toast.error("Error al guardar asistencia: " + res.error, { id: toastId });
            }
        } catch (e: any) {
            toast.error("Error de conexión al guardar cambios", { id: toastId });
        } finally {
            setPendingAction(null);
        }
    };

    const handleDateChangeAttempt = (newVal: string) => {
        if (isSavingAtt) return;
        if (hasPendingChanges()) {
            setPendingAction({ type: "DATE", value: newVal });
        } else {
            setAttDate(newVal);
        }
    };

    const handleCourseChangeAttempt = (newVal: string) => {
        if (isSavingAtt) return;
        if (hasPendingChanges()) {
            setPendingAction({ type: "COURSE", value: newVal });
        } else {
            setAttCourseId(newVal);
        }
    };

    const handleTabChangeAttempt = (newVal: string) => {
        if (isSavingAtt) return;
        if (hasPendingChanges()) {
            setPendingAction({ type: "TAB", value: newVal });
        } else {
            setActiveTab(newVal as any);
        }
    };

    const handleGroupChangeAttempt = (newVal: string) => {
        if (isSavingAtt) return;
        if (hasPendingChanges()) {
            setPendingAction({ type: "GROUP", value: newVal });
        } else {
            setSelectedGroupId(newVal);
        }
    };

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasPendingChanges()) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [attRecords, initialAttRecords]);

    // Analytics Modal State
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [fullAnalyticsData, setFullAnalyticsData] = useState<any>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);


    useEffect(() => {
        if (selectedGroup) {
            const firstCourseId = selectedGroup.courses?.[0]?.id || "";

            // Reset ALL tab states when group changes
            setActiveTab("students");
            setSearchQuery("");
            setSelectedStudents([]);
            setSelectedStudentForAnalytics(null);

            // Attendance
            setAttMode("list");
            setAttCourseId(firstCourseId);
            setAttDate(findClosestValidDate(format(new Date(), "yyyy-MM-dd"), firstCourseId));
            setAttRecords({});
            setSeqIndex(0);
            setSelectedDayFilter(null);

            // Remarks
            setRemarkType("ATTENTION");
            setRemarkTitle("");
            setRemarkDesc("");
            setRemarkCourseId(firstCourseId);
            setSendEmailOnSave(false);

            // History & analytics
            setAttendanceHistory([]);
            setRemarksHistory([]);
            setFullAnalyticsData(null);
            setShowAnalyticsModal(false);
            setDetailStudent(null);
            setDetailOpen(false);

            // Load fresh history for the new group
            loadHistory(selectedGroup.id);
        }
    }, [selectedGroup?.id]);

    useEffect(() => {
        if (activeTab === "analytics" && selectedGroup && !loadingAnalytics) {
            handleOpenAnalytics();
        }
    }, [activeTab, selectedGroup?.id]);



    const loadHistory = async (groupId: string) => {
        const att = await getGroupAttendanceHistory(groupId);
        const rem = await getGroupRemarksHistory(groupId);
        setAttendanceHistory(att);
        setRemarksHistory(rem);
    };

    
    // Sincronizar attRecords con attendanceHistory al cambiar fecha o materia
    useEffect(() => {
        if (!attCourseId || !attDate) {
            setAttRecords({});
            return;
        }
        
        const recordsForDateAndCourse = attendanceHistory.filter((a: any) => {
            if (a.courseId !== attCourseId) return false;
            // a.date might be a string or a Date object
            const aDate = new Date(a.date);
            const aDateString = aDate.toISOString().split('T')[0];
            return aDateString === attDate;
        });

        const newRecords: Record<string, any> = {};
        recordsForDateAndCourse.forEach((rec: any) => {
            // Keep PRESENT status in state so the card style stays green
            newRecords[rec.userId] = {
                status: rec.status,
                arrivalTime: rec.arrivalTime ? new Date(rec.arrivalTime).toISOString().substring(11, 16) : undefined,
                departureTime: rec.departureTime ? new Date(rec.departureTime).toISOString().substring(11, 16) : undefined,
                justification: rec.justification || undefined
            };
        });
        
        setAttRecords(newRecords);
        setInitialAttRecords(newRecords);
    }, [attDate, attCourseId, attendanceHistory]);
const handleOpenAnalytics = async () => {
        if (!selectedGroup) return;
        setShowAnalyticsModal(true);
        setLoadingAnalytics(true);
        try {
            const data = await getTeacherComprehensiveGroupAnalyticsAction(selectedGroup.id);
            setFullAnalyticsData(data);
        } catch (error) {
            toast.error("Error al cargar la analítica");
            setShowAnalyticsModal(false);
        } finally {
            setLoadingAnalytics(false);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            const groupParam = searchParams.get('group');
            if (groupParam && groups.some((g: any) => g.id === groupParam)) {
                setSelectedGroupId(groupParam);
            }
        }
    }, [groups]);

    const filteredStudents = useMemo(() => {
        if (!selectedGroup?.students) return [];
        if (!searchQuery) return selectedGroup.students;
        const q = searchQuery.toLowerCase();
        return selectedGroup.students.filter((s: any) => 
            s.name.toLowerCase().includes(q) || 
            s.email.toLowerCase().includes(q) ||
            s.profile?.identificacion?.toLowerCase().includes(q)
        );
    }, [selectedGroup, searchQuery]);

    const filteredStudentsForRemark = useMemo(() => {
        if (!selectedGroup?.students) return [];
        if (!remarkStudentSearch) return selectedGroup.students;
        const q = remarkStudentSearch.toLowerCase();
        return selectedGroup.students.filter((s: any) => 
            s.name.toLowerCase().includes(q) || 
            s.profile?.identificacion?.toLowerCase().includes(q)
        );
    }, [selectedGroup, remarkStudentSearch]);

    const isCurrentDateValid = useMemo(() => {
        if (!attDate || !attCourseId) return true;
        return isDateValidForAttendance(attDate, attCourseId);
    }, [attDate, attCourseId, selectedGroupId]);

    const remarksByStudent = useMemo(() => {
        const grouped: Record<string, { student: any; remarks: any[] }> = {};
        remarksHistory.forEach((rem: any) => {
            const studentId = rem.userId;
            if (!grouped[studentId]) {
                grouped[studentId] = {
                    student: rem.user,
                    remarks: []
                };
            }
            grouped[studentId].remarks.push(rem);
        });
        return Object.values(grouped);
    }, [remarksHistory]);

    const filteredTemplates = useMemo(() => {
        return remarkTemplates.filter((t) => t.type === remarkType);
    }, [remarkTemplates, remarkType]);

    const handleResetPassword = async () => {
        if (!studentToResetPassword) return;
        setIsResetting(true);
        try {
            const res = await resetStudentPassword(studentToResetPassword.id);
            if (res.success) {
                toast.success("Contraseña restablecida exitosamente al documento de identidad.");
                setResetPasswordDialogOpen(false);
                setStudentToResetPassword(null);
            } else {
                toast.error("Error al restablecer la contraseña: " + res.error);
            }
        } catch (e: any) {
            toast.error("Error de conexión");
        } finally {
            setIsResetting(false);
        }
    };

    const toggleStudentSelection = (studentId: string) => {
        setSelectedStudents(prev => 
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const toggleAllStudents = () => {
        if (selectedStudents.length === filteredStudents.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filteredStudents.map((s: any) => s.id));
        }
    };

    const setStudentAttendance = async (studentId: string, status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE_EARLY" | "UNMARKED") => {
        if (isSavingAtt) return;
        if (isDateLocked && !hasEditPermission) {
            toast.error("Esta fecha pertenece a una semana anterior y está bloqueada.");
            return;
        }
        if (!attCourseId) return toast.error("Selecciona una materia");

        let timeString: string | undefined = undefined;

        if (status === "LATE" || status === "LEAVE_EARLY") {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();
            const totalMins = currentHour * 60 + currentMin;

            if (timeOptions && timeOptions.length > 0) {
                let closestDiff = Infinity;
                let closestSlot = timeOptions[0];
                for (const slot of timeOptions) {
                    const [sh, sm] = slot.split(":").map(Number);
                    const slotMins = sh * 60 + sm;
                    const diff = Math.abs(slotMins - totalMins);
                    if (diff < closestDiff) {
                        closestDiff = diff;
                        closestSlot = slot;
                    }
                }
                timeString = closestSlot;
            } else {
                timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
            }
        }
        // Optimistic UI update
        setAttRecords(prev => {
            const newRecords = { ...prev };
            if (status === "UNMARKED") {
                delete newRecords[studentId]; // Removiendo = Sin asistencia
            } else {
                newRecords[studentId] = { 
                    status: status as any, 
                    arrivalTime: status === "LATE" ? timeString : undefined,
                    departureTime: status === "LEAVE_EARLY" ? timeString : undefined
                };
            }
            return newRecords;
        });

        setIsSavingAtt(true);
        try {
            const res = await saveSingleAttendanceAction(
                attCourseId,
                studentId,
                attDate,
                status as any,
                undefined,
                status === "LATE" ? timeString : undefined,
                status === "LEAVE_EARLY" ? timeString : undefined
            );
            if (res.success) {
                loadHistory(selectedGroup!.id);
            } else {
                toast.error("Error al registrar asistencia: " + res.error);
                loadHistory(selectedGroup!.id);
            }
        } catch (e) {
            toast.error("Error de red al guardar asistencia");
            loadHistory(selectedGroup!.id);
        } finally {
            setIsSavingAtt(false);
        }
    };

    const updateLateTime = async (studentId: string, time: string) => {
        if (isSavingAtt) return;
        if (isDateLocked && !hasEditPermission) {
            toast.error("Esta fecha pertenece a una semana anterior y está bloqueada.");
            return;
        }
        // Optimistic update
        setAttRecords(prev => {
            if (!prev[studentId]) return prev;
            return {
                ...prev,
                [studentId]: { ...prev[studentId], arrivalTime: time }
            };
        });

        setIsSavingAtt(true);
        try {
            const res = await saveSingleAttendanceAction(
                attCourseId,
                studentId,
                attDate,
                "LATE",
                undefined,
                time
            );
            if (res.success) {
                loadHistory(selectedGroup!.id);
            } else {
                toast.error("Error al actualizar la hora de ingreso: " + res.error);
                loadHistory(selectedGroup!.id);
            }
        } catch (e) {
            toast.error("Error de red al actualizar la hora");
            loadHistory(selectedGroup!.id);
        } finally {
            setIsSavingAtt(false);
        }
    };

    const updateLeaveTime = async (studentId: string, time: string) => {
        if (isSavingAtt) return;
        if (isDateLocked && !hasEditPermission) {
            toast.error("Esta fecha pertenece a una semana anterior y está bloqueada.");
            return;
        }
        // Optimistic update
        setAttRecords(prev => {
            if (!prev[studentId]) return prev;
            return {
                ...prev,
                [studentId]: { ...prev[studentId], departureTime: time }
            };
        });

        setIsSavingAtt(true);
        try {
            const res = await saveSingleAttendanceAction(
                attCourseId,
                studentId,
                attDate,
                "LEAVE_EARLY",
                undefined,
                undefined,
                time
            );
            if (res.success) {
                loadHistory(selectedGroup!.id);
            } else {
                toast.error("Error al actualizar la hora de retiro: " + res.error);
                loadHistory(selectedGroup!.id);
            }
        } catch (e) {
            toast.error("Error de red al actualizar la hora");
            loadHistory(selectedGroup!.id);
        } finally {
            setIsSavingAtt(false);
        }
    };

    const nextSeqStudent = () => {
        if (seqIndex < filteredStudents.length - 1) {
            setSeqIndex(i => i + 1);
        } else {
            exitSequentialFullscreen();
            toast.success("Llamado de asistencia finalizado.");
        }
    };

    const prevSeqStudent = () => {
        if (seqIndex > 0) setSeqIndex(i => i - 1);
    };

    const startSequentialFullscreen = () => {
        setSeqIndex(0);
        setIsSequentialFullscreen(true);
        // Attempt native fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch((err) => {
                console.log("Error attempting fullscreen", err);
            });
        }
    };

    const exitSequentialFullscreen = () => {
        setIsSequentialFullscreen(false);
        if (document.fullscreenElement) {
            document.exitFullscreen().catch((err) => {
                console.log("Error exiting fullscreen", err);
            });
        }
    };

    // ── EXPORT FUNCTIONS ────────────────────────────────────────────────────────
    const getMatrixData = () => {
        if (!selectedGroup || !attCourseId) return null;
        const history = attendanceHistory.filter((r: any) => r.courseId === attCourseId);
        const allDates = [...new Set(history.map((r: any) => r.date as string))].sort();
        const students = selectedGroup.students ?? [];

        const rows = students.map((s: any) => {
            const row: Record<string, string> = {
                "Estudiante": formatName(s.name, s.profile),
                "Identificación": s.profile?.identificacion || "—",
            };
            let absences = 0;
            let lates = 0;
            let leaves = 0;
            for (const date of allDates) {
                const rec = history.find((r: any) => r.userId === s.id && r.date === date);
                if (rec) {
                    if (rec.justification) {
                        row[date] = "E";
                    } else if (rec.status === "ABSENT") {
                        row[date] = "F";
                        absences++;
                    } else if (rec.status === "LATE") {
                        row[date] = "T";
                        lates++;
                    } else if (rec.status === "LEAVE_EARLY") {
                        row[date] = "R";
                        leaves++;
                    } else {
                        row[date] = "";
                    }
                } else {
                    row[date] = "";
                }
            }
            row["F / T / R"] = `${absences} / ${lates} / ${leaves}`;
            return row;
        });
        return { rows, allDates, students };
    };

    const getHistoryData = () => {
        if (!selectedGroup || !attCourseId) return null;
        const history = attendanceHistory.filter((r: any) =>
            r.courseId === attCourseId && r.status !== "PRESENT"
        );
        const students = selectedGroup.students ?? [];

        const rows: Record<string, string>[] = [];
        for (const s of students) {
            const recs = history.filter((r: any) => r.userId === s.id);
            if (recs.length === 0) continue;
            for (const rec of recs) {
                rows.push({
                    "Estudiante": formatName(s.name, s.profile),
                    "Identificación": s.profile?.identificacion || "—",
                    "Fecha": rec.date ?? "",
                    "Tipo": rec.status === "ABSENT" ? "Falta" : "Llegada Tarde",
                    "Hora": rec.arrivalTime ?? "—",
                    "Justificación": rec.justification ?? "Sin justificación",
                });
            }
        }
        return rows;
    };

    const exportMatrixToExcel = () => {
        const data = getMatrixData();
        if (!data) return toast.error("No hay datos para exportar");
        const ws = XLSX.utils.json_to_sheet(data.rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Planilla");
        const groupName = selectedGroup?.name ?? "grupo";
        XLSX.writeFile(wb, `Planilla_${groupName}_${attDate}.xlsx`);
        toast.success("Planilla exportada a Excel");
    };

    const generatePDFWithPageBreaks = async (
        dataUrl: string, 
        container: HTMLElement, 
        pdfName: string, 
        orientation: 'p' | 'l' = 'p'
    ) => {
        const margin = 10; // 10mm margin on all sides
        const doc = new jsPDF(orientation, 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        const pdfWidth = pageWidth - (margin * 2);
        const pdfHeight = pageHeight - (margin * 2);
        
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => { img.onload = resolve; });
        
        const containerRect = container.getBoundingClientRect();
        // The container width in pixels maps to pdfWidth in mm
        const domToPdf = pdfWidth / containerRect.width;
        const imgRatio = img.height / img.width;
        const totalHeight = pdfWidth * imgRatio;
        
        const elements = container.querySelectorAll('.print-avoid-break');
        const protectedZones = Array.from(elements).map(el => {
            const rect = el.getBoundingClientRect();
            return {
                top: (rect.top - containerRect.top) * domToPdf,
                bottom: (rect.bottom - containerRect.top) * domToPdf
            };
        });

        let currentPdfY = 0;
        let pages = 0;
        while (currentPdfY < totalHeight - 1 && pages < 50) { 
            pages++;
            let pageBottom = currentPdfY + pdfHeight;
            
            // Find an element that is cut by the pageBottom
            const intersectingZone = protectedZones.find(z => z.top < pageBottom && z.bottom > pageBottom);
            
            if (intersectingZone) {
                // If the element can fit on a single page, and we make forward progress, break before it
                if (intersectingZone.bottom - intersectingZone.top < pdfHeight && intersectingZone.top > currentPdfY + 2) {
                    pageBottom = intersectingZone.top;
                }
            }
            
            // Draw the entire image, shifted so that currentPdfY is at the top margin
            doc.addImage(dataUrl, 'PNG', margin, margin - currentPdfY, pdfWidth, totalHeight);
            
            // Mask top margin (hides image overflow from previous pages)
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, pageWidth, margin, 'F');
            
            // Mask bottom margin (hides image overflow into bottom margin)
            doc.rect(0, pageHeight - margin, pageWidth, margin, 'F');
            
            // If we broke early, mask the empty bottom area of this page
            if (pageBottom < currentPdfY + pdfHeight && pageBottom < totalHeight) {
                const maskY = margin + (pageBottom - currentPdfY);
                doc.rect(0, maskY, pageWidth, pageHeight - maskY, 'F');
            }
            
            currentPdfY = pageBottom;
            if (currentPdfY < totalHeight - 1) {
                doc.addPage();
            }
        }
        
        doc.save(pdfName);
    };

    const exportMatrixToPDF = async () => {
        if (!matrixRef.current) return toast.error("No hay datos para exportar");

        const styleSheets = Array.from(document.styleSheets);
        const disabledSheets: any[] = [];
        styleSheets.forEach((sheet) => {
            try { const rules = sheet.cssRules; } catch (e) {
                disabledSheets.push(sheet);
                sheet.disabled = true;
            }
        });

        const toastId = toast.loading("Generando PDF de Planilla...");
        try {
            // Expand container for capture to prevent cropping horizontal scroll
            const tableContainer = matrixRef.current.querySelector('#matrix-table-container') as HTMLElement;
            let oldOverflow = '';
            let oldWidth = '';
            if (tableContainer) {
                oldOverflow = tableContainer.style.overflow;
                oldWidth = tableContainer.style.width;
                tableContainer.style.overflow = 'visible';
                tableContainer.style.width = 'fit-content';
            }
            const oldRefWidth = matrixRef.current.style.width;
            matrixRef.current.style.width = 'fit-content';

            const dataUrl = await htmlToImage.toPng(matrixRef.current, {
                quality: 1.0, backgroundColor: '#ffffff', pixelRatio: 2, skipFonts: true
            });
            
            // Restore
            if (tableContainer) {
                tableContainer.style.overflow = oldOverflow;
                tableContainer.style.width = oldWidth;
            }
            matrixRef.current.style.width = oldRefWidth;

            const groupName = selectedGroup?.name ?? "Grupo";
            await generatePDFWithPageBreaks(dataUrl, matrixRef.current, `Planilla_${groupName}_${attDate}.pdf`, 'l');
            toast.success("Planilla exportada a PDF", { id: toastId });
        } catch (error) {
            console.error("Error generando PDF:", error);
            toast.error("Ocurrió un error al generar el PDF.", { id: toastId });
        } finally {
            disabledSheets.forEach(sheet => { sheet.disabled = false; });
        }
    };

    const exportHistoryToExcel = () => {
        const rows = getHistoryData();
        if (!rows || rows.length === 0) return toast.error("No hay registros de novedades");
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Historial");
        const groupName = selectedGroup?.name ?? "grupo";
        XLSX.writeFile(wb, `Historial_${groupName}.xlsx`);
        toast.success("Historial exportado a Excel");
    };

    const exportHistoryToPDF = async () => {
        if (!historyRef.current) return toast.error("No hay datos para exportar");

        const styleSheets = Array.from(document.styleSheets);
        const disabledSheets: any[] = [];
        styleSheets.forEach((sheet) => {
            try { const rules = sheet.cssRules; } catch (e) {
                disabledSheets.push(sheet);
                sheet.disabled = true;
            }
        });

        const toastId = toast.loading("Generando PDF de Historial...");
        try {
            // Expand container for capture
            const tableContainer = historyRef.current.querySelector('#history-table-container') as HTMLElement;
            let oldOverflow = '';
            let oldWidth = '';
            if (tableContainer) {
                oldOverflow = tableContainer.style.overflow;
                oldWidth = tableContainer.style.width;
                tableContainer.style.overflow = 'visible';
                tableContainer.style.width = 'fit-content';
            }
            const oldRefWidth = historyRef.current.style.width;
            historyRef.current.style.width = 'fit-content';

            const dataUrl = await htmlToImage.toPng(historyRef.current, {
                quality: 1.0, backgroundColor: '#ffffff', pixelRatio: 2, skipFonts: true
            });
            
            // Restore
            if (tableContainer) {
                tableContainer.style.overflow = oldOverflow;
                tableContainer.style.width = oldWidth;
            }
            historyRef.current.style.width = oldRefWidth;

            const groupName = selectedGroup?.name ?? "Grupo";
            await generatePDFWithPageBreaks(dataUrl, historyRef.current, `Historial_${groupName}.pdf`, 'l');
            toast.success("Historial exportado a PDF", { id: toastId });
        } catch (error) {
            console.error("Error generando PDF:", error);
            toast.error("Ocurrió un error al generar el PDF.", { id: toastId });
        } finally {
            disabledSheets.forEach(sheet => { sheet.disabled = false; });
        }
    };
    // ── END EXPORT FUNCTIONS ─────────────────────────────────────────────────────

    const executeMarkAllPresent = async () => {
        if (isSavingAtt) return;
        setIsSavingAtt(true);
        const toastId = toast.loading("Registrando asistencia para todos los estudiantes...");

        const updatedRecords = { ...attRecords };
        filteredStudents.forEach((s: any) => {
            updatedRecords[s.id] = { status: "PRESENT" };
        });

        setAttRecords(updatedRecords);

        const records = Object.entries(updatedRecords).map(([studentId, rec]) => ({
            studentId,
            status: rec.status,
            arrivalTime: rec.arrivalTime ? `${attDate}T${rec.arrivalTime}:00Z` : undefined,
            departureTime: rec.departureTime ? `${attDate}T${rec.departureTime}:00Z` : undefined,
            justification: rec.justification
        }));

        try {
            const res = await saveAttendanceBatch(attCourseId, attDate, records as any);
            if (res.success) {
                toast.success("Todos los estudiantes marcados como presentes", { id: toastId });
                await loadHistory(selectedGroup!.id);
            } else {
                toast.error("Error al guardar asistencia: " + res.error, { id: toastId });
                await loadHistory(selectedGroup!.id);
            }
        } catch (error) {
            toast.error("Error al guardar asistencia", { id: toastId });
            await loadHistory(selectedGroup!.id);
        } finally {
            setIsSavingAtt(false);
        }
    };

    const handleMarkAllPresent = async () => {
        if (isSavingAtt) return;
        if (isDateLocked && !hasEditPermission) {
            toast.error("Esta fecha pertenece a una semana anterior y está bloqueada.");
            return;
        }
        if (!attCourseId) return toast.error("Selecciona una materia");
        if (filteredStudents.length === 0) return;

        setMarkAllConfirmOpen(true);
    };

    const handleSaveAttendance = async () => {
        if (isSavingAtt) return;
        if (isDateLocked && !hasEditPermission) {
            toast.error("Esta fecha pertenece a una semana anterior y está bloqueada.");
            return;
        }
        if (!attCourseId) return toast.error("Selecciona una materia");
        
        setIsSavingAtt(true);
        try {
            // Send ONLY ABSENT or LATE records. PRESENT is implicit.
            const records = Object.entries(attRecords).map(([studentId, rec]) => ({
                studentId,
                status: rec.status,
                arrivalTime: rec.arrivalTime ? `${attDate}T${rec.arrivalTime}:00Z` : undefined,
                departureTime: rec.departureTime ? `${attDate}T${rec.departureTime}:00Z` : undefined,
                justification: rec.justification
            }));

            const res = await saveAttendanceBatch(attCourseId, attDate, records as any);
            if (res.success) {
                toast.success("Asistencia guardada correctamente");
                loadHistory(selectedGroup!.id);
                setAttMode("list"); // return to list mode
            } else {
                toast.error("Error al guardar asistencia: " + res.error);
            }
        } catch (error) {
            toast.error("Error al guardar asistencia");
        } finally {
            setIsSavingAtt(false);
        }
    };

    const handleUpdateSingleAttendance = async (studentId: string, dateStr: string, status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE_EARLY" | "EXCUSED") => {
        if (isSavingAtt) return;
        if (isDateLocked && !hasEditPermission) {
            toast.error("Esta fecha pertenece a una semana anterior y está bloqueada.");
            return;
        }
        if (!attCourseId) return toast.error("Selecciona una materia");

        let justification: string | undefined = undefined;
        if (status === "EXCUSED") {
            const promptVal = window.prompt("Ingresa la justificación para la excusa:", "Justificado en planilla");
            if (promptVal === null) return; // User cancelled
            justification = promptVal || "Justificado en planilla";
        }

        const toastId = toast.loading("Actualizando asistencia...");
        setIsSavingAtt(true);
        try {
            const res = await saveSingleAttendanceAction(attCourseId, studentId, dateStr, status, justification);
            if (res.success) {
                toast.success("Asistencia actualizada", { id: toastId });
                await loadHistory(selectedGroup!.id);
            } else {
                toast.error("Error: " + res.error, { id: toastId });
            }
        } catch (error: any) {
            toast.error("Error al actualizar la asistencia", { id: toastId });
        } finally {
            setIsSavingAtt(false);
        }
    };

    const handleSaveRemarks = async () => {
        if (!remarkCourseId) return toast.error("Selecciona una materia");
        if (selectedStudents.length === 0) return toast.error("Selecciona al menos un estudiante");
        if (!remarkTitle.trim() || !remarkDesc.trim()) return toast.error("Completa el título y la descripción");

        setIsSavingRemark(true);
        const res = await saveRemarkBatch(teacherId!, remarkCourseId, selectedStudents, remarkType, remarkTitle, remarkDesc);
        if (res.success) {
            toast.success("Observación guardada correctamente");
            
            if (sendEmailOnSave) {
                const selectedEmails = (selectedGroup.students || [])
                    .filter((s: any) => selectedStudents.includes(s.id) && s.email)
                    .map((s: any) => s.email)
                    .join(',');
                if (selectedEmails) {
                    const subject = encodeURIComponent(remarkTitle);
                    const body = encodeURIComponent(getParsedDescription());
                    window.location.href = `mailto:${selectedEmails}?subject=${subject}&body=${body}`;
                } else {
                    toast.warning("No hay correos registrados para los estudiantes seleccionados.");
                }
            }

            setRemarkTitle("");
            setRemarkDesc("");
            setSelectedStudents([]);
            setSendEmailOnSave(false);
            loadHistory(selectedGroup!.id);
        } else {
            toast.error("Error al guardar observación: " + res.error);
        }
        setIsSavingRemark(false);
    };

    const handleDeleteRemark = (remarkId: string) => {
        requestConfirm(
            "¿Retirar observación?",
            "¿Estás seguro de que deseas retirar esta observación? Esta acción no se puede deshacer.",
            async () => {
                const toastId = toast.loading("Retirando observación...");
                try {
                    const res = await deleteRemarkAction(remarkId);
                    if (res.success) {
                        toast.success("Observación retirada correctamente", { id: toastId });
                        await loadHistory(selectedGroup!.id);
                    } else {
                        toast.error("Error al retirar la observación: " + res.error, { id: toastId });
                    }
                } catch (error: any) {
                    toast.error("Error de conexión al retirar la observación", { id: toastId });
                }
            }
        );
    };

    const handleDeleteAttendance = (att: any) => {
        if (isSavingAtt) return;
        const studentName = formatName(att.user.name, att.user.profile);
        const formattedDate = format(new Date(att.date), "dd/MM/yyyy");
        
        requestConfirm(
            "¿Retirar registro de asistencia?",
            `¿Estás seguro de que deseas retirar el registro de inasistencia/retraso de ${studentName} para el día ${formattedDate}?`,
            async () => {
                const dateStr = new Date(att.date).toISOString().split('T')[0];
                const toastId = toast.loading("Retirando falta/retraso...");
                setIsSavingAtt(true);
                try {
                    const res = await saveSingleAttendanceAction(
                        att.courseId,
                        att.userId,
                        dateStr,
                        "PRESENT"
                    );
                    if (res.success) {
                        toast.success("Asistencia actualizada a 'Presente'", { id: toastId });
                        await loadHistory(selectedGroup!.id);
                    } else {
                        toast.error("Error al retirar la falta/retraso: " + res.error, { id: toastId });
                    }
                } catch (error: any) {
                    toast.error("Error de conexión al retirar la falta/retraso", { id: toastId });
                } finally {
                    setIsSavingAtt(false);
                }
            }
        );
    };


    if (!groups || groups.length === 0) {
        return (
            <Card className="flex flex-col items-center justify-center py-24 border-dashed">
                <CardContent className="flex flex-col items-center justify-center pt-6">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <CardTitle className="text-2xl font-bold mb-2">No tienes grupos asignados</CardTitle>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-full">
            {/* TOP BAR - GROUP SELECTOR */}
            <Card className="w-full border-0 shadow-sm bg-gradient-to-r from-muted/40 to-muted/10 rounded-2xl overflow-hidden">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 px-5">
                    <div className="flex items-center gap-3 w-full md:w-auto mb-3 md:mb-0">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <Select value={selectedGroupId} onValueChange={handleGroupChangeAttempt}>
                            <SelectTrigger className="w-full md:w-[320px] h-10 text-base font-bold border border-primary/20 bg-background shadow-sm rounded-lg">
                                <SelectValue placeholder="Selecciona un Grupo" />
                            </SelectTrigger>
                            <SelectContent>
                                {groups.map(g => (
                                    <SelectItem key={g.id} value={g.id} className="py-2.5 font-semibold text-sm">
                                        {g.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedGroup && (
                        <div className="text-left md:text-right space-y-0.5">
                            <p className="font-bold text-sm text-foreground leading-tight">
                                {selectedGroup.program?.name} 
                                <span className="text-muted-foreground font-semibold text-xs ml-2">({selectedGroup.period?.name})</span>
                            </p>
                            <div className="text-[11px] font-medium text-muted-foreground flex flex-wrap items-center gap-1.5 md:justify-end">
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold bg-background h-5">
                                    {selectedGroup.students?.length || 0} Estudiantes
                                </Badge>
                                {groupScheduleInfo && (
                                    <>
                                        <span className="text-muted-foreground/30">•</span>
                                        <span className="flex items-center gap-1 text-foreground/80">
                                            <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                                            <span className="font-bold">{groupScheduleInfo.days}</span>
                                            <span className="text-muted-foreground">({groupScheduleInfo.time})</span>
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* MAIN WORKSPACE */}
            <Card className="flex-1 w-full min-w-0 border-0 shadow-lg rounded-2xl overflow-hidden">
                {selectedGroup ? (
                    <Tabs value={activeTab} onValueChange={handleTabChangeAttempt} className="flex-1 flex flex-col h-full min-h-[600px]">
                        <div className="p-4 border-b bg-muted/10">
                            <TabsList className="flex w-full overflow-x-auto justify-start md:justify-center h-auto p-1 bg-muted/50 rounded-xl gap-1 scrollbar-none">
                                {/* ── ESTUDIANTES ── */}
                                <TabsTrigger value="students" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0">
                                    <span className="flex items-center gap-1">
                                        Estudiantes
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span onClick={e => e.stopPropagation()} className="cursor-help">
                                                    <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-primary transition-colors" />
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-xs text-left p-3 space-y-1.5">
                                                <p className="font-bold text-sm">👥 Estudiantes</p>
                                                <p className="text-xs text-muted-foreground">Gestiona la lista completa de estudiantes del grupo y accede a herramientas de aula.</p>
                                                <ul className="text-xs space-y-1 mt-1 text-muted-foreground list-disc list-inside">
                                                    <li>Busca por nombre o identificación</li>
                                                    <li>Accede al registro académico individual</li>
                                                    <li><b>Ruleta de Aula:</b> sorteos con asignación de notas (0.0 a 5.0) y reincorporación</li>
                                                    <li><b>Creador de Grupos:</b> genera grupos de trabajo automáticos o por arrastre</li>
                                                    <li>Reinicia contraseña de un estudiante o envía correo directo</li>
                                                </ul>
                                            </TooltipContent>
                                        </Tooltip>
                                    </span>
                                </TabsTrigger>

                                {/* ── ASISTENCIA ── */}
                                <TabsTrigger value="attendance" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0">
                                    <span className="flex items-center gap-1">
                                        Asistencia
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span onClick={e => e.stopPropagation()} className="cursor-help">
                                                    <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-primary transition-colors" />
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-xs text-left p-3 space-y-1.5">
                                                <p className="font-bold text-sm">📋 Asistencia</p>
                                                <p className="text-xs text-muted-foreground">Registra y consulta la asistencia de tus estudiantes. Todo se guarda automáticamente al instante.</p>
                                                <ul className="text-xs space-y-1 mt-1 text-muted-foreground list-disc list-inside">
                                                    <li><b>Listado:</b> marca Presente/Falta/Tarde por cada estudiante</li>
                                                    <li><b>Llamar por Secuencia:</b> modo pantalla completa con visualización limpia</li>
                                                    <li><b>Planilla Limpia:</b> exportación a Excel y PDF con columna totalizadora <b>F / T</b></li>
                                                    <li><b>Historial Seguro:</b> eliminación de novedades con confirmación modal</li>
                                                </ul>
                                            </TooltipContent>
                                        </Tooltip>
                                    </span>
                                </TabsTrigger>

                                {/* ── OBSERVACIONES ── */}
                                <TabsTrigger value="remarks" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0">
                                    <span className="flex items-center gap-1">
                                        Observaciones
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span onClick={e => e.stopPropagation()} className="cursor-help">
                                                    <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-primary transition-colors" />
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-xs text-left p-3 space-y-1.5">
                                                <p className="font-bold text-sm">🔔 Observaciones</p>
                                                <p className="text-xs text-muted-foreground">Registra anotaciones disciplinarias o reconocimientos a estudiantes.</p>
                                                <ul className="text-xs space-y-1 mt-1 text-muted-foreground list-disc list-inside">
                                                    <li>Tipos: Llamado de atención, Felicitación, Citación u Otra</li>
                                                    <li>Agrega título y descripción detallada</li>
                                                    <li>Aplica a uno o varios estudiantes a la vez</li>
                                                    <li>El estudiante recibe notificación y puede ver su historial</li>
                                                    <li>Consulta el historial de observaciones del grupo</li>
                                                </ul>
                                            </TooltipContent>
                                        </Tooltip>
                                    </span>
                                </TabsTrigger>

                                {/* ── PLANES DE MEJORAMIENTO ── */}
                                <TabsTrigger value="improvement" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0 font-bold">
                                    <span className="flex items-center gap-1">
                                        Planes de Mejoramiento
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span onClick={e => e.stopPropagation()} className="cursor-help">
                                                    <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-primary transition-colors" />
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-xs text-left p-3 space-y-1.5 font-normal">
                                                <p className="font-bold text-sm">📄 Planes de Mejoramiento</p>
                                                <p className="text-xs text-muted-foreground">Gestiona y califica planes de mejoramiento para los estudiantes del grupo.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </span>
                                </TabsTrigger>

                                {/* ── CALIFICACIONES ── */}
                                <TabsTrigger value="grades" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0">
                                    <span className="flex items-center gap-1">
                                        Calificaciones
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span onClick={e => e.stopPropagation()} className="cursor-help">
                                                    <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-primary transition-colors" />
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-xs text-left p-3 space-y-1.5">
                                                <p className="font-bold text-sm">🎓 Calificaciones</p>
                                                <p className="text-xs text-muted-foreground">Gestiona la estructura de notas y califica actividades por materia.</p>
                                                <ul className="text-xs space-y-1 mt-1 text-muted-foreground list-disc list-inside">
                                                    <li>Crea categorías de calificación con porcentaje</li>
                                                    <li>Agrega actividades dentro de cada categoría</li>
                                                    <li>Ingresa notas individuales por estudiante (escala 0–5)</li>
                                                    <li>Visualiza el promedio ponderado automáticamente</li>
                                                    <li>Gestiona grupos de trabajo para actividades grupales</li>
                                                    <li>Los estudiantes pueden adjuntar enlaces de entrega</li>
                                                </ul>
                                            </TooltipContent>
                                        </Tooltip>
                                    </span>
                                </TabsTrigger>

                                {/* ── DOCUMENTACIÓN ── */}
                                <TabsTrigger value="documentation" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0">
                                    <span className="flex items-center gap-1">
                                        <BookOpen className="w-3 h-3 shrink-0" />
                                        Documentación
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span onClick={e => e.stopPropagation()} className="cursor-help">
                                                    <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-primary transition-colors" />
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-xs text-left p-3 space-y-1.5">
                                                <p className="font-bold text-sm">📚 Documentación</p>
                                                <p className="text-xs text-muted-foreground">Comparte recursos y materiales de estudio con tus estudiantes por materia.</p>
                                                <ul className="text-xs space-y-1 mt-1 text-muted-foreground list-disc list-inside">
                                                    <li>Organizado por materia — cada una tiene su sección</li>
                                                    <li>Publica enlaces a documentos, videos o páginas web</li>
                                                    <li>Asigna un título descriptivo a cada recurso</li>
                                                    <li>Los estudiantes ven los recursos en su pestaña Documentación</li>
                                                    <li>Elimina recursos que ya no sean necesarios</li>
                                                </ul>
                                            </TooltipContent>
                                        </Tooltip>
                                    </span>
                                </TabsTrigger>

                                {/* ── ANALÍTICA ── */}
                                <TabsTrigger value="analytics" className="flex-1 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0">
                                    <span className="flex items-center gap-1">
                                        Analítica
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span onClick={e => e.stopPropagation()} className="cursor-help">
                                                    <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-primary transition-colors" />
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-xs text-left p-3 space-y-1.5">
                                                <p className="font-bold text-sm">📊 Analítica</p>
                                                <p className="text-xs text-muted-foreground">Visualiza el rendimiento y comportamiento del grupo con gráficos interactivos.</p>
                                                <ul className="text-xs space-y-1 mt-1 text-muted-foreground list-disc list-inside">
                                                    <li><b>Rendimiento Integral:</b> ranking ponderado (70% Notas, 20% Asistencia, 10% Disciplina)</li>
                                                    <li>Gráfico de rendimiento general del grupo</li>
                                                    <li>Comparativa de asistencia por materia</li>
                                                    <li>Distribución de notas y observaciones</li>
                                                    <li>Identifica estudiantes en riesgo académico</li>
                                                </ul>
                                            </TooltipContent>
                                        </Tooltip>
                                    </span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 p-2 sm:p-6 overflow-y-auto overflow-x-hidden w-full min-w-0">
                            {/* TAB 1: STUDENTS */}
                            <TabsContent value="students" className="m-0 space-y-4 outline-none">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Buscar por nombre o identificación..." 
                                            className="pl-9 h-11 rounded-xl bg-muted/30 border-0 focus-visible:ring-1"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    
                                    <div className="text-sm font-semibold text-muted-foreground bg-muted/30 px-4 py-2 rounded-xl">
                                        Total: {filteredStudents.length} estudiantes
                                    </div>

                                    <div className="md:ml-auto flex flex-wrap items-center gap-2">
                                        {selectedStudents.length > 0 && (
                                            <Button 
                                                variant="secondary" 
                                                size="sm"
                                                className="h-9 rounded-xl font-bold bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-xs flex items-center gap-1.5"
                                                onClick={() => {
                                                    const selectedEmails = filteredStudents
                                                        .filter((s: any) => selectedStudents.includes(s.id) && s.email)
                                                        .map((s: any) => s.email)
                                                        .join(',');
                                                    if (selectedEmails) window.location.href = `mailto:${selectedEmails}`;
                                                }}
                                            >
                                                <Mail className="h-3.5 w-3.5" />
                                                Enviar a Seleccionados ({selectedStudents.length})
                                            </Button>
                                        )}

                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="h-9 rounded-xl font-bold bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 flex items-center gap-1.5 text-xs"
                                            onClick={() => setIsRouletteOpen(true)}
                                        >
                                            <Dices className="h-3.5 w-3.5" />
                                            Abrir Ruleta
                                        </Button>

                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="h-9 rounded-xl font-bold bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 flex items-center gap-1.5 text-xs"
                                            onClick={() => setIsGroupGeneratorOpen(true)}
                                        >
                                            <Shuffle className="h-3.5 w-3.5" />
                                            Generar Grupos
                                        </Button>
                                    </div>
                                </div>

                                <div className="rounded-xl border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="w-[50px] text-center">
                                                    <Checkbox 
                                                        checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                                                        onCheckedChange={toggleAllStudents}
                                                    />
                                                </TableHead>
                                                <TableHead className="font-bold text-xs uppercase text-muted-foreground">Estudiante</TableHead>
                                                <TableHead className="font-bold text-xs uppercase text-muted-foreground hidden md:table-cell">Documento</TableHead>
                                                <TableHead className="font-bold text-xs uppercase text-muted-foreground hidden lg:table-cell">Contacto</TableHead>
                                                <TableHead className="font-bold text-xs uppercase text-right text-muted-foreground">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredStudents.map((s: any) => (
                                                <TableRow key={s.id} className="hover:bg-muted/20">
                                                    <TableCell className="text-center">
                                                        <Checkbox 
                                                            checked={selectedStudents.includes(s.id)}
                                                            onCheckedChange={() => toggleStudentSelection(s.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8 border bg-muted/50">
                                                                <AvatarImage src={s.image} />
                                                                <AvatarFallback>{s.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-semibold text-sm">{formatName(s.name, s.profile)}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs hidden md:table-cell">
                                                        {s.profile?.identificacion || "N/A"}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                                                        {s.email}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Tooltip><TooltipTrigger asChild><Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    if (s.email) window.location.href = `mailto:${s.email}`;
                                                                }}
                                                                className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                            >
                                                                <Mail className="w-4 h-4" />
                                                            </Button></TooltipTrigger><TooltipContent><p>Enviar correo</p></TooltipContent></Tooltip>
                                                            <Tooltip><TooltipTrigger asChild><Button 
                                                                variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10"
                                                                                                                            onClick={() => setSelectedStudentForAnalytics(s)}
                                                                                                                        >
                                                                                                                            <GraduationCap className="w-4 h-4" />
                                                                                                                        </Button></TooltipTrigger><TooltipContent><p>Registro Académico</p></TooltipContent></Tooltip>
                                                            <Tooltip><TooltipTrigger asChild><Button 
                                                                                                                            variant="ghost" 
                                                                                                                            size="icon" 
                                                                                                                            className="h-8 w-8 text-orange-500 hover:bg-orange-500/10"
                                                                                                                            onClick={() => {
                                                                                                                                setStudentToResetPassword(s);
                                                                                                                                setResetPasswordDialogOpen(true);
                                                                                                                            }}
                                                                                                                            disabled={isResetting}
                                                                                                                        >
                                                                                                                            <Key className="w-4 h-4" />
                                                                                                                        </Button></TooltipTrigger><TooltipContent><p>Resetear Contraseña</p></TooltipContent></Tooltip>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {filteredStudents.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                        No se encontraron estudiantes
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            {/* TAB: ANALYTICS */}
                            <TabsContent value="analytics" className="m-0 h-full outline-none p-0 flex flex-col">
                                <GroupAnalyticsPanel 
                                    inline={true}
                                    isLoading={loadingAnalytics}
                                    analyticsData={fullAnalyticsData}
                                />
                            </TabsContent>

                            {/* TAB: GRADES */}
                            <TabsContent value="grades" className="m-0 outline-none w-full min-w-0 max-w-full">
                                <GradeManagerPanel 
                                    courses={selectedGroup.courses || []}
                                    students={filteredStudents}
                                />
                            </TabsContent>

                            {/* TAB: DOCUMENTATION */}
                            <TabsContent value="documentation" className="m-0 outline-none w-full min-w-0 space-y-6">
                                {!selectedGroup.courses || selectedGroup.courses.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 rounded-xl border-2 border-dashed">
                                        <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                                        <p className="text-muted-foreground font-medium">No hay materias asignadas a este grupo</p>
                                    </div>
                                ) : (
                                    selectedGroup.courses.map((course: any) => (
                                        <div key={course.id} className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                                            {/* Course header */}
                                            <div className="flex items-center gap-3 px-5 py-4 bg-muted/20 border-b border-border/40">
                                                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                                    <BookOpen className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-base leading-tight text-foreground">{course.title}</h3>
                                                    {course.teacher && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {course.teacher.profile?.nombres
                                                                ? `${course.teacher.profile.nombres} ${course.teacher.profile.apellido || ""}`.trim()
                                                                : course.teacher.name}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {/* CourseDocLinks per materia */}
                                            <div className="p-5">
                                                <CourseDocLinks
                                                    key={course.id}
                                                    courseId={course.id}
                                                    initialContent={course.sharedContent || []}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </TabsContent>

                            {/* TAB 2: ATTENDANCE */}
                            <TabsContent value="attendance" className="m-0 space-y-4 outline-none">
                                {isDateLocked && (
                                    <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300 ${
                                        hasEditPermission 
                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-400" 
                                            : permissionRequestStatus === "PENDING"
                                                ? "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-400"
                                                : permissionRequestStatus === "REJECTED"
                                                    ? "bg-red-500/10 border-red-500/20 text-red-800 dark:text-red-400"
                                                    : "bg-slate-500/10 border-slate-500/20 text-slate-800 dark:text-slate-400"
                                    }`}>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 font-bold text-sm">
                                                <Lock className="w-4 h-4" />
                                                <span>
                                                    {hasEditPermission 
                                                        ? "Edición Autorizada (Semana Anterior)" 
                                                        : "Fecha Bloqueada (Semana Anterior)"}
                                                </span>
                                            </div>
                                            <p className="text-xs opacity-90">
                                                {hasEditPermission 
                                                    ? "El administrador ha aprobado tu solicitud de edición para esta fecha. Puedes registrar asistencia." 
                                                    : permissionRequestStatus === "PENDING"
                                                        ? "Has solicitado permiso para modificar la asistencia de esta fecha. Esperando aprobación del administrador."
                                                        : permissionRequestStatus === "REJECTED"
                                                            ? `Tu solicitud de edición fue rechazada. Motivo: ${permissionReason || "Sin justificación."}`
                                                            : "Esta fecha pertenece a una semana anterior. Debes solicitar permiso al administrador para modificar la asistencia."}
                                            </p>
                                        </div>
                                        
                                        {!hasEditPermission && permissionRequestStatus !== "PENDING" && (
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md w-full md:w-auto">
                                                <Input 
                                                    placeholder="Motivo del cambio..." 
                                                    value={requestingPermissionReason}
                                                    onChange={e => setRequestingPermissionReason(e.target.value)}
                                                    className="h-8 text-xs bg-background text-foreground"
                                                />
                                                <Button 
                                                    size="sm" 
                                                    disabled={isRequestingPermission || !requestingPermissionReason.trim()}
                                                    onClick={async () => {
                                                        setIsRequestingPermission(true);
                                                        const { requestAttendanceEditPermissionAction } = await import("../actions/groupActions");
                                                        const res = await requestAttendanceEditPermissionAction(attCourseId, attDate, requestingPermissionReason);
                                                        if (res.success) {
                                                            toast.success("Solicitud de permiso enviada.");
                                                            setRequestingPermissionReason("");
                                                            checkEditPermission();
                                                        } else {
                                                            toast.error(res.error || "Error al enviar solicitud.");
                                                        }
                                                        setIsRequestingPermission(false);
                                                    }}
                                                    className="h-8 text-xs font-bold shrink-0"
                                                >
                                                    Solicitar Permiso
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Dedicated Date Selection Bar */}
                                {attMode !== "matrix" && attMode !== "history" && attMode !== "metrics" && (
                                    <div className="flex flex-col gap-2 bg-muted/10 p-4 rounded-2xl border mb-3 w-full animate-in fade-in duration-300">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full mb-1">
                                            <div className="flex items-center gap-4">
                                                <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Fecha de Asistencia</Label>
                                                <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-xl border border-muted-foreground/15 shadow-sm">
                                                    <Switch
                                                        id="hide-other-dates"
                                                        disabled={isSavingAtt}
                                                        checked={hideOtherDates}
                                                        onCheckedChange={setHideOtherDates}
                                                        className="scale-75"
                                                    />
                                                    <Label htmlFor="hide-other-dates" className="text-[10px] font-bold text-muted-foreground cursor-pointer select-none">
                                                        Solo fecha actual
                                                    </Label>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm border ${
                                                limitSettingsActive
                                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                                                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                            }`}>
                                                {limitSettingsActive ? (
                                                    <>
                                                        <Lock className="w-3 h-3" />
                                                        <span>Edición de semanas anteriores restringida</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Unlock className="w-3.5 h-3.5" />
                                                        <span>Modificación libre del historial habilitada</span>
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 p-1 bg-background rounded-xl border border-muted-foreground/15 shadow-sm max-h-[120px] overflow-y-auto">
                                            {(() => {
                                                const validDaysList = getValidClassDaysList();
                                                const todayStr = format(new Date(), "yyyy-MM-dd");
                                                const filteredDaysList = hideOtherDates 
                                                    ? (validDaysList.includes(attDate) ? [attDate] : (validDaysList.length > 0 ? [attDate] : []))
                                                    : validDaysList;

                                                return filteredDaysList.map((ds) => {
                                                    const d = new Date(ds + "T12:00:00Z");
                                                    const dayNamesShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
                                                    const label = `${dayNamesShort[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
                                                    const isFuture = ds > todayStr;
                                                    const isSelected = ds === attDate;
                                                    const isToday = ds === todayStr;

                                                    return (
                                                        <Button
                                                            key={ds}
                                                            size="sm"
                                                            variant={isSelected ? "default" : "outline"}
                                                            disabled={isFuture || isSavingAtt}
                                                            type="button"
                                                            onClick={() => handleDateChangeAttempt(ds)}
                                                            className={`h-7 px-2 sm:px-2.5 text-[10px] sm:text-xs font-bold transition-all rounded-lg shrink-0 cursor-pointer ${
                                                                isSelected 
                                                                    ? "shadow-sm font-extrabold" 
                                                                    : isToday
                                                                        ? "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/10 font-extrabold"
                                                                        : "text-muted-foreground hover:text-foreground"
                                                            }`}
                                                            title={isFuture ? "Fecha futura (deshabilitada)" : `Seleccionar ${ds}`}
                                                        >
                                                            {label}
                                                        </Button>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                )}
                                {/* Header Controls for Attendance — single compact row */}
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-muted/20 px-4 py-3 rounded-2xl border">

                                    {/* Course */}
                                    <div className="flex items-center gap-2 w-full lg:w-auto min-w-0">
                                        <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap shrink-0">Materia</Label>
                                        <Select disabled={isSavingAtt} value={attCourseId} onValueChange={handleCourseChangeAttempt}>
                                            <SelectTrigger className="h-9 rounded-lg border-muted-foreground/20 font-semibold bg-background text-sm w-full lg:min-w-[180px] lg:max-w-[280px]">
                                                <SelectValue placeholder="Seleccionar Materia" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {selectedGroup.courses?.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.id} className="font-semibold">{c.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Navigation and Actions Wrapper */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto min-w-0">
                                        {/* View mode pills */}
                                        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto justify-start sm:justify-center">
                                            <div className="flex items-center p-0.5 bg-muted/60 rounded-lg gap-0.5 shrink-0">
                                                {([
                                                    { mode: "list",    icon: <ListTodo className="w-3.5 h-3.5" />, label: "Listado" },
                                                    { mode: "summary", icon: <ClipboardList className="w-3.5 h-3.5" />, label: "Resumen" },
                                                ] as const).map(({ mode, icon, label }) => (
                                                    <button
                                                        key={mode}
                                                        disabled={isSavingAtt}
                                                        onClick={() => setAttMode(mode)}
                                                        className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                                            attMode === mode
                                                                ? "bg-background shadow-sm text-foreground"
                                                                : "text-muted-foreground hover:text-foreground"
                                                        }`}
                                                    >
                                                        {icon}
                                                        <span>{label}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Divider */}
                                            <div className="w-px h-6 bg-border/60 mx-1 shrink-0" />

                                            {/* Group 2: Planilla / Historial / Métricas */}
                                            <div className="flex items-center p-0.5 bg-muted/60 rounded-lg gap-0.5 shrink-0">
                                                {([
                                                    { mode: "matrix",  icon: <LayoutList className="w-3.5 h-3.5" />, label: "Planilla" },
                                                    { mode: "history", icon: <History className="w-3.5 h-3.5" />, label: "Historial" },
                                                    { mode: "metrics", icon: <BarChart3 className="w-3.5 h-3.5" />, label: "Métricas" },
                                                ] as const).map(({ mode, icon, label }) => (
                                                    <button
                                                        key={mode}
                                                        disabled={isSavingAtt}
                                                        onClick={() => setAttMode(mode)}
                                                        className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                                            attMode === mode
                                                                ? "bg-background shadow-sm text-foreground"
                                                                : "text-muted-foreground hover:text-foreground"
                                                        }`}
                                                    >
                                                        {icon}
                                                        <span>{label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                                            {/* Play Sequential button */}
                                            <Button
                                                onClick={startSequentialFullscreen}
                                                variant="outline"
                                                disabled={!attCourseId || isSavingAtt}
                                                className="flex-1 sm:flex-initial h-9 px-3 rounded-lg font-bold text-sm gap-1.5 shrink-0 border-primary/20 hover:bg-primary/5 text-primary"
                                            >
                                                <Play className="w-3.5 h-3.5" />
                                                <span className="hidden xs:inline">Llamar por Secuencia</span>
                                                <span className="xs:hidden">Secuencia</span>
                                            </Button>

                                            <Button
                                                onClick={handleMarkAllPresent}
                                                disabled={!attCourseId || isSavingAtt}
                                                variant="outline"
                                                className="flex-1 sm:flex-initial h-9 px-3 rounded-lg font-bold text-sm gap-1.5 shrink-0 border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-extrabold"
                                            >
                                                <UserCheck className="w-3.5 h-3.5" />
                                                <span className="hidden xs:inline">Marcar todos como Presentes</span>
                                                <span className="xs:hidden">Todos Presentes</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {!isCurrentDateValid && (attMode === "list" || attMode === "summary") ? (
                                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-amber-300 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl text-center space-y-4">
                                        <div className="p-3 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full animate-bounce">
                                            <ShieldAlert className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <h4 className="font-black text-lg text-foreground">Fecha no Programada</h4>
                                            <p className="text-sm text-muted-foreground max-w-sm">
                                                Hoy no es un día que corresponda a este curso según el horario programado. Seleccione otra fecha o use las flechas de navegación para ver los días válidos.
                                            </p>
                                        </div>
                                    </div>
                                ) : attMode === "list" ? (
                                    // MODE 1: LIST VIEW
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-end mb-2">
                                            <span className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                                                <span className="text-emerald-600 dark:text-emerald-400">
                                                    {Object.values(attRecords).filter(r => r.status === "PRESENT").length} Presentes
                                                </span>
                                                <span className="text-muted-foreground/35">|</span>
                                                <span className="text-red-600 dark:text-red-400">
                                                    {Object.values(attRecords).filter(r => r.status === "ABSENT").length} Faltas
                                                </span>
                                                <span className="text-muted-foreground/35">|</span>
                                                <span className="text-amber-600 dark:text-amber-400">
                                                    {Object.values(attRecords).filter(r => r.status === "LATE").length} Tardes
                                                </span>
                                                <span className="text-muted-foreground/35">|</span>
                                                <span className="text-blue-600 dark:text-blue-400">
                                                    {Object.values(attRecords).filter(r => r.status === "LEAVE_EARLY").length} Retiros
                                                </span>
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                            {filteredStudents.map((s: any) => {
                                                const rec = attRecords[s.id];
                                                const isAbsent = rec?.status === "ABSENT";
                                                const isLate = rec?.status === "LATE";
                                                const isLeaveEarly = rec?.status === "LEAVE_EARLY";
                                                const isPresent = rec?.status === "PRESENT";
                                                
                                                const studentHistory = attendanceHistory.filter(a => a.userId === s.id);
                                                const courseHistory = studentHistory.filter(a => a.courseId === attCourseId);
                                                const absentCount = courseHistory.filter(a => a.status === 'ABSENT').length;
                                                const lateCount = courseHistory.filter(a => a.status === 'LATE').length;
                                                const leaveCount = courseHistory.filter(a => a.status === 'LEAVE_EARLY').length;

                                                const daysOfWeekEng = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

                                                const totalLateHours = courseHistory
                                                    .filter(a => a.status === 'LATE' && a.arrivalTime)
                                                    .reduce((sum, a) => {
                                                        const aDate = new Date(a.date);
                                                        const dayIndex = aDate.getUTCDay();
                                                        const dayOfWeekName = daysOfWeekEng[dayIndex];
                                                        const course = selectedGroup.courses?.find((c: any) => c.id === attCourseId);
                                                        const scheduleForDay = course?.schedules?.find((sched: any) => sched.dayOfWeek === dayOfWeekName);
                                                        const startTimeStr = scheduleForDay?.startTime || selectedGroup.startTime || "06:00";
                                                        const arrivalTimeStr = a.arrivalTime ? (typeof a.arrivalTime === 'string' ? a.arrivalTime : new Date(a.arrivalTime).toISOString().substring(11, 16)) : "";
                                                        const diff = arrivalTimeStr ? calculateHoursDiff(startTimeStr, arrivalTimeStr) : 0;
                                                        return sum + diff;
                                                    }, 0);

                                                const totalLeaveHours = courseHistory
                                                    .filter(a => a.status === 'LEAVE_EARLY' && a.departureTime)
                                                    .reduce((sum, a) => {
                                                        const aDate = new Date(a.date);
                                                        const dayIndex = aDate.getUTCDay();
                                                        const dayOfWeekName = daysOfWeekEng[dayIndex];
                                                        const course = selectedGroup.courses?.find((c: any) => c.id === attCourseId);
                                                        const scheduleForDay = course?.schedules?.find((sched: any) => sched.dayOfWeek === dayOfWeekName);
                                                        const endTimeStr = scheduleForDay?.endTime || selectedGroup.endTime || "12:00";
                                                        const departureTimeStr = a.departureTime ? (typeof a.departureTime === 'string' ? a.departureTime : new Date(a.departureTime).toISOString().substring(11, 16)) : "";
                                                        const diff = departureTimeStr ? calculateHoursDiff(departureTimeStr, endTimeStr) : 0;
                                                        return sum + diff;
                                                    }, 0);

                                                 return (
                                                    <div 
                                                        key={s.id} 
                                                        className={`p-2.5 sm:p-3.5 rounded-xl border transition-all duration-200 shadow-sm ${
                                                            isAbsent 
                                                                ? 'bg-red-50/70 border-red-300 dark:bg-red-950/20 dark:border-red-900/60' 
                                                                : isLate 
                                                                    ? 'bg-amber-50/70 border-amber-300 dark:bg-amber-950/20 dark:border-amber-900/60' 
                                                                    : isLeaveEarly
                                                                        ? 'bg-blue-50/70 border-blue-300 dark:bg-blue-950/20 dark:border-blue-900/60'
                                                                        : isPresent
                                                                            ? 'bg-emerald-50/65 border-emerald-300 dark:bg-emerald-950/25 dark:border-emerald-900/65'
                                                                            : 'bg-muted/15 border-muted/70 hover:border-muted-foreground/30 dark:bg-muted/10 dark:border-muted/30 dark:hover:border-muted/50 border-dashed'
                                                        }`}
                                                    >
                                                        {/* Header: Name, ID, Historial */}
                                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2.5">
                                                            <div className="min-w-0">
                                                                <div 
                                                                    className={`font-semibold text-sm break-words ${
                                                                        isAbsent 
                                                                            ? 'text-red-900 dark:text-red-200' 
                                                                            : isLate 
                                                                                ? 'text-amber-900 dark:text-amber-200' 
                                                                                : isLeaveEarly
                                                                                    ? 'text-blue-900 dark:text-blue-200'
                                                                                    : isPresent
                                                                                        ? 'text-emerald-900 dark:text-emerald-200'
                                                                                        : 'text-foreground'
                                                                    }`}
                                                                    title={formatName(s.name, s.profile)}
                                                                >
                                                                    {formatName(s.name, s.profile)}
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">
                                                                    ID: {s.profile?.identificacion || s.id.substring(0, 8)}
                                                                </div>
                                                            </div>

                                                            {/* History button / indicator */}
                                                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 mt-1.5 sm:mt-0">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-1.5 text-[10px] font-bold text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40 rounded-md flex items-center gap-1"
                                                                    onClick={() => handleShowStudentDetails(s)}
                                                                    title="Ver historial de inasistencias"
                                                                >
                                                                    <Eye className="w-3 h-3" />
                                                                    <span>Historial</span>
                                                                </Button>
                                                                {(absentCount > 0 || lateCount > 0 || leaveCount > 0) && (
                                                                    <div className="flex gap-1 flex-wrap justify-end">
                                                                        {absentCount > 0 && (
                                                                            <Badge className="h-4 text-[8px] px-1 bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 hover:bg-red-100 font-bold shadow-none">
                                                                                Faltas: {absentCount}
                                                                            </Badge>
                                                                        )}
                                                                        {lateCount > 0 && (
                                                                            <Badge className="h-4 text-[8px] px-1 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-100 font-bold shadow-none">
                                                                                Tardes: {lateCount} {totalLateHours > 0 && `(${totalLateHours.toFixed(1)} hrs)`}
                                                                            </Badge>
                                                                        )}
                                                                        {leaveCount > 0 && (
                                                                            <Badge className="h-4 text-[8px] px-1 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-100 font-bold shadow-none">
                                                                                Retiros: {leaveCount} {totalLeaveHours > 0 && `(${totalLeaveHours.toFixed(1)} hrs)`}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Quick Actions Row */}
                                                        <div className="flex flex-wrap items-center gap-1.5 w-full">
                                                            <Button 
                                                                size="sm"
                                                                disabled={isSavingAtt}
                                                                variant={isPresent ? "default" : "outline"}
                                                                className={`flex-1 min-w-[70px] h-8 font-bold text-[10px] sm:text-xs rounded-lg transition-all px-1.5 ${
                                                                    isPresent 
                                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-extrabold' 
                                                                        : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50/50 hover:border-emerald-200 border-border/80'
                                                                }`}
                                                                onClick={() => setStudentAttendance(s.id, isPresent ? "UNMARKED" : "PRESENT")}
                                                            >
                                                                <UserCheck className="w-3 h-3 mr-0.5 sm:mr-1 shrink-0" />
                                                                Presente
                                                            </Button>
                                                            <Button 
                                                                size="sm"
                                                                disabled={isSavingAtt}
                                                                variant={isAbsent ? "default" : "outline"}
                                                                className={`flex-1 min-w-[70px] h-8 font-bold text-[10px] sm:text-xs rounded-lg transition-all px-1.5 ${
                                                                    isAbsent 
                                                                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm font-extrabold' 
                                                                        : 'text-muted-foreground hover:text-red-600 hover:bg-red-50/50 hover:border-red-200 border-border/80'
                                                                }`}
                                                                onClick={() => setStudentAttendance(s.id, isAbsent ? "UNMARKED" : "ABSENT")}
                                                            >
                                                                <UserX className="w-3 h-3 mr-0.5 sm:mr-1 shrink-0" />
                                                                Falta
                                                            </Button>
                                                            <Button 
                                                                size="sm"
                                                                disabled={isSavingAtt}
                                                                variant={isLate ? "default" : "outline"}
                                                                className={`flex-1 min-w-[70px] h-8 font-bold text-[10px] sm:text-xs rounded-lg transition-all px-1.5 ${
                                                                    isLate 
                                                                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm font-extrabold' 
                                                                        : 'text-muted-foreground hover:text-amber-600 hover:bg-amber-50/50 hover:border-amber-200 border-border/80'
                                                                }`}
                                                                onClick={() => setStudentAttendance(s.id, isLate ? "UNMARKED" : "LATE")}
                                                            >
                                                                <Clock className="w-3 h-3 mr-0.5 sm:mr-1 shrink-0" />
                                                                Tarde
                                                            </Button>
                                                            <Button 
                                                                size="sm"
                                                                disabled={isSavingAtt}
                                                                variant={isLeaveEarly ? "default" : "outline"}
                                                                className={`flex-1 min-w-[70px] h-8 font-bold text-[10px] sm:text-xs rounded-lg transition-all px-1.5 ${
                                                                    isLeaveEarly 
                                                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-extrabold' 
                                                                        : 'text-muted-foreground hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-200 border-border/80'
                                                                }`}
                                                                onClick={() => setStudentAttendance(s.id, isLeaveEarly ? "UNMARKED" : "LEAVE_EARLY")}
                                                            >
                                                                <LogOut className="w-3 h-3 mr-0.5 sm:mr-1 shrink-0" />
                                                                Retiro
                                                            </Button>
                                                        </div>

                                                        {/* Time input nested if Late */}
                                                        <AnimatePresence>
                                                            {isLate && (() => {
                                                                const dayIndex = new Date(attDate + "T12:00:00").getDay();
                                                                const dayOfWeekName = daysOfWeekEng[dayIndex];
                                                                const course = selectedGroup.courses?.find((c: any) => c.id === attCourseId);
                                                                const scheduleForDay = course?.schedules?.find((sched: any) => sched.dayOfWeek === dayOfWeekName);
                                                                const startTimeStr = scheduleForDay?.startTime || selectedGroup.startTime || "06:00";
                                                                const diff = rec?.arrivalTime ? calculateHoursDiff(startTimeStr, rec.arrivalTime) : 0;
                                                                return (
                                                                    <motion.div 
                                                                        initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                                                                        animate={{ opacity: 1, height: "auto", marginTop: 8 }} 
                                                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-amber-100/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 pl-1">Hora Ingreso:</span>
                                                                                <select
                                                                                    disabled={isSavingAtt}
                                                                                    className="h-6 w-[115px] rounded-md border border-amber-300 dark:border-amber-900/60 bg-white dark:bg-black text-[10px] font-bold text-amber-900 dark:text-amber-200 px-1 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    value={rec?.arrivalTime || ""}
                                                                                    onChange={e => updateLateTime(s.id, e.target.value)}
                                                                                >
                                                                                    <option value="" disabled>Seleccione...</option>
                                                                                    {timeOptions.map(time => (
                                                                                        <option key={time} value={time}>
                                                                                            {time}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                            <div className="flex justify-between items-center text-[10px] font-bold text-amber-800 dark:text-amber-300 px-1 border-t border-amber-200/30 pt-1">
                                                                                <span>Horas perdidas:</span>
                                                                                <span className="text-xs font-black">{diff.toFixed(1)} hrs</span>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                );
                                                            })()}
                                                        </AnimatePresence>

                                                        {/* Time input nested if Leave Early */}
                                                        <AnimatePresence>
                                                            {isLeaveEarly && (() => {
                                                                const dayIndex = new Date(attDate + "T12:00:00").getDay();
                                                                const dayOfWeekName = daysOfWeekEng[dayIndex];
                                                                const course = selectedGroup.courses?.find((c: any) => c.id === attCourseId);
                                                                const scheduleForDay = course?.schedules?.find((sched: any) => sched.dayOfWeek === dayOfWeekName);
                                                                const endTimeStr = scheduleForDay?.endTime || selectedGroup.endTime || "12:00";
                                                                const diff = rec?.departureTime ? calculateHoursDiff(rec.departureTime, endTimeStr) : 0;
                                                                return (
                                                                    <motion.div 
                                                                        initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                                                                        animate={{ opacity: 1, height: "auto", marginTop: 8 }} 
                                                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-blue-100/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 pl-1">Hora Retiro:</span>
                                                                                <select
                                                                                    disabled={isSavingAtt}
                                                                                    className="h-6 w-[115px] rounded-md border border-blue-300 dark:border-blue-900/60 bg-white dark:bg-black text-[10px] font-bold text-blue-900 dark:text-blue-200 px-1 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    value={rec?.departureTime || ""}
                                                                                    onChange={e => updateLeaveTime(s.id, e.target.value)}
                                                                                >
                                                                                    <option value="" disabled>Seleccione...</option>
                                                                                    {timeOptions.map(time => (
                                                                                        <option key={time} value={time}>
                                                                                            {time}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                            <div className="flex justify-between items-center text-[10px] font-bold text-blue-800 dark:text-blue-300 px-1 border-t border-blue-200/30 pt-1">
                                                                                <span>Horas perdidas:</span>
                                                                                <span className="text-xs font-black">{diff.toFixed(1)} hrs</span>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                );
                                                            })()}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : attMode === "summary" ? (
                                    // MODE 2: SUMMARY VIEW (Resumen)
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                                <ClipboardList className="w-3.5 h-3.5 mr-1" />
                                                Resumen de Inasistencias y Tardanzas de Hoy
                                            </Badge>
                                            <span className="text-xs font-semibold text-muted-foreground">
                                                {Object.values(attRecords).filter((r: any) => r.status === "ABSENT" || r.status === "LATE" || r.status === "LEAVE_EARLY").length} Estudiantes con novedades marcadas
                                            </span>
                                        </div>

                                        {Object.values(attRecords).filter((r: any) => r.status === "ABSENT" || r.status === "LATE" || r.status === "LEAVE_EARLY").length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 rounded-2xl border border-dashed bg-card shadow-sm">
                                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-full text-emerald-600 dark:text-emerald-400">
                                                    <CheckSquare className="w-8 h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="font-black text-lg text-foreground">¡Todo en orden!</h3>
                                                    <p className="text-sm text-muted-foreground max-w-sm">No hay inasistencias o tardanzas registradas para esta clase. Todos los estudiantes están marcados como presentes.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                                                <Table>
                                                    <TableHeader className="bg-muted/30">
                                                        <TableRow>
                                                            <TableHead className="pl-6">Estudiante</TableHead>
                                                            <TableHead className="w-[150px] text-center">Identificación</TableHead>
                                                            <TableHead className="w-[150px] text-center">Novedad</TableHead>
                                                            <TableHead className="w-[180px] text-center">Detalle</TableHead>
                                                            <TableHead className="w-[120px] text-right pr-6">Acción</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredStudents
                                                            .filter((s: any) => {
                                                                const rec = attRecords[s.id];
                                                                return rec && (rec.status === "ABSENT" || rec.status === "LATE" || rec.status === "LEAVE_EARLY");
                                                            })
                                                            .map((s: any) => {
                                                                const daysOfWeekEng = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
                                                                const rec = attRecords[s.id];
                                                                const isAbsent = rec.status === "ABSENT";
                                                                const isLate = rec.status === "LATE";
                                                                const isLeaveEarly = rec.status === "LEAVE_EARLY";
                                                                return (
                                                                    <TableRow key={s.id} className="hover:bg-muted/10 transition-colors">
                                                                        <TableCell className="pl-6 py-3.5">
                                                                            <div className="flex items-center gap-3">
                                                                                <Avatar className="w-9 h-9 border">
                                                                                    <AvatarImage src={s.image} />
                                                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                                                        {s.name?.substring(0, 2).toUpperCase()}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <div className="min-w-0">
                                                                                    <div className="font-semibold text-sm text-foreground truncate max-w-[280px]">
                                                                                        {formatName(s.name, s.profile)}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                                            {s.profile?.identificacion || "—"}
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            <Badge variant="outline" className={`font-bold text-xs ${
                                                                                isAbsent 
                                                                                    ? 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20' 
                                                                                    : isLate 
                                                                                        ? 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20'
                                                                                        : 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                                                                            }`}>
                                                                                {isAbsent ? "Inasistencia" : isLate ? "Llegada Tarde" : "Retiro Temprano"}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {isLate ? (
                                                                                <div className="flex flex-col gap-1 items-center justify-center">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">Ingreso:</span>
                                                                                        <select
                                                                                            disabled={isSavingAtt}
                                                                                            className="h-6 w-[105px] rounded-md border border-amber-300 dark:border-amber-900/60 bg-white dark:bg-black text-[10px] font-bold text-amber-900 dark:text-amber-200 px-1 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                            value={rec.arrivalTime || ""}
                                                                                            onChange={e => updateLateTime(s.id, e.target.value)}
                                                                                        >
                                                                                            <option value="" disabled>Seleccione...</option>
                                                                                            {timeOptions.map(time => (
                                                                                                <option key={time} value={time}>
                                                                                                    {time}
                                                                                                </option>
                                                                                            ))}
                                                                                        </select>
                                                                                    </div>
                                                                                    {(() => {
                                                                                        const dayIndex = new Date(attDate + "T12:00:00").getDay();
                                                                                        const dayOfWeekName = daysOfWeekEng[dayIndex];
                                                                                        const course = selectedGroup.courses?.find((c: any) => c.id === attCourseId);
                                                                                        const scheduleForDay = course?.schedules?.find((sched: any) => sched.dayOfWeek === dayOfWeekName);
                                                                                        const startTimeStr = scheduleForDay?.startTime || selectedGroup.startTime || "06:00";
                                                                                        const diff = rec.arrivalTime ? calculateHoursDiff(startTimeStr, rec.arrivalTime) : 0;
                                                                                        return (
                                                                                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                                                                                {diff.toFixed(1)} hrs perdidas
                                                                                            </span>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                            ) : isLeaveEarly ? (
                                                                                <div className="flex flex-col gap-1 items-center justify-center">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300">Retiro:</span>
                                                                                        <select
                                                                                            disabled={isSavingAtt}
                                                                                            className="h-6 w-[105px] rounded-md border border-blue-300 dark:border-blue-900/60 bg-white dark:bg-black text-[10px] font-bold text-blue-900 dark:text-blue-200 px-1 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                            value={rec.departureTime || ""}
                                                                                            onChange={e => updateLeaveTime(s.id, e.target.value)}
                                                                                        >
                                                                                            <option value="" disabled>Seleccione...</option>
                                                                                            {timeOptions.map(time => (
                                                                                                <option key={time} value={time}>
                                                                                                    {time}
                                                                                                </option>
                                                                                            ))}
                                                                                        </select>
                                                                                    </div>
                                                                                    {(() => {
                                                                                        const dayIndex = new Date(attDate + "T12:00:00").getDay();
                                                                                        const dayOfWeekName = daysOfWeekEng[dayIndex];
                                                                                        const course = selectedGroup.courses?.find((c: any) => c.id === attCourseId);
                                                                                        const scheduleForDay = course?.schedules?.find((sched: any) => sched.dayOfWeek === dayOfWeekName);
                                                                                        const endTimeStr = scheduleForDay?.endTime || selectedGroup.endTime || "12:00";
                                                                                        const diff = rec.departureTime ? calculateHoursDiff(rec.departureTime, endTimeStr) : 0;
                                                                                        return (
                                                                                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">
                                                                                                {diff.toFixed(1)} hrs perdidas
                                                                                            </span>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-xs text-muted-foreground">Día completo</span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-right pr-6">
                                                                            <Button 
                                                                                size="sm" 
                                                                                variant="ghost" 
                                                                                disabled={isSavingAtt}
                                                                                onClick={() => setStudentAttendance(s.id, "PRESENT")}
                                                                                className="h-7 px-2.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold"
                                                                            >
                                                                                Marcar Presente
                                                                            </Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </div>
                                ) : attMode === "metrics" ? (() => {
                                    // Get group start/end times and calculate group daily duration
                                    const gStart = selectedGroup.startTime || "08:00";
                                    const gEnd = selectedGroup.endTime || "12:00";
                                    
                                    const [gsh, gsm] = gStart.split(":").map(Number);
                                    const [geh, gem] = gEnd.split(":").map(Number);
                                    const groupDailyHours = Math.max(0, (geh * 60 + gem - (gsh * 60 + gsm)) / 60);

                                    // Get all scheduled dates
                                    const validDaysList = getValidClassDaysList();
                                    const totalClassDays = validDaysList.length;
                                    const totalScheduledHours = totalClassDays * groupDailyHours;

                                    if (totalClassDays === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 rounded-2xl border border-dashed bg-card shadow-sm">
                                                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-full text-amber-600 dark:text-amber-400">
                                                    <HelpCircle className="w-8 h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="font-black text-lg text-foreground">Sin días de clase configurados</h3>
                                                    <p className="text-sm text-muted-foreground max-w-sm">
                                                        No hay días de clase programados dentro del rango del horario para esta materia.
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Calculate metrics per student
                                    const studentMetrics = selectedGroup.students?.map((student: any) => {
                                        const studentRecords = attendanceHistory.filter((rec: any) => 
                                            rec.courseId === attCourseId && 
                                            rec.userId === student.id
                                        );

                                        // Absences
                                        const absentRecords = studentRecords.filter(r => r.status === "ABSENT");
                                        const absentCount = absentRecords.length;
                                        
                                        const absentHours = absentCount * groupDailyHours;

                                        // Late arrivals
                                        const lateRecords = studentRecords.filter(r => r.status === "LATE");
                                        const lateCount = lateRecords.length;

                                        let lateHours = 0;
                                        lateRecords.forEach(rec => {
                                            if (!rec.arrivalTime) return;
                                            
                                            const [sh, sm] = gStart.split(":").map(Number);
                                            let timePart = "";
                                            try {
                                                const dateObj = new Date(rec.arrivalTime);
                                                if (isNaN(dateObj.getTime())) {
                                                    throw new Error("Invalid date");
                                                }
                                                timePart = dateObj.toISOString().substring(11, 16);
                                            } catch (e) {
                                                timePart = typeof rec.arrivalTime === "string" ? rec.arrivalTime : "00:00";
                                            }
                                            const [ah, am] = timePart.split(":").map(Number);

                                            const schedMin = sh * 60 + sm;
                                            const arrMin = ah * 60 + am;

                                            if (arrMin > schedMin) {
                                                lateHours += (arrMin - schedMin) / 60;
                                            }
                                        });

                                        // Leave early arrivals
                                        const leaveRecords = studentRecords.filter(r => r.status === "LEAVE_EARLY");
                                        const leaveCount = leaveRecords.length;

                                        let leaveHours = 0;
                                        leaveRecords.forEach(rec => {
                                            if (!rec.departureTime) return;
                                            
                                            const [eh, em] = gEnd.split(":").map(Number);
                                            let timePart = "";
                                            try {
                                                const dateObj = new Date(rec.departureTime);
                                                if (isNaN(dateObj.getTime())) {
                                                    throw new Error("Invalid date");
                                                }
                                                timePart = dateObj.toISOString().substring(11, 16);
                                            } catch (e) {
                                                timePart = typeof rec.departureTime === "string" ? rec.departureTime : "00:00";
                                            }
                                            const [dh, dm] = timePart.split(":").map(Number);

                                            const schedMin = eh * 60 + em;
                                            const depMin = dh * 60 + dm;

                                            if (schedMin > depMin) {
                                                leaveHours += (schedMin - depMin) / 60;
                                            }
                                        });

                                        // Attendance rates
                                        const attendanceDaysRate = totalClassDays > 0 
                                            ? Math.max(0, Math.min(100, ((totalClassDays - absentCount) / totalClassDays) * 100))
                                            : 100;

                                        const totalLostHours = absentHours + lateHours + leaveHours;
                                        const attendanceHoursRate = totalScheduledHours > 0
                                            ? Math.max(0, Math.min(100, ((totalScheduledHours - totalLostHours) / totalScheduledHours) * 100))
                                            : 100;

                                        // Late rates
                                        const lateDaysRate = totalClassDays > 0
                                            ? Math.max(0, Math.min(100, (lateCount / totalClassDays) * 100))
                                            : 0;

                                        const lateHoursRate = totalScheduledHours > 0
                                            ? Math.max(0, Math.min(100, (lateHours / totalScheduledHours) * 100))
                                            : 0;

                                        return {
                                            student,
                                            absentCount,
                                            absentHours,
                                            lateCount,
                                            lateHours,
                                            leaveCount,
                                            leaveHours,
                                            attendanceDaysRate,
                                            attendanceHoursRate,
                                            lateDaysRate,
                                            lateHoursRate
                                        };
                                    }) || [];

                                    // Averages
                                    const avgAttendanceDays = studentMetrics.length > 0
                                        ? studentMetrics.reduce((acc: number, m: any) => acc + m.attendanceDaysRate, 0) / studentMetrics.length
                                        : 100;
                                    const avgAttendanceHours = studentMetrics.length > 0
                                        ? studentMetrics.reduce((acc: number, m: any) => acc + m.attendanceHoursRate, 0) / studentMetrics.length
                                        : 100;
                                    const avgLateDays = studentMetrics.length > 0
                                        ? studentMetrics.reduce((acc: number, m: any) => acc + m.lateDaysRate, 0) / studentMetrics.length
                                        : 0;
                                    const avgLateHours = studentMetrics.length > 0
                                        ? studentMetrics.reduce((acc: number, m: any) => acc + m.lateHoursRate, 0) / studentMetrics.length
                                        : 0;
                                    const avgLeaveDays = studentMetrics.length > 0
                                        ? studentMetrics.reduce((acc: number, m: any) => acc + (m.leaveCount / totalClassDays) * 100, 0) / studentMetrics.length
                                        : 0;
                                    const avgLeaveHours = studentMetrics.length > 0
                                        ? studentMetrics.reduce((acc: number, m: any) => acc + (m.leaveHours / totalScheduledHours) * 100, 0) / studentMetrics.length
                                        : 0;

                                    const exportMetricsExcel = () => {
                                        const wb = XLSX.utils.book_new();
                                        const wsData = [
                                            ["Estudiante", "Faltas", "Tardanzas", "Retiros", "Asistencia Efectiva (%)", "Horas Programadas", "Horas Asistidas", "Horas Perdidas"]
                                        ];
                                        studentMetrics.forEach((m: any) => {
                                            const totalLost = m.absentHours + m.lateHours + m.leaveHours;
                                            const attended = Math.max(0, totalScheduledHours - totalLost);
                                            wsData.push([
                                                formatName(m.student.name, m.student.profile),
                                                m.absentCount,
                                                m.lateCount,
                                                m.leaveCount,
                                                m.attendanceHoursRate.toFixed(1) + "%",
                                                totalScheduledHours.toFixed(1),
                                                attended.toFixed(1),
                                                totalLost.toFixed(1)
                                            ]);
                                        });
                                        const ws = XLSX.utils.aoa_to_sheet(wsData);
                                        XLSX.utils.book_append_sheet(wb, ws, "Métricas");
                                        XLSX.writeFile(wb, `Metricas_${selectedGroup.name.replace(/\s+/g, '_')}.xlsx`);
                                    };

                                    const exportMetricsPDF = async () => {
                                        if (!printMetricsRef.current) return;
                                        
                                        // 1. Deshabilitar temporalmente hojas de estilo cruzadas (evita SecurityError en cssRules)
                                        const styleSheets = Array.from(document.styleSheets);
                                        const disabledSheets: any[] = [];
                                        styleSheets.forEach((sheet) => {
                                            try {
                                                const rules = sheet.cssRules; // Lanza excepción si es cross-origin y no tiene CORS
                                            } catch (e) {
                                                disabledSheets.push(sheet);
                                                sheet.disabled = true;
                                            }
                                        });

                                        try {
                                            // 2. Hacer temporalmente visible el div para imprimir
                                            printMetricsRef.current.style.display = 'block';
                                            
                                            const dataUrl = await htmlToImage.toPng(printMetricsRef.current, {
                                                quality: 1.0,
                                                backgroundColor: '#ffffff',
                                                pixelRatio: 2,
                                                skipFonts: true // Evita peticiones a fuentes externas que pueden fallar
                                            });
                                            
                                            // Ocultarlo nuevamente
                                            printMetricsRef.current.style.display = 'none';

                                            await generatePDFWithPageBreaks(dataUrl, printMetricsRef.current, `Metricas_${selectedGroup.name.replace(/\s+/g, '_')}.pdf`, 'p');
                                        } catch (error) {
                                            console.error("Error generando PDF con html-to-image", error);
                                            toast.error("Ocurrió un error al generar el PDF gráfico.");
                                        } finally {
                                            // 3. Rehabilitar las hojas de estilo externas
                                            disabledSheets.forEach(sheet => { sheet.disabled = false; });
                                            if (printMetricsRef.current) {
                                                printMetricsRef.current.style.display = 'none';
                                            }
                                        }
                                    };

                                    return (
                                        <div className="space-y-6">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div>
                                                    <h3 className="text-lg font-bold">Resumen Analítico</h3>
                                                    <p className="text-sm text-muted-foreground">Estadísticas calculadas para la materia seleccionada</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" onClick={exportMetricsExcel}>
                                                        <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Excel
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={exportMetricsPDF}>
                                                        <FileDown className="w-4 h-4 mr-2 text-red-600" /> PDF
                                                    </Button>
                                                </div>
                                            </div>
                                            {/* KPI Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="bg-card border rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pérdida (Tardes y Retiros)</span>
                                                    <span className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2 flex flex-col items-start gap-0.5">
                                                        <span>{(avgLateHours + avgLeaveHours).toFixed(2)}%</span>
                                                        <span className="text-[10px] font-bold text-muted-foreground">({avgLateHours.toFixed(1)}% Tardes / {avgLeaveHours.toFixed(1)}% Retiros)</span>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Stacked Full-Width Charts Section Organized by Tabs */}
                                            <Tabs defaultValue="faltas" className="w-full mt-6">
                                                <TabsList className="grid w-full sm:w-[600px] grid-cols-4 mb-6 mx-auto">
                                                    <TabsTrigger value="faltas">Faltas</TabsTrigger>
                                                    <TabsTrigger value="tardanzas">Tardanzas</TabsTrigger>
                                                    <TabsTrigger value="retiros">Retiros</TabsTrigger>
                                                    <TabsTrigger value="horas">Carga Horaria</TabsTrigger>
                                                </TabsList>

                                                <TabsContent value="faltas" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                                                {/* CHART 1: ABSENCES (FALTAS) */}
                                                <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4 w-full">
                                                    <div>
                                                        <h3 className="text-base font-black text-foreground">Registro de Inasistencias (Faltas)</h3>
                                                        <p className="text-xs text-muted-foreground mt-0.5">Total de días no asistidos por cada estudiante sobre el total de días programados.</p>
                                                    </div>

                                                    <div className="space-y-4">
                                                         {studentMetrics.map(({ student, absentCount, attendanceDaysRate }: any) => {
                                                             const absenceRate = 100 - attendanceDaysRate;
                                                             return (
                                                                 <div key={student.id} className="space-y-1.5">
                                                                     <div className="flex items-center justify-between text-xs font-bold">
                                                                         <span className="truncate text-foreground max-w-[300px] sm:max-w-md">{formatName(student.name, student.profile)}</span>
                                                                         <span className="text-red-600 shrink-0 font-extrabold">
                                                                             {absentCount} {absentCount === 1 ? "Falta" : "Faltas"} / {totalClassDays} días ({absenceRate.toFixed(1)}%)
                                                                         </span>
                                                                     </div>
                                                                     <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                                         <div 
                                                                             className="h-full bg-red-500 dark:bg-red-600 rounded-full transition-all duration-500" 
                                                                             style={{ width: `${absenceRate}%` }}
                                                                         />
                                                                     </div>
                                                                 </div>
                                                             );
                                                         })}
                                                    </div>
                                                </div>

                                                </TabsContent>

                                                <TabsContent value="tardanzas" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                                                {/* CHART 2: LATE ARRIVALS (TARDANZAS) */}
                                                <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4 w-full">
                                                    <div>
                                                        <h3 className="text-base font-black text-foreground">Registro de Llegadas Tarde (Tardanzas)</h3>
                                                        <p className="text-xs text-muted-foreground mt-0.5">Cantidad de días en los que el estudiante registró ingreso tarde sobre los días programados.</p>
                                                    </div>

                                                    <div className="space-y-4">
                                                         {studentMetrics.map(({ student, lateCount, lateDaysRate }: any) => (
                                                             <div key={student.id} className="space-y-1.5">
                                                                 <div className="flex items-center justify-between text-xs font-bold">
                                                                     <span className="truncate text-foreground max-w-[300px] sm:max-w-md">{formatName(student.name, student.profile)}</span>
                                                                     <span className="text-amber-600 dark:text-amber-400 shrink-0 font-extrabold">
                                                                         {lateCount} {lateCount === 1 ? "Tarde" : "Tardes"} / {totalClassDays} días ({lateDaysRate.toFixed(1)}%)
                                                                     </span>
                                                                 </div>
                                                                 <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                                     <div 
                                                                         className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                                                                         style={{ width: `${lateDaysRate}%` }}
                                                                     />
                                                                 </div>
                                                             </div>
                                                         ))}
                                                    </div>
                                                </div>

                                                </TabsContent>

                                                <TabsContent value="retiros" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                                                {/* CHART 2b: LEAVE EARLY (RETIROS) */}
                                                <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4 w-full">
                                                    <div>
                                                        <h3 className="text-base font-black text-foreground">Registro de Retiros Tempranos</h3>
                                                        <p className="text-xs text-muted-foreground mt-0.5">Cantidad de días en los que el estudiante registró retiro temprano sobre los días programados.</p>
                                                    </div>

                                                    <div className="space-y-4">
                                                         {studentMetrics.map(({ student, leaveCount }: any) => {
                                                             const leaveDaysRate = totalClassDays > 0 ? (leaveCount / totalClassDays) * 100 : 0;
                                                             return (
                                                                 <div key={student.id} className="space-y-1.5">
                                                                     <div className="flex items-center justify-between text-xs font-bold">
                                                                         <span className="truncate text-foreground max-w-[300px] sm:max-w-md">{formatName(student.name, student.profile)}</span>
                                                                         <span className="text-blue-600 dark:text-blue-400 shrink-0 font-extrabold">
                                                                             {leaveCount} {leaveCount === 1 ? "Retiro" : "Retiros"} / {totalClassDays} días ({leaveDaysRate.toFixed(1)}%)
                                                                         </span>
                                                                     </div>
                                                                     <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                                         <div 
                                                                             className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                                                                             style={{ width: `${leaveDaysRate}%` }}
                                                                         />
                                                                     </div>
                                                                 </div>
                                                             );
                                                         })}
                                                    </div>
                                                </div>
                                                </TabsContent>

                                                <TabsContent value="horas" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                                                {/* CHART 3: TOTAL ACCUMULATED HOURS & EFFECTIVE ATTENDANCE */}
                                                <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4 w-full">
                                                    <div>
                                                        <h3 className="text-base font-black text-foreground">Carga Horaria y Asistencia Efectiva (Horas Asistidas vs. Perdidas)</h3>
                                                        <p className="text-xs text-muted-foreground mt-0.5">Muestra la cantidad de horas acumuladas entre faltas y tardanzas, la diferencia (horas asistidas) y el porcentaje de asistencia efectiva con respecto a las horas totales.</p>
                                                    </div>

                                                    <div className="space-y-5">
                                                         {studentMetrics.map(({ student, absentHours, lateHours, leaveHours, attendanceHoursRate }: any) => {
                                                              const lostHours = absentHours + lateHours + leaveHours;
                                                              const attendedHours = Math.max(0, totalScheduledHours - lostHours);
                                                              return (
                                                                  <div key={student.id} className="space-y-2 border-b border-border/30 pb-3 last:border-0 last:pb-0">
                                                                      <div className="flex flex-wrap items-center justify-between text-xs font-bold gap-2">
                                                                          <span className="truncate text-foreground max-w-[280px] sm:max-w-md">{formatName(student.name, student.profile)}</span>
                                                                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-muted-foreground">
                                                                              <span className="text-emerald-600 dark:text-emerald-400">Asistidas: {attendedHours.toFixed(2)} hs</span>
                                                                              <span className="text-red-500">Perdidas: {lostHours.toFixed(2)} hs</span>
                                                                              <span className="text-blue-600 dark:text-blue-400 font-extrabold">Efectiva: {attendanceHoursRate.toFixed(1)}%</span>
                                                                          </div>
                                                                      </div>
                                                                      
                                                                      <div className="space-y-1">
                                                                          {/* Stacked indicator bar representing Attended Hours vs. Lost Hours */}
                                                                          <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                                                                              {/* Attended hours bar */}
                                                                              <div 
                                                                                  className="h-full bg-emerald-500 dark:bg-emerald-600 transition-all duration-500" 
                                                                                  style={{ width: `${attendanceHoursRate}%` }}
                                                                                  title={`Horas Asistidas: ${attendedHours.toFixed(2)} hs`}
                                                                              />
                                                                              {/* Absent hours bar (red) */}
                                                                              {absentHours > 0 && (
                                                                                  <div 
                                                                                      className="h-full bg-red-500 dark:bg-red-600 transition-all duration-500" 
                                                                                      style={{ width: `${(absentHours / totalScheduledHours) * 100}%` }}
                                                                                      title={`Horas de Faltas: ${absentHours.toFixed(2)} hs`}
                                                                                  />
                                                                              )}
                                                                              {/* Late hours bar (orange) */}
                                                                              {lateHours > 0 && (
                                                                                  <div 
                                                                                      className="h-full bg-amber-500 dark:bg-amber-500 transition-all duration-500" 
                                                                                      style={{ width: `${(lateHours / totalScheduledHours) * 100}%` }}
                                                                                      title={`Horas de Tardanzas: ${lateHours.toFixed(2)} hs`}
                                                                                  />
                                                                              )}
                                                                              {/* Leave hours bar (blue) */}
                                                                              {leaveHours > 0 && (
                                                                                  <div 
                                                                                      className="h-full bg-blue-500 dark:bg-blue-600 transition-all duration-500" 
                                                                                      style={{ width: `${(leaveHours / totalScheduledHours) * 100}%` }}
                                                                                      title={`Horas de Retiros: ${leaveHours.toFixed(2)} hs`}
                                                                                  />
                                                                              )}
                                                                          </div>
                                                                          
                                                                          {/* Detailed breakdown subtext */}
                                                                          <div className="text-[10px] text-muted-foreground flex justify-between">
                                                                              <span>{totalScheduledHours.toFixed(1)} hs totales del curso</span>
                                                                              <span>Desglose de pérdida: {absentHours.toFixed(1)} hs Faltas + {lateHours.toFixed(2)} hs Tardanzas + {leaveHours.toFixed(2)} hs Retiros</span>
                                                                          </div>
                                                                      </div>
                                                                  </div>
                                                              );
                                                          })}
                                                    </div>
                                                </div>
                                                </TabsContent>
                                            </Tabs>

                                            {/* HIDDEN PRINT VIEW FOR PDF EXPORT - Contains all 3 charts un-tabbed with inline styles to prevent CSS parsing errors */}
                                            <div ref={printMetricsRef} style={{ display: 'none', width: '800px', padding: '32px', backgroundColor: '#ffffff', color: '#0f172a' }}>
                                                <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px', margin: 0 }}>Métricas de Asistencia - {selectedGroup.name}</h2>
                                                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '24px', color: '#475569', margin: '4px 0 24px 0' }}>Materia: {selectedGroup.courses?.find((c: any) => c.id === attCourseId)?.title || "General"}</h3>
                                                
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', marginBottom: '32px' }}>
                                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#f8fafc' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Días Programados</span>
                                                        <span style={{ display: 'block', fontSize: '24px', fontWeight: '900', marginTop: '8px' }}>{totalClassDays} días</span>
                                                    </div>
                                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#f8fafc' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Horas Programadas</span>
                                                        <span style={{ display: 'block', fontSize: '24px', fontWeight: '900', marginTop: '8px' }}>{totalScheduledHours.toFixed(1)} hs</span>
                                                    </div>
                                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#f8fafc' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Asistencia Promedio</span>
                                                        <span style={{ display: 'block', fontSize: '24px', fontWeight: '900', marginTop: '8px', color: '#059669' }}>{avgAttendanceHours.toFixed(1)}%</span>
                                                    </div>
                                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#f8fafc' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Pérdida (Tardanzas)</span>
                                                        <span style={{ display: 'block', fontSize: '24px', fontWeight: '900', marginTop: '8px', color: '#d97706' }}>{avgLateHours.toFixed(2)}%</span>
                                                    </div>
                                                </div>

                                                {/* CHART 1: Faltas */}
                                                <div className="print-avoid-break" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px', backgroundColor: '#ffffff' }}>
                                                    <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '4px', margin: 0 }}>Registro de Inasistencias (Faltas)</h3>
                                                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', margin: '4px 0 16px 0' }}>Total de días no asistidos por estudiante</p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                        {studentMetrics.map(({ student, absentCount, attendanceDaysRate }: any) => {
                                                            const absenceRate = 100 - attendanceDaysRate;
                                                            return (
                                                                <div key={student.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700' }}>
                                                                        <span>{formatName(student.name, student.profile)}</span>
                                                                        <span style={{ color: '#dc2626' }}>{absentCount} Faltas ({absenceRate.toFixed(1)}%)</span>
                                                                    </div>
                                                                    <div style={{ height: '12px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                                                                        <div style={{ height: '100%', backgroundColor: '#ef4444', width: `${absenceRate}%` }} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* CHART 2: Tardanzas */}
                                                <div className="print-avoid-break" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px', backgroundColor: '#ffffff' }}>
                                                    <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '4px', margin: 0 }}>Registro de Llegadas Tarde (Tardanzas)</h3>
                                                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', margin: '4px 0 16px 0' }}>Total de días con llegada tarde por estudiante</p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                        {studentMetrics.map(({ student, lateCount, lateDaysRate }: any) => (
                                                            <div key={student.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} className="print-avoid-break">
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700' }}>
                                                                    <span>{formatName(student.name, student.profile)}</span>
                                                                    <span style={{ color: '#d97706' }}>{lateCount} Tardes ({lateDaysRate.toFixed(1)}%)</span>
                                                                </div>
                                                                <div style={{ height: '12px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                                                                    <div style={{ height: '100%', backgroundColor: '#f59e0b', width: `${lateDaysRate}%` }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* CHART 2b: Retiros */}
                                                <div className="print-avoid-break" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px', backgroundColor: '#ffffff' }}>
                                                    <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '4px', margin: 0 }}>Registro de Retiros Tempranos</h3>
                                                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', margin: '4px 0 16px 0' }}>Total de días con retiro temprano por estudiante</p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                        {studentMetrics.map(({ student, leaveCount }: any) => {
                                                            const leaveDaysRate = totalClassDays > 0 ? (leaveCount / totalClassDays) * 100 : 0;
                                                            return (
                                                                <div key={student.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} className="print-avoid-break">
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700' }}>
                                                                        <span>{formatName(student.name, student.profile)}</span>
                                                                        <span style={{ color: '#3b82f6' }}>{leaveCount} Retiros ({leaveDaysRate.toFixed(1)}%)</span>
                                                                    </div>
                                                                    <div style={{ height: '12px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                                                                        <div style={{ height: '100%', backgroundColor: '#3b82f6', width: `${leaveDaysRate}%` }} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* CHART 3: Horas */}
                                                <div className="print-avoid-break" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px', backgroundColor: '#ffffff' }}>
                                                    <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '4px', margin: 0 }}>Carga Horaria y Asistencia Efectiva</h3>
                                                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', margin: '4px 0 16px 0' }}>Horas Asistidas vs Perdidas</p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                        {studentMetrics.map(({ student, absentHours, lateHours, leaveHours, attendanceHoursRate }: any) => {
                                                            const lostHours = absentHours + lateHours + leaveHours;
                                                            const attendedHours = Math.max(0, totalScheduledHours - lostHours);
                                                            return (
                                                                <div key={student.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: '700' }}>
                                                                        <span>{formatName(student.name, student.profile)}</span>
                                                                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                                                                            <span style={{ color: '#059669' }}>Asistidas: {attendedHours.toFixed(1)} hs</span>
                                                                            <span style={{ color: '#ef4444' }}>Perdidas: {lostHours.toFixed(1)} hs</span>
                                                                            <span style={{ color: '#2563eb' }}>Efectiva: {attendanceHoursRate.toFixed(1)}%</span>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ height: '12px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                                                                        <div style={{ height: '100%', backgroundColor: '#10b981', width: `${attendanceHoursRate}%` }} />
                                                                        {absentHours > 0 && <div style={{ height: '100%', backgroundColor: '#ef4444', width: `${(absentHours / totalScheduledHours) * 100}%` }} />}
                                                                        {lateHours > 0 && <div style={{ height: '100%', backgroundColor: '#f59e0b', width: `${(lateHours / totalScheduledHours) * 100}%` }} />}
                                                                        {leaveHours > 0 && <div style={{ height: '100%', backgroundColor: '#3b82f6', width: `${(leaveHours / totalScheduledHours) * 100}%` }} />}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })() : attMode === "history" ? (() => {
                                    // MODE 4: HISTORIAL VIEW
                                    const studentsWithNovedades = selectedGroup.students?.filter((student: any) => {
                                        if (historyStudentFilter !== "all" && student.id !== historyStudentFilter) {
                                            return false;
                                        }
                                        const studentRecords = attendanceHistory.filter((rec: any) => 
                                            rec.courseId === attCourseId && 
                                            rec.userId === student.id && 
                                            rec.status !== "PRESENT"
                                        );
                                        if (studentRecords.length === 0) return false;

                                        if (searchQuery) {
                                            const q = searchQuery.toLowerCase();
                                            return student.name.toLowerCase().includes(q) || 
                                                   student.profile?.identificacion?.toLowerCase().includes(q);
                                        }
                                        return true;
                                    });

                                    const sortedStudentsWithNovedades = [...(studentsWithNovedades || [])].sort((a: any, b: any) => {
                                        const recordsA = attendanceHistory.filter((rec: any) => rec.courseId === attCourseId && rec.userId === a.id && rec.status !== "PRESENT").length;
                                        const recordsB = attendanceHistory.filter((rec: any) => rec.courseId === attCourseId && rec.userId === b.id && rec.status !== "PRESENT").length;
                                        return recordsB - recordsA;
                                    });

                                    const totalRecordsCount = attendanceHistory.filter((rec: any) => 
                                        rec.courseId === attCourseId && 
                                        rec.status !== "PRESENT" &&
                                        selectedGroup.students?.some((s: any) => s.id === rec.userId) &&
                                        (historyStudentFilter === "all" || rec.userId === historyStudentFilter)
                                    ).length;

                                    return (
                                        <div className="space-y-4">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 w-fit">
                                                        <History className="w-3.5 h-3.5 mr-1" />
                                                        Historial de Asistencia Agrupado por Estudiante
                                                    </Badge>
                                                    <span className="text-xs font-semibold text-muted-foreground">
                                                        {totalRecordsCount} Registros en total ({sortedStudentsWithNovedades.length} Estudiantes)
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" onClick={exportHistoryToExcel}>
                                                        <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Excel
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={exportHistoryToPDF}>
                                                        <FileDown className="w-4 h-4 mr-2 text-red-600" /> PDF
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border/40 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest shrink-0">Filtrar Estudiante:</span>
                                                    <Select value={historyStudentFilter} onValueChange={setHistoryStudentFilter}>
                                                        <SelectTrigger className="h-9 rounded-lg border-muted-foreground/20 font-semibold bg-background text-xs w-[250px]">
                                                            <SelectValue placeholder="Seleccionar Estudiante" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all" className="font-semibold text-xs">👥 Todos los estudiantes</SelectItem>
                                                            {selectedGroup.students?.map((s: any) => (
                                                                <SelectItem key={s.id} value={s.id} className="font-semibold text-xs">
                                                                    {formatName(s.name, s.profile)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {sortedStudentsWithNovedades.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 rounded-2xl border border-dashed bg-card shadow-sm">
                                                    <div className="p-3 bg-muted rounded-full text-muted-foreground">
                                                        <History className="w-8 h-8" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="font-black text-lg text-foreground">Sin registros históricos</h3>
                                                        <p className="text-sm text-muted-foreground max-w-sm">No se han encontrado registros de inasistencias o tardanzas para esta materia.</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div ref={historyRef} id="history-table-container" className="space-y-4 bg-background p-2 rounded-xl">
                                                    {sortedStudentsWithNovedades.map((student: any) => {
                                                        const studentRecords = attendanceHistory.filter((rec: any) => 
                                                            rec.courseId === attCourseId && 
                                                            rec.userId === student.id && 
                                                            rec.status !== "PRESENT"
                                                        );
                                                        const sortedRecs = [...studentRecords].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                                        const absentCount = studentRecords.filter(r => r.status === "ABSENT").length;
                                                        const lateCount = studentRecords.filter(r => r.status === "LATE").length;
                                                        const leaveEarlyCount = studentRecords.filter(r => r.status === "LEAVE_EARLY").length;

                                                        return (
                                                            <div key={student.id} className="print-avoid-break rounded-2xl border bg-card shadow-sm overflow-hidden hover:border-primary/20 transition-all duration-200">
                                                                {/* Student Header summary */}
                                                                <div className="bg-muted/30 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b">
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
                                                                            <AvatarImage src={student.image} />
                                                                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-black">
                                                                                {student.name?.substring(0, 2).toUpperCase()}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <div>
                                                                            <h4 className="font-bold text-sm text-foreground">
                                                                                {formatName(student.name, student.profile)}
                                                                            </h4>
                                                                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                                                                ID: {student.profile?.identificacion || "—"}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        {absentCount > 0 && (
                                                                            <Badge className="bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/60 font-extrabold shadow-none px-2.5 py-0.5 rounded-full text-xs">
                                                                                {absentCount} {absentCount === 1 ? "Falta" : "Faltas"}
                                                                            </Badge>
                                                                        )}
                                                                        {lateCount > 0 && (
                                                                            <Badge className="bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 font-extrabold shadow-none px-2.5 py-0.5 rounded-full text-xs">
                                                                                {lateCount} {lateCount === 1 ? "Llegada Tarde" : "Llegadas Tardes"}
                                                                            </Badge>
                                                                        )}
                                                                        {leaveEarlyCount > 0 && (
                                                                            <Badge className="bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 font-extrabold shadow-none px-2.5 py-0.5 rounded-full text-xs">
                                                                                {leaveEarlyCount} {leaveEarlyCount === 1 ? "Retiro" : "Retiros"}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Detail Records List inside Student card */}
                                                                <div className="overflow-x-auto">
                                                                    <Table>
                                                                        <TableHeader className="bg-muted/10">
                                                                            <TableRow className="hover:bg-transparent">
                                                                                <TableHead className="pl-6 w-[120px] text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha</TableHead>
                                                                                <TableHead className="w-[140px] text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Novedad</TableHead>
                                                                                <TableHead className="w-[160px] text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Detalle / Hora</TableHead>
                                                                                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Justificación</TableHead>
                                                                                <TableHead className="w-[120px] text-right pr-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Acción</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {sortedRecs.map((rec: any) => {
                                                                                const isAbsent = rec.status === "ABSENT";
                                                                                const isLate = rec.status === "LATE";
                                                                                const isLeaveEarly = rec.status === "LEAVE_EARLY";
                                                                                const formattedDate = format(new Date(rec.date), "dd/MM/yyyy");
                                                                                
                                                                                return (
                                                                                    <TableRow key={rec.id} className="hover:bg-muted/5 transition-colors">
                                                                                        <TableCell className="pl-6 py-3 font-semibold text-xs text-foreground/80">
                                                                                            {formattedDate}
                                                                                        </TableCell>
                                                                                        <TableCell className="text-center py-3">
                                                                                            <Badge variant="outline" className={`font-bold text-[10px] uppercase px-2 py-0.5 rounded-md ${
                                                                                                isAbsent 
                                                                                                    ? 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20' 
                                                                                                    : isLate
                                                                                                        ? 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20'
                                                                                                        : 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                                                                                            }`}>
                                                                                                {isAbsent ? "Falta" : isLate ? "Tarde" : "Retiro"}
                                                                                            </Badge>
                                                                                        </TableCell>
                                                                                        <TableCell className="text-center text-xs py-3 font-medium text-foreground/70">
                                                                                             {isLate && rec.arrivalTime ? (
                                                                                                 <span className="font-mono bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded text-[11px] border border-amber-500/20">
                                                                                                     {formatTime12h(rec.arrivalTime)}
                                                                                                 </span>
                                                                                             ) : isLeaveEarly && rec.departureTime ? (
                                                                                                 <span className="font-mono bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-[11px] border border-blue-500/20">
                                                                                                     {formatTime12h(rec.departureTime)}
                                                                                                 </span>
                                                                                             ) : (
                                                                                                 <span className="text-muted-foreground text-[11px]">Día completo</span>
                                                                                             )}
                                                                                        </TableCell>
                                                                                        <TableCell className="text-xs py-3 max-w-[300px]">
                                                                                            {rec.justification ? (
                                                                                                rec.justification.startsWith("http") ? (
                                                                                                    <a 
                                                                                                        href={rec.justification} 
                                                                                                        target="_blank" 
                                                                                                        rel="noopener noreferrer" 
                                                                                                        className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                                                                                                    >
                                                                                                        <FileText className="w-3 h-3" />
                                                                                                        Ver soporte
                                                                                                    </a>
                                                                                                ) : (
                                                                                                    <span className="text-muted-foreground italic truncate block" title={rec.justification}>
                                                                                                        {rec.justification}
                                                                                                    </span>
                                                                                                )
                                                                                            ) : (
                                                                                                <span className="text-muted-foreground/60 italic text-[11px]">Sin justificación</span>
                                                                                            )}
                                                                                        </TableCell>
                                                                                        <TableCell className="text-right pr-6 py-3">
                                                                                            <Button 
                                                                                                size="sm" 
                                                                                                variant="ghost" 
                                                                                                disabled={isSavingAtt}
                                                                                                onClick={() => {
                                                                                                    setAttendanceToDelete({
                                                                                                        studentId: student.id,
                                                                                                        studentName: formatName(student.name, student.profile),
                                                                                                        date: rec.date
                                                                                                    });
                                                                                                }}
                                                                                                className="h-7 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 font-bold"
                                                                                            >
                                                                                                Eliminar
                                                                                            </Button>
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                );
                                                                            })}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })() : (() => {
                                    // MODE 3: MATRIX / PLANILLA VIEW
                                    // Build the list of class days for the selected course
                                    const course = selectedGroup.courses?.find((c: any) => c.id === attCourseId);
                                    const scheduleDays: string[] = (course?.schedules || []).map((s: any) => s.dayOfWeek);
                                    const dayIndexMap: Record<string, number> = {
                                        SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
                                        THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
                                    };

                                    // Helpers for timezone-safe date management
                                    const toUTCDateStr = (date: Date) => {
                                        const y = date.getUTCFullYear();
                                        const m = String(date.getUTCMonth() + 1).padStart(2, "0");
                                        const d = String(date.getUTCDate()).padStart(2, "0");
                                        return `${y}-${m}-${d}`;
                                    };

                                    const toLocalDateStr = (date: Date) => {
                                        const y = date.getFullYear();
                                        const m = String(date.getMonth() + 1).padStart(2, "0");
                                        const d = String(date.getDate()).padStart(2, "0");
                                        return `${y}-${m}-${d}`;
                                    };

                                    // Fallback: use all group schedules if this course has none
                                    const effectiveScheduleDays: string[] = scheduleDays.length > 0
                                        ? scheduleDays
                                        : (selectedGroup.courses || []).flatMap((c: any) => (c.schedules || []).map((s: any) => s.dayOfWeek));

                                    // Derive start date: group.startDate > earliest attendance record > 3 months ago
                                    const attForCourse = attendanceHistory.filter((a: any) => a.courseId === attCourseId);
                                    const earliestAtt = attForCourse.length > 0
                                        ? new Date(Math.min(...attForCourse.map((a: any) => new Date(a.date).getTime())))
                                        : null;

                                    const threeMonthsAgo = new Date();
                                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

                                    const groupStart = selectedGroup.program?.startDate || selectedGroup.startDate;
                                    const startDate = groupStart
                                        ? new Date(groupStart)
                                        : (earliestAtt ?? threeMonthsAgo);

                                    const groupEnd = selectedGroup.program?.endDate || selectedGroup.endDate;
                                    const endDate = groupEnd
                                        ? new Date(Math.min(new Date(groupEnd).getTime(), Date.now()))
                                        : new Date();

                                    const classDays: Date[] = [];
                                    const cur = new Date(startDate);
                                    cur.setUTCHours(12, 0, 0, 0); // stable UTC noon to avoid shifting days
                                    const end = new Date(endDate);
                                    end.setUTCHours(12, 0, 0, 0);

                                    while (cur <= end) {
                                        const jsDay = cur.getUTCDay();
                                        const isClassDay = effectiveScheduleDays.some(d => dayIndexMap[d] === jsDay);
                                        if (isClassDay) classDays.push(new Date(cur));
                                        cur.setUTCDate(cur.getUTCDate() + 1);
                                    }

                                    // If still no scheduled days derived, build from actual attendance dates
                                    const finalDays: Date[] = classDays.length > 0
                                        ? classDays
                                        : Array.from(new Set(attForCourse.map((a: any) => toUTCDateStr(new Date(a.date)))))
                                            .sort()
                                            .map(ds => new Date(ds + "T12:00:00Z"));

                                    // Build a lookup: userId → date string → { status, justification, arrivalTime, departureTime }
                                    const lookup: Record<string, Record<string, { status: string; justification?: string; arrivalTime?: string; departureTime?: string }>> = {};
                                    attendanceHistory.filter((a: any) => a.courseId === attCourseId).forEach((a: any) => {
                                        if (!lookup[a.userId]) lookup[a.userId] = {};
                                        const ds = toUTCDateStr(new Date(a.date));
                                        const arrTime = a.arrivalTime 
                                            ? (typeof a.arrivalTime === 'string' ? a.arrivalTime : new Date(a.arrivalTime).toISOString().substring(11, 16)) 
                                            : undefined;
                                        const depTime = a.departureTime 
                                            ? (typeof a.departureTime === 'string' ? a.departureTime : new Date(a.departureTime).toISOString().substring(11, 16)) 
                                            : undefined;
                                        lookup[a.userId][ds] = {
                                            status: a.status,
                                            justification: a.justification || undefined,
                                            arrivalTime: arrTime,
                                            departureTime: depTime
                                        };
                                    });

                                    const statusCell = (record: { status: string; justification?: string } | undefined) => {
                                        if (!record || record.status === "PRESENT") return (
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">P</span>
                                        );
                                        if (record.justification) return (
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-black bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">E</span>
                                        );
                                        if (record.status === "LATE") return (
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-black bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">T</span>
                                        );
                                        if (record.status === "LEAVE_EARLY") return (
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-black bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">R</span>
                                        );
                                        if (record.status === "ABSENT") return (
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-black bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">F</span>
                                        );
                                        return (
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-black bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">E</span>
                                        );
                                    };

                                    // Filter days if selectedDayFilter is set
                                    const displayedDays = selectedDayFilter !== null
                                        ? finalDays.filter(d => d.getUTCDay() === selectedDayFilter)
                                        : finalDays;

                                    return (
                                        <div className="space-y-3">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1 mb-2">
                                                 <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 w-fit">
                                                    <LayoutList className="w-3.5 h-3.5 mr-1" />
                                                    Planilla de Asistencia General
                                                </Badge>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" onClick={exportMatrixToExcel}>
                                                        <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Excel
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={exportMatrixToPDF}>
                                                        <FileDown className="w-4 h-4 mr-2 text-red-600" /> PDF
                                                    </Button>
                                                </div>
                                            </div>
                                            {/* Legend */}
                                            <div ref={matrixRef} className="bg-background rounded-xl">
                                                <div className="flex flex-wrap items-center gap-3 px-1 mb-3">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest shrink-0">Leyenda:</span>
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-black bg-emerald-100 text-emerald-700">P</span> Presente
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-black bg-amber-100 text-amber-700">T</span> Tarde
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-black bg-red-100 text-red-700">F</span> Falta
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-black bg-blue-100 text-blue-700">E</span> Excusa
                                                    </span>

                                                    {/* Quick selection day filters */}
                                                    <div className="w-px h-5 bg-border mx-1 shrink-0" />
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest shrink-0">Filtrar Día:</span>
                                                    <div className="flex gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40 shrink-0">
                                                        {([
                                                            { value: null, label: "Todos" },
                                                            { value: 1, label: "Lun" },
                                                            { value: 2, label: "Mar" },
                                                            { value: 3, label: "Mié" },
                                                            { value: 4, label: "Jue" },
                                                            { value: 5, label: "Vie" },
                                                            { value: 6, label: "Sáb" },
                                                            { value: 0, label: "Dom" }
                                                        ]).map(({ value, label }) => {
                                                            const isSelected = selectedDayFilter === value;
                                                            const hasDays = value === null || finalDays.some(d => d.getUTCDay() === value);
                                                            if (!hasDays) return null;

                                                            return (
                                                                <button
                                                                    key={label}
                                                                    type="button"
                                                                    onClick={() => setSelectedDayFilter(value)}
                                                                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                                                        isSelected 
                                                                            ? "bg-background shadow-xs text-primary border border-border/40" 
                                                                            : "text-muted-foreground hover:text-foreground"
                                                                    }`}
                                                                >
                                                                    {label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    <span className="ml-auto text-xs text-muted-foreground shrink-0">{displayedDays.length} clases · {selectedGroup.students?.length || 0} estudiantes</span>
                                                </div>

                                                {displayedDays.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-xl text-muted-foreground">
                                                        <LayoutList className="w-10 h-10 mb-3 opacity-30" />
                                                        <p className="font-semibold">Sin clases registradas para este filtro</p>
                                                        <p className="text-sm mt-1">Selecciona otro día o restablece el filtro a "Todos"</p>
                                                    </div>
                                                ) : (
                                                    <TooltipProvider>
                                                        <div id="matrix-table-container" className="overflow-auto rounded-2xl border border-border/60 shadow-sm bg-background">
                                                        <table className="text-xs border-collapse min-w-max w-full">
                                                            <thead>
                                                                <tr className="print-avoid-break bg-muted/40 sticky top-0 z-10">
                                                                    <th className="sticky left-0 z-20 bg-muted text-left px-4 py-3 font-bold text-foreground min-w-[180px] border-b border-r border-border/60">
                                                                        Estudiante
                                                                    </th>
                                                                    {displayedDays.map(d => {
                                                                        const ds = toUTCDateStr(d);
                                                                        const isToday = ds === toLocalDateStr(new Date());
                                                                        return (
                                                                            <th key={ds} className={`px-1.5 py-3 text-center font-bold border-b border-border/40 min-w-[44px] ${isToday ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                                                                                <div>{["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][d.getUTCDay()]}</div>
                                                                                <div className={`text-[10px] font-mono mt-0.5 ${isToday ? "text-primary font-bold" : "text-muted-foreground/70"}`}>
                                                                                    {String(d.getUTCDate()).padStart(2,"0")}/{String(d.getUTCMonth()+1).padStart(2,"0")}
                                                                                </div>
                                                                            </th>
                                                                        );
                                                                    })}
                                                                    <th className="sticky right-0 z-20 bg-muted px-3 py-3 text-center font-bold text-muted-foreground border-b border-l border-border/60 min-w-[80px]">
                                                                        F / T / R
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(selectedGroup.students || []).map((s: any, i: number) => {
                                                                    const uLookup = lookup[s.id] || {};
                                                                    const absences = Object.values(uLookup).filter(v => v.status === "ABSENT" && !v.justification).length;
                                                                    const lates = Object.values(uLookup).filter(v => v.status === "LATE").length;
                                                                    const leaves = Object.values(uLookup).filter(v => v.status === "LEAVE_EARLY").length;
                                                                    return (
                                                                        <tr key={s.id} className={`print-avoid-break group/row transition-colors ${i % 2 === 0 ? "bg-background" : "bg-muted/10"} hover:bg-primary/5`}>
                                                                            <td className={`sticky left-0 z-10 px-4 py-2 font-semibold text-foreground border-r border-border/40 whitespace-nowrap transition-colors ${
                                                                                i % 2 === 0 ? "bg-background" : "bg-neutral-50 dark:bg-zinc-900"
                                                                            } group-hover/row:bg-muted`}>
                                                                                {formatName(s.name, s.profile)}
                                                                            </td>
                                                                            {displayedDays.map(d => {
                                                                                const ds = toUTCDateStr(d);
                                                                                const record = uLookup[ds];
                                                                                return (
                                                                                    <td key={ds} className="px-1.5 py-2 text-center border-border/20 border-b">
                                                                                        {(() => {
                                                                                            const cellRecord = record || { status: "PRESENT" };
                                                                                            return (
                                                                                                <Tooltip delayDuration={200}>
                                                                                                    <TooltipTrigger asChild>
                                                                                                        <div className="inline-flex items-center justify-center cursor-help">
                                                                                                            {statusCell(record)}
                                                                                                        </div>
                                                                                                    </TooltipTrigger>
                                                                                                    <TooltipContent side="top" className="p-2 font-semibold text-xs bg-popover text-popover-foreground border shadow-md rounded-lg max-w-[240px] break-words">
                                                                                                        <div className="space-y-1">
                                                                                                            <div className="font-bold border-b pb-0.5 mb-1">
                                                                                                                {cellRecord.status === "PRESENT" ? "Presente" :
                                                                                                                 cellRecord.status === "ABSENT" ? "Inasistencia" :
                                                                                                                 cellRecord.status === "LATE" ? "Llegada Tarde" :
                                                                                                                 cellRecord.status === "LEAVE_EARLY" ? "Retiro Temprano" : "Sin Registro"}
                                                                                                            </div>
                                                                                                            {cellRecord.arrivalTime && (
                                                                                                                <div><span className="opacity-70 font-medium">Ingreso:</span> {formatTime12h(cellRecord.arrivalTime)}</div>
                                                                                                            )}
                                                                                                            {cellRecord.departureTime && (
                                                                                                                <div><span className="opacity-70 font-medium">Salida:</span> {formatTime12h(cellRecord.departureTime)}</div>
                                                                                                            )}
                                                                                                            {cellRecord.justification && (
                                                                                                                <div className="mt-1 pt-1 border-t border-dashed"><span className="font-bold text-primary">Excusa:</span> {cellRecord.justification}</div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </TooltipContent>
                                                                                                </Tooltip>
                                                                                            );
                                                                                        })()}
                                                                                    </td>
                                                                                );
                                                                            })}
                                                                            <td className={`sticky right-0 z-10 px-3 py-2 text-center border-l border-border/40 border-b transition-colors ${
                                                                                i % 2 === 0 ? "bg-background" : "bg-neutral-50 dark:bg-zinc-900"
                                                                            } group-hover/row:bg-muted`}>
                                                                                <span className="font-black text-red-600">{absences}</span>
                                                                                <span className="text-muted-foreground mx-1">/</span>
                                                                                <span className="font-black text-amber-600">{lates}</span>
                                                                                <span className="text-muted-foreground mx-1">/</span>
                                                                                <span className="font-black text-blue-600">{leaves}</span>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </TooltipProvider>
                                            )}
                                            </div>
                                        </div>
                                    );
                                })()}

                            </TabsContent>

                            {/* TAB 3: REMARKS & HISTORY */}
                            <TabsContent value="remarks" className="m-0 space-y-8 outline-none">
                                {/* Omitted for brevity, kept exactly as before but optimized classes */}
                                {/* Create Remark Section */}
                                <div className="bg-primary/5 border border-primary/20 rounded-2xl sm:rounded-3xl p-4 sm:p-8 space-y-4 relative overflow-hidden">
                                    <ShieldAlert className="absolute right-0 top-0 w-64 h-64 text-primary/5 -translate-y-1/4 translate-x-1/4 pointer-events-none" />
                                    <div className="relative z-10">
                                        <h3 className="text-xl sm:text-2xl font-black text-foreground mb-2">Registrar Observación Disciplinaria / Académica</h3>
                                        <p className="text-xs text-muted-foreground mb-6">
                                            Ten en cuenta que todas las observaciones registradas pueden ser visualizadas y modificadas por todos los profesores.
                                        </p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tipo de Observación</Label>
                                                <Select value={remarkType} onValueChange={v => setRemarkType(v as any)}>
                                                    <SelectTrigger className="h-12 rounded-xl bg-background border-primary/20">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ATTENTION" className="text-red-600 font-bold">🔴 Llamado de Atención</SelectItem>
                                                        <SelectItem value="COMMENDATION" className="text-emerald-600 font-bold">🟢 Felicitación</SelectItem>
                                                        <SelectItem value="CITATION" className="text-blue-600 font-bold">🔵 Citación</SelectItem>
                                                        <SelectItem value="OTHER" className="text-gray-600 font-bold">⚪ Otra Observación</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Materia Asociada</Label>
                                                <Select value={remarkCourseId} onValueChange={setRemarkCourseId}>
                                                    <SelectTrigger className="h-12 rounded-xl bg-background border-primary/20">
                                                        <SelectValue placeholder="Seleccionar Materia" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {selectedGroup.courses?.map((c: any) => (
                                                            <SelectItem key={c.id} value={c.id} className="font-semibold">{c.title}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Template Selector Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-end">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Plantilla de Mensaje</Label>
                                                <Select value={selectedTemplateId} onValueChange={(val) => {
                                                    setSelectedTemplateId(val);
                                                    const template = remarkTemplates.find(t => t.id === val);
                                                    if (template) {
                                                        setRemarkTitle(template.title);
                                                        setRemarkDesc(template.description);
                                                    }
                                                }}>
                                                    <SelectTrigger className="h-12 rounded-xl bg-background border-primary/20">
                                                        <SelectValue placeholder="Seleccionar plantilla predefinida..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {filteredTemplates.map((t) => (
                                                            <SelectItem key={t.id} value={t.id} className="font-semibold">
                                                                {t.title}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    onClick={() => {
                                                        setModalFilterType(remarkType);
                                                        setManageTemplatesOpen(true);
                                                    }}
                                                    className="w-full h-12 rounded-xl border-primary/20 hover:bg-primary/5 text-primary font-bold flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    <ClipboardList className="w-4 h-4" /> Gestionar Plantillas
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-6">
                                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estudiantes a aplicar</Label>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button 
                                                            type="button" 
                                                            variant="outline"
                                                            className="flex h-12 w-full items-center justify-between rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm text-foreground font-medium hover:bg-background hover:text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/25 focus:ring-offset-0 transition-colors"
                                                        >
                                                            <span className="truncate">
                                                                {selectedStudents.length === 0 
                                                                    ? "Seleccionar estudiantes" 
                                                                    : selectedStudents.length === 1 
                                                                        ? "1 estudiante seleccionado" 
                                                                        : `${selectedStudents.length} estudiantes seleccionados`}
                                                            </span>
                                                            <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-[300px] max-h-[350px] overflow-y-auto p-2" align="start">
                                                        <div className="p-1.5 border-b mb-2 flex gap-1">
                                                            <Input 
                                                                placeholder="Buscar estudiante..." 
                                                                className="h-9 rounded-lg bg-muted/30 border-0 focus-visible:ring-1" 
                                                                value={remarkStudentSearch}
                                                                onChange={e => setRemarkStudentSearch(e.target.value)}
                                                            />
                                                            {remarkStudentSearch && (
                                                                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setRemarkStudentSearch("")}>
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-between px-2 mb-2">
                                                            <Button 
                                                                variant="ghost" 
                                                                type="button"
                                                                className="text-[11px] h-6 px-1.5 font-bold text-primary hover:bg-primary/10 cursor-pointer"
                                                                onClick={() => {
                                                                    const allIds = filteredStudentsForRemark.map((s: any) => s.id);
                                                                    setSelectedStudents(allIds);
                                                                }}
                                                            >
                                                                Todos
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                type="button"
                                                                className="text-[11px] h-6 px-1.5 font-bold text-muted-foreground hover:bg-muted cursor-pointer"
                                                                onClick={() => setSelectedStudents([])}
                                                            >
                                                                Ninguno
                                                            </Button>
                                                        </div>
                                                        <div className="space-y-1">
                                                            {filteredStudentsForRemark.length === 0 ? (
                                                                <p className="text-xs text-muted-foreground text-center py-4">No se encontraron estudiantes</p>
                                                            ) : (
                                                                filteredStudentsForRemark.map((s: any) => {
                                                                    const isChecked = selectedStudents.includes(s.id);
                                                                    return (
                                                                        <div 
                                                                            key={s.id} 
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                toggleStudentSelection(s.id);
                                                                            }}
                                                                            className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-primary/5 rounded-lg cursor-pointer transition-colors"
                                                                        >
                                                                            <Checkbox 
                                                                                checked={isChecked} 
                                                                                onCheckedChange={() => {}} // handled by onClick
                                                                                className="pointer-events-none"
                                                                            />
                                                                            <div className="text-left">
                                                                                <p className="text-xs font-bold text-foreground leading-none">{formatName(s.name, s.profile)}</p>
                                                                                <p className="text-[10px] text-muted-foreground mt-0.5">{s.profile?.identificacion || "S/D"}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                        {selectedStudents.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-6 max-h-[100px] overflow-y-auto p-2 bg-background/50 rounded-xl border border-primary/10">
                                                {selectedStudents.map(id => {
                                                    const student = selectedGroup.students?.find((s: any) => s.id === id);
                                                    if (!student) return null;
                                                    return (
                                                        <Badge key={id} variant="outline" className="text-xs py-1 px-2.5 font-bold bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 flex items-center gap-1.5 rounded-lg">
                                                            {formatName(student.name, student.profile)}
                                                            <button 
                                                                type="button" 
                                                                onClick={() => toggleStudentSelection(id)}
                                                                className="hover:bg-primary/20 p-0.5 rounded-full text-primary hover:text-primary transition-colors cursor-pointer"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        
                                        <div className="space-y-2 mb-6">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Título</Label>
                                            <Input className="h-12 rounded-xl bg-background border-primary/20" value={remarkTitle} onChange={e => setRemarkTitle(e.target.value)} placeholder="Ej. Excelente participación, Retraso constante..." />
                                        </div>
                                        
                                        <div className="space-y-2 mb-4">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descripción Detallada</Label>
                                            <Textarea className="min-h-[120px] rounded-xl bg-background border-primary/20 p-4" value={remarkDesc} onChange={e => setRemarkDesc(e.target.value)} placeholder="Describe el suceso o justificación de la observación..." />
                                        </div>

                                        {/* Settings Row: Switches Grid */}
                                        <div className="grid grid-cols-1 gap-4 mb-8 mt-6">
                                            <div className="flex items-center gap-3 bg-background/50 p-4 rounded-xl border border-primary/10 transition-colors hover:bg-background/80">
                                                <Switch 
                                                    id="send-email-remark"
                                                    checked={sendEmailOnSave}
                                                    onCheckedChange={setSendEmailOnSave}
                                                    className="shrink-0 cursor-pointer"
                                                />
                                                <Label htmlFor="send-email-remark" className="text-xs sm:text-sm font-bold text-foreground cursor-pointer select-none flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-primary shrink-0" />
                                                    <span>Enviar correo (abre cliente del sistema operativo al guardar)</span>
                                                </Label>
                                            </div>
                                        </div>

                                        {/* Action Buttons Row */}
                                        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mt-8 bg-background/50 p-4 rounded-xl border border-primary/10">
                                            <div className="text-sm font-semibold flex items-center justify-center lg:justify-start gap-2 w-full lg:w-auto">
                                                <Users className="w-5 h-5 text-primary shrink-0" />
                                                <span>Aplicará a <Badge className="text-sm px-3">{selectedStudents.length}</Badge> estudiantes seleccionados.</span>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                                <Button 
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleCopyToClipboard}
                                                    size="lg" 
                                                    className="rounded-xl px-5 h-12 font-bold w-full sm:w-auto border-primary/20 text-primary hover:bg-primary/5 gap-2 flex items-center justify-center cursor-pointer"
                                                >
                                                    <FileText className="w-4 h-4" /> Copiar Mensaje
                                                </Button>
                                                
                                                <Button 
                                                    type="button"
                                                    variant="outline"
                                                    disabled={selectedStudents.length === 0}
                                                    onClick={() => {
                                                        const selectedEmails = (selectedGroup.students || [])
                                                            .filter((s: any) => selectedStudents.includes(s.id) && s.email)
                                                            .map((s: any) => s.email)
                                                            .join(',');
                                                        if (selectedEmails) {
                                                            const subject = encodeURIComponent(remarkTitle || "Observación Académica/Disciplinaria");
                                                            const body = encodeURIComponent(getParsedDescription() || "");
                                                            window.location.href = `mailto:${selectedEmails}?subject=${subject}&body=${body}`;
                                                        } else {
                                                            toast.warning("No hay correos registrados para los estudiantes seleccionados.");
                                                        }
                                                    }}
                                                    size="lg" 
                                                    className="rounded-xl px-5 h-12 font-bold w-full sm:w-auto border-primary/20 text-primary hover:bg-primary/5 gap-2 flex items-center justify-center cursor-pointer"
                                                >
                                                    <Mail className="w-4 h-4" /> Enviar Correo
                                                </Button>
                                                
                                                <Button 
                                                    onClick={handleSaveRemarks} 
                                                    disabled={isSavingRemark || selectedStudents.length === 0} 
                                                    size="lg" 
                                                    className="rounded-xl px-8 h-12 font-bold w-full sm:w-auto cursor-pointer"
                                                >
                                                    Registrar Observación
                                                </Button>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                                {/* History Section */}
                                <div className="mt-8 border-t pt-8">
                                    <h3 className="font-bold text-2xl mb-6">Historial Reciente del Grupo</h3>
                                    {/* Remarks history - Single column, full width */}
                                    <div className="border border-border/50 rounded-xl sm:rounded-2xl bg-card p-4 sm:p-6 shadow-sm space-y-4 w-full">
                                        <h4 className="font-bold text-lg flex items-center gap-2 border-b pb-4">
                                            <MessageSquare className="w-5 h-5 text-primary" /> Últimas Observaciones
                                        </h4>
                                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                            {remarksByStudent.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-8">No hay observaciones registradas</p>
                                            ) : (
                                                remarksByStudent.map(({ student, remarks }) => (
                                                    <div key={student.id} className="border border-border/40 rounded-xl sm:rounded-2xl bg-muted/5 p-3.5 sm:p-5 space-y-4 text-left">
                                                        {/* Student Header */}
                                                        <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                                                             <Avatar className="h-9 w-9 border bg-background shrink-0">
                                                                 <AvatarImage src={student.image} />
                                                                 <AvatarFallback>{student.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                             </Avatar>
                                                             <div className="min-w-0 text-left">
                                                                 <p className="font-bold text-sm text-foreground truncate">{formatName(student.name, student.profile)}</p>
                                                                 <p className="text-[10px] text-muted-foreground font-mono">ID: {student.profile?.identificacion || "S/D"}</p>
                                                             </div>
                                                             <Badge variant="outline" className="ml-auto text-[10px] font-black bg-primary/10 text-primary border-primary/20">
                                                                 {remarks.length} {remarks.length === 1 ? "observación" : "observaciones"}
                                                             </Badge>
                                                        </div>
                                                        
                                                        {/* Remarks List for this student */}
                                                        <div className="space-y-3.5 pl-3 border-l-2 border-primary/20">
                                                            {remarks.map((rem: any) => (
                                                                <div key={rem.id} className="group/remark text-sm p-4 rounded-xl border border-border/40 bg-background hover:bg-muted/30 transition-colors relative">
                                                                    <div className="flex justify-between items-start mb-2.5 gap-2">
                                                                        <div className="flex flex-wrap gap-1.5 items-center">
                                                                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 font-bold ${
                                                                                rem.type === 'ATTENTION' ? 'text-red-600 bg-red-50 border-red-200' :
                                                                                rem.type === 'COMMENDATION' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                                                                                rem.type === 'CITATION' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                                                                                'text-gray-600 bg-gray-50 border-gray-200'
                                                                            }`}>
                                                                                {rem.type === 'ATTENTION' ? 'Llamado Atención' :
                                                                                 rem.type === 'COMMENDATION' ? 'Felicitación' :
                                                                                 rem.type === 'CITATION' ? 'Citación' : 'Otra'}
                                                                            </Badge>
                                                                            {rem.viewedAt ? (
                                                                                <Badge variant="outline" className="text-[9px] py-0 px-1 text-emerald-600 border-emerald-200 bg-emerald-50 gap-0.5" title={`Visto el ${format(new Date(rem.viewedAt), "dd/MM/yyyy HH:mm")}`}>
                                                                                    <Eye className="w-2.5 h-2.5" /> Visto
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge variant="outline" className="text-[9px] py-0 px-1 text-amber-600 border-amber-200 bg-amber-50 gap-0.5">
                                                                                    <EyeOff className="w-2.5 h-2.5" /> No visto
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted/65 px-1.5 py-0.5 rounded">{format(new Date(rem.date), "dd MMM yyyy")}</span>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="w-7 h-7 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-all opacity-0 group-hover/remark:opacity-100 cursor-pointer shrink-0"
                                                                                onClick={() => handleDeleteRemark(rem.id)}
                                                                                title="Retirar observación"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                    <p className="font-bold text-xs text-foreground mt-1">{rem.title}</p>
                                                                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{rem.description}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB: PLANES DE MEJORAMIENTO */}
                            <TabsContent value="improvement" className="m-0 space-y-6 outline-none">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-bold">Planes de Mejoramiento</h2>
                                        <p className="text-sm text-muted-foreground">Gestión y seguimiento de compromisos académicos de superación.</p>
                                    </div>
                                    <Button
                                        onClick={() => setImpPlanFormDialog({
                                            open: true,
                                            studentId: selectedGroup?.students?.[0]?.id || "",
                                            planNumber: "",
                                            teacherDocUrl: "",
                                            startDate: format(new Date(), "yyyy-MM-dd"),
                                            endDate: format(new Date(), "yyyy-MM-dd"),
                                            observations: "",
                                            planScore: "",
                                            finalGrade: "",
                                            evidenceUrl: "",
                                        })}
                                        className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Crear Plan de Mejoramiento
                                    </Button>
                                </div>

                                {/* Loading state */}
                                {groupPlansLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : groupPlans.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-16 border border-dashed rounded-2xl bg-muted/5 text-muted-foreground">
                                        <FileText className="w-12 h-12 mb-4 opacity-40" />
                                        <p className="font-semibold text-base">Sin Planes de Mejoramiento</p>
                                        <p className="text-sm text-center mt-1">No se registran planes de mejoramiento en este grupo. Crea el primero con el botón superior.</p>
                                    </div>
                                ) : (() => {
                                    // Group plans by student
                                    const byStudent: Record<string, { student: any; plans: any[] }> = {};
                                    for (const plan of groupPlans) {
                                        const sid = plan.student?.id || plan.studentId;
                                        if (!byStudent[sid]) byStudent[sid] = { student: plan.student, plans: [] };
                                        byStudent[sid].plans.push(plan);
                                    }
                                    return (
                                        <div className="space-y-6">
                                            {Object.values(byStudent).map(({ student, plans: sPlans }) => (
                                                <div key={student?.id} className="border border-border/60 rounded-2xl overflow-hidden">
                                                    {/* Student header */}
                                                    <div className="flex items-center gap-3 bg-muted/30 px-5 py-3 border-b border-border/60">
                                                        <GraduationCap className="w-5 h-5 text-primary shrink-0" />
                                                        <div>
                                                            <p className="font-semibold text-sm">{formatName(student?.name, student?.profile)}</p>
                                                            <p className="text-xs text-muted-foreground">{sPlans.length} plan{sPlans.length !== 1 ? "es" : ""} de mejoramiento</p>
                                                        </div>
                                                        <div className="ml-auto">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-xs h-8 gap-1"
                                                                onClick={() => setImpPlanFormDialog({
                                                                    open: true,
                                                                    studentId: student?.id || "",
                                                                    planNumber: "",
                                                                    teacherDocUrl: "",
                                                                    startDate: format(new Date(), "yyyy-MM-dd"),
                                                                    endDate: format(new Date(), "yyyy-MM-dd"),
                                                                    observations: "",
                                                                    planScore: "",
                                                                    finalGrade: "",
                                                                    evidenceUrl: "",
                                                                })}
                                                            >
                                                                <FileText className="w-3.5 h-3.5" />
                                                                Nuevo plan
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Plans for student — Stepper Cards */}
                                                    <div className="divide-y divide-border/40">
                                                        {sPlans.map((plan: any) => {
                                                            // ── Compute step completion ──
                                                            const step1Done = !!plan.teacherDocUrl;
                                                            const step2Done = !!plan.signedDocUrl;
                                                            const step3Done = !!plan.teacherSignedDocUrl;
                                                            const isPastEnd = new Date() > new Date(plan.endDate);
                                                            const step4Done = isPastEnd && (plan.planScore !== null || plan.finalGrade !== null || !!plan.evidenceUrl);

                                                            // ── Date progress bar ──
                                                            const nowMs = Date.now();
                                                            const startMs = new Date(plan.startDate).getTime();
                                                            const endMs = new Date(plan.endDate).getTime();
                                                            const datePct = Math.min(100, Math.max(0, Math.round(((nowMs - startMs) / (endMs - startMs)) * 100)));
                                                            const daysTotal = Math.max(1, Math.round((endMs - startMs) / 86400000));
                                                            const daysPassed = Math.max(0, Math.round((nowMs - startMs) / 86400000));

                                                            const steps = [
                                                                { label: "Plan creado", sub: "Docente", done: step1Done, active: !step1Done, locked: false },
                                                                { label: "Est. firma", sub: "Aprendiz", done: step2Done, active: step1Done && !step2Done, locked: false },
                                                                { label: "Doc. firma", sub: "Docente", done: step3Done, active: step2Done && !step3Done, locked: false },
                                                                { label: "Evaluación", sub: isPastEnd ? "Disponible" : "Al finalizar", done: !!step4Done, active: step3Done && isPastEnd && !step4Done, locked: !isPastEnd && !step4Done },
                                                            ];

                                                            return (
                                                                <div key={plan.id} className="p-5 hover:bg-muted/10 transition-colors space-y-4">
                                                                    {/* Plan title + actions row */}
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className="font-bold text-sm">Plan N° {plan.planNumber}</span>
                                                                                {plan.viewedAt ? (
                                                                                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-300 gap-0.5"><Eye className="w-3 h-3" />Visto</Badge>
                                                                                ) : (
                                                                                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-300 gap-0.5"><EyeOff className="w-3 h-3" />No visto</Badge>
                                                                                )}
                                                                                {plan.finalGrade !== null && plan.finalGrade !== undefined && (
                                                                                    <Badge className="text-[10px] bg-primary text-primary-foreground">Nota: {plan.finalGrade}</Badge>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                                                                {format(new Date(plan.startDate), "dd/MM/yyyy")} → {format(new Date(plan.endDate), "dd/MM/yyyy")}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" title="Enviar correo" onClick={() => handleImpEmail(plan)}><Mail className="w-3.5 h-3.5" /></Button>
                                                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setViewGroupPlanDetail(plan)}><Eye className="w-3 h-3" />Ver</Button>
                                                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setImpPlanFormDialog({ open: true, id: plan.id, studentId: plan.studentId, planNumber: plan.planNumber, teacherDocUrl: plan.teacherDocUrl || "", startDate: format(new Date(plan.startDate), "yyyy-MM-dd"), endDate: format(new Date(plan.endDate), "yyyy-MM-dd"), observations: plan.observations || "", planScore: plan.planScore !== null && plan.planScore !== undefined ? plan.planScore : "", finalGrade: plan.finalGrade !== null && plan.finalGrade !== undefined ? plan.finalGrade : "", evidenceUrl: plan.evidenceUrl || "" })}><FileText className="w-3 h-3" />Editar</Button>
                                                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => setImpDeleteConfirm(plan.id)}><Trash2 className="w-3 h-3" />Eliminar</Button>
                                                                        </div>
                                                                    </div>

                                                                    {/* ── Temporal progress bar ── */}
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                                                                            <span>Progreso temporal del plan</span>
                                                                            <span className={datePct >= 100 ? "text-red-500 font-bold" : "text-primary font-semibold"}>
                                                                                {datePct}% · {Math.min(daysPassed, daysTotal)}/{daysTotal} días
                                                                            </span>
                                                                        </div>
                                                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full rounded-full transition-all duration-500 ${datePct >= 100 ? "bg-red-500" : datePct >= 75 ? "bg-amber-500" : "bg-primary"}`}
                                                                                style={{ width: `${datePct}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* ── 4-Step Stepper ── */}
                                                                    <div className="relative grid grid-cols-4 gap-2">
                                                                        <div className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 bg-border z-0" />
                                                                        {steps.map((step, idx) => (
                                                                            <div key={idx} className="flex flex-col items-center gap-1.5 relative z-10">
                                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                                                                                    step.done
                                                                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                                                                        : step.locked
                                                                                            ? "bg-muted border-border text-muted-foreground"
                                                                                            : step.active
                                                                                                ? "bg-primary border-primary text-primary-foreground ring-2 ring-primary/30"
                                                                                                : "bg-background border-muted text-muted-foreground"
                                                                                }`}>
                                                                                    {step.done ? (
                                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                                    ) : step.locked ? (
                                                                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                                                                    ) : (
                                                                                        <span>{idx + 1}</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-center">
                                                                                    <p className={`text-[10px] font-semibold leading-tight ${step.done ? "text-emerald-600" : step.active ? "text-primary" : "text-muted-foreground"}`}>{step.label}</p>
                                                                                    <p className="text-[9px] text-muted-foreground">{step.sub}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    {/* ── Step 3 action: Teacher countersign prompt ── */}
                                                                    {step2Done && !step3Done && (
                                                                        <div className="flex items-center gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200 dark:border-blue-800 rounded-xl">
                                                                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                                                            <p className="text-xs text-blue-700 dark:text-blue-400 flex-1">El aprendiz ya firmó el plan. Ahora debes subir tu copia firmada.</p>
                                                                            <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1 shrink-0" onClick={() => setImpTeacherSignDialog({ planId: plan.id, url: "" })}>
                                                                                <FileText className="w-3 h-3" />Subir mi firma
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                    {step3Done && (
                                                                        <div className="flex items-center gap-2 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 rounded-xl">
                                                                            <a href={plan.teacherSignedDocUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 hover:underline font-semibold flex-1 truncate">
                                                                                ✓ Tu firma cargada — ver documento
                                                                            </a>
                                                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-700 shrink-0" title="Eliminar mi firma" onClick={() => handleImpDeleteTeacherSignedDoc(plan.id)}><Trash2 className="w-3 h-3" /></Button>
                                                                        </div>
                                                                    )}

                                                                    {/* ── Student signed doc link ── */}
                                                                    {step2Done && plan.signedDocUrl && (
                                                                        <div className="flex items-center gap-2 p-2.5 bg-muted/30 border border-border/60 rounded-xl">
                                                                            <a href={plan.signedDocUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-semibold flex-1 truncate">
                                                                                Firma aprendiz — ver documento
                                                                            </a>
                                                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700 shrink-0" title="Eliminar firma del aprendiz" onClick={() => handleImpDeleteSignedDoc(plan.id)}><Trash2 className="w-3 h-3" /></Button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}


                                {/* ── Create / Edit Plan Modal ── */}
                                <Dialog open={!!impPlanFormDialog?.open} onOpenChange={(o) => { if (!o) setImpPlanFormDialog(null); }}>
                                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>{impPlanFormDialog?.id ? "Editar" : "Crear"} Plan de Mejoramiento</DialogTitle>
                                            <DialogDescription>Gestiona el plan de mejoramiento académico para el aprendiz seleccionado.</DialogDescription>
                                        </DialogHeader>
                                        {impPlanFormDialog && (
                                            <form onSubmit={handleImpUpsert} className="space-y-4 pt-2">
                                                {/* Student selector — only show when creating */}
                                                {!impPlanFormDialog.id && (
                                                    <div className="space-y-1">
                                                        <Label htmlFor="imp-student">Aprendiz *</Label>
                                                        <Select
                                                            value={impPlanFormDialog.studentId}
                                                            onValueChange={(v) => setImpPlanFormDialog(prev => prev ? { ...prev, studentId: v } : prev)}
                                                        >
                                                            <SelectTrigger id="imp-student" className="w-full h-10">
                                                                <SelectValue placeholder="Seleccione un aprendiz..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {(selectedGroup?.students || []).map((s: any) => (
                                                                    <SelectItem key={s.id} value={s.id}>
                                                                        {formatName(s.name, s.profile)}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <Label htmlFor="imp-planNumber">Número de Plan *</Label>
                                                        <Input id="imp-planNumber" placeholder="Ej: 2026-001" value={impPlanFormDialog.planNumber} onChange={(e) => setImpPlanFormDialog(prev => prev ? { ...prev, planNumber: e.target.value } : prev)} required />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label htmlFor="imp-teacherDocUrl">Enlace Documento del Plan</Label>
                                                        <Input id="imp-teacherDocUrl" placeholder="https://..." value={impPlanFormDialog.teacherDocUrl} onChange={(e) => setImpPlanFormDialog(prev => prev ? { ...prev, teacherDocUrl: e.target.value } : prev)} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <Label htmlFor="imp-startDate">Fecha de Inicio *</Label>
                                                        <Input id="imp-startDate" type="date" value={impPlanFormDialog.startDate} onChange={(e) => setImpPlanFormDialog(prev => prev ? { ...prev, startDate: e.target.value } : prev)} required />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label htmlFor="imp-endDate">Fecha de Finalización *</Label>
                                                        <Input id="imp-endDate" type="date" value={impPlanFormDialog.endDate} onChange={(e) => setImpPlanFormDialog(prev => prev ? { ...prev, endDate: e.target.value } : prev)} required />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="imp-observations">Observaciones / Criterios de Evaluación</Label>
                                                    <Textarea id="imp-observations" placeholder="Descripción detallada del plan, actividades y criterios..." rows={4} value={impPlanFormDialog.observations} onChange={(e) => setImpPlanFormDialog(prev => prev ? { ...prev, observations: e.target.value } : prev)} />
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-1">
                                                        <Label htmlFor="imp-planScore">Calificación del Plan (0-5)</Label>
                                                        <Input id="imp-planScore" type="number" min={0} max={5} step={0.1} placeholder="—" value={impPlanFormDialog.planScore} onChange={(e) => setImpPlanFormDialog(prev => prev ? { ...prev, planScore: e.target.value === "" ? "" : parseFloat(e.target.value) } : prev)} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label htmlFor="imp-finalGrade">Nota Final (0-5)</Label>
                                                        <Input id="imp-finalGrade" type="number" min={0} max={5} step={0.1} placeholder="—" value={impPlanFormDialog.finalGrade} onChange={(e) => setImpPlanFormDialog(prev => prev ? { ...prev, finalGrade: e.target.value === "" ? "" : parseFloat(e.target.value) } : prev)} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label htmlFor="imp-evidenceUrl">Enlace Evidencias de Evaluación</Label>
                                                        <Input id="imp-evidenceUrl" placeholder="https://..." value={impPlanFormDialog.evidenceUrl} onChange={(e) => setImpPlanFormDialog(prev => prev ? { ...prev, evidenceUrl: e.target.value } : prev)} />
                                                    </div>
                                                </div>
                                                <DialogFooter className="pt-2">
                                                    <Button type="button" variant="outline" onClick={() => setImpPlanFormDialog(null)}>Cancelar</Button>
                                                    <Button type="submit">{impPlanFormDialog.id ? "Guardar Cambios" : "Crear Plan"}</Button>
                                                </DialogFooter>
                                            </form>
                                        )}
                                    </DialogContent>
                                </Dialog>

                                {/* ── View Plan Detail Modal ── */}
                                <Dialog open={!!viewGroupPlanDetail} onOpenChange={(o) => { if (!o) setViewGroupPlanDetail(null); }}>
                                    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Detalle — Plan N° {viewGroupPlanDetail?.planNumber}</DialogTitle>
                                        </DialogHeader>
                                        {viewGroupPlanDetail && (
                                            <div className="space-y-4 text-sm">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-medium text-muted-foreground">Aprendiz</p>
                                                        <p className="font-semibold">{formatName(viewGroupPlanDetail.student?.name, viewGroupPlanDetail.student?.profile)}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-medium text-muted-foreground">Docente</p>
                                                        <p className="font-semibold">{formatName(viewGroupPlanDetail.teacher?.name, viewGroupPlanDetail.teacher?.profile)}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-medium text-muted-foreground">Fecha Inicio</p>
                                                        <p>{format(new Date(viewGroupPlanDetail.startDate), "dd/MM/yyyy")}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-medium text-muted-foreground">Fecha Fin</p>
                                                        <p>{format(new Date(viewGroupPlanDetail.endDate), "dd/MM/yyyy")}</p>
                                                    </div>
                                                </div>
                                                {viewGroupPlanDetail.observations && (
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-medium text-muted-foreground">Observaciones</p>
                                                        <p className="text-sm whitespace-pre-line bg-muted/30 rounded-lg p-3">{viewGroupPlanDetail.observations}</p>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-3">
                                                    {viewGroupPlanDetail.teacherDocUrl && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground">Paso 1 — Documento del Plan</p>
                                                            <a href={viewGroupPlanDetail.teacherDocUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs break-all">{viewGroupPlanDetail.teacherDocUrl}</a>
                                                        </div>
                                                    )}
                                                    {viewGroupPlanDetail.signedDocUrl && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground">Paso 2 — Firma Aprendiz</p>
                                                            <a href={viewGroupPlanDetail.signedDocUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline text-xs break-all">{viewGroupPlanDetail.signedDocUrl}</a>
                                                        </div>
                                                    )}
                                                    {viewGroupPlanDetail.teacherSignedDocUrl && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground">Paso 3 — Firma Docente</p>
                                                            <a href={viewGroupPlanDetail.teacherSignedDocUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs break-all">{viewGroupPlanDetail.teacherSignedDocUrl}</a>
                                                        </div>
                                                    )}
                                                    {viewGroupPlanDetail.evidenceUrl && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground">Paso 4 — Evidencias de Evaluación</p>
                                                            <a href={viewGroupPlanDetail.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs break-all">{viewGroupPlanDetail.evidenceUrl}</a>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {viewGroupPlanDetail.planScore !== null && viewGroupPlanDetail.planScore !== undefined && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground">Calificación del Plan</p>
                                                            <p className="text-lg font-bold text-primary">{viewGroupPlanDetail.planScore}</p>
                                                        </div>
                                                    )}
                                                    {viewGroupPlanDetail.finalGrade !== null && viewGroupPlanDetail.finalGrade !== undefined && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground">Nota Final</p>
                                                            <p className="text-lg font-bold text-emerald-600">{viewGroupPlanDetail.finalGrade}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {viewGroupPlanDetail.viewedAt ? (
                                                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-300"><Eye className="w-3 h-3 mr-1" />Revisado por el aprendiz</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-300"><EyeOff className="w-3 h-3 mr-1" />No revisado aún</Badge>
                                                    )}
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setViewGroupPlanDetail(null)}>Cerrar</Button>
                                                    <Button variant="ghost" className="gap-1" onClick={() => { handleImpEmail(viewGroupPlanDetail); }}>
                                                        <Mail className="w-4 h-4" />Enviar Correo
                                                    </Button>
                                                </DialogFooter>
                                            </div>
                                        )}
                                    </DialogContent>
                                </Dialog>

                                {/* ── Teacher Countersign Modal (Step 3) ── */}
                                <Dialog open={!!impTeacherSignDialog} onOpenChange={(o) => { if (!o) setImpTeacherSignDialog(null); }}>
                                    <DialogContent className="max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" />Subir mi Firma — Paso 3</DialogTitle>
                                            <DialogDescription>Pega el enlace del documento del plan con tu firma (Google Drive, OneDrive, etc.).</DialogDescription>
                                        </DialogHeader>
                                        {impTeacherSignDialog && (
                                            <form onSubmit={handleImpTeacherSign} className="space-y-4 pt-2">
                                                <div className="space-y-1">
                                                    <Label htmlFor="teacher-sign-url">URL del Documento Firmado por el Docente *</Label>
                                                    <Input id="teacher-sign-url" type="url" required placeholder="https://drive.google.com/..." value={impTeacherSignDialog.url} onChange={(e) => setImpTeacherSignDialog(prev => prev ? { ...prev, url: e.target.value } : prev)} />
                                                </div>
                                                <DialogFooter>
                                                    <Button type="button" variant="outline" onClick={() => setImpTeacherSignDialog(null)}>Cancelar</Button>
                                                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Confirmar Firma</Button>
                                                </DialogFooter>
                                            </form>
                                        )}
                                    </DialogContent>
                                </Dialog>

                                {/* ── Delete Confirm ── */}
                                <AlertDialog open={!!impDeleteConfirm} onOpenChange={(o) => { if (!o) setImpDeleteConfirm(null); }}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Eliminar este plan?</AlertDialogTitle>
                                            <AlertDialogDescription>Esta acción no se puede deshacer. El plan de mejoramiento y todos sus datos serán eliminados permanentemente.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => impDeleteConfirm && handleImpDelete(impDeleteConfirm)}>Eliminar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TabsContent>
                        </div>
                    </Tabs>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-[600px]">
                        <Users className="w-20 h-20 mb-6 opacity-20" />
                        <h2 className="text-2xl font-bold text-foreground">Ningún Grupo Seleccionado</h2>
                        <p className="mt-2">Utiliza el selector en la parte superior para elegir un grupo.</p>
                    </div>
                )}
            </Card>

            

            {/* Template Management Dialog */}
            <Dialog open={manageTemplatesOpen} onOpenChange={setManageTemplatesOpen}>
                <DialogContent className="max-w-[95vw] w-full md:max-w-6xl h-[90vh] md:h-[85vh] flex flex-col rounded-2xl sm:rounded-3xl p-6 sm:p-8 overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
                            <ClipboardList className="w-6 h-6 text-primary" />
                            Gestionar Plantillas de Observaciones
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            Crea y edita plantillas de observaciones. Todos los profesores pueden visualizar y modificar estas plantillas. Están organizadas por tipo de observación.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 overflow-hidden">
                        {/* List of Templates */}
                        <div className="flex flex-col h-full overflow-hidden min-h-0">
                            <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3 shrink-0">Plantillas Activas</h4>
                            
                            {/* Filter Tabs */}
                            <div className="flex flex-wrap gap-1 mb-4 shrink-0 bg-muted/40 p-1 rounded-xl border border-border/40">
                                {[
                                    { value: "ALL", label: "Todas" },
                                    { value: "ATTENTION", label: "🔴 Llamados" },
                                    { value: "COMMENDATION", label: "🟢 Felicitaciones" },
                                    { value: "CITATION", label: "🔵 Citaciones" },
                                    { value: "OTHER", label: "⚪ Otras" }
                                ].map((tab) => (
                                    <button
                                        key={tab.value}
                                        type="button"
                                        onClick={() => setModalFilterType(tab.value as any)}
                                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center whitespace-nowrap ${
                                            modalFilterType === tab.value
                                                ? "bg-background text-foreground shadow-xs border border-border/10"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-grow overflow-y-auto pr-2 space-y-2.5 max-h-[30vh] md:max-h-none">
                                {remarkTemplates.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-8 bg-muted/20 rounded-xl border border-dashed">
                                        No hay plantillas creadas. Usa el formulario para crear la primera.
                                    </p>
                                ) : filteredModalTemplates.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-8 bg-muted/20 rounded-xl border border-dashed">
                                        No hay plantillas registradas en esta categoría.
                                    </p>
                                ) : (
                                    filteredModalTemplates.map((template) => (
                                        <div key={template.id} className="p-3.5 bg-muted/30 hover:bg-muted/50 rounded-xl border border-border/40 transition-colors flex flex-col gap-2 relative group/item">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                    <h5 className="font-bold text-xs text-foreground truncate max-w-[200px]">{template.title}</h5>
                                                    <div className="flex flex-wrap gap-1">
                                                        {template.type === "ATTENTION" && <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-red-50 text-red-700 border-red-200">Llamado de Atención</Badge>}
                                                        {template.type === "COMMENDATION" && <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">Felicitación</Badge>}
                                                        {template.type === "CITATION" && <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">Citación</Badge>}
                                                        {template.type === "OTHER" && <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-gray-50 text-gray-700 border-gray-200">Otra</Badge>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="w-7 h-7 hover:bg-primary/10 text-primary rounded-md cursor-pointer"
                                                        onClick={() => {
                                                            setTemplateEditId(template.id);
                                                            setTemplateTitle(template.title);
                                                            setTemplateDesc(template.description);
                                                            setTemplateType(template.type || "ATTENTION");
                                                        }}
                                                        title="Editar"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="w-7 h-7 hover:bg-red-50 text-red-600 rounded-md cursor-pointer"
                                                        onClick={() => {
                                                            requestConfirm(
                                                                "¿Eliminar plantilla?",
                                                                `¿Seguro de que deseas eliminar la plantilla "${template.title}"? Esta acción no se puede deshacer.`,
                                                                async () => {
                                                                    try {
                                                                        await deleteRemarkTemplateAction(template.id);
                                                                        toast.success("Plantilla eliminada correctamente");
                                                                        if (selectedTemplateId === template.id) {
                                                                            setSelectedTemplateId("");
                                                                        }
                                                                        fetchTemplates();
                                                                    } catch (err: any) {
                                                                        toast.error("Error al eliminar plantilla: " + err.message);
                                                                    }
                                                                }
                                                            );
                                                        }}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground line-clamp-4 whitespace-pre-wrap leading-relaxed">{template.description}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Create/Edit Form */}
                        <div className="flex flex-col h-full overflow-hidden min-h-0 border-t md:border-t-0 md:border-l md:pl-8 pt-4 md:pt-0">
                            <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3 shrink-0">
                                {templateEditId ? "Editar Plantilla" : "Nueva Plantilla"}
                            </h4>
                            <div className="flex-grow flex flex-col gap-4 min-h-0 overflow-y-auto md:overflow-visible">
                                <div className="space-y-1.5 shrink-0">
                                    <Label className="text-xs font-bold text-muted-foreground">Título de la plantilla</Label>
                                    <Input 
                                        placeholder="Ej. Tareas Pendientes" 
                                        value={templateTitle}
                                        onChange={(e) => setTemplateTitle(e.target.value)}
                                        className="h-11 rounded-lg bg-background"
                                    />
                                </div>
                                <div className="space-y-1.5 shrink-0">
                                    <Label className="text-xs font-bold text-muted-foreground">Categoría (Tipo de Observación)</Label>
                                    <Select value={templateType} onValueChange={(v) => setTemplateType(v as any)}>
                                        <SelectTrigger className="h-11 rounded-lg bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ATTENTION" className="text-red-600 font-bold">🔴 Llamado de Atención</SelectItem>
                                            <SelectItem value="COMMENDATION" className="text-emerald-600 font-bold">🟢 Felicitación</SelectItem>
                                            <SelectItem value="CITATION" className="text-blue-600 font-bold">🔵 Citación</SelectItem>
                                            <SelectItem value="OTHER" className="text-gray-600 font-bold">⚪ Otra Observación</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5 flex-grow flex flex-col min-h-0">
                                    <Label className="text-xs font-bold text-muted-foreground shrink-0">Descripción detallada</Label>
                                    <Textarea 
                                        placeholder="Ej. No ha presentado las últimas actividades del módulo ni asistió a la retroalimentación programada..." 
                                        value={templateDesc}
                                        onChange={(e) => setTemplateDesc(e.target.value)}
                                        className="flex-grow min-h-[120px] md:min-h-0 rounded-lg bg-background p-3 text-xs leading-relaxed resize-none"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end pt-2 shrink-0">
                                    {templateEditId && (
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            onClick={() => {
                                                setTemplateEditId(null);
                                                setTemplateTitle("");
                                                setTemplateDesc("");
                                                setTemplateType("ATTENTION");
                                            }}
                                            className="text-xs rounded-lg h-9 cursor-pointer"
                                        >
                                            Cancelar
                                        </Button>
                                    )}
                                    <Button 
                                        type="button"
                                        onClick={async () => {
                                            if (!templateTitle.trim() || !templateDesc.trim()) {
                                                toast.error("Por favor completa todos los campos");
                                                return;
                                            }
                                            setIsSavingTemplate(true);
                                            try {
                                                if (templateEditId) {
                                                    await updateRemarkTemplateAction(templateEditId, templateTitle, templateDesc, templateType);
                                                    toast.success("Plantilla actualizada correctamente");
                                                } else {
                                                    await createRemarkTemplateAction(templateTitle, templateDesc, templateType);
                                                    toast.success("Plantilla creada correctamente");
                                                }
                                                setTemplateEditId(null);
                                                setTemplateTitle("");
                                                setTemplateDesc("");
                                                setTemplateType("ATTENTION");
                                                fetchTemplates();
                                            } catch (err: any) {
                                                toast.error("Error al guardar la plantilla: " + err.message);
                                            } finally {
                                                setIsSavingTemplate(false);
                                            }
                                        }}
                                        disabled={isSavingTemplate}
                                        className="text-xs font-bold rounded-lg h-9 px-4 cursor-pointer"
                                    >
                                        {isSavingTemplate ? "Guardando..." : templateEditId ? "Actualizar" : "Crear"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Student Attendance Details Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <Clock className="h-5 w-5 text-primary" />
                            Historial de Asistencia
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Detalle de inasistencias y llegadas tarde de <strong>{detailStudent ? formatName(detailStudent.name, detailStudent.profile) : ""}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        {(() => {
                            if (!detailStudent) return null;
                            const studentHistory = attendanceHistory.filter(a => a.userId === detailStudent.id && a.status !== 'PRESENT');
                            const absencesList = studentHistory.filter(a => a.status === 'ABSENT');
                            const latesList = studentHistory.filter(a => a.status === 'LATE');

                            const renderRecordCard = (att: any) => {
                                const dateLabel = formatCalendarDate(att.date, "eeee, d 'de' MMMM 'de' yyyy");
                                const isAbsent = att.status === 'ABSENT';
                                const isJustified = !!(att.justification?.trim() || att.justificationUrl);
                                return (
                                    <div key={att.id} className="p-3 rounded-xl border border-border bg-card/50 flex flex-col gap-1.5 text-left">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-foreground capitalize">{dateLabel}</span>
                                            <div className="flex items-center gap-1.5">
                                                <Badge className={isJustified ? "bg-emerald-500 hover:bg-emerald-500 text-white text-[10px]" : "bg-red-500 hover:bg-red-500 text-white text-[10px]"}>
                                                    {isJustified ? "Justificado" : "No Justificado"}
                                                </Badge>
                                                <Badge variant="outline" className={isAbsent ? "bg-red-50 text-red-700 border-red-200 text-[10px]" : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"}>
                                                    {isAbsent ? "Falta" : "Tarde"}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                            <span className="font-semibold text-primary">Materia:</span> {att.course?.title || "N/A"}
                                        </div>
                                        {att.status === 'LATE' && att.arrivalTime && (
                                            <div className="text-[11px] text-muted-foreground">
                                                <span className="font-semibold text-amber-600">Hora Ingreso:</span> {format(new Date(att.arrivalTime), "HH:mm")}
                                            </div>
                                        )}
                                        <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-muted/50 mt-1 flex flex-col gap-1.5">
                                            <div>
                                                <span className="font-bold text-foreground">Justificación:</span>{" "}
                                                <span className="italic">{att.justification || "Sin justificación registrada."}</span>
                                            </div>
                                            {att.justificationUrl && (
                                                <div className="flex items-center gap-1 mt-0.5 border-t border-muted/30 pt-1.5">
                                                    <span className="font-bold text-foreground">Soporte:</span>
                                                    <a 
                                                        href={att.justificationUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-primary hover:underline font-semibold flex items-center gap-0.5 ml-1"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" /> Ver documento soporte
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            };

                            return (
                                <Tabs defaultValue="faltas" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/60 p-1 rounded-xl">
                                        <TabsTrigger value="faltas" className="rounded-lg text-xs font-bold py-1.5 data-[state=active]:bg-background">
                                            Faltas ({absencesList.length})
                                        </TabsTrigger>
                                        <TabsTrigger value="tardes" className="rounded-lg text-xs font-bold py-1.5 data-[state=active]:bg-background">
                                            Llegadas Tarde ({latesList.length})
                                        </TabsTrigger>
                                    </TabsList>
                                    
                                    <TabsContent value="faltas" className="outline-none m-0">
                                        <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1.5 custom-scrollbar">
                                            {absencesList.length === 0 ? (
                                                <div className="text-center py-8 text-sm text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed border-muted">
                                                    No hay inasistencias registradas.
                                                </div>
                                            ) : (
                                                absencesList.map(renderRecordCard)
                                            )}
                                        </div>
                                    </TabsContent>
                                    
                                    <TabsContent value="tardes" className="outline-none m-0">
                                        <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1.5 custom-scrollbar">
                                            {latesList.length === 0 ? (
                                                <div className="text-center py-8 text-sm text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed border-muted">
                                                    No hay llegadas tarde registradas.
                                                </div>
                                            ) : (
                                                latesList.map(renderRecordCard)
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            );
                        })()}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setDetailOpen(false)} className="w-full sm:w-auto">Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Student Analytics Dialog */}
            <Dialog open={!!selectedStudentForAnalytics} onOpenChange={(open) => !open && setSelectedStudentForAnalytics(null)}>
                <DialogContent className="!max-w-[100vw] sm:!max-w-[100vw] w-screen h-screen m-0 p-6 !rounded-none overflow-y-auto border-none bg-background flex flex-col">
                    {selectedStudentForAnalytics && (
                        <div className="space-y-6 flex-1 flex flex-col min-h-0">
                            <div className="flex justify-between items-center pb-4 border-b">
                                <div>
                                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                        <GraduationCap className="w-6 h-6 text-primary" /> Registro Académico
                                    </DialogTitle>
                                    <DialogDescription className="text-sm text-muted-foreground mt-1">
                                        Historial de {formatName(selectedStudentForAnalytics.name, selectedStudentForAnalytics.profile)}
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto min-h-0">
                                <StudentRecords studentId={selectedStudentForAnalytics.id} hideTables={false} hideDocumentation={true} />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Generic Confirmation Dialog */}
            <AlertDialog open={!!confirmConfig} onOpenChange={(open) => !open && setConfirmConfig(null)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmConfig?.title || "¿Estás seguro?"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmConfig?.description || "Esta acción no se puede deshacer."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmConfig(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={async () => {
                                if (confirmConfig?.onConfirm) {
                                    await confirmConfig.onConfirm();
                                }
                                setConfirmConfig(null);
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Unsaved Changes Warning Dialog */}
            <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Descartar cambios sin guardar?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tienes cambios en el registro de asistencia de la clase actual que no han sido guardados.
                            Si continúas, estos cambios se perderán definitivamente.
                            <br/><br/>
                            ¿Deseas descartar los cambios y continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 sm:space-x-2">
                        <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmPendingAction}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
                        >
                            Descartar y Continuar
                        </AlertDialogAction>
                        <AlertDialogAction
                            onClick={saveAndConfirmPendingAction}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        >
                            Guardar y Continuar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reset Password Confirmation Dialog */}
            <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Restablecer contraseña?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Estás a punto de restablecer la contraseña de 
                            {studentToResetPassword && ` "${formatName(studentToResetPassword.name, studentToResetPassword.profile)}" `} 
                            a su número de documento de identidad ({studentToResetPassword?.profile?.identificacion || 'No disponible'}).
                            <br/><br/>
                            ¿Estás seguro de que deseas continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleResetPassword}
                            disabled={isResetting}
                            className="bg-amber-600 text-white hover:bg-amber-700"
                        >
                            {isResetting ? "Restableciendo..." : "Restablecer Contraseña"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {mounted && isSequentialFullscreen && createPortal(
                <AnimatePresence>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-background flex flex-col h-screen w-screen overflow-hidden p-6 select-none"
                    >
                        {/* Header: Full Screen title & Close Button */}
                        <div className="flex items-center justify-between border-b pb-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 text-xs font-bold px-2.5 py-1">
                                    <Clock className="w-3.5 h-3.5 mr-1" />
                                    Sesión de Asistencia Activa
                                </Badge>
                                <span className="text-sm font-semibold text-muted-foreground">
                                    Materia: {selectedGroup.courses?.find((c: any) => c.id === attCourseId)?.title}
                                </span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={exitSequentialFullscreen}
                                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Main sequence content */}
                        {filteredStudents.length > 0 ? (() => {
                            const currentStudent = filteredStudents[seqIndex];
                            const rec = attRecords[currentStudent.id];
                            const isAbsent = rec?.status === "ABSENT";
                            const isLate = rec?.status === "LATE";
                            const isLeaveEarly = rec?.status === "LEAVE_EARLY";
                            const isPresent = rec?.status === "PRESENT";
                            
                            const studentHistory = attendanceHistory.filter(a => a.userId === currentStudent.id);
                            const absentCount = studentHistory.filter(a => a.status === 'ABSENT').length;
                            const lateCount = studentHistory.filter(a => a.status === 'LATE').length;
                            const leaveCount = studentHistory.filter(a => a.status === 'LEAVE_EARLY').length;

                            return (
                                <div className="flex-1 flex flex-col justify-between py-6 min-h-0">
                                    {/* Progress indicator */}
                                    <div className="w-full max-w-xl mx-auto shrink-0 space-y-2">
                                        <div className="flex justify-between text-xs font-bold text-muted-foreground">
                                            <span>PROGRESO DE LLAMADO</span>
                                            <span>{seqIndex + 1} de {filteredStudents.length} ({Math.round(((seqIndex + 1) / filteredStudents.length) * 100)}%)</span>
                                        </div>
                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary transition-all duration-300"
                                                style={{ width: `${((seqIndex + 1) / filteredStudents.length) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Center Block: Avatar, Name, History statistics - Fits perfectly without card */}
                                    <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-4 max-w-2xl mx-auto w-full">
                                        <Avatar className="w-40 h-40 border-4 border-primary/20 shadow-md mb-6 shrink-0">
                                            <AvatarImage src={currentStudent.image} />
                                            <AvatarFallback className="text-5xl bg-primary/10 text-primary font-black">
                                                {currentStudent.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="text-center space-y-2 shrink-0">
                                            <h2 className="text-4xl font-black text-foreground tracking-tight max-w-xl mx-auto break-words leading-none">
                                                {formatName(currentStudent.name, currentStudent.profile)}
                                            </h2>
                                        </div>

                                        {/* Quick badge indicating if attendance is marked for this session */}
                                         <div className="h-10 mt-4 shrink-0">
                                             {rec && (
                                                 <Badge className={`text-xs font-black px-4 py-1.5 shadow-sm ${
                                                     isAbsent 
                                                         ? 'bg-red-500 hover:bg-red-600 text-white' 
                                                         : isLate 
                                                             ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                                             : isLeaveEarly
                                                                 ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                                                 : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                 }`}>
                                                     {isAbsent ? 'Falta Marcada' : isLate ? 'Llegada Tarde Marcada' : isLeaveEarly ? 'Retiro Temprano Marcado' : 'Presente Marcado'}
                                                 </Badge>
                                             )}
                                         </div>

                                         {/* Statistics block */}
                                         <div className="mt-6 p-4 rounded-2xl bg-muted/30 border border-border/60 w-full max-w-sm flex justify-around shrink-0">
                                             <div className="text-center">
                                                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Inasistencias</p>
                                                 <p className="text-3xl font-black text-red-600 dark:text-red-400">{absentCount}</p>
                                             </div>
                                             <div className="w-px bg-border/60" />
                                             <div className="text-center">
                                                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Retrasos</p>
                                                 <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{lateCount}</p>
                                             </div>
                                             <div className="w-px bg-border/60" />
                                             <div className="text-center">
                                                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Retiros</p>
                                                 <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{leaveCount}</p>
                                             </div>
                                         </div>

                                         {/* Time entry selectors nested under avatar */}
                                        <AnimatePresence>
                                            {isLate && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="mt-6 w-full max-w-xs shrink-0 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex flex-col items-center gap-2"
                                                >
                                                    <Label className="text-xs font-bold text-amber-700 dark:text-amber-400">AJUSTAR HORA DE INGRESO</Label>
                                                    <Input 
                                                        type="time" 
                                                        disabled={isSavingAtt}
                                                        className="h-10 w-36 text-center text-base font-bold bg-background border-amber-300 dark:border-amber-900"
                                                        value={rec?.arrivalTime || ""}
                                                        onChange={e => updateLateTime(currentStudent.id, e.target.value)} 
                                                    />
                                                    {rec?.arrivalTime && (() => {
                                                         const daysOfWeekEng = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
                                                         const dayIndex = new Date(attDate + "T12:00:00").getDay();
                                                         const dayOfWeekName = daysOfWeekEng[dayIndex];
                                                         const course = selectedGroup.courses?.find((c: any) => c.id === attCourseId);
                                                         const scheduleForDay = course?.schedules?.find((s: any) => s.dayOfWeek === dayOfWeekName);
                                                         const startTimeStr = scheduleForDay?.startTime || selectedGroup.startTime || "06:00";
                                                         const lostHrs = calculateHoursDiff(startTimeStr, rec.arrivalTime);
                                                         return lostHrs > 0 ? (
                                                             <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                                                                 Horas perdidas: {lostHrs.toFixed(2)} hs
                                                             </p>
                                                         ) : null;
                                                     })()}
                                                </motion.div>
                                            )}
                                            {isLeaveEarly && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="mt-6 w-full max-w-xs shrink-0 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex flex-col items-center gap-2"
                                                >
                                                    <Label className="text-xs font-bold text-blue-700 dark:text-blue-400">HORA DE RETIRO</Label>
                                                    <Input 
                                                        type="time" 
                                                        disabled={isSavingAtt}
                                                        className="h-10 w-36 text-center text-base font-bold bg-background border-blue-300 dark:border-blue-900"
                                                        value={rec?.departureTime || ""}
                                                        onChange={e => updateLeaveTime(currentStudent.id, e.target.value)} 
                                                    />
                                                    {rec?.departureTime && (() => {
                                                         const daysOfWeekEng = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
                                                         const dayIndex = new Date(attDate + "T12:00:00").getDay();
                                                         const dayOfWeekName = daysOfWeekEng[dayIndex];
                                                         const course = selectedGroup.courses?.find((c: any) => c.id === attCourseId);
                                                         const scheduleForDay = course?.schedules?.find((s: any) => s.dayOfWeek === dayOfWeekName);
                                                         const endTimeStr = scheduleForDay?.endTime || selectedGroup.endTime || "12:00";
                                                         const lostHrs = calculateHoursDiff(rec.departureTime, endTimeStr);
                                                         return lostHrs > 0 ? (
                                                             <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                                                                 Horas perdidas: {lostHrs.toFixed(2)} hs
                                                             </p>
                                                         ) : null;
                                                     })()}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Action Buttons: Giant controls for easy click/touch */}
                                     <div className="shrink-0 w-full max-w-xl mx-auto space-y-4">
                                         <div className="flex gap-4">
                                             <Button 
                                                 size="lg" 
                                                 variant="outline" 
                                                 disabled={isSavingAtt}
                                                 className={`flex-1 h-20 rounded-2xl font-black text-lg transition-all border-2 ${
                                                     isAbsent 
                                                         ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-md' 
                                                         : 'border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20'
                                                 }`}
                                                 onClick={() => { 
                                                     setStudentAttendance(currentStudent.id, isAbsent ? "UNMARKED" : "ABSENT"); 
                                                     if (!isAbsent) {
                                                         setTimeout(nextSeqStudent, 300); 
                                                     }
                                                 }}
                                             >
                                                 <UserX className="w-6 h-6 mr-2" /> Ausente
                                             </Button>

                                             <Button 
                                                 size="lg" 
                                                 disabled={isSavingAtt}
                                                 className={`flex-1 h-20 rounded-2xl font-black text-lg text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                                                     isPresent 
                                                         ? 'bg-emerald-700 hover:bg-emerald-800' 
                                                         : 'bg-emerald-600 hover:bg-emerald-700'
                                                 }`}
                                                 onClick={() => { 
                                                     setStudentAttendance(currentStudent.id, "PRESENT"); 
                                                     nextSeqStudent(); 
                                                 }}
                                             >
                                                 <UserCheck className="w-6 h-6" /> Presente
                                             </Button>
                                         </div>

                                        {/* Secondary navigation */}
                                        <div className="flex justify-between items-center pt-2 text-muted-foreground">
                                            <Button 
                                                variant="ghost" 
                                                disabled={seqIndex === 0 || isSavingAtt} 
                                                onClick={prevSeqStudent} 
                                                className="font-bold text-xs"
                                            >
                                                <ArrowLeft className="w-4 h-4 mr-1.5" /> ANTERIOR
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                disabled={seqIndex === filteredStudents.length - 1 || isSavingAtt} 
                                                onClick={nextSeqStudent} 
                                                className="font-bold text-xs"
                                            >
                                                SALTAR <ArrowRight className="w-4 h-4 ml-1.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                                <Users className="w-16 h-16 mb-4 opacity-40" />
                                <p className="text-lg font-bold">No hay estudiantes en el grupo para llamar asistencia</p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {isRouletteOpen && mounted && createPortal(
                <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col p-6 overflow-hidden animate-in fade-in duration-200">
                    {/* Fullscreen Header */}
                    <div className="flex items-center justify-between border-b pb-4 mb-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                                <Dices className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-foreground">Ruleta de Participación y Notas</h2>
                                <p className="text-xs text-muted-foreground">Selecciona aleatoriamente estudiantes del grupo {selectedGroup.name}</p>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                            onClick={() => setIsRouletteOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    
                    {/* Roulette Content */}
                    <div className="flex-1 overflow-auto">
                        <Roulette 
                            students={selectedGroup.students?.map((s: any) => ({ user: s })) || []} 
                            courseId={selectedGroup.id} 
                        />
                    </div>
                </div>,
                document.body
            )}

            {isGroupGeneratorOpen && mounted && createPortal(
                <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col p-6 overflow-hidden animate-in fade-in duration-200">
                    {/* Fullscreen Header */}
                    <div className="flex items-center justify-between border-b pb-4 mb-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                                <Users className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-foreground">Creador de Grupos de Trabajo</h2>
                                <p className="text-xs text-muted-foreground">Genera grupos automáticos o arrastra estudiantes manualmente para organizarlos</p>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                            onClick={() => setIsGroupGeneratorOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    
                    {/* Generator Content */}
                    <div className="flex-1 overflow-auto">
                        <GroupGenerator 
                            students={selectedGroup.students?.map((s: any) => ({ user: s })) || []} 
                        />
                    </div>
                </div>,
                document.body
            )}

            <AlertDialog open={!!attendanceToDelete} onOpenChange={(open) => { if (!open) setAttendanceToDelete(null); }}>
                <AlertDialogContent className="rounded-xl border-primary/20 bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-black text-foreground">¿Confirmar eliminación?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground">
                            ¿Estás seguro de que deseas eliminar este registro de inasistencia/tardanza para <strong className="text-foreground">{attendanceToDelete?.studentName}</strong>? El estudiante será marcado como presente en esa fecha.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-lg font-semibold cursor-pointer">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={async () => {
                                if (!attendanceToDelete) return;
                                const { studentId, date } = attendanceToDelete;
                                setAttendanceToDelete(null);
                                
                                const toastId = toast.loading("Eliminando novedad...");
                                setIsSavingAtt(true);
                                try {
                                    const res = await saveSingleAttendanceAction(
                                        attCourseId,
                                        studentId,
                                        date,
                                        "PRESENT"
                                    );
                                    if (res.success) {
                                        toast.success("Novedad eliminada (marcado Presente)", { id: toastId });
                                        loadHistory(selectedGroup!.id);
                                    } else {
                                        toast.error("Error: " + res.error, { id: toastId });
                                    }
                                } catch (e) {
                                    toast.error("Error de conexión", { id: toastId });
                                } finally {
                                    setIsSavingAtt(false);
                                }
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg font-bold cursor-pointer"
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={markAllConfirmOpen} onOpenChange={setMarkAllConfirmOpen}>
                <AlertDialogContent className="rounded-xl border-primary/20 bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-black text-foreground">¿Marcar todos como Presentes?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground">
                            ¿Estás seguro de que deseas marcar a todos los estudiantes de este grupo como PRESENTES? Esto sobrescribirá y cambiará el estado de asistencia actual de todos los alumnos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-lg font-semibold cursor-pointer">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={async () => {
                                setMarkAllConfirmOpen(false);
                                await executeMarkAllPresent();
                            }}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
