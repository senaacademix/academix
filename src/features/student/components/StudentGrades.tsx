"use client";

import React, { useEffect, useState } from "react";
import { getStudentGrades } from "@/features/teacher/actions/gradeActions";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

export function StudentGrades() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user?.id) {
          const data = await getStudentGrades(session.data.user.id);
          setCourses(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground animate-pulse">Cargando calificaciones...</div>;
  }

  if (courses.length === 0) {
    return (
      <Card className="py-24 text-center border-dashed">
        <CardContent className="flex flex-col items-center justify-center pt-6">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle className="text-xl font-bold mb-2">Sin Materias</CardTitle>
          <p className="text-muted-foreground">No estás inscrito en ninguna materia actualmente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {courses.map(course => {
        let totalScore = 0;
        let totalWeight = 0;
        
        course.activities.forEach((act: any) => {
          const grade = act.grades[0];
          if (grade) {
            totalScore += grade.score * (act.weight / 100);
            totalWeight += act.weight;
          }
        });

        const currentAverage = totalWeight > 0 ? (totalScore / (totalWeight / 100)).toFixed(2) : "-";

        return (
          <Card key={course.id} className="overflow-hidden border-border/50 shadow-sm">
            <CardHeader className="bg-muted/10 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl">{course.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Actividades Evaluativas
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-muted-foreground">Promedio Actual</span>
                <span className={`text-2xl font-black ${parseFloat(currentAverage) < 3.0 ? 'text-red-500' : 'text--600 dark:text--400'}`}>
                  {currentAverage}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {course.activities.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  El profesor aún no ha asignado actividades evaluativas en esta materia.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/5">
                    <TableRow>
                      <TableHead>Actividad</TableHead>
                      <TableHead className="w-[100px] text-center">Peso (%)</TableHead>
                      <TableHead className="w-[120px] text-center">Calificación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {course.activities.map((act: any) => {
                      const grade = act.grades[0];
                      return (
                        <TableRow key={act.id}>
                          <TableCell>
                            <div className="font-semibold">{act.title}</div>
                            {act.description && <div className="text-xs text-muted-foreground">{act.description}</div>}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground font-medium">
                            {act.weight}%
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {grade ? (
                              <Badge variant="outline" className={grade.score < 3.0 ? "text--600 dark:text--400 bg--50 dark:bg--950/20 border--200 dark:border--800/50" : "text--700 dark:text--300 bg--50 dark:bg--950/20 border--200 dark:border--800/50"}>
                                {grade.score.toFixed(1)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">Pendiente</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
