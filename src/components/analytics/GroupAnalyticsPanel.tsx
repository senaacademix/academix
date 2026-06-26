"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from "recharts";
import { Users, GraduationCap, UserX, UserCheck, BookOpen, AlertTriangle, CheckCircle2, Clock, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface GroupAnalyticsPanelProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    inline?: boolean;
    isLoading: boolean;
    analyticsData: {
        groupName: string;
        groupDescription?: string | null;
        program?: string;
        period?: string;
        environment?: string;
        startDate?: Date | null;
        endDate?: Date | null;
        startTime?: string;
        endTime?: string;
        students: { total: number; active: number; banned: number };
        totalCourseClasses: number;
        attendances: { status: string; date: Date }[];
        remarks: { type: string; date: Date }[];
        coursesStats: { title: string; averageGrade: number; totalGrades: number }[];
        coursesList?: { id: string; title: string }[];
        studentMetrics?: {
            id: string;
            name: string;
            identificacion: string;
            banned: boolean;
            gradesAvg: number;
            courseGrades?: Record<string, number>;
            courseAttendances?: Record<string, { present: number; absent: number; late: number }>;
            courseRemarks?: Record<string, { attention: number; commendation: number }>;
            attendances: { present: number; absent: number; late: number };
            remarks: { attention: number; commendation: number };
        }[];
    } | null;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-popover text-popover-foreground border rounded-xl p-4 shadow-xl text-xs space-y-2 max-w-[280px]">
                <p className="font-extrabold text-sm border-b pb-1 text-foreground">{data.name}</p>
                <div className="space-y-1">
                    <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400">Puntaje Integral: {data.score} / 100</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest pt-1">Desglose de Puntos:</p>
                    <p className="flex justify-between gap-4 text-muted-foreground">• Rendimiento (70%): <span className="font-medium text-foreground">{data.academic} pts ({data.gradesAvg > 0 ? data.gradesAvg.toFixed(2) : "N/A"})</span></p>
                    <p className="flex justify-between gap-4 text-muted-foreground">• Asistencia (20%): <span className="font-medium text-foreground">{data.attendance} pts ({data.absences} F / {data.lates} T)</span></p>
                    <p className="flex justify-between gap-4 text-muted-foreground">• Disciplina (10%): <span className="font-medium text-foreground">{data.discipline} pts ({data.attentionCalls} LL / {data.commendations} F)</span></p>
                </div>
            </div>
        );
    }
    return null;
};

