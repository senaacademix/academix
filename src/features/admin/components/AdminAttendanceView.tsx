"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { LayoutList, History, FileSpreadsheet, FileText, FileDown, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getGroupAttendanceHistory } from "@/features/teacher/actions/groupActions";
import { formatName } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Student {
    id: string;
    name: string;
    image?: string | null;
    profile?: {
        identificacion?: string | null;
        nombres?: string | null;
        apellido?: string | null;
    } | null;
}

interface Course {
    id: string;
    title: string;
}

interface Group {
    id: string;
    name: string;
    students: Student[];
    courses?: Course[];
}

interface Props {
    group: Group;
}

type AttView = "matrix" | "history";

export function AdminAttendanceView({ group }: Props) {
    const [view, setView] = useState<AttView>("matrix");
    const [courseId, setCourseId] = useState<string>("");
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Load history when group changes
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await getGroupAttendanceHistory(group.id);
                setAttendanceHistory(res ?? []);
            } catch {
                toast.error("Error al cargar el historial de asistencia");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [group.id]);

    const courses = group.courses ?? [];

    // ── DATA BUILDERS ──────────────────────────────────────────────────────────
    const getMatrixData = () => {
        const history = courseId
            ? attendanceHistory.filter((r) => r.courseId === courseId)
            : attendanceHistory;
        const allDates = [...new Set(history.map((r: any) => r.date as string))].sort();
        const students = group.students;

        const rows = students.map((s) => {
            const row: Record<string, string> = {
                Estudiante: formatName(s.name, s.profile),
                Identificación: s.profile?.identificacion || "—",
            };
            for (const date of allDates) {
                const rec = history.find((r: any) => r.userId === s.id && r.date === date);
                row[date] = rec
                    ? rec.status === "ABSENT"
                        ? "F"
                        : rec.status === "LATE"
                        ? "T"
                        : "P"
                    : "P";
            }
            return row;
        });
        return { rows, allDates, students };
    };

    const getHistoryData = () => {
        const history = (
            courseId
                ? attendanceHistory.filter((r) => r.courseId === courseId)
                : attendanceHistory
        ).filter((r: any) => r.status !== "PRESENT");

        const rows: Record<string, string>[] = [];
        for (const s of group.students) {
            const recs = history.filter((r: any) => r.userId === s.id);
            if (recs.length === 0) continue;
            for (const rec of recs) {
                rows.push({
                    Estudiante: formatName(s.name, s.profile),
                    Identificación: s.profile?.identificacion || "—",
                    Fecha: rec.date ?? "",
                    Tipo: rec.status === "ABSENT" ? "Falta" : "Llegada Tarde",
                    Hora: rec.arrivalTime ?? "—",
                    Justificación: rec.justification ?? "Sin justificación",
                });
            }
        }
        return rows;
    };

    // ── EXPORTS ───────────────────────────────────────────────────────────────
    const exportMatrixToExcel = () => {
        const data = getMatrixData();
        if (data.allDates.length === 0) return toast.error("No hay datos para exportar");
        const ws = XLSX.utils.json_to_sheet(data.rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Planilla");
        XLSX.writeFile(wb, `Planilla_${group.name}.xlsx`);
        toast.success("Planilla exportada a Excel");
    };

    const exportMatrixToPDF = () => {
        const data = getMatrixData();
        if (data.allDates.length === 0) return toast.error("No hay datos para exportar");

        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(14);
        doc.text(`Planilla de Asistencia – ${group.name}`, 14, 15);
        doc.setFontSize(9);
        doc.text("F=Falta  T=Tarde  P=Presente", 14, 21);

        autoTable(doc, {
            head: [["Estudiante", "ID", ...data.allDates]],
            body: data.rows.map((row: Record<string, string>) => [
                row["Estudiante"],
                row["Identificación"],
                ...data.allDates.map((d) => row[d] ?? "P"),
            ]),
            startY: 26,
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [30, 100, 200], textColor: 255, fontStyle: "bold" },
            columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 22 } },
        });

        doc.save(`Planilla_${group.name}.pdf`);
        toast.success("Planilla exportada a PDF");
    };

    const exportHistoryToExcel = () => {
        const rows = getHistoryData();
        if (rows.length === 0) return toast.error("No hay registros de novedades");
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Historial");
        XLSX.writeFile(wb, `Historial_${group.name}.xlsx`);
        toast.success("Historial exportado a Excel");
    };

    const exportHistoryToPDF = () => {
        const rows = getHistoryData();
        if (rows.length === 0) return toast.error("No hay registros de novedades");

        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(14);
        doc.text(`Historial de Asistencia – ${group.name}`, 14, 15);

        autoTable(doc, {
            head: [["Estudiante", "Identificación", "Fecha", "Tipo", "Hora", "Justificación"]],
            body: rows.map((r) => [r["Estudiante"], r["Identificación"], r["Fecha"], r["Tipo"], r["Hora"], r["Justificación"]]),
            startY: 22,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [30, 100, 200], textColor: 255, fontStyle: "bold" },
            columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 28 }, 5: { cellWidth: 60 } },
        });

        doc.save(`Historial_${group.name}.pdf`);
        toast.success("Historial exportado a PDF");
    };

    // ── RENDER ─────────────────────────────────────────────────────────────────
    const matrixData = getMatrixData();
    const historyRows = getHistoryData();

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Course selector */}
                {courses.length > 0 && (
                    <Select value={courseId || "all"} onValueChange={(v) => setCourseId(v === "all" ? "" : v)}>
                        <SelectTrigger className="h-9 w-[200px] text-xs font-semibold rounded-lg">
                            <SelectValue placeholder="Todas las materias" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las materias</SelectItem>
                            {courses.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="font-semibold">
                                    {c.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* View pill */}
                <div className="flex items-center p-0.5 bg-muted/60 rounded-lg gap-0.5">
                    {(
                        [
                            { v: "matrix" as const, icon: <LayoutList className="w-3.5 h-3.5" />, label: "Planilla" },
                            { v: "history" as const, icon: <History className="w-3.5 h-3.5" />, label: "Historial" },
                        ] as const
                    ).map(({ v, icon, label }) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-bold transition-all ${
                                view === v
                                    ? "bg-background shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {icon}
                            <span>{label}</span>
                        </button>
                    ))}
                </div>

                {/* Export */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-9 px-3 rounded-lg font-bold text-sm gap-1.5">
                            <FileDown className="w-3.5 h-3.5" />
                            Exportar
                            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                            onClick={() => view === "matrix" ? exportMatrixToExcel() : exportHistoryToExcel()}
                            className="gap-2 cursor-pointer"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <span>Exportar a Excel</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => view === "matrix" ? exportMatrixToPDF() : exportHistoryToPDF()}
                            className="gap-2 cursor-pointer"
                        >
                            <FileText className="w-4 h-4 text-red-600" />
                            <span>Exportar a PDF</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                    Cargando historial…
                </div>
            ) : view === "matrix" ? (
                /* ── PLANILLA ── */
                <div className="rounded-xl border bg-card shadow-sm overflow-auto">
                    {matrixData.allDates.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground text-sm">
                            No hay registros de asistencia para este grupo/materia.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/20 sticky top-0">
                                <TableRow>
                                    <TableHead className="pl-4 min-w-[180px]">Estudiante</TableHead>
                                    <TableHead className="w-[120px]">Identificación</TableHead>
                                    {matrixData.allDates.map((d) => (
                                        <TableHead key={d} className="text-center w-[80px] text-[11px]">
                                            {format(new Date(d + "T00:00:00"), "dd/MM")}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {group.students.map((s) => {
                                    const row = matrixData.rows.find((r) => r["Estudiante"] === formatName(s.name, s.profile));
                                    return (
                                        <TableRow key={s.id} className="hover:bg-muted/10">
                                            <TableCell className="pl-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="w-7 h-7 border">
                                                        <AvatarImage src={s.image ?? undefined} />
                                                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                                            {s.name?.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs font-semibold truncate max-w-[200px]">
                                                        {formatName(s.name, s.profile)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-muted-foreground">
                                                {s.profile?.identificacion || "—"}
                                            </TableCell>
                                            {matrixData.allDates.map((d) => {
                                                const val = row?.[d] ?? "P";
                                                return (
                                                    <TableCell key={d} className="text-center py-2.5">
                                                        <span
                                                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black ${
                                                                val === "F"
                                                                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                                                    : val === "T"
                                                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                            }`}
                                                        >
                                                            {val}
                                                        </span>
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            ) : (
                /* ── HISTORIAL ── */
                <div className="space-y-3">
                    {historyRows.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
                            No hay registros de inasistencias o tardanzas para este grupo/materia.
                        </div>
                    ) : (
                        (() => {
                            // Group by student
                            const byStudent: Record<string, { student: Student; records: Record<string, string>[] }> = {};
                            for (const row of historyRows) {
                                const student = group.students.find((s) => formatName(s.name, s.profile) === row["Estudiante"]);
                                if (!student) continue;
                                if (!byStudent[student.id]) byStudent[student.id] = { student, records: [] };
                                byStudent[student.id].records.push(row);
                            }
                            const sorted = Object.values(byStudent).sort((a, b) => b.records.length - a.records.length);

                            return sorted.map(({ student, records }) => {
                                const absentes = records.filter((r) => r["Tipo"] === "Falta").length;
                                const tardanzas = records.filter((r) => r["Tipo"] === "Llegada Tarde").length;
                                return (
                                    <div key={student.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                        {/* Student header */}
                                        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/20 border-b">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-8 h-8 border">
                                                    <AvatarImage src={student.image ?? undefined} />
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                        {student.name?.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-bold">{formatName(student.name, student.profile)}</p>
                                                    <p className="text-[11px] text-muted-foreground font-mono">
                                                        ID: {student.profile?.identificacion || "—"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                {absentes > 0 && (
                                                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20 font-bold text-xs">
                                                        {absentes} {absentes === 1 ? "Falta" : "Faltas"}
                                                    </Badge>
                                                )}
                                                {tardanzas > 0 && (
                                                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 font-bold text-xs">
                                                        {tardanzas} {tardanzas === 1 ? "Tardanza" : "Tardanzas"}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {/* Records table */}
                                        <Table>
                                            <TableHeader className="bg-muted/10">
                                                <TableRow>
                                                    <TableHead className="pl-4 text-xs py-2">Fecha</TableHead>
                                                    <TableHead className="text-xs py-2">Tipo</TableHead>
                                                    <TableHead className="text-xs py-2">Hora</TableHead>
                                                    <TableHead className="text-xs py-2">Justificación</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {records.map((rec, i) => (
                                                    <TableRow key={i} className="hover:bg-muted/5">
                                                        <TableCell className="pl-4 py-2.5 text-xs font-mono">
                                                            {rec["Fecha"]}
                                                        </TableCell>
                                                        <TableCell className="py-2.5">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[11px] font-bold ${
                                                                    rec["Tipo"] === "Falta"
                                                                        ? "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20"
                                                                        : "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                                                                }`}
                                                            >
                                                                {rec["Tipo"]}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="py-2.5 text-xs font-mono">
                                                            {rec["Hora"] === "—" ? (
                                                                <span className="text-muted-foreground">Día completo</span>
                                                            ) : (
                                                                <span className="bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-semibold">
                                                                    {rec["Hora"]} hs
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2.5 text-xs max-w-xs">
                                                            {rec["Justificación"] === "Sin justificación" ? (
                                                                <span className="italic text-muted-foreground">Sin justificación</span>
                                                            ) : rec["Justificación"].startsWith("http") ? (
                                                                <a
                                                                    href={rec["Justificación"]}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-primary underline font-semibold"
                                                                >
                                                                    Ver soporte
                                                                </a>
                                                            ) : (
                                                                rec["Justificación"]
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                );
                            });
                        })()
                    )}
                </div>
            )}
        </div>
    );
}
