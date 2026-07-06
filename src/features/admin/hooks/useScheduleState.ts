"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DayOfWeek } from "@/generated/prisma/client";
import { exportScheduleToExcel } from "../utils/exportScheduleExcel";

// Time utils
export const toMin = (t: string) => { const [h,m] = t.split(":").map(Number); return h*60+m; };
export const toStr = (n: number) => `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
export const snapMin = (n: number) => Math.round(n / 15) * 15;
export const clamp   = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const toFormat12h = (t24: string) => {
    const [h, m] = t24.split(":").map(Number);
    const ap = h >= 12 ? "p.m." : "a.m.";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
};

export const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const DAYS_ES: Record<DayOfWeek, string> = {
    MONDAY:"Lunes",TUESDAY:"Martes",WEDNESDAY:"Miércoles",
    THURSDAY:"Jueves",FRIDAY:"Viernes",SATURDAY:"Sábado",SUNDAY:"Domingo"
};

export function isOutsideAvailability(assign: any, availabilities: any[]) {
    if (!availabilities || availabilities.length === 0) return false;
    
    const dayAvails = availabilities.filter(av => av.dayOfWeek === assign.dayOfWeek);
    if (dayAvails.length === 0) return true;
    
    const assignStart = toMin(assign.startTime);
    const assignEnd = toMin(assign.endTime);
    
    const merged = [];
    const sorted = [...dayAvails].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
    for (const av of sorted) {
        const s = toMin(av.startTime);
        const e = toMin(av.endTime);
        if (merged.length === 0) {
            merged.push({ s, e });
        } else {
            const last = merged[merged.length - 1];
            if (s <= last.e) {
                last.e = Math.max(last.e, e);
            } else {
                merged.push({ s, e });
            }
        }
    }
    
    const isContained = merged.some(av => assignStart >= av.s && assignEnd <= av.e);
    return !isContained;
}

export interface TrainingEnvironment {
    id: string;
    name: string;
    capacity: number;
    location: string | null;
    resources: string[];
    programId?: string | null;
}

export interface Program {
    id: string; name: string; description: string|null;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    scheduleTitle?: string | null;
    maxTeacherHours?: number | null;
    teachers: {
        id:string;
        name:string|null;
        email:string;
        availabilityLocked?: boolean;
        qualifiedCoursesLocked?: boolean;
        availabilities?: { id: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string }[];
        qualifiedCourses?: { id: string; title: string }[];
    }[];
    periods: {id:string;name:string;courses:{id:string;title:string;groupId:string|null;periodId:string|null;weeklyHours?:number}[]}[];
    groups: {
        id:string; name:string; description:string|null;
        environmentId?: string | null;
        environment?: TrainingEnvironment | null;
        startTime:string; endTime:string; periodId:string|null;
        period:{id:string;name:string;courses:{id:string;title:string;groupId:string|null;weeklyHours?:number}[]}|null;
        courses:{
            id:string; title:string; teacherId:string|null; weeklyHours?:number;
            teacher:{id:string;name:string|null;email:string}|null;
            schedules:{id:string;dayOfWeek:DayOfWeek;startTime:string;endTime:string}[];
        }[];
    }[];
    environments?: TrainingEnvironment[];
}

export type PendingChange =
    | { type: "CREATE"; tempId: string; groupId: string; periodId: string; title: string; teacherId?: string; schedules: Array<{ dayOfWeek: DayOfWeek; startTime: string; endTime: string }> }
    | { type: "UPDATE"; courseId: string; title: string; teacherId?: string; schedules: Array<{ dayOfWeek: DayOfWeek; startTime: string; endTime: string }> }
    | { type: "DELETE"; courseId: string }
    | { type: "ASSIGN_ENV"; groupId: string; envId: string | null }
    | { type: "ASSIGN_PERIOD"; groupId: string; periodId: string | null }
    | { type: "UPDATE_SETTINGS"; schedulesPublished: boolean; scheduleTitle?: string; scheduleStartDate?: string; scheduleEndDate?: string; programId?: string };

export function useScheduleState({
    initialPrograms,
    initialEnvironments,
    initialSchedulesPublished,
    initialScheduleTitle,
    initialScheduleStartDate,
    initialScheduleEndDate,
    initialMaxTeacherHours = 40,
}: {
    initialPrograms: Program[];
    initialEnvironments: TrainingEnvironment[];
    initialSchedulesPublished: boolean;
    initialScheduleTitle: string;
    initialScheduleStartDate: Date | null;
    initialScheduleEndDate: Date | null;
    initialMaxTeacherHours?: number;
}) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const justSavedRef = useRef(false);
    const [schedulesPublished, setSchedulesPublished] = useState(initialSchedulesPublished);
    const [scheduleTitle, setScheduleTitle] = useState(initialScheduleTitle);
    const [scheduleStartDate, setScheduleStartDate] = useState(initialScheduleStartDate ? initialScheduleStartDate.toISOString().split('T')[0] : "");
    const [scheduleEndDate, setScheduleEndDate] = useState(initialScheduleEndDate ? initialScheduleEndDate.toISOString().split('T')[0] : "");
    const [maxTeacherHours, setMaxTeacherHours] = useState(initialMaxTeacherHours);

    const [localPrograms, setLocalPrograms] = useState<Program[]>(() => JSON.parse(JSON.stringify(initialPrograms)));
    const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
    const isDirty = pendingChanges.length > 0;

    useEffect(() => {
        if (justSavedRef.current) {
            justSavedRef.current = false;
            return;
        }
        if (!isDirty && !isSaving) {
            setLocalPrograms(JSON.parse(JSON.stringify(initialPrograms)));
            setSchedulesPublished(initialSchedulesPublished);
            setScheduleTitle(initialScheduleTitle);
            setScheduleStartDate(initialScheduleStartDate ? initialScheduleStartDate.toISOString().split('T')[0] : "");
            setScheduleEndDate(initialScheduleEndDate ? initialScheduleEndDate.toISOString().split('T')[0] : "");
            setMaxTeacherHours(initialMaxTeacherHours);
        }
    }, [initialPrograms, initialSchedulesPublished, initialScheduleTitle, initialScheduleStartDate, initialScheduleEndDate, initialMaxTeacherHours, isDirty, isSaving]);

    // Modals
    const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);


    // Selection
    const [programId, setProgramId] = useState(() => initialPrograms[0]?.id || "");
    const [groupId, setGroupId] = useState("");
    const [search, setSearch] = useState("");
    const [timeSlot, setTimeSlot] = useState("all");

    // Dialog state (Add / Edit Schedule)
    const [dlgOpen, setDlgOpen] = useState(false);
    const [dlgGroupId, setDlgGroupId] = useState("");
    const [dlgTitle, setDlgTitle] = useState("");
    const [dlgDay, setDlgDay] = useState<DayOfWeek>("MONDAY");
    const [dlgStart, setDlgStart] = useState("08:00");
    const [dlgEnd, setDlgEnd] = useState("10:00");
    const [dlgTeacher, setDlgTeacher] = useState("");
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loadingT, setLoadingT] = useState(false);
    const [editCourseId, setEditCourseId] = useState("");
    const [editScheduleId, setEditScheduleId] = useState("");

    // Delete confirmation
    const [itemToDelete, setItemToDelete] = useState<{ courseId: string; scheduleId: string } | null>(null);

    // Teacher Overview Modal
    const [teacherOverviewOpen, setTeacherOverviewOpen] = useState(false);
    const [overviewShowAvailability, setOverviewShowAvailability] = useState(true);
    const [overviewShowAssignments, setOverviewShowAssignments] = useState(true);
    const [overviewSearch, setOverviewSearch] = useState("");
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
    const [editingTeacherAvailabilityId, setEditingTeacherAvailabilityId] = useState<string | null>(null);
    const [editingTeacherQualificationsId, setEditingTeacherQualificationsId] = useState<string | null>(null);

    // Environment Overview Modal
    const [envOverviewOpen, setEnvOverviewOpen] = useState(false);
    const [envOverviewSearch, setEnvOverviewSearch] = useState("");
    const [selectedEnvIds, setSelectedEnvIds] = useState<string[]>([]);

    // Period Overview Modal
    const [periodOverviewOpen, setPeriodOverviewOpen] = useState(false);
    const [overviewPeriodProgramFilter, setOverviewPeriodProgramFilter] = useState<string>(() => initialPrograms[0]?.id || "");

    // Sidebar Toggles
    const [showLeftSidebar, setShowLeftSidebar] = useState(true);
    const [showRightSidebar, setShowRightSidebar] = useState(true);

    // Zoom Level (1 to 4 columns per row)
    const [zoomLevel, setZoomLevel] = useState(2);

    useEffect(() => {
        if (initialPrograms.length && !programId) setProgramId(initialPrograms[0].id);
        if (justSavedRef.current) {
            justSavedRef.current = false;
            setLocalPrograms(JSON.parse(JSON.stringify(initialPrograms)));
        }
    }, [initialPrograms, programId]);

    useEffect(() => {
        const activeProg = localPrograms.find(p => p.id === programId);
        if (activeProg) {
            setScheduleStartDate(activeProg.startDate ? new Date(activeProg.startDate).toISOString().split('T')[0] : "");
            setScheduleEndDate(activeProg.endDate ? new Date(activeProg.endDate).toISOString().split('T')[0] : "");
            setScheduleTitle(activeProg.scheduleTitle || "");
            setMaxTeacherHours(activeProg.maxTeacherHours ?? 40);
        } else {
            setScheduleStartDate("");
            setScheduleEndDate("");
            setScheduleTitle("");
            setMaxTeacherHours(40);
        }
    }, [programId, localPrograms]);

    const program = useMemo(() => localPrograms.find(p => p.id === programId), [localPrograms, programId]);

    const filtered = useMemo(() => program?.groups.filter(g => {
        const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
        const matchesSlot = timeSlot === "all" || `${g.startTime} – ${g.endTime}` === timeSlot;
        return matchesSearch && matchesSlot;
    }) ?? [], [program?.groups, search, timeSlot]);

    const activeGroup = useMemo(() => filtered.find(g => g.id === groupId) ?? filtered[0], [filtered, groupId]);

    const allTeachers = useMemo(() => localPrograms.flatMap(p => p.teachers), [localPrograms]);

    const getQualifiedTeachersInMemory = useCallback((title: string) => {
        if (!title) return [];
        return allTeachers.filter(t => t.qualifiedCourses?.some((qc: any) => qc.title?.trim().toLowerCase() === title.trim().toLowerCase()));
    }, [allTeachers]);

    const draftTeachersForProgram = useMemo(() => allTeachers.filter(t => !t.availabilityLocked || !t.qualifiedCoursesLocked), [allTeachers]);
    const isScheduleBlocked = draftTeachersForProgram.length > 0;

    const checkTeacherConflict = useCallback((
        teacherId: string,
        day: DayOfWeek,
        newStartTime: string,
        newEndTime: string,
        excludeScheduleId?: string
    ): { conflict: true; msg: string } | { conflict: false } => {
        const newS = toMin(newStartTime);
        const newE = toMin(newEndTime);

        for (const prog of localPrograms) {
            for (const grp of prog.groups) {
                for (const course of grp.courses) {
                    if (course.teacherId !== teacherId) continue;
                    for (const sch of course.schedules) {
                        if (excludeScheduleId && sch.id === excludeScheduleId) continue;
                        if (sch.dayOfWeek !== day) continue;
                        const s = toMin(sch.startTime);
                        const e = toMin(sch.endTime);
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
    }, [localPrograms]);

    const checkTeacherWeeklyHours = useCallback((
        teacherId: string,
        newStartMins: number,
        newEndMins: number,
        excludeScheduleId?: string
    ): { conflict: boolean; msg: string; totalHours: number } => {
        let totalAssignedMinutes = 0;
        let teacherName = "El docente";

        for (const prog of localPrograms) {
            for (const grp of prog.groups) {
                for (const course of grp.courses) {
                    if (course.teacherId !== teacherId) continue;
                    for (const sch of course.schedules) {
                        if (excludeScheduleId && sch.id === excludeScheduleId) continue;
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
        const limitMinutes = maxTeacherHours * 60;

        if (projectedMinutes > limitMinutes) {
            return {
                conflict: true,
                msg: `⚠️ Límite Excedido: "${teacherName}" superaría el límite legal de contrato (${maxTeacherHours} horas semanales). Proyectado: ${(projectedMinutes/60).toFixed(1)}h.`,
                totalHours: projectedMinutes / 60
            };
        }

        return { conflict: false, msg: "", totalHours: projectedMinutes / 60 };
    }, [localPrograms, maxTeacherHours]);

    const checkGroupConflict = useCallback((
        groupId: string,
        day: DayOfWeek,
        newStartTime: string,
        newEndTime: string,
        excludeScheduleId?: string
    ): { conflict: true; msg: string } | { conflict: false } => {
        const newS = toMin(newStartTime);
        const newE = toMin(newEndTime);

        const group = localPrograms.flatMap(p => p.groups).find(g => g.id === groupId);
        if (!group) return { conflict: false };

        for (const course of group.courses) {
            for (const sch of course.schedules) {
                if (excludeScheduleId && sch.id === excludeScheduleId) continue;
                if (sch.dayOfWeek !== day) continue;
                const s = toMin(sch.startTime);
                const e = toMin(sch.endTime);
                if (newS < e && newE > s) {
                    return {
                        conflict: true,
                        msg: `⚠ Conflicto de horario del grupo: El grupo ya tiene programada la clase "${course.title}" el ${DAYS_ES[day]} de ${toFormat12h(sch.startTime)} a ${toFormat12h(sch.endTime)}.`,
                    };
                }
            }
        }
        return { conflict: false };
    }, [localPrograms]);

    const checkTeacherAvailability = useCallback((
        teacherId: string,
        day: DayOfWeek,
        newStartMins: number,
        newEndMins: number
    ): { conflict: boolean; msg: string } => {
        const teacher = allTeachers.find(t => t.id === teacherId);
        if (!teacher) return { conflict: false, msg: "" };
        if (!teacher.availabilities || teacher.availabilities.length === 0) {
            return { conflict: true, msg: "El docente no tiene disponibilidad configurada." };
        }
        
        const isOutside = isOutsideAvailability(
            { dayOfWeek: day, startTime: toStr(newStartMins), endTime: toStr(newEndMins) },
            teacher.availabilities
        );

        if (isOutside) {
            return {
                conflict: true,
                msg: `⚠ Disponibilidad: "${teacher.name || teacher.email}" no tiene disponibilidad para impartir clases en este horario.`
            };
        }
        return { conflict: false, msg: "" };
    }, [allTeachers]);

    const applyLocalCourseUpdate = useCallback((
        courseId: string, title: string, teacherId: string | undefined,
        schedules: Array<{ id?: string, dayOfWeek: DayOfWeek; startTime: string; endTime: string }>
    ) => {
        const teacher = teacherId
            ? allTeachers.find(t => t.id === teacherId) ?? null
            : null;
        setLocalPrograms(prev => prev.map(p => ({
            ...p,
            groups: p.groups.map(g => ({
                ...g,
                courses: g.courses.map(c => c.id !== courseId ? c : ({
                    ...c, title, teacherId: teacherId || null, teacher,
                    schedules: schedules.map((s, idx) => ({ ...s, id: s.id || `sch_${courseId}_${idx}` }))
                }))
            }))
        })));
    }, [allTeachers]);

    const localMove = useCallback((
        courseId: string, title: string, teacherId: string | null,
        durationMin: number, day: DayOfWeek, rawStartMin: number,
        gS: number, gE: number, scheduleId?: string
    ) => {
        if (isScheduleBlocked) {
            toast.error("Programación bloqueada. Faltan profesores por publicar disponibilidad.");
            return;
        }
        let s = clamp(snapMin(rawStartMin), gS, gE - durationMin);
        let e = s + durationMin;
        if (e > gE) { e = gE; s = e - durationMin; }
        
        // Find group ID
        const group = localPrograms.flatMap(p => p.groups).find(g => g.courses.some(c => c.id === courseId));
        if (!group) return;

        // Group conflict check
        const groupCheck = checkGroupConflict(group.id, day, toStr(s), toStr(e), scheduleId);
        if (groupCheck.conflict) { toast.error(groupCheck.msg, { id: "conflict", duration: 3000 }); return; }

        if (teacherId) {
            const availCheck = checkTeacherAvailability(teacherId, day, s, e);
            if (availCheck.conflict) { toast.error(availCheck.msg, { id: "conflict", duration: 3000 }); return; }
            const check = checkTeacherConflict(teacherId, day, toStr(s), toStr(e), scheduleId);
            if (check.conflict) { toast.error(check.msg, { id: "conflict", duration: 3000 }); return; }
            const hoursCheck = checkTeacherWeeklyHours(teacherId, s, e, scheduleId);
            if (hoursCheck.conflict) { toast.error(hoursCheck.msg, { id: "conflict", duration: 3000 }); return; }
        }
        
        const existingCourse = localPrograms.flatMap(p => p.groups).flatMap(g => g.courses).find(c => c.id === courseId);
        let newSchedules = existingCourse ? [...existingCourse.schedules] : [];
        if (scheduleId) {
            newSchedules = newSchedules.map(sch => sch.id === scheduleId ? { ...sch, dayOfWeek: day, startTime: toStr(s), endTime: toStr(e) } : sch);
        } else {
            newSchedules.push({ id: `tmp_sch_${Date.now()}`, dayOfWeek: day, startTime: toStr(s), endTime: toStr(e) });
        }

        applyLocalCourseUpdate(courseId, title, teacherId ?? undefined, newSchedules);
        
        setPendingChanges(prev => {
            const isCreate = prev.some(ch => ch.type === "CREATE" && ch.tempId === courseId);
            if (isCreate) {
                return prev.map(ch => ch.type === "CREATE" && ch.tempId === courseId ? { ...ch, schedules: newSchedules } : ch);
            }
            const filtered = prev.filter(ch => !(ch.type === "UPDATE" && ch.courseId === courseId));
            return [...filtered, { type: "UPDATE" as const, courseId, title, teacherId: teacherId ?? undefined, schedules: newSchedules }];
        });
    }, [isScheduleBlocked, checkTeacherAvailability, checkTeacherConflict, checkTeacherWeeklyHours, checkGroupConflict, localPrograms, applyLocalCourseUpdate]);

    const localInsert = useCallback((groupId: string, periodId: string, title: string, teacherId: string | undefined, day: DayOfWeek, startTime: string, endTime: string) => {
        if (isScheduleBlocked) {
            toast.error("Programación bloqueada. Faltan profesores por publicar disponibilidad.");
            return false;
        }

        // Group conflict check
        const groupCheck = checkGroupConflict(groupId, day, startTime, endTime);
        if (groupCheck.conflict) { toast.error(groupCheck.msg, { id: "conflict", duration: 3000 }); return false; }

        if (teacherId) {
            const availCheck = checkTeacherAvailability(teacherId, day, toMin(startTime), toMin(endTime));
            if (availCheck.conflict) { toast.error(availCheck.msg, { id: "conflict", duration: 3000 }); return false; }
            const check = checkTeacherConflict(teacherId, day, startTime, endTime);
            if (check.conflict) { toast.error(check.msg, { id: "conflict", duration: 3000 }); return false; }
            const hoursCheck = checkTeacherWeeklyHours(teacherId, toMin(startTime), toMin(endTime));
            if (hoursCheck.conflict) { toast.error(hoursCheck.msg, { id: "conflict", duration: 3000 }); return false; }
        }
        
        const existingCourse = localPrograms.flatMap(p => p.groups).find(g => g.id === groupId)?.courses.find(c => c.title?.trim().toLowerCase() === title?.trim().toLowerCase());
        
        if (existingCourse) {
            const newSchedules = [...existingCourse.schedules, { id: `tmp_sch_${Date.now()}`, dayOfWeek: day, startTime, endTime }];
            applyLocalCourseUpdate(existingCourse.id, title, teacherId ?? undefined, newSchedules);
            setPendingChanges(prev => {
                const isCreate = prev.some(ch => ch.type === "CREATE" && ch.tempId === existingCourse.id);
                if (isCreate) return prev.map(ch => ch.type === "CREATE" && ch.tempId === existingCourse.id ? { ...ch, schedules: newSchedules } : ch);
                const filtered = prev.filter(ch => !(ch.type === "UPDATE" && ch.courseId === existingCourse.id));
                return [...filtered, { type: "UPDATE" as const, courseId: existingCourse.id, title, teacherId: teacherId ?? undefined, schedules: newSchedules }];
            });
            return true;
        }

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const teacher = teacherId ? allTeachers.find(t => t.id === teacherId) ?? null : null;
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
    }, [isScheduleBlocked, checkTeacherAvailability, checkTeacherConflict, checkTeacherWeeklyHours, checkGroupConflict, localPrograms, applyLocalCourseUpdate, allTeachers]);

    const localUpdate = useCallback((courseId: string, scheduleId: string, title: string, teacherId: string | undefined, day: DayOfWeek, startTime: string, endTime: string) => {
        // Resolve group ID from course ID
        const group = localPrograms.flatMap(p => p.groups).find(g => g.courses.some(c => c.id === courseId));
        if (!group) return false;

        // Group conflict check
        const groupCheck = checkGroupConflict(group.id, day, startTime, endTime, scheduleId);
        if (groupCheck.conflict) { toast.error(groupCheck.msg, { id: "conflict", duration: 3000 }); return false; }

        if (teacherId) {
            const availCheck = checkTeacherAvailability(teacherId, day, toMin(startTime), toMin(endTime));
            if (availCheck.conflict) { toast.error(availCheck.msg, { id: "conflict", duration: 3000 }); return false; }
            const check = checkTeacherConflict(teacherId, day, startTime, endTime, scheduleId);
            if (check.conflict) { toast.error(check.msg, { id: "conflict", duration: 3000 }); return false; }
            const hoursCheck = checkTeacherWeeklyHours(teacherId, toMin(startTime), toMin(endTime), scheduleId);
            if (hoursCheck.conflict) { toast.error(hoursCheck.msg, { id: "conflict", duration: 3000 }); return false; }
        }
        
        const existingCourse = localPrograms.flatMap(p => p.groups).flatMap(g => g.courses).find(c => c.id === courseId);
        if (!existingCourse) return false;
        
        const newSchedules = existingCourse.schedules.map(sch => sch.id === scheduleId ? { ...sch, dayOfWeek: day, startTime, endTime } : sch);
        
        applyLocalCourseUpdate(courseId, title, teacherId, newSchedules);
        
        setPendingChanges(prev => {
            const isCreate = prev.some(ch => ch.type === "CREATE" && ch.tempId === courseId);
            if (isCreate) {
                return prev.map(ch => ch.type === "CREATE" && ch.tempId === courseId ? { ...ch, title, teacherId, schedules: newSchedules } : ch);
            }
            const filtered = prev.filter(ch => !(ch.type === "UPDATE" && ch.courseId === courseId));
            return [...filtered, { type: "UPDATE" as const, courseId, title, teacherId, schedules: newSchedules }];
        });
        return true;
    }, [checkTeacherAvailability, checkTeacherConflict, checkTeacherWeeklyHours, checkGroupConflict, localPrograms, applyLocalCourseUpdate]);

    const confirmDelete = useCallback(() => {
        if (!itemToDelete) return;
        const { courseId, scheduleId } = itemToDelete;
        setItemToDelete(null);
        
        const existingCourse = localPrograms.flatMap(p => p.groups).flatMap(g => g.courses).find(c => c.id === courseId);
        if (!existingCourse) return;

        const newSchedules = existingCourse.schedules.filter(s => s.id !== scheduleId);
        const isTemp = courseId.startsWith("temp_");
        
        if (newSchedules.length === 0 && isTemp) {
            setLocalPrograms(prev => prev.map(p => ({
                ...p, groups: p.groups.map(g => ({ ...g, courses: g.courses.filter(c => c.id !== courseId) }))
            })));
            setPendingChanges(prev => prev.filter(ch => !(ch.type === "CREATE" && ch.tempId === courseId)));
            toast.success("Materia eliminada de la sesión.");
        } else {
            // Keep course, clear schedules
            applyLocalCourseUpdate(courseId, existingCourse.title, existingCourse.teacherId ?? undefined, newSchedules);
            setPendingChanges(prev => {
                const isCreate = prev.some(ch => ch.type === "CREATE" && ch.tempId === courseId);
                if (isCreate) return prev.map(ch => ch.type === "CREATE" && ch.tempId === courseId ? { ...ch, schedules: newSchedules } : ch);
                const filtered = prev.filter(ch => !(ch.type === "UPDATE" && ch.courseId === courseId));
                return [...filtered, { type: "UPDATE" as const, courseId, title: existingCourse.title, teacherId: existingCourse.teacherId ?? undefined, schedules: newSchedules }];
            });
            toast.success("Bloque eliminado del horario.");
        }
    }, [itemToDelete, localPrograms, applyLocalCourseUpdate]);

    const handleSaveAll = useCallback(async () => {
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
    }, [pendingChanges, isSaving, router]);

    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const handleExportExcel = useCallback(async () => {
        setIsExportingExcel(true);
        try {
            await exportScheduleToExcel(localPrograms, scheduleTitle || "Horario Académico");
            toast.success("Excel exportado correctamente.");
        } catch (error) {
            console.error(error);
            toast.error("Error al exportar a Excel.");
        } finally {
            setIsExportingExcel(false);
        }
    }, [localPrograms, scheduleTitle]);

    const handleDiscard = useCallback(() => {
        if (!confirm("¿Descartar todos los cambios pendientes? Se revertirá al último estado guardado.")) return;
        setLocalPrograms(JSON.parse(JSON.stringify(initialPrograms)));
        setPendingChanges([]);
        toast.info("Cambios descartados");
    }, [initialPrograms]);

    const handleStartChange = useCallback((newStart: string) => {
        setDlgStart(newStart);
        const startM = toMin(newStart);
        const endM = toMin(dlgEnd);
        if (startM >= endM) {
            const g = program?.groups.find(x => x.id === dlgGroupId);
            const limit = g ? toMin(g.endTime) : startM + 120;
            setDlgEnd(toStr(Math.min(startM + 120, limit)));
        }
    }, [dlgEnd, dlgGroupId, program?.groups]);

    const getStartTimeOptions = useCallback(() => {
        const g = program?.groups.find(x => x.id === dlgGroupId);
        if (!g) return [];
        const start = snapMin(toMin(g.startTime));
        const end = snapMin(toMin(g.endTime));
        const options: string[] = [];
        for (let m = start; m < end; m += 15) options.push(toStr(m));
        return options;
    }, [dlgGroupId, program?.groups]);

    const getEndTimeOptions = useCallback(() => {
        const g = program?.groups.find(x => x.id === dlgGroupId);
        if (!g) return [];
        const startLimit = snapMin(toMin(dlgStart || g.startTime));
        const end = snapMin(toMin(g.endTime));
        const options: string[] = [];
        for (let m = startLimit + 15; m <= end; m += 15) options.push(toStr(m));
        return options;
    }, [dlgStart, dlgGroupId, program?.groups]);

    const openDlg = useCallback((gid: string, day: DayOfWeek, title: string, startStr?: string, durationMin: number = 120) => {
        const g = localPrograms.flatMap(p => p.groups).find(x => x.id === gid); if (!g) return;
        setDlgGroupId(gid); setDlgTitle(title); setDlgDay(day);
        
        const mStart = startStr ? toMin(startStr) : toMin(g.startTime);
        const limit = toMin(g.endTime);
        const mEnd = Math.min(mStart + durationMin, limit);

        setDlgStart(toStr(mStart));
        setDlgEnd(toStr(mEnd));
        setDlgTeacher(""); setEditCourseId(""); setDlgOpen(true);
        if (title) {
            setTeachers(getQualifiedTeachersInMemory(title));
        } else setTeachers([]);
    }, [localPrograms, getQualifiedTeachersInMemory]);

    const openEditDlg = useCallback((gid: string, day: DayOfWeek, slot: any) => {
        const g = localPrograms.flatMap(p => p.groups).find(x => x.id === gid); if (!g) return;
        setDlgGroupId(gid); setDlgTitle(slot.title); setDlgDay(day);
        setDlgStart(slot.startTime); setDlgEnd(slot.endTime);
        setDlgTeacher(slot.teacher?.id ?? ""); setEditCourseId(slot.courseId); setEditScheduleId(slot.scheduleId); setDlgOpen(true);
        setTeachers(getQualifiedTeachersInMemory(slot.title));
    }, [localPrograms, getQualifiedTeachersInMemory]);

    const handleUpdate = useCallback(() => {
        if (!dlgGroupId || !dlgTitle || dlgStart >= dlgEnd || !editCourseId || !editScheduleId) { toast.error("Datos incompletos"); return; }
        if (!dlgTeacher) { toast.error("Debe seleccionar un profesor"); return; }

        const groupCheck = checkGroupConflict(dlgGroupId, dlgDay, dlgStart, dlgEnd, editScheduleId);
        if (groupCheck.conflict) { toast.error(groupCheck.msg, { duration: 6000 }); return; }

        const check = checkTeacherConflict(dlgTeacher, dlgDay, dlgStart, dlgEnd, editScheduleId);
        if (check.conflict) { toast.error(check.msg, { duration: 6000 }); return; }

        if (activeGroup) {
            const newSessionMins = toMin(dlgEnd) - toMin(dlgStart);
            const liveGroup = localPrograms.flatMap(p => p.groups).find(g => g.id === dlgGroupId);
            const catalogCourse = activeGroup.period?.courses.find((c: any) => c.title.toLowerCase().trim() === dlgTitle.toLowerCase().trim());
            const requiredMins = catalogCourse ? (catalogCourse.weeklyHours || 0) * 60 : 0;
            if (requiredMins > 0 && liveGroup) {
                const otherMins = liveGroup.courses
                    .filter((c: any) => c.title.toLowerCase().trim() === dlgTitle.toLowerCase().trim())
                    .flatMap((c: any) => c.schedules)
                    .filter((s: any) => s.id !== editScheduleId)
                    .reduce((acc: number, s: any) => acc + (toMin(s.endTime) - toMin(s.startTime)), 0);
                if (otherMins + newSessionMins > requiredMins) {
                    toast.error(`⚠️ La sesión excede las horas asignadas para "${dlgTitle}". Máximo: ${formatMins(requiredMins)}, ya programadas: ${formatMins(otherMins)}.`, { duration: 6000 });
                    return;
                }
            }
        }

        const ok = localUpdate(editCourseId, editScheduleId, dlgTitle, dlgTeacher, dlgDay, dlgStart, dlgEnd);
        if (ok) {
            setDlgOpen(false); setEditCourseId(""); setEditScheduleId("");
        }
    }, [dlgGroupId, dlgTitle, dlgStart, dlgEnd, editCourseId, editScheduleId, dlgTeacher, dlgDay, activeGroup, localPrograms, localUpdate, checkTeacherConflict, checkGroupConflict]);

    const handleInsert = useCallback(() => {
        if (!dlgGroupId || !dlgTitle || dlgStart >= dlgEnd) { toast.error("Datos incompletos"); return; }
        if (!dlgTeacher) { toast.error("Debe seleccionar un profesor"); return; }

        const groupCheck = checkGroupConflict(dlgGroupId, dlgDay, dlgStart, dlgEnd);
        if (groupCheck.conflict) { toast.error(groupCheck.msg, { duration: 6000 }); return; }

        const check = checkTeacherConflict(dlgTeacher, dlgDay, dlgStart, dlgEnd);
        if (check.conflict) { toast.error(check.msg, { duration: 6000 }); return; }
        const g = localPrograms.flatMap(p => p.groups).find(x => x.id === dlgGroupId);
        if (!g?.periodId) { toast.error("El grupo no tiene período"); return; }

        if (activeGroup) {
            const newSessionMins = toMin(dlgEnd) - toMin(dlgStart);
            const liveGroup = localPrograms.flatMap(p => p.groups).find(gr => gr.id === dlgGroupId);
            const catalogCourse = activeGroup.period?.courses.find((c: any) => c.title.toLowerCase().trim() === dlgTitle.toLowerCase().trim());
            const requiredMins = catalogCourse ? (catalogCourse.weeklyHours || 0) * 60 : 0;
            if (requiredMins > 0 && liveGroup) {
                const alreadyMins = liveGroup.courses
                    .filter((c: any) => c.title.toLowerCase().trim() === dlgTitle.toLowerCase().trim())
                    .flatMap((c: any) => c.schedules)
                    .reduce((acc: number, s: any) => acc + (toMin(s.endTime) - toMin(s.startTime)), 0);
                if (alreadyMins + newSessionMins > requiredMins) {
                    const remaining = requiredMins - alreadyMins;
                    toast.error(`⚠️ La sesión excede las horas asignadas para "${dlgTitle}". Solo faltan ${formatMins(Math.max(0, remaining))} por programar.`, { duration: 6000 });
                    return;
                }
            }
        }

        const ok = localInsert(dlgGroupId, g.periodId, dlgTitle, dlgTeacher, dlgDay, dlgStart, dlgEnd);
        if (ok) {
            setDlgOpen(false);
        }
    }, [dlgGroupId, dlgTitle, dlgStart, dlgEnd, dlgTeacher, dlgDay, localPrograms, activeGroup, localInsert, checkTeacherConflict, checkGroupConflict]);

    const handleGroupFocus = useCallback((gid: string) => {
        setGroupId(prev => {
            const next = prev === gid ? "" : gid;
            if (next) {
                setTimeout(() => {
                    const el = document.getElementById(`group-cal-${gid}`);
                    if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
                    }
                }, 50);
            }
            return next;
        });
    }, []);

    const getAvailableEnvironments = useCallback((currentGroupId: string, currentEnvId: string | null | undefined) => {
        const assignedIds = new Set<string>();
        localPrograms.forEach(p => {
            p.groups.forEach(g => {
                if (g.id !== currentGroupId && g.environmentId) {
                    assignedIds.add(g.environmentId);
                }
            });
        });
        const groupProgram = localPrograms.find(p => p.groups.some(g => g.id === currentGroupId));
        const programEnvironments = initialEnvironments.filter(env => env.programId === groupProgram?.id);
        return programEnvironments.filter(env => !assignedIds.has(env.id) || env.id === currentEnvId);
    }, [localPrograms, initialEnvironments]);

    const handleAssignEnvironment = useCallback((groupId: string, envId: string | null) => {
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
    }, [initialEnvironments]);

    const handleAssignPeriod = useCallback((groupId: string, periodId: string | null) => {
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
    }, [localPrograms]);

    const triggerSettingsChange = useCallback((title: string, startDate: string, endDate: string, maxHours: number, published?: boolean) => {
        const nextPublished = published !== undefined ? published : schedulesPublished;
        setScheduleTitle(title);
        setScheduleStartDate(startDate);
        setScheduleEndDate(endDate);
        setMaxTeacherHours(maxHours);
        if (published !== undefined) {
            setSchedulesPublished(published);
        }

        setLocalPrograms(prev => prev.map(p => p.id === programId
            ? { ...p, startDate, endDate, scheduleTitle: title, maxTeacherHours: maxHours }
            : p
        ));

        setPendingChanges(prev => {
            const filtered = prev.filter(ch => ch.type !== "UPDATE_SETTINGS");
            return [...filtered, { type: "UPDATE_SETTINGS" as const, schedulesPublished: nextPublished, scheduleTitle: title, scheduleStartDate: startDate, scheduleEndDate: endDate, maxTeacherHours: maxHours, programId }];
        });
    }, [schedulesPublished, programId]);

    return {
        // Core optimistic states
        localPrograms,
        setLocalPrograms,
        pendingChanges,
        setPendingChanges,
        isDirty,
        isSaving,
        setIsSaving,
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
        setLoadingT,
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

        // Validation functions
        checkTeacherAvailability,
        checkTeacherConflict,
        checkTeacherWeeklyHours,
        checkGroupConflict,

        // Action methods
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
        getQualifiedTeachersInMemory
    };
}
