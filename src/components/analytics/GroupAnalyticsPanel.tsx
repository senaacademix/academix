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
import { Users, GraduationCap, UserX, UserCheck, BookOpen, AlertTriangle, CheckCircle2, Clock, Calendar, AlertCircle, Settings, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatName } from "@/lib/utils";

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
        attendances: { status: string; date: Date; courseId: string }[];
        remarks: { type: string; date: Date }[];
        coursesStats: { title: string; averageGrade: number; totalGrades: number }[];
        coursesList?: { id: string; title: string; teacherName?: string; schedules?: { dayOfWeek: string }[] }[];
        studentMetrics?: {
            id: string;
            name: string;
            identificacion: string;
            banned: boolean;
            gradesAvg: number;
            courseGrades?: Record<string, number>;
            courseAttendances?: Record<string, { present: number; absent: number; late: number; leaveEarly?: number; absentHours?: number; lateHours?: number; leaveEarlyHours?: number; totalClasses?: number }>;
            courseRemarks?: Record<string, { attention: number; commendation: number }>;
            attendances: { present: number; absent: number; late: number; leaveEarly?: number; absentHours?: number; lateHours?: number; leaveEarlyHours?: number };
            remarks: { attention: number; commendation: number };
        }[];
    } | null;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        // Default weights if not passed
        const wAcad = data.wAcademic !== undefined ? data.wAcademic : 70;
        const wAtt = data.wAttendance !== undefined ? data.wAttendance : 20;
        const wDisc = data.wDiscipline !== undefined ? data.wDiscipline : 10;
        
        return (
            <div className="bg-popover text-popover-foreground border rounded-xl p-4 shadow-xl text-xs space-y-2 max-w-[280px]">
                <p className="font-extrabold text-sm border-b pb-1 text-foreground">{data.name}</p>
                <div className="space-y-1">
                    <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400">Puntaje Integral: {data.score} / 100</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest pt-1">Desglose de Puntos:</p>
                    <p className="flex justify-between gap-4 text-muted-foreground">• Rendimiento ({wAcad}%): <span className="font-medium text-foreground">{data.academic} pts ({data.gradesAvg > 0 ? data.gradesAvg.toFixed(2) : "N/A"})</span></p>
                    <p className="flex justify-between gap-4 text-muted-foreground">• Asistencia ({wAtt}%): <span className="font-medium text-foreground">{data.attendance} pts ({data.absences} F / {data.lates} T / {data.leaveEarly || 0} R)</span></p>
                    <p className="flex justify-between gap-4 text-muted-foreground">• Disciplina ({wDisc}%): <span className="font-medium text-foreground">{data.discipline} pts ({data.attentionCalls} LL / {data.commendations} F)</span></p>
                </div>
            </div>
        );
    }
    return null;
};

