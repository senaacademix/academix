"use client";

import React, { useState, useMemo } from "react";
import { 
    ClipboardList, 
    Search, 
    Filter, 
    User, 
    Calendar, 
    GraduationCap, 
    BookOpen, 
    Eye, 
    ExternalLink, 
    FileText, 
    Layers,
    ChevronDown,
    ChevronRight,
    CheckSquare,
    Mail,
    EyeOff
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface AdminImprovementPlansProps {
    plans: any[];
}

export function AdminImprovementPlans({ plans }: AdminImprovementPlansProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGroupFilter, setSelectedGroupFilter] = useState("all");
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
    const [viewPlanDetail, setViewPlanDetail] = useState<any | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

    // Toggle expand collapse
    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const toggleSubject = (key: string) => {
        setExpandedSubjects(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Filter plans based on search and filters
    const filteredPlans = useMemo(() => {
        return plans.filter(plan => {
            const studentName = (plan.student?.name || "").toLowerCase();
            const studentNombres = (plan.student?.profile?.nombres || "").toLowerCase();
            const studentApellido = (plan.student?.profile?.apellido || "").toLowerCase();
            const teacherName = (plan.teacher?.name || "").toLowerCase();
            const teacherNombres = (plan.teacher?.profile?.nombres || "").toLowerCase();
            const teacherApellido = (plan.teacher?.profile?.apellido || "").toLowerCase();
            const planNumber = (plan.planNumber || "").toLowerCase();
            const matchesSearch = 
                studentName.includes(searchTerm.toLowerCase()) ||
                studentNombres.includes(searchTerm.toLowerCase()) ||
                studentApellido.includes(searchTerm.toLowerCase()) ||
                teacherName.includes(searchTerm.toLowerCase()) ||
                teacherNombres.includes(searchTerm.toLowerCase()) ||
                teacherApellido.includes(searchTerm.toLowerCase()) ||
                planNumber.includes(searchTerm.toLowerCase());

            const studentGroupId = plan.student?.groupId || "no-group";
            const matchesGroup = selectedGroupFilter === "all" || studentGroupId === selectedGroupFilter;
            const matchesSubject = selectedSubjectFilter === "all" || plan.subject === selectedSubjectFilter;

            return matchesSearch && matchesGroup && matchesSubject;
        });
    }, [plans, searchTerm, selectedGroupFilter, selectedSubjectFilter]);

    // Unique groups for filtering
    const groups = useMemo(() => {
        const map = new Map<string, string>();
        plans.forEach(plan => {
            if (plan.student?.group) {
                map.set(plan.student.group.id, plan.student.group.name);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [plans]);

    // Unique subjects for filtering
    const subjects = useMemo(() => {
        const set = new Set<string>();
        plans.forEach(plan => {
            if (plan.subject) set.add(plan.subject);
        });
        return Array.from(set).sort();
    }, [plans]);

    // Group plans by student's group, and then by subject (materia)
    const groupedData = useMemo(() => {
        const groupsMap: Record<string, { groupName: string; subjects: Record<string, any[]> }> = {};

        filteredPlans.forEach(plan => {
            const groupName = plan.student?.group?.name || "Sin Grupo / Desvinculados";
            const groupId = plan.student?.groupId || "no-group";
            const subject = plan.subject || "General / Otras asignaturas";

            if (!groupsMap[groupId]) {
                groupsMap[groupId] = {
                    groupName,
                    subjects: {}
                };
            }

            if (!groupsMap[groupId].subjects[subject]) {
                groupsMap[groupId].subjects[subject] = [];
            }

            groupsMap[groupId].subjects[subject].push(plan);
        });

        // Initialize expand status for active groups/subjects
        return Object.entries(groupsMap).map(([groupId, groupData]) => ({
            groupId,
            groupName: groupData.groupName,
            subjects: Object.entries(groupData.subjects).map(([subjectName, planList]) => ({
                subjectName,
                plans: planList.sort((a, b) => (a.student?.name || "").localeCompare(b.student?.name || ""))
            })).sort((a, b) => a.subjectName.localeCompare(b.subjectName))
        })).sort((a, b) => a.groupName.localeCompare(b.groupName));
    }, [filteredPlans]);

    const formatName = (fullName: string, profile: any) => {
        if (profile?.nombres && profile?.apellido) {
            return `${profile.nombres} ${profile.apellido}`;
        }
        return fullName || "Usuario AcademiX";
    };

    const handleImpEmail = (plan: any) => {
        const studentEmail = plan.student?.email || "";
        const studentName = formatName(plan.student?.name, plan.student?.profile);
        const teacherName = formatName(plan.teacher?.name, plan.teacher?.profile);
        const subject = encodeURIComponent(`Plan de Mejoramiento Académico - ${plan.planNumber}`);
        let bodyText = `Hola, ${studentName}.\n\n`;
        bodyText += `Se ha registrado el Plan de Mejoramiento Académico N° ${plan.planNumber} en la plataforma AcademiX.\n\n`;
        bodyText += `Detalles del Plan:\n`;
        bodyText += `- Fecha de Inicio: ${format(new Date(plan.startDate), "dd/MM/yyyy")}\n`;
        bodyText += `- Fecha de Finalización: ${format(new Date(plan.endDate), "dd/MM/yyyy")}\n`;
        bodyText += `- Docente: ${teacherName}\n`;
        if (plan.teacherDocUrl) bodyText += `- Documento del Plan: ${plan.teacherDocUrl}\n`;
        if (plan.observations) bodyText += `- Observaciones/Criterios: ${plan.observations}\n`;
        bodyText += `\nPor favor ingresa a la plataforma AcademiX para revisar el plan en detalle, firmarlo y cargar el documento firmado.\n\nAtentamente,\n${teacherName}`;
        window.location.href = `mailto:${studentEmail}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                    <ClipboardList className="w-8 h-8 text-primary" />
                    Planes de Mejoramiento
                </h1>
                <p className="text-muted-foreground text-sm">
                    Monitoreo y consulta general de planes creados por instructores agrupados por fichas y materias.
                </p>
                <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400 max-w-3xl">
                    <svg className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="leading-relaxed text-left">
                        <strong>Información Importante:</strong> Los planes de mejoramiento no afectan de forma automática la analítica de rendimiento académico del estudiante en la plataforma. Es responsabilidad exclusiva del profesor/instructor pasar y registrar los resultados definitivos en el módulo de calificaciones de forma manual.
                    </p>
                </div>
            </div>

            {/* Filters Card */}
            <Card className="border-none shadow-xl bg-card">
                <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar aprendiz, instructor o N° de plan..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-11 rounded-xl bg-background border-muted text-xs"
                            />
                        </div>

                        {/* Group Filter */}
                        <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                            <SelectTrigger className="h-11 rounded-xl bg-background border-muted text-xs">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-muted-foreground" />
                                    <SelectValue placeholder="Filtrar por Grupo (Ficha)" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Grupos / Fichas</SelectItem>
                                {groups.map(g => (
                                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Subject Filter */}
                        <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
                            <SelectTrigger className="h-11 rounded-xl bg-background border-muted text-xs">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                                    <SelectValue placeholder="Filtrar por Asignatura" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Asignaturas</SelectItem>
                                {subjects.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Grouped Plans List */}
            <div className="space-y-4">
                {groupedData.length === 0 ? (
                    <Card className="border-none shadow-md py-12 text-center bg-card">
                        <CardContent className="flex flex-col items-center justify-center space-y-3">
                            <ClipboardList className="w-12 h-12 text-muted-foreground/40" />
                            <h3 className="font-bold text-lg text-muted-foreground">No se encontraron planes</h3>
                            <p className="text-xs text-muted-foreground max-w-sm">
                                No hay planes de mejoramiento registrados que coincidan con los criterios de búsqueda actuales.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    groupedData.map(group => {
                        const isGroupExpanded = expandedGroups[group.groupId] !== false; // Default true
                        return (
                            <div key={group.groupId} className="border border-border/50 rounded-2xl bg-card/45 overflow-hidden shadow-sm">
                                {/* Group Title Banner */}
                                <button
                                    onClick={() => toggleGroup(group.groupId)}
                                    className="w-full flex items-center justify-between p-4 bg-muted/40 hover:bg-muted/65 transition-colors text-left border-b border-border/40"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Layers className="w-5 h-5 text-primary" />
                                        <div>
                                            <h2 className="font-extrabold text-base text-foreground">{group.groupName}</h2>
                                            <p className="text-[10px] text-muted-foreground font-semibold">
                                                {group.subjects.reduce((acc, s) => acc + s.plans.length, 0)} Planes en total
                                            </p>
                                        </div>
                                    </div>
                                    {isGroupExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                                </button>

                                {isGroupExpanded && (
                                    <div className="p-4 space-y-4 bg-card">
                                        {group.subjects.map(subj => {
                                            const subjectKey = `${group.groupId}-${subj.subjectName}`;
                                            const isSubjectExpanded = expandedSubjects[subjectKey] !== false; // Default true
                                            return (
                                                <div key={subj.subjectName} className="border border-border/40 rounded-xl overflow-hidden bg-background">
                                                    {/* Subject/Matter Title Banner */}
                                                    <button
                                                        onClick={() => toggleSubject(subjectKey)}
                                                        className="w-full flex items-center justify-between p-3 bg-muted/20 hover:bg-muted/30 transition-colors text-left border-b border-border/30"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <BookOpen className="w-4 h-4 text-indigo-500" />
                                                            <h3 className="font-bold text-sm text-foreground">{subj.subjectName}</h3>
                                                            <Badge variant="secondary" className="text-[10px] h-5 py-0 px-2 bg-indigo-500/10 text-indigo-600 border-none">
                                                                {subj.plans.length}
                                                            </Badge>
                                                        </div>
                                                        {isSubjectExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                                    </button>

                                                    {isSubjectExpanded && (
                                                        <div className="divide-y divide-border/30">
                                                            {subj.plans.map(plan => {
                                                                const studentName = formatName(plan.student?.name, plan.student?.profile);
                                                                const teacherName = formatName(plan.teacher?.name, plan.teacher?.profile);
                                                                
                                                                // Stepper steps computation
                                                                const step1Done = !!plan.teacherDocUrl;
                                                                const step2Done = !!plan.signedDocUrl;
                                                                const step3Done = !!plan.teacherSignedDocUrl;
                                                                const step4Done = !!plan.evidenceUrl;
                                                                const step5Done = plan.finalGrade !== null;

                                                                let currentStep = 1;
                                                                if (step5Done) currentStep = 5;
                                                                else if (step4Done) currentStep = 5;
                                                                else if (step3Done) currentStep = 4;
                                                                else if (step2Done) currentStep = 3;
                                                                else if (step1Done) currentStep = 2;

                                                                return (
                                                                    <div key={plan.id} className="p-4 hover:bg-muted/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                                        <div className="space-y-1 flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className="font-black text-sm text-foreground">Plan N° {plan.planNumber}</span>
                                                                                <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0.5 border-none ${
                                                                                    step5Done 
                                                                                        ? plan.finalGrade === 0
                                                                                            ? "bg-red-500/10 text-red-600"
                                                                                            : "bg-emerald-500/10 text-emerald-600" 
                                                                                        : "bg-amber-500/10 text-amber-600"
                                                                                }`}>
                                                                                    {step5Done 
                                                                                        ? plan.finalGrade === 0 
                                                                                            ? "No entregado a tiempo" 
                                                                                            : `Calificado: ${plan.finalGrade.toFixed(1)}` 
                                                                                        : `Paso Activo: ${currentStep}/5`}
                                                                                </Badge>
                                                                            </div>
                                                                            
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground pt-1">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <User className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                                                                                    <span>Aprendiz: <strong className="text-foreground/80">{studentName}</strong></span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <GraduationCap className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                                                                                    <span>Instructor: <strong className="text-primary/70">{teacherName}</strong></span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                                                                                    <span>Vence: <strong className="text-foreground/80">{format(new Date(plan.endDate), "dd/MM/yyyy")}</strong></span>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Action button */}
                                                                        <div className="shrink-0 flex items-center justify-end">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() => setViewPlanDetail(plan)}
                                                                                className="h-8 rounded-lg text-xs gap-1 border-muted hover:bg-muted/40 cursor-pointer"
                                                                            >
                                                                                <Eye className="w-3.5 h-3.5" />
                                                                                Ver Detalle
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Read-only Plan Detail Modal */}
            <Dialog open={!!viewPlanDetail} onOpenChange={(open) => !open && setViewPlanDetail(null)}>
                <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[85vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold text-lg">
                            <FileText className="w-5 h-5 text-primary" />
                            Detalle de Plan de Mejoramiento N° {viewPlanDetail?.planNumber}
                        </DialogTitle>
                    </DialogHeader>
                    {viewPlanDetail && (() => {
                        const step1Done = !!viewPlanDetail.teacherDocUrl;
                        const step2Done = !!viewPlanDetail.signedDocUrl;
                        const step3Done = !!viewPlanDetail.teacherSignedDocUrl;
                        const step4Done = !!viewPlanDetail.evidenceUrl;
                        const step5Done = viewPlanDetail.finalGrade !== null;

                        return (
                            <div className="space-y-5 py-2 text-left text-sm">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b pb-4">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Aprendiz</p>
                                        <p className="font-semibold text-foreground">{formatName(viewPlanDetail.student?.name, viewPlanDetail.student?.profile)}</p>
                                        <span className="text-[10px] text-muted-foreground block">{viewPlanDetail.student?.email}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Docente</p>
                                        <p className="font-semibold text-primary">{formatName(viewPlanDetail.teacher?.name, viewPlanDetail.teacher?.profile)}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fecha Inicio</p>
                                        <p className="font-medium text-foreground">{format(new Date(viewPlanDetail.startDate), "dd/MM/yyyy")}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fecha Fin</p>
                                        <p className="font-medium text-foreground">{format(new Date(viewPlanDetail.endDate), "dd/MM/yyyy")}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b pb-4">
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Ficha / Grupo</span>
                                        <span className="text-xs font-semibold text-foreground">{viewPlanDetail.student?.group?.name || "Sin grupo"}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Asignatura / Materia</span>
                                        <span className="text-xs font-semibold text-foreground">{viewPlanDetail.subject}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Estado de Revisión</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            {viewPlanDetail.viewedAt ? (
                                                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-none font-bold"><Eye className="w-3.5 h-3.5 mr-1" />Revisado por el aprendiz</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-none font-bold"><EyeOff className="w-3.5 h-3.5 mr-1" />No revisado aún</Badge>
                                            )}
                                        </div>
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

                                {/* Vertical Stepper Timeline */}
                                <div className="space-y-4 border-t pt-4">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Flujo de Cumplimiento (Pasos 1-5)</p>
                                    <TooltipProvider>
                                    <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                                        {/* Paso 1 */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-6 h-0.5 mt-3 bg-border" />
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className={`absolute -left-[41px] top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black z-10 transition-all cursor-help ${
                                                        step1Done ? "bg-emerald-500 border-emerald-500 text-white" : "bg-primary border-primary text-primary-foreground"
                                                    }`}>
                                                        {step1Done ? "✓" : "1"}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="max-w-[220px] p-3 text-xs rounded-xl shadow-lg bg-popover text-popover-foreground border border-border">
                                                    <div className="space-y-1 text-left">
                                                        <p className="font-bold text-primary">Paso 1: Plan Docente <span className="font-normal text-muted-foreground">(Docente)</span></p>
                                                        <p className="text-muted-foreground leading-snug">El instructor crea el plan de mejoramiento académico detallando compromisos, fechas y subiendo el documento inicial.</p>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-bold text-foreground">Paso 1: Plan Docente <span className="text-[10px] font-normal text-muted-foreground">(Docente)</span></h4>
                                                <p className="text-[11px] text-muted-foreground leading-snug">El instructor crea el plan de mejoramiento académico detallando compromisos, fechas y cargando el documento inicial.</p>
                                                {viewPlanDetail.teacherDocUrl ? (
                                                    <a href={viewPlanDetail.teacherDocUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-bold mt-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                        Descargar Plan Base
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic block mt-1">No cargado</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Paso 2 */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-6 h-0.5 mt-3 bg-border" />
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className={`absolute -left-[41px] top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black z-10 transition-all cursor-help ${
                                                        step2Done ? "bg-emerald-500 border-emerald-500 text-white" : step1Done ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border text-muted-foreground"
                                                    }`}>
                                                        {step2Done ? "✓" : "2"}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="max-w-[220px] p-3 text-xs rounded-xl shadow-lg bg-popover text-popover-foreground border border-border">
                                                    <div className="space-y-1 text-left">
                                                        <p className="font-bold text-primary">Paso 2: Firma del Aprendiz <span className="font-normal text-muted-foreground">(Aprendiz)</span></p>
                                                        <p className="text-muted-foreground leading-snug">El aprendiz debe descargar el documento inicial, firmarlo digitalmente y subir la copia firmada en aceptación.</p>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-bold text-foreground">Paso 2: Firma del Aprendiz <span className="text-[10px] font-normal text-muted-foreground">(Aprendiz)</span></h4>
                                                <p className="text-[11px] text-muted-foreground leading-snug">El aprendiz debe descargar el documento inicial, firmarlo digitalmente y subir la copia firmada en aceptación.</p>
                                                {viewPlanDetail.signedDocUrl ? (
                                                    <a href={viewPlanDetail.signedDocUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline font-bold mt-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                        Ver Documento Firmado
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic block mt-1">Pendiente de firma</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Paso 3 */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-6 h-0.5 mt-3 bg-border" />
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className={`absolute -left-[41px] top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black z-10 transition-all cursor-help ${
                                                        step3Done ? "bg-emerald-500 border-emerald-500 text-white" : step2Done ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border text-muted-foreground"
                                                    }`}>
                                                        {step3Done ? "✓" : "3"}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="max-w-[220px] p-3 text-xs rounded-xl shadow-lg bg-popover text-popover-foreground border border-border">
                                                    <div className="space-y-1 text-left">
                                                        <p className="font-bold text-primary">Paso 3: Firma del Docente <span className="font-normal text-muted-foreground">(Docente)</span></p>
                                                        <p className="text-muted-foreground leading-snug">El instructor revisa la firma del aprendiz, realiza la contrafirma docente y sube el documento final firmado.</p>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-bold text-foreground">Paso 3: Firma del Docente <span className="text-[10px] font-normal text-muted-foreground">(Docente)</span></h4>
                                                <p className="text-[11px] text-muted-foreground leading-snug">El instructor revisa la firma del aprendiz, realiza la contrafirma docente y sube el documento final firmado.</p>
                                                {viewPlanDetail.teacherSignedDocUrl ? (
                                                    <a href={viewPlanDetail.teacherSignedDocUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-bold mt-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                        Ver Documento Contrafirmado
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic block mt-1">Pendiente de contrafirma</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Paso 4 */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-6 h-0.5 mt-3 bg-border" />
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className={`absolute -left-[41px] top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black z-10 transition-all cursor-help ${
                                                        step4Done ? "bg-emerald-500 border-emerald-500 text-white" : step3Done ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border text-muted-foreground"
                                                    }`}>
                                                        {step4Done ? "✓" : "4"}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="max-w-[220px] p-3 text-xs rounded-xl shadow-lg bg-popover text-popover-foreground border border-border">
                                                    <div className="space-y-1 text-left">
                                                        <p className="font-bold text-primary">Paso 4: Evidencias <span className="font-normal text-muted-foreground">(Aprendiz)</span></p>
                                                        <p className="text-muted-foreground leading-snug">El aprendiz debe subir el enlace con los archivos o entregables que evidencien el cumplimiento de sus compromisos.</p>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-bold text-foreground">Paso 4: Evidencias de Evaluación <span className="text-[10px] font-normal text-muted-foreground">(Aprendiz)</span></h4>
                                                <p className="text-[11px] text-muted-foreground leading-snug">El aprendiz debe subir el enlace con los archivos o entregables que evidencien el cumplimiento de sus compromisos.</p>
                                                {viewPlanDetail.evidenceUrl ? (
                                                    <a href={viewPlanDetail.evidenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-bold mt-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                        Ver Evidencia Cargada
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic block mt-1">No cargada</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Paso 5 */}
                                        <div className="relative">
                                            <div className="absolute -left-[30px] top-0 w-6 h-0.5 mt-3 bg-border" />
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className={`absolute -left-[41px] top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black z-10 transition-all cursor-help ${
                                                        step5Done ? "bg-emerald-500 border-emerald-500 text-white" : step4Done ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border text-muted-foreground"
                                                    }`}>
                                                        {step5Done ? "✓" : "5"}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="max-w-[220px] p-3 text-xs rounded-xl shadow-lg bg-popover text-popover-foreground border border-border">
                                                    <div className="space-y-1 text-left">
                                                        <p className="font-bold text-primary">Paso 5: Evaluación Final <span className="font-normal text-muted-foreground">(Docente)</span></p>
                                                        <p className="text-muted-foreground leading-snug">El instructor califica el plan (0.0 a 5.0) evaluando el enlace de evidencias subido por el aprendiz.</p>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-bold text-foreground">Paso 5: Calificación Final <span className="text-[10px] font-normal text-muted-foreground">(Docente)</span></h4>
                                                <p className="text-[11px] text-muted-foreground leading-snug">El instructor califica el plan (0.0 a 5.0) evaluando el enlace de evidencias subido por el aprendiz.</p>
                                                {viewPlanDetail.finalGrade !== null && viewPlanDetail.finalGrade !== undefined ? (
                                                    <div className="mt-1 bg-emerald-50 dark:bg-emerald-950/10 p-2.5 border border-emerald-200 rounded-xl inline-block">
                                                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                                                            Nota Final: {viewPlanDetail.finalGrade.toFixed(1)} / 5.0
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic block mt-1">Sin calificar</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    </TooltipProvider>
                                </div>

                                <DialogFooter className="border-t pt-4">
                                    <Button variant="outline" className="h-10 rounded-xl font-bold" onClick={() => setViewPlanDetail(null)}>Cerrar</Button>
                                    <Button className="gap-1 h-10 rounded-xl font-bold" onClick={() => { handleImpEmail(viewPlanDetail); }}>
                                        <Mail className="w-4 h-4" />Enviar Correo
                                    </Button>
                                </DialogFooter>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
