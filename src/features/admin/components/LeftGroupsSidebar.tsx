"use client";

import React, { useMemo } from "react";
import { Users, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toMin, toFormat12h, formatMins } from "../hooks/useScheduleState";

interface LeftGroupsSidebarProps {
    showLeftSidebar: boolean;
    filtered: any[];
    activeGroup: any;
    groupId: string;
    isDark: boolean;
    localPrograms: any[];
    handleGroupFocus: (gid: string) => void;
    gcColorHelper: (id: string, isDark?: boolean) => { solid: string; bg: string };
}

export function LeftGroupsSidebar({
    showLeftSidebar,
    filtered,
    activeGroup,
    groupId,
    isDark,
    localPrograms,
    handleGroupFocus,
    gcColorHelper
}: LeftGroupsSidebarProps) {
    if (!showLeftSidebar) return null;

    return (
        <div className="w-40 shrink-0 border-r border-border/30 bg-card flex flex-col min-h-0">
            {/* Panel header */}
            <div className="px-2 py-1 border-b border-border/20 flex items-center gap-1 shrink-0">
                <Users className="w-2.5 h-2.5 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                    Grupos ({filtered.length})
                </span>
            </div>
            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1 min-h-0">
                {filtered.map(g => {
                    const sel = g.id === groupId;
                    const th = gcColorHelper(g.id, isDark);
                    const totalPeriodCourses = g.period?.courses.length ?? 0;
                    const scheduledCount = g.courses.length;
                    const teacherAssigned = g.courses.filter((c: any) => c.teacherId !== null).length;
                    const allScheduled = totalPeriodCourses > 0 && scheduledCount >= totalPeriodCourses;
                    const allTeachers = scheduledCount > 0 && teacherAssigned === scheduledCount;
                    const fullyDone = allScheduled && allTeachers;
                    const partiallyDone = allScheduled && !allTeachers;
                    const pct = totalPeriodCourses
                        ? Math.min(100, Math.round(scheduledCount / totalPeriodCourses * 100)) : 0;
                    const groupTotalMins = g.courses.reduce((sum: number, c: any) => sum + c.schedules.reduce((acc: number, s: any) => acc + toMin(s.endTime) - toMin(s.startTime), 0), 0);

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
    );
}
