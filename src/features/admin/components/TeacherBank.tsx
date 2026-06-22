"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


import { useState, useTransition, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Search, Plus, Trash2, Edit, GraduationCap, Upload, FileSpreadsheet, Users,
    BookOpen, Clock, CalendarDays, Eye, Filter, KeyRound, BarChart,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { deleteUserAction } from "@/app/admin-actions";
import {
    registerTeacherManualAction,
    registerTeachersBulkAction,
    updateTeacherAction,
    resetTeacherPasswordToDocAction,
} from "@/features/admin/actions/academicActions";
import {
    getTeacherAvailabilityForAdminAction,
    unlockTeacherAvailabilityAction,
    adminSaveTeacherAvailabilityAction,
    adminLockTeacherAvailabilityAction
} from "@/features/schedule/actions/availabilityActions";
import {
    getTeacherQualificationsAction,
    unlockTeacherQualificationsAction,
    adminSaveTeacherQualificationsAction,
    adminLockTeacherQualificationsAction
} from "@/features/teacher/actions/qualificationActions";
import { TeacherCoverageReport } from "./TeacherCoverageReport";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgramSimple {
    id: string;
    name: string;
}

interface CourseSchedule {
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
}

interface CourseSimple {
    id: string;
    title: string;
    schedules: CourseSchedule[];
    group?: { id: string; name: string } | null;
    period?: {
        id: string;
        name: string;
        program?: { id: string; name: string } | null;
    } | null;
}

interface AvailabilitySlot {
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
}

interface Teacher {
    id: string;
    name: string | null;
    email: string;
    createdAt: Date;
    profile?: {
        identificacion: string | null;
        nombres: string | null;
        apellido: string | null;
        telefono: string | null;
    } | null;
    programs?: ProgramSimple[];
    availabilityLocked?: boolean;
    qualifiedCoursesLocked?: boolean;
    qualifiedCourses?: CourseSimple[];
    coursesTaught?: CourseSimple[];
    availabilities?: AvailabilitySlot[];
}

interface TeacherBankProps {
    initialTeachers: Teacher[];
    totalCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_LABELS: Record<string, string> = {
    MONDAY: "Lun", TUESDAY: "Mar", WEDNESDAY: "Mié",
    THURSDAY: "Jue", FRIDAY: "Vie", SATURDAY: "Sáb", SUNDAY: "Dom",
};
const DAY_LABELS_FULL: Record<string, string> = {
    MONDAY: "Lunes", TUESDAY: "Martes", WEDNESDAY: "Miércoles",
    THURSDAY: "Jueves", FRIDAY: "Viernes", SATURDAY: "Sábado", SUNDAY: "Domingo",
};
const COURSE_COLORS = [
    "bg-primary/20 text-primary border-primary/30",
    "bg-primary/10 text-primary border-primary/20",
    "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700",
    "bg--100 dark:bg--900/30 dark:bg-emerald-900/40 text--700 dark:text--300 dark:text-emerald-300 border--200 dark:border--800/50 dark:border-emerald-700",
    "bg--100 dark:bg--900/30 dark:bg-amber-900/40 text--700 dark:text--300 dark:text-amber-300 border--200 dark:border--800/50 dark:border-amber-700",
    "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700",
    "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700",
];

function to12h(t: string) {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ap = h >= 12 ? "p.m." : "a.m.";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeacherBank({ initialTeachers, totalCount }: TeacherBankProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProgramId, setSelectedProgramId] = useState<string>("all");

    // Dialogs
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);

    // Form (Create)
    const [manualDoc, setManualDoc] = useState("");
    const [manualNames, setManualNames] = useState("");
    const [manualLastName, setManualLastName] = useState("");
    const [manualEmail, setManualEmail] = useState("");
    const [manualPhone, setManualPhone] = useState("");

    // Form (Edit)
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [editDoc, setEditDoc] = useState("");
    const [editNames, setEditNames] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editPhone, setEditPhone] = useState("");

    // Excel
    const [excelFileName, setExcelFileName] = useState("");
    const [excelTeachers, setExcelTeachers] = useState<any[]>([]);
    const [importResult, setImportResult] = useState<any>(null);

    // Qualifications State
    const [qualDialogOpen, setQualDialogOpen] = useState(false);
    const [qualTeacher, setQualTeacher] = useState<Teacher | null>(null);
    const [qualPrograms, setQualPrograms] = useState<any[]>([]);
    const [selectedQualCourses, setSelectedQualCourses] = useState<string[]>([]);
    const [qualLocked, setQualLocked] = useState(false);
    const [isQualLoading, setIsQualLoading] = useState(false);
    const [qualLastModifiedBy, setQualLastModifiedBy] = useState<{name: string, role: string | null} | null>(null);
    const [qualUpdatedAt, setQualUpdatedAt] = useState<Date | null>(null);

    // Delete
    const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

    // Reset Password
    const [teacherToReset, setTeacherToReset] = useState<Teacher | null>(null);
    const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);

    // Availability
    const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
    const [availabilityTeacher, setAvailabilityTeacher] = useState<Teacher | null>(null);
    const [availabilityLocked, setAvailabilityLocked] = useState(false);
    const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
    const [newAvailDay, setNewAvailDay] = useState<string>("MONDAY");
    const [newAvailStart, setNewAvailStart] = useState<string>("08:00");
    const [newAvailEnd, setNewAvailEnd] = useState<string>("10:00");
    const [availabilityLastModifiedBy, setAvailabilityLastModifiedBy] = useState<{name: string, role: string | null} | null>(null);
    const [availabilityUpdatedAt, setAvailabilityUpdatedAt] = useState<Date | null>(null);

    // ── Derived: all unique programs ──────────────────────────────────────────
    const allPrograms = useMemo(() => {
        const map = new Map<string, string>();
        initialTeachers.forEach((t) => {
            (t.programs ?? []).forEach((p) => map.set(p.id, p.name));
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [initialTeachers]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const formatTeacherName = (teacher: Teacher) => {
        if (teacher.profile?.nombres) {
            return `${teacher.profile.nombres} ${teacher.profile.apellido || ""}`.trim();
        }
        return teacher.name || "Sin nombre";
    };

    const getInitials = (teacher: Teacher) => {
        const name = formatTeacherName(teacher);
        return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
    };

    const getAllCourses = (teacher: Teacher): CourseSimple[] => {
        const map = new Map<string, CourseSimple>();
        [...(teacher.qualifiedCourses ?? []), ...(teacher.coursesTaught ?? [])].forEach((c) => {
            if (!map.has(c.id)) map.set(c.id, c);
        });
        return Array.from(map.values());
    };

    // ── Filter ────────────────────────────────────────────────────────────────

    const filteredTeachers = useMemo(() => {
        return initialTeachers.filter((teacher) => {
            // text search
            const fullName = formatTeacherName(teacher).toLowerCase();
            const email = teacher.email.toLowerCase();
            const doc = teacher.profile?.identificacion?.toLowerCase() || "";
            const q = searchQuery.toLowerCase();
            const matchSearch = fullName.includes(q) || email.includes(q) || doc.includes(q);

            // program filter
            const matchProgram =
                selectedProgramId === "all" ||
                (teacher.programs ?? []).some((p) => p.id === selectedProgramId);

            return matchSearch && matchProgram;
        });
    }, [initialTeachers, searchQuery, selectedProgramId]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleCreateManual = () => {
        if (!manualDoc || !manualNames || !manualLastName || !manualEmail) {
            toast.error("Por favor completa todos los campos obligatorios");
            return;
        }
        startTransition(async () => {
            try {
                await registerTeacherManualAction({
                    identificacion: manualDoc, nombres: manualNames,
                    apellido: manualLastName, email: manualEmail,
                    telefono: manualPhone || undefined,
                });
                toast.success("Profesor registrado exitosamente");
                setManualDoc(""); setManualNames(""); setManualLastName("");
                setManualEmail(""); setManualPhone("");
                setCreateDialogOpen(false);
                router.refresh();
            } catch (error: any) { toast.error(error.message || "Error al registrar profesor"); }
        });
    };

    const handleOpenEdit = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setEditDoc(teacher.profile?.identificacion || "");
        setEditNames(teacher.profile?.nombres || teacher.name || "");
        setEditLastName(teacher.profile?.apellido || "");
        setEditEmail(teacher.email || "");
        setEditPhone(teacher.profile?.telefono || "");
        setEditDialogOpen(true);
    };

    const handleEditSave = () => {
        if (!selectedTeacher) return;
        if (!editDoc || !editNames || !editLastName || !editEmail) {
            toast.error("Por favor completa todos los campos obligatorios");
            return;
        }
        startTransition(async () => {
            try {
                await updateTeacherAction({
                    id: selectedTeacher.id, identificacion: editDoc,
                    nombres: editNames, apellido: editLastName,
                    email: editEmail, telefono: editPhone || undefined,
                });
                toast.success("Información del profesor actualizada");
                setEditDialogOpen(false); setSelectedTeacher(null);
                router.refresh();
            } catch (error: any) { toast.error(error.message || "Error al actualizar profesor"); }
        });
    };

    const handleOpenDetail = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setDetailDialogOpen(true);
    };

    const handleOpenResetPassword = (teacher: Teacher) => {
        setTeacherToReset(teacher);
        setResetPasswordDialogOpen(true);
    };

    const handleResetPasswordConfirm = () => {
        if (!teacherToReset) return;
        startTransition(async () => {
            try {
                await resetTeacherPasswordToDocAction(teacherToReset.id);
                toast.success("Contraseña restablecida exitosamente");
                setResetPasswordDialogOpen(false); setTeacherToReset(null);
                router.refresh();
            } catch (error: any) { toast.error(error.message || "Error al restablecer contraseña"); }
        });
    };

    const handleOpenDelete = (teacher: Teacher) => {
        setTeacherToDelete(teacher);
        setDeleteDialogOpen(true);
    };

    const handleOpenAvailability = (teacher: Teacher) => {
        setAvailabilityTeacher(teacher);
        startTransition(async () => {
            try {
                const res = await getTeacherAvailabilityForAdminAction(teacher.id);
                setAvailabilityLocked(res.locked);
                setAvailabilitySlots(res.slots.map(s => ({
                    id: s.id,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime
                })));
                setAvailabilityLastModifiedBy(res.lastModifiedBy);
                setAvailabilityUpdatedAt(res.updatedAt ? new Date(res.updatedAt) : null);
                setAvailabilityDialogOpen(true);
            } catch (error: any) {
                toast.error("Error al cargar disponibilidad: " + error.message);
            }
        });
    };

    const handleUnlockAvailability = () => {
        if (!availabilityTeacher) return;
        startTransition(async () => {
            try {
                await unlockTeacherAvailabilityAction(availabilityTeacher.id);
                setAvailabilityLocked(false);
                toast.success("Disponibilidad desbloqueada. El docente ahora puede editarla.");
            } catch (e: any) {
                toast.error(e.message || "Error al desbloquear disponibilidad");
            }
        });
    };

    const handleLockAvailability = () => {
        if (!availabilityTeacher) return;
        startTransition(async () => {
            try {
                await adminLockTeacherAvailabilityAction(availabilityTeacher.id);
                setAvailabilityLocked(true);
                toast.success("Disponibilidad publicada/aprobada exitosamente.");
            } catch (e: any) {
                toast.error(e.message || "Error al publicar disponibilidad");
            }
        });
    };

    const handleAddAvailabilitySlot = () => {
        if (newAvailStart >= newAvailEnd) {
            toast.error("La hora de inicio debe ser menor a la hora de fin");
            return;
        }
        const newSlot = {
            id: `temp-${Date.now()}`,
            dayOfWeek: newAvailDay,
            startTime: newAvailStart,
            endTime: newAvailEnd
        };
        setAvailabilitySlots([...availabilitySlots, newSlot]);
    };

    const handleRemoveAvailabilitySlot = (id: string) => {
        setAvailabilitySlots(availabilitySlots.filter(s => s.id !== id));
    };

    const handleSaveAvailability = () => {
        if (!availabilityTeacher) return;
        startTransition(async () => {
            try {
                await adminSaveTeacherAvailabilityAction(
                    availabilityTeacher.id,
                    availabilitySlots.map(s => ({ dayOfWeek: s.dayOfWeek as any, startTime: s.startTime, endTime: s.endTime }))
                );
                setAvailabilityDialogOpen(false);
                toast.success("Disponibilidad guardada correctamente");
                router.refresh();
            } catch (error: any) {
                toast.error("Error: " + error.message);
            }
        });
    };

    const handleOpenQual = (teacher: Teacher) => {
        setQualTeacher(teacher);
        setQualDialogOpen(true);
        setIsQualLoading(true);
        startTransition(async () => {
            try {
                const data = await getTeacherQualificationsAction(teacher.id);
                setQualPrograms((data as any).programs || []);
                setSelectedQualCourses(((data as any).qualifiedCourses || []).map((c: any) => c.id));
                setQualLocked((data as any).locked || false);
                setQualLastModifiedBy((data as any).lastModifiedBy || null);
                setQualUpdatedAt((data as any).updatedAt ? new Date((data as any).updatedAt) : null);
            } catch (e: any) {
                toast.error(e.message || "Error al cargar materias");
                setQualDialogOpen(false);
            } finally {
                setIsQualLoading(false);
            }
        });
    };

    const handleUnlockQual = () => {
        if (!qualTeacher) return;
        startTransition(async () => {
            try {
                await unlockTeacherQualificationsAction(qualTeacher.id);
                setQualLocked(false);
                toast.success("Materias desbloqueadas. El docente ahora puede editarlas.");
                router.refresh();
            } catch (e: any) {
                toast.error(e.message || "Error al desbloquear materias");
            }
        });
    };

    const handleLockQual = () => {
        if (!qualTeacher) return;
        startTransition(async () => {
            try {
                await adminLockTeacherQualificationsAction(qualTeacher.id);
                setQualLocked(true);
                toast.success("Materias publicadas/aprobadas exitosamente.");
                router.refresh();
            } catch (e: any) {
                toast.error(e.message || "Error al publicar materias");
            }
        });
    };

    const handleSaveQual = () => {
        if (!qualTeacher) return;
        startTransition(async () => {
            try {
                await adminSaveTeacherQualificationsAction(qualTeacher.id, selectedQualCourses);
                setQualDialogOpen(false);
                toast.success("Materias guardadas y bloqueadas");
                router.refresh();
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    const handleDeleteConfirm = () => {
        if (!teacherToDelete) return;
        startTransition(async () => {
            try {
                await deleteUserAction(teacherToDelete.id);
                toast.success("Profesor eliminado exitosamente");
                setDeleteDialogOpen(false); setTeacherToDelete(null);
                router.refresh();
            } catch (error: any) { toast.error(error.message || "Error al eliminar profesor"); }
        });
    };

    const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setExcelFileName(file.name); setImportResult(null);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                if (jsonData.length <= 1) { toast.error("El archivo está vacío o no contiene datos"); return; }
                const headers: string[] = ((jsonData[0] as any[]) || []).map((v) => v ? v.toString().trim().toLowerCase() : "");
                const getIndex = (aliases: string[]) => {
                    const exact = headers.findIndex((h) => h && aliases.includes(h));
                    return exact !== -1 ? exact : headers.findIndex((h) => h && aliases.some((a) => h.includes(a)));
                };
                const numDocIdx = getIndex(["identificacion","identificación","número de documento","numero de documento","documento","cedula","tarjeta","nro doc"]);
                const nombreIdx = getIndex(["nombre","nombres","primer nombre"]);
                const apellidoIdx = getIndex(["apellido","apellidos"]);
                const emailIdx = getIndex(["email","mail","correo electrónico","correo electronico","correo"]);
                const telefonoIdx = getIndex(["teléfono","telefono","tel","celular","movil","cel"]);
                if (numDocIdx === -1) { toast.error("No se encontró la columna 'Identificacion'"); return; }
                if (emailIdx === -1) { toast.error("No se encontró la columna 'Email'"); return; }
                const parsedList: any[] = [];
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;
                    const identificacion = row[numDocIdx]?.toString().trim();
                    if (!identificacion) continue;
                    parsedList.push({
                        identificacion,
                        nombres: nombreIdx !== -1 && row[nombreIdx] ? row[nombreIdx].toString().trim() : "Profesor",
                        apellido: apellidoIdx !== -1 && row[apellidoIdx] ? row[apellidoIdx].toString().trim() : "",
                        email: emailIdx !== -1 && row[emailIdx] ? row[emailIdx].toString().trim() : "",
                        telefono: telefonoIdx !== -1 && row[telefonoIdx] ? row[telefonoIdx].toString().trim() : "",
                    });
                }
                if (parsedList.length === 0) toast.error("No se encontraron registros válidos");
                else { setExcelTeachers(parsedList); toast.success(`Se leyeron ${parsedList.length} profesores.`); }
            } catch (err: any) { toast.error("Error al procesar el archivo: " + err.message); }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImportExcel = () => {
        if (excelTeachers.length === 0) return;
        startTransition(async () => {
            try {
                const res = await registerTeachersBulkAction(undefined, excelTeachers);
                setImportResult(res); setExcelTeachers([]); setExcelFileName("");
                toast.success(`Importación finalizada. Registrados: ${res.successCount}`);
                router.refresh();
            } catch (error: any) { toast.error(error.message || "Error durante la importación masiva"); }
        });
    };

    const closeImportDialog = () => {
        setImportDialogOpen(false); setExcelFileName("");
        setExcelTeachers([]); setImportResult(null);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Banco de Profesores</h2>
                    <p className="text-muted-foreground">Administra el directorio de docentes de la institución.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-sm px-3 py-1 bg-background shadow-sm border-muted-foreground/20">
                        <Users className="mr-2 h-3.5 w-3.5 text-primary" />
                        {totalCount} Docentes Totales
                    </Badge>
                    <Button onClick={() => setReportDialogOpen(true)} variant="outline" className="shadow-sm border--200 dark:border--800/50 text--700 dark:text--300 hover:bg--50 dark:bg--950/20">
                        <BarChart className="mr-2 h-4 w-4" />
                        Reporte Cobertura
                    </Button>
                    <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="shadow-sm">
                        <Upload className="mr-2 h-4 w-4 text--600 dark:text--400" />
                        Importar Excel
                    </Button>
                    <Button onClick={() => setCreateDialogOpen(true)} className="shadow-sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Profesor
                    </Button>
                </div>
            </div>

            {/* Filters bar */}
            <Card className="border-none shadow-sm bg-card/60 backdrop-blur">
                <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        {/* Search */}
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="teacher-search"
                                placeholder="Buscar por nombre, email o identificación..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-10 border-muted-foreground/10 bg-background/50"
                            />
                        </div>

                        {/* Program filter */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                                <SelectTrigger
                                    id="teacher-program-filter"
                                    className="h-10 min-w-[220px] border-muted-foreground/10 bg-background/50"
                                    suppressHydrationWarning
                                >
                                    <SelectValue placeholder="Filtrar por programa" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        <span className="flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                            Todos los programas
                                        </span>
                                    </SelectItem>
                                    {allPrograms.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedProgramId !== "all" && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setSelectedProgramId("all")}
                                >
                                    ×
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Active filter badge */}
                    {selectedProgramId !== "all" && (
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Filtrando por:</span>
                            <Badge
                                variant="secondary"
                                className="text-xs bg-primary/10 text-primary border-primary/20"
                            >
                                {allPrograms.find((p) => p.id === selectedProgramId)?.name}
                            </Badge>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-none shadow-sm bg-card">
                <CardHeader className="pb-0">
                    <CardTitle className="text-lg">
                        Directorio de Docentes ({filteredTeachers.length})
                    </CardTitle>
                    <CardDescription>
                        {selectedProgramId === "all"
                            ? "Lista global de profesores registrados y sus programas, materias y disponibilidad."
                            : `Docentes del programa: ${allPrograms.find((p) => p.id === selectedProgramId)?.name}`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0 mt-2">
                    <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/10">
                                <TableRow>
                                    <TableHead className="py-3.5 pl-4 text-xs font-semibold">Identificación</TableHead>
                                    <TableHead className="py-3.5 text-xs font-semibold">Nombre Completo</TableHead>
                                    <TableHead className="py-3.5 text-xs font-semibold">Correo Electrónico</TableHead>
                                    <TableHead className="py-3.5 text-xs font-semibold">Teléfono</TableHead>
                                    <TableHead className="py-3.5 text-xs font-semibold">Programas</TableHead>
                                    <TableHead className="py-3.5 text-xs font-semibold">
                                        <span className="flex items-center gap-1">
                                            <BookOpen className="w-3.5 h-3.5" />
                                            Materias
                                        </span>
                                    </TableHead>
                                    <TableHead className="py-3.5 text-xs font-semibold">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            Disponibilidad
                                        </span>
                                    </TableHead>
                                    <TableHead className="py-3.5 pr-4 text-xs font-semibold text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTeachers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            {searchQuery || selectedProgramId !== "all"
                                                ? "No se encontraron profesores con los filtros aplicados."
                                                : "No se encontraron profesores registrados."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTeachers.map((teacher) => {
                                        const allCourses = getAllCourses(teacher);
                                        const availDays = [...new Set((teacher.availabilities ?? []).map((a) => a.dayOfWeek))];
                                        return (
                                            <TableRow
                                                key={teacher.id}
                                                className="hover:bg-muted/5 transition-colors group"
                                            >
                                                {/* Identification */}
                                                <TableCell className="py-3 pl-4 text-xs font-medium text-foreground">
                                                    {teacher.profile?.identificacion || "—"}
                                                </TableCell>

                                                {/* Name */}
                                                <TableCell className="py-3 text-xs font-bold text-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-white text-[9px] font-bold shadow-sm">
                                                            {getInitials(teacher)}
                                                        </div>
                                                        {formatTeacherName(teacher)}
                                                    </div>
                                                </TableCell>

                                                {/* Email */}
                                                <TableCell className="py-3 text-xs text-muted-foreground font-sans">
                                                    {teacher.email}
                                                </TableCell>

                                                {/* Phone */}
                                                <TableCell className="py-3 text-xs text-muted-foreground font-sans">
                                                    {teacher.profile?.telefono || "—"}
                                                </TableCell>

                                                {/* Programs */}
                                                <TableCell className="py-3">
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {(!teacher.programs || teacher.programs.length === 0) ? (
                                                            <span className="text-[10px] text-muted-foreground italic">Sin programa</span>
                                                        ) : (
                                                            <>
                                                                {teacher.programs.slice(0, 2).map((prog) => (
                                                                    <Badge
                                                                        key={prog.id}
                                                                        variant="secondary"
                                                                        className={cn(
                                                                            "text-[9px] font-semibold border",
                                                                            selectedProgramId === prog.id
                                                                                ? "bg-primary/15 text-primary border-primary/30"
                                                                                : "bg-primary/5 hover:bg-primary/10 text-primary border-primary/10"
                                                                        )}
                                                                    >
                                                                        {prog.name}
                                                                    </Badge>
                                                                ))}
                                                                {teacher.programs.length > 2 && (
                                                                    <Badge variant="outline" className="text-[9px]">
                                                                        +{teacher.programs.length - 2}
                                                                    </Badge>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Courses/Subjects */}
                                                <TableCell className="py-3">
                                                    {allCourses.length === 0 ? (
                                                        <span className="text-[10px] text-muted-foreground italic">Sin materias</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                            {allCourses.slice(0, 2).map((c, idx) => (
                                                                <Tooltip key={c.id}><TooltipTrigger asChild><span
                                                                                                                                    
                                                                                                                                    className={cn(
                                                                                                                                        "text-[9px] font-medium px-1.5 py-0.5 rounded-full border truncate max-w-[100px]",
                                                                                                                                        COURSE_COLORS[idx % COURSE_COLORS.length]
                                                                                                                                    )}
                                                                                                                                >
                                                                                                                                    {c.title}
                                                                                                                                </span></TooltipTrigger><TooltipContent><p>{c.title}</p></TooltipContent></Tooltip>
                                                            ))}
                                                            {allCourses.length > 2 && (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border">
                                                                    +{allCourses.length - 2}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>

                                                {/* Availability */}
                                                <TableCell className="py-3">
                                                    {availDays.length === 0 ? (
                                                        <span className="text-[10px] text-muted-foreground italic">Sin disponibilidad</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1">
                                                            {DAYS_ORDER.filter((d) => availDays.includes(d)).map((d) => (
                                                                <span
                                                                    key={d}
                                                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg--100 dark:bg--900/30 dark:bg-emerald-900/30 text--700 dark:text--300 dark:text-emerald-400 border border--200 dark:border--800/50 dark:border-emerald-800"
                                                                >
                                                                    {DAY_LABELS[d]}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="py-3 pr-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Tooltip><TooltipTrigger asChild><Button
                                                                                                                    id={`btn-availability-${teacher.id}`}
                                                                                                                    variant="ghost"
                                                                                                                    size="icon"
                                                                                                                    className="h-8 w-8 text-muted-foreground hover:text--600 dark:text--400 hover:bg--50 dark:bg--950/20 dark:hover:bg-emerald-950/30"
                                                                                                                    onClick={() => handleOpenAvailability(teacher)}
                                                                                                                >
                                                                                                                    <CalendarDays className="h-4 w-4" />
                                                                                                                </Button></TooltipTrigger><TooltipContent><p>Gestionar disponibilidad</p></TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button
                                                                                                                    id={`btn-qual-${teacher.id}`}
                                                                                                                    variant="ghost"
                                                                                                                    size="icon"
                                                                                                                    className="h-8 w-8 text-muted-foreground hover:text--600 dark:text--400 hover:bg--50 dark:bg--950/20 dark:hover:bg-blue-950/30"
                                                                                                                    onClick={() => handleOpenQual(teacher)}
                                                                                                                >
                                                                                                                    <BookOpen className="h-4 w-4" />
                                                                                                                </Button></TooltipTrigger><TooltipContent><p>Gestionar Materias Habilitadas</p></TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button
                                                                                                                    id={`btn-detail-${teacher.id}`}
                                                                                                                    variant="ghost"
                                                                                                                    size="icon"
                                                                                                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                                                                                    onClick={() => handleOpenDetail(teacher)}
                                                                                                                >
                                                                                                                    <Eye className="h-4 w-4" />
                                                                                                                </Button></TooltipTrigger><TooltipContent><p>Ver detalle completo</p></TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button
                                                                                                                    id={`btn-reset-${teacher.id}`}
                                                                                                                    variant="ghost"
                                                                                                                    size="icon"
                                                                                                                    className="h-8 w-8 text-muted-foreground hover:text--600 dark:text--400 hover:bg--50 dark:bg--950/20 dark:hover:bg-amber-950/30"
                                                                                                                    onClick={() => handleOpenResetPassword(teacher)}
                                                                                                                >
                                                                                                                    <KeyRound className="h-4 w-4" />
                                                                                                                </Button></TooltipTrigger><TooltipContent><p>Restablecer contraseña a No. de Identificación</p></TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button
                                                                                                                    id={`btn-edit-${teacher.id}`}
                                                                                                                    variant="ghost"
                                                                                                                    size="icon"
                                                                                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                                                                    onClick={() => handleOpenEdit(teacher)}
                                                                                                                >
                                                                                                                    <Edit className="h-4 w-4" />
                                                                                                                </Button></TooltipTrigger><TooltipContent><p>Editar profesor</p></TooltipContent></Tooltip>
                                                        <Tooltip><TooltipTrigger asChild><Button
                                                                                                                    id={`btn-delete-${teacher.id}`}
                                                                                                                    variant="ghost"
                                                                                                                    size="icon"
                                                                                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                                                                    onClick={() => handleOpenDelete(teacher)}
                                                                                                                >
                                                                                                                    <Trash2 className="h-4 w-4" />
                                                                                                                </Button></TooltipTrigger><TooltipContent><p>Eliminar profesor</p></TooltipContent></Tooltip>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* ============ DIALOG: TEACHER DETAIL ============ */}
            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                <DialogContent className="w-screen max-w-none sm:max-w-none h-screen max-h-none top-0 left-0 translate-x-0 translate-y-0 rounded-none border-none flex flex-col p-0 overflow-hidden gap-0 bg-background">
                    <DialogTitle className="sr-only">Detalles del Profesor</DialogTitle>
                    {selectedTeacher && (
                        <TeacherDetailPanel
                            teacher={selectedTeacher}
                            formatName={formatTeacherName}
                            getInitials={getInitials}
                            getAllCourses={getAllCourses}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: COVERAGE REPORT ============ */}
            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                <DialogContent className="!max-w-[100vw] !w-screen !h-screen !m-0 !p-0 !rounded-none !border-none overflow-hidden bg-background !top-0 !left-0 !translate-x-0 !translate-y-0 flex flex-col">
                    <DialogTitle className="sr-only">Reporte de Cobertura</DialogTitle>
                    <TeacherCoverageReport teachers={initialTeachers} />
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="absolute top-4 right-4 z-50 rounded-full shadow-md bg-background/80 backdrop-blur-sm border-border" 
                        onClick={() => setReportDialogOpen(false)}
                    >
                        <span className="sr-only">Cerrar</span>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                    </Button>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: CREATE ============ */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="w-screen max-w-none sm:max-w-none h-screen max-h-none top-0 left-0 translate-x-0 translate-y-0 rounded-none border-none flex flex-col p-6 overflow-y-auto bg-background">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            Registrar Nuevo Profesor
                        </DialogTitle>
                        <DialogDescription>Completa la información básica para registrar al docente.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="mDoc">Número de Documento *</Label>
                            <Input id="mDoc" placeholder="Ej: 10245678 (será la contraseña inicial)" value={manualDoc} onChange={(e) => setManualDoc(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="mNames">Nombres *</Label>
                                <Input id="mNames" placeholder="Ej: Clara Inés" value={manualNames} onChange={(e) => setManualNames(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mLastName">Apellidos *</Label>
                                <Input id="mLastName" placeholder="Ej: Restrepo Ruiz" value={manualLastName} onChange={(e) => setManualLastName(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mEmail">Correo Electrónico *</Label>
                            <Input id="mEmail" type="email" placeholder="correo@ejemplo.com" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mPhone">Teléfono / Celular</Label>
                            <Input id="mPhone" placeholder="Ej: 3156789012" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCreateDialogOpen(false)} disabled={isPending}>Cancelar</Button>
                        <Button onClick={handleCreateManual} disabled={isPending}>{isPending ? "Registrando..." : "Registrar Profesor"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: EDIT ============ */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="w-screen max-w-none sm:max-w-none h-screen max-h-none top-0 left-0 translate-x-0 translate-y-0 rounded-none border-none flex flex-col p-6 overflow-y-auto bg-background">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5 text-primary" />
                            Editar Profesor
                        </DialogTitle>
                        <DialogDescription>Modifica la información básica del perfil del docente.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="eDoc">Número de Documento *</Label>
                            <Input id="eDoc" value={editDoc} onChange={(e) => setEditDoc(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="eNames">Nombres *</Label>
                                <Input id="eNames" value={editNames} onChange={(e) => setEditNames(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="eLastName">Apellidos *</Label>
                                <Input id="eLastName" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="eEmail">Correo Electrónico *</Label>
                            <Input id="eEmail" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ePhone">Teléfono / Celular</Label>
                            <Input id="ePhone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditDialogOpen(false)} disabled={isPending}>Cancelar</Button>
                        <Button onClick={handleEditSave} disabled={isPending}>{isPending ? "Guardando..." : "Guardar Cambios"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: EXCEL IMPORT ============ */}
            <Dialog open={importDialogOpen} onOpenChange={(open) => { if (!open) closeImportDialog(); }}>
                <DialogContent className="w-screen max-w-none sm:max-w-none h-screen max-h-none top-0 left-0 translate-x-0 translate-y-0 rounded-none border-none flex flex-col p-6 overflow-y-auto bg-background">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text--600 dark:text--400" />
                            Importar Profesores desde Excel
                        </DialogTitle>
                        <DialogDescription>Carga una lista de profesores desde un archivo compatible con Excel.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="border border-dashed border-muted/50 rounded-xl p-6 bg-muted/5 text-center relative hover:bg-muted/10 transition-colors">
                            <input type="file" accept=".xlsx, .xls" onChange={handleExcelFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isPending} />
                            <p className="text-sm font-semibold text-foreground/80">{excelFileName ? `Archivo: ${excelFileName}` : "Haz clic o arrastra un archivo Excel aquí"}</p>
                            <p className="text-xs text-muted-foreground mt-1">Formatos: .xlsx y .xls</p>
                        </div>
                        <div className="bg-muted/10 p-3 rounded-lg text-xs text-muted-foreground space-y-1">
                            <p className="font-semibold text-foreground/70">Columnas requeridas:</p>
                            <p>• <span className="font-semibold">Identificacion</span> (también contraseña inicial)</p>
                            <p>• <span className="font-semibold">Email</span> · <span className="font-semibold">Nombre</span> · <span className="font-semibold">Apellidos</span></p>
                        </div>
                        {excelTeachers.length > 0 && (
                            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex justify-between items-center">
                                <span className="text-xs font-medium text-primary">Se leyeron {excelTeachers.length} profesores.</span>
                                <Button size="sm" onClick={handleImportExcel} disabled={isPending} className="h-8 text-xs">
                                    {isPending ? "Importando..." : "Importar Ahora"}
                                </Button>
                            </div>
                        )}
                        {importResult && (
                            <div className="border border-muted/30 rounded-xl p-3 bg-muted/5 space-y-2 text-xs">
                                <p className="font-bold text-foreground/90 uppercase tracking-wider text-[10px]">Resultado:</p>
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="bg-green-500/10 border border-green-500/20 p-2 rounded text--600 dark:text--400">
                                        <span className="block font-bold text-lg">{importResult.successCount}</span>Registrados con éxito
                                    </div>
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text--600 dark:text--400">
                                        <span className="block font-bold text-lg">{importResult.skippedCount}</span>Omitidos/Duplicados
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={closeImportDialog}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: AVAILABILITY ============ */}
            <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
                <DialogContent className="w-screen max-w-none sm:max-w-none h-screen max-h-none top-0 left-0 translate-x-0 translate-y-0 rounded-none border-none flex flex-col p-6 overflow-y-auto bg-background">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text--600 dark:text--400" />
                            Gestión de Disponibilidad
                        </DialogTitle>
                        <DialogDescription>
                            Configura o desbloquea la disponibilidad horaria de este docente.
                        </DialogDescription>
                    </DialogHeader>
                    {availabilityTeacher && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border">
                                <div>
                                    <p className="text-sm font-bold">{formatTeacherName(availabilityTeacher)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Estado: {availabilityLocked ? (
                                            <span className="text--600 dark:text--400 font-semibold">Bloqueada (Publicada por docente)</span>
                                        ) : (
                                            <span className="text--600 dark:text--400 font-semibold">Desbloqueada</span>
                                        )}
                                    </p>
                                </div>
                                {availabilityLastModifiedBy && (
                                    <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md border border-border/50 max-w-[200px] text-right">
                                        Modificado por <span className="font-semibold">{availabilityLastModifiedBy.name}</span><br/>
                                        ({availabilityLastModifiedBy.role === "admin" ? "Administrador" : "Profesor"})
                                        {availabilityUpdatedAt && <div className="text-[10px] mt-0.5">{availabilityUpdatedAt.toLocaleDateString()} {availabilityUpdatedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                                    </div>
                                )}
                                <div className="flex flex-col gap-2 items-end">
                                    {availabilityLocked ? (
                                    <Button size="sm" variant="outline" className="h-8 text-xs text--600 dark:text--400 border--200 dark:border--800/50" onClick={handleUnlockAvailability} disabled={isPending}>
                                        Desbloquear
                                    </Button>
                                ) : (
                                    <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleLockAvailability} disabled={isPending}>
                                        Publicar / Aprobar
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Agregar Franja</h4>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-[10px]">Día</Label>
                                        <Select value={newAvailDay} onValueChange={setNewAvailDay}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {DAYS_ORDER.map(d => <SelectItem key={d} value={d} className="text-xs">{DAY_LABELS_FULL[d]}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-[10px]">Inicio</Label>
                                        <Input type="time" value={newAvailStart} onChange={e => setNewAvailStart(e.target.value)} className="h-8 text-xs" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-[10px]">Fin</Label>
                                        <Input type="time" value={newAvailEnd} onChange={e => setNewAvailEnd(e.target.value)} className="h-8 text-xs" />
                                    </div>
                                    <Button onClick={handleAddAvailabilitySlot} size="icon" className="h-8 w-8 shrink-0"><Plus className="w-4 h-4" /></Button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {availabilitySlots.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4 italic border border-dashed rounded-lg">No hay disponibilidad registrada</p>
                                ) : (
                                    availabilitySlots.map(slot => (
                                        <div key={slot.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50 text-xs">
                                            <span className="font-semibold">{DAY_LABELS_FULL[slot.dayOfWeek]}</span>
                                            <span>{to12h(slot.startTime)} - {to12h(slot.endTime)}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveAvailabilitySlot(slot.id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAvailabilityDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveAvailability} disabled={isPending}>{isPending ? "Guardando..." : "Guardar Disponibilidad"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: QUALIFICATIONS ============ */}
            <Dialog open={qualDialogOpen} onOpenChange={setQualDialogOpen}>
                <DialogContent className="w-screen max-w-none sm:max-w-none h-screen max-h-none top-0 left-0 translate-x-0 translate-y-0 rounded-none border-none flex flex-col p-6 overflow-y-auto bg-background">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text--600 dark:text--400" />
                            Gestión de Materias Habilitadas
                        </DialogTitle>
                        <DialogDescription>
                            Configura o desbloquea las materias que este docente puede dictar.
                        </DialogDescription>
                    </DialogHeader>
                    {qualTeacher && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border">
                                <div>
                                    <p className="text-sm font-bold">{formatTeacherName(qualTeacher)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Estado: {qualLocked ? (
                                            <span className="text--600 dark:text--400 font-semibold">Bloqueada (Publicada por docente)</span>
                                        ) : (
                                            <span className="text--600 dark:text--400 font-semibold">Desbloqueada</span>
                                        )}
                                    </p>
                                </div>
                                {qualLastModifiedBy && (
                                    <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md border border-border/50 max-w-[200px] text-right">
                                        Modificado por <span className="font-semibold">{qualLastModifiedBy.name}</span><br/>
                                        ({qualLastModifiedBy.role === "admin" ? "Administrador" : "Profesor"})
                                        {qualUpdatedAt && <div className="text-[10px] mt-0.5">{qualUpdatedAt.toLocaleDateString()} {qualUpdatedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                                    </div>
                                )}
                                <div className="flex flex-col gap-2 items-end">
                                    {qualLocked ? (
                                    <Button size="sm" variant="outline" className="h-8 text-xs text--600 dark:text--400 border--200 dark:border--800/50" onClick={handleUnlockQual} disabled={isPending}>
                                        Desbloquear
                                    </Button>
                                ) : (
                                    <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleLockQual} disabled={isPending}>
                                        Publicar / Aprobar
                                    </Button>
                                )}
                            </div>
                        </div>
                            
                        {isQualLoading ? (
                                <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">Cargando...</div>
                            ) : qualPrograms.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4 italic border border-dashed rounded-lg">No tiene programas asociados</p>
                            ) : (
                                <div className="space-y-4">
                                    {qualPrograms.map(program => (
                                        <div key={program.id} className="space-y-2 p-3 bg-muted/10 rounded-lg border border-border/30">
                                            <h4 className="font-bold text-xs text-primary uppercase tracking-wider border-b border-border/30 pb-1">{program.name}</h4>
                                            <div className="space-y-3">
                                                {program.periods.map((period: any) => (
                                                    <div key={period.id} className="space-y-1.5">
                                                        <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 p-1 rounded">{period.name}</h5>
                                                        <div className="grid grid-cols-1 gap-1.5 pl-1">
                                                            {period.courses.map((course: any) => {
                                                                const isChecked = selectedQualCourses.includes(course.id);
                                                                return (
                                                                    <div key={course.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted/30 transition-colors">
                                                                        <Checkbox
                                                                            id={`admin-qual-${course.id}`}
                                                                            checked={isChecked}
                                                                            onCheckedChange={(checked) => {
                                                                                if (checked) setSelectedQualCourses(prev => [...prev, course.id]);
                                                                                else setSelectedQualCourses(prev => prev.filter(id => id !== course.id));
                                                                            }}
                                                                            className="h-4 w-4"
                                                                        />
                                                                        <Label htmlFor={`admin-qual-${course.id}`} className="text-xs font-semibold cursor-pointer">{course.title}</Label>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setQualDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveQual} disabled={isPending}>{isPending ? "Guardando..." : "Guardar Materias"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: RESET PASSWORD ============ */}
            <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Restablecer contraseña?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción restablecerá la contraseña del profesor a su número de identificación. ¿Estás seguro de continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending} onClick={() => setTeacherToReset(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetPasswordConfirm} disabled={isPending} className="bg-amber-600 text-white hover:bg-amber-700">
                            {isPending ? "Restableciendo..." : "Restablecer Contraseña"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ============ DIALOG: DELETE ============ */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar a este profesor?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará al profesor del sistema permanentemente. Perderá todas sus asignaciones y disponibilidades.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending} onClick={() => setTeacherToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isPending ? "Eliminando..." : "Eliminar Profesor"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ─── Teacher Detail Panel ─────────────────────────────────────────────────────

function TeacherDetailPanel({
    teacher,
    formatName,
    getInitials,
    getAllCourses,
}: {
    teacher: Teacher;
    formatName: (t: Teacher) => string;
    getInitials: (t: Teacher) => string;
    getAllCourses: (t: Teacher) => CourseSimple[];
}) {
    const courses = getAllCourses(teacher);
    const availabilities = teacher.availabilities ?? [];

    const availByDay: Record<string, AvailabilitySlot[]> = {};
    availabilities.forEach((a) => {
        if (!availByDay[a.dayOfWeek]) availByDay[a.dayOfWeek] = [];
        availByDay[a.dayOfWeek].push(a);
    });

    const scheduleByDay: Record<string, { course: CourseSimple; slot: CourseSchedule }[]> = {};
    courses.forEach((c) => {
        c.schedules.forEach((s) => {
            if (!scheduleByDay[s.dayOfWeek]) scheduleByDay[s.dayOfWeek] = [];
            scheduleByDay[s.dayOfWeek].push({ course: c, slot: s });
        });
    });

    return (
        <>
            <DialogHeader className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-5">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white font-bold text-xl shadow-lg shadow-primary/30 flex-shrink-0">
                        {getInitials(teacher)}
                    </div>
                    <div className="min-w-0">
                        <DialogTitle className="text-xl leading-tight font-black">{formatName(teacher)}</DialogTitle>
                        <DialogDescription className="mt-0.5 text-xs text-muted-foreground">{teacher.email}</DialogDescription>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {teacher.profile?.telefono && <Badge variant="outline" className="text-xs font-semibold">{teacher.profile.telefono}</Badge>}
                            {teacher.profile?.identificacion && <Badge variant="outline" className="text-xs font-semibold">DOC: {teacher.profile.identificacion}</Badge>}
                        </div>
                    </div>
                </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                {/* Programs */}
                {(teacher.programs ?? []).length > 0 && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Programas de Formación</p>
                        <div className="flex flex-wrap gap-2">
                            {teacher.programs!.map((p) => (
                                <Badge key={p.id} className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">{p.name}</Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Courses */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Materias / Cursos ({courses.length})
                    </p>
                    {courses.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Sin materias asignadas</p>
                    ) : (
                        <div className="space-y-2">
                            {courses.map((c, idx) => (
                                <div key={c.id} className={cn("rounded-xl border p-3 text-sm", COURSE_COLORS[idx % COURSE_COLORS.length])}>
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-semibold leading-tight">{c.title}</p>
                                        {c.schedules.length > 0 && (
                                            <Badge variant="outline" className="text-[10px] flex-shrink-0">
                                                {c.schedules.length} {c.schedules.length === 1 ? "sesión" : "sesiones"}
                                            </Badge>
                                        )}
                                    </div>
                                    {(c.period?.program?.name || c.group?.name) && (
                                        <p className="text-[11px] mt-0.5 opacity-80">
                                            {c.period?.program?.name}{c.group?.name ? ` · ${c.group.name}` : ""}
                                        </p>
                                    )}
                                    {c.schedules.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {c.schedules.map((s) => (
                                                <span key={s.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 border border-current/20 font-medium">
                                                    <CalendarDays className="w-2.5 h-2.5" />
                                                    {DAY_LABELS_FULL[s.dayOfWeek]} {to12h(s.startTime)}–{to12h(s.endTime)}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Availability */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Disponibilidad Horaria
                    </p>
                    {availabilities.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Sin disponibilidad registrada</p>
                    ) : (
                        <div className="space-y-2">
                            {DAYS_ORDER.filter((d) => availByDay[d]?.length > 0).map((day) => (
                                <div key={day} className="flex gap-2 items-start">
                                    <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg--100 dark:bg--900/30 dark:bg-emerald-900/30 border border--200 dark:border--800/50 dark:border-emerald-800">
                                        <span className="text-[10px] font-bold text--700 dark:text--300 dark:text-emerald-400">{DAY_LABELS[day]}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {availByDay[day].map((a) => (
                                            <span key={a.id} className="text-xs px-2 py-0.5 rounded-full bg--100 dark:bg--900/30 dark:bg-emerald-900/30 text--700 dark:text--300 dark:text-emerald-300 border border--200 dark:border--800/50 dark:border-emerald-800 font-medium">
                                                {to12h(a.startTime)} – {to12h(a.endTime)}
                                            </span>
                                        ))}
                                        {(scheduleByDay[day] ?? []).map(({ course, slot }) => (
                                            <span key={slot.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium">
                                                {course.title.length > 20 ? course.title.slice(0, 20) + "…" : course.title}: {to12h(slot.startTime)}–{to12h(slot.endTime)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Weekly summary grid */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        Resumen Semanal
                    </p>
                    <div className="grid grid-cols-7 gap-1">
                        {DAYS_ORDER.map((day) => {
                            const hasAvail = (availByDay[day] ?? []).length > 0;
                            const hasClass = (scheduleByDay[day] ?? []).length > 0;
                            return (
                                <div key={day} className="flex flex-col items-center gap-1">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{DAY_LABELS[day]}</span>
                                    <div className={cn(
                                        "w-full h-10 rounded-lg border flex flex-col items-center justify-center gap-0.5 text-[9px] font-medium transition-all",
                                        hasAvail && hasClass && "bg-gradient-to-b from-emerald-100 to-primary/20 dark:from-emerald-900/40 dark:to-primary/20 border-primary/40 text-primary",
                                        hasAvail && !hasClass && "bg--50 dark:bg--950/20 dark:bg-emerald-900/20 border--200 dark:border--800/50 dark:border-emerald-800 text--600 dark:text--400 dark:text-emerald-400",
                                        hasClass && !hasAvail && "bg-primary/10 border-primary/20 text-primary",
                                        !hasAvail && !hasClass && "bg-muted/30 border-border/40 text-muted-foreground/40"
                                    )}>
                                        {hasAvail && <span>✓</span>}
                                        {hasClass && <span>📚{(scheduleByDay[day] ?? []).length}</span>}
                                        {!hasAvail && !hasClass && <span>—</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-800 inline-block" /> Disponible</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary/30 inline-block" /> Con clase</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-emerald-200 to-violet-200 dark:from-emerald-800 dark:to-violet-800 inline-block" /> Disponible + clase</span>
                    </div>
                </div>
            </div>
        </>
    );
}
