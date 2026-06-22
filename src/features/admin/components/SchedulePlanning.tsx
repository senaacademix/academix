"use client";
import { exportScheduleToExcel } from "../utils/exportScheduleExcel";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar, Clock, Trash2, Search, Users,
    CheckCircle2, AlertCircle, GraduationCap, Building,
    ChevronRight, Save, RotateCcw, Sparkles,
    Code, Database, Binary, MessageSquare,
    LayoutGrid, ShieldCheck, Cloud, Rocket,
    BookOpen, Terminal, User, UserCog,
    UserCheck, Brain, Wrench, Lightbulb, NotebookTabs,
    Sun, Moon, Globe, Lock, ZoomIn, ZoomOut,
    PanelLeft, PanelRight, CalendarDays, BarChart3, Monitor
} from "lucide-react";
import { toast } from "sonner";
import { DayOfWeek } from "@/generated/prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TeacherOverviewDialog } from "@/features/admin/components/TeacherOverviewDialog";
import { EnvOverviewDialog } from "@/features/admin/components/EnvOverviewDialog";
import { PeriodOverviewDialog } from "@/features/admin/components/PeriodOverviewDialog";
import { ScheduleEventDialog } from "./ScheduleEventDialog";
import { ScheduleAnalyticsDialog } from "./ScheduleAnalyticsDialog";
import { ScheduleSettingsDialog } from "./ScheduleSettingsDialog";
import { ScheduleToolbars } from "./ScheduleToolbars";
import {
    scheduleGroupCourseAction,
    deleteGroupCourseAction,
    getQualifiedTeachersAction,
    updateGroupCourseScheduleAction,
    updateGroupEnvironmentAction,
    updateGroupPeriodAction
} from "@/features/admin/actions/academicActions";
import { updateSettingsAction } from "@/app/actions/settings";
import { Switch } from "@/components/ui/switch";

// ─── Days ─────────────────────────────────────────────────────────────────────
const DAYS: { value: DayOfWeek; short: string }[] = [
    { value: "MONDAY",    short: "LUN" },
    { value: "TUESDAY",   short: "MAR" },
    { value: "WEDNESDAY", short: "MIÉ" },
    { value: "THURSDAY",  short: "JUE" },
    { value: "FRIDAY",    short: "VIE" },
    { value: "SATURDAY",  short: "SÁB" },
    { value: "SUNDAY",    short: "DOM" },
];
const DAYS_FULL: { value: DayOfWeek; label: string }[] = [
    { value: "MONDAY",    label: "Lunes" },
    { value: "TUESDAY",   label: "Martes" },
    { value: "WEDNESDAY", label: "Miércoles" },
    { value: "THURSDAY",  label: "Jueves" },
    { value: "FRIDAY",    label: "Viernes" },
    { value: "SATURDAY",  label: "Sábado" },
    { value: "SUNDAY",    label: "Domingo" },
];
const DAYS_ES: Record<DayOfWeek, string> = {
    MONDAY:"Lunes",TUESDAY:"Martes",WEDNESDAY:"Miércoles",
    THURSDAY:"Jueves",FRIDAY:"Viernes",SATURDAY:"Sábado",SUNDAY:"Domingo"
};

const SNAP = 15; // minutes

// ─── Time utils ───────────────────────────────────────────────────────────────
const toMin = (t: string) => { const [h,m] = t.split(":").map(Number); return h*60+m; };
const toStr = (n: number) => `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
const snapMin = (n: number) => Math.round(n / SNAP) * SNAP;
const clamp   = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const toFormat12h = (t24: string) => {
    const [h, m] = t24.split(":").map(Number);
    const ap = h >= 12 ? "p.m." : "a.m.";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
};

// Convert minutes relative to group start → percentage string
const toPct = (min: number, gS: number, gE: number) =>
    `${clamp(((min - gS) / (gE - gS)) * 100, 0, 100)}%`;

// ─── Colors ──────────────────────────────────────────────────────────────────
const hue = (s: string) => { let h=0; for(let i=0;i<s.length;i++) h=s.charCodeAt(i)+((h<<5)-h); return Math.abs(h)%360; };
const gc  = (id: string)    => ({ solid:`hsl(${hue(id)},70%,44%)`, bg:`hsl(${hue(id)},75%,94%)` });
const cc  = (title: string) => ({ solid: `hsl(${hue(title)},75%,48%)`, bg:`hsl(${hue(title)},78%,94%)`, text:`hsl(${hue(title)},78%,20%)`, border:`hsl(${hue(title)},65%,80%)` });
const tc  = (name: string)  => ({ bg:`hsl(${hue(name)},65%,55%)`, text:`#ffffff` });

// ─── Time-of-day gradient ────────────────────────────────────────────────────
// Anchors: 6am=blue, 12pm=yellow, 6pm=coffee/brown
const TIME_PALETTE: [number, string][] = [
    [   0, "#0f172a"],  // midnight      — dark slate
    [ 300, "#1e3a5f"],  // 5am           — deep navy
    [ 360, "#1d6fa4"],  // 6am           — BLUE (mañana)
    [ 480, "#2196f3"],  // 8am           — sky blue
    [ 600, "#42a5f5"],  // 10am          — light blue
    [ 720, "#f59e0b"],  // 12pm noon     — AMARILLO (tarde)
    [ 840, "#f97316"],  // 2pm           — warm orange
    [ 960, "#ea580c"],  // 4pm           — deep orange
    [1080, "#92400e"],  // 6pm           — CAFÉ/BROWN (noche)
    [1200, "#78350f"],  // 8pm           — dark brown
    [1320, "#3b1f0c"],  // 10pm          — very dark brown
    [1440, "#0f172a"],  // midnight      — dark slate
];

