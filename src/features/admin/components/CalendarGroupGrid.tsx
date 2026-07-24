"use client";

import React, { useCallback } from "react";
import { DayOfWeek } from "@/generated/prisma/client";
import {
    CalendarDays, Clock, Trash2, Users, CheckCircle2, AlertCircle, Cloud, Sun, Moon,
    NotebookTabs, Code, Database, Binary, MessageSquare, BookOpen, LayoutGrid, ShieldCheck,
    Rocket, Terminal, GraduationCap, UserCheck, User, Brain, UserCog, Wrench, Lightbulb
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    toMin,
    toStr,
    snapMin,
    clamp,
    toFormat12h,
    formatMins,
    DAYS_ES,
    isOutsideAvailability
} from "../hooks/useScheduleState";

// Days definition
const DAYS: { value: DayOfWeek; short: string }[] = [
    { value: "MONDAY",    short: "LUN" },
    { value: "TUESDAY",   short: "MAR" },
    { value: "WEDNESDAY", short: "MIÉ" },
    { value: "THURSDAY",  short: "JUE" },
    { value: "FRIDAY",    short: "VIE" },
    { value: "SATURDAY",  short: "SÁB" },
    { value: "SUNDAY",    short: "DOM" },
];

// Color & Gradient Utilities
const getGradientColor = (color: string) => {
    if (color.startsWith("rgba")) {
        return color.replace(/[\d\.]+\)$/, "0.9)");
    }
    if (color.startsWith("hsl")) {
        return color.replace("hsl", "hsla").replace(/\)$/, ", 0.9)");
    }
    return color;
};

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

const cc = (title: string, isDark?: boolean) => {
    const h = hue(title);
    if (isDark) return { solid: `hsl(${h},75%,50%)`, bg: `hsl(${h},60%,15%)`, text: `hsl(${h},85%,85%)`, border: `hsl(${h},50%,35%)` };
    return { solid: `hsl(${h},75%,48%)`, bg: `hsl(${h},78%,94%)`, text: `hsl(${h},78%,20%)`, border: `hsl(${h},65%,80%)` };
};

const tc = (name: string) => ({ bg: `hsl(${hue(name)},65%,55%)`, text: `#ffffff` });

const TIME_PALETTE: [number, string][] = [
    [   0, "#0f172a"],  // midnight
    [ 300, "#1e3a5f"],  // 5am
    [ 360, "#1d6fa4"],  // 6am
    [ 480, "#2196f3"],  // 8am
    [ 600, "#42a5f5"],  // 10am
    [ 720, "#f59e0b"],  // 12pm noon
    [ 840, "#f97316"],  // 2pm
    [ 960, "#ea580c"],  // 4pm
    [1080, "#92400e"],  // 6pm
    [1200, "#78350f"],  // 8pm
    [1320, "#3b1f0c"],  // 10pm
    [1440, "#0f172a"],  // midnight
];

