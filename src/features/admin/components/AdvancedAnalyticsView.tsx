"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
    BarChart3, Clock, Users, BookOpen, Layers, AlertTriangle,
    MapPin, CalendarDays, PieChart, TrendingUp, ShieldAlert,
    Printer, FileSpreadsheet, Sparkles, Trophy, Award,
    CalendarCheck, AlertCircle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStudentBehaviorAnalyticsAction } from "@/app/admin-actions";
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
import { fromUTC } from "@/lib/dateUtils";
import { startOfDay } from "date-fns";

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

interface AdvancedAnalyticsViewProps {
    programs: any[];
    environments: any[];
    isObserver?: boolean;
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

export function AdvancedAnalyticsView({ programs, environments, isObserver = false }: AdvancedAnalyticsViewProps) {
    const [selectedProgramId, setSelectedProgramId] = useState<string>("ALL");
    const [selectedGroupId, setSelectedGroupId] = useState<string>("ALL");
    const [studentStats, setStudentStats] = useState<any>(null);
    const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

    useEffect(() => {
        const fetchStudentStats = async () => {
            setLoadingStudents(true);
            try {
                const res = await getStudentBehaviorAnalyticsAction({
                    programId: selectedProgramId,
                    groupId: selectedGroupId
                });
                setStudentStats(res);
            } catch (err) {
                console.error("Error loading student stats:", err);
            }
            setLoadingStudents(false);
        };
        fetchStudentStats();
    }, [selectedProgramId, selectedGroupId]);

    // Reset selected group if program changes
    const handleProgramChange = (val: string) => {
        setSelectedProgramId(val);
        setSelectedGroupId("ALL");
    };

    // Get list of groups for the selected program
    const availableGroups = useMemo(() => {
        if (selectedProgramId === "ALL") return [];
        const prog = programs.find(p => p.id === selectedProgramId);
        return prog ? prog.groups || [] : [];
    }, [programs, selectedProgramId]);

    // Filter programs and groups for analytics calculation
    const filteredPrograms = useMemo(() => {
        if (selectedProgramId === "ALL") return programs;
        const prog = programs.find(p => p.id === selectedProgramId);
        if (!prog) return [];
        
        if (selectedGroupId === "ALL") return [prog];
        
        return [{
            ...prog,
            groups: prog.groups.filter((g: any) => g.id === selectedGroupId)
        }];
    }, [programs, selectedProgramId, selectedGroupId]);
    
    // Compute advanced stats
    const stats = useMemo(() => {
        let totalHours = 0;
        let totalCoursesCount = 0;
        let totalGroupsCount = 0;
        
        const teacherMap: Record<string, { id: string, name: string, email: string, scheduledHours: number, maxHours: number }> = {};
        const subjectMap: Record<string, number> = {};
        const envMap: Record<string, number> = {};
        const progMap: Record<string, number> = {};
        const perMap: Record<string, number> = {};
        const jorMap: Record<string, number> = { "Mañana": 0, "Tarde": 0, "Noche": 0 };
        
        const dayMap: Record<string, number> = {
            "MONDAY": 0, "TUESDAY": 0, "WEDNESDAY": 0, "THURSDAY": 0, "FRIDAY": 0, "SATURDAY": 0, "SUNDAY": 0
        };

        // Gather all groups
        filteredPrograms.forEach(p => {
            const programMaxHours = p.maxTeacherHours ?? 40;
            
            // Collect teachers
            p.teachers?.forEach((t: any) => {
                if (!teacherMap[t.id]) {
                    teacherMap[t.id] = {
                        id: t.id,
                        name: t.name,
                        email: t.email || "",
                        scheduledHours: 0,
                        maxHours: programMaxHours
                    };
                }
            });

            progMap[p.name] = 0;

            p.groups?.forEach((g: any) => {
                totalGroupsCount++;
                g.courses?.forEach((c: any) => {
                    totalCoursesCount++;
                    c.schedules?.forEach((s: any) => {
                        const h = getHours(s.startTime, s.endTime);
                        totalHours += h;
                        
                        // Teacher hours
                        if (c.teacherId) {
                            if (!teacherMap[c.teacherId]) {
                                teacherMap[c.teacherId] = {
                                    id: c.teacherId,
                                    name: c.teacher?.name || "Docente Asignado",
                                    email: c.teacher?.email || "",
                                    scheduledHours: 0,
                                    maxHours: programMaxHours
                                };
                            }
                            teacherMap[c.teacherId].scheduledHours += h;
                        }

                        // Subject hours
                        subjectMap[c.title] = (subjectMap[c.title] || 0) + h;

                        // Environment hours
                        if (g.environmentId) {
                            envMap[g.environment.name] = (envMap[g.environment.name] || 0) + h;
                        }

                        // Day of week hours
                        if (s.dayOfWeek) {
                            dayMap[s.dayOfWeek] = (dayMap[s.dayOfWeek] || 0) + h;
                        }

                        // Program hours
                        progMap[p.name] = (progMap[p.name] || 0) + h;

                        // Period hours
                        if (g.period?.name) {
                            perMap[g.period.name] = (perMap[g.period.name] || 0) + h;
                        }

                        // Shift/Jornada
                        if (s.startTime) {
                            const hour = parseInt(s.startTime.split(":")[0]);
                            if (hour < 12) jorMap["Mañana"] += h;
                            else if (hour < 18) jorMap["Tarde"] += h;
                            else jorMap["Noche"] += h;
                        }
                    });
                });
            });
        });

        // Convert mappings to sorted lists
        const teachersStatsList = Object.values(teacherMap).sort((a, b) => b.scheduledHours - a.scheduledHours);
        const subjectStatsList = Object.entries(subjectMap).map(([name, val]) => ({ name, value: val })).sort((a, b) => b.value - a.value);
        const envStatsList = Object.entries(envMap).map(([name, val]) => ({ name, value: val })).sort((a, b) => b.value - a.value);
        const progStatsList = Object.entries(progMap).map(([name, val]) => ({ name, value: val })).sort((a, b) => b.value - a.value);
        const periodStatsList = Object.entries(perMap).map(([name, val]) => ({ name, value: val })).sort((a, b) => b.value - a.value);

        // Day of week in order
        const dayStatsList = Object.entries(dayMap)
            .map(([day, val]) => ({ name: DAY_NAMES[day] || day, value: val, key: day }))
            .sort((a, b) => (DAYS_ORDER[a.key] || 99) - (DAYS_ORDER[b.key] || 99));

        const activeTeachersCount = teachersStatsList.filter(t => t.scheduledHours > 0).length;

        // Alerts / Conflicts
        const alertList: string[] = [];
        teachersStatsList.forEach(t => {
            if (t.scheduledHours > t.maxHours) {
                alertList.push(`El docente ${t.name} supera el límite máximo asignable de ${t.maxHours} horas semanales (Tiene ${t.scheduledHours.toFixed(1)} hrs).`);
            }
        });

        return {
            totalHours,
            totalCoursesCount,
            totalGroupsCount,
            teachersStats: teachersStatsList,
            subjectStats: subjectStatsList,
            dayStats: dayStatsList,
            activeTeachersCount,
            envStats: envStatsList,
            progStats: progStatsList,
            periodStats: periodStatsList,
            jorStats: Object.entries(jorMap).map(([name, value]) => ({ name, value })),
            alertList
        };
    }, [filteredPrograms]);

    // Graph Data Configurations
    const programChartData = {
        labels: stats.progStats.map(p => p.name),
        datasets: [{
            data: stats.progStats.map(p => p.value),
            backgroundColor: [
                "rgba(16, 185, 129, 0.7)",  // Emerald
                "rgba(59, 130, 246, 0.7)",  // Blue
                "rgba(139, 92, 246, 0.7)",  // Purple
                "rgba(245, 158, 11, 0.7)",  // Amber
                "rgba(239, 68, 68, 0.7)",   // Red
                "rgba(6, 182, 212, 0.7)"    // Cyan
            ],
            borderColor: [
                "rgba(16, 185, 129, 1)",
                "rgba(59, 130, 246, 1)",
                "rgba(139, 92, 246, 1)",
                "rgba(245, 158, 11, 1)",
                "rgba(239, 68, 68, 1)",
                "rgba(6, 182, 212, 1)"
            ],
            borderWidth: 1.5
        }]
    };

    const environmentChartData = {
        labels: stats.envStats.map(e => e.name),
        datasets: [{
            label: "Horas Asignadas",
            data: stats.envStats.map(e => e.value),
            backgroundColor: "rgba(59, 130, 246, 0.75)",
            borderColor: "rgba(59, 130, 246, 1)",
            borderWidth: 1,
            borderRadius: 8
        }]
    };

    const dayChartData = {
        labels: stats.dayStats.map(d => d.name),
        datasets: [{
            label: "Horas Planificadas",
            data: stats.dayStats.map(d => d.value),
            backgroundColor: "rgba(16, 185, 129, 0.2)",
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "rgba(16, 185, 129, 1)",
            pointRadius: 5
        }]
    };

    const teacherChartData = {
        labels: stats.teachersStats.slice(0, 10).map(t => t.name),
        datasets: [
            {
                label: "Horas Programadas",
                data: stats.teachersStats.slice(0, 10).map(t => t.scheduledHours),
                backgroundColor: "rgba(139, 92, 246, 0.75)",
                borderColor: "rgba(139, 92, 246, 1)",
                borderWidth: 1,
                borderRadius: 8
            },
            {
                label: "Límite Programado",
                data: stats.teachersStats.slice(0, 10).map(t => t.maxHours),
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderColor: "rgba(239, 68, 68, 0.8)",
                borderWidth: 2,
                type: "line" as const,
                fill: false,
                borderDash: [5, 5]
            }
        ]
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="w-full flex-1 flex flex-col gap-6 overflow-y-auto pb-10 p-6 print:p-0 print:overflow-visible">
            
            {/* Header / Actions */}
            <div className="flex items-center justify-between gap-4 flex-wrap border-b pb-4 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-foreground">Reportes y Analítica Avanzada</h2>
                        <p className="text-xs text-muted-foreground">Perspectivas detalladas de la carga de docentes, ambientes y distribución horaria general.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 rounded-xl border-border/60">
                        <Printer className="w-4 h-4 text-primary" />
                        Imprimir Reporte
                    </Button>
                </div>
            </div>

            {/* Exploration Filters */}
            <div className="flex items-center gap-4 flex-wrap bg-card/40 backdrop-blur-sm border border-border/50 p-4 rounded-3xl print:hidden shadow-sm">
                <div className="flex flex-col gap-1.5 min-w-[260px] flex-1 sm:flex-initial">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Programa de Formación</Label>
                    <Select value={selectedProgramId} onValueChange={handleProgramChange}>
                        <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/60 focus:ring-1 focus:ring-primary">
                            <SelectValue placeholder="Todos los programas" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="ALL">Todos los programas</SelectItem>
                            {programs.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[260px] flex-1 sm:flex-initial">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Grupo / Ficha</Label>
                    <Select 
                        value={selectedGroupId} 
                        onValueChange={setSelectedGroupId}
                        disabled={selectedProgramId === "ALL"}
                    >
                        <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/60 focus:ring-1 focus:ring-primary disabled:opacity-50">
                            <SelectValue placeholder="Todos los grupos" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="ALL">Todos los grupos</SelectItem>
                            {availableGroups.map((g: any) => (
                                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs defaultValue="schedules" className="w-full space-y-6 print:space-y-0 mt-6">
                <TabsList className="bg-muted/80 p-1 rounded-xl h-11 border border-border/40 print:hidden w-fit">
                    <TabsTrigger value="schedules" className="rounded-lg px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Clock className="w-4 h-4 mr-1.5" />
                        Horarios y Carga Académica
                    </TabsTrigger>
                    <TabsTrigger value="students" className="rounded-lg px-4 py-2 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Users className="w-4 h-4 mr-1.5" />
                        Rendimiento Estudiantil
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="schedules" className="space-y-6">
                    {/* Print Only Header */}
                    <div className="hidden print:flex flex-col gap-2 border-b pb-6 mb-6">
                        <h1 className="text-3xl font-black">AcademiX - Reporte Académico de Horarios</h1>
                        <p className="text-sm text-muted-foreground">Generado automáticamente el {new Date().toLocaleDateString("es-ES")} a las {new Date().toLocaleTimeString("es-ES")}</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <Card className="rounded-3xl border-border/50 shadow-sm relative overflow-hidden bg-card/40 backdrop-blur-sm">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-muted-foreground">Horas Programadas</CardTitle>
                                <Clock className="w-5 h-5 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-foreground">{stats.totalHours.toFixed(1)} hrs</div>
                                <p className="text-xs text-muted-foreground mt-1">Carga horaria total planificada</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-border/50 shadow-sm relative overflow-hidden bg-card/40 backdrop-blur-sm">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-muted-foreground">Docentes Asignados</CardTitle>
                                <Users className="w-5 h-5 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-foreground">{stats.activeTeachersCount} <span className="text-sm font-bold text-muted-foreground">/ {stats.teachersStats.length}</span></div>
                                <p className="text-xs text-muted-foreground mt-1">Docentes con carga horaria asignada</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-border/50 shadow-sm relative overflow-hidden bg-card/40 backdrop-blur-sm">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-muted-foreground">Fichas / Grupos</CardTitle>
                                <Layers className="w-5 h-5 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-foreground">{stats.totalGroupsCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">Grupos formativos en planeación</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-border/50 shadow-sm relative overflow-hidden bg-card/40 backdrop-blur-sm">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-muted-foreground">Materias Activas</CardTitle>
                                <BookOpen className="w-5 h-5 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-foreground">{stats.totalCoursesCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">Asignaturas con clases programadas</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Warnings/Conflict Alerts */}
                    {stats.alertList.length > 0 && (
                        <Alert variant="destructive" className="rounded-2xl border-red-500/20 bg-red-500/5 text-red-900 dark:text-red-300">
                            <ShieldAlert className="h-5 w-5" />
                            <AlertTitle className="font-bold text-sm">Conflictos Detectados en Planeación Semanal</AlertTitle>
                            <AlertDescription className="mt-2 text-xs space-y-1">
                                {stats.alertList.map((alert, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                        <span>{alert}</span>
                                    </div>
                                ))}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Main Graphs Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 1. Docentes Load */}
                        <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm overflow-hidden p-6">
                            <CardHeader className="p-0 pb-4">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Users className="w-4 h-4 text-purple-500" />
                                    Carga Semanal de Docentes (Top 10)
                                </CardTitle>
                                <CardDescription className="text-xs">Comparación de horas asignadas vs límite permitido por programa.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 h-[280px] flex items-center justify-center">
                                {stats.teachersStats.length > 0 ? (
                                    <Bar 
                                        data={teacherChartData as any}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: true, position: "top" } },
                                            scales: { y: { beginAtZero: true } }
                                        }}
                                    />
                                ) : (
                                    <p className="text-xs text-muted-foreground">No hay horas programadas aún.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* 2. Programs Distribution */}
                        <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm overflow-hidden p-6">
                            <CardHeader className="p-0 pb-4">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <PieChart className="w-4 h-4 text-emerald-500" />
                                    Distribución de Horas por Programa
                                </CardTitle>
                                <CardDescription className="text-xs">Proporción de horas planificadas en cada programa de formación.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 h-[280px] flex items-center justify-center">
                                {stats.progStats.length > 0 ? (
                                    <div className="w-[240px] h-[240px]">
                                        <Doughnut 
                                            data={programChartData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: true, position: "bottom" } }
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">No hay horas programadas aún.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* 3. Environment Utilization */}
                        <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm overflow-hidden p-6">
                            <CardHeader className="p-0 pb-4">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    Ocupación de Ambientes de Aprendizaje
                                </CardTitle>
                                <CardDescription className="text-xs">Cantidad de horas programadas por aula o laboratorio.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 h-[280px] flex items-center justify-center">
                                {stats.envStats.length > 0 ? (
                                    <Bar 
                                        data={environmentChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: { y: { beginAtZero: true } }
                                        }}
                                    />
                                ) : (
                                    <p className="text-xs text-muted-foreground">No hay ambientes programados aún.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* 4. Weekly Loading curve */}
                        <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm overflow-hidden p-6">
                            <CardHeader className="p-0 pb-4">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-emerald-500" />
                                    Curva de Carga Horaria por Día
                                </CardTitle>
                                <CardDescription className="text-xs">Días de la semana con mayor concentración de clases.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 h-[280px] flex items-center justify-center">
                                {stats.totalHours > 0 ? (
                                    <Line 
                                        data={dayChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: { y: { beginAtZero: true } }
                                        }}
                                    />
                                ) : (
                                    <p className="text-xs text-muted-foreground">No hay horas programadas aún.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="students" className="space-y-6">
                    {loadingStudents ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-card/30 backdrop-blur-sm border border-border/40 rounded-3xl">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <p className="text-xs text-muted-foreground font-semibold">Analizando comportamiento académico y disciplinario...</p>
                        </div>
                    ) : studentStats ? (
                        <div className="space-y-6">
                            {/* Student cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                <Card className="rounded-3xl border-border/50 shadow-sm relative overflow-hidden bg-card/40 backdrop-blur-sm">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-semibold text-muted-foreground">Total Aprendices</CardTitle>
                                        <Users className="w-5 h-5 text-indigo-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-black text-foreground">{studentStats.totalStudentsCount}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Estudiantes en esta selección</p>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-3xl border-border/50 shadow-sm relative overflow-hidden bg-card/40 backdrop-blur-sm">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-semibold text-muted-foreground">Alertas Académicas</CardTitle>
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-black text-foreground">{studentStats.academicRiskStudents.length}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Con promedio menor a 3.0</p>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-3xl border-border/50 shadow-sm relative overflow-hidden bg-card/40 backdrop-blur-sm">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-semibold text-muted-foreground">Alertas de Inasistencia/Retiros</CardTitle>
                                        <CalendarCheck className="w-5 h-5 text-red-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-black text-foreground">{studentStats.attendanceRiskStudents.length}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Con inasistencias &gt; 15%</p>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-3xl border-border/50 shadow-sm relative overflow-hidden bg-card/40 backdrop-blur-sm">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500" />
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-semibold text-muted-foreground">Alertas Disciplinarias</CardTitle>
                                        <ShieldAlert className="w-5 h-5 text-orange-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-black text-foreground">{studentStats.disciplinaryRiskStudents.length}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Con llamados de atención o citaciones</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Honor List and Academic Risk */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Trophy / Top Students */}
                                <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm overflow-hidden p-6">
                                    <CardHeader className="p-0 pb-4">
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-yellow-500 animate-pulse" />
                                            Cuadro de Honor (Mejores Estudiantes)
                                        </CardTitle>
                                        <CardDescription className="text-xs">Estudiantes con promedios excelentes (≥ 3.0) y expediente disciplinario limpio (cero reportes).</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0 overflow-y-auto max-h-[360px]">
                                        {studentStats.topStudents.length > 0 ? (
                                            <div className="space-y-3">
                                                {studentStats.topStudents.map((s: any, i: number) => (
                                                    <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-background/40 border border-border/40 hover:bg-background/80 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                                i === 0 ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" :
                                                                i === 1 ? "bg-slate-300/20 text-slate-600 dark:text-slate-400" :
                                                                i === 2 ? "bg-amber-600/20 text-amber-700 dark:text-amber-500" : "bg-muted text-muted-foreground"
                                                            }`}>
                                                                {i + 1}
                                                            </span>
                                                            <div>
                                                                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                                    {s.name}
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                                                                        {s.commendationCount > 0 ? `🏆 ${s.commendationCount} Felicitac.` : "Conducta Limpia"}
                                                                    </span>
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground">{s.groupName} • {s.identificacion}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-black text-emerald-500">{s.avgGrade.toFixed(2)}</div>
                                                            <div className="text-[9px] text-muted-foreground">Promedio</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground py-6 text-center">No hay registros académicos con expediente disciplinario limpio en esta selección.</p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Academic Risk */}
                                <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm overflow-hidden p-6">
                                    <CardHeader className="p-0 pb-4">
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                            Bajo Rendimiento Académico (Alerta)
                                        </CardTitle>
                                        <CardDescription className="text-xs">Aprendices con promedio general por debajo del mínimo aprobatorio de 3.0.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0 overflow-y-auto max-h-[360px]">
                                        {studentStats.academicRiskStudents.length > 0 ? (
                                            <div className="space-y-3">
                                                {studentStats.academicRiskStudents.map((s: any) => (
                                                    <div key={s.id} className="p-3.5 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all space-y-2">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div>
                                                                <div className="text-xs font-bold text-red-950 dark:text-red-300">{s.name}</div>
                                                                <div className="text-[10px] text-muted-foreground">{s.groupName} • {s.identificacion}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-xs font-black text-red-600 dark:text-red-400">{s.avgGrade.toFixed(2)}</span>
                                                                <div className="text-[8px] text-muted-foreground uppercase">Promedio</div>
                                                            </div>
                                                        </div>
                                                        {/* Visual bar */}
                                                        <div className="w-full bg-muted dark:bg-muted/50 rounded-full h-1.5 overflow-hidden">
                                                            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${(s.avgGrade / 5.0) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-8 text-center bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                                <Award className="w-8 h-8 text-emerald-500 mb-2" />
                                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                                                    Todos los estudiantes tienen un rendimiento aprobatorio superior a 3.0.
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Attendance and Disciplinary Alerts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Attendance Risk */}
                                <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm overflow-hidden p-6">
                                    <CardHeader className="p-0 pb-4">
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            <CalendarCheck className="w-5 h-5 text-red-500" />
                                            Alertas de Inasistencia, Tardanza y Retiro
                                        </CardTitle>
                                        <CardDescription className="text-xs">Estudiantes con novedades de asistencia (Faltas, Tardes o Retiros) en más del 15% de sus clases registradas.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0 overflow-y-auto max-h-[360px]">
                                        {studentStats.attendanceRiskStudents.length > 0 ? (
                                            <div className="space-y-3">
                                                {studentStats.attendanceRiskStudents.map((s: any) => (
                                                    <div key={s.id} className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-all flex items-center justify-between gap-4">
                                                        <div>
                                                            <div className="text-xs font-bold text-foreground">{s.name}</div>
                                                            <div className="text-[10px] text-muted-foreground">{s.groupName} • {s.identificacion}</div>
                                                            <div className="text-[9px] text-amber-600 dark:text-amber-400 mt-1.5 flex gap-2 flex-wrap font-semibold">
                                                                <span className="text-red-500">Faltas: {s.absentCount}</span>
                                                                <span className="text-muted-foreground/30">|</span>
                                                                <span className="text-amber-500">Tardes: {s.lateCount}</span>
                                                                <span className="text-muted-foreground/30">|</span>
                                                                <span className="text-blue-500">Retiros: {s.leaveEarlyCount || 0}</span>
                                                                <span className="text-muted-foreground/30">|</span>
                                                                <span className="text-muted-foreground">de {s.totalAttendances} sesiones</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-sm font-black text-red-500">{s.anomalyRate || s.absenceRate}%</div>
                                                            <div className="text-[8px] text-muted-foreground uppercase">Tasa Alertas</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-8 text-center bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                                <Award className="w-8 h-8 text-emerald-500 mb-2" />
                                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                                                    No hay estudiantes con tasa de inasistencia crítica superior al 15%.
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Disciplinary Remarks */}
                                <Card className="rounded-3xl border-border/50 bg-card/50 shadow-sm overflow-hidden p-6">
                                    <CardHeader className="p-0 pb-4">
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            <ShieldAlert className="w-5 h-5 text-orange-500" />
                                            Alertas Disciplinarias y de Observador
                                        </CardTitle>
                                        <CardDescription className="text-xs">Llamados de atención y citaciones registradas por los docentes.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0 overflow-y-auto max-h-[360px]">
                                        {studentStats.disciplinaryRiskStudents.length > 0 ? (
                                            <div className="space-y-3">
                                                {studentStats.disciplinaryRiskStudents.map((s: any) => (
                                                    <div key={s.id} className="p-3.5 rounded-2xl bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10 transition-all flex items-center justify-between gap-4">
                                                        <div>
                                                            <div className="text-xs font-bold text-foreground">{s.name}</div>
                                                            <div className="text-[10px] text-muted-foreground">{s.groupName} • {s.identificacion}</div>
                                                            <div className="text-[9px] text-orange-600 dark:text-orange-400 mt-1.5 flex gap-2 flex-wrap">
                                                                {s.attentionCount > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">{s.attentionCount} Llamados</span>}
                                                                {s.citationCount > 0 && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-800 dark:text-red-300 font-bold">{s.citationCount} Citaciones</span>}
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-sm font-black text-orange-600 dark:text-orange-400">{s.remarksCount}</div>
                                                            <div className="text-[8px] text-muted-foreground uppercase">Alertas</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-8 text-center bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                                <Award className="w-8 h-8 text-emerald-500 mb-2" />
                                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                                                    Todos los estudiantes tienen un comportamiento ejemplar (cero reportes).
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground py-6 text-center">No se encontraron estudiantes para los filtros actuales.</p>
                    )}
                </TabsContent>
            </Tabs>

            {/* Print-Only Detailed Grid */}
            <div className="hidden print:block mt-8">
                <h3 className="text-xl font-bold border-b pb-2 mb-4">Carga Horaria de Docentes</h3>
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="border-b bg-gray-100">
                            <th className="py-2 px-3">Nombre</th>
                            <th className="py-2 px-3">Email</th>
                            <th className="py-2 px-3 text-right">Horas Asignadas</th>
                            <th className="py-2 px-3 text-right">Límite Permitido</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.teachersStats.map((t, idx) => (
                            <tr key={idx} className="border-b">
                                <td className="py-2 px-3 font-semibold">{t.name}</td>
                                <td className="py-2 px-3 text-muted-foreground">{t.email}</td>
                                <td className="py-2 px-3 text-right font-black">{t.scheduledHours.toFixed(1)} hrs</td>
                                <td className="py-2 px-3 text-right">{t.maxHours} hrs</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
