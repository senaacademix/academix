"use client";

import React, { useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, BarChart3, Clock, Users, BookOpen, Layers, AlertTriangle, MapPin, CalendarDays, PieChart } from "lucide-react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    ChartTooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
);

interface AnalyticsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    programs: any[]; // localPrograms
}

const DAYS_ORDER: Record<string, number> = {
    "MONDAY": 1, "TUESDAY": 2, "WEDNESDAY": 3, "THURSDAY": 4, "FRIDAY": 5, "SATURDAY": 6, "SUNDAY": 7
};

const DAY_NAMES: Record<string, string> = {
    "MONDAY": "Lunes", "TUESDAY": "Martes", "WEDNESDAY": "Miércoles", 
    "THURSDAY": "Jueves", "FRIDAY": "Viernes", "SATURDAY": "Sábado", "SUNDAY": "Domingo"
};

function getHours(start: string, end: string) {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(":").map(Number);
    const [h2, m2] = end.split(":").map(Number);
    return (h2 + m2 / 60) - (h1 + m1 / 60);
}

export function ScheduleAnalyticsDialog({ open, onOpenChange, programs }: AnalyticsDialogProps) {
    
    // Compute analytics
    const {
        totalHours,
        totalCourses,
        teachersStats,
        subjectStats,
        dayStats,
        activeTeachersCount,
        unassignedHours,
        environmentStats,
        programStats,
        periodStats,
        jornadaStats,
        totalCapacityHours
    } = useMemo(() => {
        let tHours = 0;
        let tCourses = 0;
        let unassignedH = 0;
        
        const teacherMap: Record<string, { name: string, scheduledHours: number, availableHours: number }> = {};
        const subjectMap: Record<string, number> = {};
        const envMap: Record<string, number> = {};
        const progMap: Record<string, number> = {};
        const perMap: Record<string, number> = {};
        const jorMap: Record<string, number> = { "Mañana": 0, "Tarde": 0, "Noche": 0 };
        
        const dayMap: Record<string, number> = {
            "MONDAY": 0, "TUESDAY": 0, "WEDNESDAY": 0, "THURSDAY": 0, "FRIDAY": 0, "SATURDAY": 0, "SUNDAY": 0
        };

        // Initialize teachers from programs
        programs.forEach(p => {
            p.teachers?.forEach((t: any) => {
                if (!teacherMap[t.id]) {
                    let availHours = 0;
                    t.availabilities?.forEach((a: any) => {
                        availHours += getHours(a.startTime, a.endTime);
                    });

                    teacherMap[t.id] = {
                        name: t.name || t.email || "NN",
                        scheduledHours: 0,
                        availableHours: availHours
                    };
                }
            });
        });

        // Traverse courses and schedules
        programs.forEach(p => {
            p.groups?.forEach((g: any) => {
                g.courses?.forEach((c: any) => {
                    if (c.schedules && c.schedules.length > 0) {
                        tCourses++;
                        c.schedules.forEach((s: any) => {
                            const hrs = getHours(s.startTime, s.endTime);
                            if (hrs > 0) {
                                tHours += hrs;
                                
                                // Subject stat
                                const title = c.title;
                                subjectMap[title] = (subjectMap[title] || 0) + hrs;

                                // Day stat
                                if (dayMap[s.dayOfWeek] !== undefined) {
                                    dayMap[s.dayOfWeek] += hrs;
                                }

                                // Environment stat
                                const envName = g.environment?.name || "Sin Ambiente";
                                envMap[envName] = (envMap[envName] || 0) + hrs;

                                // Program stat
                                const progName = p.name || "Sin Programa";
                                progMap[progName] = (progMap[progName] || 0) + hrs;

                                // Period stat
                                const perName = g.period?.name || "Sin Trimestre";
                                perMap[perName] = (perMap[perName] || 0) + hrs;

                                // Jornada stat
                                const startH = parseInt(s.startTime.split(":")[0]);
                                if (startH < 12) jorMap["Mañana"] += hrs;
                                else if (startH < 18) jorMap["Tarde"] += hrs;
                                else jorMap["Noche"] += hrs;

                                // Teacher stat & Unassigned
                                if (c.teacherId) {
                                    if (!teacherMap[c.teacherId]) {
                                        teacherMap[c.teacherId] = {
                                            name: c.teacher?.name || "NN",
                                            scheduledHours: 0,
                                            availableHours: 0
                                        };
                                    }
                                    teacherMap[c.teacherId].scheduledHours += hrs;
                                } else {
                                    unassignedH += hrs;
                                }
                            }
                        });
                    }
                });
            });
        });

        const tStats = Object.values(teacherMap)
            .filter(t => t.scheduledHours > 0 || t.availableHours > 0)
            .sort((a, b) => b.scheduledHours - a.scheduledHours);

        const subStats = Object.entries(subjectMap)
            .map(([title, hrs]) => ({ title, hrs }))
            .sort((a, b) => b.hrs - a.hrs)
            .slice(0, 10);

        const dStats = Object.entries(dayMap)
            .sort((a, b) => DAYS_ORDER[a[0]] - DAYS_ORDER[b[0]])
            .map(([day, hrs]) => ({ day: DAY_NAMES[day] || day, hrs }));

        const eStats = Object.entries(envMap)
            .map(([name, hrs]) => ({ name, hrs }))
            .sort((a, b) => b.hrs - a.hrs);

        const pStats = Object.entries(progMap)
            .map(([name, hrs]) => ({ name, hrs }))
            .sort((a, b) => b.hrs - a.hrs);

        const perStats = Object.entries(perMap)
            .map(([name, hrs]) => ({ name, hrs }))
            .sort((a, b) => b.hrs - a.hrs);

        const jStats = Object.entries(jorMap)
            .map(([name, hrs]) => ({ name, hrs }))
            .filter(j => j.hrs > 0);

        const totalCap = tStats.reduce((acc, t) => acc + t.availableHours, 0);

        return {
            totalHours: tHours,
            totalCourses: tCourses,
            teachersStats: tStats,
            subjectStats: subStats,
            dayStats: dStats,
            activeTeachersCount: tStats.filter(t => t.scheduledHours > 0).length,
            unassignedHours: unassignedH,
            environmentStats: eStats,
            programStats: pStats,
            periodStats: perStats,
            jornadaStats: jStats,
            totalCapacityHours: totalCap
        };
    }, [programs]);

    // Chart configurations
    const teachersChartData = {
        labels: teachersStats.map(t => t.name),
        datasets: [
            {
                label: 'Horas Programadas',
                data: teachersStats.map(t => t.scheduledHours),
                backgroundColor: 'rgba(59, 130, 246, 0.8)', // blue-500
                borderRadius: 4,
            },
            {
                label: 'Horas Disponibles Totales',
                data: teachersStats.map(t => t.availableHours),
                backgroundColor: 'rgba(203, 213, 225, 0.5)', // slate-300
                borderRadius: 4,
            }
        ],
    };

    const subjectsChartData = {
        labels: subjectStats.map(s => s.title),
        datasets: [
            {
                data: subjectStats.map(s => s.hrs),
                backgroundColor: [
                    '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
                    '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1'
                ],
                borderWidth: 0,
            },
        ],
    };

    const daysChartData = {
        labels: dayStats.map(d => d.day),
        datasets: [
            {
                label: 'Carga Horaria',
                data: dayStats.map(d => d.hrs),
                borderColor: '#8b5cf6', // violet-500
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#8b5cf6',
            },
        ],
    };

    const environmentChartData = {
        labels: environmentStats.map(e => e.name),
        datasets: [
            {
                label: 'Horas Asignadas',
                data: environmentStats.map(e => e.hrs),
                backgroundColor: 'rgba(16, 185, 129, 0.8)', // emerald-500
                borderRadius: 4,
            }
        ]
    };

    const programsChartData = {
        labels: programStats.map(p => p.name),
        datasets: [
            {
                data: programStats.map(p => p.hrs),
                backgroundColor: [
                    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
                    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'
                ],
                borderWidth: 0,
            }
        ]
    };

    const periodChartData = {
        labels: periodStats.map(p => p.name),
        datasets: [
            {
                label: 'Horas por Trimestre',
                data: periodStats.map(p => p.hrs),
                backgroundColor: 'rgba(245, 158, 11, 0.8)', // amber-500
                borderRadius: 4,
            }
        ]
    };

    const jornadaChartData = {
        labels: jornadaStats.map(j => j.name),
        datasets: [
            {
                data: jornadaStats.map(j => j.hrs),
                backgroundColor: [
                    '#3b82f6', // blue (Mañana)
                    '#f97316', // orange (Tarde)
                    '#6366f1', // indigo (Noche)
                ],
                borderWidth: 0,
            }
        ]
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none sm:max-w-none w-screen h-[100dvh] p-0 m-0 !rounded-none border-none flex flex-col bg-background/95 backdrop-blur-3xl overflow-hidden shadow-none">
                
                {/* Header Section */}
                <div className="relative z-10 px-6 py-4 border-b bg-card/80 backdrop-blur-sm shadow-sm shrink-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/30 shrink-0">
                            <BarChart3 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-black text-foreground leading-tight flex items-center gap-2">
                                <span>Analítica de Horarios</span>
                            </DialogTitle>
                            <DialogDescription className="text-[11px] text-muted-foreground mt-0">
                                Métricas, distribución y analíticas sobre la programación de horarios actual.
                            </DialogDescription>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full bg-muted/50 hover:bg-muted shrink-0 z-50 w-8 h-8">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 relative">
                    <div className="max-w-[1600px] mx-auto space-y-8">
                        
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all hover:border-primary/20 hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                    <Clock className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground leading-tight">Total Horas</p>
                                    <p className="text-2xl font-black text-foreground">{totalHours.toFixed(1)}</p>
                                </div>
                            </div>

                            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all hover:border-red-500/30 hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground leading-tight">Horas Sin Docente</p>
                                    <p className="text-2xl font-black text-red-500 dark:text-red-400">{unassignedHours.toFixed(1)}</p>
                                </div>
                            </div>

                            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all hover:border-primary/20 hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <PieChart className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground leading-tight">Uso de Capacidad</p>
                                    <p className="text-2xl font-black text-foreground">{totalCapacityHours > 0 ? ((totalHours/totalCapacityHours)*100).toFixed(1) : 0}%</p>
                                </div>
                            </div>

                            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all hover:border-primary/20 hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                                    <Users className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground leading-tight">Docentes Activos</p>
                                    <p className="text-2xl font-black text-foreground">{activeTeachersCount}</p>
                                </div>
                            </div>

                            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all hover:border-primary/20 hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0">
                                    <MapPin className="w-5 h-5 text-teal-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground leading-tight">Aulas en Uso</p>
                                    <p className="text-2xl font-black text-foreground">{environmentStats.length}</p>
                                </div>
                            </div>

                            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all hover:border-primary/20 hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                    <Layers className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground leading-tight">Fichas / Grupos</p>
                                    <p className="text-2xl font-black text-foreground">{programs.reduce((acc, p) => acc + (p.groups?.length || 0), 0)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Row 1: Teachers */}
                            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-blue-500 rounded-full" />
                                    Docentes
                                </h3>
                                <div className="h-[300px] w-full relative">
                                    <Bar 
                                        data={teachersChartData} 
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            indexAxis: 'y', // Horizontal
                                            scales: {
                                                x: { beginAtZero: true, grid: { color: 'rgba(150, 150, 150, 0.1)' } },
                                                y: { grid: { display: false } }
                                            },
                                            plugins: { legend: { display: false } }
                                        }} 
                                    />
                                </div>
                            </div>

                            {/* Row 1: Programs */}
                            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                                    Programas Formativos
                                </h3>
                                <div className="h-[300px] w-full relative">
                                    <Doughnut 
                                        data={programsChartData} 
                                        options={{
                                            responsive: true, maintainAspectRatio: false,
                                            plugins: { legend: { position: 'right' } }
                                        }} 
                                    />
                                </div>
                            </div>

                            {/* Row 1: Jornadas */}
                            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-orange-500 rounded-full" />
                                    Jornadas
                                </h3>
                                <div className="h-[300px] w-full relative flex items-center justify-center">
                                    <Doughnut 
                                        data={jornadaChartData} 
                                        options={{
                                            responsive: true, maintainAspectRatio: false,
                                            plugins: { legend: { position: 'right' } },
                                            cutout: '40%'
                                        }} 
                                    />
                                </div>
                            </div>

                            {/* Row 2: Environments */}
                            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-teal-500 rounded-full" />
                                    Ocupación de Aulas
                                </h3>
                                <div className="h-[300px] w-full relative">
                                    <Bar 
                                        data={environmentChartData} 
                                        options={{
                                            responsive: true, maintainAspectRatio: false,
                                            indexAxis: 'y',
                                            scales: {
                                                x: { beginAtZero: true, grid: { color: 'rgba(150, 150, 150, 0.1)' } },
                                                y: { grid: { display: false } }
                                            },
                                            plugins: { legend: { display: false } }
                                        }} 
                                    />
                                </div>
                            </div>

                            {/* Row 2: Periods */}
                            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-amber-500 rounded-full" />
                                    Carga por Trimestre
                                </h3>
                                <div className="h-[300px] w-full relative">
                                    <Bar 
                                        data={periodChartData} 
                                        options={{
                                            responsive: true, maintainAspectRatio: false,
                                            scales: {
                                                y: { beginAtZero: true, grid: { color: 'rgba(150, 150, 150, 0.1)' } },
                                                x: { grid: { display: false } }
                                            },
                                            plugins: { legend: { display: false } }
                                        }} 
                                    />
                                </div>
                            </div>

                            {/* Row 2: Days */}
                            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-purple-500 rounded-full" />
                                    Distribución Semanal
                                </h3>
                                <div className="h-[300px] w-full relative">
                                    <Line 
                                        data={daysChartData} 
                                        options={{
                                            responsive: true, maintainAspectRatio: false,
                                            scales: {
                                                y: { beginAtZero: true, grid: { color: 'rgba(150, 150, 150, 0.1)' } },
                                                x: { grid: { display: false } }
                                            },
                                            plugins: { legend: { display: false } }
                                        }} 
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
