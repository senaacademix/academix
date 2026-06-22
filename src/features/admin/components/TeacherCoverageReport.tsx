"use client";

import React, { useMemo, useState } from "react";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, BookOpen, AlertTriangle, Info, ShieldAlert, AlertOctagon, UserCircle2, Mail, CheckCircle2, CalendarDays, PieChart as PieChartIcon, BarChart2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const DAYS_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_LABELS: Record<string, string> = {
    MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles",
    THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado", SUNDAY: "Domingo",
};
const HOURS_ORDER = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 to 22:00

interface TeacherCoverageReportProps {
    teachers: any[];
}

export function TeacherCoverageReport({ teachers }: TeacherCoverageReportProps) {
    const [selectedProgramId, setSelectedProgramId] = useState<string>("");
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");

    // Extract all unique programs
    const allPrograms = useMemo(() => {
        const progMap = new Map<string, string>();
        teachers.forEach(t => {
            if (t.programs) {
                t.programs.forEach((p: any) => progMap.set(p.id, p.name));
            }
            if (t.qualifiedCourses) {
                t.qualifiedCourses.forEach((c: any) => {
                    if (c.period?.program) {
                        progMap.set(c.period.program.id, c.period.program.name);
                    }
                });
            }
        });
        const list = Array.from(progMap.entries()).map(([id, name]) => ({ id, name }));
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [teachers]);

    // Default selection
    React.useEffect(() => {
        if (!selectedProgramId && allPrograms.length > 0) {
            setSelectedProgramId(allPrograms[0].id);
            setSelectedTeacherId("all");
        }
    }, [allPrograms, selectedProgramId]);

    // Compute teachers for the current program for the dropdown
    const programTeachers = useMemo(() => {
        if (!selectedProgramId) return [];
        return teachers.filter(t => 
            t.programs?.some((p: any) => p.id === selectedProgramId) ||
            t.qualifiedCourses?.some((c: any) => c.period?.program?.id === selectedProgramId)
        ).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
    }, [teachers, selectedProgramId]);

    // Filter teachers by selected program, optional specific teacher, and apply locked filters
    const filteredTeachers = useMemo(() => {
        if (!selectedProgramId) return [];
        let list = teachers.filter(t => 
            t.programs?.some((p: any) => p.id === selectedProgramId) ||
            t.qualifiedCourses?.some((c: any) => c.period?.program?.id === selectedProgramId)
        );

        if (selectedTeacherId !== "all") {
            list = list.filter(t => t.id === selectedTeacherId);
        }

        return list.map(t => ({
                ...t,
                // Only consider availabilities if locked/approved
                availabilities: t.availabilityLocked ? (t.availabilities || []) : [],
                // Only consider qualified courses if locked/approved
                qualifiedCourses: t.qualifiedCoursesLocked ? (t.qualifiedCourses || []) : []
            }));
    }, [teachers, selectedProgramId, selectedTeacherId]);

    // ─── Metrics ───
    const metrics = useMemo(() => {
        let withAvailability = 0;
        let withCourses = 0;

        filteredTeachers.forEach(t => {
            if (t.availabilities && t.availabilities.length > 0) {
                withAvailability++;
            }
            const coursesInProgram = t.qualifiedCourses?.filter((c: any) => c.period?.program?.id === selectedProgramId) || [];
            if (coursesInProgram.length > 0) {
                withCourses++;
            }
        });

        return {
            total: filteredTeachers.length,
            withAvailability,
            withCourses,
            pendingAvailability: filteredTeachers.filter(t => !t.availabilityLocked),
            pendingCourses: filteredTeachers.filter(t => !t.qualifiedCoursesLocked)
        };
    }, [filteredTeachers, selectedProgramId]);

    // ─── Heatmap Data Processing ───
    const heatmapData = useMemo(() => {
        const matrix: Record<string, Record<number, { count: number, teachers: string[] }>> = {};
        DAYS_ORDER.forEach(d => {
            matrix[d] = {};
            HOURS_ORDER.forEach(h => {
                matrix[d][h] = { count: 0, teachers: [] };
            });
        });

        filteredTeachers.forEach(t => {
            if (!t.availabilities) return;
            t.availabilities.forEach((slot: any) => {
                const day = slot.dayOfWeek;
                if (!matrix[day]) return;
                const startH = parseInt(slot.startTime.split(':')[0]);
                const endH = parseInt(slot.endTime.split(':')[0]);
                
                for (let h = startH; h < endH; h++) {
                    if (matrix[day][h]) {
                        const teacherName = t.name || t.email;
                        if (!matrix[day][h].teachers.includes(teacherName)) {
                            matrix[day][h].teachers.push(teacherName);
                            matrix[day][h].count++;
                        }
                    }
                }
            });
        });

        return matrix;
    }, [filteredTeachers]);

    // ─── Subject Coverage Processing ───
    const coverageBySubject = useMemo(() => {
        const map: any = {};
        filteredTeachers.forEach(t => {
            if (!t.qualifiedCourses) return;
            t.qualifiedCourses.forEach((c: any) => {
                const programId = c.period?.program?.id || 'unassigned_program';
                if (programId !== selectedProgramId) return;

                const programName = c.period?.program?.name || 'Sin Programa Asignado';
                const periodId = c.period?.id || 'unassigned_period';
                const periodName = c.period?.name || 'Sin Período';

                if (!map[programId]) map[programId] = { name: programName, periods: {} };
                if (!map[programId].periods[periodId]) map[programId].periods[periodId] = { name: periodName, courses: {} };
                
                if (!map[programId].periods[periodId].courses[c.id]) {
                    map[programId].periods[periodId].courses[c.id] = {
                        id: c.id,
                        title: c.title,
                        qualifiedTeachers: []
                    };
                }

                const exists = map[programId].periods[periodId].courses[c.id].qualifiedTeachers.find((qt: any) => qt.id === t.id);
                if (!exists) {
                    map[programId].periods[periodId].courses[c.id].qualifiedTeachers.push({
                        id: t.id,
                        name: t.name || t.email,
                        availabilities: t.availabilities || []
                    });
                }
            });
        });
        return map;
    }, [filteredTeachers, selectedProgramId]);

    // ─── ALERTS ───
    const alerts = useMemo(() => {
        const atRiskCourses: string[] = [];
        const missingTimeslots: string[] = [];

        Object.values(coverageBySubject).forEach((prog: any) => {
            Object.values(prog.periods).forEach((per: any) => {
                Object.values(per.courses).forEach((course: any) => {
                    if (course.qualifiedTeachers.length === 1) {
                        atRiskCourses.push(course.title);
                    }
                });
            });
        });

        const WORK_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
        const WORK_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

        WORK_DAYS.forEach(d => {
            WORK_HOURS.forEach(h => {
                if (heatmapData[d][h].count === 0) {
                    missingTimeslots.push(`${DAY_LABELS[d]} ${h}:00`);
                }
            });
        });

        return {
            atRiskCourses,
            missingTimeslots,
            pendingAvailability: metrics.pendingAvailability.map(t => t.name || t.email),
            pendingCourses: metrics.pendingCourses.map(t => t.name || t.email)
        };
    }, [coverageBySubject, heatmapData, metrics]);

    // ─── Analytics Data ───
    const teacherHoursData = useMemo(() => {
        const data = filteredTeachers.map(t => {
            let totalHours = 0;
            if (t.availabilities) {
                t.availabilities.forEach((a: any) => {
                    const startH = parseInt(a.startTime.split(':')[0]);
                    const endH = parseInt(a.endTime.split(':')[0]);
                    totalHours += (endH - startH);
                });
            }
            return {
                name: (t.name || t.email).substring(0, 15) + ( (t.name || t.email).length > 15 ? '...' : ''),
                hours: totalHours
            };
        }).filter(d => d.hours > 0).sort((a, b) => b.hours - a.hours);
        return data;
    }, [filteredTeachers]);

    const configStatusData = useMemo(() => {
        return [
            { name: "Aprobados", value: metrics.withAvailability, color: "#10b981" },
            { name: "Borrador/Pendiente", value: metrics.pendingAvailability.length, color: "#f43f5e" }
        ];
    }, [metrics]);

    const courseCapacityData = useMemo(() => {
        const data: any[] = [];
        Object.values(coverageBySubject).forEach((prog: any) => {
            Object.values(prog.periods).forEach((per: any) => {
                Object.values(per.courses).forEach((course: any) => {
                    data.push({
                        name: course.title.length > 20 ? course.title.substring(0, 20) + "..." : course.title,
                        fullTitle: course.title,
                        docentes: course.qualifiedTeachers.length
                    });
                });
            });
        });
        return data.sort((a, b) => a.docentes - b.docentes);
    }, [coverageBySubject]);

    // ─── Helpers for Teacher Cards ───
    const getConsolidatedAvailabilities = (availabilities: any[]) => {
        if (!availabilities || availabilities.length === 0) return [];
        const byDay: Record<string, number[]> = {};
        availabilities.forEach(a => {
            if (!byDay[a.dayOfWeek]) byDay[a.dayOfWeek] = [];
            const startH = parseInt(a.startTime.split(':')[0]);
            const endH = parseInt(a.endTime.split(':')[0]);
            for (let h = startH; h < endH; h++) {
                if (!byDay[a.dayOfWeek].includes(h)) byDay[a.dayOfWeek].push(h);
            }
        });
    
        const result: string[] = [];
        DAYS_ORDER.forEach(d => {
            if (byDay[d]) {
                const hours = byDay[d].sort((a,b) => a-b);
                if (hours.length === 0) return;
                const blocks = [];
                let start = hours[0];
                let prev = hours[0];
                for (let i = 1; i < hours.length; i++) {
                    if (hours[i] === prev + 1) {
                        prev = hours[i];
                    } else {
                        blocks.push(`${start}:00 - ${prev+1}:00`);
                        start = hours[i];
                        prev = hours[i];
                    }
                }
                blocks.push(`${start}:00 - ${prev+1}:00`);
                result.push(`${DAY_LABELS[d].substring(0,3)}: ${blocks.join(', ')}`);
            }
        });
        return result;
    };

    return (
        <div className="flex flex-col flex-1 h-full w-full bg-slate-50/50 dark:bg-slate-950/20 overflow-y-auto p-4 md:p-8 gap-6 custom-scrollbar">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-50">
                <div className="flex flex-col gap-1.5">
                    <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                        Panel de Control: Cobertura Docente
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Vista unificada de disponibilidad, faltantes y capacidad, filtrada por programa. Sólo se consideran horarios y materias aprobadas.
                    </p>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-sm font-semibold whitespace-nowrap px-2 text-slate-700 dark:text-slate-300">Programa:</span>
                        <Select 
                            value={selectedProgramId} 
                            onValueChange={(val) => {
                                setSelectedProgramId(val);
                                setSelectedTeacherId("all");
                            }}
                        >
                            <SelectTrigger className="w-[280px] bg-transparent border-none shadow-none focus:ring-0 font-medium text-primary">
                                <SelectValue placeholder="Seleccionar Programa" />
                            </SelectTrigger>
                            <SelectContent className="border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                                {allPrograms.length === 0 ? (
                                    <SelectItem value="none" disabled>No hay programas</SelectItem>
                                ) : (
                                    allPrograms.map(p => (
                                        <SelectItem key={p.id} value={p.id} className="font-medium">{p.name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <span className="text-sm font-semibold whitespace-nowrap px-2 text-slate-700 dark:text-slate-300">Docente:</span>
                        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                            <SelectTrigger className="w-[220px] bg-transparent border-none shadow-none focus:ring-0 font-medium text-primary">
                                <SelectValue placeholder="Todos los docentes" />
                            </SelectTrigger>
                            <SelectContent className="border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-[300px]">
                                <SelectItem value="all" className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">Todos los docentes</SelectItem>
                                {programTeachers.map(t => (
                                    <SelectItem key={t.id} value={t.id} className="font-medium">
                                        {t.name || t.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="operative" className="flex flex-col gap-6">
                <div className="flex justify-center shrink-0">
                    <TabsList className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl">
                        <TabsTrigger value="operative" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">
                            <CalendarDays className="w-4 h-4 mr-2" />
                            Panel Operativo (Matriz)
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">
                            <PieChartIcon className="w-4 h-4 mr-2" />
                            Analítica y Gráficos
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="operative" className="flex flex-col gap-8 m-0 p-0 animate-in fade-in-50 duration-500">
                    {/* Premium Missing Alerts Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
                        {/* Alerta Roja */}
                        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-red-50 to-white dark:from-red-950/40 dark:to-slate-900/80 ring-1 ring-red-100 dark:ring-red-900/50 rounded-2xl transition-transform hover:-translate-y-1 duration-300">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><AlertOctagon className="w-24 h-24 text-red-500" /></div>
                            <CardHeader className="pb-2 relative z-10">
                                <CardTitle className="text-lg font-bold text--700 dark:text--300 dark:text-red-400 flex items-center gap-2">
                                    <AlertOctagon className="h-5 w-5" /> Faltantes de Disponibilidad
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <p className="text-xs text-red-600/80 dark:text-red-400/80 font-medium mb-3">Franjas hábiles (Lun-Vie, 8am-6pm) con 0 docentes aprobados:</p>
                                <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto custom-scrollbar">
                                    {alerts.missingTimeslots.length === 0 ? (
                                        <span className="text--600 dark:text--400 dark:text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Cobertura completa 100%</span>
                                    ) : (
                                        alerts.missingTimeslots.map((ts, i) => (
                                            <Badge key={i} variant="outline" className="bg-white/80 dark:bg-slate-900/80 border--200 dark:border--800/50 dark:border-red-800 text--700 dark:text--300 dark:text-red-400 font-semibold text-[10px] px-2 py-0.5 rounded-full shadow-sm">{ts}</Badge>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Alerta Naranja */}
                        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-900/80 ring-1 ring-amber-100 dark:ring-amber-900/50 rounded-2xl transition-transform hover:-translate-y-1 duration-300">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><AlertTriangle className="w-24 h-24 text-amber-500" /></div>
                            <CardHeader className="pb-2 relative z-10">
                                <CardTitle className="text-lg font-bold text--700 dark:text--300 dark:text-amber-500 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" /> Materias en Riesgo
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <p className="text-xs text-amber-600/80 dark:text-amber-500/80 font-medium mb-3">Materias con solo 1 docente capacitado y aprobado:</p>
                                <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto custom-scrollbar">
                                    {alerts.atRiskCourses.length === 0 ? (
                                        <span className="text--600 dark:text--400 dark:text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Ninguna materia en riesgo</span>
                                    ) : (
                                        alerts.atRiskCourses.map((c, i) => (
                                            <Badge key={i} variant="outline" className="bg-white/80 dark:bg-slate-900/80 border--200 dark:border--800/50 dark:border-amber-800 text--700 dark:text--300 dark:text-amber-500 font-semibold text-[10px] px-2 py-0.5 rounded-full shadow-sm">{c}</Badge>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Alerta Azul */}
                        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-slate-900/80 ring-1 ring-blue-100 dark:ring-blue-900/50 rounded-2xl transition-transform hover:-translate-y-1 duration-300">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-24 h-24 text-blue-500" /></div>
                            <CardHeader className="pb-2 relative z-10">
                                <CardTitle className="text-lg font-bold text--700 dark:text--300 dark:text-blue-400 flex items-center gap-2">
                                    <Info className="h-5 w-5" /> Pendientes por Aprobar
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <p className="text-xs text-blue-600/80 dark:text-blue-400/80 font-medium mb-3">Docentes con horario en borrador (faltan por aprobar):</p>
                                <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto custom-scrollbar">
                                    {alerts.pendingAvailability.length === 0 ? (
                                        <span className="text--600 dark:text--400 dark:text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Todos los horarios aprobados</span>
                                    ) : (
                                        alerts.pendingAvailability.map((t, i) => (
                                            <Badge key={i} variant="outline" className="bg-white/80 dark:bg-slate-900/80 border--200 dark:border--800/50 dark:border-blue-800 text--700 dark:text--300 dark:text-blue-400 font-semibold text-[10px] px-2 py-0.5 rounded-full shadow-sm">{t}</Badge>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Weekly Heatmap Matrix */}
                    <Card className="shadow-lg border-border bg-white dark:bg-slate-950 rounded-2xl overflow-hidden">
                        <CardHeader className="pb-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-border/50">
                            <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xl font-bold gap-4">
                                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 dark:text-slate-100">
                                    <CalendarDays className="h-6 w-6 text-primary" />
                                    Matriz de Disponibilidad Semanal
                                </div>
                                <div className="flex items-center gap-4 text-xs font-semibold bg-white dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500/20 border border-red-500 rounded-full"></div> 0 docentes (Alerta)</span>
                                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-300 dark:bg-slate-600 rounded-full"></div> 1 docente (Riesgo)</span>
                                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-800 dark:bg-slate-200 rounded-full shadow-sm"></div> 2+ docentes (Óptimo)</span>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto p-6">
                            <div className="min-w-[900px]">
                                {/* Time of Day Indicator (Swapped Morning/Blue, Afternoon/Amber) */}
                                <div className="flex mb-3">
                                    <div className="w-28 shrink-0"></div>
                                    <div className="flex-1 flex gap-1.5">
                                        <div className="flex-[6] text-center text-[10px] font-bold text--700 dark:text--300 dark:text-blue-400 bg--100 dark:bg--900/30 dark:bg-blue-950/40 rounded-full py-0.5 flex justify-center items-center gap-1.5 border border--200 dark:border--800/50 dark:border-blue-900/50">
                                            🌤️ Mañana
                                        </div>
                                        <div className="flex-[6] text-center text-[10px] font-bold text--700 dark:text--300 dark:text-amber-500 bg--100 dark:bg--900/30 dark:bg-amber-950/40 rounded-full py-0.5 flex justify-center items-center gap-1.5 border border--200 dark:border--800/50 dark:border-amber-900/50">
                                            ☀️ Tarde
                                        </div>
                                        <div className="flex-[5] text-center text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/40 rounded-full py-0.5 flex justify-center items-center gap-1.5 border border-purple-200 dark:border-purple-900/50">
                                            🌙 Noche
                                        </div>
                                    </div>
                                </div>

                                {/* Header Hours */}
                                <div className="flex border-b-2 border-slate-100 dark:border-slate-800 pb-3 mb-4">
                                    <div className="w-28 shrink-0 font-bold text-sm text-slate-400 uppercase tracking-wider">Día / Hora</div>
                                    <div className="flex-1 flex justify-between">
                                        {HOURS_ORDER.map(h => (
                                            <div key={h} className="flex-1 text-center text-xs font-bold text-slate-500">
                                                {h}:00
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Grid Rows */}
                                <TooltipProvider delayDuration={0}>
                                    <div className="flex flex-col gap-3">
                                        {DAYS_ORDER.map(day => (
                                            <div key={day} className="flex items-stretch group">
                                                <div className="w-28 shrink-0 flex items-center font-bold text-sm text-slate-700 dark:text-slate-300">
                                                    {DAY_LABELS[day]}
                                                </div>
                                                <div className="flex-1 flex gap-1.5">
                                                    {HOURS_ORDER.map(hour => {
                                                        const cell = heatmapData[day][hour];
                                                        
                                                        // Determine Color based on Time and Availability
                                                        let colorClass = "";
                                                        let theme = "";
                                                        if (hour >= 6 && hour <= 11) theme = "blue";
                                                        else if (hour >= 12 && hour <= 17) theme = "amber";
                                                        else theme = "purple";

                                                        if (cell.count === 0) {
                                                            colorClass = "bg-red-50/30 dark:bg-red-950/10 border-red-400/60 dark:border-red-500/40 text--600 dark:text--400 dark:text-red-400 ring-1 ring-red-400/20";
                                                        } else if (cell.count === 1) {
                                                            if (theme === "amber") colorClass = "bg--100 dark:bg--900/30 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-400";
                                                            else if (theme === "blue") colorClass = "bg--100 dark:bg--900/30 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700/60 text-blue-800 dark:text-blue-400";
                                                            else colorClass = "bg-primary/10 border-primary/30 text-primary";
                                                        } else {
                                                            if (theme === "amber") colorClass = "bg-amber-500 border-amber-600 text-white shadow-sm shadow-amber-500/20";
                                                            else if (theme === "blue") colorClass = "bg-blue-500 border-blue-600 text-white shadow-sm shadow-blue-500/20";
                                                            else colorClass = "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20";
                                                        }

                                                        const activeClass = cell.count > 0 
                                                            ? "hover:shadow-md hover:scale-[1.15] z-10 relative cursor-pointer ring-offset-2 hover:ring-2 hover:ring-primary/50 font-bold" 
                                                            : "font-bold";

                                                        return (
                                                            <Tooltip key={`${day}-${hour}`}>
                                                                <TooltipTrigger asChild>
                                                                    <div 
                                                                        className={`flex-1 h-10 rounded-md border transition-all duration-200 flex items-center justify-center ${colorClass} ${activeClass}`}
                                                                    >
                                                                        {cell.count > 0 && <span className="text-[11px] font-black">{cell.count}</span>}
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="p-4 max-w-sm rounded-xl shadow-2xl border-border bg-card/95 backdrop-blur-md">
                                                                    <div className="border-b border-border/50 pb-2 mb-2">
                                                                        <p className="font-extrabold text-sm">{DAY_LABELS[day]} a las {hour}:00</p>
                                                                        <p className="text-xs text-muted-foreground font-medium mt-0.5">Docentes aprobados disponibles: <span className="font-bold text-foreground">{cell.count}</span></p>
                                                                    </div>
                                                                    {cell.teachers.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                                            {cell.teachers.map((t, idx) => (
                                                                                <Badge key={idx} variant="secondary" className="font-medium bg-primary/10 text-primary border-primary/20">{t}</Badge>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {cell.count === 0 && (
                                                                        <div className="flex items-center gap-1.5 text-xs text-red-500 font-bold bg-red-500/10 p-2 rounded-lg mt-1">
                                                                            <AlertOctagon className="w-3.5 h-3.5" /> Ningún docente aprobado
                                                                        </div>
                                                                    )}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TooltipProvider>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Per-Teacher Individual Analysis Section */}
                    <div className="flex flex-col gap-4 mt-4">
                        <div className="flex items-center gap-2 px-2">
                            <UserCircle2 className="h-7 w-7 text-primary" />
                            <h3 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-200 dark:text-slate-100">Análisis Individual por Docente</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredTeachers.length === 0 ? (
                                <div className="col-span-full text-center py-12 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <p className="text-muted-foreground font-medium">No hay docentes asociados a este programa.</p>
                                </div>
                            ) : (
                                filteredTeachers.map(teacher => {
                                    const availList = getConsolidatedAvailabilities(teacher.availabilities || []);
                                    const coursesList = teacher.qualifiedCourses?.filter((c:any) => c.period?.program?.id === selectedProgramId) || [];
                                    const hasAvail = availList.length > 0;

                                    return (
                                        <Card key={teacher.id} className="border-border shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-950 overflow-hidden flex flex-col rounded-2xl">
                                            <div className={`h-2 w-full ${hasAvail ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            <CardHeader className="pb-3 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/30">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shrink-0 shadow-inner">
                                                            {(teacher.name || "P").substring(0,2).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <CardTitle className="text-base font-bold truncate">{teacher.name || "Sin nombre"}</CardTitle>
                                                            <CardDescription className="text-xs flex items-center gap-1.5 mt-1 truncate">
                                                                <Mail className="w-3 h-3 shrink-0" /> {teacher.email}
                                                            </CardDescription>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-4 flex-1 flex flex-col gap-5">
                                                {/* Availability Mini-summary */}
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" /> Disponibilidad Aprobada
                                                    </h4>
                                                    {hasAvail ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {availList.map((str, i) => (
                                                                <Badge key={i} variant="secondary" className="bg--50 dark:bg--950/20 dark:bg-emerald-950/30 text--700 dark:text--300 dark:text-emerald-400 border--200 dark:border--800/50 dark:border-emerald-800/50 font-medium text-[10px] px-2 py-0.5">
                                                                    {str}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <Badge variant="destructive" className="font-semibold text-[10px] bg--100 dark:bg--900/30 dark:bg-red-900/30 text--700 dark:text--300 dark:text-red-400 border-none shadow-none">
                                                            {teacher.availabilityLocked ? "Sin horario" : "Horario en Borrador"}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Qualified Courses Mini-summary */}
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                        <BookOpen className="w-3.5 h-3.5" /> Materias Aprobadas ({coursesList.length})
                                                    </h4>
                                                    {coursesList.length > 0 ? (
                                                        <ul className="space-y-1">
                                                            {coursesList.map((c:any) => (
                                                                <li key={c.id} className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-md">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                                                                    <span className="leading-tight">{c.title}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground italic">
                                                            {teacher.qualifiedCoursesLocked ? "No tiene materias" : "Materias en Borrador"}
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Legacy Subject Coverage Grid (Compact view) */}
                    <div className="flex flex-col gap-4 mt-6">
                        <div className="flex items-center gap-2 px-2">
                            <BookOpen className="h-6 w-6 text-primary" />
                            <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-200 dark:text-slate-100">Vista Compacta: Docentes por Materia</h3>
                        </div>
                        
                        <Card className="shadow-lg border-border bg-white dark:bg-slate-950 rounded-2xl overflow-hidden mb-10">
                            <CardContent className="p-6">
                                {Object.keys(coverageBySubject).length === 0 ? (
                                    <div className="text-center text-muted-foreground py-10 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                        No hay materias registradas para este programa.
                                    </div>
                                ) : (
                                    Object.entries(coverageBySubject).map(([progId, prog]: [string, any]) => (
                                        <div key={progId} className="space-y-8">
                                            {Object.entries(prog.periods).map(([perId, per]: [string, any]) => (
                                                <div key={perId} className="space-y-4">
                                                    <h4 className="text-sm font-extrabold text-primary uppercase tracking-widest flex items-center gap-3">
                                                        <div className="h-px bg-primary/20 flex-1" />
                                                        {per.name}
                                                        <div className="h-px bg-primary/20 flex-1" />
                                                    </h4>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                        {Object.entries(per.courses).map(([courseId, course]: [string, any]) => {
                                                            const teacherCount = course.qualifiedTeachers.length;
                                                            const isCritical = teacherCount === 0;
                                                            const isWarning = teacherCount === 1;

                                                            return (
                                                                <div key={courseId} className={`relative p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow ${isCritical ? 'border-red-500/50 ring-1 ring-red-500/20 bg-red-50/30 dark:bg-red-950/10' : isWarning ? 'border-amber-500/50 ring-1 ring-amber-500/20 bg-amber-50/30 dark:bg-amber-950/10' : 'border-slate-200 dark:border-slate-800 hover:border-primary/30'}`}>
                                                                    <div className="flex justify-between items-start mb-3 gap-2">
                                                                        <div className="font-bold text-sm leading-tight text-slate-800 dark:text-slate-200 dark:text-slate-200">{course.title}</div>
                                                                        <Badge variant={isCritical ? "destructive" : isWarning ? "outline" : "secondary"} className={`text-[10px] shrink-0 font-bold ${isWarning ? 'text--700 dark:text--300 dark:text-amber-500 border-amber-500/50 bg-amber-100/50 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                                            {teacherCount} doc.
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                                                                        {course.qualifiedTeachers.map((qt: any) => (
                                                                            <div key={qt.id} className="text-xs flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 rounded-lg shadow-sm">
                                                                                <Tooltip><TooltipTrigger asChild><span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{qt.name}</span></TooltipTrigger><TooltipContent><p>{qt.name}</p></TooltipContent></Tooltip>
                                                                                <span className="text-[10px] font-medium text-slate-400 shrink-0">
                                                                                    {qt.availabilities.length > 0 ? 
                                                                                        <span className="flex items-center gap-1 text--600 dark:text--400 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3"/> Ok</span>
                                                                                        : <span className="text-red-500 font-bold">N/A</span>
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                        {isCritical && (
                                                                            <div className="text-xs text--600 dark:text--400 font-medium bg--100 dark:bg--900/30 dark:bg-red-900/40 p-2 rounded-lg mt-1 text-center">
                                                                                No hay docentes
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="analytics" className="flex flex-col gap-6 animate-in fade-in-50 duration-500 m-0 p-0 h-[800px]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                        
                        {/* Estado de Configuración Pie Chart */}
                        <Card className="shadow-lg border-border bg-white dark:bg-slate-950 rounded-2xl flex flex-col">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Estado de Aprobación de Horarios</CardTitle>
                                <CardDescription>Proporción de docentes que tienen su horario finalizado y aprobado</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={configStatusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {configStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip 
                                            formatter={(value) => [`${value} Docentes`, '']}
                                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Top Docentes por Horas */}
                        <Card className="shadow-lg border-border bg-white dark:bg-slate-950 rounded-2xl flex flex-col">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Top Docentes por Disponibilidad Aprobada</CardTitle>
                                <CardDescription>Ranking de docentes con mayor cantidad de horas confirmadas</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={teacherHoursData.slice(0, 10)} // Top 10
                                        margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                                        <XAxis type="number" tick={{fontSize: 12}} />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                                        <RechartsTooltip 
                                            formatter={(value) => [`${value} Horas`, 'Disponibilidad']}
                                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Capacity bottlenecks */}
                        <Card className="shadow-lg border-border bg-white dark:bg-slate-950 rounded-2xl flex flex-col col-span-1 lg:col-span-2">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Densidad de Docentes Aprobados por Materia</CardTitle>
                                <CardDescription>Cuellos de botella: Materias con menos personal capacitado y finalizado</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={courseCapacityData}
                                        margin={{ top: 20, right: 30, left: 0, bottom: 80 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                        <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" />
                                        <YAxis allowDecimals={false} tick={{fontSize: 12}} />
                                        <RechartsTooltip 
                                            labelFormatter={(label, payload: any) => payload?.[0]?.payload?.fullTitle || label}
                                            formatter={(value: any) => [`${value} Docentes`, 'Habilitados']}
                                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="docentes" radius={[4, 4, 0, 0]}>
                                            {courseCapacityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.docentes === 0 ? "#ef4444" : entry.docentes === 1 ? "#f59e0b" : "#10b981"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
