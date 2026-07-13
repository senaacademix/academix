"use client";

import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Calendar, Clock, AlertTriangle, Award, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface StudentAnalyticsPanelProps {
  attendances: any[];
  remarks: any[];
  studentName: string;
}

export function StudentAnalyticsPanel({ attendances, remarks, studentName }: StudentAnalyticsPanelProps) {
  const attendanceData = useMemo(() => {
    let absent = 0;
    let late = 0;

    attendances.forEach(att => {
      if (att.status === "ABSENT") absent++;
      if (att.status === "LATE") late++;
    });

    return { counts: { absent, late } };
  }, [attendances]);

  const sortedAttendances = useMemo(() => [...attendances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [attendances]);
  
  const attendanceTimeData = useMemo(() => {
    // Only chart the ones that are absent or late
    const filtered = sortedAttendances.filter(a => a.status !== "PRESENT").reverse(); // Oldest first for timeline
    
    const labels = filtered.map(a => format(new Date(a.date), "dd MMM HH:mm", { locale: es }));
    const absentData = filtered.map(a => a.status === "ABSENT" ? 1 : 0);
    const lateData = filtered.map(a => a.status === "LATE" ? 1 : 0);

    return {
      labels,
      datasets: [
        {
          label: "Ausencia",
          data: absentData,
          backgroundColor: "rgba(239, 68, 68, 0.7)",
          borderColor: "rgb(239, 68, 68)",
          borderWidth: 1,
        },
        {
          label: "Llegada Tarde",
          data: lateData,
          backgroundColor: "rgba(245, 158, 11, 0.7)",
          borderColor: "rgb(245, 158, 11)",
          borderWidth: 1,
        }
      ]
    };
  }, [sortedAttendances]);

  const remarksData = useMemo(() => {
    let attention = 0;
    let commendation = 0;

    remarks.forEach(rem => {
      if (rem.type === "ATTENTION") attention++;
      if (rem.type === "COMMENDATION") commendation++;
    });

    return {
      labels: ["Llamados de Atención", "Felicitaciones"],
      datasets: [
        {
          label: "Observaciones",
          data: [attention, commendation],
          backgroundColor: [
            "rgba(249, 115, 22, 0.7)",
            "rgba(59, 130, 246, 0.7)",
          ],
          borderColor: [
            "rgb(249, 115, 22)",
            "rgb(59, 130, 246)",
          ],
          borderWidth: 1,
        },
      ],
      counts: { attention, commendation }
    };
  }, [remarks]);

  const sortedRemarks = useMemo(() => [...remarks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [remarks]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-2 sm:p-4 rounded-xl">
      {/* Header Profile */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6 bg-white dark:bg-slate-900 p-6 rounded-xl border shadow-sm shrink-0 text-center sm:text-left">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20 shrink-0">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{studentName}</h2>
          <p className="text-muted-foreground flex items-center gap-2 mt-1 justify-center sm:justify-start">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Reporte Individual de Rendimiento y Conducta
          </p>
        </div>
      </div>

      {/* Vertical Scroll Area for the Grid */}
      <ScrollArea className="flex-1 w-full h-full pr-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          
          {/* Left Column: Attendance */}
          <div className="flex flex-col gap-6">
            {/* Charts */}
            <Card className="shrink-0 border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Resumen de Asistencia
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 p-4">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <div className="p-4 flex-1 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900 flex items-center justify-between">
                    <span className="font-medium text-red-700 dark:text-red-400">Ausencias</span>
                    <Badge variant="secondary" className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 text-lg">{attendanceData.counts.absent}</Badge>
                  </div>
                  <div className="p-4 flex-1 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900 flex items-center justify-between">
                    <span className="font-medium text-amber-700 dark:text-amber-400">Llegadas Tarde</span>
                    <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 text-lg">{attendanceData.counts.late}</Badge>
                  </div>
                </div>
                
                {attendances.length > 0 && (attendanceData.counts.absent > 0 || attendanceData.counts.late > 0) ? (
                  <div className="h-[250px] w-full mt-4">
                    <Bar 
                      data={attendanceTimeData} 
                      options={{ 
                        maintainAspectRatio: false,
                        plugins: { 
                          legend: { position: 'bottom' },
                          tooltip: {
                            callbacks: {
                              title: (context) => context[0].label,
                              label: (context) => context.raw === 1 ? (context.dataset.label as string) : ""
                            }
                          }
                        },
                        scales: {
                          y: { display: false, max: 1.2 }, // Hide Y axis, just show the bar
                          x: { 
                            ticks: { 
                              maxRotation: 45, 
                              minRotation: 45,
                              font: { size: 10 }
                            } 
                          }
                        }
                      }} 
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-muted-foreground bg-emerald-50 dark:bg-emerald-950/20 w-full rounded-lg border border-dashed border-emerald-200 dark:border-emerald-900">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2 opacity-50" />
                    <p>Asistencia Perfecta</p>
                    <p className="text-xs">No hay inasistencias ni retardos registrados.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="flex-1 flex flex-col border shadow-sm">
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-sm font-semibold">Historial de Faltas y Retardos</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <div className="h-[250px] w-full overflow-auto scrollbar-thin">
                  {sortedAttendances.filter(a => a.status !== "PRESENT").length > 0 ? (
                    <Table className="min-w-[400px]">
                      <TableHeader className="bg-muted/50 sticky top-0">
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedAttendances.filter(a => a.status !== "PRESENT").map((att, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                {format(new Date(att.date), "PPP p", { locale: es })}
                              </div>
                            </TableCell>
                            <TableCell>
                              {att.status === "ABSENT" ? (
                                <Badge variant="destructive">Ausente</Badge>
                              ) : (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Llegada Tarde</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm">
                      No hay registros históricos.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Remarks */}
          <div className="flex flex-col gap-6">
            {/* Charts */}
            <Card className="shrink-0 border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Resumen de Observaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center gap-6 justify-center p-4">
                {remarks.length > 0 ? (
                  <>
                    <div className="h-[200px] w-full sm:w-1/2">
                      <Pie 
                        data={remarksData} 
                        options={{ 
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'bottom' } },
                        }} 
                      />
                    </div>
                    <div className="flex flex-col gap-4 w-full sm:w-1/2">
                      <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-100 dark:border-orange-900 flex items-center justify-between">
                        <span className="font-medium text-orange-700 dark:text-orange-400">Llamados Atenc.</span>
                        <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 text-lg">{remarksData.counts.attention}</Badge>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900 flex items-center justify-between">
                        <span className="font-medium text-blue-700 dark:text-blue-400">Felicitaciones</span>
                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-lg">{remarksData.counts.commendation}</Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-muted-foreground bg-slate-100 dark:bg-slate-900/50 w-full rounded-lg border border-dashed">
                    <Award className="w-12 h-12 text-slate-400 mb-2 opacity-50" />
                    <p>Sin Observaciones</p>
                    <p className="text-xs">No hay llamados de atención ni felicitaciones.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="flex-1 flex flex-col border shadow-sm">
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-sm font-semibold">Historial de Observaciones</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <div className="h-[250px] w-full overflow-auto scrollbar-thin">
                  {sortedRemarks.length > 0 ? (
                    <Table className="min-w-[480px]">
                      <TableHeader className="bg-muted/50 sticky top-0">
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead className="text-center">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedRemarks.map((rem, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-xs">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                {format(new Date(rem.date), "PPP p", { locale: es })}
                              </div>
                            </TableCell>
                            <TableCell>
                               {rem.type === "ATTENTION" ? (
                                 <Badge className="bg-red-500 hover:bg-red-600 text-white text-[10px]">Llamado de Atención</Badge>
                               ) : rem.type === "COMMENDATION" ? (
                                 <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px]">Felicitación</Badge>
                               ) : rem.type === "CITATION" ? (
                                 <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-[10px]">Citación</Badge>
                               ) : (
                                 <Badge className="bg-gray-500 hover:bg-gray-600 text-white text-[10px]">Otra</Badge>
                               )}
                            </TableCell>
                            <TableCell className="font-semibold text-xs max-w-[150px] truncate" title={rem.title}>
                              {rem.title}
                            </TableCell>
                            <TableCell className="text-center">
                              {rem.viewedAt ? (
                                <Badge variant="outline" className="text-[10px] gap-0.5 text-emerald-700 border-emerald-200 bg-emerald-50" title={`Visto el ${format(new Date(rem.viewedAt), "dd/MM/yyyy HH:mm")}`}>
                                  <Eye className="w-3 h-3" /> Visto
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] gap-0.5 text-amber-700 border-amber-200 bg-amber-50">
                                  <EyeOff className="w-3 h-3" /> No visto
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm">
                      No hay registros históricos.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