export function GroupAnalyticsPanel({ open, onOpenChange, inline = false, isLoading, analyticsData }: GroupAnalyticsPanelProps) {
    
    const [selectedCourseId, setSelectedCourseId] = useState<string>("all");

    useEffect(() => {
        if (analyticsData?.coursesList && analyticsData.coursesList.length > 0 && selectedCourseId === "all") {
            setSelectedCourseId(analyticsData.coursesList[0].id);
        }
    }, [analyticsData]);

    // Asistencias Chart Data
    const attendanceData = useMemo(() => {
        if (!analyticsData) return [];
        let absent = 0, late = 0, present = 0;
        
        if (selectedCourseId === "all" || !analyticsData.studentMetrics) {
            analyticsData.attendances.forEach(att => {
                if (att.status === "ABSENT") absent++;
                if (att.status === "LATE") late++;
            });
            const totalExpected = analyticsData.totalCourseClasses * analyticsData.students.active;
            present = Math.max(0, totalExpected - absent - late);
        } else {
            analyticsData.studentMetrics.forEach(s => {
                if (s.courseAttendances && s.courseAttendances[selectedCourseId]) {
                    absent += s.courseAttendances[selectedCourseId].absent;
                    late += s.courseAttendances[selectedCourseId].late;
                    present += s.courseAttendances[selectedCourseId].present;
                }
            });
        }

        return [
            { name: "Presente", value: present },
            { name: "Ausente", value: absent },
            { name: "Llegada Tarde", value: late },
        ];
    }, [analyticsData, selectedCourseId]);

    // Remarks Chart Data
    const remarksData = useMemo(() => {
        if (!analyticsData) return [];
        let attention = 0, commendation = 0;
        
        if (selectedCourseId === "all" || !analyticsData.studentMetrics) {
            analyticsData.remarks.forEach(rem => {
                if (rem.type === "ATTENTION") attention++;
                if (rem.type === "COMMENDATION") commendation++;
            });
        } else {
            analyticsData.studentMetrics.forEach(s => {
                if (s.courseRemarks && s.courseRemarks[selectedCourseId]) {
                    attention += s.courseRemarks[selectedCourseId].attention;
                    commendation += s.courseRemarks[selectedCourseId].commendation;
                }
            });
        }

        return [
            { name: "Llamados de Atención", value: attention, fill: '#ef4444' },
            { name: "Felicitaciones", value: commendation, fill: '#3b82f6' },
        ];
    }, [analyticsData, selectedCourseId]);

    // Per Student Course Attendances
    const studentAttendanceBarsData = useMemo(() => {
        if (!analyticsData || !analyticsData.studentMetrics) return [];
        return analyticsData.studentMetrics
            .map(s => {
                const att = selectedCourseId === "all" 
                    ? { present: s.attendances.present, absent: s.attendances.absent, late: s.attendances.late }
                    : (s.courseAttendances?.[selectedCourseId] || { present: 0, absent: 0, late: 0 });
                return {
                    name: s.name.split(' ')[0] + (s.name.split(' ').length > 1 ? ' ' + s.name.split(' ')[1] : ''),
                    presente: att.present,
                    ausente: att.absent,
                    tarde: att.late,
                    fullName: s.name
                };
            })
            .sort((a, b) => (b.ausente + b.tarde) - (a.ausente + a.tarde)); // Sort by most absent
    }, [analyticsData, selectedCourseId]);

    // Courses Stats Data
    const coursesData = useMemo(() => {
        if (!analyticsData) return [];
        return analyticsData.coursesStats.map(c => ({
            name: c.title.length > 20 ? c.title.substring(0, 20) + "..." : c.title,
            promedio: c.averageGrade,
            totalNotas: c.totalGrades
        }));
    }, [analyticsData]);

    // Per Student Course Grades
    const studentGradesData = useMemo(() => {
        if (!analyticsData || !analyticsData.studentMetrics || selectedCourseId === "all") return [];
        
        return analyticsData.studentMetrics
            .filter(s => s.courseGrades && typeof s.courseGrades[selectedCourseId] === 'number')
            .map(s => ({
                name: s.name.split(' ')[0] + (s.name.split(' ').length > 1 ? ' ' + s.name.split(' ')[1] : ''),
                nota: s.courseGrades![selectedCourseId],
                fullName: s.name
            }))
            .sort((a, b) => b.nota - a.nota);
    }, [analyticsData, selectedCourseId]);

    // Student Ranking Chart Data (Rank from best to worst based on Grades, Attendance, and Attention Calls)
    const rankedStudentsData = useMemo(() => {
        if (!analyticsData || !analyticsData.studentMetrics) return [];

        return analyticsData.studentMetrics.map(student => {
            let gradesAvg = 0;
            let absences = 0;
            let lates = 0;
            let attentionCalls = 0;
            let commendations = 0;

            if (selectedCourseId === "all") {
                gradesAvg = student.gradesAvg;
                absences = student.attendances?.absent || 0;
                lates = student.attendances?.late || 0;
                attentionCalls = student.remarks?.attention || 0;
                commendations = student.remarks?.commendation || 0;
            } else {
                gradesAvg = student.courseGrades?.[selectedCourseId] || 0;
                const courseAtt = student.courseAttendances?.[selectedCourseId] || { present: 0, absent: 0, late: 0 };
                absences = courseAtt.absent;
                lates = courseAtt.late;
                const courseRem = student.courseRemarks?.[selectedCourseId] || { attention: 0, commendation: 0 };
                attentionCalls = courseRem.attention;
                commendations = courseRem.commendation;
            }

            // 1. Academic Score (70%): based on gradesAvg (0 to 5).
            const academicScore = gradesAvg > 0 ? (gradesAvg / 5) * 100 : 0;

            // 2. Attendance Score (20%): 10 points penalty per absence, 4 points per late arrival.
            const attendanceScore = Math.max(0, 100 - (absences * 10) - (lates * 4));

            // 3. Discipline Score (10%): 15 points penalty per attention call, +5 points bonus per commendation.
            const disciplineScore = Math.min(100, Math.max(0, 100 - (attentionCalls * 15) + (commendations * 5)));

            // Composite Score
            const compositeScore = parseFloat(
                ((academicScore * 0.7) + (attendanceScore * 0.2) + (disciplineScore * 0.1)).toFixed(1)
            );

            return {
                name: student.name,
                score: compositeScore,
                academic: parseFloat(academicScore.toFixed(1)),
                attendance: parseFloat(attendanceScore.toFixed(1)),
                discipline: parseFloat(disciplineScore.toFixed(1)),
                gradesAvg,
                absences,
                lates,
                attentionCalls,
                commendations
            };
        }).sort((a, b) => b.score - a.score); // Sort from best to worst
    }, [analyticsData, selectedCourseId]);

    if (!open && !inline) return null;

    const content = (
        <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-950 ${inline ? 'w-full rounded-xl border overflow-hidden shadow-sm' : ''}`}>
            {!inline && (
                <DialogHeader className="p-6 pb-2 shrink-0 border-b bg-white dark:bg-slate-900 shadow-sm">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <BarChart className="w-6 h-6 text-primary" />
                        Analítica del Grupo: {analyticsData?.groupName || "Cargando..."}
                    </DialogTitle>
                    <DialogDescription>
                        Vista general de rendimiento, asistencia y comportamiento de todos los estudiantes.
                    </DialogDescription>
                </DialogHeader>
            )}

            <div className={`flex-1 min-h-0 overflow-y-auto ${inline ? 'p-0' : 'p-6'}`}>
                    {isLoading || !analyticsData ? (
                        <div className="flex flex-col items-center justify-center h-[50vh]">
                            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                            <p className="text-muted-foreground animate-pulse">Analizando métricas del grupo...</p>
                        </div>
                    ) : (
                        <div className="w-full space-y-6 pb-20 px-4 md:px-8">
                            
                            {/* Group Information */}
                            <Card className="bg-primary/5 border-primary/20 shadow-sm">
                                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-between items-start sm:items-center flex-wrap">
                                    <div className="space-y-1">
                                        <h4 className="font-semibold text-lg flex items-center gap-2 text-primary">
                                            <GraduationCap className="w-5 h-5" />
                                            {analyticsData.program || "Programa no asignado"}
                                        </h4>
                                        {analyticsData.groupDescription && (
                                            <p className="text-sm text-muted-foreground">{analyticsData.groupDescription}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 sm:gap-4 text-sm font-medium">
                                        {analyticsData.period && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border shadow-sm">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                <span>{analyticsData.period}</span>
                                            </div>
                                        )}
                                        {analyticsData.environment && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border shadow-sm">
                                                <BookOpen className="w-4 h-4 text-muted-foreground" />
                                                <span>{analyticsData.environment}</span>
                                            </div>
                                        )}
                                        {(analyticsData.startTime || analyticsData.endTime) && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border shadow-sm">
                                                <Clock className="w-4 h-4 text-muted-foreground" />
                                                <span>
                                                    {analyticsData.startTime || "--:--"} - {analyticsData.endTime || "--:--"}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Total Estudiantes</p>
                                            <h3 className="text-2xl font-bold">{analyticsData.students.total}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                                            <UserCheck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Estudiantes Activos</p>
                                            <h3 className="text-2xl font-bold">{analyticsData.students.active}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                                            <UserX className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Estudiantes Baneados</p>
                                            <h3 className="text-2xl font-bold">{analyticsData.students.banned}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                                            <BookOpen className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Total Inasistencias/Retardos Reg.</p>
                                            <h3 className="text-2xl font-bold">{analyticsData.attendances.length}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Global Course Selector */}
                            <Card className="bg-background border shadow-sm">
                                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <h4 className="font-semibold flex items-center gap-2">
                                            <BarChart className="w-4 h-4 text-primary" />
                                            Filtro de Analítica
                                        </h4>
                                        <p className="text-xs text-muted-foreground">Selecciona una materia para ver sus gráficos específicos, o "General" para ver el promedio global del grupo.</p>
                                    </div>
                                    <div className="w-full sm:w-[300px]">
                                        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                            <SelectTrigger className="bg-muted/50 border-input">
                                                <SelectValue placeholder="Seleccionar Materia" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all" className="font-bold">General (Promedios del Grupo)</SelectItem>
                                                {analyticsData.coursesList && analyticsData.coursesList.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Student Ranking Chart (from best to worst) */}
                                {rankedStudentsData.length > 0 && (
                                <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <GraduationCap className="w-5 h-5 text-indigo-500" />
                                            Ranking de Estudiantes (Rendimiento Integral)
                                        </CardTitle>
                                        <CardDescription>
                                            Estudiantes ordenados de mayor a menor puntaje integral. El cálculo pondera: Calificaciones (70%), Asistencia (20%) y Disciplina (10%).
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="w-full" style={{ height: `${Math.max(400, rankedStudentsData.length * 38)}px` }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={rankedStudentsData} 
                                                layout="vertical"
                                                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} />
                                                <YAxis 
                                                    dataKey="name" 
                                                    type="category" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    fontSize={11} 
                                                    width={130}
                                                    tickFormatter={(name) => name.split(' ')[0] + (name.split(' ').length > 1 ? ' ' + name.split(' ')[1] : '')}
                                                />
                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                                                <Bar dataKey="score" name="Puntaje Integral" radius={[0, 4, 4, 0]} maxBarSize={20}>
                                                    {rankedStudentsData.map((entry, index) => {
                                                        let color = '#ef4444'; // Red (< 60)
                                                        if (entry.score >= 80) color = '#10b981'; // Green (>= 80)
                                                        else if (entry.score >= 60) color = '#f59e0b'; // Amber (>= 60)
                                                        return <Cell key={`cell-${index}`} fill={color} />;
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                                )}

                                {/* Academic Performance Chart */}
                                {selectedCourseId === "all" ? (
                                <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <GraduationCap className="w-5 h-5 text-indigo-500" />
                                            Rendimiento Académico Global
                                        </CardTitle>
                                        <CardDescription>Promedio de calificaciones ponderadas en las actividades de cada materia.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px] w-full">
                                        {coursesData.length > 0 && coursesData.some(c => c.totalNotas > 0) ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={coursesData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                                                    <YAxis domain={[0, 5]} axisLine={false} tickLine={false} />
                                                    <Tooltip 
                                                        cursor={{ fill: 'transparent' }}
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    />
                                                    <Legend />
                                                    <Bar dataKey="promedio" name="Nota Promedio" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={60} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                                                No hay suficientes calificaciones registradas
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                                ) : (
                                /* Per-Student Course Performance */
                                <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BarChart className="w-5 h-5 text-indigo-500" />
                                            Rendimiento Individual por Materia
                                        </CardTitle>
                                        <CardDescription>Visualiza las calificaciones de cada estudiante en la materia seleccionada.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[350px] w-full">
                                        {studentGradesData.length > 0 && studentGradesData.some(s => s.nota > 0) ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={studentGradesData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} angle={-45} textAnchor="end" />
                                                    <YAxis domain={[0, 5]} axisLine={false} tickLine={false} />
                                                    <Tooltip 
                                                        cursor={{ fill: 'transparent' }}
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                        formatter={(value: number) => [value.toFixed(2), "Nota Promedio"]}
                                                        labelFormatter={(label: string, payload: any[]) => payload[0]?.payload?.fullName || label}
                                                    />
                                                    <Bar dataKey="nota" name="Nota" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                                        {studentGradesData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.nota >= 3 ? '#10b981' : entry.nota > 0 ? '#ef4444' : '#d1d5db'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                                                No hay calificaciones para esta materia.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                                )}

                                {/* Attendance Chart */}
                                <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            Distribución de Asistencia
                                        </CardTitle>
                                        <CardDescription>Resumen de presencialidad y ausentismo del grupo.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px] w-full">
                                        {analyticsData.totalCourseClasses > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={attendanceData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {attendanceData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={attendanceData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                                                        <YAxis axisLine={false} tickLine={false} />
                                                        <Tooltip 
                                                            cursor={{ fill: 'transparent' }}
                                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                        />
                                                        <Bar dataKey="value" name="Total" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                                            {attendanceData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                                                No hay registros de asistencia
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Student Attendance Bars */}
                                <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            Asistencia por Estudiante
                                        </CardTitle>
                                        <CardDescription>Visualiza las ausencias y llegadas tarde de cada estudiante.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[350px] w-full">
                                        {studentAttendanceBarsData.length > 0 && studentAttendanceBarsData.some(s => s.ausente > 0 || s.tarde > 0) ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={studentAttendanceBarsData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} angle={-45} textAnchor="end" />
                                                    <YAxis axisLine={false} tickLine={false} />
                                                    <Tooltip 
                                                        cursor={{ fill: 'transparent' }}
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                        labelFormatter={(label: string, payload: any[]) => payload[0]?.payload?.fullName || label}
                                                    />
                                                    <Legend verticalAlign="top" height={36} />
                                                    <Bar dataKey="ausente" name="Ausente" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} maxBarSize={40} />
                                                    <Bar dataKey="tarde" name="Llegada Tarde" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                                                Excelente asistencia, no hay inasistencias registradas.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Remarks Chart */}
                                <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                                            Observaciones Disciplinarias
                                        </CardTitle>
                                        <CardDescription>Relación entre llamados de atención y felicitaciones.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[250px] w-full">
                                        {analyticsData.remarks.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={remarksData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                                    <XAxis type="number" axisLine={false} tickLine={false} />
                                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} width={100} />
                                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                    <Bar dataKey="value" name="Total" radius={[0, 4, 4, 0]} maxBarSize={40}>
                                                        {remarksData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                                                No hay observaciones registradas
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
        </div>
    );

    if (inline) {
        return content;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="fixed inset-0 z-50 w-screen h-screen max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none m-0 rounded-none p-0 flex flex-col bg-slate-50 dark:bg-slate-950 border-0 !translate-x-0 !translate-y-0 !left-0 !top-0">
                {content}
            </DialogContent>
        </Dialog>
    );
}