export function GroupAnalyticsPanel({ open, onOpenChange, inline = false, isLoading, analyticsData }: GroupAnalyticsPanelProps) {
    
    const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
    const [academicWeight, setAcademicWeight] = useState<number>(70);
    const [attendanceWeight, setAttendanceWeight] = useState<number>(20);
    const [disciplineWeight, setDisciplineWeight] = useState<number>(10);
    const [showWeightsConfig, setShowWeightsConfig] = useState<boolean>(false);
    const [showSourcesInfo, setShowSourcesInfo] = useState<boolean>(false);

    const handleWeightChange = (type: "academic" | "attendance" | "discipline", value: number) => {
        if (type === "academic") {
            setAcademicWeight(value);
        } else if (type === "attendance") {
            setAttendanceWeight(value);
        } else if (type === "discipline") {
            setDisciplineWeight(value);
        }
    };



    const groupDailyHours = useMemo(() => {
        if (!analyticsData) return 0;
        const gStart = analyticsData.startTime || "08:00";
        const gEnd = analyticsData.endTime || "12:00";
        const [gsh, gsm] = gStart.split(":").map(Number);
        const [geh, gem] = gEnd.split(":").map(Number);
        return Math.max(0, (geh * 60 + gem - (gsh * 60 + gsm)) / 60);
    }, [analyticsData]);

    const totalScheduledHours = useMemo(() => {
        if (!analyticsData) return 0;
        return analyticsData.totalCourseClasses * groupDailyHours;
    }, [analyticsData, groupDailyHours]);

    const detailedMetricsData = useMemo(() => {
        if (!analyticsData || !analyticsData.studentMetrics) return [];
        return analyticsData.studentMetrics.map(s => {
            let absentCount = 0;
            let lateCount = 0;
            let leaveEarlyCount = 0;
            let absentHours = 0;
            let lateHours = 0;
            let leaveEarlyHours = 0;
            let totalClassDays = analyticsData.totalCourseClasses;

            if (selectedCourseId === "all") {
                absentCount = s.attendances.absent;
                lateCount = s.attendances.late;
                leaveEarlyCount = s.attendances.leaveEarly || 0;
                absentHours = s.attendances.absentHours || (absentCount * groupDailyHours);
                lateHours = s.attendances.lateHours || 0;
                leaveEarlyHours = s.attendances.leaveEarlyHours || 0;
            } else {
                const cAtt = s.courseAttendances?.[selectedCourseId] || { absent: 0, late: 0, leaveEarly: 0, absentHours: 0, lateHours: 0, leaveEarlyHours: 0, totalClasses: 0 };
                absentCount = cAtt.absent;
                lateCount = cAtt.late;
                leaveEarlyCount = cAtt.leaveEarly || 0;
                absentHours = cAtt.absentHours || (absentCount * groupDailyHours);
                lateHours = cAtt.lateHours || 0;
                leaveEarlyHours = cAtt.leaveEarlyHours || 0;
                totalClassDays = cAtt.totalClasses !== undefined ? cAtt.totalClasses : analyticsData.totalCourseClasses;
            }
            
            const dynamicTotalScheduledHours = totalClassDays * groupDailyHours;

            const attendanceDaysRate = totalClassDays > 0 
                ? Math.max(0, Math.min(100, ((totalClassDays - absentCount) / totalClassDays) * 100))
                : 100;
            
            const totalLostHours = absentHours + lateHours + leaveEarlyHours;
            const attendanceHoursRate = dynamicTotalScheduledHours > 0
                ? Math.max(0, Math.min(100, ((dynamicTotalScheduledHours - totalLostHours) / dynamicTotalScheduledHours) * 100))
                : 100;

            const lateDaysRate = totalClassDays > 0
                ? Math.max(0, Math.min(100, (lateCount / totalClassDays) * 100))
                : 0;

            const lateHoursRate = dynamicTotalScheduledHours > 0
                ? Math.max(0, Math.min(100, (lateHours / dynamicTotalScheduledHours) * 100))
                : 0;

            const leaveEarlyDaysRate = totalClassDays > 0
                ? Math.max(0, Math.min(100, (leaveEarlyCount / totalClassDays) * 100))
                : 0;
                
            const details: any[] = [];
            if (selectedCourseId === "all") {
                Object.keys(s.courseAttendances || {}).forEach(cId => {
                    const ca = s.courseAttendances![cId];
                    if (ca.absent > 0 || ca.late > 0 || (ca.leaveEarly || 0) > 0) {
                        const cInfo = analyticsData.coursesList?.find(c => c.id === cId);
                        details.push({
                            courseName: cInfo?.title || "Desconocido",
                            teacherName: cInfo?.teacherName || "No asignado",
                            absent: ca.absent,
                            late: ca.late,
                            leaveEarly: ca.leaveEarly || 0
                        });
                    }
                });
            } else {
                const ca = s.courseAttendances?.[selectedCourseId];
                if (ca && (ca.absent > 0 || ca.late > 0 || (ca.leaveEarly || 0) > 0)) {
                    const cInfo = analyticsData.coursesList?.find(c => c.id === selectedCourseId);
                    details.push({
                        courseName: cInfo?.title || "Desconocido",
                        teacherName: cInfo?.teacherName || "No asignado",
                        absent: ca.absent,
                        late: ca.late,
                        leaveEarly: ca.leaveEarly || 0
                    });
                }
            }

            return {
                student: { id: s.id, name: s.name, profile: { identificacion: s.identificacion } },
                absentCount,
                absentHours,
                lateCount,
                lateHours,
                leaveEarlyCount,
                leaveEarlyHours,
                attendanceDaysRate,
                attendanceHoursRate,
                lateDaysRate,
                lateHoursRate,
                leaveEarlyDaysRate,
                totalClassDays,
                totalScheduledHours: dynamicTotalScheduledHours,
                details
            };
        });
    }, [analyticsData, selectedCourseId, groupDailyHours]);

    const filteredAttendancesCount = useMemo(() => {
        if (!analyticsData) return 0;
        if (selectedCourseId === "all") return analyticsData.attendances.length;
        
        let count = 0;
        if (analyticsData.studentMetrics) {
            analyticsData.studentMetrics.forEach(s => {
                const cAtt = s.courseAttendances?.[selectedCourseId];
                if (cAtt) {
                    count += cAtt.absent + cAtt.late + (cAtt.leaveEarly || 0);
                }
            });
        }
        return count;
    }, [analyticsData, selectedCourseId]);

    // Asistencias Chart Data
    const attendanceData = useMemo(() => {
        if (!analyticsData) return [];
        let absent = 0, late = 0, present = 0, leaveEarly = 0;
        
        if (selectedCourseId === "all" || !analyticsData.studentMetrics) {
            analyticsData.attendances.forEach(att => {
                if (att.status === "ABSENT") absent++;
                else if (att.status === "LATE") late++;
                else if (att.status === "LEAVE_EARLY") leaveEarly++;
            });
            const totalExpected = analyticsData.totalCourseClasses * analyticsData.students.active;
            present = Math.max(0, totalExpected - absent - late - leaveEarly);
        } else {
            analyticsData.studentMetrics.forEach(s => {
                if (s.courseAttendances && s.courseAttendances[selectedCourseId]) {
                    absent += s.courseAttendances[selectedCourseId].absent;
                    late += s.courseAttendances[selectedCourseId].late;
                    present += s.courseAttendances[selectedCourseId].present;
                    leaveEarly += s.courseAttendances[selectedCourseId].leaveEarly || 0;
                }
            });
        }

        return [
            { name: "Presente", value: present },
            { name: "Ausente", value: absent },
            { name: "Llegada Tarde", value: late },
            { name: "Retiro Temprano", value: leaveEarly },
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

    // Missing Attendance calculation per teacher
    const missingAttendanceList = useMemo(() => {
        if (!analyticsData || !analyticsData.coursesList) return [];

        const list: { courseId: string; title: string; teacherName: string; missingDates: string[] }[] = [];
        
        const rawStart = analyticsData.startDate ? new Date(analyticsData.startDate) : null;
        const rawEnd = analyticsData.endDate ? new Date(analyticsData.endDate) : null;
        
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        
        const start = rawStart && !isNaN(rawStart.getTime()) ? new Date(rawStart) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        start.setHours(12, 0, 0, 0);
        
        const end = rawEnd && !isNaN(rawEnd.getTime()) && rawEnd < today ? new Date(rawEnd) : today;
        end.setHours(12, 0, 0, 0);

        const dayOfWeekNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

        const recordedDatesMap = new Map<string, Set<string>>();
        (analyticsData.attendances || []).forEach(att => {
            if (!att.date) return;
            const dStr = new Date(att.date).toISOString().split('T')[0];
            if (!recordedDatesMap.has(att.courseId)) {
                recordedDatesMap.set(att.courseId, new Set());
            }
            recordedDatesMap.get(att.courseId)!.add(dStr);
        });

        analyticsData.coursesList.forEach(course => {
            const schedules = course.schedules || [];
            const scheduledDays = schedules.map((s: any) => s.dayOfWeek);
            
            const activeScheduledDays = scheduledDays.length > 0 
                ? scheduledDays 
                : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

            const missing: string[] = [];
            const cur = new Date(start);

            while (cur <= end) {
                const jsDay = cur.getDay();
                const dayOfWeekName = dayOfWeekNames[jsDay];
                
                if (activeScheduledDays.includes(dayOfWeekName)) {
                    const dateStr = cur.toISOString().split('T')[0];
                    const courseRecs = recordedDatesMap.get(course.id);
                    
                    if (!courseRecs || !courseRecs.has(dateStr)) {
                        missing.push(cur.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }));
                    }
                }
                cur.setDate(cur.getDate() + 1);
            }

            if (missing.length > 0) {
                list.push({
                    courseId: course.id,
                    title: course.title,
                    teacherName: course.teacherName || "No asignado",
                    missingDates: missing
                });
            }
        });

        return list;
    }, [analyticsData]);

    // Per Student Course Attendances
    const studentAttendanceBarsData = useMemo(() => {
        if (!analyticsData || !analyticsData.studentMetrics) return [];
        return analyticsData.studentMetrics
            .map(s => {
                const att = selectedCourseId === "all" 
                    ? { present: s.attendances.present, absent: s.attendances.absent, late: s.attendances.late, leaveEarly: s.attendances.leaveEarly || 0 }
                    : {
                        present: s.courseAttendances?.[selectedCourseId]?.present || 0,
                        absent: s.courseAttendances?.[selectedCourseId]?.absent || 0,
                        late: s.courseAttendances?.[selectedCourseId]?.late || 0,
                        leaveEarly: s.courseAttendances?.[selectedCourseId]?.leaveEarly || 0
                      };
                
                const details: any[] = [];
                if (selectedCourseId === "all") {
                    Object.keys(s.courseAttendances || {}).forEach(cId => {
                        const ca = s.courseAttendances![cId];
                        if (ca.absent > 0 || ca.late > 0 || (ca.leaveEarly || 0) > 0) {
                            const cInfo = analyticsData.coursesList?.find(c => c.id === cId);
                            details.push({
                                courseName: cInfo?.title || "Desconocido",
                                teacherName: cInfo?.teacherName || "No asignado",
                                absent: ca.absent,
                                late: ca.late,
                                leaveEarly: ca.leaveEarly || 0
                            });
                        }
                    });
                } else {
                    const ca = s.courseAttendances?.[selectedCourseId];
                    if (ca && (ca.absent > 0 || ca.late > 0 || (ca.leaveEarly || 0) > 0)) {
                        const cInfo = analyticsData.coursesList?.find(c => c.id === selectedCourseId);
                        details.push({
                            courseName: cInfo?.title || "Desconocido",
                            teacherName: cInfo?.teacherName || "No asignado",
                            absent: ca.absent,
                            late: ca.late,
                            leaveEarly: ca.leaveEarly || 0
                        });
                    }
                }

                return {
                    name: s.name.split(' ')[0] + (s.name.split(' ').length > 1 ? ' ' + s.name.split(' ')[1] : ''),
                    presente: att.present,
                    ausente: att.absent,
                    tarde: att.late,
                    retiro: att.leaveEarly,
                    fullName: s.name,
                    details
                };
            })
            .sort((a, b) => (b.ausente + b.tarde + (b.retiro || 0)) - (a.ausente + a.tarde + (a.retiro || 0))); // Sort by most absent
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

        const selectedCourse = analyticsData.coursesList?.find(c => c.id === selectedCourseId);
        const selectedCourseTitle = selectedCourse?.title;
        const stats = analyticsData.coursesStats.find(c => c.title === selectedCourseTitle);
        const hasGrades = selectedCourseId === "all"
            ? analyticsData.coursesStats.some(c => c.totalGrades > 0)
            : (stats ? stats.totalGrades > 0 : false);

        return analyticsData.studentMetrics.map(student => {
            let gradesAvg = 0;
            let absences = 0;
            let lates = 0;
            let leaveEarly = 0;
            let attentionCalls = 0;
            let commendations = 0;

            if (selectedCourseId === "all") {
                gradesAvg = student.gradesAvg;
                absences = student.attendances?.absent || 0;
                lates = student.attendances?.late || 0;
                leaveEarly = student.attendances?.leaveEarly || 0;
                attentionCalls = student.remarks?.attention || 0;
                commendations = student.remarks?.commendation || 0;
            } else {
                gradesAvg = student.courseGrades?.[selectedCourseId] || 0;
                const courseAtt = student.courseAttendances?.[selectedCourseId] || { present: 0, absent: 0, late: 0, leaveEarly: 0 };
                absences = courseAtt.absent;
                lates = courseAtt.late;
                leaveEarly = courseAtt.leaveEarly || 0;
                const courseRem = student.courseRemarks?.[selectedCourseId] || { attention: 0, commendation: 0 };
                attentionCalls = courseRem.attention;
                commendations = courseRem.commendation;
            }

            // 1. Academic Score: based on gradesAvg (0 to 5).
            const academicScore = hasGrades ? (gradesAvg > 0 ? (gradesAvg / 5) * 100 : 0) : 100;

            // 2. Attendance Score: 10 points penalty per absence, 4 points per late arrival, 4 points per early leave.
            const attendanceScore = Math.max(0, 100 - (absences * 10) - (lates * 4) - (leaveEarly * 4));

            // 3. Discipline Score: 15 points penalty per attention call, +5 points bonus per commendation.
            const disciplineScore = Math.min(100, Math.max(0, 100 - (attentionCalls * 15) + (commendations * 5)));

            // Normalized Weights
            const totalWeight = academicWeight + attendanceWeight + disciplineWeight;
            const normAcademic = totalWeight > 0 ? academicWeight / totalWeight : 0.7;
            const normAttendance = totalWeight > 0 ? attendanceWeight / totalWeight : 0.2;
            const normDiscipline = totalWeight > 0 ? disciplineWeight / totalWeight : 0.1;

            // Composite Score
            const compositeScore = parseFloat(
                ((academicScore * normAcademic) + (attendanceScore * normAttendance) + (disciplineScore * normDiscipline)).toFixed(1)
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
                leaveEarly,
                attentionCalls,
                commendations,
                wAcademic: academicWeight,
                wAttendance: attendanceWeight,
                wDiscipline: disciplineWeight
            };
        }).sort((a, b) => b.score - a.score); // Sort from best to worst
    }, [analyticsData, selectedCourseId, groupDailyHours, academicWeight, attendanceWeight, disciplineWeight]);

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
                                            <p className="text-sm font-medium text-muted-foreground">Inasistencias, Retardos y Retiros Reg.</p>
                                            <h3 className="text-2xl font-bold">{filteredAttendancesCount}</h3>
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

                             <Tabs defaultValue="rendimiento" className="w-full mt-6">
                                <TabsList className="grid w-full sm:w-[400px] grid-cols-3 mb-6 mx-auto">
                                    <TabsTrigger value="rendimiento">Rendimiento</TabsTrigger>
                                    <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
                                    <TabsTrigger value="disciplina">Disciplina</TabsTrigger>
                                </TabsList>

                                <TabsContent value="rendimiento" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Student Ranking Chart (from best to worst) */}
                                {rankedStudentsData.length > 0 && (
                                <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between gap-2">
                                            <span className="flex items-center gap-2">
                                                <GraduationCap className="w-5 h-5 text-indigo-500" />
                                                Ranking de Estudiantes (Rendimiento Integral)
                                            </span>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => setShowWeightsConfig(!showWeightsConfig)}
                                                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                                            >
                                                <Settings className="w-3.5 h-3.5 mr-1" />
                                                {showWeightsConfig ? "Ocultar Configuración" : "Configurar Ponderación"}
                                            </Button>
                                        </CardTitle>
                                        <CardDescription>
                                            Estudiantes ordenados de mayor a menor puntaje integral. El cálculo pondera: Calificaciones ({academicWeight}%), Asistencia ({attendanceWeight}%) y Disciplina ({disciplineWeight}%).
                                        </CardDescription>

                                        {showWeightsConfig && (
                                            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-extrabold text-foreground flex items-center justify-between">
                                                            <span>Calificaciones</span>
                                                            <span className="text-indigo-600 font-black">{academicWeight}%</span>
                                                        </label>
                                                        <input 
                                                            type="range" 
                                                            min="0" 
                                                            max="100" 
                                                            value={academicWeight} 
                                                            onChange={e => handleWeightChange("academic", parseInt(e.target.value))}
                                                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-extrabold text-foreground flex items-center justify-between">
                                                            <span>Asistencia</span>
                                                            <span className="text-indigo-600 font-black">{attendanceWeight}%</span>
                                                        </label>
                                                        <input 
                                                            type="range" 
                                                            min="0" 
                                                            max="100" 
                                                            value={attendanceWeight} 
                                                            onChange={e => handleWeightChange("attendance", parseInt(e.target.value))}
                                                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-extrabold text-foreground flex items-center justify-between">
                                                            <span>Disciplina</span>
                                                            <span className="text-indigo-600 font-black">{disciplineWeight}%</span>
                                                        </label>
                                                        <input 
                                                            type="range" 
                                                            min="0" 
                                                            max="100" 
                                                            value={disciplineWeight} 
                                                            onChange={e => handleWeightChange("discipline", parseInt(e.target.value))}
                                                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                                    <div className="text-[10px] font-bold flex items-center gap-1.5">
                                                        <span className="text-muted-foreground">Suma Total:</span>
                                                        <span className={academicWeight + attendanceWeight + disciplineWeight === 100 ? "text-emerald-600 font-black" : "text-red-500 font-black"}>
                                                            {academicWeight + attendanceWeight + disciplineWeight}%
                                                        </span>
                                                        {academicWeight + attendanceWeight + disciplineWeight !== 100 && (
                                                            <span className="text-red-500/80 font-normal">(La suma debe ser exactamente 100%)</span>
                                                        )}
                                                    </div>
                                                    
                                                    <Button 
                                                        variant="link" 
                                                        size="sm" 
                                                        onClick={() => setShowSourcesInfo(!showSourcesInfo)}
                                                        className="text-[10px] text-muted-foreground hover:text-indigo-600 p-0 h-auto font-bold"
                                                    >
                                                        <Info className="w-3.5 h-3.5 mr-1" />
                                                        ¿De dónde vienen estos datos?
                                                    </Button>
                                                </div>

                                                {showSourcesInfo && (
                                                    <div className="mt-3 p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 text-[11px] text-muted-foreground space-y-2">
                                                        <p className="font-extrabold text-foreground text-xs">Orígenes de Datos e Impacto:</p>
                                                        <ul className="list-disc pl-4 space-y-1.5">
                                                            <li>
                                                                <strong className="text-foreground">Calificaciones:</strong> Promedio de notas de las actividades calificables creadas por el docente para el curso. Una nota de 5.0 representa 100 puntos académicos; calificaciones menores se ponderan proporcionalmente.
                                                            </li>
                                                            <li>
                                                                <strong className="text-foreground">Asistencia:</strong> Calculado sobre el registro diario. Cada inasistencia (Falta) resta <span className="text-red-600 font-bold">-10 puntos</span>, cada llegada tarde resta <span className="text-amber-600 font-bold">-4 puntos</span>, y cada retiro temprano resta <span className="text-blue-600 font-bold">-4 puntos</span> de un máximo de 100 puntos.
                                                            </li>
                                                            <li>
                                                                <strong className="text-foreground">Disciplina:</strong> Basado en observaciones registradas en el grupo. Cada llamado de atención resta <span className="text-red-600 font-bold">-15 puntos</span>, y cada felicitación añade <span className="text-emerald-600 font-bold">+5 puntos</span> de bonificación sobre una base de 100 puntos.
                                                            </li>
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
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

                                    </div>
                                </TabsContent>

                                <TabsContent value="asistencia" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                        {studentAttendanceBarsData.length > 0 && studentAttendanceBarsData.some(s => s.ausente > 0 || s.tarde > 0 || (s.retiro || 0) > 0) ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={studentAttendanceBarsData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} angle={-45} textAnchor="end" />
                                                    <YAxis axisLine={false} tickLine={false} />
                                                    <Tooltip 
                                                        cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                const data = payload[0].payload;
                                                                return (
                                                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 max-w-[280px]">
                                                                        <p className="font-bold text-sm mb-2">{data.fullName}</p>
                                                                        <div className="flex gap-3 mb-2 flex-wrap">
                                                                            <span className="text-red-500 font-medium text-xs">Faltas: {data.ausente}</span>
                                                                            <span className="text-amber-500 font-medium text-xs">Tardes: {data.tarde}</span>
                                                                            <span className="text-blue-500 font-medium text-xs">Retiros: {data.retiro || 0}</span>
                                                                        </div>
                                                                        {data.details && data.details.length > 0 && (
                                                                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                                                                <p className="text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Detalle de Inasistencias:</p>
                                                                                <ul className="space-y-2">
                                                                                    {data.details.map((d: any, i: number) => (
                                                                                        <li key={i} className="text-xs leading-tight">
                                                                                            <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">{d.courseName}</span>
                                                                                            <span className="text-muted-foreground block text-[10px]">Prof: {d.teacherName}</span>
                                                                                            <div className="mt-1 flex gap-2 flex-wrap">
                                                                                                {d.absent > 0 && <span className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">Faltas: {d.absent}</span>}
                                                                                                {d.late > 0 && <span className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">Tardes: {d.late}</span>}
                                                                                                {d.leaveEarly > 0 && <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">Retiros: {d.leaveEarly}</span>}
                                                                                            </div>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                    <Legend verticalAlign="top" height={36} />
                                                    <Bar dataKey="ausente" name="Ausente" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} maxBarSize={40} />
                                                    <Bar dataKey="tarde" name="Llegada Tarde" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} maxBarSize={40} />
                                                    <Bar dataKey="retiro" name="Retiro Temprano" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                                                Excelente asistencia, no hay inasistencias registradas.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>


                                {/* Docentes sin Asistencia Registrada */}
                                <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-base font-black">
                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                            Seguimiento de Asistencia Docente (Clases sin Registro)
                                        </CardTitle>
                                        <CardDescription>
                                            Muestra los días en que cada docente tenía clase programada pero no se registró asistencia de ningún estudiante.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {missingAttendanceList.length > 0 ? (
                                            <div className="overflow-x-auto rounded-xl border border-border/50">
                                                <Table>
                                                    <TableHeader className="bg-muted/30">
                                                        <TableRow>
                                                            <TableHead className="font-semibold text-xs py-3 pl-6">Materia</TableHead>
                                                            <TableHead className="font-semibold text-xs py-3">Docente</TableHead>
                                                            <TableHead className="font-semibold text-xs py-3 text-center w-[120px]">Días Pendientes</TableHead>
                                                            <TableHead className="font-semibold text-xs py-3 pr-6">Fechas sin Asistencia</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {missingAttendanceList.map((item, index) => (
                                                            <TableRow key={item.courseId} className="hover:bg-muted/10 transition-colors">
                                                                <TableCell className="font-bold text-xs py-3.5 pl-6">{item.title}</TableCell>
                                                                <TableCell className="font-medium text-xs py-3.5 text-muted-foreground">{item.teacherName}</TableCell>
                                                                <TableCell className="text-center py-3.5">
                                                                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 font-extrabold text-[10px] px-2 py-0.5">
                                                                        {item.missingDates.length} {item.missingDates.length === 1 ? "día" : "días"}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="py-3.5 pr-6">
                                                                    <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-2 scrollbar-thin">
                                                                        {item.missingDates.map((date, idx) => (
                                                                            <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-muted font-mono font-semibold text-muted-foreground border">
                                                                                {date}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 rounded-xl border border-dashed bg-muted/5">
                                                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-full text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle2 className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm">¡Control al día!</h4>
                                                    <p className="text-xs text-muted-foreground max-w-xs mt-0.5">
                                                        Todos los docentes han registrado la asistencia de los estudiantes en todas sus fechas programadas.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* DETAILED METRICS CHARTS (ADDED FOR ADMIN) */}
                                <div className="col-span-1 lg:col-span-2 space-y-6">
                                    {/* CHART 1: ABSENCES (FALTAS) */}
                                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                                        <CardHeader>
                                            <CardTitle className="text-base font-black">Registro de Inasistencias (Faltas)</CardTitle>
                                            <CardDescription>Total de días no asistidos por cada estudiante sobre el total de días programados.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {detailedMetricsData.map(({ student, absentCount, attendanceDaysRate, totalClassDays, details }: any) => {
                                                const absenceRate = 100 - attendanceDaysRate;
                                                return (
                                                    <div key={student.id} className="space-y-1.5 pb-2">
                                                        <div className="flex items-center justify-between text-xs font-bold">
                                                            <span className="truncate text-foreground max-w-[300px] sm:max-w-md">{formatName(student.name, student.profile)}</span>
                                                            <span className="text-red-600 shrink-0 font-extrabold">
                                                                {absentCount} {absentCount === 1 ? "Falta" : "Faltas"} / {totalClassDays} días ({absenceRate.toFixed(1)}%)
                                                            </span>
                                                        </div>
                                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-red-500 dark:bg-red-600 rounded-full transition-all duration-500" 
                                                                style={{ width: `${absenceRate}%` }}
                                                            />
                                                        </div>
                                                        {details && details.some((d: any) => d.absent > 0) && (
                                                            <div className="flex flex-wrap gap-2 mt-1.5">
                                                                {details.filter((d: any) => d.absent > 0).map((d: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded px-2 py-1 text-[10px] text-muted-foreground">
                                                                        <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1 truncate max-w-[120px]">{d.courseName}</span>
                                                                        <span className="mr-2 border-r border-slate-200 dark:border-slate-700 pr-2">({d.teacherName})</span>
                                                                        <span className="text-red-500 font-bold">{d.absent} {d.absent === 1 ? "falta" : "faltas"}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>

                                    {/* CHART 2: LATE ARRIVALS (TARDANZAS) */}
                                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                                        <CardHeader>
                                            <CardTitle className="text-base font-black">Registro de Llegadas Tarde (Tardanzas)</CardTitle>
                                            <CardDescription>Cantidad de días en los que el estudiante registró ingreso tarde sobre los días programados.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {detailedMetricsData.map(({ student, lateCount, lateDaysRate, totalClassDays, details }: any) => (
                                                <div key={student.id} className="space-y-1.5 pb-2">
                                                    <div className="flex items-center justify-between text-xs font-bold">
                                                        <span className="truncate text-foreground max-w-[300px] sm:max-w-md">{formatName(student.name, student.profile)}</span>
                                                        <span className="text-amber-600 dark:text-amber-400 shrink-0 font-extrabold">
                                                            {lateCount} {lateCount === 1 ? "Tarde" : "Tardes"} / {totalClassDays} días ({lateDaysRate.toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                                                            style={{ width: `${lateDaysRate}%` }}
                                                        />
                                                    </div>
                                                    {details && details.some((d: any) => d.late > 0) && (
                                                        <div className="flex flex-wrap gap-2 mt-1.5">
                                                            {details.filter((d: any) => d.late > 0).map((d: any, idx: number) => (
                                                                <div key={idx} className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded px-2 py-1 text-[10px] text-muted-foreground">
                                                                    <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1 truncate max-w-[120px]">{d.courseName}</span>
                                                                    <span className="mr-2 border-r border-slate-200 dark:border-slate-700 pr-2">({d.teacherName})</span>
                                                                    <span className="text-amber-500 font-bold">{d.late} {d.late === 1 ? "tarde" : "tardes"}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>

                                    {/* CHART 3: EARLY LEAVES (RETIROS) */}
                                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                                        <CardHeader>
                                            <CardTitle className="text-base font-black">Registro de Retiros Tempranos (Retiros)</CardTitle>
                                            <CardDescription>Cantidad de días en los que el estudiante se retiró antes de finalizar la clase sobre los días programados.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {detailedMetricsData.map(({ student, leaveEarlyCount, leaveEarlyDaysRate, totalClassDays, details }: any) => (
                                                <div key={student.id} className="space-y-1.5 pb-2">
                                                    <div className="flex items-center justify-between text-xs font-bold">
                                                        <span className="truncate text-foreground max-w-[300px] sm:max-w-md">{formatName(student.name, student.profile)}</span>
                                                        <span className="text-blue-600 dark:text-blue-400 shrink-0 font-extrabold">
                                                            {leaveEarlyCount} {leaveEarlyCount === 1 ? "Retiro" : "Retiros"} / {totalClassDays} días ({leaveEarlyDaysRate.toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                                                            style={{ width: `${leaveEarlyDaysRate}%` }}
                                                        />
                                                    </div>
                                                    {details && details.some((d: any) => d.leaveEarly > 0) && (
                                                        <div className="flex flex-wrap gap-2 mt-1.5">
                                                            {details.filter((d: any) => d.leaveEarly > 0).map((d: any, idx: number) => (
                                                                <div key={idx} className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded px-2 py-1 text-[10px] text-muted-foreground">
                                                                    <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1 truncate max-w-[120px]">{d.courseName}</span>
                                                                    <span className="mr-2 border-r border-slate-200 dark:border-slate-700 pr-2">({d.teacherName})</span>
                                                                    <span className="text-blue-500 font-bold">{d.leaveEarly} {d.leaveEarly === 1 ? "retiro" : "retiros"}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>

                                    {/* CHART 4: TOTAL ACCUMULATED HOURS & EFFECTIVE ATTENDANCE */}
                                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                                        <CardHeader>
                                            <CardTitle className="text-base font-black">Carga Horaria y Asistencia Efectiva (Horas Asistidas vs. Perdidas)</CardTitle>
                                            <CardDescription>Muestra la cantidad de horas acumuladas entre faltas, tardanzas y retiros, la diferencia (horas asistidas) y el porcentaje de asistencia efectiva con respecto a las horas totales.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-5">
                                            {detailedMetricsData.map(({ student, absentHours, lateHours, leaveEarlyHours, attendanceHoursRate, totalScheduledHours }: any) => {
                                                const lostHours = absentHours + lateHours + (leaveEarlyHours || 0);
                                                const attendedHours = Math.max(0, totalScheduledHours - lostHours);
                                                return (
                                                    <div key={student.id} className="space-y-2 border-b border-border/30 pb-3 last:border-0 last:pb-0">
                                                        <div className="flex flex-wrap items-center justify-between text-xs font-bold gap-2">
                                                            <span className="truncate text-foreground max-w-[280px] sm:max-w-md">{formatName(student.name, student.profile)}</span>
                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-muted-foreground">
                                                                <span className="text-emerald-600 dark:text-emerald-400">Asistidas: {attendedHours.toFixed(2)} hs</span>
                                                                <span className="text-red-500">Perdidas: {lostHours.toFixed(2)} hs</span>
                                                                <span className="text-blue-600 dark:text-blue-400 font-extrabold">Efectiva: {attendanceHoursRate.toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-1">
                                                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                                                                <div 
                                                                    className="h-full bg-emerald-500 dark:bg-emerald-600 transition-all duration-500" 
                                                                    style={{ width: `${attendanceHoursRate}%` }}
                                                                    title={`Horas Asistidas: ${attendedHours.toFixed(2)} hs`}
                                                                />
                                                                {absentHours > 0 && (
                                                                    <div 
                                                                        className="h-full bg-red-500 dark:bg-red-600 transition-all duration-500" 
                                                                        style={{ width: `${(absentHours / totalScheduledHours) * 100}%` }}
                                                                        title={`Horas de Faltas: ${absentHours.toFixed(2)} hs`}
                                                                    />
                                                                )}
                                                                {lateHours > 0 && (
                                                                    <div 
                                                                        className="h-full bg-amber-500 dark:bg-amber-500 transition-all duration-500" 
                                                                        style={{ width: `${(lateHours / totalScheduledHours) * 100}%` }}
                                                                        title={`Horas de Tardanzas: ${lateHours.toFixed(2)} hs`}
                                                                    />
                                                                )}
                                                                {leaveEarlyHours > 0 && (
                                                                    <div 
                                                                        className="h-full bg-blue-500 dark:bg-blue-500 transition-all duration-500" 
                                                                        style={{ width: `${(leaveEarlyHours / totalScheduledHours) * 100}%` }}
                                                                        title={`Horas de Retiros: ${leaveEarlyHours.toFixed(2)} hs`}
                                                                    />
                                                                )}
                                                            </div>
                                                            
                                                            <div className="text-[10px] text-muted-foreground flex justify-between">
                                                                <span>{totalScheduledHours.toFixed(1)} hs totales del curso</span>
                                                                <span>Desglose de pérdida: {absentHours.toFixed(1)} hs Faltas + {lateHours.toFixed(1)} hs Tardanzas + {(leaveEarlyHours || 0).toFixed(1)} hs Retiros</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>
                                    </div>
                                    </div>
                                </TabsContent>
                                
                                <TabsContent value="disciplina" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                </TabsContent>
                            </Tabs>
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
