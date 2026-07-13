"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, ShieldAlert, BadgeCheck, XSquare, Calendar, LinkIcon, BookOpen, GraduationCap, Link2, ExternalLink, FileText, Eye, EyeOff, CheckCircle2, BarChart3, UserX, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatName, cn } from "@/lib/utils";
import { fromUTC } from "@/lib/dateUtils";
import { getStudentRecords, justifyAttendanceAction, markRemarkViewed, getStudentDocumentation, deleteJustificationAction } from "../actions/studentActions";
import { getStudentGrades, submitStudentSubmissionLink } from "@/features/teacher/actions/gradeActions";
import { notifyEmailSentBatchAction } from "@/features/teacher/actions/groupActions";
import {
    getImprovementPlans,
    upsertImprovementPlan,
    deleteImprovementPlan,
    submitSignedDocument,
    deleteSignedDocument,
    markPlanViewed
} from "../actions/improvementPlanActions";
import { authClient } from "@/lib/auth-client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import MDEditor from "@uiw/react-md-editor";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
} from "chart.js";
import { Pie, Bar, Doughnut, PolarArea } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  ChartTooltip,
  ChartLegend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
);

interface StudentRecordsProps {
    studentId?: string;
    hideTables?: boolean;
    hideDocumentation?: boolean;
    defaultTab?: string;
    onlyImprovement?: boolean;
}

