"use client";

import { useMemo } from "react";
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from "@/components/ui/card";
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Cell
} from "recharts";
import { 
    GraduationCap, 
    Users, 
    Award,
    AlertCircle
} from "lucide-react";
import { formatName } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface CourseStatisticsProps {
    courseId: string;
    courseTitle: string;
    gradesData: any;
}

export function CourseStatistics({ 
    courseTitle, 
    gradesData 
}: CourseStatisticsProps) {
    
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    const currentTheme = mounted ? (resolvedTheme || theme || 'light') : 'light';
    const isDark = currentTheme === 'dark';

    // --- Grade Distribution Calculation ---
    const gradeDistribution = useMemo(() => {
        if (!gradesData || !gradesData.students) return [];

        const ranges = [
            { range: '0.0 - 1.0', min: 0, max: 1, color: isDark ? '#ef4444' : '#dc2626' },
            { range: '1.1 - 2.0', min: 1, max: 2, color: isDark ? '#f97316' : '#ea580c' },
            { range: '2.1 - 3.0', min: 2, max: 3, color: isDark ? '#f59e0b' : '#d97706' },
            { range: '3.1 - 4.0', min: 3, max: 4, color: isDark ? '#22c55e' : '#16a34a' },
            { range: '4.1 - 5.0', min: 4, max: 5.1, color: isDark ? '#3b82f6' : '#2563eb' },
        ];

        const distribution = ranges.map(r => ({
            ...r,
            count: 0,
            students: [] as string[]
        }));

        gradesData.students.forEach((student: any) => {
            let finalGrade = 0;
            let totalWeight = 0;

            if (gradesData.categories) {
                gradesData.categories.forEach((cat: any) => {
                    let catGrade = 0;
                    let catWeight = 0;

                    if (cat.groups) {
                        cat.groups.forEach((group: any) => {
                            let groupGrade = 0;
                            let groupWeight = 0;

                            if (group.items) {
                                group.items.forEach((item: any) => {
                                    let grade = 0;
                                    if (item.activityId) {
                                        const activity = gradesData.activities?.find((a: any) => a.id === item.activityId);
                                        const submission = activity?.submissions?.find((s: any) => s.userId === student.id);
                                        grade = submission?.grade || 0;
                                    } else if (item.evaluationAttemptId) {
                                        const attempt = gradesData.evaluations?.find((e: any) => e.id === item.evaluationAttemptId);
                                        const submission = attempt?.submissions?.find((s: any) => s.userId === student.id);
                                        grade = submission?.score || 0;
                                    }
                                    groupGrade += grade * item.weight;
                                    groupWeight += item.weight;
                                });
                            }
                            const finalGroupGrade = groupWeight > 0 ? groupGrade / groupWeight : 0;
                            catGrade += finalGroupGrade * group.weight;
                            catWeight += group.weight;
                        });
                    }
                    const finalCatGrade = catWeight > 0 ? catGrade / catWeight : 0;
                    finalGrade += finalCatGrade * cat.weight;
                    totalWeight += cat.weight;
                });
            }

            const actualFinalGrade = totalWeight > 0 ? finalGrade / totalWeight : 0;
            
            const rangeIndex = ranges.findIndex(r => actualFinalGrade >= r.min && actualFinalGrade < r.max);
            if (rangeIndex !== -1) {
                distribution[rangeIndex].count++;
                distribution[rangeIndex].students.push(formatName(student.name, student.profile));
            }
        });

        return distribution;
    }, [gradesData, isDark]);

    const averageGrade = useMemo(() => {
        if (!gradesData || !gradesData.students || gradesData.students.length === 0) return 0;
        
        let totalSum = 0;
        let count = 0;

        gradesData.students.forEach((student: any) => {
             let finalGrade = 0;
             let totalWeight = 0;
 
             if (gradesData.categories) {
                 gradesData.categories.forEach((cat: any) => {
                     let catGrade = 0;
                     let catWeight = 0;
 
                     if (cat.groups) {
                         cat.groups.forEach((group: any) => {
                             let groupGrade = 0;
                             let groupWeight = 0;
 
                             if (group.items) {
                                 group.items.forEach((item: any) => {
                                     let grade = 0;
                                     if (item.activityId) {
                                         const activity = gradesData.activities?.find((a: any) => a.id === item.activityId);
                                         const submission = activity?.submissions?.find((s: any) => s.userId === student.id);
                                         grade = submission?.grade || 0;
                                     } else if (item.evaluationAttemptId) {
                                         const attempt = gradesData.evaluations?.find((e: any) => e.id === item.evaluationAttemptId);
                                         const submission = attempt?.submissions?.find((s: any) => s.userId === student.id);
                                         grade = submission?.score || 0;
                                     }
                                     groupGrade += grade * item.weight;
                                     groupWeight += item.weight;
                                 });
                             }
                             const finalGroupGrade = groupWeight > 0 ? groupGrade / groupWeight : 0;
                             catGrade += finalGroupGrade * group.weight;
                             catWeight += group.weight;
                         });
                     }
                     const finalCatGrade = catWeight > 0 ? catGrade / catWeight : 0;
                     finalGrade += finalCatGrade * cat.weight;
                     totalWeight += cat.weight;
                 });
             }
 
             totalSum += totalWeight > 0 ? finalGrade / totalWeight : 0;
             count++;
        });

        return totalSum / count;
    }, [gradesData]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Promedio Académico</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{averageGrade.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Sobre 5.0</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estudiantes Activos</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{gradesData.students?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">Enrolados en la materia</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rendimiento</CardTitle>
                        {averageGrade >= 3.0 ? <Award className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{averageGrade >= 3.0 ? "Satisfactorio" : "Bajo"}</div>
                        <p className="text-xs text-muted-foreground">Estado general del grupo</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Distribución de Calificaciones</CardTitle>
                    <CardDescription>Visualización del rendimiento consolidado de los estudiantes</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={gradeDistribution}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis 
                                dataKey="range" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--foreground)', fontSize: 12 }}
                            />
                            <YAxis 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--foreground)', fontSize: 12 }}
                            />
                            <Tooltip 
                                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                                contentStyle={{ 
                                    backgroundColor: 'var(--background)', 
                                    borderColor: 'var(--border)',
                                    borderRadius: '8px',
                                    color: 'var(--foreground)'
                                }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {gradeDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