const lerpHex = (a: string, b: string, t: number): string => {
    const parse = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const [ar, ag, ab] = parse(a);
    const [br, bg, bb] = parse(b);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bv = Math.round(ab + (bb - ab) * t);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bv.toString(16).padStart(2, "0")}`;
};

const minuteToColor = (min: number): string => {
    const m = ((min % 1440) + 1440) % 1440;
    for (let i = 0; i < TIME_PALETTE.length - 1; i++) {
        const [t0, c0] = TIME_PALETTE[i];
        const [t1, c1] = TIME_PALETTE[i + 1];
        if (m >= t0 && m <= t1) return lerpHex(c0, c1, (m - t0) / (t1 - t0));
    }
    return TIME_PALETTE[0][1];
};

const getTimeGradient = (startMin: number, endMin: number): string => {
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

const getCourseIcon = (title: string) => {
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

const getTeacherIcon = (nameOrEmail: string | null) => {
    if (!nameOrEmail) return GraduationCap;
    const n = nameOrEmail.toLowerCase().trim();
    if (n.includes("carlos") || n.includes("teacher1")) return UserCheck;
    if (n.includes("ana") || n.includes("teacher2")) return User;
    if (n.includes("luis") || n.includes("teacher3")) return Brain;
    if (n.includes("diana") || n.includes("teacher4")) return UserCog;
    if (n.includes("jorge") || n.includes("teacher5")) return Wrench;
    if (n.includes("claudia") || n.includes("teacher6")) return Lightbulb;
    return GraduationCap;
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

const getShortName = (name: string | null, email: string | null = null) => {
    if (name) {
        const clean = name.trim();
        const words = clean.split(/\s+/).filter(Boolean);
        if (words.length > 0) {
            const firstWord = words[0].toLowerCase();
            if (firstWord === "profesor" || firstWord === "instructor" || firstWord === "docente") {
                if (words.length > 1) {
                    return `${words[0]} ${words[1]}`;
                }
                return words[0];
            }
            if (words.length > 1) {
                const firstName = words[0];
                const lastName = words[1];
                if (lastName && lastName.length > 0) {
                    return `${firstName} ${lastName[0].toUpperCase()}.`;
                }
                return firstName;
            }
            return clean;
        }
    }
    if (email) {
        return email.split("@")[0];
    }
    return "Sin docente";
};

interface CalendarGroupGridProps {
    g: any;
    groupId: string;
    isDark: boolean;
    allTeachers: any[];
    pendingChanges: any[];
    checkTeacherAvailability: (teacherId: string, day: DayOfWeek, s: number, e: number) => { conflict: boolean; msg: string };
    checkTeacherConflict: (teacherId: string, day: DayOfWeek, start: string, end: string, excludeScheduleId?: string) => { conflict: boolean; msg?: string };
    checkTeacherWeeklyHours: (teacherId: string, s: number, e: number, excludeScheduleId?: string) => { conflict: boolean; msg: string; totalHours: number };
    checkGroupConflict: (groupId: string, day: DayOfWeek, startTime: string, endTime: string, excludeScheduleId?: string) => { conflict: boolean; msg?: string };
    localMove: (courseId: string, title: string, teacherId: string | null, durationMin: number, day: DayOfWeek, rawStartMin: number, gS: number, gE: number, scheduleId?: string) => void;
    localUpdate: (courseId: string, scheduleId: string, title: string, teacherId: string | undefined, day: DayOfWeek, startTime: string, endTime: string) => boolean;
    openDlg: (gid: string, day: DayOfWeek, title: string, startStr?: string, durationMin?: number) => void;
    openEditDlg: (gid: string, day: DayOfWeek, slot: any) => void;
    setItemToDelete: (val: { courseId: string; scheduleId: string } | null) => void;
    isObserver?: boolean;
}

export function CalendarGroupGrid({
    g,
    groupId,
    isDark,
    allTeachers,
    pendingChanges,
    checkTeacherAvailability,
    checkTeacherConflict,
    checkTeacherWeeklyHours,
    checkGroupConflict,
    localMove,
    localUpdate,
    openDlg,
    openEditDlg,
    setItemToDelete,
    isObserver = false
}: CalendarGroupGridProps) {
    const gS = toMin(g.startTime);
    const gE = toMin(g.endTime);
    const dur = gE - gS;

    const yToPctMin = useCallback((relY: number, containerH: number, groupStart: number, groupEnd: number) => {
        return groupStart + (relY / containerH) * (groupEnd - groupStart);
    }, []);

    const formatTimeLabel = useCallback((m: number) => {
        const h24 = Math.floor(m / 60);
        const mm = m % 60;
        const dh = h24 % 12 === 0 ? 12 : h24 % 12;
        const ap = h24 >= 12 ? "pm" : "am";
        return mm === 0
            ? (h24 === 12 ? "12m" : `${dh}${ap}`)
            : `${dh}:${String(mm).padStart(2, "0")}${ap}`;
    }, []);

    const ticks = React.useMemo(() => {
        const t = [];
        for (let m = gS; m <= gE; m += 15) {
            const isFirst = m === gS;
            const isLast = m === gE;
            const isH = m % 60 === 0;
            let label: string | null = null;
            if (isFirst || isLast) {
                label = formatTimeLabel(m);
            }
            t.push({ min: m, label, isHour: isH });
        }
        return t;
    }, [gS, gE, formatTimeLabel]);

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
                                <Tooltip key="morning">
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex shrink-0">
                                            <Cloud className="w-2.5 h-2.5 text-sky-500 dark:text-sky-400 fill-sky-500/10" />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Mañana (06:00 a.m. – 12:00 p.m.)</p>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }
                        if (gS < 1080 && gE > 720) {
                            icons.push(
                                <Tooltip key="afternoon">
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex shrink-0">
                                            <Sun className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400 fill-amber-500/10" />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Tarde (12:00 p.m. – 06:00 p.m.)</p>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }
                        if (gS < 1440 && gE > 1080) {
                            icons.push(
                                <Tooltip key="night">
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex shrink-0">
                                            <Moon className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400 fill-indigo-500/10" />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Noche (06:00 p.m. – 12:00 a.m.)</p>
                                    </TooltipContent>
                                </Tooltip>
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
                            courseId: c.id,
                            title: c.title,
                            teacher: c.teacher,
                            startTime: s.startTime,
                            endTime: s.endTime,
                            scheduleId: s.id,
                        }))
                    );
                    const th = gc(g.id, isDark);

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
                                    if (isObserver) return;
                                    if (groupId && g.id !== groupId) return;
                                    e.currentTarget.style.backgroundColor = th.bg;
                                }}
                                onDragOver={e => {
                                    if (isObserver) {
                                        e.dataTransfer.dropEffect = "none";
                                        return;
                                    }
                                    if (groupId && g.id !== groupId) {
                                        e.dataTransfer.dropEffect = "none";
                                        return;
                                    }
                                    e.preventDefault();

                                    const d = (window as any).__draggedItemInfo;
                                    if (!d) return;

                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const relY = e.clientY - rect.top;
                                    const h = rect.height;

                                    let isValid = true;
                                    if (d.moving) {
                                        const rawStart = yToPctMin(relY, h, gS, gE) - (d.offsetMin ?? 0);
                                        const s = clamp(snapMin(rawStart), gS, gE - (d.durationMin || 30));
                                        const eMin = s + (d.durationMin || 30);
                                        
                                        // Group conflict check
                                        const groupCheck = checkGroupConflict(g.id, day, toStr(s), toStr(eMin), d.scheduleId);
                                        if (groupCheck.conflict) {
                                            isValid = false;
                                        } else if (d.teacherId) {
                                            const availCheck = checkTeacherAvailability(d.teacherId, day, s, eMin);
                                            const confCheck = checkTeacherConflict(d.teacherId, day, toStr(s), toStr(eMin), d.scheduleId);
                                            const hoursCheck = checkTeacherWeeklyHours(d.teacherId, s, eMin, d.scheduleId);
                                            isValid = !availCheck.conflict && !confCheck.conflict && !hoursCheck.conflict;
                                        }
                                    } else {
                                        const rawStart = yToPctMin(relY, h, gS, gE);
                                        const defDur = d.durationMin || 120;
                                        const s = snapMin(clamp(rawStart, gS, gE - defDur));
                                        const eMin = s + defDur;
                                        
                                        // Group conflict check
                                        const groupCheck = checkGroupConflict(g.id, day, toStr(s), toStr(eMin));
                                        if (groupCheck.conflict) {
                                            isValid = false;
                                        } else {
                                            const qualifiedTeachers = allTeachers.filter(t => t.qualifiedCourses?.some((qc: any) => qc.title?.trim().toLowerCase() === d.title?.trim().toLowerCase()));
                                            if (qualifiedTeachers.length === 0) {
                                                isValid = false;
                                            } else {
                                                isValid = qualifiedTeachers.some(t => {
                                                    if (t.availabilities && t.availabilities.length > 0) {
                                                        const isOutside = isOutsideAvailability({ dayOfWeek: day, startTime: toStr(s), endTime: toStr(eMin) }, t.availabilities);
                                                        if (isOutside) return false;
                                                    }
                                                    if (checkTeacherConflict(t.id, day, toStr(s), toStr(eMin)).conflict) return false;
                                                    if (checkTeacherWeeklyHours(t.id, s, eMin).conflict) return false;
                                                    return true;
                                                });
                                            }
                                        }
                                    }

                                    const indicator = document.getElementById("drag-feedback-indicator");
                                    const checkIcon = document.getElementById("drag-check");
                                    const crossIcon = document.getElementById("drag-cross");

                                    if (indicator && checkIcon && crossIcon) {
                                        indicator.style.display = "flex";
                                        indicator.style.left = `${e.clientX + 15}px`;
                                        indicator.style.top = `${e.clientY + 20}px`;

                                        if (isValid) {
                                            indicator.style.backgroundColor = "rgb(16 185 129)";
                                            checkIcon.style.display = "block";
                                            crossIcon.style.display = "none";
                                            e.dataTransfer.dropEffect = d.moving ? "move" : "copy";
                                            e.currentTarget.style.backgroundColor = "rgba(16, 185, 129, 0.15)";
                                        } else {
                                            indicator.style.backgroundColor = "rgb(239 68 68)";
                                            crossIcon.style.display = "block";
                                            checkIcon.style.display = "none";
                                            e.dataTransfer.dropEffect = "none";
                                            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
                                        }
                                    }
                                }}
                                onDragLeave={e => {
                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                        e.currentTarget.style.backgroundColor = "";
                                        e.currentTarget.parentElement?.classList.remove("bg-primary/5");
                                        const indicator = document.getElementById("drag-feedback-indicator");
                                        if (indicator) indicator.style.display = "none";
                                    }
                                }}
                                onDrop={e => {
                                    if (isObserver) { e.preventDefault(); return; }
                                    if (groupId && g.id !== groupId) { e.preventDefault(); return; }
                                    e.preventDefault();
                                    e.currentTarget.style.backgroundColor = "";
                                    e.currentTarget.parentElement?.classList.remove("bg-primary/5");
                                    const indicator = document.getElementById("drag-feedback-indicator");
                                    if (indicator) indicator.style.display = "none";
                                    try {
                                        const rawData = e.dataTransfer.getData("text/plain");
                                        const d = (window as any).__draggedItemInfo || (rawData ? JSON.parse(rawData) : null);
                                        if (!d) return;

                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const relY = e.clientY - rect.top;
                                        const h = rect.height;
                                        if (d.moving) {
                                            const rawStart = yToPctMin(relY, h, gS, gE) - (d.offsetMin ?? 0);
                                            localMove(d.courseId, d.title, d.teacherId ?? null, d.durationMin, day, rawStart, gS, gE, d.scheduleId);
                                        } else {
                                            const sessionDur = gE - gS;
                                            openDlg(g.id, day, d.title ?? "", toStr(gS), sessionDur);
                                        }
                                    } catch (err) {
                                        console.error("Error in onDrop:", err);
                                    }
                                }}
                            >
                                {/* Grid lines at every 15min (percentage-based) */}
                                {ticks.map(tick => {
                                    if (tick.min >= gE) return null;
                                    const pct = ((tick.min - gS) / dur) * 100;
                                    const slotH = (15 / dur) * 100;
                                    const isH = tick.min % 60 === 0;
                                    const isHalf = tick.min % 60 === 30;
                                    const lc = isH ? "border-border/30" : isHalf ? "border-border/15" : "border-border/6";
                                    return (
                                        <Tooltip key={tick.min}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={`absolute left-0 right-0 border-b ${lc} hover:bg-primary/[0.04] cursor-pointer transition-colors duration-75`}
                                                    style={{ top: `${pct}%`, height: `${slotH}%` }}
                                                    onClick={() => { if (!isObserver) openDlg(g.id, day, "", toStr(tick.min)); }}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{toStr(tick.min)}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}

                                {/* Course cards — percentage positioned */}
                                {daySlots.map((slot: any, idx: number) => {
                                    const sM = toMin(slot.startTime);
                                    const eM = toMin(slot.endTime);
                                    const dur2 = eM - sM;

                                    const topPct = ((sM - gS) / dur) * 100;
                                    const hPct = ((eM - sM) / dur) * 100;
                                    const col = cc(slot.title, isDark);
                                    const tCol = tc(slot.teacher?.name || slot.teacher?.email || "Unknown");

                                    const isPendingCreate = pendingChanges.some(ch => ch.type === "CREATE" && ch.tempId === slot.courseId);
                                    const isPendingModify = !isPendingCreate && pendingChanges.some(ch => ch.type === "UPDATE" && ch.courseId === slot.courseId);
                                    const CourseIcon = getCourseIcon(slot.title);
                                    const TeacherIcon = getTeacherIcon(slot.teacher ? (slot.teacher.name || slot.teacher.email) : null);
                                    const courseTotalMins = g.courses.find((c: any) => c.id === slot.courseId)?.schedules.reduce((acc: number, s: any) => acc + toMin(s.endTime) - toMin(s.startTime), 0) || 0;

                                    const catalogCourseForSlot = g.period?.courses?.find(
                                        (c: any) => c.title.toLowerCase().trim() === slot.title.toLowerCase().trim()
                                    );
                                    const slotRequiredMins = catalogCourseForSlot ? ((catalogCourseForSlot as any).weeklyHours || 0) * 60 : 0;
                                    const slotProgrammedMins = g.courses
                                        .filter((c: any) => c.title.toLowerCase().trim() === slot.title.toLowerCase().trim())
                                        .flatMap((c: any) => c.schedules)
                                        .reduce((acc: number, s: any) => acc + (toMin(s.endTime) - toMin(s.startTime)), 0);
                                    const isOverScheduledSlot = slotRequiredMins > 0 && slotProgrammedMins > slotRequiredMins;
                                    const isCompleteScheduled = slotRequiredMins > 0 && slotProgrammedMins === slotRequiredMins;
                                    const isUnderScheduledSlot = slotRequiredMins > 0 && slotProgrammedMins < slotRequiredMins;

                                    const cardBg = isOverScheduledSlot ? (isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.13)")
                                        : isCompleteScheduled ? (isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.13)")
                                            : isUnderScheduledSlot ? (isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.13)")
                                                : col.bg;
                                    const cardText = isOverScheduledSlot ? (isDark ? "#f87171" : "#dc2626")
                                        : isCompleteScheduled ? (isDark ? "#4ade80" : "#16a34a")
                                            : isUnderScheduledSlot ? (isDark ? "#60a5fa" : "#1d4ed8")
                                                : col.text;
                                    const cardBorder = isOverScheduledSlot ? (isDark ? "#f87171" : "#dc2626")
                                        : isCompleteScheduled ? (isDark ? "#4ade80" : "#16a34a")
                                            : isUnderScheduledSlot ? (isDark ? "#60a5fa" : "#3b82f6")
                                                : (isPendingCreate ? "#f59e0b" : isPendingModify ? "#6366f1" : col.border);
                                    const cardSolid = isOverScheduledSlot ? (isDark ? "#ef4444" : "#dc2626")
                                        : isCompleteScheduled ? (isDark ? "#22c55e" : "#16a34a")
                                            : isUnderScheduledSlot ? (isDark ? "#3b82f6" : "#2563eb")
                                                : col.solid;

                                    const isSelectedGroup = !groupId || g.id === groupId;

                                    return (
                                        <Tooltip key={`${slot.courseId}-${slot.scheduleId}-${idx}`}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    draggable={isSelectedGroup && !isObserver}
                                                    onDragStart={e => {
                                                        if (isObserver) { e.preventDefault(); return; }
                                                        if (!isSelectedGroup) { e.preventDefault(); return; }
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const bodyH = e.currentTarget.closest(".column-body")?.clientHeight ?? rect.height;
                                                        const offsetMin = ((e.clientY - rect.top) / bodyH) * dur;
                                                        e.dataTransfer.setData("text/plain", JSON.stringify({
                                                            moving: true,
                                                            courseId: slot.courseId,
                                                            scheduleId: slot.scheduleId,
                                                            title: slot.title,
                                                            teacherId: slot.teacher?.id ?? null,
                                                            durationMin: dur2,
                                                            offsetMin,
                                                        }));
                                                        e.dataTransfer.effectAllowed = "all";
                                                        (window as any).__draggedItemInfo = {
                                                            moving: true,
                                                            courseId: slot.courseId,
                                                            scheduleId: slot.scheduleId,
                                                            title: slot.title,
                                                            teacherId: slot.teacher?.id ?? null,
                                                            durationMin: dur2,
                                                            offsetMin,
                                                        };
                                                    }}
                                                    onClick={e => {
                                                        if (isObserver) return;
                                                        e.stopPropagation();
                                                        openEditDlg(g.id, day, slot);
                                                    }}
                                                    style={{
                                                        position: "absolute",
                                                        top: `${topPct}%`,
                                                        height: `${hPct}%`,
                                                        left: "1px",
                                                        right: "1px",
                                                        backgroundColor: cardBg,
                                                        color: cardText,
                                                        borderColor: cardBorder,
                                                        borderStyle: isPendingCreate ? "dashed" : "solid",
                                                        borderWidth: (isOverScheduledSlot || isCompleteScheduled || isUnderScheduledSlot || isPendingCreate || isPendingModify) ? "2px" : "1px",
                                                        willChange: "top, height",
                                                        transition: "top 0.1s cubic-bezier(.4,0,.2,1), height 0.1s cubic-bezier(.4,0,.2,1)",
                                                    }}
                                                    className="group/c rounded-xl shadow-xs border hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 overflow-hidden z-20 cursor-grab active:cursor-grabbing"
                                                >
                                                    <div className="flex flex-col h-full min-w-0 p-2 select-none relative overflow-hidden gap-1.5">
                                                        <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                                                            <span className="text-[9px] px-1 py-0.5 rounded font-black text-white shrink-0 shadow-xs" style={{ backgroundColor: cardSolid }}>
                                                                {getAcronym(slot.title)}
                                                            </span>
                                                            <div className="p-0.5 rounded bg-current/10 shrink-0 text-current/80">
                                                                {isOverScheduledSlot ? <AlertCircle className="w-3 h-3" />
                                                                    : isCompleteScheduled ? <CheckCircle2 className="w-3 h-3" />
                                                                        : <CourseIcon className="w-3 h-3" />}
                                                            </div>

                                                            {isOverScheduledSlot && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="ml-auto shrink-0 bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/40 px-1 py-0.5 rounded-[3px] text-[7.5px] font-extrabold flex items-center gap-0.5 animate-pulse">
                                                                            ⚠ EXCESO
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Sobre-programada. Excede por {formatMins(slotProgrammedMins - slotRequiredMins)}.</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {isCompleteScheduled && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="ml-auto shrink-0 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 px-1 py-0.5 rounded-[3px] text-[7.5px] font-extrabold flex items-center gap-0.5">
                                                                            ✓ LISTO
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Horas completas: {formatMins(slotProgrammedMins)} / {formatMins(slotRequiredMins)}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {isUnderScheduledSlot && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="ml-auto shrink-0 bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/40 px-1 py-0.5 rounded-[3px] text-[7.5px] font-extrabold flex items-center gap-0.5">
                                                                            ↑ {formatMins(slotRequiredMins - slotProgrammedMins)} faltan
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Faltan {formatMins(slotRequiredMins - slotProgrammedMins)} por programar ({formatMins(slotProgrammedMins)} / {formatMins(slotRequiredMins)})</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {!isOverScheduledSlot && !isCompleteScheduled && !isUnderScheduledSlot && isPendingCreate && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="ml-auto shrink-0 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/35 px-1 py-0.5 rounded-[3px] text-[7.5px] font-extrabold flex items-center gap-0.5 animate-pulse">
                                                                            Nuevo
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Nuevo sin guardar</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {!isOverScheduledSlot && !isCompleteScheduled && !isUnderScheduledSlot && isPendingModify && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="ml-auto shrink-0 bg-indigo-500/20 text-indigo-700 border border-indigo-500/35 px-1 py-0.5 rounded-[3px] text-[7.5px] font-extrabold flex items-center gap-0.5">
                                                                            mod.
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Modificado sin guardar</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>

                                                        {/* Title */}
                                                        <div className="font-extrabold text-[11px] leading-snug line-clamp-2 break-words shrink-0" style={{ color: cardText }}>
                                                            {slot.title}
                                                        </div>

                                                        {/* Teacher Info */}
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <div
                                                                className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold shrink-0 shadow-xs border border-current/10"
                                                                style={{ backgroundColor: tCol.bg, color: tCol.text }}
                                                            >
                                                                {getInitials(slot.teacher?.name || slot.teacher?.email || null)}
                                                            </div>
                                                            <span className="text-[10px] font-bold truncate opacity-90" style={{ color: cardText }}>
                                                                {getShortName(slot.teacher?.name || null, slot.teacher?.email || null)}
                                                            </span>
                                                        </div>

                                                        {/* Time slot */}
                                                        <div className="flex items-center gap-1 pt-1 border-t border-current/10 text-[8.5px] font-bold shrink-0 mt-0.5 relative" style={{ color: cardText }}>
                                                            <Clock className="w-3 h-3 shrink-0 opacity-80" />
                                                            <span className="opacity-90 time-label">{toFormat12h(slot.startTime)}–{toFormat12h(slot.endTime)}</span>
                                                            {!isObserver && (
                                                                <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-30 group/resize"
                                                                    onMouseDown={(e) => {
                                                                        e.stopPropagation();
                                                                        e.preventDefault();
                                                                        const card = e.currentTarget.closest('.group\\/c') as HTMLElement;
                                                                        const timeSpan = card?.querySelector('.time-label');
                                                                        const startY = e.clientY;
                                                                        const rect = e.currentTarget.closest('.column-body')?.getBoundingClientRect();
                                                                        if (!rect || !card) return;
                                                                        const pixelsPerMin = rect.height / dur;
                                                                        let currentEndMins = eM;
                                                                        let currentStartMins = sM;

                                                                        card.style.transition = "none";

                                                                        const onMouseMove = (mvEvent: MouseEvent) => {
                                                                            const deltaY = mvEvent.clientY - startY;
                                                                            const deltaMins = deltaY / pixelsPerMin;
                                                                            let newEndMins = Math.round((eM + deltaMins) / 15) * 15;
                                                                            newEndMins = Math.max(currentStartMins + 15, Math.min(gE, newEndMins));
                                                                            if (newEndMins !== currentEndMins) {
                                                                                currentEndMins = newEndMins;
                                                                                card.style.height = `${((newEndMins - currentStartMins) / dur) * 100}%`;
                                                                                if (timeSpan) timeSpan.textContent = `${toFormat12h(slot.startTime)}–${toFormat12h(toStr(newEndMins))}`;
                                                                            }
                                                                        };
                                                                        const onMouseUp = () => {
                                                                            window.removeEventListener("mousemove", onMouseMove);
                                                                            window.removeEventListener("mouseup", onMouseUp);
                                                                            document.body.style.cursor = "";
                                                                            card.style.transition = "";

                                                                            if (currentEndMins !== eM) {
                                                                                const ok = localUpdate(slot.courseId, slot.scheduleId, slot.title, slot.teacher?.id, day, slot.startTime, toStr(currentEndMins));
                                                                                if (!ok) {
                                                                                    card.style.height = `${((eM - currentStartMins) / dur) * 100}%`;
                                                                                    if (timeSpan) timeSpan.textContent = `${toFormat12h(slot.startTime)}–${toFormat12h(slot.endTime)}`;
                                                                                }
                                                                            }
                                                                        };
                                                                        window.addEventListener("mousemove", onMouseMove);
                                                                        window.addEventListener("mouseup", onMouseUp);
                                                                        document.body.style.cursor = "ns-resize";
                                                                    }}
                                                                >
                                                                    <div className="w-8 h-1 bg-foreground/20 rounded-full mx-auto mt-1 group-hover/resize:bg-primary transition-colors" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Delete action — revealed on hover as a floating pill */}
                                                        {!isObserver && (
                                                            <div
                                                                className="absolute bottom-0 left-0 right-0 opacity-0 group-hover/c:opacity-100 transition-opacity duration-150 pt-6 pb-1.5 flex justify-center pointer-events-none"
                                                                style={{ background: `linear-gradient(to top, ${getGradientColor(cardBg)}, transparent)` }}
                                                            >
                                                                <button
                                                                    onClick={e => {
                                                                        e.stopPropagation();
                                                                        setItemToDelete({ courseId: slot.courseId, scheduleId: slot.scheduleId });
                                                                    }}
                                                                    className="flex items-center justify-center gap-1 py-1 px-2.5 rounded-full text-[8.5px] font-bold border transition-all duration-150 shadow-sm pointer-events-auto backdrop-blur-sm hover:scale-105 active:scale-95"
                                                                    style={{
                                                                        backgroundColor: `${cardBorder}22`,
                                                                        color: cardText,
                                                                        borderColor: `${cardBorder}66`,
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-2.5 h-2.5" />
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        )}
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
}
