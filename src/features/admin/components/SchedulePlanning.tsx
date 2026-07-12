"use client";

import { exportScheduleToExcel } from "../utils/exportScheduleExcel";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

import { TeacherOverviewDialog } from "@/features/admin/components/TeacherOverviewDialog";
import { EnvOverviewDialog } from "@/features/admin/components/EnvOverviewDialog";
import { PeriodOverviewDialog } from "@/features/admin/components/PeriodOverviewDialog";

import { ScheduleAnalyticsDialog } from "./ScheduleAnalyticsDialog";
import { TeacherAvailabilityView } from "@/features/schedule/components/TeacherAvailabilityView";
import { TeacherQualificationsView } from "@/features/teacher/components/TeacherQualificationsView";
import { ScheduleSettingsDialog } from "./ScheduleSettingsDialog";
import { ScheduleToolbars } from "./ScheduleToolbars";

import { LeftGroupsSidebar } from "./LeftGroupsSidebar";
import { RightCoursesSidebar } from "./RightCoursesSidebar";
import { CalendarGroupGrid } from "./CalendarGroupGrid";
import {
    useScheduleState,
    toMin,
    toStr,
    formatMins,
    isOutsideAvailability,
    toFormat12h,
    DAYS_ES,
    Program,
    TrainingEnvironment,
    PendingChange
} from "../hooks/useScheduleState";

// Days definitions
const DAYS_FULL: { value: DayOfWeek; label: string }[] = [
    { value: "MONDAY",    label: "Lunes" },
    { value: "TUESDAY",   label: "Martes" },
    { value: "WEDNESDAY", label: "Miércoles" },
    { value: "THURSDAY",  label: "Jueves" },
    { value: "FRIDAY",    label: "Viernes" },
    { value: "SATURDAY",  label: "Sábado" },
    { value: "SUNDAY",    label: "Domingo" },
];

const hue = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
    return Math.abs(h) % 360;
};

const gc = (id: string, isDark?: boolean) => {
    const h = hue(id);
    if (isDark) return { solid: `hsl(${h},70%,50%)`, bg: `hsl(${h},50%,14%)` };
    return { solid: `hsl(${h},70%,44%)`, bg: `hsl(${h},75%,94%)` };
};

const getInitials = (name: string | null) => {
    if (!name) return "NN";
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "NN";
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
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
    return NotebookTabs;
};