const lerpHex = (a: string, b: string, t: number): string => {
    const parse = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const [ar,ag,ab] = parse(a); const [br,bg,bb] = parse(b);
    const r = Math.round(ar + (br-ar)*t), g = Math.round(ag + (bg-ag)*t), bv = Math.round(ab + (bb-ab)*t);
    return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${bv.toString(16).padStart(2,"0")}`;
};

const minuteToColor = (min: number): string => {
    const m = ((min % 1440) + 1440) % 1440;
    for (let i = 0; i < TIME_PALETTE.length - 1; i++) {
        const [t0, c0] = TIME_PALETTE[i]; const [t1, c1] = TIME_PALETTE[i+1];
        if (m >= t0 && m <= t1) return lerpHex(c0, c1, (m - t0) / (t1 - t0));
    }
    return TIME_PALETTE[0][1];
};

const getTimeGradient = (startMin: number, endMin: number): string => {
    // collect all palette break-points within range for a precise gradient
    const stops: string[] = [];
    stops.push(`${minuteToColor(startMin)} 0%`);
    for (const [t, c] of TIME_PALETTE) {
        if (t > startMin && t < endMin) {
            const pct = ((t - startMin) / (endMin - startMin) * 100).toFixed(1);
            stops.push(`${c} ${pct}%`);
        }
    }
    stops.push(`${minuteToColor(endMin)} 100%`);
    return `linear-gradient(to bottom, ${stops.join(", ")})`;
};

import * as LucideIcons from "lucide-react";

const getIconByName = (name: string | null | undefined, Fallback: any) => {
    if (!name) return Fallback;
    const Icon = (LucideIcons as any)[name];
    return Icon || Fallback;
};

const getCourseIcon = (title: string, iconStr?: string | null) => {
    if (iconStr) return getIconByName(iconStr, NotebookTabs);
    const t = title.toLowerCase().trim();
    if (t.includes("programación") || t.includes("código") || t.includes("programacion")) {
        if (t.includes("introducción") || t.includes("introduccion")) return Terminal;
        return Code;
    }
    if (t.includes("datos") || t.includes("database") || t.includes("sql") || t.includes("nosql")) {
        return Database;
    }
    if (t.includes("matemática") || t.includes("matematica") || t.includes("cálculo") || t.includes("calculo") || t.includes("álgebra") || t.includes("algebra")) {
        return Binary;
    }
    if (t.includes("comunicación") || t.includes("comunicacion") || t.includes("ética") || t.includes("etica") || t.includes("inglés") || t.includes("ingles")) {
        if (t.includes("comunicación") || t.includes("comunicacion")) return MessageSquare;
        return BookOpen;
    }
    if (t.includes("arquitectura") || t.includes("ingeniería") || t.includes("ingenieria") || t.includes("diseño") || t.includes("metodología") || t.includes("metodologia") || t.includes("scrum")) {
        return LayoutGrid;
    }
    if (t.includes("pruebas") || t.includes("calidad") || t.includes("qa") || t.includes("seguridad") || t.includes("ciberseguridad")) {
        return ShieldCheck;
    }
    if (t.includes("despliegue") || t.includes("devops") || t.includes("nube") || t.includes("cloud") || t.includes("docker")) {
        return Cloud;
    }
    if (t.includes("proyecto") || t.includes("grado") || t.includes("tesis") || t.includes("innovación") || t.includes("innovacion")) {
        return Rocket;
    }
    return NotebookTabs; // Default course icon
};

const getTeacherIcon = (nameOrEmail: string | null, iconStr?: string | null) => {
    if (iconStr) return getIconByName(iconStr, GraduationCap);
    if (!nameOrEmail) return GraduationCap;
    const n = nameOrEmail.toLowerCase().trim();
    if (n.includes("carlos") || n.includes("teacher1")) return UserCheck; // Carlos Mendoza
    if (n.includes("ana") || n.includes("teacher2")) return User; // Ana Rojas
    if (n.includes("luis") || n.includes("teacher3")) return Brain; // Luis Gómez
    if (n.includes("diana") || n.includes("teacher4")) return UserCog; // Diana Silva
    if (n.includes("jorge") || n.includes("teacher5")) return Wrench; // Jorge Castro
    if (n.includes("claudia") || n.includes("teacher6")) return Lightbulb; // Claudia Ortiz
    return GraduationCap; // Default teacher icon
};
const getAcronym = (title: string) => {
    const ignore = new Set(['a', 'ante', 'bajo', 'cabe', 'con', 'contra', 'de', 'desde', 'en', 'entre', 'hacia', 'hasta', 'para', 'por', 'según', 'sin', 'so', 'sobre', 'tras', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o']);
    const words = title.split(/\s+/).filter(w => !ignore.has(w.toLowerCase()));
    if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
    return words.map(w => w[0]).join('').toUpperCase().substring(0, 3);
};

const getInitials = (name: string | null) => {
    if (!name) return "NN";
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "NN";
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};
// ─── Types ────────────────────────────────────────────────────────────────────
interface TrainingEnvironment {
    id: string;
    name: string;
    capacity: number;
    location: string | null;
    resources: string[];
}

interface Program {
    id: string; name: string; description: string|null;
    teachers: {
        id:string;
        name:string|null;
        email:string;
        availabilityLocked?: boolean;
        qualifiedCoursesLocked?: boolean;
        availabilities?: { id: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string }[];
        qualifiedCourses?: { id: string; title: string }[];
    }[];
    periods: {id:string;name:string;courses:{id:string;title:string;groupId:string|null;periodId:string|null}[]}[];
    groups: {
        id:string; name:string; description:string|null;
        environmentId?: string | null;
        environment?: TrainingEnvironment | null;
        startTime:string; endTime:string; periodId:string|null;
        period:{id:string;name:string;courses:{id:string;title:string;groupId:string|null}[]}|null;
        courses:{
            id:string; title:string; teacherId:string|null;
            teacher:{id:string;name:string|null;email:string}|null;
            schedules:{id:string;dayOfWeek:DayOfWeek;startTime:string;endTime:string}[];
        }[];
    }[];
}

// ─── Pending Change ───────────────────────────────────────────────────────────
type PendingChange =
    | { type: "CREATE"; tempId: string; groupId: string; periodId: string; title: string; teacherId?: string; schedules: Array<{ dayOfWeek: DayOfWeek; startTime: string; endTime: string }> }
    | { type: "UPDATE"; courseId: string; title: string; teacherId?: string; schedules: Array<{ dayOfWeek: DayOfWeek; startTime: string; endTime: string }> }
    | { type: "DELETE"; courseId: string }
    | { type: "ASSIGN_ENV"; groupId: string; envId: string | null }
    | { type: "ASSIGN_PERIOD"; groupId: string; periodId: string | null }
    | { type: "UPDATE_SETTINGS"; schedulesPublished: boolean; scheduleTitle?: string; scheduleStartDate?: string; scheduleEndDate?: string };

// ─── Component ───────────────────────────────────────────────────────────────
export function SchedulePlanning({ initialPrograms, initialEnvironments = [], initialSchedulesPublished = false, initialScheduleTitle = "Horario Académico", initialScheduleStartDate = null, initialScheduleEndDate = null, draftTeachers = [] }: { initialPrograms: Program[]; initialEnvironments?: TrainingEnvironment[], initialSchedulesPublished?: boolean, initialScheduleTitle?: string, initialScheduleStartDate?: Date | null, initialScheduleEndDate?: Date | null, draftTeachers?: { id: string, name: string | null, email: string }[] }) {
    const router = useRouter();
    const [isSaving,  setIsSaving]  = useState(false);
    const justSavedRef = useRef(false);
    const [schedulesPublished, setSchedulesPublished] = useState(initialSchedulesPublished);
    const [scheduleTitle, setScheduleTitle] = useState(initialScheduleTitle);
    const [scheduleStartDate, setScheduleStartDate] = useState(initialScheduleStartDate ? initialScheduleStartDate.toISOString().split('T')[0] : "");
    const [scheduleEndDate, setScheduleEndDate] = useState(initialScheduleEndDate ? initialScheduleEndDate.toISOString().split('T')[0] : "");
    const [maxTeacherHours, setMaxTeacherHours] = useState(40);

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        // Ensure fresh data from server when navigating to this page via client router
        router.refresh();
    }, [router]);

    // ── In-memory optimistic state ─────────────────────────────────────────────
    const [localPrograms,   setLocalPrograms]   = useState<Program[]>(() => JSON.parse(JSON.stringify(initialPrograms)));
    const [pendingChanges,  setPendingChanges]  = useState<PendingChange[]>([]);
    const isDirty = pendingChanges.length > 0;
    const isScheduleBlocked = draftTeachers.length > 0;

    useEffect(() => {
        if (!isDirty && !isSaving) {
            setLocalPrograms(JSON.parse(JSON.stringify(initialPrograms)));
            setSchedulesPublished(initialSchedulesPublished);
            setScheduleTitle(initialScheduleTitle);
            setScheduleStartDate(initialScheduleStartDate ? initialScheduleStartDate.toISOString().split('T')[0] : "");
            setScheduleEndDate(initialScheduleEndDate ? initialScheduleEndDate.toISOString().split('T')[0] : "");
        }
    }, [initialPrograms, initialSchedulesPublished, initialScheduleTitle, initialScheduleStartDate, initialScheduleEndDate, isDirty, isSaving]);

    // Analytics Modal
    const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

    // Settings Modal
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const triggerSettingsChange = (title: string, startDate: string, endDate: string) => {
        setPendingChanges(prev => {
            const filtered = prev.filter(ch => ch.type !== "UPDATE_SETTINGS");
            return [...filtered, { type: "UPDATE_SETTINGS" as const, schedulesPublished, scheduleTitle: title, scheduleStartDate: startDate, scheduleEndDate: endDate } as any];
        });
    };

    // Selection
    const [programId,   setProgramId]   = useState("");
    const [groupId,     setGroupId]     = useState("");
    const [search,      setSearch]      = useState("");
    const [timeSlot,    setTimeSlot]    = useState("all");


    // Dialog
    const [dlgOpen,    setDlgOpen]    = useState(false);
    const [dlgGroupId, setDlgGroupId] = useState("");
    const [dlgTitle,   setDlgTitle]   = useState("");
    const [dlgDay,     setDlgDay]     = useState<DayOfWeek>("MONDAY");
    const [dlgStart,   setDlgStart]   = useState("08:00");
    const [dlgEnd,     setDlgEnd]     = useState("10:00");
    const [dlgTeacher, setDlgTeacher] = useState("");
    const [teachers,   setTeachers]   = useState<any[]>([]);
    const [loadingT,   setLoadingT]   = useState(false);

    const [editCourseId, setEditCourseId] = useState("");

    // Delete confirmation
    const [courseIdToDelete, setCourseIdToDelete] = useState<string | null>(null);


    // Teacher Overview Modal
    const [teacherOverviewOpen, setTeacherOverviewOpen] = useState(false);
    const [overviewShowAvailability, setOverviewShowAvailability] = useState(true);
    const [overviewShowAssignments, setOverviewShowAssignments] = useState(true);
    const [overviewSearch, setOverviewSearch] = useState("");
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
    const [overviewProgramFilter, setOverviewProgramFilter] = useState<string>("all");

    // Environment Overview Modal
    const [envOverviewOpen, setEnvOverviewOpen] = useState(false);
    const [envOverviewSearch, setEnvOverviewSearch] = useState("");
    const [selectedEnvIds, setSelectedEnvIds] = useState<string[]>([]);
    const [envProgramFilter, setEnvProgramFilter] = useState<string>("all");

    // Period Overview Modal
    const [periodOverviewOpen, setPeriodOverviewOpen] = useState(false);
    const [overviewPeriodProgramFilter, setOverviewPeriodProgramFilter] = useState<string>(initialPrograms[0]?.id || "");

    // Sidebar Toggles
    const [showLeftSidebar, setShowLeftSidebar] = useState(true);
    const [showRightSidebar, setShowRightSidebar] = useState(true);

    // Zoom Level (1 to 4 columns per row)
    const [zoomLevel, setZoomLevel] = useState(2);

    // Publish Confirmation
    const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);


    // Selection Scroll Handler
    const handleGroupFocus = (gid: string) => {
        setGroupId(gid);
        const el = document.getElementById(`group-cal-${gid}`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }
    };

    // ── Mouse-drag horizontal scroll ─────────────────────────────────────────
    const dragScrollRef = useRef<{ el: HTMLDivElement; startX: number; scrollLeft: number } | null>(null);

    const onDragScrollMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        dragScrollRef.current = { el, startX: e.clientX, scrollLeft: el.scrollLeft };
        el.style.cursor = "grabbing";
        el.style.userSelect = "none";
    }, []);

    const onDragScrollMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragScrollRef.current) return;
        e.preventDefault();
        const dx = e.clientX - dragScrollRef.current.startX;
        dragScrollRef.current.el.scrollLeft = dragScrollRef.current.scrollLeft - dx;
    }, []);

    const onDragScrollEnd = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragScrollRef.current) return;
        dragScrollRef.current.el.style.cursor = "grab";
        dragScrollRef.current.el.style.userSelect = "";
        dragScrollRef.current = null;
    }, []);

    // Init & post-save sync
    useEffect(() => {
        if (initialPrograms.length && !programId) setProgramId(initialPrograms[0].id);
        // After a save, sync localPrograms with the fresh server data
        if (justSavedRef.current) {
            justSavedRef.current = false;
            setLocalPrograms(JSON.parse(JSON.stringify(initialPrograms)));
        }
    }, [initialPrograms, programId]);

    // ── Derived (from localPrograms) ──────────────────────────────────────────
    const program = localPrograms.find(p => p.id === programId);

    const filtered = useMemo(() => program?.groups.filter(g => {
        const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
        const matchesSlot = timeSlot === "all" || `${g.startTime} – ${g.endTime}` === timeSlot;
        return matchesSearch && matchesSlot;
    }) ?? [], [program?.groups, search, timeSlot]);

    const activeGroup = useMemo(() => filtered.find(g => g.id === groupId) ?? filtered[0], [filtered, groupId]);

    // Unique slot keys for the current program
    const uniqueSlots = Array.from(
        new Set((program?.groups ?? []).map(g => `${g.startTime} – ${g.endTime}`))
    ).sort((a, b) => {
        const startA = toMin(a.split(" – ")[0]);
        const startB = toMin(b.split(" – ")[0]);
        if (startA !== startB) return startA - startB;
        const endA = toMin(a.split(" – ")[1]);
        const endB = toMin(b.split(" – ")[1]);
        return endA - endB;
    });

    const formatMins = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const getPeriodIconsForAssignments = (assigns: Array<{ startTime: string; endTime: string }>) => {
        let hasMorning = false;
        let hasAfternoon = false;
        let hasNight = false;

        for (const a of assigns) {
            const s = toMin(a.startTime);
            const e = toMin(a.endTime);

            // Mañana: overlap with 00:00 - 12:00 (0 to 720 mins)
            if (s < 720 && e > 0) hasMorning = true;
            // Tarde: overlap with 12:00 - 18:00 (720 to 1080 mins)
            if (s < 1080 && e > 720) hasAfternoon = true;
            // Noche: overlap with 18:00 - 24:00 (1080 to 1440 mins)
            if (s < 1440 && e > 1080) hasNight = true;
        }

        const icons: React.ReactNode[] = [];
        if (hasMorning) {
            icons.push(
                <Tooltip key="morning"><TooltipTrigger asChild><span  className="inline-flex shrink-0">
                                    <Cloud className="w-3 h-3 text-sky-500 dark:text-sky-400 fill-sky-500/10" />
                                </span></TooltipTrigger><TooltipContent><p>Mañana (06:00 a.m. – 12:00 p.m.)</p></TooltipContent></Tooltip>
            );
        }
        if (hasAfternoon) {
            icons.push(
                <Tooltip key="afternoon"><TooltipTrigger asChild><span  className="inline-flex shrink-0">
                                    <Sun className="w-3 h-3 text-amber-500 dark:text-amber-400 fill-amber-500/10" />
                                </span></TooltipTrigger><TooltipContent><p>Tarde (12:00 p.m. – 06:00 p.m.)</p></TooltipContent></Tooltip>
            );
        }
        if (hasNight) {
            icons.push(
                <Tooltip key="night"><TooltipTrigger asChild><span  className="inline-flex shrink-0">
                                    <Moon className="w-3 h-3 text-indigo-500 dark:text-indigo-400 fill-indigo-500/10" />
                                </span></TooltipTrigger><TooltipContent><p>Noche (06:00 p.m. – 12:00 a.m.)</p></TooltipContent></Tooltip>
            );
        }
        return icons;
    };


    const pendingCourses = useMemo(() => {
        if (!activeGroup?.period) return [];
        const done = new Set(activeGroup.courses.map(c => c.title.toLowerCase().trim()));
        return activeGroup.period.courses.filter(c => !done.has(c.title.toLowerCase().trim()));
    }, [activeGroup]);

    // Helper functions for teacher overview availability and qualified courses
    function formatAvailabilities(availabilities: any[]) {
        if (!availabilities || availabilities.length === 0) return null;
        
        // Group by day of week
        const daysMap: Record<string, string[]> = {};
        const dayLabels: Record<string, string> = {
            MONDAY: "Lun", TUESDAY: "Mar", WEDNESDAY: "Mié",
            THURSDAY: "Jue", FRIDAY: "Vie", SATURDAY: "Sáb", SUNDAY: "Dom"
        };
        
        availabilities.forEach(av => {
            const day = av.dayOfWeek;
            const timeStr = `${toFormat12h(av.startTime)} – ${toFormat12h(av.endTime)}`;
            if (!daysMap[day]) daysMap[day] = [];
            daysMap[day].push(timeStr);
        });
        
        // Sort day by index
        const dayOrder = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
        return dayOrder.filter(d => daysMap[d]).map(d => {
            const label = dayLabels[d] || d;
            const times = daysMap[d].join(", ");
            return (
                <div key={d} className="flex justify-between gap-1 leading-none py-0.5 text-[8.5px]">
                    <span className="font-bold text-primary dark:text-primary-400">{label}:</span>
                    <span className="text-muted-foreground font-medium">{times}</span>
                </div>
            );
        });
    }

    function isOutsideAvailability(assign: any, availabilities: any[]) {
        if (!availabilities || availabilities.length === 0) return false;
        
        const dayAvails = availabilities.filter(av => av.dayOfWeek === assign.dayOfWeek);
        if (dayAvails.length === 0) return true;
        
        const assignStart = toMin(assign.startTime);
        const assignEnd = toMin(assign.endTime);
        
        const isContained = dayAvails.some(av => {
            const availStart = toMin(av.startTime);
            const availEnd = toMin(av.endTime);
            return assignStart >= availStart && assignEnd <= availEnd;
        });
        
        return !isContained;
    }

    function getActivePeriods(assigns: any[]) {
        let hasMorning = false;
        let hasAfternoon = false;
        let hasNight = false;
        
        assigns.forEach(a => {
            const start = toMin(a.startTime);
            const end = toMin(a.endTime);
            if (start < 720 && end > 0) hasMorning = true;
            if (start < 1080 && end > 720) hasAfternoon = true;
            if (start < 1440 && end > 1080) hasNight = true;
        });
        
        return { hasMorning, hasAfternoon, hasNight };
    }

    // ── Derived Teacher Overview Data ──────────────────────────────────────────
    const allTeachers = Array.from(
        new Map(
            localPrograms
                .filter(p => overviewProgramFilter === "all" || p.id === overviewProgramFilter)
                .flatMap(p => p.teachers)
                .map(t => [t.id, t])
        )
    ).map(([, t]) => t).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));

    const allProgramSlots = Array.from(
        new Set(localPrograms.flatMap(p => p.groups.map(g => `${g.startTime} – ${g.endTime}`)))
    ).sort((a, b) => {
        const startA = toMin(a.split(" – ")[0]);
        const startB = toMin(b.split(" – ")[0]);
        if (startA !== startB) return startA - startB;
        const endA = toMin(a.split(" – ")[1]);
        const endB = toMin(b.split(" – ")[1]);
        return endA - endB;
    });

    const getTeacherAssignments = useCallback((teacherId: string) => {
        const assignments: {
            id: string;
            courseTitle: string;
            groupName: string;
            programName: string;
            dayOfWeek: DayOfWeek;
            startTime: string;
            endTime: string;
        }[] = [];

        for (const p of localPrograms) {
            for (const g of p.groups) {
                for (const c of g.courses) {
                    if (c.teacherId === teacherId) {
                        for (const s of c.schedules) {
                            assignments.push({
                                id: s.id || `${c.id}_${s.dayOfWeek}`,
                                courseTitle: c.title,
                                groupName: g.name,
                                programName: p.name,
                                dayOfWeek: s.dayOfWeek,
                                startTime: s.startTime,
                                endTime: s.endTime,
                            });
                        }
                    }
                }
            }
        }
        return assignments;
    }, [localPrograms]);

    const getEnvironmentAssignments = useCallback((envId: string) => {
        const assignments: {
            id: string;
            courseTitle: string;
            groupName: string;
            programName: string;
            dayOfWeek: DayOfWeek;
            startTime: string;
            endTime: string;
        }[] = [];

        for (const p of localPrograms) {
            for (const g of p.groups) {
                if (g.environmentId === envId) {
                    for (const c of g.courses) {
                        for (const s of c.schedules) {
                            assignments.push({
                                id: s.id || `${c.id}_${s.dayOfWeek}`,
                                courseTitle: c.title,
                                groupName: g.name,
                                programName: p.name,
                                dayOfWeek: s.dayOfWeek,
                                startTime: s.startTime,
                                endTime: s.endTime,
                            });
                        }
                    }
                }
            }
        }
        return assignments;
    }, [localPrograms]);

    const visibleTeachersForOverview = useMemo(() => allTeachers.filter(t => {
        const nameOrEmail = (t.name || t.email).toLowerCase();
        const matchesSearch = nameOrEmail.includes(overviewSearch.toLowerCase());
        const matchesSelection = selectedTeacherIds.length === 0 || selectedTeacherIds.includes(t.id);
        return matchesSearch && matchesSelection;
    }), [allTeachers, overviewSearch, selectedTeacherIds]);

    const overviewPeriods = useMemo(() => getActivePeriods(visibleTeachersForOverview.flatMap(t => getTeacherAssignments(t.id))), [visibleTeachersForOverview, getTeacherAssignments]);

    const sortedGroups = useMemo(() => [...(program?.groups ?? [])].sort((a, b) => {
        const startA = toMin(a.startTime);
        const startB = toMin(b.startTime);
        if (startA !== startB) return startA - startB;
        const endA = toMin(a.endTime);
        const endB = toMin(b.endTime);
        if (endA !== endB) return endA - endB;
        return a.name.localeCompare(b.name);
    }), [program?.groups]);

    const filteredGroups = sortedGroups.filter(g => {
        const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
        const matchesSlot = timeSlot === "all" || `${g.startTime} – ${g.endTime}` === timeSlot;
        return matchesSearch && matchesSlot;
    });

    const groupsBySlot = filteredGroups.reduce((acc, g) => {
        const slotKey = `${g.startTime} – ${g.endTime}`;
        if (!acc[slotKey]) acc[slotKey] = [];
        acc[slotKey].push(g);
        return acc;
    }, {} as Record<string, NonNullable<typeof program>["groups"]>);

    const sortedSlotKeys = Object.keys(groupsBySlot).sort((a, b) => {
        const timeA = toMin(a.split(" – ")[0]);
        const timeB = toMin(b.split(" – ")[0]);
        if (timeA !== timeB) return timeA - timeB;
        const endA = toMin(a.split(" – ")[1]);
        const endB = toMin(b.split(" – ")[1]);
        return endA - endB;
    });

    // ── Teacher conflict detection ─────────────────────────────────────────────
    /**
     * Returns a conflict description if `teacherId` is already assigned to another
     * course on `day` whose time window overlaps [newStart, newEnd].
     * `excludeCourseId` is the course being edited (skip it in the search).
     */
    const checkTeacherConflict = (
        teacherId: string,
        day: DayOfWeek,
        newStartTime: string,
        newEndTime: string,
        excludeCourseId?: string
    ): { conflict: true; msg: string } | { conflict: false } => {
        const newS = toMin(newStartTime);
        const newE = toMin(newEndTime);

        for (const prog of localPrograms) {
            for (const grp of prog.groups) {
                for (const course of grp.courses) {
                    if (course.teacherId !== teacherId) continue;
                    if (excludeCourseId && course.id === excludeCourseId) continue;
                    for (const sch of course.schedules) {
                        if (sch.dayOfWeek !== day) continue;
                        const s = toMin(sch.startTime);
                        const e = toMin(sch.endTime);
                        // Overlap: intervals share time (not just touch at edges)
                        if (newS < e && newE > s) {
                            const teacherName = prog.teachers.find(t => t.id === teacherId)?.name
                                ?? localPrograms.flatMap(p => p.teachers).find(t => t.id === teacherId)?.name
                                ?? "El docente";
                            return {
                                conflict: true,
                                msg: `⚠ Conflicto de horario: "${teacherName}" ya está asignado a "${course.title}" (${grp.name}) el ${DAYS_ES[day]} de ${toFormat12h(sch.startTime)} a ${toFormat12h(sch.endTime)}.`,
                            };
                        }
                    }
                }
            }
        }
        return { conflict: false };
    };

    /**
     * Checks if assigning a teacher to a specific time block exceeds their 40 hour per week limit.
     */
    const checkTeacherWeeklyHours = (
        teacherId: string,
        newStartMins: number,
        newEndMins: number,
        excludeCourseId?: string
    ): { conflict: boolean; msg: string; totalHours: number } => {
        let totalAssignedMinutes = 0;
        let teacherName = "El docente";

        for (const prog of localPrograms) {
            for (const grp of prog.groups) {
                for (const course of grp.courses) {
                    if (course.teacherId !== teacherId) continue;
                    if (excludeCourseId && course.id === excludeCourseId) continue;
                    for (const sch of course.schedules) {
                        const s = toMin(sch.startTime);
                        const e = toMin(sch.endTime);
                        totalAssignedMinutes += Math.max(0, e - s);
                    }
                }
            }
            if (prog.teachers) {
                const found = prog.teachers.find(t => t.id === teacherId);
                if (found) teacherName = found.name || found.email;
            }
        }

        const newAssignMinutes = Math.max(0, newEndMins - newStartMins);
        const projectedMinutes = totalAssignedMinutes + newAssignMinutes;
        const limitMinutes = maxTeacherHours * 60; // Dynamic limit based on settings

        if (projectedMinutes > limitMinutes) {
            return {
                conflict: true,
                msg: `⚠️ Límite Excedido: "${teacherName}" superaría el límite legal de contrato (${maxTeacherHours} horas semanales). Proyectado: ${(projectedMinutes/60).toFixed(1)}h.`,
                totalHours: projectedMinutes / 60
            };
        }

        return { conflict: false, msg: "", totalHours: projectedMinutes / 60 };
    };

    // ── Local mutation helpers ─────────────────────────────────────────────────
    /** Apply a course update to localPrograms state */
    const applyLocalCourseUpdate = (
        courseId: string, title: string, teacherId: string | undefined,
        day: DayOfWeek, startTime: string, endTime: string
    ) => {
        const teacher = teacherId
            ? localPrograms.flatMap(p => p.teachers).find(t => t.id === teacherId) ?? null
            : null;
        setLocalPrograms(prev => prev.map(p => ({
            ...p,
            groups: p.groups.map(g => ({
                ...g,
                courses: g.courses.map(c => c.id !== courseId ? c : ({
                    ...c, title, teacherId: teacherId || null, teacher,
                    schedules: [{ id: c.schedules[0]?.id || `sch_${courseId}`, dayOfWeek: day, startTime, endTime }],
                }))
            }))
        })));
    };

    /** Move a dragged card — snapped, clamped, immediate */
    const localMove = (
        courseId: string, title: string, teacherId: string | null,
        durationMin: number, day: DayOfWeek, rawStartMin: number,
        gS: number, gE: number
    ) => {
        if (isScheduleBlocked) {
            toast.error("Programación bloqueada. Faltan profesores por publicar disponibilidad.");
            return;
        }
        let s = clamp(snapMin(rawStartMin), gS, gE - durationMin);
        let e = s + durationMin;
        if (e > gE) { e = gE; s = e - durationMin; }
        
        // Check teacher conflict and hours on drag-drop
        if (teacherId) {
            const check = checkTeacherConflict(teacherId, day, toStr(s), toStr(e), courseId);
            if (check.conflict) {
                toast.error(check.msg, { duration: 6000 });
                return; // abort the move
            }
            const hoursCheck = checkTeacherWeeklyHours(teacherId, s, e, courseId);
            if (hoursCheck.conflict) {
                toast.error(hoursCheck.msg, { duration: 6000 });
                return; // abort the move
            }
        }
        
        applyLocalCourseUpdate(courseId, title, teacherId ?? undefined, day, toStr(s), toStr(e));
        setPendingChanges(prev => {
            const isCreate = prev.some(ch => ch.type === "CREATE" && ch.tempId === courseId);
            if (isCreate) {
                return prev.map(ch => ch.type === "CREATE" && ch.tempId === courseId
                    ? { ...ch, schedules: [{ dayOfWeek: day, startTime: toStr(s), endTime: toStr(e) }] } : ch);
            }
            const filtered = prev.filter(ch => !(ch.type === "UPDATE" && ch.courseId === courseId));
            return [...filtered, { type: "UPDATE" as const, courseId, title, teacherId: teacherId ?? undefined, schedules: [{ dayOfWeek: day, startTime: toStr(s), endTime: toStr(e) }] }];
        });
    };

    /** Insert a new course locally with a temp ID */
    const localInsert = (groupId: string, periodId: string, title: string, teacherId: string | undefined, day: DayOfWeek, startTime: string, endTime: string) => {
        if (isScheduleBlocked) {
            toast.error("Programación bloqueada. Faltan profesores por publicar disponibilidad.");
            return;
        }
        if (teacherId) {
            const check = checkTeacherConflict(teacherId, day, startTime, endTime);
            if (check.conflict) {
                toast.error(check.msg, { duration: 6000 });
                return false; // abort
            }
            const hoursCheck = checkTeacherWeeklyHours(teacherId, toMin(startTime), toMin(endTime));
            if (hoursCheck.conflict) {
                toast.error(hoursCheck.msg, { duration: 6000 });
                return false; // abort
            }
        }
        
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const teacher = teacherId ? localPrograms.flatMap(p => p.teachers).find(t => t.id === teacherId) ?? null : null;
        setLocalPrograms(prev => prev.map(p => ({
            ...p,
            groups: p.groups.map(g => g.id !== groupId ? g : ({
                ...g,
                courses: [...g.courses, {
                    id: tempId, title, teacherId: teacherId || null, teacher,
                    schedules: [{ id: `tmp_sch_${tempId}`, dayOfWeek: day, startTime, endTime }],
                }],
            }))
        })));
        setPendingChanges(prev => [...prev, { type: "CREATE" as const, tempId, groupId, periodId, title, teacherId, schedules: [{ dayOfWeek: day, startTime, endTime }] }]);
        return true;
    };

    /** Edit/reschedule an existing course locally */
    const localUpdate = (courseId: string, title: string, teacherId: string | undefined, day: DayOfWeek, startTime: string, endTime: string) => {
        if (teacherId) {
            const check = checkTeacherConflict(teacherId, day, startTime, endTime, courseId);
            if (check.conflict) {
                toast.error(check.msg, { duration: 6000 });
                return false; // abort
            }
            const hoursCheck = checkTeacherWeeklyHours(teacherId, toMin(startTime), toMin(endTime), courseId);
            if (hoursCheck.conflict) {
                toast.error(hoursCheck.msg, { duration: 6000 });
                return false; // abort
            }
        }
        
        applyLocalCourseUpdate(courseId, title, teacherId, day, startTime, endTime);
        setPendingChanges(prev => {
            const isCreate = prev.some(ch => ch.type === "CREATE" && ch.tempId === courseId);
            if (isCreate) {
                return prev.map(ch => ch.type === "CREATE" && ch.tempId === courseId
                    ? { ...ch, title, teacherId, schedules: [{ dayOfWeek: day, startTime, endTime }] } : ch);
            }
            const filtered = prev.filter(ch => !(ch.type === "UPDATE" && ch.courseId === courseId));
            return [...filtered, { type: "UPDATE" as const, courseId, title, teacherId, schedules: [{ dayOfWeek: day, startTime, endTime }] }];
        });
        return true;
    };

    /** Remove a course locally — opens confirmation modal instead of browser confirm */
    const localDelete = (courseId: string) => {
        setCourseIdToDelete(courseId);
    };

    const confirmDelete = () => {
        if (!courseIdToDelete) return;
        const id = courseIdToDelete;
        setCourseIdToDelete(null);
        setLocalPrograms(prev => prev.map(p => ({
            ...p, groups: p.groups.map(g => ({ ...g, courses: g.courses.filter(c => c.id !== id) }))
        })));
        setPendingChanges(prev => {
            const isCreate = prev.some(ch => ch.type === "CREATE" && ch.tempId === id);
            if (isCreate) return prev.filter(ch => !(ch.type === "CREATE" && ch.tempId === id));
            const filtered = prev.filter(ch => !(ch.type === "UPDATE" && ch.courseId === id));
            return [...filtered, { type: "DELETE" as const, courseId: id }];
        });
        toast.success("Clase eliminada — recuerda guardar los cambios.");
    };

    /** Save all pending changes to the database in one batch */
    const handleSaveAll = async () => {
        if (pendingChanges.length === 0 || isSaving) return;
        setIsSaving(true);
        try {
            const { saveScheduleBatchAction } = await import("@/features/admin/actions/academicActions");
            await saveScheduleBatchAction(pendingChanges);

            toast.success(`✓ ${pendingChanges.length} cambio(s) guardados correctamente.`);
            setPendingChanges([]);
            justSavedRef.current = true;
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Error al guardar los cambios");
        } finally {
            setIsSaving(false);
        }
    };

    /** Discard all local pending changes */
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const handleExportExcel = async () => {
        setIsExportingExcel(true);
        try {
            await exportScheduleToExcel(localPrograms, scheduleTitle || "Horario Académico");
            import('sonner').then(({toast}) => toast.success("Excel exportado correctamente."));
        } catch (error) {
            console.error(error);
            import('sonner').then(({toast}) => toast.error("Error al exportar a Excel."));
        } finally {
            setIsExportingExcel(false);
        }
    };
    const handleDiscard = () => {
        if (!confirm("¿Descartar todos los cambios pendientes? Se revertirá al último estado guardado.")) return;
        setLocalPrograms(JSON.parse(JSON.stringify(initialPrograms)));
        setPendingChanges([]);
        toast.info("Cambios descartados");
    };

    // ── Dialog helpers ─────────────────────────────────────────────────────────
    const handleStartChange = (newStart: string) => {
        setDlgStart(newStart);
        const startM = toMin(newStart);
        const endM = toMin(dlgEnd);
        if (startM >= endM) {
            const g = program?.groups.find(x => x.id === dlgGroupId);
            const limit = g ? toMin(g.endTime) : startM + 120;
            setDlgEnd(toStr(Math.min(startM + 120, limit)));
        }
    };

    const getStartTimeOptions = () => {
        const g = program?.groups.find(x => x.id === dlgGroupId);
        if (!g) return [];
        const start = snapMin(toMin(g.startTime));
        const end = snapMin(toMin(g.endTime));
        const options: string[] = [];
        for (let m = start; m < end; m += 15) options.push(toStr(m));
        return options;
    };

    const getEndTimeOptions = () => {
        const g = program?.groups.find(x => x.id === dlgGroupId);
        if (!g) return [];
        const startLimit = snapMin(toMin(dlgStart || g.startTime));
        const end = snapMin(toMin(g.endTime));
        const options: string[] = [];
        for (let m = startLimit + 15; m <= end; m += 15) options.push(toStr(m));
        return options;
    };

    const openDlg = useCallback(async (gid: string, day: DayOfWeek, title: string, startStr?: string) => {
        const g = localPrograms.flatMap(p => p.groups).find(x => x.id === gid); if (!g) return;
        setDlgGroupId(gid); setDlgTitle(title); setDlgDay(day);
        setDlgStart(g.startTime);
        setDlgEnd(g.endTime);
        setDlgTeacher(""); setEditCourseId(""); setDlgOpen(true);
        if (title) {
            setLoadingT(true);
            try { setTeachers(await getQualifiedTeachersAction(programId, title)); }
            catch { toast.error("Error al buscar profesores"); }
            finally { setLoadingT(false); }
        } else setTeachers([]);
    }, [localPrograms, programId]);

    const openEditDlg = useCallback(async (gid: string, day: DayOfWeek, slot: any) => {
        const g = localPrograms.flatMap(p => p.groups).find(x => x.id === gid); if (!g) return;
        setDlgGroupId(gid); setDlgTitle(slot.title); setDlgDay(day);
        setDlgStart(slot.startTime); setDlgEnd(slot.endTime);
        setDlgTeacher(slot.teacher?.id ?? ""); setEditCourseId(slot.courseId); setDlgOpen(true);
        setLoadingT(true);
        try { setTeachers(await getQualifiedTeachersAction(programId, slot.title)); }
        catch { toast.error("Error al buscar profesores"); }
        finally { setLoadingT(false); }
    }, [localPrograms, programId]);

    /** Dialog save handlers — local only, no server call */
    const handleUpdate = () => {
        if (!dlgGroupId || !dlgTitle || dlgStart >= dlgEnd || !editCourseId) { toast.error("Datos incompletos"); return; }
        if (dlgTeacher) {
            const check = checkTeacherConflict(dlgTeacher, dlgDay, dlgStart, dlgEnd, editCourseId);
            if (check.conflict) { toast.error(check.msg, { duration: 6000 }); return; }
        }
        localUpdate(editCourseId, dlgTitle, dlgTeacher || undefined, dlgDay, dlgStart, dlgEnd);
        setDlgOpen(false); setEditCourseId("");
    };

    const handleInsert = () => {
        if (!dlgGroupId || !dlgTitle || dlgStart >= dlgEnd) { toast.error("Datos incompletos"); return; }
        if (dlgTeacher) {
            const check = checkTeacherConflict(dlgTeacher, dlgDay, dlgStart, dlgEnd);
            if (check.conflict) { toast.error(check.msg, { duration: 6000 }); return; }
        }
        const g = localPrograms.flatMap(p => p.groups).find(x => x.id === dlgGroupId);
        if (!g?.periodId) { toast.error("El grupo no tiene período"); return; }
        localInsert(dlgGroupId, g.periodId, dlgTitle, dlgTeacher || undefined, dlgDay, dlgStart, dlgEnd);
        setDlgOpen(false);
    };

    const handleDelete = localDelete;

    const getAvailableEnvironments = (currentGroupId: string, currentEnvId: string | null | undefined) => {
        const assignedIds = new Set<string>();
        localPrograms.forEach(p => {
            p.groups.forEach(g => {
                if (g.id !== currentGroupId && g.environmentId) {
                    assignedIds.add(g.environmentId);
                }
            });
        });
        return initialEnvironments.filter(env => !assignedIds.has(env.id) || env.id === currentEnvId);
    };

    const handleAssignEnvironment = (groupId: string, envId: string | null) => {
        const env = envId ? initialEnvironments.find(e => e.id === envId) : null;
        
        setLocalPrograms(prev => prev.map(p => ({
            ...p,
            groups: p.groups.map(g => g.id === groupId ? {
                ...g,
                environmentId: envId,
                environment: env ? {
                    id: env.id,
                    name: env.name,
                    capacity: env.capacity,
                    location: env.location,
                    resources: env.resources
                } : null
            } : g)
        })));
        
        setPendingChanges(prev => {
            const filtered = prev.filter(ch => !(ch.type === "ASSIGN_ENV" && ch.groupId === groupId));
            return [...filtered, { type: "ASSIGN_ENV" as const, groupId, envId }];
        });
    };

    const handleAssignPeriod = (groupId: string, periodId: string | null) => {
        const programForGroup = localPrograms.find(p => p.groups.some(g => g.id === groupId));
        const period = periodId ? programForGroup?.periods.find(p => p.id === periodId) : null;
        
        setLocalPrograms(prev => prev.map(p => ({
            ...p,
            groups: p.groups.map(g => g.id === groupId ? {
                ...g,
                periodId: periodId,
                period: period ? {
                    id: period.id,
                    name: period.name,
                    courses: period.courses
                } : null
            } : g)
        })));
        
        setPendingChanges(prev => {
            const filtered = prev.filter(ch => !(ch.type === "ASSIGN_PERIOD" && ch.groupId === groupId));
            return [...filtered, { type: "ASSIGN_PERIOD" as const, groupId, periodId }];
        });
    };

    // ── Helpers for drop position calculation ─────────────────────────────────
    const yToPctMin = (relY: number, containerH: number, gS: number, gE: number) =>
        gS + (relY / containerH) * (gE - gS);

    // ── Calendar render ───────────────────────────────────────────────────────
    const renderCalendarForGroup = (g: any) => {
        const gS = toMin(g.startTime);
        const gE = toMin(g.endTime);
        const dur = gE - gS;

        // Tick marks: every 15 min, label only on start time and end time
        const formatTimeLabel = (m: number) => {
            const h24 = Math.floor(m / 60);
            const mm  = m % 60;
            const dh  = h24 % 12 === 0 ? 12 : h24 % 12;
            const ap  = h24 >= 12 ? "pm" : "am";
            return mm === 0
                ? (h24 === 12 ? "12m" : `${dh}${ap}`)
                : `${dh}:${String(mm).padStart(2, "0")}${ap}`;
        };

        const ticks: { min: number; label: string | null; isHour: boolean }[] = [];
        for (let m = gS; m <= gE; m += 15) {
            const isFirst = m === gS;
            const isLast  = m === gE;
            const isH     = m % 60 === 0;
            let label: string | null = null;
            if (isFirst || isLast) {
                label = formatTimeLabel(m);
            }
            ticks.push({ min: m, label, isHour: isH });
        }

        return (
            <div className="flex flex-row w-full h-full">
                {/* ── Time ruler ── */}
                <div className="shrink-0 w-14 flex flex-col h-full">
                    {/* Header spacer aligned with day headers */}
                    <div className="shrink-0 h-7 border-b border-r border-border/20 flex items-center justify-center gap-0.5 bg-card">
                        {(() => {
                            const icons = [];
                            if (gS < 720 && gE > 0) {
                                icons.push(
                                    <Tooltip key="morning"><TooltipTrigger asChild><span  className="inline-flex shrink-0">
                                                                            <Cloud className="w-2.5 h-2.5 text-sky-500 dark:text-sky-400 fill-sky-500/10" />
                                                                        </span></TooltipTrigger><TooltipContent><p>Mañana (06:00 a.m. – 12:00 p.m.)</p></TooltipContent></Tooltip>
                                );
                            }
                            if (gS < 1080 && gE > 720) {
                                icons.push(
                                    <Tooltip key="afternoon"><TooltipTrigger asChild><span  className="inline-flex shrink-0">
                                                                            <Sun className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400 fill-amber-500/10" />
                                                                        </span></TooltipTrigger><TooltipContent><p>Tarde (12:00 p.m. – 06:00 p.m.)</p></TooltipContent></Tooltip>
                                );
                            }
                            if (gS < 1440 && gE > 1080) {
                                icons.push(
                                    <Tooltip key="night"><TooltipTrigger asChild><span  className="inline-flex shrink-0">
                                                                            <Moon className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400 fill-indigo-500/10" />
                                                                        </span></TooltipTrigger><TooltipContent><p>Noche (06:00 p.m. – 12:00 a.m.)</p></TooltipContent></Tooltip>
                                );
                            }
                            return icons;
                        })()}
                    </div>
                    {/* Ruler body — same height as grid columns */}
                    <div className="flex-1 relative border-r border-border/10 overflow-hidden">
                        {/* Time-of-day gradient bar */}
                        <div
                            className="absolute left-0 top-0 bottom-0 w-[5px] z-10"
                            style={{ background: getTimeGradient(gS, gE) }}
                        />
                        {/* Start time label */}
                        <div className="absolute right-2 top-0 pointer-events-none">
                            <span className="select-none whitespace-nowrap text-[10px] font-black text-muted-foreground">
                                {formatTimeLabel(gS)}
                            </span>
                        </div>
                        {/* Mid-point time + duration pill */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 pointer-events-none px-1">
                            <span className="text-[9px] font-bold text-muted-foreground/60 select-none">
                                {formatTimeLabel(Math.round((gS + gE) / 2))}
                            </span>
                            <div
                                className="px-1.5 py-0.5 rounded-full text-[8px] font-black select-none"
                                style={{
                                    background: `${minuteToColor(Math.round((gS + gE) / 2))}33`,
                                    color: minuteToColor(Math.round((gS + gE) / 2)),
                                    border: `1px solid ${minuteToColor(Math.round((gS + gE) / 2))}66`,
                                }}
                            >
                                {`${Math.round((gE - gS) / 60)}h`}
                            </div>
                        </div>
                        {/* End time label */}
                        <div className="absolute right-2 bottom-0 translate-y-0 pointer-events-none">
                            <span className="select-none whitespace-nowrap text-[10px] font-black text-muted-foreground" style={{ transform: "translateY(-100%)", display: "block" }}>
                                {formatTimeLabel(gE)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Day columns ── */}
                <div className="flex-1 grid grid-cols-7 h-full">
                    {DAYS.map(({ value: day, short }) => {
                        const daySlots = g.courses.flatMap((c: any) =>
                            c.schedules.filter((s: any) => s.dayOfWeek === day).map((s: any) => ({
                                courseId: c.id, title: c.title, teacher: c.teacher, icon: c.icon,
                                startTime: s.startTime, endTime: s.endTime, scheduleId: s.id,
                            }))
                        );
                        const th = gc(g.id);

                        return (
                            <div key={day} className="flex flex-col border-r border-border/10 last:border-r-0 h-full">
                                {/* Day header */}
                                <div className="shrink-0 h-6 flex items-center justify-center border-b border-border/20 bg-card">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground select-none">
                                        {short}
                                    </span>
                                </div>

                                {/* Column body — fills remaining height */}
                                <div
                                    className="flex-1 relative overflow-hidden column-body"
                                    style={{
                                        transition: "background-color 0.08s",
                                        cursor: groupId && g.id !== groupId ? "not-allowed" : undefined,
                                    }}
                                    onDragEnter={e => {
                                        if (groupId && g.id !== groupId) return;
                                        e.currentTarget.style.backgroundColor = th.bg;
                                    }}
                                    onDragOver={e => {
                                        // Only accept drops on the selected group
                                        if (groupId && g.id !== groupId) {
                                            e.dataTransfer.dropEffect = "none";
                                            return;
                                        }
                                        e.preventDefault();
                                    }}
                                    onDragLeave={e => { 
                                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                            e.currentTarget.style.backgroundColor = "";
                                            e.currentTarget.parentElement?.classList.remove("bg-primary/5");
                                        }
                                    }}
                                    onDrop={e => {
                                        // Only accept drops on the selected group
                                        if (groupId && g.id !== groupId) { e.preventDefault(); return; }
                                        e.preventDefault(); 
                                        e.currentTarget.parentElement?.classList.remove("bg-primary/5");
                                        try {
                                            const d = JSON.parse(e.dataTransfer.getData("text/plain"));
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const relY = e.clientY - rect.top;
                                            const h    = rect.height;
                                            if (d.moving) {
                                                const rawStart = yToPctMin(relY, h, gS, gE) - (d.offsetMin ?? 0);
                                                localMove(d.courseId, d.title, d.teacherId ?? null, d.durationMin, day, rawStart, gS, gE);
                                            } else {
                                                const rawStart = yToPctMin(relY, h, gS, gE);
                                                openDlg(g.id, day, d.title ?? "", toStr(snapMin(clamp(rawStart, gS, gE - 30))));
                                            }
                                        } catch {}
                                    }}
                                >
                                    {/* Grid lines at every 15min (percentage-based) */}
                                    {ticks.map(tick => {
                                        if (tick.min >= gE) return null;
                                        const pct  = ((tick.min - gS) / dur) * 100;
                                        const slotH = (15 / dur) * 100; // height of one slot in %
                                        const isH    = tick.min % 60 === 0;
                                        const isHalf = tick.min % 60 === 30;
                                        const lc = isH ? "border-border/30" : isHalf ? "border-border/15" : "border-border/6";
                                        return (
                                            <Tooltip key={tick.min}><TooltipTrigger asChild><div
                                                                                            
                                                                                            className={`absolute left-0 right-0 border-b ${lc} hover:bg-primary/[0.04] cursor-pointer transition-colors duration-75`}
                                                                                            style={{ top: `${pct}%`, height: `${slotH}%` }}
                                                                                            onClick={() => openDlg(g.id, day, "", toStr(tick.min))}
                                                                                        /></TooltipTrigger><TooltipContent><p>{toStr(tick.min)}</p></TooltipContent></Tooltip>
                                        );
                                    })}

                                    {/* Course cards — percentage positioned */}
                                    {daySlots.map((slot: any, idx: number) => {
                                        const sM  = toMin(slot.startTime);
                                        const eM  = toMin(slot.endTime);
                                        const dur2 = eM - sM;

                                        const topPct = ((sM - gS) / dur) * 100;
                                        const hPct   = ((eM - sM) / dur) * 100;
                                        const col    = cc(slot.title);
                                        const tCol   = tc(slot.teacher?.name || slot.teacher?.email || "Unknown");

                                        // Pending change visual indicators
                                        const isPendingCreate = pendingChanges.some(ch => ch.type === "CREATE" && ch.tempId === slot.courseId);
                                        const isPendingModify = !isPendingCreate && pendingChanges.some(ch => ch.type === "UPDATE" && ch.courseId === slot.courseId);
                                         const CourseIcon = getCourseIcon(slot.title);
                                         const TeacherIcon = getTeacherIcon(slot.teacher ? (slot.teacher.name || slot.teacher.email) : null);
                                         const courseTotalMins = g.courses.find((c: any) => c.id === slot.courseId)?.schedules.reduce((acc: number, s: any) => acc + toMin(s.endTime) - toMin(s.startTime), 0) || 0;

                                         const isSelectedGroup = !groupId || g.id === groupId;

                                         return (
                                             <Tooltip key={`${slot.courseId}-${slot.scheduleId}-${idx}`}>
                                                 <TooltipTrigger asChild>
                                                     <div
                                                         draggable={isSelectedGroup}
                                                         onDragStart={e => {
                                                             if (!isSelectedGroup) { e.preventDefault(); return; }
                                                             const rect = e.currentTarget.getBoundingClientRect();
                                                             const bodyH = e.currentTarget.closest(".column-body")?.clientHeight ?? rect.height;
                                                             const offsetMin = ((e.clientY - rect.top) / bodyH) * dur;
                                                             e.dataTransfer.setData("text/plain", JSON.stringify({
                                                                 moving: true, courseId: slot.courseId,
                                                                 scheduleId: slot.scheduleId, title: slot.title,
                                                                 teacherId: slot.teacher?.id ?? null,
                                                                 durationMin: dur2, offsetMin,
                                                             }));
                                                             e.dataTransfer.effectAllowed = "move";
                                                         }}
                                                         onClick={e => {
                                                             e.stopPropagation();
                                                             openEditDlg(g.id, day, slot);
                                                         }}
                                                         style={{
                                                             position: "absolute",
                                                             top:    `${topPct}%`,
                                                             height: `${hPct}%`,
                                                             left:   "1px",
                                                             right:  "1px",
                                                             backgroundColor: isPendingCreate ? `${col.bg}` : col.bg,
                                                             color:           col.text,
                                                             borderColor:     isPendingCreate ? "#f59e0b" : isPendingModify ? "#6366f1" : col.border,
                                                             borderStyle:     isPendingCreate ? "dashed" : "solid",
                                                             borderWidth:     (isPendingCreate || isPendingModify) ? "2px" : "1px",
                                                             willChange: "top, height",
                                                             transition: "top 0.1s cubic-bezier(.4,0,.2,1), height 0.1s cubic-bezier(.4,0,.2,1)",
                                                         }}
                                                         className="group/c rounded-xl shadow-xs border hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 overflow-hidden z-20 cursor-grab active:cursor-grabbing"
                                                         >
                                                            {/* Card layout: text content + hover delete row */}
                                                            <div className="flex flex-col h-full min-w-0 p-2 select-none relative overflow-hidden gap-1.5">
                                                                {/* Top Bar: Icon, Acronym, and pending status */}
                                                                <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                                                                    <span className="text-[8px] px-1 py-0.5 rounded font-black text-white shrink-0 shadow-xs" style={{ backgroundColor: col.solid }}>
                                                                        {getAcronym(slot.title)}
                                                                    </span>
                                                                    <div className="p-0.5 rounded bg-current/10 shrink-0 text-current/80">
                                                                        <CourseIcon className="w-2.5 h-2.5" />
                                                                    </div>
                                                                    
                                                                    {isPendingCreate && (
                                                                        <Tooltip><TooltipTrigger asChild><span className="ml-auto shrink-0 bg-amber-500/20 text--700 dark:text--300 border border-amber-500/35 px-1 py-0 rounded-[3px] text-[6.5px] font-extrabold flex items-center gap-0.5 animate-pulse">
                                                                                                                                                 Nuevo
                                                                                                                                             </span></TooltipTrigger><TooltipContent><p>Nuevo sin guardar</p></TooltipContent></Tooltip>
                                                                    )}
                                                                    {isPendingModify && (
                                                                        <Tooltip><TooltipTrigger asChild><span className="ml-auto shrink-0 bg-indigo-500/20 text-indigo-700 border border-indigo-500/35 px-1 py-0 rounded-[3px] text-[6.5px] font-extrabold flex items-center gap-0.5">
                                                                                                                                                 mod.
                                                                                                                                             </span></TooltipTrigger><TooltipContent><p>Modificado sin guardar</p></TooltipContent></Tooltip>
                                                                    )}
                                                                </div>

                                                                {/* Title */}
                                                                <div className="font-extrabold text-[10px] leading-snug line-clamp-2 break-words shrink-0" style={{ color: col.text }}>
                                                                    {slot.title}
                                                                </div>
                                                                
                                                                {/* Teacher Info */}
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    <div 
                                                                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold shrink-0 shadow-xs border border-current/10" 
                                                                        style={{ backgroundColor: tCol.bg, color: tCol.text }}
                                                                    >
                                                                        {getInitials(slot.teacher?.name || slot.teacher?.email || null)}
                                                                    </div>
                                                                    <span className="text-[8.5px] font-bold truncate opacity-90" style={{ color: col.text }}>
                                                                        {slot.teacher?.name ? slot.teacher.name.split(" ")[0] : (slot.teacher?.email ? slot.teacher.email.split("@")[0] : "Sin docente")}
                                                                    </span>
                                                                </div>
                                                                
                                                                {/* Time slot */}
                                                                <div className="flex items-center gap-1 pt-1 border-t border-current/10 text-[7.5px] font-bold shrink-0 mt-0.5" style={{ color: col.text }}>
                                                                    <Clock className="w-2.5 h-2.5 shrink-0 opacity-80" />
                                                                    <span className="opacity-90">{toFormat12h(slot.startTime)}–{toFormat12h(slot.endTime)}</span>
                                                                </div>
                                                                
                                                                {/* Delete action — revealed on hover as a floating pill */}
                                                                <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover/c:opacity-100 transition-opacity duration-150 bg-gradient-to-t from-background/90 via-background/60 to-transparent pt-6 pb-1.5 flex justify-center pointer-events-none">
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); setCourseIdToDelete(slot.courseId); }}
                                                                        className="flex items-center justify-center gap-1 py-1 px-2.5 rounded-full text-[8.5px] font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm pointer-events-auto"
                                                                    >
                                                                        <Trash2 className="w-2.5 h-2.5" />
                                                                        Eliminar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                         </div>
                                                 </TooltipTrigger>
                                                 <TooltipContent side="top" align="center" style={{ backgroundColor: "#090d16", opacity: 1 }} className="p-3 border border-slate-800 text-slate-100 rounded-xl shadow-xl z-50 w-72 flex flex-col gap-2.5">
                                                     <div className="flex flex-col gap-0.5 pb-2 border-b border-slate-800">
                                                         <div className="flex items-center gap-1.5 min-w-0">
                                                             <CourseIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                                             <span className="text-xs font-black text-white leading-tight">{slot.title}</span>
                                                         </div>
                                                         <div className="flex items-center justify-between pl-5 pr-1 mt-0.5">
                                                             <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">Materia del Programa</span>
                                                             <span className="text-[9px] text-sky-400 font-black bg-sky-400/10 px-1 rounded">Total Asignado: {formatMins(courseTotalMins)}</span>
                                                         </div>
                                                     </div>

                                                     <div className="flex flex-col gap-2 text-[10px]">
                                                         {/* Horario */}
                                                         <div className="flex items-start gap-2 text-slate-300">
                                                             <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                                                             <div className="flex flex-col">
                                                                 <span className="font-extrabold text-white">{DAYS_ES[day]}</span>
                                                                 <span className="text-[9px] text-slate-400 font-medium">
                                                                     {toFormat12h(slot.startTime)} a {toFormat12h(slot.endTime)} ({dur2 % 60 === 0 ? `${dur2 / 60}h` : `${Math.floor(dur2 / 60)}h ${dur2 % 60}m`})
                                                                 </span>
                                                             </div>
                                                         </div>

                                                         {/* Docente */}
                                                         <div className="flex items-start gap-2 text-slate-300">
                                                             <TeacherIcon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                                             <div className="flex flex-col min-w-0">
                                                                 <span className="font-extrabold text-white truncate">{slot.teacher ? slot.teacher.name : "Sin docente asignado"}</span>
                                                                 {slot.teacher && <span className="text-[9px] text-slate-400 font-medium truncate">{slot.teacher.email}</span>}
                                                             </div>
                                                         </div>

                                                         {/* Grupo */}
                                                         <div className="flex items-start gap-2 text-slate-300">
                                                             <Users className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                                                             <div className="flex flex-col">
                                                                 <span className="font-extrabold text-white">{g.name}</span>
                                                                 <span className="text-[9px] text-slate-400 font-medium">{g.period?.name ?? "Sin Periodo"}</span>
                                                             </div>
                                                         </div>
                                                     </div>

                                                     {/* Estado */}
                                                     <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[9px]">
                                                         <span className="text-slate-400 font-semibold">Estado de guardado:</span>
                                                         {isPendingCreate ? (
                                                             <Badge className="text-[8px] h-4 font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/15">
                                                                 Nuevo sin guardar
                                                             </Badge>
                                                         ) : isPendingModify ? (
                                                             <Badge className="text-[8px] h-4 font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/15">
                                                                 Modificado sin guardar
                                                             </Badge>
                                                         ) : (
                                                             <Badge className="text-[8px] h-4 font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15">
                                                                 Guardado en BD
                                                             </Badge>
                                                         )}
                                                     </div>
                                                 </TooltipContent>
                                             </Tooltip>
                                         );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ─── Main render ─────────────────────────────────────────────────────────
    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <span className="text-xs font-black text-muted-foreground animate-pulse">Cargando programador...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex md:hidden h-[calc(100vh-100px)] flex-col items-center justify-center text-center p-6 bg-muted/20 border border-dashed rounded-xl m-4">
                <Monitor className="w-12 h-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold mb-2">Requiere una computadora</h2>
                <p className="text-muted-foreground text-sm max-w-sm">
                   El programador de horarios es una herramienta compleja que requiere una pantalla amplia para arrastrar y soltar clases, gestionar profesores y organizar el calendario eficientemente. Por favor, accede desde un dispositivo de escritorio.
                </p>
            </div>
            
            <div className="hidden md:flex flex-col h-full overflow-hidden bg-background">
            {/* Bloqueo Estricto Banner */}
            {isScheduleBlocked && (
                <div className="bg-destructive/15 border-b border-destructive/20 p-2 px-4 flex items-center justify-between text-destructive shrink-0">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <div>
                            <h4 className="font-semibold text-sm">Programación Bloqueada</h4>
                            <p className="text-xs">
                                No puedes crear o modificar la programación porque hay <strong>{draftTeachers.length}</strong> profesor(es) que no han publicado su disponibilidad y materias.
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground h-7 text-xs" onClick={() => setTeacherOverviewOpen(true)}>
                        Ver Docentes
                    </Button>
                </div>
            )}

            {/* ── TOP BAR — two rows ── */}
            <div className="flex flex-col px-3 py-2 border-b border-border/30 bg-card shrink-0 min-h-0">
                
                {/* Row 1: Filters & Info */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Title */}
                    <div className="flex items-center gap-1.5 shrink-0 pr-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-xs font-black tracking-tight">Cronograma</span>
                    </div>

                    {/* Program select */}
                    <div className="w-56 shrink-0">
                        <Select value={programId} onValueChange={v => { setProgramId(v); setGroupId(""); setTimeSlot("all"); }}>
                            <SelectTrigger className="w-full h-7 text-xs rounded border-border/40 font-semibold py-0">
                                <SelectValue placeholder="Programa…" />
                            </SelectTrigger>
                            <SelectContent>
                                {initialPrograms.map(p => (
                                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>



                    {/* Search */}
                    <div className="relative w-28 shrink-0 ml-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                        <Input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar…"
                            className="pl-7 h-7 text-xs rounded border-border/40" />
                    </div>

                    {/* Time slot filter */}
                    <div className="w-32 shrink-0">
                        <Select value={timeSlot} onValueChange={setTimeSlot}>
                            <SelectTrigger className="w-full h-7 text-xs rounded border-border/40 font-semibold py-0">
                                <SelectValue placeholder="Horario…" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">Todos los horarios</SelectItem>
                                {uniqueSlots.map(slot => {
                                    const [s, e] = slot.split(" – ");
                                    return (
                                        <SelectItem key={slot} value={slot} className="text-xs">
                                            {toFormat12h(s)} – {toFormat12h(e)}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                </div>

                {/* Row 2: Actions */}
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border/20">
                    {/* Group info */}
                    {activeGroup && (
                        <div className="flex items-center gap-2 pr-1 shrink-0">
                            <span className="text-xs font-black truncate max-w-[120px]">{activeGroup.name}</span>
                            <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 bg-primary/8 text-primary border border-primary/15 shrink-0">
                                {activeGroup.period?.name ?? "Sin Periodo"}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 shrink-0">
                                <Clock className="w-3.5 h-3.5" />{toFormat12h(activeGroup.startTime)}–{toFormat12h(activeGroup.endTime)}
                            </span>
                        </div>
                    )}
                    {activeGroup && <div className="w-px h-4 bg-border/40 mx-1 shrink-0" />} {/* Divider */}

                    {/* Toggle Left Sidebar */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={showLeftSidebar ? "outline" : "secondary"}
                                size="icon"
                                onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                                className={`h-7 w-7 rounded shrink-0 ${showLeftSidebar ? 'border-border/40 text-primary' : 'border-transparent text-muted-foreground'}`}
                            >
                                <PanelLeft className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start">
                            <p className="text-xs">{showLeftSidebar ? "Ocultar Grupos" : "Mostrar Grupos"}</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Toggle Right Sidebar */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={showRightSidebar ? "outline" : "secondary"}
                                size="icon"
                                onClick={() => setShowRightSidebar(!showRightSidebar)}
                                className={`h-7 w-7 rounded shrink-0 ${showRightSidebar ? 'border-border/40 text-primary' : 'border-transparent text-muted-foreground'}`}
                            >
                                <PanelRight className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start">
                            <p className="text-xs">{showRightSidebar ? "Ocultar Materias" : "Mostrar Materias"}</p>
                        </TooltipContent>
                    </Tooltip>

                    <div className="w-px h-4 bg-border/40 mx-1 shrink-0" /> {/* Divider */}

                    <ScheduleToolbars
                        zoomLevel={zoomLevel}
                        setZoomLevel={setZoomLevel}
                        setTeacherOverviewOpen={setTeacherOverviewOpen}
                        setEnvOverviewOpen={setEnvOverviewOpen}
                        setPeriodOverviewOpen={setPeriodOverviewOpen}
                        setIsEventModalOpen={setIsEventModalOpen}
                        setIsAnalyticsModalOpen={setIsAnalyticsModalOpen}
                        setIsSettingsModalOpen={setIsSettingsModalOpen}
                        schedulesPublished={schedulesPublished}
                        setPublishConfirmOpen={setPublishConfirmOpen}
                        isDirty={isDirty}
                        pendingChangesLength={pendingChanges.length}
                        isSaving={isSaving}
                        handleDiscard={handleDiscard}
                        handleSaveAll={handleSaveAll}
                        isSaveDisabled={isScheduleBlocked}
                        handleExportExcel={handleExportExcel}
                        isExportingExcel={isExportingExcel}
                    />
                </div>
            </div>

            {/* ── BODY: 3-pane flex row — fills remaining height exactly ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* LEFT: Groups list */}
                <div className={`w-40 shrink-0 border-r border-border/30 bg-card flex-col min-h-0 ${showLeftSidebar ? 'flex' : 'hidden'}`}>
                    {/* Panel header */}
                    <div className="px-2 py-1 border-b border-border/20 flex items-center gap-1 shrink-0">
                        <Users className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                            Grupos ({filtered.length})
                        </span>
                    </div>
                    {/* Scrollable list — only this panel scrolls if needed */}
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-1 min-h-0">
                        {filtered.map(g => {
                            const sel  = activeGroup?.id === g.id;
                            const th   = gc(g.id);
                            const totalPeriodCourses = g.period?.courses.length ?? 0;
                            const scheduledCount     = g.courses.length;
                            const teacherAssigned    = g.courses.filter(c => c.teacherId !== null).length;
                            const allScheduled       = totalPeriodCourses > 0 && scheduledCount >= totalPeriodCourses;
                            const allTeachers        = scheduledCount > 0 && teacherAssigned === scheduledCount;
                            const fullyDone          = allScheduled && allTeachers;
                            const partiallyDone      = allScheduled && !allTeachers; // courses done but teachers missing
                            const pct                = totalPeriodCourses
                                ? Math.min(100, Math.round(scheduledCount / totalPeriodCourses * 100)) : 0;
                            const groupTotalMins = g.courses.reduce((sum, c) => sum + c.schedules.reduce((acc, s) => acc + toMin(s.endTime) - toMin(s.startTime), 0), 0);

                            return (
                                <div key={g.id} onClick={() => handleGroupFocus(g.id)}
                                    style={{ borderColor: sel ? th.solid : "transparent" }}
                                    className={`p-1.5 rounded-lg border-2 cursor-pointer transition-all duration-150 ${
                                        sel ? "bg-primary/5" : "hover:bg-muted/20"
                                    }`}>
                                    {/* Name + status icon */}
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-[10px] font-black truncate">{g.name}</span>
                                        {fullyDone
                                            ? <Tooltip><TooltipTrigger asChild><span><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /></span></TooltipTrigger><TooltipContent><p>Todo listo</p></TooltipContent></Tooltip>
                                            : partiallyDone
                                                ? <Tooltip><TooltipTrigger asChild><span><AlertCircle className="w-3 h-3 text-amber-400 shrink-0" /></span></TooltipTrigger><TooltipContent><p>Faltan docentes</p></TooltipContent></Tooltip>
                                                : null
                                        }
                                    </div>
                                    {/* Scheduled hours & Total Programmed */}
                                    <div className="flex items-center justify-between mt-0.5">
                                        <div className="flex items-center gap-0.5">
                                            <Clock className="w-2.5 h-2.5 text-muted-foreground/60 shrink-0" />
                                            <span className="text-[8px] font-bold" style={{ color: th.solid }}>
                                                {toFormat12h(g.startTime)} – {toFormat12h(g.endTime)}
                                            </span>
                                        </div>
                                        <div className="text-[8px] font-bold text-muted-foreground bg-muted px-1 rounded-sm">
                                            {formatMins(groupTotalMins)}
                                        </div>
                                    </div>
                                    {/* Period name */}
                                    <div className="flex items-center justify-between text-[8px] text-muted-foreground truncate mt-0.5">
                                        <Tooltip><TooltipTrigger asChild><span className="truncate flex-1">
                                                                                    {g.period?.name ?? "Sin Periodo"}
                                                                                </span></TooltipTrigger><TooltipContent><p>{g.period?.name ?? "Sin Periodo"}</p></TooltipContent></Tooltip>
                                        {g.environment && (
                                            <Tooltip><TooltipTrigger asChild><span className="text-primary font-bold ml-1 truncate shrink-0 max-w-[60px]">
                                                                                            {g.environment.name}
                                                                                        </span></TooltipTrigger><TooltipContent><p>{g.environment.name}</p></TooltipContent></Tooltip>
                                        )}
                                    </div>
                                    {/* Progress bar */}
                                    <div className="mt-1 h-0.5 rounded-full bg-border/40 overflow-hidden">
                                        <div style={{ width: `${pct}%`, backgroundColor: fullyDone ? "rgb(16 185 129)" : partiallyDone ? "rgb(245 158 11)" : th.solid, transition: "width 0.35s ease" }}
                                            className="h-full rounded-full" />
                                    </div>
                                    {/* Counters */}
                                    <div className="flex items-center justify-between mt-0.5">
                                        <span className="text-[7px] text-muted-foreground">
                                            {scheduledCount}/{totalPeriodCourses} mat.
                                        </span>
                                        <span className="text-[7px]" style={{ color: allTeachers ? "rgb(16 185 129)" : "rgb(161 161 170)" }}>
                                            {teacherAssigned}/{scheduledCount} doc.
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* CENTER: Calendar — fills remaining width and height, vertically scrollable */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
                    {filteredGroups.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-8">
                            <div className="p-3 bg-primary/5 rounded-full border border-primary/10 animate-pulse">
                                <Calendar className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-extrabold">No hay Grupos</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {search || timeSlot !== "all" 
                                        ? "No se encontraron grupos que coincidan con los filtros aplicados." 
                                        : "Elige otro programa o crea grupos para comenzar."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-6 custom-scrollbar">
                            {sortedSlotKeys.map(slotKey => {
                                const list = groupsBySlot[slotKey];
                                if (!list || !list.length) return null;
                                return (
                                    <div key={slotKey} className="space-y-3">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-background/90 border-y border-border/20">
                        <Clock className="w-3 h-3 text-primary shrink-0" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                                                Horario: {(() => { const [s, e] = slotKey.split(" – "); return `${toFormat12h(s)} – ${toFormat12h(e)}`; })()} ({list.length} {list.length === 1 ? "grupo" : "grupos"})
                                            </span>
                                        </div>
                                        <div
                                            className="flex flex-row gap-5 pl-5 pr-5 pb-3 overflow-x-auto"
                                            style={{ cursor: "grab", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollPaddingLeft: "1.25rem" }}
                                            onMouseDown={onDragScrollMouseDown}
                                            onMouseMove={onDragScrollMouseMove}
                                            onMouseUp={onDragScrollEnd}
                                            onMouseLeave={onDragScrollEnd}
                                        >
                                            {list.map(g => {
                                                const isFocused = activeGroup?.id === g.id;
                                                const th = gc(g.id);
                                                const groupTotalMins = g.courses.reduce((sum, c) => sum + c.schedules.reduce((acc, s) => acc + toMin(s.endTime) - toMin(s.startTime), 0), 0);

                                                return (
                                                    <div
                                                        key={g.id}
                                                        id={`group-cal-${g.id}`}
                                                        onClick={() => setGroupId(g.id)}
                                                        style={{
                                                            borderColor: isFocused ? th.solid : undefined,
                                                            scrollSnapAlign: "start",
                                                            flexShrink: 0,
                                                            width: zoomLevel === 1 ? "calc(100% - 2.5rem)" : 
                                                                   zoomLevel === 2 ? "calc(50% - 1.875rem)" : 
                                                                   zoomLevel === 3 ? "calc(33.333% - 1.666rem)" : 
                                                                   "calc(25% - 1.5625rem)"
                                                        }}
                                                        className={`flex flex-col bg-card rounded-xl border-2 shadow-xs overflow-hidden transition-all duration-200 cursor-pointer ${
                                                            isFocused ? "ring-2 ring-primary/8 shadow-md border-primary" : "border-border/30 hover:border-border/60 hover:shadow-xs"
                                                        }`}
                                                    >
                                                        {/* Header of the Group Card */}
                                                        <div className="flex flex-col border-b border-border/15 bg-muted/10 shrink-0 select-none">
                                                            <div className="flex items-center justify-between px-4 py-2">
                                                                <div className="flex items-center gap-2.5">
                                                                    <span className="text-sm font-black uppercase tracking-tight">{g.name}</span>
                                                                    <div className="shrink-0">
                                                                        <div className="h-5 px-2 py-0 text-[9px] font-bold bg-primary/8 text-primary border border-primary/20 rounded-md flex items-center">
                                                                            {(() => {
                                                                                const pendingPeriod = pendingChanges.find(ch => ch.type === "ASSIGN_PERIOD" && ch.groupId === g.id) as Extract<PendingChange, { type: "ASSIGN_PERIOD" }> | undefined;
                                                                                const currentPeriodId = pendingPeriod ? pendingPeriod.periodId : g.periodId;
                                                                                const period = localPrograms.find(p => p.groups.some(gr => gr.id === g.id))?.periods.find(per => per.id === currentPeriodId);
                                                                                return period ? period.name : "Sin Periodo";
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                                                                        Total: {formatMins(groupTotalMins)}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                                                                        <Clock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                                                        <span>{toFormat12h(g.startTime)} – {toFormat12h(g.endTime)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Environment Selector Bar */}
                                                            <div className="px-4 pb-2 pt-1 border-t border-border/5 flex items-center justify-between gap-4">
                                                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground min-w-0 flex-1">
                                                                    <span className="shrink-0">Ambiente:</span>
                                                                    {g.environment ? (
                                                                        <Tooltip><TooltipTrigger asChild><span className="text-primary font-bold bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded-md text-[8.5px] truncate">
                                                                                                                                                    {g.environment.name}
                                                                                                                                                </span></TooltipTrigger><TooltipContent><p>{`${g.environment.name} (${g.environment.location || "S/U"})`}</p></TooltipContent></Tooltip>
                                                                    ) : (
                                                                        <span className="text-muted-foreground/60 italic text-[9px]">Sin asignar</span>
                                                                    )}
                                                                </div>
                                                                <div className="w-36 shrink-0" onClick={e => e.stopPropagation()}>
                                                                    <Select
                                                                        value={g.environmentId || "none"}
                                                                        onValueChange={(val) => handleAssignEnvironment(g.id, val === "none" ? null : val)}
                                                                    >
                                                                        <SelectTrigger className="h-5 text-[9px] rounded-md border-border/40 font-medium py-0 px-2 bg-background/50 hover:bg-background transition-colors focus:ring-0 focus:ring-offset-0">
                                                                            <SelectValue placeholder="Asignar ambiente..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none" className="text-[9px]">Sin ambiente</SelectItem>
                                                                            {getAvailableEnvironments(g.id, g.environmentId).map(env => (
                                                                                <SelectItem key={env.id} value={env.id} className="text-[9px]">
                                                                                    {env.name} (Cap: {env.capacity})
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Calendar Grid Body */}
                                                        <div className="h-[300px] relative overflow-hidden bg-background/40 shrink-0">
                                                            {renderCalendarForGroup(g)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* RIGHT: Pending courses */}
                {activeGroup && (
                    <div className={`w-40 shrink-0 border-l border-border/30 bg-card flex-col min-h-0 ${showRightSidebar ? 'flex' : 'hidden'}`}>
                        <div className="px-2 py-1 border-b border-border/20 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1">
                                <GraduationCap className="w-2.5 h-2.5 text-primary" />
                                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Materias</span>
                            </div>
                            <Badge className="text-[7px] font-black px-1 py-0 bg-primary/8 text-primary border border-primary/15">
                                {pendingCourses.length}
                            </Badge>
                        </div>

                        <div className="flex-1 overflow-y-auto p-1.5 space-y-1 min-h-0">
                            {pendingCourses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-center">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <span className="text-[9px] font-bold text--600 dark:text--400">¡Completado!</span>
                                    <span className="text-[8px] text-muted-foreground leading-snug">Todas programadas.</span>
                                </div>
                            ) : (
                                <>
                                    <p className="text-[7.5px] text-muted-foreground italic px-0.5">Arrastra al calendario o clic para programar.</p>
                                    {pendingCourses.map(course => {
                                        const PndIcon = getCourseIcon(course.title);
                                        const eligibleTeachers = allTeachers.filter(t => t.qualifiedCourses?.some(qc => qc.title === course.title));

                                        const gS = activeGroup ? toMin(activeGroup.startTime) : 0;
                                        const gE = activeGroup ? toMin(activeGroup.endTime) : 0;
                                        
                                        const fullyEligibleTeachers = eligibleTeachers.map(t => {
                                            const overlappingAvails = (t.availabilities || []).filter(av => {
                                                const aS = toMin(av.startTime);
                                                const aE = toMin(av.endTime);
                                                return Math.max(aS, gS) < Math.min(aE, gE);
                                            });
                                            return { ...t, overlappingAvails };
                                        }).filter(t => t.overlappingAvails.length > 0);

                                        const dayLabels: Record<string, string> = { MONDAY: "Lun", TUESDAY: "Mar", WEDNESDAY: "Mié", THURSDAY: "Jue", FRIDAY: "Vie", SATURDAY: "Sáb", SUNDAY: "Dom" };

                                        return (
                                            <Tooltip key={course.id} delayDuration={300}>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        draggable
                                                        onDragStart={e => {
                                                            e.dataTransfer.setData("text/plain", JSON.stringify({ courseId: course.id, title: course.title }));
                                                            e.dataTransfer.effectAllowed = "move";
                                                        }}
                                                        onClick={() => {
                                                            setDlgGroupId(activeGroup.id); setDlgTitle(course.title);
                                                            setDlgDay("MONDAY"); setDlgStart(activeGroup.startTime);
                                                            setDlgEnd(activeGroup.endTime); setDlgTeacher(""); setDlgOpen(true);
                                                            setLoadingT(true);
                                                            getQualifiedTeachersAction(programId, course.title)
                                                                .then(setTeachers).catch(() => {}).finally(() => setLoadingT(false));
                                                        }}
                                                        className="p-1.5 bg-muted/5 border border-border/40 hover:border-primary/40 rounded-lg cursor-pointer transition-all duration-100 flex items-center justify-between group gap-1.5"
                                                    >
                                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                            <PndIcon className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                                                            <Tooltip><TooltipTrigger asChild><span className="text-[9px] font-bold truncate">{course.title}</span></TooltipTrigger><TooltipContent><p>{course.title}</p></TooltipContent></Tooltip>
                                                        </div>
                                                        <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" align="center" className="w-56 p-3 bg-card border-border/50 shadow-xl z-[60]">
                                                    <p className="text-[11px] font-black mb-2 text-foreground flex items-center gap-1.5">
                                                        <Users className="w-3.5 h-3.5 text-primary" />
                                                        Docentes Habilitados
                                                    </p>
                                                    {fullyEligibleTeachers.length > 0 ? (
                                                        <div className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto pr-1 scrollbar-thin">
                                                            {fullyEligibleTeachers.map(t => {
                                                                const days = Array.from(new Set(t.overlappingAvails.map((av: any) => av.dayOfWeek)));
                                                                return (
                                                                    <div key={t.id} className="flex items-start gap-2 p-1.5 bg-muted/30 hover:bg-muted/50 transition-colors rounded-md border border-border/30">
                                                                        <div className="w-5 h-5 rounded flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold text-[9px] shrink-0 mt-0.5">
                                                                            {getInitials(t.name)}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1 leading-tight">
                                                                            <Tooltip><TooltipTrigger asChild><div className="text-[10px] font-bold text-foreground truncate">{t.name}</div></TooltipTrigger><TooltipContent><p>{t.name || ""}</p></TooltipContent></Tooltip>
                                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                                {days.map((d: any) => (
                                                                                    <span key={d} className="text-[8px] px-1 py-0.5 rounded bg-primary/20 text-primary font-bold leading-none">{dayLabels[d]}</span>
                                                                                ))}
                                                                            </div>
                                                                            <div className="flex items-center gap-1 mt-1">
                                                                                {t.availabilityLocked && t.qualifiedCoursesLocked ? (
                                                                                    <span className="text-[8px] font-semibold text-emerald-500 flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5"/> Listo</span>
                                                                                ) : (
                                                                                    <span className="text-[8px] font-semibold text-destructive flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5"/> Borrador</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center p-3 text-center bg-muted/20 rounded border border-dashed border-border/50">
                                                            <span className="text-[10px] text-muted-foreground font-medium">Ningún docente aplica al horario del grupo con esta materia habilitada.</span>
                                                        </div>
                                                    )}
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── TEACHER OVERVIEW DIALOG ── */}
            <Dialog open={teacherOverviewOpen} onOpenChange={setTeacherOverviewOpen}>
                <DialogContent className="w-screen max-w-none sm:max-w-none h-screen max-h-none top-0 left-0 translate-x-0 translate-y-0 rounded-none border-none flex flex-col p-0 overflow-hidden gap-0 bg-background">

                    {/* ── Fixed Header ── */}
                    <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            {/* Title */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/30 shrink-0">
                                    <Users className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-black text-foreground leading-tight flex items-center gap-2">
                                        <span>Vista de Horarios de Docentes</span>
                                        <div className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full border border-border/40 shrink-0">
                                            {overviewPeriods.hasMorning && (
                                                <Tooltip><TooltipTrigger asChild><span className="inline-flex">
                                                                                                        <Cloud className="w-3 h-3 text-sky-500 dark:text-sky-400 fill-sky-500/10" />
                                                                                                    </span></TooltipTrigger><TooltipContent><p>Mañana activa</p></TooltipContent></Tooltip>
                                            )}
                                            {overviewPeriods.hasAfternoon && (
                                                <Tooltip><TooltipTrigger asChild><span className="inline-flex">
                                                                                                        <Sun className="w-3 h-3 text-amber-500 dark:text-amber-400 fill-amber-500/10" />
                                                                                                    </span></TooltipTrigger><TooltipContent><p>Tarde activa</p></TooltipContent></Tooltip>
                                            )}
                                            {overviewPeriods.hasNight && (
                                                <Tooltip><TooltipTrigger asChild><span className="inline-flex">
                                                                                                        <Moon className="w-3 h-3 text-indigo-500 dark:text-indigo-400 fill-indigo-500/10" />
                                                                                                    </span></TooltipTrigger><TooltipContent><p>Noche activa</p></TooltipContent></Tooltip>
                                            )}
                                        </div>
                                    </DialogTitle>
                                    <DialogDescription className="text-[11px] text-muted-foreground mt-0">
                                        Distribución semanal · Detección automática de cruces de horario
                                    </DialogDescription>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Legend */}
                                <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground border border-border/50 rounded-lg px-3 py-1.5 bg-muted/30">
                                    <span className="flex items-center gap-1">
                                        <Cloud className="w-3 h-3 text-sky-500" /> Mañana
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Sun className="w-3 h-3 text-amber-500" /> Tarde
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Moon className="w-3 h-3 text-indigo-500" /> Noche
                                    </span>
                                </div>
                                {/* Program Filter */}
                                <div className="w-48 shrink-0">
                                    <Select value={overviewProgramFilter} onValueChange={overviewProgramFilter => {
                                        setOverviewProgramFilter(overviewProgramFilter);
                                        // Reset selected individual teachers when changing program filter to avoid hidden selections
                                        setSelectedTeacherIds([]);
                                    }}>
                                        <SelectTrigger className="h-8 text-[11px] rounded-lg bg-background border-border text-foreground font-semibold">
                                            <SelectValue placeholder="Filtrar por programa..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="text-[11px]">Todos los programas</SelectItem>
                                            {localPrograms.map(p => (
                                                <SelectItem key={p.id} value={p.id} className="text-[11px] font-medium max-w-[220px] truncate">
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Toggles */}
                                <div className="flex items-center gap-3 border border-border/50 rounded-lg px-3 h-8 bg-muted/10">
                                    <div className="flex items-center gap-1.5">
                                        <Switch 
                                            checked={overviewShowAvailability} 
                                            onCheckedChange={setOverviewShowAvailability} 
                                            id="toggle-avail" 
                                            className="scale-75"
                                        />
                                        <Label htmlFor="toggle-avail" className="text-[10px] cursor-pointer text-muted-foreground font-medium">Disponibilidad</Label>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Switch 
                                            checked={overviewShowAssignments} 
                                            onCheckedChange={setOverviewShowAssignments} 
                                            id="toggle-assign" 
                                            className="scale-75"
                                        />
                                        <Label htmlFor="toggle-assign" className="text-[10px] cursor-pointer text-muted-foreground font-medium">Clases</Label>
                                    </div>
                                </div>
                                {/* Search */}
                                <div className="relative w-44 shrink-0">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input
                                        value={overviewSearch}
                                        onChange={e => setOverviewSearch(e.target.value)}
                                        placeholder="Buscar docente..."
                                        className="pl-8 h-8 text-xs rounded-lg bg-background border-border"
                                    />
                                </div>
                                {/* Reset filter */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedTeacherIds([]);
                                        setOverviewProgramFilter("all");
                                        setOverviewSearch("");
                                    }}
                                    className="h-8 text-[10px] rounded-lg px-3 font-bold border-border hover:bg-accent"
                                >
                                    Limpiar Filtros
                                </Button>
                            </div>
                        </div>

                        {/* Teacher pill filters */}
                        <div className="mt-3 flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto pb-1">
                            {allTeachers.map(t => {
                                const isSelected = selectedTeacherIds.includes(t.id);
                                const initials = getInitials(t.name);
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            setSelectedTeacherIds(prev =>
                                                prev.includes(t.id)
                                                    ? prev.filter(id => id !== t.id)
                                                    : [...prev, t.id]
                                            );
                                        }}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-full border transition-all flex items-center gap-1.5 ${
                                            isSelected
                                                ? "bg-primary border-primary text-primary-foreground shadow-sm"
                                                : "bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground hover:border-primary/40"
                                        }`}
                                    >
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 ${
                                            isSelected ? "bg-white/20" : "bg-muted"
                                        }`}>
                                            {initials}
                                        </span>
                                        {t.name || t.email}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Scrollable Grid ── */}
                    <div className="flex-1 overflow-auto min-h-0">
                        {(() => {
                            const visibleTeachers = visibleTeachersForOverview;

                            if (visibleTeachers.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                                            <Users className="w-7 h-7 text-muted-foreground/40" />
                                        </div>
                                        <h4 className="text-sm font-bold text-foreground">Sin docentes</h4>
                                        <p className="text-xs text-muted-foreground mt-1">Ajusta los filtros de búsqueda.</p>
                                    </div>
                                );
                            }

                            return (
                                <table className="w-full border-collapse text-left text-[10px]">
                                    {/* Sticky thead */}
                                    <thead className="sticky top-0 z-30">
                                        <tr className="bg-muted/60 backdrop-blur-sm border-b-2 border-border">
                                            <th className="p-3 font-black text-xs text-foreground border border-border/80 w-52 min-w-[13rem] sticky left-0 z-40 bg-muted/95 backdrop-blur-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                <div className="flex items-center justify-between">
                                                    <span>Docente</span>
                                                    <div className="flex items-center gap-1 shrink-0 bg-background/55 border border-border/40 px-1.5 py-0.5 rounded-md">
                                                        {overviewPeriods.hasMorning && (
                                                            <Tooltip><TooltipTrigger asChild><span className="inline-flex">
                                                                                                                            <Cloud className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 fill-sky-500/10" />
                                                                                                                        </span></TooltipTrigger><TooltipContent><p>Mañana</p></TooltipContent></Tooltip>
                                                        )}
                                                        {overviewPeriods.hasAfternoon && (
                                                            <Tooltip><TooltipTrigger asChild><span className="inline-flex">
                                                                                                                            <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 fill-amber-500/10" />
                                                                                                                        </span></TooltipTrigger><TooltipContent><p>Tarde</p></TooltipContent></Tooltip>
                                                        )}
                                                        {overviewPeriods.hasNight && (
                                                            <Tooltip><TooltipTrigger asChild><span className="inline-flex">
                                                                                                                            <Moon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 fill-indigo-500/10" />
                                                                                                                        </span></TooltipTrigger><TooltipContent><p>Noche</p></TooltipContent></Tooltip>
                                                        )}
                                                    </div>
                                                </div>
                                            </th>
                                            {DAYS.map(d => (
                                                <th key={d.value} className="p-3 font-black text-xs text-foreground border border-border/80 text-center min-w-[160px]">
                                                    {d.value === "MONDAY" ? "Lunes" :
                                                     d.value === "TUESDAY" ? "Martes" :
                                                     d.value === "WEDNESDAY" ? "Miércoles" :
                                                     d.value === "THURSDAY" ? "Jueves" :
                                                     d.value === "FRIDAY" ? "Viernes" :
                                                     d.value === "SATURDAY" ? "Sábado" : "Domingo"}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleTeachers.map((teacher, rowIdx) => {
                                            const assignments = getTeacherAssignments(teacher.id);
                                            const initials = getInitials(teacher.name);
                                            const totalMins = assignments.reduce((acc, a) => acc + (toMin(a.endTime) - toMin(a.startTime)), 0);
                                            const isEven = rowIdx % 2 === 0;

                                            return (
                                                <tr
                                                    key={teacher.id}
                                                    className={`border-b border-border/50 transition-colors hover:bg-primary/5 last:border-b-0 ${
                                                        isEven ? "bg-background" : "bg-muted/20"
                                                    }`}
                                                >
                                                    {/* Teacher info cell - Sticky Left */}
                                                    <td className={`p-3 border border-border/80 align-top w-52 min-w-[13rem] sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors ${
                                                        isEven ? "bg-background" : "bg-card/95"
                                                    }`}>
                                                        <Tooltip delayDuration={300}>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-start gap-2.5 cursor-help">
                                                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm">
                                                                        {initials}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <Tooltip><TooltipTrigger asChild><p className="font-extrabold text-foreground leading-tight truncate text-[13px]">
                                                                                                                                                    {teacher.name || "Sin Nombre"}
                                                                                                                                                </p></TooltipTrigger><TooltipContent><p>{teacher.name || "Sin Nombre"}</p></TooltipContent></Tooltip>
                                                                        <Tooltip><TooltipTrigger asChild><p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                                                                                                                                    {teacher.email}
                                                                                                                                                </p></TooltipTrigger><TooltipContent><p>{teacher.email}</p></TooltipContent></Tooltip>
                                                                        <div className="flex flex-col gap-1 mt-1.5">
                                                                            <Badge variant="outline" className={`text-[9px] px-1.5 h-4 flex items-center gap-1 w-max ${teacher.availabilityLocked ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                                                                                {teacher.availabilityLocked ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                                                                                Disp: {teacher.availabilityLocked ? "Ok" : "Falta"}
                                                                            </Badge>
                                                                            <Badge variant="outline" className={`text-[9px] px-1.5 h-4 flex items-center gap-1 w-max ${teacher.qualifiedCoursesLocked ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                                                                                {teacher.qualifiedCoursesLocked ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                                                                                Mats: {teacher.qualifiedCoursesLocked ? "Ok" : "Falta"}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TooltipTrigger>
                                                            
                                                            <TooltipContent 
                                                                side="right" 
                                                                align="start" 
                                                                className="w-64 p-3 bg-card border-border/50 shadow-xl z-[60]"
                                                            >
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="font-extrabold text-foreground leading-tight truncate text-[13px]">
                                                                        {teacher.name || "Sin Nombre"}
                                                                    </p>
                                                                    <p className="text-[11px] text-muted-foreground truncate mb-3">
                                                                        {teacher.email}
                                                                    </p>

                                                                    <div className="flex gap-1 mt-1.5 flex-wrap items-center">
                                                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50 font-semibold">
                                                                            {assignments.length} {assignments.length === 1 ? "clase" : "clases"}
                                                                        </span>
                                                                        {totalMins > 0 && (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
                                                                                {formatMins(totalMins)}
                                                                            </span>
                                                                        )}
                                                                        {assignments.length > 0 && (
                                                                            <span className="flex items-center gap-0.5 ml-0.5">
                                                                                {getPeriodIconsForAssignments(assignments)}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Publication Status */}
                                                                    <div className="mt-3 flex gap-2">
                                                                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 flex items-center gap-1 ${teacher.availabilityLocked ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                                                                            {teacher.availabilityLocked ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                                            Disponibilidad: {teacher.availabilityLocked ? "Publicada" : "En Borrador"}
                                                                        </Badge>
                                                                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 flex items-center gap-1 ${teacher.qualifiedCoursesLocked ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                                                                            {teacher.qualifiedCoursesLocked ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                                            Materias: {teacher.qualifiedCoursesLocked ? "Publicadas" : "En Borrador"}
                                                                        </Badge>
                                                                    </div>

                                                                    {/* Materias Habilitadas / Qualified Courses */}
                                                                    {teacher.qualifiedCourses && teacher.qualifiedCourses.length > 0 && (
                                                                        <div className="mt-3 pt-2.5 border-t border-border/10 space-y-1.5">
                                                                            <span className="text-[9px] font-bold text-muted-foreground/85 uppercase tracking-wider block">
                                                                                Materias Habilitadas:
                                                                            </span>
                                                                            <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto pr-1">
                                                                                {teacher.qualifiedCourses.map((qc: any) => (
                                                                                    <Tooltip key={qc.id}><TooltipTrigger asChild><span  className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 font-medium truncate max-w-[180px] inline-block">
                                                                                                                                                                            {qc.title}
                                                                                                                                                                        </span></TooltipTrigger><TooltipContent><p>{qc.title}</p></TooltipContent></Tooltip>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Disponibilidad Horaria */}
                                                                    {teacher.availabilities && teacher.availabilities.length > 0 && (
                                                                        <div className="mt-3 pt-2.5 border-t border-border/10 space-y-1.5">
                                                                            <span className="text-[9px] font-bold text-muted-foreground/85 uppercase tracking-wider block">
                                                                                Disponibilidad:
                                                                            </span>
                                                                            <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1 text-[11px]">
                                                                                {formatAvailabilities(teacher.availabilities)}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </td>

                                                    {/* Day cells */}
                                                    {DAYS.map(d => {
                                                        const dayAssigns = assignments
                                                            .filter(a => a.dayOfWeek === d.value)
                                                            .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));

                                                        const dayAvails = (teacher.availabilities || []).filter(av => av.dayOfWeek === d.value);
                                                        const hasAvailabilitiesSet = (teacher.availabilities || []).length > 0;

                                                        const hasOverlap = (idx: number) => {
                                                            const current = dayAssigns[idx];
                                                            const cs = toMin(current.startTime);
                                                            const ce = toMin(current.endTime);
                                                            return dayAssigns.some((item, i) => {
                                                                if (i === idx) return false;
                                                                return cs < toMin(item.endTime) && ce > toMin(item.startTime);
                                                            });
                                                        };

                                                        const cellHasConflict = dayAssigns.some((_, idx) => hasOverlap(idx));
                                                        const cellHasAvailConflict = dayAssigns.some(a => isOutsideAvailability(a, teacher.availabilities || []));

                                                        return (
                                                            <td
                                                                key={d.value}
                                                                className={`p-2 border border-border/80 align-top min-w-[160px] ${
                                                                    cellHasConflict
                                                                        ? "bg-destructive/5 dark:bg-destructive/10"
                                                                        : cellHasAvailConflict
                                                                        ? "bg-amber-500/5 dark:bg-amber-500/10"
                                                                        : ""
                                                                }`}
                                                            >
                                                                {/* Availability header inside day cell */}
                                                                {hasAvailabilitiesSet && overviewShowAvailability && (
                                                                    <div className="mb-1.5 pb-1 border-b border-border/10 flex flex-col gap-0.5 leading-none select-none">
                                                                        {dayAvails.length > 0 ? (
                                                                            <Tooltip><TooltipTrigger asChild><span className="text-[9px] font-bold text--600 dark:text--400 dark:text-emerald-400 flex items-center gap-0.5">
                                                                                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                                                                                                                            {dayAvails.map(av => `${toFormat12h(av.startTime)}–${toFormat12h(av.endTime)}`).join(", ")}
                                                                                                                                                        </span></TooltipTrigger><TooltipContent><p>Horario disponible para programar</p></TooltipContent></Tooltip>
                                                                        ) : (
                                                                            <Tooltip><TooltipTrigger asChild><span className="text-[9px] font-bold text-rose-500 dark:text-rose-400 flex items-center gap-0.5">
                                                                                                                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                                                                                                                                                No Disponible
                                                                                                                                                            </span></TooltipTrigger><TooltipContent><p>No disponible este día</p></TooltipContent></Tooltip>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {dayAssigns.length === 0 ? (
                                                                    <div className="text-center text-muted-foreground/25 py-4 select-none text-base font-light">·</div>
                                                                ) : (
                                                                    <div className="flex flex-col gap-1.5">
                                                                        {dayAssigns.map((a, idx) => {
                                                                            const conflicted = hasOverlap(idx);
                                                                            const availConflicted = isOutsideAvailability(a, teacher.availabilities || []);
                                                                            return (
                                                                                <div
                                                                                    key={a.id}
                                                                                    className={`p-2 rounded-xl border text-[10px] leading-tight shadow-sm transition-all hover:shadow-md flex flex-col gap-1 ${
                                                                                        conflicted
                                                                                            ? "bg-destructive/10 border-destructive/40 text-destructive dark:bg-destructive/20 dark:border-destructive/50 dark:text-red-300"
                                                                                            : availConflicted
                                                                                            ? "bg-amber-500/10 border-amber-500/40 text-amber-800 dark:bg-amber-500/20 dark:border-amber-500/50 dark:text-amber-200"
                                                                                            : "bg-card border-border/60 text-foreground hover:border-primary/40 hover:bg-primary/5"
                                                                                    }`}
                                                                                >
                                                                                    {/* Course title + time */}
                                                                                    <div className="flex items-start justify-between gap-1">
                                                                                        <Tooltip><TooltipTrigger asChild><span className="font-extrabold truncate flex-1 text-[11px]">
                                                                                                                                                                                    {a.courseTitle}
                                                                                                                                                                                </span></TooltipTrigger><TooltipContent><p>{a.courseTitle}</p></TooltipContent></Tooltip>
                                                                                        <span className="flex items-center gap-0.5 shrink-0">
                                                                                            {getPeriodIconsForAssignments([a])}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* Time badge */}
                                                                                    <div className="flex items-center gap-1">
                                                                                        <Clock className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                                                                                        <span className="font-semibold text-muted-foreground whitespace-nowrap">
                                                                                            {toFormat12h(a.startTime)}–{toFormat12h(a.endTime)}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* Group + program */}
                                                                                    <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-border/30">
                                                                                        <span className="text-muted-foreground truncate">
                                                                                            {a.groupName}
                                                                                        </span>
                                                                                        <span className="text-[8px] font-black uppercase text-primary/70 shrink-0 px-1 py-0.5 rounded bg-primary/10">
                                                                                            {getAcronym(a.programName)}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* Conflict warnings */}
                                                                                    {conflicted && (
                                                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-destructive/20 dark:bg-destructive/30 border border-destructive/30 text-destructive dark:text-red-300 text-[8px] font-black animate-pulse">
                                                                                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                                                                                            Cruce de horario
                                                                                        </div>
                                                                                    )}
                                                                                    {availConflicted && (
                                                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 dark:bg-amber-500/30 border border-amber-500/30 text--700 dark:text--300 dark:text-amber-300 text-[8px] font-black">
                                                                                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                                                                                            Fuera de disponibilidad
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            );
                        })()}
                    </div>

                    {/* ── Footer status bar ── */}
                    <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-2.5 flex items-center justify-between gap-4 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-4">
                            <span>
                                <span className="font-bold text-foreground">
                                    {allTeachers.filter(t => {
                                        const nameOrEmail = (t.name || t.email).toLowerCase();
                                        const matchesSearch = nameOrEmail.includes(overviewSearch.toLowerCase());
                                        const matchesSelection = selectedTeacherIds.length === 0 || selectedTeacherIds.includes(t.id);
                                        return matchesSearch && matchesSelection;
                                    }).length}
                                </span>{" "}docente(s) visibles
                            </span>
                            <span>
                                <span className="font-bold text-foreground">{allTeachers.length}</span> total
                            </span>
                            {selectedTeacherIds.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                                    {selectedTeacherIds.length} seleccionado(s)
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-destructive/20 border border-destructive/40 inline-block" />
                                Cruce de horario
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-primary/10 border border-primary/20 inline-block" />
                                Clase asignada
                            </span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── TRAINING ENVIRONMENTS OVERVIEW DIALOG ── */}
            <Dialog open={envOverviewOpen} onOpenChange={setEnvOverviewOpen}>
                <DialogContent className="w-screen max-w-none sm:max-w-none h-screen max-h-none top-0 left-0 translate-x-0 translate-y-0 rounded-none border-none flex flex-col p-0 overflow-hidden gap-0 bg-background">

                    {/* ── Fixed Header ── */}
                    <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            {/* Title */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 shadow-md shadow-indigo-500/30 shrink-0">
                                    <Building className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-black text-foreground leading-tight flex items-center gap-2">
                                        <span>Vista de Horarios de Ambientes</span>
                                    </DialogTitle>
                                    <DialogDescription className="text-[11px] text-muted-foreground mt-0">
                                        Distribución semanal por ambientes · Detección de sobrecupos/cruces
                                    </DialogDescription>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Legend */}
                                <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground border border-border/50 rounded-lg px-3 py-1.5 bg-muted/30">
                                    <span className="flex items-center gap-1">
                                        <Cloud className="w-3 h-3 text-sky-500" /> Mañana
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Sun className="w-3 h-3 text-amber-500" /> Tarde
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Moon className="w-3 h-3 text-indigo-500" /> Noche
                                    </span>
                                </div>
                                {/* Program Filter */}
                                <div className="w-48 shrink-0">
                                    <Select value={envProgramFilter} onValueChange={setEnvProgramFilter}>
                                        <SelectTrigger className="h-8 text-[11px] rounded-lg bg-background border-border text-foreground font-semibold">
                                            <SelectValue placeholder="Filtrar por programa..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="text-[11px]">Todos los programas</SelectItem>
                                            {localPrograms.map(p => (
                                                <SelectItem key={p.id} value={p.id} className="text-[11px] font-medium max-w-[220px] truncate">
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Search */}
                                <div className="relative w-44 shrink-0">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input
                                        value={envOverviewSearch}
                                        onChange={e => setEnvOverviewSearch(e.target.value)}
                                        placeholder="Buscar ambiente..."
                                        className="pl-8 h-8 text-xs rounded-lg bg-background border-border"
                                    />
                                </div>
                                {/* Reset filter */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedEnvIds([]);
                                        setEnvProgramFilter("all");
                                        setEnvOverviewSearch("");
                                    }}
                                    className="h-8 text-[10px] rounded-lg px-3 font-bold border-border hover:bg-accent"
                                >
                                    Limpiar Filtros
                                </Button>
                            </div>
                        </div>

                        {/* Environment pill filters */}
                        <div className="mt-3 flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto pb-1">
                            {initialEnvironments.map(env => {
                                const isSelected = selectedEnvIds.includes(env.id);
                                const initials = env.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
                                return (
                                    <button
                                        key={env.id}
                                        onClick={() => {
                                            setSelectedEnvIds(prev =>
                                                prev.includes(env.id)
                                                    ? prev.filter(id => id !== env.id)
                                                    : [...prev, env.id]
                                            );
                                        }}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-full border transition-all flex items-center gap-1.5 ${
                                            isSelected
                                                ? "bg-primary border-primary text-primary-foreground shadow-sm"
                                                : "bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground hover:border-primary/40"
                                        }`}
                                    >
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 ${
                                            isSelected ? "bg-white/20" : "bg-muted"
                                        }`}>
                                            {initials}
                                        </span>
                                        {env.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Scrollable Grid ── */}
                    <div className="flex-1 overflow-auto min-h-0">
                        {(() => {
                            const filteredEnvironments = initialEnvironments.filter(env => {
                                const matchesSearch = env.name.toLowerCase().includes(envOverviewSearch.toLowerCase()) || 
                                                      (env.location || "").toLowerCase().includes(envOverviewSearch.toLowerCase());
                                const matchesSelection = selectedEnvIds.length === 0 || selectedEnvIds.includes(env.id);
                                
                                let matchesProgram = true;
                                if (envProgramFilter !== "all") {
                                    const hasAssign = getEnvironmentAssignments(env.id).some(a => {
                                        const groupProg = localPrograms.find(p => p.name === a.programName);
                                        return groupProg?.id === envProgramFilter;
                                    });
                                    matchesProgram = hasAssign;
                                }
                                
                                return matchesSearch && matchesSelection && matchesProgram;
                            });

                            if (filteredEnvironments.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                                            <Building className="w-7 h-7 text-muted-foreground/40" />
                                        </div>
                                        <h4 className="text-sm font-bold text-foreground">Sin ambientes</h4>
                                        <p className="text-xs text-muted-foreground mt-1">Ajusta los filtros de búsqueda.</p>
                                    </div>
                                );
                            }

                            return (
                                <table className="w-full border-collapse text-left text-[10px]">
                                    {/* Sticky thead */}
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-muted/60 backdrop-blur-sm border-b-2 border-border">
                                            <th className="p-3 font-black text-xs text-foreground border-r border-border/50 w-52 min-w-[13rem] sticky left-0 z-20 bg-muted/95 backdrop-blur-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                Ambiente
                                            </th>
                                            {DAYS.map(d => (
                                                <th key={d.value} className="p-3 font-black text-xs text-foreground border-r border-border/30 last:border-r-0 text-center min-w-[160px]">
                                                    {d.value === "MONDAY" ? "Lunes" :
                                                     d.value === "TUESDAY" ? "Martes" :
                                                     d.value === "WEDNESDAY" ? "Miércoles" :
                                                     d.value === "THURSDAY" ? "Jueves" :
                                                     d.value === "FRIDAY" ? "Viernes" :
                                                     d.value === "SATURDAY" ? "Sábado" : "Domingo"}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredEnvironments.map((env, rowIdx) => {
                                            const assignments = getEnvironmentAssignments(env.id);
                                            const totalMins = assignments.reduce((acc, a) => acc + (toMin(a.endTime) - toMin(a.startTime)), 0);
                                            const isEven = rowIdx % 2 === 0;

                                            return (
                                                <tr
                                                    key={env.id}
                                                    className={`border-b border-border/30 transition-colors hover:bg-primary/5 last:border-b-0 ${
                                                        isEven ? "bg-background" : "bg-muted/20"
                                                    }`}
                                                >
                                                    {/* Environment info cell - Sticky Left */}
                                                    <td className={`p-3 border-r border-border/40 align-top w-52 min-w-[13rem] sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors ${
                                                        isEven ? "bg-background" : "bg-card/95"
                                                    }`}>
                                                        <Tooltip delayDuration={300}>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex flex-col gap-1.5 cursor-help">
                                                                    <div>
                                                                        <Tooltip><TooltipTrigger asChild><p className="font-extrabold text-foreground leading-tight text-[11px]">
                                                                                                                                                    {env.name}
                                                                                                                                                </p></TooltipTrigger><TooltipContent><p>{env.name}</p></TooltipContent></Tooltip>
                                                                        {env.location && (
                                                                            <Tooltip><TooltipTrigger asChild><p className="text-[9px] text-muted-foreground mt-0.5">
                                                                                                                                                            📍 {env.location}
                                                                                                                                                        </p></TooltipTrigger><TooltipContent><p>{env.location}</p></TooltipContent></Tooltip>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </TooltipTrigger>

                                                            <TooltipContent 
                                                                side="right" 
                                                                align="start" 
                                                                className="w-64 p-3 bg-card border-border/50 shadow-xl z-[60]"
                                                            >
                                                                <div className="flex flex-col gap-1.5">
                                                                    <div>
                                                                        <p className="font-extrabold text-foreground leading-tight text-[13px]">
                                                                            {env.name}
                                                                        </p>
                                                                        {env.location && (
                                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                                📍 {env.location}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <div className="flex gap-1.5 mt-2 flex-wrap items-center">
                                                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50 font-bold">
                                                                            Capacidad: {env.capacity}
                                                                        </span>
                                                                        {totalMins > 0 && (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
                                                                                {formatMins(totalMins)} programadas
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {env.resources && env.resources.length > 0 && (
                                                                        <div className="mt-3 pt-2.5 border-t border-border/10 space-y-1.5">
                                                                            <span className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider block">
                                                                                Recursos Disponibles:
                                                                            </span>
                                                                            <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto pr-1">
                                                                                {env.resources.map((res, rIdx) => (
                                                                                    <Tooltip key={rIdx}><TooltipTrigger asChild><span  className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 font-medium truncate max-w-[180px] inline-block">
                                                                                                                                                                            {res}
                                                                                                                                                                        </span></TooltipTrigger><TooltipContent><p>{res}</p></TooltipContent></Tooltip>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </td>

                                                    {/* Day cells */}
                                                    {DAYS.map(d => {
                                                        const dayAssigns = assignments
                                                            .filter(a => a.dayOfWeek === d.value)
                                                            .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));

                                                        const hasOverlap = (idx: number) => {
                                                            const current = dayAssigns[idx];
                                                            const cs = toMin(current.startTime);
                                                            const ce = toMin(current.endTime);
                                                            return dayAssigns.some((item, i) => {
                                                                if (i === idx) return false;
                                                                return cs < toMin(item.endTime) && ce > toMin(item.startTime);
                                                            });
                                                        };

                                                        const cellHasConflict = dayAssigns.some((_, idx) => hasOverlap(idx));

                                                        return (
                                                            <td
                                                                key={d.value}
                                                                className={`p-2 border-r border-border/20 last:border-r-0 align-top min-w-[160px] ${
                                                                    cellHasConflict ? "bg-destructive/5 dark:bg-destructive/10" : ""
                                                                }`}
                                                            >
                                                                {dayAssigns.length === 0 ? (
                                                                    <div className="text-center text-muted-foreground/25 py-4 select-none text-base font-light">·</div>
                                                                ) : (
                                                                    <div className="flex flex-col gap-1.5">
                                                                        {dayAssigns.map((a, idx) => {
                                                                            const conflicted = hasOverlap(idx);
                                                                            return (
                                                                                <div
                                                                                    key={a.id}
                                                                                    className={`p-2 rounded-xl border text-[9px] leading-tight shadow-sm transition-all hover:shadow-md flex flex-col gap-1 ${
                                                                                        conflicted
                                                                                            ? "bg-destructive/10 border-destructive/40 text-destructive dark:bg-destructive/20 dark:border-destructive/50 dark:text-red-300"
                                                                                            : "bg-card border-border/60 text-foreground hover:border-primary/40 hover:bg-primary/5"
                                                                                    }`}
                                                                                >
                                                                                    {/* Course title + shift icons */}
                                                                                    <div className="flex items-start justify-between gap-1">
                                                                                        <Tooltip><TooltipTrigger asChild><span className="font-extrabold truncate flex-1 text-[10px]">
                                                                                                                                                                                    {a.courseTitle}
                                                                                                                                                                                </span></TooltipTrigger><TooltipContent><p>{a.courseTitle}</p></TooltipContent></Tooltip>
                                                                                        <span className="flex items-center gap-0.5 shrink-0">
                                                                                            {getPeriodIconsForAssignments([a])}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* Time badge */}
                                                                                    <div className="flex items-center gap-1">
                                                                                        <Clock className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                                                                                        <span className="font-semibold text-muted-foreground whitespace-nowrap">
                                                                                            {toFormat12h(a.startTime)}–{toFormat12h(a.endTime)}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* Group + program */}
                                                                                    <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-border/30">
                                                                                        <span className="text-muted-foreground truncate">
                                                                                            {a.groupName}
                                                                                        </span>
                                                                                        <span className="text-[8px] font-black uppercase text-primary/70 shrink-0 px-1 py-0.5 rounded bg-primary/10">
                                                                                            {getAcronym(a.programName)}
                                                                                        </span>
                                                                                    </div>

                                                                                    {/* Overlap Warning */}
                                                                                    {conflicted && (
                                                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-destructive/20 dark:bg-destructive/30 border border-destructive/30 text-destructive dark:text-red-300 text-[8px] font-black animate-pulse">
                                                                                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                                                                                            Cruce de ambiente
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            );
                        })()}
                    </div>

                    {/* ── Footer status bar ── */}
                    <div className="shrink-0 border-t border-border bg-muted/30 px-6 py-2.5 flex items-center justify-between gap-4 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-4">
                            <span>
                                <span className="font-bold text-foreground">
                                    {initialEnvironments.filter(env => {
                                        const matchesSearch = env.name.toLowerCase().includes(envOverviewSearch.toLowerCase()) || 
                                                              (env.location || "").toLowerCase().includes(envOverviewSearch.toLowerCase());
                                        const matchesSelection = selectedEnvIds.length === 0 || selectedEnvIds.includes(env.id);
                                        
                                        let matchesProgram = true;
                                        if (envProgramFilter !== "all") {
                                            const hasAssign = getEnvironmentAssignments(env.id).some(a => {
                                                const groupProg = localPrograms.find(p => p.name === a.programName);
                                                return groupProg?.id === envProgramFilter;
                                            });
                                            matchesProgram = hasAssign;
                                        }
                                        return matchesSearch && matchesSelection && matchesProgram;
                                    }).length}
                                </span>{" "}ambiente(s) visibles
                            </span>
                            <span>
                                <span className="font-bold text-foreground">{initialEnvironments.length}</span> total
                            </span>
                            {selectedEnvIds.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                                    {selectedEnvIds.length} seleccionado(s)
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-destructive/20 border border-destructive/40 inline-block" />
                                Cruce de ambiente
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-primary/10 border border-primary/20 inline-block" />
                                Clase asignada
                            </span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>


            {/* ── DIALOG ── */}


            <Dialog open={dlgOpen} onOpenChange={o => {
                setDlgOpen(o);
                if (!o) { setDlgTitle(""); setDlgTeacher(""); setTeachers([]); setEditCourseId(""); }
            }}>
                <DialogContent className="max-w-[400px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-primary" /> {editCourseId ? "Editar Clase" : "Programar Clase"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">Define la franja horaria e instructor.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {/* Course */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Asignatura</Label>
                            {dlgTitle ? (
                                <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
                                    <span className="text-xs font-bold">{dlgTitle}</span>
                                </div>
                            ) : (
                                <Select value={dlgTitle} onValueChange={async v => {
                                    setDlgTitle(v); setLoadingT(true); setDlgTeacher("");
                                    try { setTeachers(await getQualifiedTeachersAction(programId, v)); }
                                    catch {} finally { setLoadingT(false); }
                                }}>
                                    <SelectTrigger className="h-8 text-xs rounded-lg">
                                        <SelectValue placeholder="Selecciona…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pendingCourses.map(c => (
                                            <SelectItem key={c.id} value={c.title} className="text-xs">{c.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Day & Time */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Día</Label>
                                <Select value={dlgDay} onValueChange={(v: any) => setDlgDay(v)}>
                                    <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-[160px]">
                                        {DAYS_FULL.map(d => <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Inicio</Label>
                                <Select value={dlgStart} onValueChange={handleStartChange}>
                                    <SelectTrigger className="h-8 text-xs rounded-lg px-2"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-[160px]">
                                        {getStartTimeOptions().map(t => (
                                            <SelectItem key={t} value={t} className="text-xs">{toFormat12h(t)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Fin</Label>
                                <Select value={dlgEnd} onValueChange={setDlgEnd}>
                                    <SelectTrigger className="h-8 text-xs rounded-lg px-2"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-[160px]">
                                        {getEndTimeOptions().map(t => (
                                            <SelectItem key={t} value={t} className="text-xs">{toFormat12h(t)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Teacher */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold flex justify-between">
                                <span>Profesor</span>
                                {loadingT && <span className="text-[9px] text-muted-foreground animate-pulse">Buscando…</span>}
                            </Label>
                            {(() => {
                                const filteredTeachers = teachers.filter((t: any) => {
                                    if (!t.availabilities || t.availabilities.length === 0) return false;
                                    const dayAvails = t.availabilities.filter((av: any) => av.dayOfWeek === dlgDay);
                                    if (dayAvails.length === 0) return false;
                                    if (!dlgStart || !dlgEnd) return false;
                                    const assignStart = toMin(dlgStart);
                                    const assignEnd = toMin(dlgEnd);
                                    return dayAvails.some((av: any) => {
                                        return assignStart >= toMin(av.startTime) && assignEnd <= toMin(av.endTime);
                                    });
                                });

                                return (
                                    <>
                                        <Select value={dlgTeacher} onValueChange={setDlgTeacher} disabled={loadingT || filteredTeachers.length === 0}>
                                            <SelectTrigger className="h-8 text-xs rounded-lg">
                                                <SelectValue placeholder={
                                                    loadingT ? "Cargando…" : filteredTeachers.length === 0 ? "Sin disponibles" : "Opcional"
                                                } />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[160px]">
                                                {filteredTeachers.map((t: any) => (
                                                    <SelectItem key={t.id} value={t.id} className="text-xs py-2">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold">{t.name || t.email}</span>
                                                            <span className="text-[8px] text-muted-foreground truncate max-w-[280px]">
                                                                {t.availabilities.map((av: any) =>
                                                                    `${DAYS_ES[av.dayOfWeek as DayOfWeek] || av.dayOfWeek} (${av.startTime}-${av.endTime})`
                                                                ).join(", ")}
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {!loadingT && teachers.length > 0 && filteredTeachers.length === 0 && (
                                            <div className="p-2 bg-amber-500/10 border border-amber-400/20 rounded-lg flex gap-1.5 items-start text-[9px] text--700 dark:text--300 dark:text-amber-300">
                                                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                                <span>Los docentes de esta asignatura no tienen disponibilidad en este horario.</span>
                                            </div>
                                        )}
                                        {!loadingT && teachers.length === 0 && (
                                            <div className="p-2 bg-amber-500/10 border border-amber-400/20 rounded-lg flex gap-1.5 items-start text-[9px] text--700 dark:text--300 dark:text-amber-300">
                                                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                                <span>Sin docentes calificados para <b>"{dlgTitle}"</b>.</span>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 border-t border-border/20 pt-3">
                        <Button variant="ghost" onClick={() => setDlgOpen(false)} className="rounded-xl h-8 text-xs">Cancelar</Button>
                        <Button onClick={editCourseId ? handleUpdate : handleInsert} disabled={loadingT} className="rounded-xl h-8 text-xs px-4">
                            {editCourseId ? "Guardar cambio" : "Agregar clase"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── PERIOD OVERVIEW MODAL ── */}
            {/* The inline implementation was moved to PeriodOverviewDialog.tsx */}

            {/* ── PUBLISH CONFIRMATION DIALOG ── */}
            <AlertDialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
                <AlertDialogContent className="max-w-sm rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            {schedulesPublished ? <Lock className="w-4 h-4 text-orange-500" /> : <Globe className="w-4 h-4 text-emerald-500" />}
                            {schedulesPublished ? "Cambiar a Borrador" : "Publicar Horarios"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                            {schedulesPublished 
                                ? "Al cambiar a borrador, los estudiantes y docentes ya no podrán ver estos horarios en sus paneles una vez que guardes los cambios." 
                                : "Al publicar los horarios, estos serán visibles para los estudiantes y docentes una vez que guardes los cambios."}
                        </AlertDialogDescription>

                        {!schedulesPublished && (
                            <div className="mt-4 flex flex-col gap-3 text-left">
                                <p className="text-xs font-semibold text--600 dark:text--400 dark:text-amber-400">
                                    Para publicar, es obligatorio definir las fechas del periodo:
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Fecha de Inicio</Label>
                                        <Input 
                                            type="date" 
                                            value={scheduleStartDate} 
                                            onChange={e => setScheduleStartDate(e.target.value)}
                                            className={`h-8 text-xs ${!scheduleStartDate ? "border-red-500/50 focus-visible:ring-red-500/30" : ""}`}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Fecha de Fin</Label>
                                        <Input 
                                            type="date" 
                                            value={scheduleEndDate} 
                                            onChange={e => setScheduleEndDate(e.target.value)}
                                            className={`h-8 text-xs ${!scheduleEndDate ? "border-red-500/50 focus-visible:ring-red-500/30" : ""}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-2">
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={!schedulesPublished && (!scheduleStartDate || !scheduleEndDate)}
                            onClick={() => {
                                const val = !schedulesPublished;
                                setSchedulesPublished(val);
                                setPendingChanges(prev => {
                                    const filtered = prev.filter(ch => ch.type !== "UPDATE_SETTINGS");
                                    return [...filtered, { type: "UPDATE_SETTINGS" as const, schedulesPublished: val, scheduleTitle, scheduleStartDate, scheduleEndDate } as any];
                                });
                            }}
                            className={`rounded-xl text-white ${schedulesPublished ? "bg-orange-500 hover:bg-orange-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── DELETE CONFIRMATION DIALOG ── */}
            <AlertDialog open={!!courseIdToDelete} onOpenChange={open => { if (!open) setCourseIdToDelete(null); }}>
                <AlertDialogContent className="max-w-sm rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-destructive" />
                            Eliminar clase
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                            Esta clase será eliminada del calendario.
                            El cambio <strong>no se guardará en la base de datos</strong> hasta que presiones
                            <strong> &quot;Guardar&quot;</strong>. Puedes descartar si cambias de opinión.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Eliminar clase
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <PeriodOverviewDialog
                open={periodOverviewOpen}
                onOpenChange={setPeriodOverviewOpen}
                programs={localPrograms}
                pendingChanges={pendingChanges}
                setPendingChanges={setPendingChanges}
            />

            <ScheduleEventDialog
                open={isEventModalOpen}
                onOpenChange={setIsEventModalOpen}
                globalStartDate={scheduleStartDate}
                globalEndDate={scheduleEndDate}
            />

            {/* Analytics Dialog */}
            <ScheduleAnalyticsDialog 
                open={isAnalyticsModalOpen} 
                onOpenChange={setIsAnalyticsModalOpen} 
                programs={localPrograms}
            />

            {/* Settings Dialog */}
            <ScheduleSettingsDialog
                open={isSettingsModalOpen}
                onOpenChange={setIsSettingsModalOpen}
                scheduleTitle={scheduleTitle}
                setScheduleTitle={setScheduleTitle}
                scheduleStartDate={scheduleStartDate}
                setScheduleStartDate={setScheduleStartDate}
                scheduleEndDate={scheduleEndDate}
                setScheduleEndDate={setScheduleEndDate}
                maxTeacherHours={maxTeacherHours}
                setMaxTeacherHours={setMaxTeacherHours}
                triggerSettingsChange={triggerSettingsChange}
            />
        </div>
        </>
    );
}