export function StudentRecords({ studentId, hideTables = false, hideDocumentation = false, defaultTab = "attendance", onlyImprovement = false }: StudentRecordsProps = {}) {
    const [records, setRecords] = useState<{ attendances: any[], remarks: any[], groupDates?: { startDate: Date | null, endDate: Date | null } | null, scheduleDates?: { startDate: Date | null, endDate: Date | null } | null } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [courses, setCourses] = useState<any[]>([]);
    const [gradesLoading, setGradesLoading] = useState(true);
    const [docCourses, setDocCourses] = useState<any[]>([]);
    const [docLoading, setDocLoading] = useState(true);
    const [selectedAttendanceCourse, setSelectedAttendanceCourse] = useState<string>("all");

    // Submission link dialog
    const [submissionDialog, setSubmissionDialog] = useState<{ open: boolean; activityId: string; activityTitle: string; currentLink: string } | null>(null);
    const [submissionLinkInput, setSubmissionLinkInput] = useState("");
    const [isSubmittingLink, startSubmitLink] = useTransition();

    // Activity detail dialog
    const [activityDetail, setActivityDetail] = useState<{ title: string; description: string; allowSubmissionLink: boolean; activityId: string; grade: any | null } | null>(null);

    // Remark detail dialog
    const [remarkDetail, setRemarkDetail] = useState<any | null>(null);

    // Justification State
    const [isPending, startTransition] = useTransition();
    const [justifyingId, setJustifyingId] = useState<string | null>(null);
    const [justificationText, setJustificationText] = useState("");
    const [justificationUrl, setJustificationUrl] = useState("");
    const [viewingJustification, setViewingJustification] = useState<{ justification: string; url?: string | null; date: string; statusName: string } | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    // Improvement Plans State
    const [improvementPlans, setImprovementPlans] = useState<any[]>([]);
    const [improvementLoading, setImprovementLoading] = useState(true);
    
    // Improvement Plan Dialogs
    const [planFormDialog, setPlanFormDialog] = useState<{
        open: boolean;
        id?: string;
        planNumber: string;
        teacherDocUrl: string;
        startDate: string;
        endDate: string;
        observations: string;
        planScore?: number | "";
        finalGrade?: number | "";
        evidenceUrl: string;
    } | null>(null);

    const [signedDocDialog, setSignedDocDialog] = useState<{
        open: boolean;
        planId: string;
        signedDocUrl: string;
    } | null>(null);
    
    const [viewPlanDetail, setViewPlanDetail] = useState<any | null>(null);
    const [impDeleteConfirm, setImpDeleteConfirm] = useState<string | null>(null);
    const [docDeleteConfirm, setDocDeleteConfirm] = useState<string | null>(null);

    const loadImprovementPlans = async () => {
        setImprovementLoading(true);
        try {
            const res = await getImprovementPlans(studentId);
            if (res.success && res.data) {
                setImprovementPlans(res.data);
            }
        } catch (error) {
            console.error("Error al cargar planes de mejoramiento:", error);
        } finally {
            setImprovementLoading(false);
        }
    };

    const handleDeletePlan = (id: string) => {
        setImpDeleteConfirm(id);
    };

    const handleDeleteSignedDoc = (planId: string) => {
        setDocDeleteConfirm(planId);
    };

    const onConfirmDeletePlan = async () => {
        if (!impDeleteConfirm) return;
        const toastId = toast.loading("Eliminando plan...");
        const res = await deleteImprovementPlan(impDeleteConfirm);
        if (res.success) {
            toast.success("Plan de mejoramiento eliminado correctamente", { id: toastId });
            setImpDeleteConfirm(null);
            loadImprovementPlans();
        } else {
            toast.error(res.error || "Error al eliminar el plan", { id: toastId });
        }
    };

    const onConfirmDeleteSignedDoc = async () => {
        if (!docDeleteConfirm) return;
        const toastId = toast.loading("Eliminando documento firmado...");
        const res = await deleteSignedDocument(docDeleteConfirm);
        if (res.success) {
            toast.success("Documento firmado eliminado correctamente", { id: toastId });
            setDocDeleteConfirm(null);
            loadImprovementPlans();
        } else {
            toast.error(res.error || "Error al eliminar el documento", { id: toastId });
        }
    };

    const handleUpsertPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!planFormDialog) return;
        if (!planFormDialog.planNumber.trim() || !planFormDialog.startDate || !planFormDialog.endDate) {
            toast.error("Por favor completa los campos requeridos (*)");
            return;
        }

        const toastId = toast.loading("Guardando plan de mejoramiento...");
        const payload = {
            id: planFormDialog.id,
            planNumber: planFormDialog.planNumber.trim(),
            studentId: studentId || (records as any)?.currentUser?.id || "",
            teacherDocUrl: planFormDialog.teacherDocUrl.trim() || undefined,
            startDate: planFormDialog.startDate,
            endDate: planFormDialog.endDate,
            observations: planFormDialog.observations.trim() || undefined,
            planScore: planFormDialog.planScore !== "" ? parseFloat(String(planFormDialog.planScore)) : undefined,
            finalGrade: planFormDialog.finalGrade !== "" ? parseFloat(String(planFormDialog.finalGrade)) : undefined,
            evidenceUrl: planFormDialog.evidenceUrl.trim() || undefined,
        };

        const res = await upsertImprovementPlan(payload);
        if (res.success) {
            toast.success("Plan de mejoramiento guardado con éxito", { id: toastId });
            setPlanFormDialog(null);
            loadImprovementPlans();
        } else {
            toast.error(res.error || "Error al guardar el plan", { id: toastId });
        }
    };

    const handleSignedDocSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!signedDocDialog) return;
        if (!signedDocDialog.signedDocUrl.trim()) {
            toast.error("El enlace no puede estar vacío");
            return;
        }

        const toastId = toast.loading("Enviando documento firmado...");
        const res = await submitSignedDocument(signedDocDialog.planId, signedDocDialog.signedDocUrl.trim());
        if (res.success) {
            toast.success("Documento firmado enviado con éxito", { id: toastId });
            setSignedDocDialog(null);
            loadImprovementPlans();
        } else {
            toast.error(res.error || "Error al enviar el documento", { id: toastId });
        }
    };

    const handleViewPlan = async (plan: any) => {
        setViewPlanDetail(plan);
        if (currentUserRole === "student" && !plan.viewedAt) {
            try {
                const res = await markPlanViewed(plan.id);
                if (res.success) {
                    // Update local state optimistically
                    setImprovementPlans(prev =>
                        prev.map(p => p.id === plan.id ? { ...p, viewedAt: new Date() } : p)
                    );
                }
            } catch (err) {
                console.error("Error marking plan as viewed:", err);
            }
        }
    };

    const handleEmailPlan = (plan: any) => {
        const studentEmail = plan.student?.email || "";
        const studentName = formatName(plan.student?.name, plan.student?.profile);
        const teacherName = formatName(plan.teacher?.name, plan.teacher?.profile);
        const subject = encodeURIComponent(`Plan de Mejoramiento Académico - ${plan.planNumber}`);
        
        let bodyText = `Hola, ${studentName}.\n\n`;
        bodyText += `Se ha registrado el Plan de Mejoramiento Académico N° ${plan.planNumber} en la plataforma AcademiX.\n\n`;
        bodyText += `Detalles del Plan:\n`;
        bodyText += `- Fecha de Inicio: ${format(fromUTC(plan.startDate), "dd/MM/yyyy")}\n`;
        bodyText += `- Fecha de Finalización: ${format(fromUTC(plan.endDate), "dd/MM/yyyy")}\n`;
        bodyText += `- Docente: ${teacherName}\n`;
        if (plan.teacherDocUrl) {
            bodyText += `- Documento del Plan: ${plan.teacherDocUrl}\n`;
        }
        if (plan.observations) {
            bodyText += `- Observaciones/Criterios: ${plan.observations}\n`;
        }
        bodyText += `\nPor favor ingresa a la plataforma AcademiX para revisar el plan en detalle, firmarlo y cargar el documento firmado para su posterior evaluación.\n\n`;
        bodyText += `Atentamente,\n`;
        bodyText += `${teacherName}`;

        const body = encodeURIComponent(bodyText);
        
        // Open default system mail client
        window.location.href = `mailto:${studentEmail}?subject=${subject}&body=${body}`;
        // Notify student via push
        notifyEmailSentBatchAction([plan.studentId], "PLAN");
    };

    useEffect(() => {
        loadRecords();
        loadGrades();
        loadDocumentation();
        loadImprovementPlans();
    }, [studentId]);

    const loadRecords = () => {
        getStudentRecords(studentId)
            .then(data => {
                setRecords(data);
                if (data.currentUser) {
                    setCurrentUserRole(data.currentUser.role);
                }
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    };

    const loadGrades = async () => {
        try {
            const targetId = studentId || (await authClient.getSession())?.data?.user?.id;
            if (targetId) {
                const data = await getStudentGrades(targetId);
                setCourses(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setGradesLoading(false);
        }
    };

    const loadDocumentation = async () => {
        try {
            const data = await getStudentDocumentation(studentId);
            setDocCourses(data);
        } catch (error) {
            console.error(error);
        } finally {
            setDocLoading(false);
        }
    };

    const handleJustifySubmit = () => {
        if (!justifyingId) return;
        if (!justificationText.trim()) {
            toast.error("El motivo de la justificación es requerido");
            return;
        }

        startTransition(async () => {
            try {
                await justifyAttendanceAction(justifyingId, justificationText, justificationUrl);
                toast.success("Justificación enviada correctamente");
                setJustifyingId(null);
                setJustificationText("");
                setJustificationUrl("");
                loadRecords();
            } catch (error: any) {
                toast.error(error.message || "Error al enviar la justificación");
            }
        });
    };

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [attendanceIdToDelete, setAttendanceIdToDelete] = useState<string | null>(null);

    const triggerDeleteJustification = (id: string) => {
        setAttendanceIdToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDeleteJustification = async () => {
        if (!attendanceIdToDelete) return;
        const toastId = toast.loading("Eliminando justificación...");
        try {
            const res = await deleteJustificationAction(attendanceIdToDelete);
            if (res.success) {
                toast.success("Justificación eliminada correctamente", { id: toastId });
                loadRecords();
            } else {
                toast.error("Error al eliminar la justificación", { id: toastId });
            }
        } catch (e: any) {
            toast.error(e.message || "Error al conectar con el servidor", { id: toastId });
        } finally {
            setDeleteDialogOpen(false);
            setAttendanceIdToDelete(null);
        }
    };

    const handleSubmitLink = () => {
        if (!submissionDialog) return;
        if (!submissionLinkInput.trim()) {
            toast.error("El enlace no puede estar vacío");
            return;
        }
        startSubmitLink(async () => {
            const res = await submitStudentSubmissionLink(submissionDialog.activityId, submissionLinkInput.trim());
            if (res.success) {
                toast.success("Enlace de entrega enviado correctamente");
                setSubmissionDialog(null);
                loadGrades();
            } else {
                toast.error(res.error || "Error al enviar el enlace");
            }
        });
    };

    const DAY_LABELS: Record<string, string> = {
        MONDAY: "Lun", TUESDAY: "Mar", WEDNESDAY: "Mié",
        THURSDAY: "Jue", FRIDAY: "Vie", SATURDAY: "Sáb", SUNDAY: "Dom"
    };

    const formatTeacherName = (teacher: any): string => {
        if (!teacher) return "Sin asignar";
        const p = teacher.profile;
        if (p?.firstName && p?.lastName) return `${p.firstName} ${p.lastName}`;
        return teacher.name || "Sin asignar";
    };

    const { attendances = [], remarks = [] } = records || {};

    const gradesAvgChartData = useMemo(() => {
        const labels = courses.map(c => c.title);
        const data = courses.map(course => {
            let totalScore = 0;
            let totalWeight = 0;
            course.activities.forEach((act: any) => {
                const grade = act.grades[0];
                if (grade && grade.score > 0) {
                    totalScore += grade.score * (act.weight / 100);
                    totalWeight += act.weight;
                }
            });
            return totalWeight > 0 ? parseFloat((totalScore / (totalWeight / 100)).toFixed(2)) : 0;
        });

        return {
            labels,
            datasets: [
                {
                    label: "Promedio por Materia",
                    data,
                    backgroundColor: "rgba(16, 185, 129, 0.6)",
                    borderColor: "rgb(16, 185, 129)",
                    borderWidth: 1.5,
                    borderRadius: 8,
                }
            ]
        };
    }, [courses]);

    const gradesDistChartData = useMemo(() => {
        let low = 0;
        let mid = 0;
        let high = 0;

        courses.forEach(course => {
            course.activities.forEach((act: any) => {
                const grade = act.grades[0];
                if (grade && grade.score > 0) {
                    if (grade.score < 3.0) low++;
                    else if (grade.score <= 4.0) mid++;
                    else high++;
                }
            });
        });

        return {
            labels: ["Bajo (< 3.0)", "Básico (3.0 - 4.0)", "Alto (> 4.0)"],
            datasets: [
                {
                    data: [low, mid, high],
                    backgroundColor: [
                        "rgba(239, 68, 68, 0.6)",
                        "rgba(245, 158, 11, 0.6)",
                        "rgba(16, 185, 129, 0.6)"
                    ],
                    borderColor: [
                        "rgb(239, 68, 68)",
                        "rgb(245, 158, 11)",
                        "rgb(16, 185, 129)"
                    ],
                    borderWidth: 1,
                }
            ]
        };
    }, [courses]);

    const gradesCompletionChartData = useMemo(() => {
        const labels = courses.map(c => c.title);
        const data = courses.map(course => {
            const total = course.activities.length;
            if (total === 0) return 0;
            const graded = course.activities.filter((act: any) => act.grades[0] && act.grades[0].score > 0).length;
            return Math.round((graded / total) * 100);
        });

        return {
            labels,
            datasets: [
                {
                    label: "% Actividades Realizadas",
                    data,
                    backgroundColor: "rgba(59, 130, 246, 0.6)",
                    borderColor: "rgb(59, 130, 246)",
                    borderWidth: 1.5,
                    borderRadius: 8,
                }
            ]
        };
    }, [courses]);

    const attendanceByCourseChartData = useMemo(() => {
        const courseMap: Record<string, { absent: number; late: number }> = {};
        courses.forEach(c => {
            courseMap[c.id] = { absent: 0, late: 0 };
        });

        attendances.forEach(att => {
            if (courseMap[att.course.id]) {
                if (att.status === "ABSENT") courseMap[att.course.id].absent++;
                if (att.status === "LATE") courseMap[att.course.id].late++;
            }
        });

        const labels = courses.map(c => c.title);
        const absents = courses.map(c => courseMap[c.id]?.absent || 0);
        const lates = courses.map(c => courseMap[c.id]?.late || 0);

        return {
            labels,
            datasets: [
                {
                    label: "Inasistencias",
                    data: absents,
                    backgroundColor: "rgba(239, 68, 68, 0.6)",
                    borderColor: "rgb(239, 68, 68)",
                    borderWidth: 1,
                    borderRadius: 8,
                },
                {
                    label: "Llegadas Tarde",
                    data: lates,
                    backgroundColor: "rgba(245, 158, 11, 0.6)",
                    borderColor: "rgb(245, 158, 11)",
                    borderWidth: 1,
                    borderRadius: 8,
                }
            ]
        };
    }, [courses, attendances]);

    const attendanceJustificationChartData = useMemo(() => {
        let justified = 0;
        let unjustified = 0;

        attendances.forEach(att => {
            if (att.status === "ABSENT" || att.status === "LATE") {
                if (att.justification) justified++;
                else unjustified++;
            }
        });

        return {
            labels: ["Justificadas", "Sin Justificar"],
            datasets: [
                {
                    data: [justified, unjustified],
                    backgroundColor: [
                        "rgba(16, 185, 129, 0.6)",
                        "rgba(239, 68, 68, 0.6)"
                    ],
                    borderColor: [
                        "rgb(16, 185, 129)",
                        "rgb(239, 68, 68)"
                    ],
                    borderWidth: 1,
                }
            ]
        };
    }, [attendances]);

    const remarksTypeChartData = useMemo(() => {
        let attention = 0;
        let commendation = 0;
        let citation = 0;
        let other = 0;

        remarks.forEach(rem => {
            if (rem.type === "ATTENTION") attention++;
            else if (rem.type === "COMMENDATION") commendation++;
            else if (rem.type === "CITATION") citation++;
            else other++;
        });

        return {
            labels: ["Llamados de Atención", "Felicitaciones", "Citaciones", "Otras"],
            datasets: [
                {
                    data: [attention, commendation, citation, other],
                    backgroundColor: [
                        "rgba(239, 68, 68, 0.6)",
                        "rgba(16, 185, 129, 0.6)",
                        "rgba(59, 130, 246, 0.6)",
                        "rgba(156, 163, 175, 0.6)"
                    ],
                    borderColor: [
                        "rgb(239, 68, 68)",
                        "rgb(16, 185, 129)",
                        "rgb(59, 130, 246)",
                        "rgb(156, 163, 175)"
                    ],
                    borderWidth: 1,
                }
            ]
        };
    }, [remarks]);

    const remarksReadChartData = useMemo(() => {
        let viewed = 0;
        let unviewed = 0;

        remarks.forEach(rem => {
            if (rem.viewedAt) viewed++;
            else unviewed++;
        });

        return {
            labels: ["Leídas / Vistas", "No Leídas / Pendientes"],
            datasets: [
                {
                    data: [viewed, unviewed],
                    backgroundColor: [
                        "rgba(16, 185, 129, 0.6)",
                        "rgba(245, 158, 11, 0.6)"
                    ],
                    borderColor: [
                        "rgb(16, 185, 129)",
                        "rgb(245, 158, 11)"
                    ],
                    borderWidth: 1,
                }
            ]
        };
    }, [remarks]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    const issueAttendances = attendances.filter(a => (a.status === 'ABSENT' || a.status === 'LATE') && !a.justification);
    const absentCount   = attendances.filter(a => a.status === 'ABSENT').length;
    const lateCount     = attendances.filter(a => a.status === 'LATE').length;

    const analyticsContent = (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
            
            {/* Section 1: Calificaciones */}
            <div className="space-y-4">
                <h3 className="text-xl font-black text-foreground flex items-center gap-2 px-1">
                    <GraduationCap className="w-5 h-5 text-emerald-500" />
                    Análisis de Calificaciones y Rendimiento
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Bar Chart: Promedios */}
                    <Card className="border shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold">Promedio Acumulado por Materia</CardTitle>
                            <CardDescription className="text-xs">Nota ponderada acumulada por asignatura.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 h-[280px] flex items-center justify-center">
                            {courses.length > 0 ? (
                                <Bar 
                                    data={gradesAvgChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false }
                                        },
                                        scales: {
                                            y: { min: 0, max: 5, ticks: { stepSize: 1 } }
                                        }
                                    }}
                                />
                            ) : (
                                <p className="text-xs text-muted-foreground">Sin datos</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Doughnut Chart: Distribución */}
                    <Card className="border shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold">Distribución de Notas Obtenidas</CardTitle>
                            <CardDescription className="text-xs">Rangos de desempeño en actividades calificadas.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 h-[280px] flex items-center justify-center">
                            <div className="w-full h-full max-h-[220px] flex items-center justify-center">
                                <Doughnut 
                                    data={gradesDistChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
                                        }
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Horizontal Bar Chart: Completitud */}
                    <Card className="border shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold">Progreso de Actividades Evaluadas</CardTitle>
                            <CardDescription className="text-xs">% de actividades con nota registrada.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 h-[280px] flex items-center justify-center">
                            {courses.length > 0 ? (
                                <Bar 
                                    data={gradesCompletionChartData}
                                    options={{
                                        indexAxis: 'y' as const,
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false }
                                        },
                                        scales: {
                                            x: { min: 0, max: 100, ticks: { callback: (value) => `${value}%` } }
                                        }
                                    }}
                                />
                            ) : (
                                <p className="text-xs text-muted-foreground">Sin datos</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Section 2: Asistencia */}
            <div className="space-y-4 pt-4 border-t">
                <h3 className="text-xl font-black text-foreground flex items-center gap-2 px-1">
                    <Clock className="w-5 h-5 text-amber-500" />
                    Control de Asistencia y Puntualidad
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Stacked Bar: Faltas por materia */}
                    <Card className="border shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold">Alertas de Asistencia por Materia</CardTitle>
                            <CardDescription className="text-xs">Inasistencias y llegadas tarde acumuladas.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 h-[280px] flex items-center justify-center">
                            {attendances.length > 0 ? (
                                <Bar 
                                    data={attendanceByCourseChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                            x: { stacked: true },
                                            y: { stacked: true, ticks: { stepSize: 1 } }
                                        },
                                        plugins: {
                                            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
                                        }
                                    }}
                                />
                            ) : (
                                <div className="text-center py-8 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                                    ¡Sin alertas de asistencia! Asistencia perfecta en todas las materias.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Doughnut: Justificados vs Sin Justificar */}
                    <Card className="border shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold">Estado de Justificaciones</CardTitle>
                            <CardDescription className="text-xs">Tasa de resolución de faltas y retardos.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 h-[280px] flex items-center justify-center">
                            {attendances.length > 0 ? (
                                <div className="w-full h-full max-h-[220px] flex items-center justify-center">
                                    <Doughnut 
                                        data={attendanceJustificationChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-8 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                                    No se registran faltas que requieran justificación.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Section 3: Observaciones */}
            <div className="space-y-4 pt-4 border-t">
                <h3 className="text-xl font-black text-foreground flex items-center gap-2 px-1">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    Historial de Observaciones
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Polar Area: Tipo de observaciones */}
                    <Card className="border shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold">Distribución por Tipo de Observación</CardTitle>
                            <CardDescription className="text-xs">Clasificación disciplinaria y académica recibida.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 h-[280px] flex items-center justify-center">
                            {remarks.length > 0 ? (
                                <div className="w-full h-full max-h-[220px] flex items-center justify-center">
                                    <PolarArea 
                                        data={remarksTypeChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    Sin observaciones registradas.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pie Chart: Visto vs No visto */}
                    <Card className="border shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold">Control de Lectura y Acuse de Recibo</CardTitle>
                            <CardDescription className="text-xs">Observaciones visualizadas frente a pendientes.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 h-[280px] flex items-center justify-center">
                            {remarks.length > 0 ? (
                                <div className="w-full h-full max-h-[220px] flex items-center justify-center">
                                    <Pie 
                                        data={remarksReadChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    Sin observaciones registradas.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-8">
            {/* Summary cards */}
            {!onlyImprovement && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Faltas */}
                    <Card className="border-red-200/60 dark:border-red-900/40">
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="uppercase font-bold tracking-wider text-xs flex items-center gap-2">
                                <UserX className="w-4 h-4 text-red-500" />
                                Faltas
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 flex items-end gap-3">
                            <div className="text-3xl font-black text-red-600 dark:text-red-400">{absentCount}</div>
                            <div className="text-sm text-muted-foreground font-medium pb-1">Inasistencias totales</div>
                        </CardContent>
                    </Card>

                    {/* Tardanzas */}
                    <Card className="border-amber-200/60 dark:border-amber-900/40">
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="uppercase font-bold tracking-wider text-xs flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                Llegadas Tarde
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 flex items-end gap-3">
                            <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{lateCount}</div>
                            <div className="text-sm text-muted-foreground font-medium pb-1">Tardanzas totales</div>
                        </CardContent>
                    </Card>

                    {/* Llamados de Atención */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardDescription className="uppercase font-bold tracking-wider text-xs flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-red-500" />
                                Observaciones Disciplinarias
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 flex items-end gap-3">
                            <div className="text-3xl font-black text-foreground">{remarks.filter(r => r.type === 'ATTENTION').length}</div>
                            <div className="text-sm text-muted-foreground font-medium pb-1">Llamados de Atención</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {hideTables ? (
                analyticsContent
            ) : (
                <Tabs defaultValue={onlyImprovement ? "improvement" : defaultTab} className="space-y-6">
                    {!onlyImprovement && (
                        <TabsList className={cn(
                            "flex w-full overflow-x-auto justify-start md:grid h-auto p-1 bg-muted/50 rounded-xl gap-1 scrollbar-none",
                            hideDocumentation ? "md:grid-cols-5" : "md:grid-cols-6"
                        )}>
                            <TabsTrigger value="attendance" className="flex items-center gap-1.5 shrink-0">
                                <Clock className="w-4 h-4 hidden sm:block" />
                                Asistencia
                            </TabsTrigger>
                            <TabsTrigger value="grades" className="flex items-center gap-1.5 shrink-0">
                                <GraduationCap className="w-4 h-4 hidden sm:block" />
                                Calificaciones
                            </TabsTrigger>
                            {!hideDocumentation && (
                                <TabsTrigger value="documentation" className="flex items-center gap-1.5 shrink-0">
                                    <BookOpen className="w-4 h-4 hidden sm:block" />
                                    Documentación
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="remarks" className="flex items-center gap-1.5 shrink-0">
                                <ShieldAlert className="w-4 h-4 hidden sm:block" />
                                Observaciones
                            </TabsTrigger>
                            <TabsTrigger value="improvement" className="flex items-center gap-1.5 shrink-0">
                                <FileText className="w-4 h-4 hidden sm:block" />
                                Planes de Mejoramiento
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="flex items-center gap-1.5 shrink-0">
                                <BarChart3 className="w-4 h-4 hidden sm:block" />
                                Analítica
                            </TabsTrigger>
                        </TabsList>
                    )}

                    {/* ── ATTENDANCE (table per course) ────────────────────── */}
                    {!onlyImprovement && <TabsContent value="attendance" className="m-0 border-none p-0 outline-none">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                            {attendances.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-muted/5 text-muted-foreground">
                                    <Calendar className="w-12 h-12 mb-4 opacity-50 text-green-500" />
                                    <p className="font-semibold text-base text-green-600">¡Asistencia Perfecta!</p>
                                    <p className="text-sm text-center mt-1">No tienes registros de inasistencias ni llegadas tarde.</p>
                                </div>
                            ) : (() => {
                                const byCourse: Record<string, { course: any; entries: any[] }> = {};
                                for (const c of courses) {
                                    byCourse[c.id] = { course: c, entries: [] };
                                }
                                for (const att of attendances) {
                                    if (!byCourse[att.course.id]) byCourse[att.course.id] = { course: att.course, entries: [] };
                                    byCourse[att.course.id].entries.push(att);
                                }

                                const courseMetrics = Object.values(byCourse).map(({ course, entries }) => {
                                    let totalClassDays = entries.length;
                                    if (records?.scheduleDates?.startDate && records.scheduleDates.endDate && course.schedules && course.schedules.length > 0) {
                                        const daysMap: Record<string, number> = {
                                            SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
                                        };
                                        const scheduledDays = course.schedules.map((s: any) => daysMap[s.dayOfWeek]).filter((d: number | undefined) => d !== undefined);
                                        
                                        if (scheduledDays.length > 0) {
                                            let daysCount = 0;
                                            const current = fromUTC(records.scheduleDates.startDate);
                                            current.setHours(0,0,0,0);
                                            const end = fromUTC(records.scheduleDates.endDate);
                                            end.setHours(0,0,0,0);
                                            
                                            const effectiveEnd = end;
                                            
                                            while (current <= effectiveEnd) {
                                                if (scheduledDays.includes(current.getDay())) {
                                                    daysCount++;
                                                }
                                                current.setDate(current.getDate() + 1);
                                            }
                                            totalClassDays = daysCount > 0 ? daysCount : entries.length;
                                        }
                                    }
                                    const absentCount = entries.filter(e => e.status === "ABSENT").length;
                                    const lateCount = entries.filter(e => e.status === "LATE").length;
                                    
                                    let dailyHours = 6;
                                    if (course.schedules && course.schedules.length > 0) {
                                        const sch = course.schedules[0];
                                        if (sch.startTime && sch.endTime) {
                                            const [sh, sm] = sch.startTime.split(":").map(Number);
                                            const [eh, em] = sch.endTime.split(":").map(Number);
                                            dailyHours = (eh * 60 + em - (sh * 60 + sm)) / 60;
                                        }
                                    }
                                    const totalScheduledHours = totalClassDays * dailyHours;
                                    
                                    let absentHours = 0;
                                    let lateHours = 0;
                                    let leaveHours = 0;
                                    
                                    entries.forEach(rec => {
                                        const daysMap: Record<string, number> = {
                                            SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
                                        };
                                        const targetDay = new Date(rec.date).getUTCDay();
                                        if (rec.status === "ABSENT") {
                                            absentHours += dailyHours;
                                        } else if (rec.status === "LATE" && rec.arrivalTime && course.schedules && course.schedules.length > 0) {
                                            const sch = course.schedules.find((s: any) => daysMap[s.dayOfWeek] === targetDay) || course.schedules[0];
                                            if (sch && sch.startTime) {
                                                const [sh, sm] = sch.startTime.split(":").map(Number);
                                                let ah = 0, am = 0;
                                                try {
                                                    const dateObj = new Date(rec.arrivalTime);
                                                    if (!isNaN(dateObj.getTime())) {
                                                        ah = parseInt(dateObj.toISOString().substring(11, 13));
                                                        am = parseInt(dateObj.toISOString().substring(14, 16));
                                                    }
                                                } catch(e) {}
                                                const arrMin = ah * 60 + am;
                                                const schedMin = sh * 60 + sm;
                                                if (arrMin > schedMin) {
                                                    lateHours += (arrMin - schedMin) / 60;
                                                }
                                            }
                                        } else if (rec.status === "LEAVE_EARLY" && rec.departureTime && course.schedules && course.schedules.length > 0) {
                                            const sch = course.schedules.find((s: any) => daysMap[s.dayOfWeek] === targetDay) || course.schedules[0];
                                            if (sch && sch.endTime) {
                                                const [eh, em] = sch.endTime.split(":").map(Number);
                                                let dh = 0, dm = 0;
                                                try {
                                                    const dateObj = new Date(rec.departureTime);
                                                    if (!isNaN(dateObj.getTime())) {
                                                        dh = parseInt(dateObj.toISOString().substring(11, 13));
                                                        dm = parseInt(dateObj.toISOString().substring(14, 16));
                                                    }
                                                } catch(e) {}
                                                const depMin = dh * 60 + dm;
                                                const schedEndMin = eh * 60 + em;
                                                if (schedEndMin > depMin) {
                                                    leaveHours += (schedEndMin - depMin) / 60;
                                                }
                                            }
                                        }
                                    });

                                    const leaveCount = entries.filter(e => e.status === "LEAVE_EARLY").length;
                                    const absenceRate = totalClassDays > 0 ? Math.max(0, Math.min(100, (absentCount / totalClassDays) * 100)) : 0;
                                    const lateRate = totalClassDays > 0 ? Math.max(0, Math.min(100, (lateCount / totalClassDays) * 100)) : 0;
                                    const leaveRate = totalClassDays > 0 ? Math.max(0, Math.min(100, (leaveCount / totalClassDays) * 100)) : 0;
                                    
                                    const totalLostHours = absentHours + lateHours + leaveHours;
                                    const attendedHours = Math.max(0, totalScheduledHours - totalLostHours);
                                    const attendanceHoursRate = totalScheduledHours > 0 ? Math.max(0, Math.min(100, (attendedHours / totalScheduledHours) * 100)) : 100;
                                    
                                    return {
                                        course,
                                        totalClassDays,
                                        totalScheduledHours,
                                        absentCount,
                                        lateCount,
                                        leaveCount,
                                        absentHours,
                                        lateHours,
                                        leaveHours,
                                        absenceRate,
                                        lateRate,
                                        leaveRate,
                                        attendedHours,
                                        attendanceHoursRate
                                    };
                                });

                                const filteredMetrics = selectedAttendanceCourse === "all" ? courseMetrics : courseMetrics.filter(m => m.course.id === selectedAttendanceCourse);
                                const filteredCourses = selectedAttendanceCourse === "all" ? Object.values(byCourse) : Object.values(byCourse).filter(c => c.course.id === selectedAttendanceCourse);

                                return (
                                    <div className="space-y-8">
                                        <div className="flex justify-between items-center bg-card border rounded-2xl p-4 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <BarChart3 className="w-5 h-5 text-primary" />
                                                <h3 className="text-sm font-bold">Filtro de Materias</h3>
                                            </div>
                                            <Select value={selectedAttendanceCourse} onValueChange={setSelectedAttendanceCourse}>
                                                <SelectTrigger className="w-[280px]">
                                                    <SelectValue placeholder="Seleccione una materia..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all" className="font-bold">Todas las materias</SelectItem>
                                                    {courseMetrics.map(m => (
                                                        <SelectItem key={m.course.id} value={m.course.id}>
                                                            {m.course.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Chart Section */}
                                        <Tabs defaultValue="faltas" className="w-full">
                                            <TabsList className="grid w-full sm:w-[600px] grid-cols-4 mb-6 mx-auto">
                                                <TabsTrigger value="faltas">Faltas</TabsTrigger>
                                                <TabsTrigger value="tardanzas">Tardanzas</TabsTrigger>
                                                <TabsTrigger value="retiros">Retiros</TabsTrigger>
                                                <TabsTrigger value="horas">Carga Horaria</TabsTrigger>
                                            </TabsList>
                                            
                                            <TabsContent value="faltas" className="bg-card border rounded-2xl p-5 shadow-sm space-y-4 focus-visible:outline-none">
                                                <div>
                                                    <h3 className="text-base font-black text-foreground">Registro de Inasistencias (Faltas) por Materia</h3>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Total de días no asistidos en cada materia sobre los días registrados.</p>
                                                </div>
                                                <div className="space-y-4">
                                                    {filteredMetrics.map(m => (
                                                        <div key={m.course.id} className="space-y-1.5">
                                                            <div className="flex items-center justify-between text-xs font-bold">
                                                                <span className="truncate text-foreground max-w-[300px] sm:max-w-md">{m.course.title}</span>
                                                                <span className="text-red-600 shrink-0 font-extrabold">
                                                                    {m.absentCount} / {m.totalClassDays} días ({m.absenceRate.toFixed(1)}%)
                                                                </span>
                                                            </div>
                                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                                <div className="h-full bg-red-500 rounded-full" style={{ width: `${m.absenceRate}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TabsContent>
                                            
                                            <TabsContent value="tardanzas" className="bg-card border rounded-2xl p-5 shadow-sm space-y-4 focus-visible:outline-none">
                                                <div>
                                                    <h3 className="text-base font-black text-foreground">Registro de Llegadas Tarde por Materia</h3>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Cantidad de días con ingreso tarde en cada materia.</p>
                                                </div>
                                                <div className="space-y-4">
                                                    {filteredMetrics.map(m => (
                                                        <div key={m.course.id} className="space-y-1.5">
                                                            <div className="flex items-center justify-between text-xs font-bold">
                                                                <span className="truncate text-foreground max-w-[300px] sm:max-w-md">{m.course.title}</span>
                                                                <span className="text-amber-600 shrink-0 font-extrabold">
                                                                    {m.lateCount} / {m.totalClassDays} días ({m.lateRate.toFixed(1)}%)
                                                                </span>
                                                            </div>
                                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${m.lateRate}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="retiros" className="bg-card border rounded-2xl p-5 shadow-sm space-y-4 focus-visible:outline-none">
                                                <div>
                                                    <h3 className="text-base font-black text-foreground">Registro de Retiros Tempranos por Materia</h3>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Cantidad de días con retiro temprano en cada materia.</p>
                                                </div>
                                                <div className="space-y-4">
                                                    {filteredMetrics.map(m => (
                                                        <div key={m.course.id} className="space-y-1.5">
                                                            <div className="flex items-center justify-between text-xs font-bold">
                                                                <span className="truncate text-foreground max-w-[300px] sm:max-w-md">{m.course.title}</span>
                                                                <span className="text-blue-600 shrink-0 font-extrabold">
                                                                    {m.leaveCount} / {m.totalClassDays} días ({m.leaveRate.toFixed(1)}%)
                                                                </span>
                                                            </div>
                                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${m.leaveRate}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="horas" className="bg-card border rounded-2xl p-5 shadow-sm space-y-4 focus-visible:outline-none">
                                                <div>
                                                    <h3 className="text-base font-black text-foreground">Carga Horaria y Asistencia Efectiva</h3>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Horas asistidas vs perdidas por materia.</p>
                                                </div>
                                                <div className="space-y-5">
                                                    {filteredMetrics.map(m => {
                                                        const lostHours = m.absentHours + m.lateHours + m.leaveHours;
                                                        return (
                                                            <div key={m.course.id} className="space-y-2 border-b border-border/30 pb-3 last:border-0 last:pb-0">
                                                                <div className="flex flex-wrap items-center justify-between text-xs font-bold gap-2">
                                                                    <span className="truncate text-foreground max-w-[280px] sm:max-w-md">{m.course.title}</span>
                                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-muted-foreground">
                                                                        <span className="text-emerald-600 dark:text-emerald-400">Asistidas: {m.attendedHours.toFixed(1)} hs</span>
                                                                        <span className="text-red-500">Perdidas: {lostHours.toFixed(1)} hs</span>
                                                                        <span className="text-blue-600 font-extrabold">Efectiva: {m.attendanceHoursRate.toFixed(1)}%</span>
                                                                    </div>
                                                                </div>
                                                                <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                                                                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${m.attendanceHoursRate}%` }} title={`Horas Asistidas: ${m.attendedHours.toFixed(1)} hs`} />
                                                                    {m.absentHours > 0 && (
                                                                        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${(m.absentHours / m.totalScheduledHours) * 100}%` }} title={`Horas Faltas: ${m.absentHours.toFixed(1)} hs`} />
                                                                    )}
                                                                    {m.lateHours > 0 && (
                                                                        <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(m.lateHours / m.totalScheduledHours) * 100}%` }} title={`Horas Tardes: ${m.lateHours.toFixed(1)} hs`} />
                                                                    )}
                                                                    {m.leaveHours > 0 && (
                                                                        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(m.leaveHours / m.totalScheduledHours) * 100}%` }} title={`Horas Retiros: ${m.leaveHours.toFixed(1)} hs`} />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </TabsContent>
                                        </Tabs>

                                        {/* Original Table Section */}
                                        <div className="space-y-6">
                                            {filteredCourses.map(({ course, entries }) => {
                                                const unjustified = entries.filter(a => !a.justification).length;
                                                return (
                                        <Card key={course.id} className="overflow-hidden border-border/50 shadow-sm">
                                            <CardHeader className="bg-muted/10 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-black text-foreground">{course.title}</h3>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                        <span className="text-sm text-muted-foreground">{formatTeacherName(course.teacher)}</span>
                                                    </div>
                                                    {course.schedules && course.schedules.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {course.schedules.map((sch: any) => (
                                                                <span key={sch.id} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                                                    <Calendar className="w-2.5 h-2.5" />
                                                                    {DAY_LABELS[sch.dayOfWeek] ?? sch.dayOfWeek} {sch.startTime}–{sch.endTime}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end shrink-0">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sin Justificar</span>
                                                    <span className={`text-3xl font-black ${unjustified > 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{unjustified}</span>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="w-full overflow-x-auto scrollbar-none">
                                                    <Table className="[&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 min-w-[550px]">
                                                        <TableHeader className="bg-muted/5">
                                                            <TableRow>
                                                                <TableHead>Fecha</TableHead>
                                                                <TableHead className="w-[120px] text-center">Estado</TableHead>
                                                                <TableHead className="w-[130px] text-center">Justificación</TableHead>
                                                                <TableHead className="w-[120px] text-center">Acción</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {entries.map(att => {
                                                                const isJustified = !!att.justification;
                                                                const canJustify = !isJustified && (att.status === 'ABSENT' || att.status === 'LATE' || att.status === 'LEAVE_EARLY') && currentUserRole === "student";
                                                                return (
                                                                    <TableRow key={att.id}>
                                                                        <TableCell>
                                                                            <div className="font-semibold">{format(fromUTC(att.date), "EEE d MMM yyyy", { locale: es })}</div>
                                                                            {att.arrivalTime && <div className="text-xs text-muted-foreground mt-0.5">Llegada: {format(new Date(att.arrivalTime), "HH:mm")}</div>}
                                                                            {att.departureTime && <div className="text-xs text-muted-foreground mt-0.5">Retiro: {format(new Date(att.departureTime), "HH:mm")}</div>}
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            <Badge variant="outline" className={`text-xs font-bold w-28 h-6 inline-flex items-center justify-center ${
                                                                                att.status === 'LATE' 
                                                                                    ? 'text-amber-600 border-amber-200 bg-amber-50' 
                                                                                    : att.status === 'LEAVE_EARLY'
                                                                                        ? 'text-blue-600 border-blue-200 bg-blue-50'
                                                                                        : 'text-red-600 border-red-200 bg-red-50'
                                                                            }`}>
                                                                                {att.status === 'LATE' ? 'Llegada Tarde' : att.status === 'LEAVE_EARLY' ? 'Retiro Temprano' : 'Ausencia'}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {isJustified ? (
                                                                                <div className="flex flex-col items-center gap-1">
                                                                                    <Badge variant="outline" className="text-xs font-bold text-emerald-600 border-emerald-200 bg-emerald-50 gap-1 w-28 h-6 inline-flex items-center justify-center">
                                                                                        <CheckCircle2 className="w-3 h-3" /> Justificado
                                                                                    </Badge>
                                                                                    {att.justificationUrl && (
                                                                                        <a href={att.justificationUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                                                                            <LinkIcon className="w-3 h-3" /> Soporte
                                                                                        </a>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-xs text-muted-foreground">Sin justificar</span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {canJustify ? (
                                                                                <Dialog open={justifyingId === att.id} onOpenChange={(open) => {
                                                                                    if (open) { setJustifyingId(att.id); setJustificationText(""); setJustificationUrl(""); }
                                                                                    else setJustifyingId(null);
                                                                                }}>
                                                                                    <DialogTrigger asChild>
                                                                                        <Button size="sm" variant="outline" className="h-7 text-xs font-semibold">Justificar</Button>
                                                                                    </DialogTrigger>
                                                                                    <DialogContent>
                                                                                        <DialogHeader>
                                                                                            <DialogTitle>Justificar {att.status === 'LATE' ? 'Retardo' : att.status === 'LEAVE_EARLY' ? 'Retiro Temprano' : 'Ausencia'}</DialogTitle>
                                                                                            <DialogDescription>Explica el motivo y adjunta un enlace a tu soporte. Una vez enviada, no podrás modificarla.</DialogDescription>
                                                                                        </DialogHeader>
                                                                                        <div className="space-y-4 py-4">
                                                                                            <div className="space-y-2">
                                                                                                <Label>Motivo *</Label>
                                                                                                <Textarea placeholder="Explica el motivo..." value={justificationText} onChange={e => setJustificationText(e.target.value)} />
                                                                                            </div>
                                                                                            <div className="space-y-2">
                                                                                                <Label>Enlace al soporte (Opcional)</Label>
                                                                                                <Input placeholder="https://drive.google.com/..." type="url" value={justificationUrl} onChange={e => setJustificationUrl(e.target.value)} />
                                                                                            </div>
                                                                                        </div>
                                                                                        <DialogFooter>
                                                                                            <Button variant="outline" onClick={() => setJustifyingId(null)} disabled={isPending}>Cancelar</Button>
                                                                                            <Button onClick={handleJustifySubmit} disabled={isPending}>{isPending ? "Enviando..." : "Enviar Justificación"}</Button>
                                                                                        </DialogFooter>
                                                                                    </DialogContent>
                                                                                </Dialog>
                                                                            ) : isJustified ? (
                                                                                <div className="flex items-center justify-center gap-1.5">
                                                                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                                                                        onClick={() => setViewingJustification({
                                                                                            justification: att.justification || "",
                                                                                            url: att.justificationUrl,
                                                                                            date: att.date,
                                                                                            statusName: att.status === 'LATE' ? 'Llegada Tarde' : att.status === 'LEAVE_EARLY' ? 'Retiro Temprano' : 'Ausencia'
                                                                                        })}
                                                                                    >
                                                                                        <FileText className="w-3 h-3" /> Ver
                                                                                    </Button>
                                                                                    {(currentUserRole === "teacher" || currentUserRole === "admin") && (
                                                                                        <Button 
                                                                                            size="sm" 
                                                                                            variant="destructive" 
                                                                                            onClick={() => triggerDeleteJustification(att.id)}
                                                                                            className="h-7 text-xs font-semibold"
                                                                                        >
                                                                                            Eliminar
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-muted-foreground text-xs">—</span>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    </TabsContent>}

                    {/* ── GRADES ─────────────────────────────────────────────── */}
                    {!onlyImprovement && <TabsContent value="grades" className="m-0 border-none p-0 outline-none">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                            {gradesLoading ? (
                                <div className="flex justify-center items-center h-48">
                                    <LoadingSpinner />
                                </div>
                            ) : courses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-muted/5 text-muted-foreground">
                                    <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                                    <p className="font-semibold text-base">Sin Materias</p>
                                    <p className="text-sm text-center mt-1">No estás inscrito en ninguna materia actualmente.</p>
                                </div>
                            ) : (
                                courses.map(course => {
                                    let totalScore = 0;
                                    let totalWeight = 0;

                                    course.activities.forEach((act: any) => {
                                        const grade = act.grades[0];
                                        if (grade && grade.score > 0) {
                                            totalScore += grade.score * (act.weight / 100);
                                            totalWeight += act.weight;
                                        }
                                    });

                                    const currentAverage = totalWeight > 0
                                        ? (totalScore / (totalWeight / 100)).toFixed(2)
                                        : "-";
                                    const avgNum = parseFloat(currentAverage);

                                    return (
                                        <Card key={course.id} className="overflow-hidden border-border/50 shadow-sm">
                                            <CardHeader className="bg-muted/10 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-black text-foreground">{course.title}</h3>

                                                    {/* Teacher */}
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                        <span className="text-sm text-muted-foreground">{formatTeacherName(course.teacher)}</span>
                                                    </div>

                                                    {/* Schedules */}
                                                    {course.schedules && course.schedules.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {course.schedules.map((sch: any) => (
                                                                <span
                                                                    key={sch.id}
                                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                                                                >
                                                                    <Calendar className="w-2.5 h-2.5" />
                                                                    {DAY_LABELS[sch.dayOfWeek] ?? sch.dayOfWeek} {sch.startTime}–{sch.endTime}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end shrink-0">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Promedio</span>
                                                    <span className={`text-3xl font-black ${!isNaN(avgNum) && avgNum < 3.0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {currentAverage}
                                                    </span>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                {course.activities.length === 0 ? (
                                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                                        El profesor aún no ha asignado actividades evaluativas en esta materia.
                                                    </div>
                                                ) : (
                                                    <div className="w-full overflow-x-auto scrollbar-none">
                                                        <Table className="[&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 min-w-[550px]">
                                                            <TableHeader className="bg-muted/5">
                                                                <TableRow>
                                                                    <TableHead>Actividad</TableHead>
                                                                    <TableHead className="w-[80px] text-center">Peso</TableHead>
                                                                    <TableHead className="w-[100px] text-center">Nota</TableHead>
                                                                    <TableHead className="w-[150px] text-center">Entrega</TableHead>
                                                                    <TableHead className="w-[110px] text-center">Detalle</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {course.activities.map((act: any) => {
                                                                    const grade = act.grades[0];
                                                                    return (
                                                                        <TableRow key={act.id}>
                                                                            {/* Actividad */}
                                                                            <TableCell>
                                                                                <div className="font-semibold">{act.title}</div>
                                                                                {act.allowSubmissionLink && (
                                                                                    <Badge variant="outline" className="mt-1 text-[10px] text-primary border-primary/30 bg-primary/5 gap-1">
                                                                                        <Link2 className="w-2.5 h-2.5" />Acepta entrega
                                                                                    </Badge>
                                                                                )}
                                                                            </TableCell>

                                                                            {/* Peso */}
                                                                            <TableCell className="text-center text-muted-foreground font-medium">
                                                                                {act.weight}%
                                                                            </TableCell>

                                                                            {/* Nota */}
                                                                            <TableCell className="text-center">
                                                                                {grade && grade.score > 0 ? (
                                                                                    <Badge variant="outline" className={grade.score < 3.0 ? "text-red-600 bg-red-50 border-red-200" : "text-emerald-700 bg-emerald-50 border-emerald-200"}>
                                                                                        {grade.score.toFixed(1)}
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <span className="text-muted-foreground text-xs italic">Pendiente</span>
                                                                                )}
                                                                            </TableCell>

                                                                            {/* Entrega */}
                                                                            <TableCell className="text-center">
                                                                                {act.allowSubmissionLink ? (
                                                                                    grade?.submissionLink ? (
                                                                                        <div className="flex flex-col items-center gap-1">
                                                                                            <a href={grade.submissionLink} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline flex items-center gap-1 font-medium">
                                                                                                <ExternalLink className="w-3 h-3" /> Ver entrega
                                                                                            </a>
                                                                                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-muted-foreground"
                                                                                                onClick={() => { setSubmissionLinkInput(grade.submissionLink); setSubmissionDialog({ open: true, activityId: act.id, activityTitle: act.title, currentLink: grade.submissionLink }); }}>
                                                                                                Editar
                                                                                            </Button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-primary/50 text-primary hover:bg-primary/5"
                                                                                            onClick={() => { setSubmissionLinkInput(""); setSubmissionDialog({ open: true, activityId: act.id, activityTitle: act.title, currentLink: "" }); }}>
                                                                                            <Link2 className="w-3 h-3" /> Enviar
                                                                                        </Button>
                                                                                    )
                                                                                ) : (
                                                                                    <span className="text-muted-foreground text-xs">—</span>
                                                                                )}
                                                                            </TableCell>

                                                                            {/* Detalle */}
                                                                            <TableCell className="text-center">
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className="h-7 text-xs gap-1.5"
                                                                                    onClick={() => setActivityDetail({
                                                                                        title: act.title,
                                                                                        description: act.description || "",
                                                                                        allowSubmissionLink: act.allowSubmissionLink ?? false,
                                                                                        activityId: act.id,
                                                                                        grade: grade ?? null
                                                                                    })}
                                                                                >
                                                                                    <FileText className="w-3 h-3" />
                                                                                    Ver
                                                                                </Button>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    );
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            )}
                        </motion.div>
                    </TabsContent>}

                    {/* ── DOCUMENTATION (links per course) ────────────────────── */}
                    {!onlyImprovement && !hideDocumentation && <TabsContent value="documentation" className="m-0 border-none p-0 outline-none">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                            {docLoading ? (
                                <div className="flex items-center justify-center p-12">
                                    <LoadingSpinner className="w-8 h-8 text-primary" />
                                </div>
                            ) : docCourses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-muted/5 text-muted-foreground">
                                    <BookOpen className="w-12 h-12 mb-4 opacity-40" />
                                    <p className="font-semibold text-base">Sin materias inscritas</p>
                                    <p className="text-sm text-center mt-1">No tienes materias activas con documentación disponible.</p>
                                </div>
                            ) : (
                                docCourses.map((course: any) => {
                                    const links = course.sharedContent.flatMap((sc: any) =>
                                        (Array.isArray(sc.links) ? sc.links : [])
                                            .filter((l: any) => l?.url)
                                            .map((l: any) => ({
                                                id: sc.id + l.url,
                                                title: l.label || sc.title,
                                                url: l.url,
                                                createdAt: new Date(sc.createdAt),
                                            }))
                                    );
                                    return (
                                        <Card key={course.id} className="overflow-hidden border-border/50 shadow-sm">
                                            <CardHeader className="bg-muted/10 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-black text-foreground">{course.title}</h3>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                        <span className="text-sm text-muted-foreground">{formatTeacherName(course.teacher)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recursos</span>
                                                    <span className={`text-3xl font-black ${links.length > 0 ? "text-primary" : "text-muted-foreground/40"}`}>{links.length}</span>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-4">
                                                {links.length === 0 ? (
                                                    <div className="flex items-center gap-3 py-6 text-center justify-center text-muted-foreground">
                                                        <BookOpen className="w-5 h-5 opacity-40 shrink-0" />
                                                        <p className="text-sm">El profesor aún no ha publicado recursos en esta materia.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {links.map((link: any) => (
                                                            <a
                                                                key={link.id}
                                                                href={link.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="group flex items-center justify-between p-3 rounded-xl border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-sm transition-all"
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="p-2 bg-primary/10 rounded-lg shrink-0 group-hover:bg-primary/20 transition-colors">
                                                                        <Link2 className="w-4 h-4 text-primary" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-semibold text-sm group-hover:text-primary transition-colors">{link.title}</p>
                                                                        <p className="text-xs text-muted-foreground truncate max-w-sm mt-0.5">{link.url}</p>
                                                                    </div>
                                                                </div>
                                                                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 ml-3 transition-colors" />
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            )}
                        </motion.div>
                    </TabsContent>}


                    {/* ── REMARKS (table per course) ──────────────────────────── */}
                    {!onlyImprovement && <TabsContent value="remarks" className="m-0 border-none p-0 outline-none">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                            {remarks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-muted/5 text-muted-foreground">
                                    <BadgeCheck className="w-12 h-12 mb-4 opacity-50" />
                                    <p className="font-semibold text-base">Sin observaciones</p>
                                    <p className="text-sm text-center mt-1">No tienes felicitaciones ni llamados de atención registrados.</p>
                                </div>
                            ) : (() => {
                                const REMARK_COLORS: Record<string, string> = {
                                    ATTENTION: "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20",
                                    COMMENDATION: "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20",
                                    CITATION: "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20",
                                    OTHER: "text-gray-600 border-gray-200 bg-gray-50 dark:bg-gray-950/20",
                                };
                                const REMARK_LABELS: Record<string, string> = {
                                    ATTENTION: "Llamado de Atención", COMMENDATION: "Felicitación",
                                    CITATION: "Citación", OTHER: "Otra"
                                };
                                const byCourse: Record<string, { course: any; remarks: any[] }> = {};
                                for (const r of remarks) {
                                    if (!byCourse[r.course.id]) byCourse[r.course.id] = { course: r.course, remarks: [] };
                                    byCourse[r.course.id].remarks.push(r);
                                }
                                return Object.values(byCourse).map(({ course, remarks: courseRemarks }) => {
                                    const unseen = courseRemarks.filter(r => !r.viewedAt).length;
                                    return (
                                        <Card key={course.id} className="overflow-hidden border-border/50 shadow-sm">
                                            <CardHeader className="bg-muted/10 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-black text-foreground">{course.title}</h3>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                        <span className="text-sm text-muted-foreground">{formatTeacherName(course.teacher)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sin leer</span>
                                                    <span className={`text-3xl font-black ${unseen > 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{unseen}</span>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="w-full overflow-x-auto scrollbar-none">
                                                    <Table className="[&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5">
                                                    <TableHeader className="bg-muted/5">
                                                        <TableRow>
                                                            <TableHead className="w-[140px]">Tipo</TableHead>
                                                            <TableHead>Título</TableHead>
                                                            <TableHead className="w-[110px] text-center">Fecha</TableHead>
                                                            <TableHead className="w-[100px] text-center">Estado</TableHead>
                                                            <TableHead className="w-[90px] text-center">Detalle</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {courseRemarks.map(remark => (
                                                            <TableRow key={remark.id} className={!remark.viewedAt ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}>
                                                                <TableCell>
                                                                    <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${REMARK_COLORS[remark.type] ?? REMARK_COLORS.OTHER}`}>
                                                                        {REMARK_LABELS[remark.type] ?? "Otra"}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="font-semibold">{remark.title}</div>
                                                                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                                        <GraduationCap className="w-3 h-3 shrink-0" />
                                                                        {formatName(remark.teacher.name, remark.teacher.profile)}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm text-muted-foreground font-medium">
                                                                    {format(new Date(remark.date), "dd MMM yyyy", { locale: es })}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {remark.viewedAt ? (
                                                                        <Badge variant="outline" className="text-xs gap-1 text-emerald-700 border-emerald-200 bg-emerald-50">
                                                                            <Eye className="w-3 h-3" /> Visto
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-xs gap-1 text-amber-700 border-amber-200 bg-amber-50">
                                                                            <EyeOff className="w-3 h-3" /> No leído
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                                                                        onClick={() => {
                                                                            setRemarkDetail(remark);
                                                                            if (!remark.viewedAt) {
                                                                                markRemarkViewed(remark.id)
                                                                                    .then(() => {
                                                                                        // optimistically update local state
                                                                                        setRecords(prev => prev ? {
                                                                                            ...prev,
                                                                                            remarks: prev.remarks.map(r => r.id === remark.id ? { ...r, viewedAt: new Date().toISOString() } : r)
                                                                                        } : prev);
                                                                                    })
                                                                                    .catch(console.error);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Eye className="w-3 h-3" /> Ver
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    );
                                });
                            })()}
                        </motion.div>
                    </TabsContent>}

                    {/* ── IMPROVEMENT PLANS (planes de mejoramiento) ────────────────── */}
                    <TabsContent value="improvement" className="m-0 border-none p-0 outline-none">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                            
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="text-lg font-black text-foreground">Planes de Mejoramiento</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">Gestión y seguimiento de compromisos académicos de superación.</p>
                                </div>
                                {currentUserRole === "teacher" && (
                                    <Button 
                                        onClick={() => setPlanFormDialog({
                                            open: true,
                                            planNumber: `PM-${improvementPlans.length + 1}-${new Date().getFullYear()}`,
                                            teacherDocUrl: "",
                                            startDate: new Date().toISOString().substring(0, 10),
                                            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
                                            observations: "",
                                            planScore: "",
                                            finalGrade: "",
                                            evidenceUrl: ""
                                        })}
                                        className="gap-2 cursor-pointer font-bold h-12"
                                    >
                                        <FileText className="w-4 h-4" /> Crear Plan de Mejoramiento
                                    </Button>
                                )}
                            </div>

                            {improvementLoading ? (
                                <div className="flex justify-center items-center py-12">
                                    <LoadingSpinner />
                                </div>
                            ) : improvementPlans.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-muted/5 text-muted-foreground">
                                    <FileText className="w-12 h-12 mb-4 opacity-50 text-muted-foreground" />
                                    <p className="font-semibold text-base">Sin Planes de Mejoramiento</p>
                                    <p className="text-sm text-center mt-1">No se registran planes de mejoramiento asignados para este estudiante.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {improvementPlans.map((plan) => {
                                        // ── Compute step completion ──
                                        const step1Done = !!plan.teacherDocUrl;
                                        const step2Done = !!plan.signedDocUrl;
                                        const step3Done = !!(plan as any).teacherSignedDocUrl;
                                        const isPastEnd = new Date() > fromUTC(plan.endDate);
                                        const step4Done = isPastEnd && (plan.planScore !== null || plan.finalGrade !== null || !!plan.evidenceUrl);

                                        // ── Date progress bar ──
                                        const nowMs = Date.now();
                                        const startMs = fromUTC(plan.startDate).getTime();
                                        const endMs = fromUTC(plan.endDate).getTime();
                                        const datePct = Math.min(100, Math.max(0, Math.round(((nowMs - startMs) / (endMs - startMs)) * 100)));
                                        const daysTotal = Math.max(1, Math.round((endMs - startMs) / 86400000));
                                        const daysPassed = Math.max(0, Math.round((nowMs - startMs) / 86400000));

                                        const steps = [
                                            { label: "Plan creado", sub: "Docente", done: step1Done, active: !step1Done, locked: false },
                                            { label: "Mi firma", sub: "Aprendiz", done: step2Done, active: step1Done && !step2Done, locked: false },
                                            { label: "Prof. firma", sub: "Docente", done: step3Done, active: step2Done && !step3Done, locked: false },
                                            { label: "Evaluación", sub: isPastEnd ? "Disponible" : "Al finalizar", done: !!step4Done, active: step3Done && isPastEnd && !step4Done, locked: !isPastEnd && !step4Done },
                                        ];

                                        return (
                                            <Card key={plan.id} className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow">
                                                <CardHeader className="bg-muted/10 border-b p-5 pb-4">
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className="text-base font-black text-foreground">Plan N° {plan.planNumber}</h4>
                                                                {plan.viewedAt ? (
                                                                    <Badge variant="outline" className="text-[10px] py-0 px-2 text-emerald-700 border-emerald-200 bg-emerald-50 gap-0.5 font-bold" title={`Revisado el ${format(new Date(plan.viewedAt), "dd/MM/yyyy HH:mm")}`}>
                                                                        <Eye className="w-3 h-3" /> Revisado
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-[10px] py-0 px-2 text-amber-700 border-amber-200 bg-amber-50 gap-0.5 font-bold">
                                                                        <EyeOff className="w-3 h-3" /> No revisado
                                                                    </Badge>
                                                                )}
                                                                {plan.finalGrade !== null && plan.finalGrade !== undefined && (
                                                                    <Badge variant="outline" className="text-[10px] py-0 px-2 text-blue-700 border-blue-200 bg-blue-50 font-extrabold">
                                                                        Nota Final: {plan.finalGrade.toFixed(1)}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-medium">
                                                                <span><strong className="text-foreground font-semibold">Inicio:</strong> {format(fromUTC(plan.startDate), "dd MMM yyyy", { locale: es })}</span>
                                                                <span><strong className="text-foreground font-semibold">Límite:</strong> {format(fromUTC(plan.endDate), "dd MMM yyyy", { locale: es })}</span>
                                                                <span><strong className="text-foreground font-semibold">Docente:</strong> {formatName(plan.teacher.name, plan.teacher.profile)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto mt-2 sm:mt-0 justify-start sm:justify-end">
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                onClick={() => handleViewPlan(plan)}
                                                                className="h-8 text-xs font-bold gap-1 cursor-pointer w-full sm:w-auto justify-center"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> Ver Detalle
                                                            </Button>
                                                            {(currentUserRole === "teacher" || currentUserRole === "admin") && (
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    onClick={() => handleEmailPlan(plan)}
                                                                    className="h-8 text-xs font-bold gap-1 text-sky-600 border-sky-200 hover:bg-sky-50 hover:text-sky-700 cursor-pointer w-full sm:w-auto justify-center"
                                                                >
                                                                    <Mail className="w-3.5 h-3.5" /> Enviar Correo
                                                                </Button>
                                                            )}
                                                            {(currentUserRole === "teacher" || currentUserRole === "admin") && (
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    onClick={() => handleDeletePlan(plan.id)}
                                                                    className="h-8 text-xs font-bold gap-1 text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive cursor-pointer w-full sm:w-auto justify-center"
                                                                >
                                                                    Eliminar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardHeader>

                                                <CardContent className="p-5 space-y-4">
                                                    {plan.observations && (
                                                        <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 border border-muted p-3.5 rounded-xl text-left">
                                                            <strong className="text-foreground block font-bold mb-1">Observaciones del compromiso:</strong>
                                                            {plan.observations}
                                                        </div>
                                                    )}

                                                    {/* ── Temporal progress bar ── */}
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                                                            <span>Progreso temporal del plan</span>
                                                            <span className={datePct >= 100 ? "text-red-500 font-bold" : "text-primary font-semibold"}>
                                                                {datePct}% · {Math.min(daysPassed, daysTotal)}/{daysTotal} días
                                                            </span>
                                                        </div>
                                                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ${datePct >= 100 ? "bg-red-500" : datePct >= 75 ? "bg-amber-500" : "bg-primary"}`}
                                                                style={{ width: `${datePct}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* ── 4-Step Stepper ── */}
                                                    <div className="relative grid grid-cols-4 gap-2 py-2">
                                                        <div className="absolute top-6 left-[12.5%] right-[12.5%] h-0.5 bg-border z-0" />
                                                        {steps.map((step, idx) => (
                                                            <div key={idx} className="flex flex-col items-center gap-1.5 relative z-10">
                                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all shadow-sm ${
                                                                    step.done
                                                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                                                        : step.locked
                                                                            ? "bg-muted border-border text-muted-foreground"
                                                                            : step.active
                                                                                ? "bg-primary border-primary text-primary-foreground ring-2 ring-primary/30"
                                                                                : "bg-background border-muted text-muted-foreground"
                                                                }`}>
                                                                    {step.done ? (
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                    ) : step.locked ? (
                                                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                                                    ) : (
                                                                        <span>{idx + 1}</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-center">
                                                                    <p className={`text-[10px] font-semibold leading-tight ${
                                                                        step.done ? "text-emerald-600" : step.active ? "text-primary" : "text-muted-foreground"
                                                                    }`}>{step.label}</p>
                                                                    <p className="text-[9px] text-muted-foreground">{step.sub}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* ── Step action areas ── */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        {/* Documento del plan (Step 1) */}
                                                        <div className="p-3 bg-background border rounded-xl flex flex-col gap-1 text-left">
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Paso 1 — Documento del Plan</span>
                                                            {plan.teacherDocUrl ? (
                                                                <a href={plan.teacherDocUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-bold flex items-center gap-1 mt-1">
                                                                    <ExternalLink className="w-3.5 h-3.5" /> Descargar y Firmar
                                                                </a>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic mt-1">Sin documento cargado</span>
                                                            )}
                                                        </div>

                                                        {/* Firma estudiante (Step 2) */}
                                                        <div className="p-3 bg-background border rounded-xl flex flex-col gap-1 text-left">
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Paso 2 — Mi Firma</span>
                                                            {plan.signedDocUrl ? (
                                                                <div className="flex items-center justify-between gap-2 mt-1">
                                                                    <a href={plan.signedDocUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline font-bold flex items-center gap-1 truncate">
                                                                        <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Ver Documento Firmado
                                                                    </a>
                                                                    {currentUserRole === "teacher" && (
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            onClick={() => handleDeleteSignedDoc(plan.id)}
                                                                            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md shrink-0 cursor-pointer"
                                                                            title="Eliminar firma del estudiante"
                                                                        >
                                                                            <UserX className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-1 mt-1">
                                                                    <span className="text-xs text-muted-foreground italic">Pendiente de firma del aprendiz</span>
                                                                    {currentUserRole === "student" && (
                                                                        <Button 
                                                                            size="sm" 
                                                                            variant="outline" 
                                                                            onClick={() => setSignedDocDialog({ open: true, planId: plan.id, signedDocUrl: "" })}
                                                                            className="h-7 text-[10px] font-bold mt-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                                                                        >
                                                                            Subir Firma
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Evidencias evaluación (Step 4) */}
                                                        <div className="p-3 bg-background border rounded-xl flex flex-col gap-1 text-left">
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Paso 4 — Evidencias</span>
                                                            {plan.evidenceUrl ? (
                                                                <a href={plan.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-bold flex items-center gap-1 mt-1">
                                                                    <ExternalLink className="w-3.5 h-3.5" /> Ver Evidencias
                                                                </a>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic mt-1">{isPastEnd ? "Sin evidencias registradas" : "Disponible al vencer el plan"}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Paso 3 — Firma del docente (read-only display) */}
                                                    {step2Done && (
                                                        <div className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                                                            step3Done
                                                                ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200"
                                                                : "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200"
                                                        }`}>
                                                            <FileText className={`w-4 h-4 shrink-0 ${step3Done ? "text-emerald-600" : "text-blue-600"}`} />
                                                            {step3Done ? (
                                                                <a href={(plan as any).teacherSignedDocUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 hover:underline font-semibold flex-1 truncate">
                                                                    Paso 3 — Docente firmó. Ver documento
                                                                </a>
                                                            ) : (
                                                                <p className="text-xs text-blue-700 dark:text-blue-400">Paso 3 — Esperando firma del docente...</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {(plan.planScore !== null || plan.finalGrade !== null) && (
                                                        <div className="border-t pt-4 mt-2 grid grid-cols-2 gap-4">
                                                            <div className="space-y-1 bg-primary/5 p-3 rounded-xl border border-primary/20">
                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Calificación Plan</span>
                                                                <span className="text-lg font-black text-primary">
                                                                    {plan.planScore !== null && plan.planScore !== undefined ? plan.planScore.toFixed(1) : "N/D"}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-1 bg-blue-50/50 p-3 rounded-xl border border-blue-200">
                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Nota Final</span>
                                                                <span className="text-lg font-black text-blue-700">
                                                                    {plan.finalGrade !== null && plan.finalGrade !== undefined ? plan.finalGrade.toFixed(1) : "N/D"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    </TabsContent>

                    {/* ── ANALYTICS (charts only) ────────────────────────────── */}
                    {!onlyImprovement && (
                        <TabsContent value="analytics" className="m-0 border-none p-0 outline-none">
                            {analyticsContent}
                        </TabsContent>
                    )}
                </Tabs>
            )}

            {/* Activity Detail Modal — full screen */}
            <Dialog open={!!activityDetail} onOpenChange={open => { if (!open) setActivityDetail(null); }}>
                <DialogContent className="!fixed !inset-0 !max-w-none !max-h-none !w-screen !h-screen !rounded-none !translate-x-0 !translate-y-0 flex flex-col p-0 gap-0">

                    {/* Header */}
                    <DialogHeader className="shrink-0 px-6 py-4 border-b bg-background flex flex-row items-center gap-3">
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-xl font-black leading-tight">{activityDetail?.title}</DialogTitle>
                            <DialogDescription className="text-xs mt-0.5">Descripción e instrucciones de la actividad.</DialogDescription>
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setActivityDetail(null)}>
                            Cerrar
                        </Button>
                    </DialogHeader>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                        {/* Description */}
                        {activityDetail?.description ? (
                            <div className="prose prose-sm max-w-none border rounded-lg p-5 bg-muted/5" data-color-mode="auto">
                                <MDEditor.Markdown
                                    source={activityDetail.description}
                                    style={{ background: 'transparent', color: 'inherit' }}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                <FileText className="w-12 h-12 mb-3 opacity-40" />
                                <p className="text-sm">El profesor no ha agregado instrucciones para esta actividad.</p>
                            </div>
                        )}

                        {/* Submission Link section */}
                        {activityDetail?.allowSubmissionLink && (
                            <div className="p-5 rounded-lg border bg-primary/5 border-primary/20 space-y-3 max-w-2xl">
                                <div className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-primary shrink-0" />
                                    <span className="font-semibold text-sm">Entrega requerida</span>
                                    {activityDetail.grade?.submissionLink && (
                                        <Badge variant="outline" className="ml-auto text-emerald-700 border-emerald-300 bg-emerald-50 text-xs">
                                            Entregado
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Esta actividad requiere que envíes un enlace con tu trabajo (Google Drive, GitHub, Notion, etc.).
                                </p>

                                {activityDetail.grade?.submissionLink ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 p-2 rounded-md bg-background border text-sm">
                                            <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0" />
                                            <a href={activityDetail.grade.submissionLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1 text-xs">
                                                {activityDetail.grade.submissionLink}
                                            </a>
                                        </div>
                                        <Button size="sm" variant="outline" className="w-full gap-2"
                                            onClick={() => {
                                                setSubmissionLinkInput(activityDetail.grade.submissionLink);
                                                setSubmissionDialog({ open: true, activityId: activityDetail.activityId, activityTitle: activityDetail.title, currentLink: activityDetail.grade.submissionLink });
                                                setActivityDetail(null);
                                            }}>
                                            <Link2 className="w-4 h-4" /> Actualizar enlace
                                        </Button>
                                    </div>
                                ) : (
                                    <Button className="w-full gap-2"
                                        onClick={() => {
                                            setSubmissionLinkInput("");
                                            setSubmissionDialog({ open: true, activityId: activityDetail.activityId, activityTitle: activityDetail.title, currentLink: "" });
                                            setActivityDetail(null);
                                        }}>
                                        <Link2 className="w-4 h-4" /> Enviar Enlace de Entrega
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Submission Link Dialog */}
            <Dialog open={!!submissionDialog} onOpenChange={open => { if (!open) setSubmissionDialog(null); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-primary" />
                            Enviar Enlace de Entrega
                        </DialogTitle>
                        <DialogDescription>
                            Actividad: <strong>{submissionDialog?.activityTitle}</strong>. Pega el enlace de tu trabajo (Google Drive, GitHub, etc.).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label htmlFor="submission-url">URL de la entrega *</Label>
                        <Input
                            id="submission-url"
                            type="url"
                            placeholder="https://drive.google.com/..."
                            value={submissionLinkInput}
                            onChange={e => setSubmissionLinkInput(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Asegúrate de que el enlace sea accesible para el docente (sin restricciones de acceso).</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSubmissionDialog(null)} disabled={isSubmittingLink}>Cancelar</Button>
                        <Button onClick={handleSubmitLink} disabled={isSubmittingLink} className="gap-2">
                            <Link2 className="w-4 h-4" />
                            {isSubmittingLink ? "Enviando..." : "Confirmar Entrega"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Observation Detail Modal — full screen */}
            <Dialog open={!!remarkDetail} onOpenChange={open => { if (!open) setRemarkDetail(null); }}>
                <DialogContent className="!fixed !inset-0 !max-w-none !max-h-none !w-screen !h-screen !rounded-none !translate-x-0 !translate-y-0 flex flex-col p-0 gap-0">
                    {/* Header */}
                    <DialogHeader className="shrink-0 px-6 py-4 border-b bg-background flex flex-row items-center gap-3">
                        <ShieldAlert className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-xl font-black leading-tight">{remarkDetail?.title}</DialogTitle>
                            <DialogDescription className="text-xs mt-0.5">
                                Observación de {remarkDetail?.course?.title} — Docente: {remarkDetail ? formatTeacherName(remarkDetail.teacher) : ""}
                            </DialogDescription>
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setRemarkDetail(null)}>
                            Cerrar
                        </Button>
                    </DialogHeader>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                        <div className="max-w-3xl space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo:</span>
                                {remarkDetail && (
                                    <Badge variant="outline" className={`text-xs font-bold uppercase tracking-wider ${
                                        remarkDetail.type === 'ATTENTION' ? 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20' :
                                        remarkDetail.type === 'COMMENDATION' ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20' :
                                        remarkDetail.type === 'CITATION' ? 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20' :
                                        'text-gray-600 border-gray-200 bg-gray-50 dark:bg-gray-950/20'
                                    }`}>
                                        {remarkDetail.type === 'ATTENTION' ? 'Llamado de Atención' :
                                         remarkDetail.type === 'COMMENDATION' ? 'Felicitación' :
                                         remarkDetail.type === 'CITATION' ? 'Citación' : 'Otra'}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha:</span>
                                <span className="text-sm font-medium">
                                    {remarkDetail?.date && format(new Date(remarkDetail.date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                                </span>
                            </div>

                            <div className="border-t pt-4 space-y-2">
                                <h4 className="font-bold text-base">Descripción / Detalle</h4>
                                <div className="prose prose-sm max-w-none border rounded-lg p-5 bg-muted/5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                    {remarkDetail?.description}
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Justification Dialog */}
            <Dialog open={!!viewingJustification} onOpenChange={open => { if (!open) setViewingJustification(null); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            Detalle de Justificación
                        </DialogTitle>
                        <DialogDescription>
                            Soporte enviado para el registro de asistencia del{" "}
                            <strong>
                                {viewingJustification?.date && format(new Date(viewingJustification.date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                            </strong>
                            .
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block">Inasistencia / Retardo</span>
                            <Badge variant="outline" className="text-xs font-bold text-amber-600 border-amber-200 bg-amber-50">
                                {viewingJustification?.statusName}
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block">Motivo de Justificación</span>
                            <div className="p-3 bg-muted rounded-lg text-sm border font-medium text-foreground whitespace-pre-wrap">
                                {viewingJustification?.justification}
                            </div>
                        </div>
                        {viewingJustification?.url && (
                            <div className="space-y-1.5">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block">Enlace de Soporte</span>
                                <a
                                    href={viewingJustification.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-bold bg-primary/5 border border-primary/20 px-3 py-2 rounded-lg"
                                >
                                    <LinkIcon className="w-3.5 h-3.5" />
                                    Ver Documento Soporte Externo
                                </a>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setViewingJustification(null)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Confirm Delete Justification Alert Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar esta justificación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar esta justificación? El estudiante tendrá que volver a justificar esta inasistencia/retardo para que pueda ser considerada válida.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setAttendanceIdToDelete(null); }}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteJustification}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Plan Form Dialog (Create / Edit) */}
            <Dialog open={!!planFormDialog} onOpenChange={(open) => !open && setPlanFormDialog(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold text-lg">
                            <FileText className="w-5 h-5 text-primary" />
                            {planFormDialog?.id ? "Editar Plan de Mejoramiento" : "Crear Plan de Mejoramiento"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define los compromisos de superación para el aprendiz. Los campos con (*) son obligatorios.
                        </DialogDescription>
                    </DialogHeader>
                    {planFormDialog && (
                        <form onSubmit={handleUpsertPlan} className="space-y-4 py-2 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground">Número de Plan *</Label>
                                    <Input 
                                        required
                                        placeholder="Ej. PM-01-2026" 
                                        value={planFormDialog.planNumber}
                                        onChange={e => setPlanFormDialog(prev => prev ? { ...prev, planNumber: e.target.value } : null)}
                                        className="h-12 rounded-lg bg-background"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground">Documento del Plan (Enlace) *</Label>
                                    <Input 
                                        type="url"
                                        placeholder="https://drive.google.com/..." 
                                        value={planFormDialog.teacherDocUrl}
                                        onChange={e => setPlanFormDialog(prev => prev ? { ...prev, teacherDocUrl: e.target.value } : null)}
                                        className="h-12 rounded-lg bg-background"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground">Fecha Inicio *</Label>
                                    <Input 
                                        required
                                        type="date" 
                                        value={planFormDialog.startDate}
                                        onChange={e => setPlanFormDialog(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                                        className="h-12 rounded-lg bg-background"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground">Fecha Límite *</Label>
                                    <Input 
                                        required
                                        type="date" 
                                        value={planFormDialog.endDate}
                                        onChange={e => setPlanFormDialog(prev => prev ? { ...prev, endDate: e.target.value } : null)}
                                        className="h-12 rounded-lg bg-background"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-muted-foreground">Observaciones / Compromisos</Label>
                                <Textarea 
                                    placeholder="Describe los criterios, actividades a realizar y acuerdos..." 
                                    value={planFormDialog.observations}
                                    onChange={e => setPlanFormDialog(prev => prev ? { ...prev, observations: e.target.value } : null)}
                                    className="min-h-[90px] rounded-lg bg-background p-3 text-xs resize-none"
                                />
                            </div>

                            {planFormDialog.id && (
                                <div className="border-t pt-4 mt-2 space-y-4">
                                    <h4 className="font-bold text-sm text-foreground">Evaluación y Resultado</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-muted-foreground">Calificación Plan (0.0 - 5.0)</Label>
                                            <Input 
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="5"
                                                placeholder="Ej. 4.5"
                                                value={planFormDialog.planScore}
                                                onChange={e => setPlanFormDialog(prev => prev ? { ...prev, planScore: e.target.value === "" ? "" : parseFloat(e.target.value) } : null)}
                                                className="h-12 rounded-lg bg-background"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-muted-foreground">Nota Final Obtenida (0.0 - 5.0)</Label>
                                            <Input 
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="5"
                                                placeholder="Ej. 3.8"
                                                value={planFormDialog.finalGrade}
                                                onChange={e => setPlanFormDialog(prev => prev ? { ...prev, finalGrade: e.target.value === "" ? "" : parseFloat(e.target.value) } : null)}
                                                className="h-12 rounded-lg bg-background"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-muted-foreground">Enlace a Evidencias de Evaluación</Label>
                                        <Input 
                                            type="url"
                                            placeholder="https://drive.google.com/..." 
                                            value={planFormDialog.evidenceUrl}
                                            onChange={e => setPlanFormDialog(prev => prev ? { ...prev, evidenceUrl: e.target.value } : null)}
                                            className="h-12 rounded-lg bg-background"
                                        />
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setPlanFormDialog(null)} className="h-12">Cancelar</Button>
                                <Button type="submit" className="font-bold h-12">Guardar Cambios</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Student Signed Document Submit Dialog */}
            <Dialog open={!!signedDocDialog} onOpenChange={(open) => !open && setSignedDocDialog(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold text-base">
                            <Link2 className="w-5 h-5 text-primary" />
                            Subir Documento Firmado
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Pega el enlace del plan de mejoramiento con tu firma y la del instructor (Google Drive, OneDrive, etc.).
                        </DialogDescription>
                    </DialogHeader>
                    {signedDocDialog && (
                        <form onSubmit={handleSignedDocSubmit} className="space-y-4 py-2 text-left">
                            <div className="space-y-1.5">
                                <Label htmlFor="signed-doc-url" className="text-xs font-bold text-muted-foreground">URL del Documento Firmado *</Label>
                                <Input
                                    id="signed-doc-url"
                                    type="url"
                                    required
                                    placeholder="https://drive.google.com/..."
                                    value={signedDocDialog.signedDocUrl}
                                    onChange={e => setSignedDocDialog(prev => prev ? { ...prev, signedDocUrl: e.target.value } : null)}
                                    className="h-12 rounded-lg bg-background"
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setSignedDocDialog(null)} className="h-12">Cancelar</Button>
                                <Button type="submit" className="font-bold h-12">Confirmar Entrega</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Plan Detail Dialog (Read-only Detail Modal) */}
            <Dialog open={!!viewPlanDetail} onOpenChange={(open) => !open && setViewPlanDetail(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold text-lg">
                            <FileText className="w-5 h-5 text-primary" />
                            Detalle de Plan de Mejoramiento N° {viewPlanDetail?.planNumber}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Información general, compromisos y estado de evaluación del plan.
                        </DialogDescription>
                    </DialogHeader>
                    {viewPlanDetail && (
                        <div className="space-y-5 py-2 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Docente Asignador</span>
                                    <span className="text-sm font-semibold">{formatName(viewPlanDetail.teacher.name, viewPlanDetail.teacher.profile)}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Estado de Revisión</span>
                                    {viewPlanDetail.viewedAt ? (
                                        <Badge variant="outline" className="text-xs font-bold text-emerald-700 border-emerald-200 bg-emerald-50 gap-0.5">
                                            <Eye className="w-3.5 h-3.5" /> Revisado el {format(new Date(viewPlanDetail.viewedAt), "dd/MM/yyyy HH:mm")}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs font-bold text-amber-700 border-amber-200 bg-amber-50 gap-0.5">
                                            <EyeOff className="w-3.5 h-3.5" /> No revisado aún
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Fecha de Inicio</span>
                                    <span className="text-sm font-semibold">{format(new Date(viewPlanDetail.startDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Fecha Límite de Entrega</span>
                                    <span className="text-sm font-semibold">{format(new Date(viewPlanDetail.endDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}</span>
                                </div>
                            </div>

                            {viewPlanDetail.observations && (
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Compromisos / Criterios de Evaluación</span>
                                    <div className="p-3.5 bg-muted/40 border border-muted/70 rounded-xl text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                                        {viewPlanDetail.observations}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Paso 1: Plan Docente</span>
                                    {viewPlanDetail.teacherDocUrl ? (
                                        <a href={viewPlanDetail.teacherDocUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-bold">
                                            <ExternalLink className="w-3.5 h-3.5" /> Ver Documento
                                        </a>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">No cargado</span>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Paso 2: Firma Aprendiz</span>
                                    {viewPlanDetail.signedDocUrl ? (
                                        <a href={viewPlanDetail.signedDocUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline font-bold">
                                            <ExternalLink className="w-3.5 h-3.5" /> Ver Firmado
                                        </a>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">Pendiente de firma</span>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Paso 3: Firma Docente</span>
                                    {(viewPlanDetail as any).teacherSignedDocUrl ? (
                                        <a href={(viewPlanDetail as any).teacherSignedDocUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-bold">
                                            <ExternalLink className="w-3.5 h-3.5" /> Ver Contrafirma
                                        </a>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">Pendiente de firma</span>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Paso 4: Evidencia</span>
                                    {viewPlanDetail.evidenceUrl ? (
                                        <a href={viewPlanDetail.evidenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-bold">
                                            <ExternalLink className="w-3.5 h-3.5" /> Ver Evidencia
                                        </a>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">No evaluado</span>
                                    )}
                                </div>
                            </div>

                            {(viewPlanDetail.planScore !== null || viewPlanDetail.finalGrade !== null) && (
                                <div className="border-t pt-4 mt-2 grid grid-cols-2 gap-4">
                                    <div className="space-y-1 bg-primary/5 p-3 rounded-xl border border-primary/20">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Calificación Plan</span>
                                        <span className="text-lg font-black text-primary">
                                            {viewPlanDetail.planScore !== null && viewPlanDetail.planScore !== undefined ? viewPlanDetail.planScore.toFixed(1) : "N/D"}
                                        </span>
                                    </div>
                                    <div className="space-y-1 bg-blue-50/50 p-3 rounded-xl border border-blue-200">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Nota Final</span>
                                        <span className="text-lg font-black text-blue-700">
                                            {viewPlanDetail.finalGrade !== null && viewPlanDetail.finalGrade !== undefined ? viewPlanDetail.finalGrade.toFixed(1) : "N/D"}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="border-t pt-4">
                                <Button onClick={() => setViewPlanDetail(null)} className="h-12">Cerrar</Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            {/* Shadcn UI Delete Plan Alert */}
            <AlertDialog open={!!impDeleteConfirm} onOpenChange={(o) => !o && setImpDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Plan de Mejoramiento?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar este plan de mejoramiento? Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setImpDeleteConfirm(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={onConfirmDeletePlan} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Shadcn UI Delete Student Document Alert */}
            <AlertDialog open={!!docDeleteConfirm} onOpenChange={(o) => !o && setDocDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Documento Firmado?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar la firma/documento del estudiante? Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDocDeleteConfirm(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={onConfirmDeleteSignedDoc} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