export function SchedulePlanning({
    initialPrograms,
    initialEnvironments = [],
    initialSchedulesPublished = false,
    initialScheduleTitle = "Horario Académico",
    initialScheduleStartDate = null,
    initialScheduleEndDate = null,
    initialMaxTeacherHours = 40,
    isObserver = false
}: {
    initialPrograms: Program[];
    initialEnvironments?: TrainingEnvironment[];
    initialSchedulesPublished?: boolean;
    initialScheduleTitle?: string;
    initialScheduleStartDate?: Date | null;
    initialScheduleEndDate?: Date | null;
    initialMaxTeacherHours?: number;
    isObserver?: boolean;
}) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Call custom hook
    const {
        localPrograms,
        pendingChanges,
        setPendingChanges,
        isDirty,
        isSaving,
        schedulesPublished,
        setSchedulesPublished,
        scheduleTitle,
        setScheduleTitle,
        scheduleStartDate,
        setScheduleStartDate,
        scheduleEndDate,
        setScheduleEndDate,
        maxTeacherHours,
        setMaxTeacherHours,

        // Selection & layout
        programId,
        setProgramId,
        groupId,
        setGroupId,
        search,
        setSearch,
        timeSlot,
        setTimeSlot,
        showLeftSidebar,
        setShowLeftSidebar,
        showRightSidebar,
        setShowRightSidebar,
        zoomLevel,
        setZoomLevel,

        // Derived variables
        program,
        filtered,
        activeGroup,
        allTeachers,
        draftTeachersForProgram,
        isScheduleBlocked,

        // Modals visibilities
        isAnalyticsModalOpen,
        setIsAnalyticsModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        publishConfirmOpen,
        setPublishConfirmOpen,

        isExportingExcel,

        // Dialog Schedule Add/Edit State
        dlgOpen,
        setDlgOpen,
        dlgGroupId,
        setDlgGroupId,
        dlgTitle,
        setDlgTitle,
        dlgDay,
        setDlgDay,
        dlgStart,
        setDlgStart,
        dlgEnd,
        setDlgEnd,
        dlgTeacher,
        setDlgTeacher,
        teachers,
        setTeachers,
        loadingT,
        editCourseId,
        editScheduleId,

        // Delete confirmation State
        itemToDelete,
        setItemToDelete,

        // Teacher overview modal states
        teacherOverviewOpen,
        setTeacherOverviewOpen,
        overviewShowAvailability,
        setOverviewShowAvailability,
        overviewShowAssignments,
        setOverviewShowAssignments,
        overviewSearch,
        setOverviewSearch,
        selectedTeacherIds,
        setSelectedTeacherIds,
        editingTeacherAvailabilityId,
        setEditingTeacherAvailabilityId,
        editingTeacherQualificationsId,
        setEditingTeacherQualificationsId,

        // Environment overview modal states
        envOverviewOpen,
        setEnvOverviewOpen,
        envOverviewSearch,
        setEnvOverviewSearch,
        selectedEnvIds,
        setSelectedEnvIds,

        // Period overview modal states
        periodOverviewOpen,
        setPeriodOverviewOpen,
        overviewPeriodProgramFilter,
        setOverviewPeriodProgramFilter,

        // Actions
        localMove,
        localInsert,
        localUpdate,
        confirmDelete,
        handleSaveAll,
        handleDiscard,
        handleExportExcel,
        handleGroupFocus,
        handleStartChange,
        getStartTimeOptions,
        getEndTimeOptions,
        openDlg,
        openEditDlg,
        handleUpdate,
        handleInsert,
        getAvailableEnvironments,
        handleAssignEnvironment,
        handleAssignPeriod,
        triggerSettingsChange,
        getQualifiedTeachersInMemory,
        checkTeacherAvailability,
        checkTeacherConflict,
        checkTeacherWeeklyHours,
        checkGroupConflict
    } = useScheduleState({
        initialPrograms,
        initialEnvironments,
        initialSchedulesPublished,
        initialScheduleTitle,
        initialScheduleStartDate,
        initialScheduleEndDate,
        initialMaxTeacherHours
    });

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

    const onDragScrollEnd = useCallback(() => {
        if (!dragScrollRef.current) return;
        dragScrollRef.current.el.style.cursor = "grab";
        dragScrollRef.current.el.style.userSelect = "";
        dragScrollRef.current = null;
    }, []);

    // Unique slot keys for the current program
    const uniqueSlots = useMemo(() => {
        return Array.from(
            new Set((program?.groups ?? []).map(g => `${g.startTime} – ${g.endTime}`))
        ).sort((a, b) => {
            const startA = toMin(a.split(" – ")[0]);
            const startB = toMin(b.split(" – ")[0]);
            if (startA !== startB) return startA - startB;
            const endA = toMin(a.split(" – ")[1]);
            const endB = toMin(b.split(" – ")[1]);
            return endA - endB;
        });
    }, [program?.groups]);

    const getPeriodIconsForAssignments = useCallback((assigns: Array<{ startTime: string; endTime: string }>) => {
        let hasMorning = false;
        let hasAfternoon = false;
        let hasNight = false;

        for (const a of assigns) {
            const s = toMin(a.startTime);
            const e = toMin(a.endTime);
            if (s < 720 && e > 0) hasMorning = true;
            if (s < 1080 && e > 720) hasAfternoon = true;
            if (s < 1440 && e > 1080) hasNight = true;
        }

        const icons: React.ReactNode[] = [];
        if (hasMorning) {
            icons.push(
                <Tooltip key="morning">
                    <TooltipTrigger asChild>
                        <span className="inline-flex shrink-0">
                            <Cloud className="w-3 h-3 text-sky-500 dark:text-sky-400 fill-sky-500/10" />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Mañana (06:00 a.m. – 12:00 p.m.)</p>
                    </TooltipContent>
                </Tooltip>
            );
        }
        if (hasAfternoon) {
            icons.push(
                <Tooltip key="afternoon">
                    <TooltipTrigger asChild>
                        <span className="inline-flex shrink-0">
                            <Sun className="w-3 h-3 text-amber-500 dark:text-amber-400 fill-amber-500/10" />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Tarde (12:00 p.m. – 06:00 p.m.)</p>
                    </TooltipContent>
                </Tooltip>
            );
        }
        if (hasNight) {
            icons.push(
                <Tooltip key="night">
                    <TooltipTrigger asChild>
                        <span className="inline-flex shrink-0">
                            <Moon className="w-3 h-3 text-indigo-500 dark:text-indigo-400 fill-indigo-500/10" />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Noche (06:00 p.m. – 12:00 a.m.)</p>
                    </TooltipContent>
                </Tooltip>
            );
        }
        return icons;
    }, []);

    const pendingCourses = useMemo(() => {
        if (!activeGroup?.period) return [];

        const liveGroup = localPrograms
            .flatMap(p => p.groups)
            .find(g => g.id === activeGroup.id);

        const accumulatedMins: Record<string, number> = {};
        if (liveGroup) {
            liveGroup.courses.forEach(c => {
                const title = c.title.toLowerCase().trim();
                if (!accumulatedMins[title]) accumulatedMins[title] = 0;
                const courseMins = c.schedules.reduce(
                    (acc, s) => acc + (toMin(s.endTime) - toMin(s.startTime)), 0
                );
                accumulatedMins[title] += courseMins;
            });
        }

        const seenTitles = new Set<string>();
        const uniqueCatalogCourses = activeGroup.period.courses.filter((c: any) => {
            const key = c.title.toLowerCase().trim();
            if (seenTitles.has(key)) return false;
            seenTitles.add(key);
            return true;
        });

        return uniqueCatalogCourses.map((catalogCourse: any) => {
            const title = catalogCourse.title.toLowerCase().trim();
            const programmedMins = accumulatedMins[title] || 0;
            const requiredMins = (catalogCourse.weeklyHours || 0) * 60;
            const remainingMins = Math.max(0, requiredMins - programmedMins);

            return {
                ...catalogCourse,
                programmedMins,
                requiredMins,
                remainingMins,
                isPending: requiredMins === 0 ? true : programmedMins < requiredMins,
                isOverScheduled: requiredMins > 0 && programmedMins > requiredMins
            };
        }).filter((c: any) => c.isPending || c.isOverScheduled);
    }, [activeGroup, localPrograms]);

    // Helper functions for teacher overview availability and qualified courses
    const formatAvailabilities = useCallback((availabilities: any[]) => {
        if (!availabilities || availabilities.length === 0) return null;
        
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
    }, []);

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

    const getActivePeriods = useCallback((assigns: any[]) => {
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
    }, []);

    const getSchedulePeriodStyles = useCallback((startTimeStr: string) => {
        const start = toMin(startTimeStr);
        if (start < 720) {
            return {
                gradient: "from-sky-500/10 via-sky-500/5 to-transparent dark:from-sky-500/15 dark:to-transparent border-sky-500/20 dark:border-sky-500/30",
                text: "text-sky-700 dark:text-sky-300",
                icon: Cloud,
                label: "Mañana"
            };
        } else if (start < 1080) {
            return {
                gradient: "from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:to-transparent border-amber-500/20 dark:border-amber-500/30",
                text: "text-amber-700 dark:text-amber-300",
                icon: Sun,
                label: "Tarde"
            };
        } else {
            return {
                gradient: "from-indigo-500/10 via-indigo-500/5 to-transparent dark:from-indigo-500/15 dark:to-transparent border-indigo-500/20 dark:border-indigo-500/30",
                text: "text-indigo-700 dark:text-indigo-300",
                icon: Moon,
                label: "Noche"
            };
        }
    }, []);

    const overviewPeriods = useMemo(() => getActivePeriods(visibleTeachersForOverview.flatMap(t => getTeacherAssignments(t.id))), [visibleTeachersForOverview, getTeacherAssignments, getActivePeriods]);

    const filteredEnvironments = useMemo(() => {
        return initialEnvironments.filter(env => {
            if (env.programId !== programId) return false;
            const matchesSearch = env.name.toLowerCase().includes(envOverviewSearch.toLowerCase()) || 
                                  (env.location || "").toLowerCase().includes(envOverviewSearch.toLowerCase());
            const matchesSelection = selectedEnvIds.length === 0 || selectedEnvIds.includes(env.id);
            return matchesSearch && matchesSelection;
        });
    }, [initialEnvironments, envOverviewSearch, selectedEnvIds, programId]);

    const sortedGroups = useMemo(() => [...(program?.groups ?? [])].sort((a, b) => {
        const startA = toMin(a.startTime);
        const startB = toMin(b.startTime);
        if (startA !== startB) return startA - startB;
        const endA = toMin(a.endTime);
        const endB = toMin(b.endTime);
        if (endA !== endB) return endA - endB;
        return a.name.localeCompare(b.name);
    }), [program?.groups]);

    const filteredGroups = useMemo(() => sortedGroups.filter(g => {
        const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
        const matchesSlot = timeSlot === "all" || `${g.startTime} – ${g.endTime}` === timeSlot;
        return matchesSearch && matchesSlot;
    }), [sortedGroups, search, timeSlot]);

    const groupsBySlot = useMemo(() => filteredGroups.reduce((acc, g) => {
        const slotKey = `${g.startTime} – ${g.endTime}`;
        if (!acc[slotKey]) acc[slotKey] = [];
        acc[slotKey].push(g);
        return acc;
    }, {} as Record<string, NonNullable<typeof program>["groups"]>), [filteredGroups, program]);

    const sortedSlotKeys = useMemo(() => Object.keys(groupsBySlot).sort((a, b) => {
        const timeA = toMin(a.split(" – ")[0]);
        const timeB = toMin(b.split(" – ")[0]);
        if (timeA !== timeB) return timeA - timeB;
        const endA = toMin(a.split(" – ")[1]);
        const endB = toMin(b.split(" – ")[1]);
        return endA - endB;
    }), [groupsBySlot]);



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
                <div id="drag-feedback-indicator" className="fixed pointer-events-none z-[9999] hidden items-center justify-center w-6 h-6 rounded-full shadow-md text-white font-black text-xs" style={{ transition: 'background-color 0.1s', transform: 'translate(-50%, -50%)' }}>
                    <span id="drag-check" className="hidden">✓</span>
                    <span id="drag-cross" className="hidden">✗</span>
                </div>
            {/* Bloqueo Estricto Banner */}
            {isScheduleBlocked && (
                <div className="bg-destructive/15 border-b border-destructive/20 p-2 px-4 flex items-center justify-between text-destructive shrink-0">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <div>
                            <h4 className="font-semibold text-sm">Programación Bloqueada</h4>
                            <p className="text-xs">
                                No puedes crear o modificar la programación porque hay <strong>{draftTeachersForProgram.length}</strong> profesor(es) en este programa que no han publicado su disponibilidad y materias.
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground h-7 text-xs" onClick={() => setTeacherOverviewOpen(true)}>
                        Ver Docentes
                    </Button>
                </div>
            )}

            {/* ── TOP BAR ── */}
            <div className="flex flex-col px-3 py-2 border-b border-border/30 bg-card shrink-0 min-h-0">
                {/* Row 1: Filters & Info */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 shrink-0 pr-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-xs font-black tracking-tight">Cronograma</span>
                    </div>

                    <div className="w-[350px] shrink-0">
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

                    <div className="relative w-28 shrink-0 ml-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                        <Input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar…"
                            className="pl-7 h-7 text-xs rounded border-border/40" />
                    </div>

                    <div className="w-40 shrink-0">
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
                {!isScheduleBlocked && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border/20">
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
                    {activeGroup && <div className="w-px h-4 bg-border/40 mx-1 shrink-0" />}

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                                className={`h-7 w-7 rounded shrink-0 transition-colors ${
                                    showLeftSidebar 
                                        ? 'border-border/40 bg-accent text-primary' 
                                        : 'border-transparent bg-transparent text-muted-foreground hover:bg-muted/50'
                                }`}
                            >
                                <PanelLeft className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start">
                            <p className="text-xs">{showLeftSidebar ? "Ocultar Grupos" : "Mostrar Grupos"}</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowRightSidebar(!showRightSidebar)}
                                className={`h-7 w-7 rounded shrink-0 transition-colors ${
                                    showRightSidebar 
                                        ? 'border-border/40 bg-accent text-primary' 
                                        : 'border-transparent bg-transparent text-muted-foreground hover:bg-muted/50'
                                }`}
                            >
                                <PanelRight className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start">
                            <p className="text-xs">{showRightSidebar ? "Ocultar Materias" : "Mostrar Materias"}</p>
                        </TooltipContent>
                    </Tooltip>

                    <div className="w-px h-4 bg-border/40 mx-1 shrink-0" />

                    <ScheduleToolbars
                        zoomLevel={zoomLevel}
                        setZoomLevel={setZoomLevel}
                        setTeacherOverviewOpen={setTeacherOverviewOpen}
                        setEnvOverviewOpen={setEnvOverviewOpen}
                        setPeriodOverviewOpen={setPeriodOverviewOpen}

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
                        isObserver={isObserver}
                    />
                    </div>
                )}
            </div>

            {/* ── BODY ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {isScheduleBlocked ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-muted/5 border border-dashed rounded-2xl m-4 text-center p-8 animate-in fade-in duration-300">
                        <div className="p-4 bg-destructive/5 rounded-full border border-destructive/10 text-destructive mb-3">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-black text-foreground">Acceso Restringido - Programación Bloqueada</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                            El programador de horarios está bloqueado temporalmente para este programa porque hay profesores que aún no han publicado su disponibilidad o materias.
                        </p>
                        <Button variant="default" size="sm" className="mt-4 font-bold shadow-sm cursor-pointer" onClick={() => setTeacherOverviewOpen(true)}>
                            Ver Disponibilidad de Docentes
                        </Button>
                    </div>
                ) : (
                    <>
                <LeftGroupsSidebar
                    showLeftSidebar={showLeftSidebar}
                    filtered={filtered}
                    activeGroup={activeGroup}
                    groupId={groupId}
                    isDark={isDark}
                    localPrograms={localPrograms}
                    handleGroupFocus={handleGroupFocus}
                    gcColorHelper={gc}
                />

                {/* CENTER: Calendar */}
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
                                                const isFocused = g.id === groupId;
                                                const th = gc(g.id, isDark);
                                                const groupTotalMins = g.courses.reduce((sum, c) => sum + c.schedules.reduce((acc, s) => acc + toMin(s.endTime) - toMin(s.startTime), 0), 0);

                                                return (
                                                    <div
                                                        key={g.id}
                                                        id={`group-cal-${g.id}`}
                                                        onClick={() => handleGroupFocus(g.id)}
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
                                                                        <div className="h-5.5 px-2 py-0 text-[10.5px] font-bold bg-primary/8 text-primary border border-primary/20 rounded-md flex items-center">
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
                                                                    <div className="text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                                                                        Total: {formatMins(groupTotalMins)}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-bold">
                                                                        <Clock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                                                                        <span>{toFormat12h(g.startTime)} – {toFormat12h(g.endTime)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Environment Selector Bar */}
                                                            <div className="px-4 pb-2 pt-1 border-t border-border/5 flex items-center justify-between gap-4">
                                                                <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground min-w-0 flex-1">
                                                                    <span className="shrink-0">Ambiente:</span>
                                                                    {g.environment ? (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <span className="text-primary font-bold bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded-md text-[10.5px] truncate">
                                                                                    {g.environment.name}
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>{`${g.environment.name} (${g.environment.location || "S/U"})`}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <span className="text-muted-foreground/60 italic text-[11px]">Sin asignar</span>
                                                                    )}
                                                                </div>
                                                                <div className="w-36 shrink-0" onClick={e => e.stopPropagation()}>
                                                                    <Select
                                                                        value={g.environmentId || "none"}
                                                                        onValueChange={(val) => handleAssignEnvironment(g.id, val === "none" ? null : val)}
                                                                    >
                                                                        <SelectTrigger className="h-6 text-[11px] rounded-md border-border/40 font-medium py-0 px-2 bg-background/50 hover:bg-background transition-colors focus:ring-0 focus:ring-offset-0">
                                                                            <SelectValue placeholder="Asignar ambiente..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none" className="text-[11px]">Sin ambiente</SelectItem>
                                                                            {getAvailableEnvironments(g.id, g.environmentId).map(env => (
                                                                                <SelectItem key={env.id} value={env.id} className="text-[11px]">
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
                                                            <CalendarGroupGrid
                                                                g={g}
                                                                groupId={groupId}
                                                                isDark={isDark}
                                                                allTeachers={allTeachers}
                                                                pendingChanges={pendingChanges}
                                                                checkTeacherAvailability={checkTeacherAvailability}
                                                                checkTeacherConflict={checkTeacherConflict}
                                                                checkTeacherWeeklyHours={checkTeacherWeeklyHours}
                                                                checkGroupConflict={checkGroupConflict}
                                                                localMove={localMove}
                                                                localUpdate={localUpdate}
                                                                openDlg={openDlg}
                                                                openEditDlg={openEditDlg}
                                                                setItemToDelete={setItemToDelete}
                                                                isObserver={isObserver}
                                                            />
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

                <RightCoursesSidebar
                    showRightSidebar={showRightSidebar}
                    groupId={groupId}
                    pendingCourses={pendingCourses}
                    allTeachers={allTeachers}
                    getCourseIcon={getCourseIcon}
                    getInitials={getInitials}
                    activeGroup={activeGroup}
                    getQualifiedTeachersInMemory={getQualifiedTeachersInMemory}
                    setDlgGroupId={setDlgGroupId}
                    setDlgTitle={setDlgTitle}
                    setDlgDay={setDlgDay}
                    setDlgStart={setDlgStart}
                    setDlgEnd={setDlgEnd}
                    setDlgTeacher={setDlgTeacher}
                    setTeachers={setTeachers}
                    setDlgOpen={setDlgOpen}
                />
                    </>
                )}
            </div>

            {/* ── TEACHER OVERVIEW DIALOG ── */}
            <Dialog open={teacherOverviewOpen} onOpenChange={setTeacherOverviewOpen}>
                <DialogContent className="w-screen max-w-none sm:max-w-none h-screen max-h-none top-0 left-0 translate-x-0 translate-y-0 rounded-none border-none flex flex-col p-0 overflow-hidden gap-0 bg-background">
                    {/* Fixed Header */}
                    <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/30 shrink-0">
                                    <Users className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-black text-foreground leading-tight flex items-center gap-2">
                                        <span>Vista de Horarios de Docentes</span>
                                        <div className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full border border-border/40 shrink-0">
                                            {overviewPeriods.hasMorning && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="inline-flex">
                                                            <Cloud className="w-3 h-3 text-sky-500 dark:text-sky-400 fill-sky-500/10" />
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Mañana activa</p></TooltipContent>
                                                </Tooltip>
                                            )}
                                            {overviewPeriods.hasAfternoon && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="inline-flex">
                                                            <Sun className="w-3 h-3 text-amber-500 dark:text-amber-400 fill-amber-500/10" />
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Tarde activa</p></TooltipContent>
                                                </Tooltip>
                                            )}
                                            {overviewPeriods.hasNight && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="inline-flex">
                                                            <Moon className="w-3 h-3 text-indigo-500 dark:text-indigo-400 fill-indigo-500/10" />
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Noche activa</p></TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </DialogTitle>
                                    <DialogDescription className="text-[11px] text-muted-foreground mt-0">
                                        Distribución semanal · Detección automática de cruces de horario
                                    </DialogDescription>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
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
                                <div className="relative w-44 shrink-0">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input
                                        value={overviewSearch}
                                        onChange={e => setOverviewSearch(e.target.value)}
                                        placeholder="Buscar docente..."
                                        className="pl-8 h-8 text-xs rounded-lg bg-background border-border"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedTeacherIds([]);
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

                    {/* Scrollable Grid */}
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
                                    <thead className="sticky top-0 z-30">
                                        <tr className="bg-muted/60 backdrop-blur-sm border-b-2 border-border">
                                            <th className="p-3 font-black text-xs text-foreground border border-border/80 w-52 min-w-[13rem] sticky left-0 z-40 bg-muted/95 backdrop-blur-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                <div className="flex items-center justify-between">
                                                    <span>Docente</span>
                                                    <div className="flex items-center gap-1 shrink-0 bg-background/55 border border-border/40 px-1.5 py-0.5 rounded-md">
                                                        {overviewPeriods.hasMorning && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex">
                                                                        <Cloud className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 fill-sky-500/10" />
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Mañana</p></TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {overviewPeriods.hasAfternoon && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex">
                                                                        <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 fill-amber-500/10" />
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Tarde</p></TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {overviewPeriods.hasNight && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex">
                                                                        <Moon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 fill-indigo-500/10" />
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Noche</p></TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </div>
                                            </th>
                                            {DAYS_FULL.map(d => (
                                                <th key={d.value} className="p-3 font-black text-xs text-foreground border border-border/80 text-center min-w-[160px]">
                                                    {d.label}
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
                                                    <td className="p-3 border border-border/80 sticky left-0 z-20 bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                                                                {initials}
                                                            </div>
                                                            <div className="min-w-0 flex-1 leading-tight">
                                                                <div className="text-xs font-black text-foreground truncate">{teacher.name || "Sin Nombre"}</div>
                                                                <div className="text-[10px] text-muted-foreground truncate">{teacher.email}</div>
                                                                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/10">
                                                                    <span className="font-bold text-primary">{formatMins(totalMins)} asignados</span>
                                                                    <div className="flex items-center gap-1">
                                                                        {getPeriodIconsForAssignments(assignments)}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-2">
                                                                    <Button 
                                                                        variant="outline" 
                                                                        size="sm" 
                                                                        className={`h-6 text-[8.5px] font-extrabold rounded-md px-2 py-0 cursor-pointer transition-colors ${
                                                                            teacher.availabilityLocked
                                                                                ? "border-emerald-500/20 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-600 hover:text-white dark:text-emerald-400"
                                                                                : "border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive hover:text-white dark:border-destructive/30"
                                                                        }`}
                                                                        onClick={() => setEditingTeacherAvailabilityId(teacher.id)}
                                                                    >
                                                                        Disponibilidad
                                                                    </Button>
                                                                    <Button 
                                                                        variant="outline" 
                                                                        size="sm" 
                                                                        className={`h-6 text-[8.5px] font-extrabold rounded-md px-2 py-0 cursor-pointer transition-colors ${
                                                                            teacher.qualifiedCoursesLocked
                                                                                ? "border-emerald-500/20 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-600 hover:text-white dark:text-emerald-400"
                                                                                : "border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive hover:text-white dark:border-destructive/30"
                                                                        }`}
                                                                        onClick={() => setEditingTeacherQualificationsId(teacher.id)}
                                                                    >
                                                                        Materias
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {DAYS_FULL.map(d => {
                                                        const avails = (teacher.availabilities || []).filter(av => av.dayOfWeek === d.value);
                                                        const dayAssigns = assignments.filter(a => a.dayOfWeek === d.value);

                                                        return (
                                                            <td key={d.value} className="p-2 border border-border/80 vertical-align-top align-top relative bg-background/5">
                                                                <div className="space-y-2">
                                                                    {overviewShowAvailability && avails.length > 0 && (
                                                                        <div className="space-y-1">
                                                                            {avails.map(av => {
                                                                                const styles = getSchedulePeriodStyles(av.startTime);
                                                                                const IconComp = styles.icon;
                                                                                return (
                                                                                    <div 
                                                                                        key={av.id} 
                                                                                        className={`bg-gradient-to-br border rounded-lg p-1.5 flex flex-col gap-0.5 leading-snug shadow-sm ${styles.gradient}`}
                                                                                    >
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <IconComp className={`w-3.5 h-3.5 shrink-0 ${styles.text}`} />
                                                                                            <span className={`text-[8px] uppercase tracking-wider font-extrabold block ${styles.text}`}>
                                                                                                Disponibilidad ({styles.label})
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className={`text-[8.5px] font-bold ${styles.text}`}>
                                                                                            {toFormat12h(av.startTime)} – {toFormat12h(av.endTime)}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}

                                                                    {overviewShowAssignments && dayAssigns.length > 0 && (
                                                                        <div className="space-y-1">
                                                                            {dayAssigns.map((as, idx) => {
                                                                                const courseColor = hue(as.courseTitle);
                                                                                const startM = toMin(as.startTime);
                                                                                const endM = toMin(as.endTime);
                                                                                
                                                                                // Detect availability overlap conflict
                                                                                const isOutside = avails.length > 0 && !avails.some(av => {
                                                                                    return startM >= toMin(av.startTime) && endM <= toMin(av.endTime);
                                                                                });

                                                                                // Detect conflict with other assignments of this teacher
                                                                                const hasConflict = dayAssigns.some((other, oIdx) => {
                                                                                    if (idx === oIdx) return false;
                                                                                    const otherS = toMin(other.startTime);
                                                                                    const otherE = toMin(other.endTime);
                                                                                    return startM < otherE && endM > otherS;
                                                                                });

                                                                                return (
                                                                                    <Tooltip key={as.id}>
                                                                                        <TooltipTrigger asChild>
                                                                                            <div
                                                                                                style={{
                                                                                                    backgroundColor: hasConflict || isOutside ? "rgba(239, 68, 68, 0.12)" : `hsl(${courseColor}, 65%, 97%)`,
                                                                                                    borderColor: hasConflict || isOutside ? "rgb(239, 68, 68)" : `hsl(${courseColor}, 60%, 80%)`,
                                                                                                    borderWidth: hasConflict || isOutside ? "2px" : "1px",
                                                                                                    color: hasConflict || isOutside ? "rgb(239, 68, 68)" : `hsl(${courseColor}, 70%, 25%)`
                                                                                                }}
                                                                                                className="p-1.5 rounded-lg border flex flex-col gap-0.5 leading-snug cursor-help"
                                                                                            >
                                                                                                <div className="font-extrabold text-[9px] truncate">{as.courseTitle}</div>
                                                                                                <div className="flex items-center justify-between text-[8px] font-semibold opacity-85">
                                                                                                    <span className="truncate max-w-[80px]">{as.groupName}</span>
                                                                                                    <span>{toFormat12h(as.startTime)} – {toFormat12h(as.endTime)}</span>
                                                                                                </div>
                                                                                                {hasConflict && (
                                                                                                    <span className="text-[7.5px] font-black text-red-500 mt-1 uppercase animate-pulse">⚠ CRUCE HORARIO</span>
                                                                                                )}
                                                                                                {!hasConflict && isOutside && (
                                                                                                    <span className="text-[7.5px] font-black text-red-500 mt-1 uppercase animate-pulse">⚠ FUERA DISP.</span>
                                                                                                )}
                                                                                            </div>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent className="w-56 p-2 bg-slate-950 text-slate-100 border border-slate-800 rounded-lg">
                                                                                            <p className="font-bold text-xs">{as.courseTitle}</p>
                                                                                            <p className="text-[10px] text-slate-400 mt-0.5">Grupo: {as.groupName}</p>
                                                                                            <p className="text-[10px] text-slate-400">Horario: {toFormat12h(as.startTime)} – {toFormat12h(as.endTime)}</p>
                                                                                            {hasConflict && (
                                                                                                <p className="text-[9px] text-red-400 font-bold mt-1">Este profesor tiene otra clase programada que se cruza con este horario.</p>
                                                                                            )}
                                                                                            {!hasConflict && isOutside && (
                                                                                                <p className="text-[9px] text-red-400 font-bold mt-1">Este horario está fuera del rango de disponibilidad configurado por el profesor.</p>
                                                                                            )}
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
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

                    <div className="shrink-0 border-t border-border bg-card px-6 py-3 flex items-center justify-between gap-4">
                        <span className="text-[11px] text-muted-foreground font-medium">Mostrando {visibleTeachersForOverview.length} docentes.</span>
                        <Button onClick={() => setTeacherOverviewOpen(false)} className="rounded-xl h-8 px-4 font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                            Cerrar Vista General
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── TRAINING ENVIRONMENTS OVERVIEW DIALOG ── */}
            <Dialog open={envOverviewOpen} onOpenChange={setEnvOverviewOpen}>
                <DialogContent className="w-screen max-w-none sm:max-w-none h-screen max-h-none top-0 left-0 translate-x-0 translate-y-0 rounded-none border-none flex flex-col p-0 overflow-hidden gap-0 bg-background">
                    {/* Fixed Header */}
                    <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

                            <div className="flex items-center gap-2 flex-wrap">
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

                                <div className="relative w-44 shrink-0">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input
                                        value={envOverviewSearch}
                                        onChange={e => setEnvOverviewSearch(e.target.value)}
                                        placeholder="Buscar ambiente..."
                                        className="pl-8 h-8 text-xs rounded-lg bg-background border-border"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedEnvIds([]);
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
                            {initialEnvironments.filter(env => env.programId === programId).map(env => {
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

                    {/* Scrollable Grid */}
                    <div className="flex-1 overflow-auto min-h-0">
                        {(() => {
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
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-muted/60 backdrop-blur-sm border-b-2 border-border">
                                            <th className="p-3 font-black text-xs text-foreground border border-border/80 w-52 sticky left-0 z-20 bg-muted/95 backdrop-blur-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                Ambiente
                                            </th>
                                            {DAYS_FULL.map(d => (
                                                <th key={d.value} className="p-3 font-black text-xs text-foreground border border-border/80 text-center min-w-[160px]">
                                                    {d.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredEnvironments.map((env, rowIdx) => {
                                            const assignments = getEnvironmentAssignments(env.id);
                                            const isEven = rowIdx % 2 === 0;

                                            return (
                                                <tr
                                                    key={env.id}
                                                    className={`border-b border-border/50 transition-colors hover:bg-primary/5 last:border-b-0 ${
                                                        isEven ? "bg-background" : "bg-muted/20"
                                                    }`}
                                                >
                                                    <td className="p-3 border border-border/80 sticky left-0 z-10 bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                        <div className="flex items-start gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-primary flex items-center justify-center shrink-0">
                                                                <Building className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0 flex-1 leading-tight">
                                                                <div className="text-xs font-black text-foreground truncate">{env.name}</div>
                                                                <div className="text-[10px] text-muted-foreground truncate">{env.location || "Sin ubicación"}</div>
                                                                <div className="text-[9px] font-bold text-primary mt-1.5">Capacidad: {env.capacity}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {DAYS_FULL.map(d => {
                                                        const dayAssigns = assignments.filter(a => a.dayOfWeek === d.value);

                                                        return (
                                                            <td key={d.value} className="p-2 border border-border/80 vertical-align-top align-top relative bg-background/5">
                                                                <div className="space-y-1">
                                                                    {dayAssigns.map((as, idx) => {
                                                                        const courseColor = hue(as.courseTitle);
                                                                        const startM = toMin(as.startTime);
                                                                        const endM = toMin(as.endTime);

                                                                        // Check overlap with other courses in the same environment
                                                                        const hasConflict = dayAssigns.some((other, oIdx) => {
                                                                            if (idx === oIdx) return false;
                                                                            const otherS = toMin(other.startTime);
                                                                            const otherE = toMin(other.endTime);
                                                                            return startM < otherE && endM > otherS;
                                                                        });

                                                                        return (
                                                                            <Tooltip key={as.id}>
                                                                                <TooltipTrigger asChild>
                                                                                    <div
                                                                                        style={{
                                                                                            backgroundColor: hasConflict ? "rgba(239, 68, 68, 0.12)" : `hsl(${courseColor}, 65%, 97%)`,
                                                                                            borderColor: hasConflict ? "rgb(239, 68, 68)" : `hsl(${courseColor}, 60%, 80%)`,
                                                                                            borderWidth: hasConflict ? "2px" : "1px",
                                                                                            color: hasConflict ? "rgb(239, 68, 68)" : `hsl(${courseColor}, 70%, 25%)`
                                                                                        }}
                                                                                        className="p-1.5 rounded-lg border flex flex-col gap-0.5 leading-snug cursor-help animate-in fade-in duration-200"
                                                                                    >
                                                                                        <div className="font-extrabold text-[9px] truncate">{as.courseTitle}</div>
                                                                                        <div className="flex items-center justify-between text-[8px] font-semibold opacity-85">
                                                                                            <span className="truncate max-w-[80px]">{as.groupName}</span>
                                                                                            <span>{toFormat12h(as.startTime)} – {toFormat12h(as.endTime)}</span>
                                                                                        </div>
                                                                                        {hasConflict && (
                                                                                            <span className="text-[7.5px] font-black text-red-500 mt-1 uppercase animate-pulse">⚠ CRUCE AMBIENTE</span>
                                                                                        )}
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent className="w-56 p-2 bg-slate-950 text-slate-100 border border-slate-800 rounded-lg">
                                                                                    <p className="font-bold text-xs">{as.courseTitle}</p>
                                                                                    <p className="text-[10px] text-slate-400 mt-0.5">Grupo: {as.groupName}</p>
                                                                                    <p className="text-[10px] text-slate-400">Horario: {toFormat12h(as.startTime)} – {toFormat12h(as.endTime)}</p>
                                                                                    {hasConflict && (
                                                                                        <p className="text-[9px] text-red-400 font-bold mt-1">Este ambiente tiene dos o más grupos programados en el mismo rango de tiempo.</p>
                                                                                    )}
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        );
                                                                    })}
                                                                </div>
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

                    <div className="shrink-0 border-t border-border bg-card px-6 py-3 flex items-center justify-between gap-4">
                        <span className="text-[11px] text-muted-foreground font-medium">Mostrando {filteredEnvironments.length} ambientes.</span>
                        <Button onClick={() => setEnvOverviewOpen(false)} className="rounded-xl h-8 px-4 font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                            Cerrar Vista General
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── DIALOG ── */}
            <Dialog open={dlgOpen} onOpenChange={o => {
                setDlgOpen(o);
                if (!o) { setDlgTitle(""); setDlgTeacher(""); setTeachers([]); setDlgGroupId(""); }
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
                                <Select value={dlgTitle} onValueChange={v => {
                                    setDlgTitle(v); setDlgTeacher("");
                                    setTeachers(getQualifiedTeachersInMemory(v));
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
                                                    loadingT ? "Cargando…" : filteredTeachers.length === 0 ? "Sin disponibles" : "Seleccionar profesor..."
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
                                            <div className="p-2 bg-amber-500/10 border border-amber-400/20 rounded-lg flex gap-1.5 items-start text-[9px] text-amber-700 dark:text-amber-300">
                                                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                                <span>Los docentes de esta asignatura no tienen disponibilidad en este horario.</span>
                                            </div>
                                        )}
                                        {!loadingT && dlgTitle && teachers.length === 0 && (
                                            <div className="p-2 bg-amber-500/10 border border-amber-400/20 rounded-lg flex gap-1.5 items-start text-[9px] text-amber-700 dark:text-amber-300">
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
                                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
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
                                triggerSettingsChange(scheduleTitle, scheduleStartDate, scheduleEndDate, maxTeacherHours, val);
                            }}
                            className={`rounded-xl text-white ${schedulesPublished ? "bg-orange-500 hover:bg-orange-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── DELETE CONFIRMATION DIALOG ── */}
            <AlertDialog open={!!itemToDelete} onOpenChange={open => { if (!open) setItemToDelete(null); }}>
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
                programId={programId}
                onSave={handleSaveAll}
                isSaving={isSaving}
            />



            <ScheduleAnalyticsDialog 
                open={isAnalyticsModalOpen} 
                onOpenChange={setIsAnalyticsModalOpen} 
                programs={localPrograms}
            />

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

            {/* Admin Editing Dialogs */}
            <Dialog open={!!editingTeacherAvailabilityId} onOpenChange={(open) => !open && setEditingTeacherAvailabilityId(null)}>
                <DialogContent className="w-screen max-w-none sm:max-w-none h-screen max-h-none m-0 p-0 rounded-none bg-background border-none overflow-hidden flex flex-col [&>button]:hidden">
                    <DialogHeader className="p-4 border-b border-border/50 shrink-0 bg-muted/20 flex flex-row items-center justify-between">
                        <div>
                            <DialogTitle>Editar Disponibilidad - {allTeachers.find(t => t.id === editingTeacherAvailabilityId)?.name}</DialogTitle>
                            <DialogDescription>
                                Modificando la disponibilidad semanal de {allTeachers.find(t => t.id === editingTeacherAvailabilityId)?.name} como administrador.
                            </DialogDescription>
                        </div>
                        <Button variant="ghost" onClick={() => setEditingTeacherAvailabilityId(null)}>Cerrar</Button>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto p-4 md:p-6 bg-muted/5">
                        {editingTeacherAvailabilityId && (
                            <div className="max-w-5xl mx-auto">
                                <TeacherAvailabilityView 
                                    teacherId={editingTeacherAvailabilityId} 
                                    isAdminMode={true} 
                                    onAdminActionComplete={() => {
                                        setEditingTeacherAvailabilityId(null);
                                        window.location.reload();
                                    }} 
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingTeacherQualificationsId} onOpenChange={(open) => !open && setEditingTeacherQualificationsId(null)}>
                <DialogContent className="w-screen max-w-none sm:max-w-none h-screen max-h-none m-0 p-0 rounded-none bg-background border-none overflow-hidden flex flex-col [&>button]:hidden">
                    <DialogHeader className="p-4 border-b border-border/50 shrink-0 bg-muted/20 flex flex-row items-center justify-between">
                        <div>
                            <DialogTitle>Editar Materias - {allTeachers.find(t => t.id === editingTeacherQualificationsId)?.name}</DialogTitle>
                            <DialogDescription>
                                Modificando las materias habilitadas para {allTeachers.find(t => t.id === editingTeacherQualificationsId)?.name} como administrador.
                            </DialogDescription>
                        </div>
                        <Button variant="ghost" onClick={() => setEditingTeacherQualificationsId(null)}>Cerrar</Button>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto p-4 md:p-6 bg-muted/5">
                        {editingTeacherQualificationsId && (
                            <div className="max-w-5xl mx-auto">
                                <TeacherQualificationsView 
                                    teacherId={editingTeacherQualificationsId} 
                                    isAdminMode={true} 
                                    programId={programId}
                                    onAdminActionComplete={() => {
                                        setEditingTeacherQualificationsId(null);
                                        window.location.reload();
                                    }} 
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
        </>
    );
}
