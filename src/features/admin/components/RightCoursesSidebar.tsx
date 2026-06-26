"use client";

import React from "react";
import { GraduationCap, CheckCircle2, AlertCircle, ChevronRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toMin, formatMins } from "../hooks/useScheduleState";
import { DayOfWeek } from "@/generated/prisma/client";

interface RightCoursesSidebarProps {
    showRightSidebar: boolean;
    groupId: string;
    pendingCourses: any[];
    allTeachers: any[];
    getCourseIcon: (title: string, iconStr?: string | null) => any;
    getInitials: (name: string | null) => string;
    activeGroup: any;
    getQualifiedTeachersInMemory: (title: string) => any[];
    setDlgGroupId: (id: string) => void;
    setDlgTitle: (title: string) => void;
    setDlgDay: (day: DayOfWeek) => void;
    setDlgStart: (time: string) => void;
    setDlgEnd: (time: string) => void;
    setDlgTeacher: (id: string) => void;
    setTeachers: (teachers: any[]) => void;
    setDlgOpen: (open: boolean) => void;
}

export function RightCoursesSidebar({
    showRightSidebar,
    groupId,
    pendingCourses,
    allTeachers,
    getCourseIcon,
    getInitials,
    activeGroup,
    getQualifiedTeachersInMemory,
    setDlgGroupId,
    setDlgTitle,
    setDlgDay,
    setDlgStart,
    setDlgEnd,
    setDlgTeacher,
    setTeachers,
    setDlgOpen
}: RightCoursesSidebarProps) {
    if (!showRightSidebar) return null;

    const dayLabels: Record<string, string> = {
        MONDAY: "Lun",
        TUESDAY: "Mar",
        WEDNESDAY: "Mié",
        THURSDAY: "Jue",
        FRIDAY: "Vie",
        SATURDAY: "Sáb",
        SUNDAY: "Dom"
    };

    return (
        <div className={cn(
            "w-40 shrink-0 border-l border-border/30 bg-card flex-col min-h-0",
            showRightSidebar ? "flex" : "hidden"
        )}>
            {groupId ? (
                <>
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
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">¡Completado!</span>
                                <span className="text-[8px] text-muted-foreground leading-snug">Todas programadas.</span>
                            </div>
                        ) : (
                            <>
                                <p className="text-[7.5px] text-muted-foreground italic px-0.5">Arrastra al calendario o clic para programar.</p>
                                {pendingCourses.map(course => {
                                    const PndIcon = getCourseIcon(course.title);
                                    const eligibleTeachers = allTeachers.filter(t => t.qualifiedCourses?.some((qc: any) => qc.title?.trim().toLowerCase() === course.title?.trim().toLowerCase()));

                                    const gS = activeGroup ? toMin(activeGroup.startTime) : 0;
                                    const gE = activeGroup ? toMin(activeGroup.endTime) : 0;

                                    const fullyEligibleTeachers = eligibleTeachers.map(t => {
                                        const overlappingAvails = (t.availabilities || []).filter((av: any) => {
                                            const aS = toMin(av.startTime);
                                            const aE = toMin(av.endTime);
                                            return Math.max(aS, gS) < Math.min(aE, gE);
                                        });
                                        return { ...t, overlappingAvails };
                                    }).filter(t => t.overlappingAvails.length > 0);

                                    return (
                                        <Tooltip key={course.id} delayDuration={300}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    draggable={!course.isOverScheduled}
                                                    onDragStart={e => {
                                                        if (course.isOverScheduled) { e.preventDefault(); return; }
                                                        const rem = course.remainingMins ?? (course.requiredMins > 0 ? course.requiredMins - course.programmedMins : 0);
                                                        const defaultDur = rem > 0 ? Math.min(rem, 120) : 120;
                                                        const payload = { courseId: course.id, title: course.title, moving: false, durationMin: defaultDur };
                                                        e.dataTransfer.setData("text/plain", JSON.stringify(payload));
                                                        e.dataTransfer.effectAllowed = "all";
                                                        (window as any).__draggedItemInfo = payload;
                                                    }}
                                                    onDragEnd={() => {
                                                        (window as any).__draggedItemInfo = null;
                                                        const ind = document.getElementById("drag-feedback-indicator");
                                                        if (ind) ind.style.display = "none";
                                                    }}
                                                    onClick={() => {
                                                        setDlgGroupId(activeGroup.id);
                                                        setDlgTitle(course.title);
                                                        setDlgDay("MONDAY");
                                                        setDlgStart(activeGroup.startTime);
                                                        setDlgEnd(activeGroup.endTime);
                                                        setDlgTeacher("");
                                                        setDlgOpen(true);
                                                        setTeachers(getQualifiedTeachersInMemory(course.title));
                                                    }}
                                                    className={cn(
                                                        "p-2.5 border rounded-lg cursor-pointer transition-all duration-100 flex items-center justify-between group gap-2",
                                                        course.isOverScheduled
                                                            ? "bg-destructive/10 border-destructive/50 hover:border-destructive"
                                                            : "bg-muted/5 border-border/40 hover:border-primary/40"
                                                    )}
                                                >
                                                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                        <div className="flex items-start gap-2 min-w-0">
                                                            {course.isOverScheduled
                                                                ? <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                                                                : <PndIcon className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
                                                            }
                                                            <span className={cn("text-[11px] font-bold leading-tight break-words", course.isOverScheduled && "text-destructive")}>
                                                                {course.title}
                                                            </span>
                                                        </div>
                                                        {course.isOverScheduled ? (
                                                            <div className="flex flex-col gap-1 mt-1.5">
                                                                <div className="flex items-center justify-between text-[10px] font-semibold">
                                                                    <span className="text-destructive font-bold">⚠ Sobre-programada</span>
                                                                    <span className="text-destructive">{formatMins(course.programmedMins)} / {formatMins(course.requiredMins)}</span>
                                                                </div>
                                                                <div className="text-[9px] text-destructive/80 leading-normal">
                                                                    Excede por {formatMins(course.programmedMins - course.requiredMins)}. Edita o elimina sesiones.
                                                                </div>
                                                                <div className="h-1.5 rounded-full bg-destructive/20 overflow-hidden w-full">
                                                                    <div style={{ width: "100%" }} className="h-full rounded-full bg-destructive" />
                                                                </div>
                                                            </div>
                                                        ) : course.requiredMins > 0 ? (
                                                            <div className="flex flex-col gap-1.5 mt-1.5">
                                                                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                                                                    <span><span className="text-foreground">{formatMins(course.programmedMins)}</span> prog.</span>
                                                                    <span className="text-amber-600 font-bold">{formatMins(course.remainingMins)} faltan</span>
                                                                    <span>{formatMins(course.requiredMins)} total</span>
                                                                </div>
                                                                <div className="h-1.5 rounded-full bg-border/50 overflow-hidden w-full">
                                                                    <div 
                                                                        style={{ width: `${Math.min(100, (course.programmedMins / course.requiredMins) * 100)}%` }} 
                                                                        className={cn(
                                                                            "h-full rounded-full transition-all duration-300", 
                                                                            course.programmedMins >= course.requiredMins ? "bg-emerald-500" : "bg-primary"
                                                                        )}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold mt-1.5">
                                                                <span><span className="text-foreground">{formatMins(course.programmedMins)}</span> prog.</span>
                                                                <span className="text-[10px] italic opacity-70">Sin límite</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" align="center" className="w-64 p-3.5 bg-card border-border/50 shadow-xl z-[60]">
                                                <p className="text-sm font-black mb-2.5 text-foreground flex items-center gap-1.5">
                                                    <Users className="w-4 h-4 text-primary" />
                                                    Docentes Habilitados
                                                </p>
                                                {fullyEligibleTeachers.length > 0 ? (
                                                    <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                                                        {fullyEligibleTeachers.map(t => {
                                                            const days = Array.from(new Set(t.overlappingAvails.map((av: any) => av.dayOfWeek)));
                                                            return (
                                                                <div key={t.id} className="flex items-start gap-2.5 p-2 bg-muted/30 hover:bg-muted/50 transition-colors rounded-md border border-border/30">
                                                                    <div className="w-6 h-6 rounded flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold text-[10px] shrink-0 mt-0.5">
                                                                        {getInitials(t.name)}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1 leading-tight">
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="text-xs font-bold text-foreground truncate">{t.name}</div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>{t.name || ""}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                            {days.map((d: any) => (
                                                                                <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold leading-none">
                                                                                    {dayLabels[d]}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                        <div className="flex items-center gap-1 mt-1.5">
                                                                            {t.availabilityLocked && t.qualifiedCoursesLocked ? (
                                                                                <span className="text-[9px] font-semibold text-emerald-500 flex items-center gap-0.5">
                                                                                    <CheckCircle2 className="w-3 h-3"/> Listo
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[9px] font-semibold text-destructive flex items-center gap-0.5">
                                                                                    <AlertCircle className="w-3 h-3"/> Borrador
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center p-3.5 text-center bg-muted/20 rounded border border-dashed border-border/50">
                                                        <span className="text-xs text-muted-foreground font-medium">
                                                            Ningún docente aplica al horario del grupo con esta materia habilitada.
                                                        </span>
                                                    </div>
                                                )}
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-3 text-center gap-2 bg-muted/5">
                    <Users className="w-8 h-8 text-muted-foreground/30 animate-pulse" />
                    <p className="text-[10px] font-black text-muted-foreground leading-normal">
                        Selecciona un grupo para ver y programar sus materias
                    </p>
                </div>
            )}
        </div>
    );
}
