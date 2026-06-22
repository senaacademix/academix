"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Users, Key, Clock, MessageSquare, Save, Search, ShieldAlert, UserX, UserCheck, ArrowRight, ArrowLeft, Play, LayoutList, ListTodo, CheckSquare, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatName } from "@/lib/utils";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { resetStudentPassword, saveAttendanceBatch, saveRemarkBatch, getGroupAttendanceHistory, getGroupRemarksHistory, getTeacherComprehensiveGroupAnalyticsAction } from "../actions/groupActions";
import { GroupAnalyticsPanel } from "@/components/analytics/GroupAnalyticsPanel";
import { StudentAnalyticsPanel } from "@/components/analytics/StudentAnalyticsPanel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GradeManagerPanel } from "./GradeManagerPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GroupManagerProps {
    groups: any[];
}

export function GroupManager({ groups }: GroupManagerProps) {
    const { data: session } = authClient.useSession();
    const teacherId = session?.user?.id;
    
    const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || "");
    const [activeTab, setActiveTab] = useState<"students" | "attendance" | "remarks" | "analytics" | "grades">("students");

    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    
    // Students Tab State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isResetting, setIsResetting] = useState<string | null>(null);
    const [selectedStudentForAnalytics, setSelectedStudentForAnalytics] = useState<any>(null);

    // Attendance Tab State
    const [attMode, setAttMode] = useState<"list" | "sequential">("list");
    const [seqIndex, setSeqIndex] = useState(0);
    const [attDate, setAttDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [attCourseId, setAttCourseId] = useState<string>("");
    // We only store ABSENT or LATE in attRecords. If a student is not here, they are PRESENT.
    const [attRecords, setAttRecords] = useState<Record<string, { status: "ABSENT" | "LATE", arrivalTime?: string, justification?: string }>>({});
    const [isSavingAtt, setIsSavingAtt] = useState(false);

    // Remarks Tab State
    const [remarkType, setRemarkType] = useState<"ATTENTION" | "COMMENDATION">("ATTENTION");
    const [remarkTitle, setRemarkTitle] = useState("");
    const [remarkDesc, setRemarkDesc] = useState("");
    const [remarkCourseId, setRemarkCourseId] = useState("");
    const [isSavingRemark, setIsSavingRemark] = useState(false);

    // History State
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [remarksHistory, setRemarksHistory] = useState<any[]>([]);

    // Analytics Modal State
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [fullAnalyticsData, setFullAnalyticsData] = useState<any>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    useEffect(() => {
        if (selectedGroup) {
            setAttCourseId(selectedGroup.courses?.[0]?.id || "");
            setRemarkCourseId(selectedGroup.courses?.[0]?.id || "");
            loadHistory(selectedGroup.id);
            // Reset local states
            setSelectedStudents([]);
            setAttRecords({});
            setSeqIndex(0);
        }
    }, [selectedGroup?.id]);

    useEffect(() => {
        if (activeTab === "analytics" && selectedGroup && !fullAnalyticsData && !loadingAnalytics) {
            handleOpenAnalytics();
        }
    }, [activeTab, selectedGroup?.id]);


    const loadHistory = async (groupId: string) => {
        const att = await getGroupAttendanceHistory(groupId);
        const rem = await getGroupRemarksHistory(groupId);
        setAttendanceHistory(att);
        setRemarksHistory(rem);
    };

    
    // Sincronizar attRecords con attendanceHistory al cambiar fecha o materia
    useEffect(() => {
        if (!attCourseId || !attDate) {
            setAttRecords({});
            return;
        }
        
        const recordsForDateAndCourse = attendanceHistory.filter((a: any) => {
            if (a.courseId !== attCourseId) return false;
            // a.date might be a string or a Date object
            const aDate = new Date(a.date);
            const aDateString = aDate.toISOString().split('T')[0];
            return aDateString === attDate;
        });

        const newRecords: Record<string, any> = {};
        recordsForDateAndCourse.forEach((rec: any) => {
            // Ignoramos PRESENT explícitos para no llenar el estado de records inútiles
            if (rec.status === "PRESENT") return;
            
            newRecords[rec.userId] = {
                status: rec.status,
                arrivalTime: rec.arrivalTime ? new Date(rec.arrivalTime).toISOString().substring(11, 16) : undefined,
                justification: rec.justification || undefined
            };
        });
        
        setAttRecords(newRecords);
    }, [attDate, attCourseId, attendanceHistory]);
const handleOpenAnalytics = async () => {
        if (!selectedGroup) return;
        setShowAnalyticsModal(true);
        setLoadingAnalytics(true);
        try {
            const data = await getTeacherComprehensiveGroupAnalyticsAction(selectedGroup.id);
            setFullAnalyticsData(data);
        } catch (error) {
            toast.error("Error al cargar la analítica");
            setShowAnalyticsModal(false);
        } finally {
            setLoadingAnalytics(false);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            const groupParam = searchParams.get('group');
            if (groupParam && groups.some((g: any) => g.id === groupParam)) {
                setSelectedGroupId(groupParam);
            }
        }
    }, [groups]);

    const filteredStudents = useMemo(() => {
        if (!selectedGroup?.students) return [];
        if (!searchQuery) return selectedGroup.students;
        const q = searchQuery.toLowerCase();
        return selectedGroup.students.filter((s: any) => 
            s.name.toLowerCase().includes(q) || 
            s.email.toLowerCase().includes(q) ||
            s.profile?.identificacion?.toLowerCase().includes(q)
        );
    }, [selectedGroup, searchQuery]);

    const handleResetPassword = async (studentId: string) => {
        setIsResetting(studentId);
        try {
            const res = await resetStudentPassword(studentId);
            if (res.success) {
                toast.success("Contraseña restablecida exitosamente al documento de identidad.");
            } else {
                toast.error("Error al restablecer la contraseña: " + res.error);
            }
        } catch (e: any) {
            toast.error("Error de conexión");
        } finally {
            setIsResetting(null);
        }
    };

    const toggleStudentSelection = (studentId: string) => {
        setSelectedStudents(prev => 
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const toggleAllStudents = () => {
        if (selectedStudents.length === filteredStudents.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filteredStudents.map((s: any) => s.id));
        }
    };

    const setStudentAttendance = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE") => {
        setAttRecords(prev => {
            const newRecords = { ...prev };
            if (status === "PRESENT") {
                delete newRecords[studentId]; // Removiendo = Presente
            } else {
                const now = new Date();
                const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                newRecords[studentId] = { 
                    status, 
                    arrivalTime: status === "LATE" ? timeString : undefined 
                };
            }
            return newRecords;
        });
    };

    const updateLateTime = (studentId: string, time: string) => {
        setAttRecords(prev => {
            if (!prev[studentId]) return prev;
            return {
                ...prev,
                [studentId]: { ...prev[studentId], arrivalTime: time }
            };
        });
    };

    const updateJustification = (studentId: string, text: string) => {
        setAttRecords(prev => {
            if (!prev[studentId]) return prev;
            return {
                ...prev,
                [studentId]: { ...prev[studentId], justification: text }
            };
        });
    };

    const nextSeqStudent = () => {
        if (seqIndex < filteredStudents.length - 1) setSeqIndex(i => i + 1);
    };

    const prevSeqStudent = () => {
        if (seqIndex > 0) setSeqIndex(i => i - 1);
    };

    const handleSaveAttendance = async () => {
        if (!attCourseId) return toast.error("Selecciona una materia");
        
        // Send ONLY ABSENT or LATE records. PRESENT is implicit.
        const records = Object.entries(attRecords).map(([studentId, rec]) => ({
            studentId,
            status: rec.status,
            arrivalTime: rec.arrivalTime ? `${attDate}T${rec.arrivalTime}:00Z` : undefined,
            justification: rec.justification
        }));

        const res = await saveAttendanceBatch(attCourseId, attDate, records as any);
        if (res.success) {
            toast.success("Asistencia guardada correctamente");
            loadHistory(selectedGroup!.id);
            setAttMode("list"); // return to list mode
        } else {
            toast.error("Error al guardar asistencia: " + res.error);
        }
        setIsSavingAtt(false);
    };

    const handleSaveRemarks = async () => {
        if (!remarkCourseId) return toast.error("Selecciona una materia");
        if (selectedStudents.length === 0) return toast.error("Selecciona al menos un estudiante");
        if (!remarkTitle.trim() || !remarkDesc.trim()) return toast.error("Completa el título y la descripción");

        setIsSavingRemark(true);
        const res = await saveRemarkBatch(teacherId!, remarkCourseId, selectedStudents, remarkType, remarkTitle, remarkDesc);
        if (res.success) {
            toast.success("Observación guardada correctamente");
            setRemarkTitle("");
            setRemarkDesc("");
            setSelectedStudents([]);
            loadHistory(selectedGroup!.id);
        } else {
            toast.error("Error al guardar observación: " + res.error);
        }
        setIsSavingRemark(false);
    };

    if (!groups || groups.length === 0) {
        return (
            <Card className="flex flex-col items-center justify-center py-24 border-dashed">
                <CardContent className="flex flex-col items-center justify-center pt-6">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <CardTitle className="text-2xl font-bold mb-2">No tienes grupos asignados</CardTitle>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-full">
            {/* TOP BAR - GROUP SELECTOR */}
            <Card className="w-full border-0 shadow-sm bg-gradient-to-r from-muted/50 to-muted/10 rounded-2xl overflow-hidden">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 px-6">
                    <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Users className="w-6 h-6 text-primary" />
                        </div>
                        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                            <SelectTrigger className="w-full md:w-[400px] h-14 text-lg font-black border-2 border-primary/20 bg-background shadow-sm rounded-xl">
                                <SelectValue placeholder="Selecciona un Grupo" />
                            </SelectTrigger>
                            <SelectContent>
                                {groups.map(g => (
                                    <SelectItem key={g.id} value={g.id} className="py-3 font-semibold">
                                        {g.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedGroup && (
                        <div className="text-left md:text-right">
                            <p className="font-bold text-sm text-foreground">{selectedGroup.program?.name}</p>
                            <p className="text-xs font-semibold text-muted-foreground">{selectedGroup.period?.name} — {selectedGroup.students?.length || 0} Estudiantes</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* MAIN WORKSPACE */}
            <Card className="flex-1 w-full min-w-0 border-0 shadow-lg rounded-2xl overflow-hidden">
                {selectedGroup ? (
                    <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="flex-1 flex flex-col h-full min-h-[600px]">
                        <div className="p-4 border-b bg-muted/10">
                            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/50 rounded-xl gap-1">
                                <TabsTrigger value="students" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">Estudiantes</TabsTrigger>
                                <TabsTrigger value="attendance" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">Asistencia</TabsTrigger>
                                <TabsTrigger value="remarks" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm hidden md:flex">Observaciones</TabsTrigger>
                                <TabsTrigger value="grades" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">Calificaciones</TabsTrigger>
                                <TabsTrigger value="analytics" className="rounded-lg py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm hidden md:flex">Analítica</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto overflow-x-hidden w-full min-w-0">
                            {/* TAB 1: STUDENTS */}
                            <TabsContent value="students" className="m-0 space-y-4 outline-none">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Buscar por nombre o identificación..." 
                                            className="pl-9 h-11 rounded-xl bg-muted/30 border-0 focus-visible:ring-1"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    
                                    <div className="text-sm font-semibold text-muted-foreground bg-muted/30 px-4 py-2 rounded-xl">
                                        Total: {filteredStudents.length} estudiantes
                                    </div>
                                    {selectedStudents.length > 0 && (
                                        <Button 
                                            variant="secondary" 
                                            className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                            onClick={() => {
                                                const selectedEmails = filteredStudents
                                                    .filter((s: any) => selectedStudents.includes(s.id) && s.email)
                                                    .map((s: any) => s.email)
                                                    .join(',');
                                                if (selectedEmails) window.location.href = `mailto:${selectedEmails}`;
                                            }}
                                        >
                                            <Mail className="mr-2 h-4 w-4" />
                                            Enviar a Seleccionados ({selectedStudents.length})
                                        </Button>
                                    )}
                                </div>

                                <div className="rounded-xl border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="w-[50px] text-center">
                                                    <Checkbox 
                                                        checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                                                        onCheckedChange={toggleAllStudents}
                                                    />
                                                </TableHead>
                                                <TableHead className="font-bold text-xs uppercase text-muted-foreground">Estudiante</TableHead>
                                                <TableHead className="font-bold text-xs uppercase text-muted-foreground hidden md:table-cell">Documento</TableHead>
                                                <TableHead className="font-bold text-xs uppercase text-muted-foreground hidden lg:table-cell">Contacto</TableHead>
                                                <TableHead className="font-bold text-xs uppercase text-right text-muted-foreground">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredStudents.map((s: any) => (
                                                <TableRow key={s.id} className="hover:bg-muted/20">
                                                    <TableCell className="text-center">
                                                        <Checkbox 
                                                            checked={selectedStudents.includes(s.id)}
                                                            onCheckedChange={() => toggleStudentSelection(s.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8 border bg-muted/50">
                                                                <AvatarImage src={s.image} />
                                                                <AvatarFallback>{s.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-semibold text-sm">{formatName(s.name, s.profile)}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs hidden md:table-cell">
                                                        {s.profile?.identificacion || "N/A"}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                                                        {s.email}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Tooltip><TooltipTrigger asChild><Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    if (s.email) window.location.href = `mailto:${s.email}`;
                                                                }}
                                                                className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                            >
                                                                <Mail className="w-4 h-4" />
                                                            </Button></TooltipTrigger><TooltipContent><p>Enviar correo</p></TooltipContent></Tooltip>
                                                            <Tooltip><TooltipTrigger asChild><Button 
                                                                variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10"
                                                                                                                            onClick={() => setSelectedStudentForAnalytics(s)}
                                                                                                                        >
                                                                                                                            <ShieldAlert className="w-4 h-4" />
                                                                                                                        </Button></TooltipTrigger><TooltipContent><p>Ver Analítica</p></TooltipContent></Tooltip>
                                                            <Tooltip><TooltipTrigger asChild><Button 
                                                                                                                            variant="ghost" 
                                                                                                                            size="icon" 
                                                                                                                            className="h-8 w-8 text-orange-500 hover:bg-orange-500/10"
                                                                                                                            onClick={() => handleResetPassword(s.id)}
                                                                                                                            disabled={isResetting === s.id}
                                                                                                                        >
                                                                                                                            <Key className="w-4 h-4" />
                                                                                                                        </Button></TooltipTrigger><TooltipContent><p>Resetear Contraseña</p></TooltipContent></Tooltip>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {filteredStudents.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                        No se encontraron estudiantes
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            {/* TAB: ANALYTICS */}
                            <TabsContent value="analytics" className="m-0 h-full outline-none p-0 flex flex-col">
                                <GroupAnalyticsPanel 
                                    inline={true}
                                    isLoading={loadingAnalytics}
                                    analyticsData={fullAnalyticsData}
                                />
                            </TabsContent>

                            {/* TAB: GRADES */}
                            <TabsContent value="grades" className="m-0 outline-none w-full min-w-0 max-w-full">
                                <GradeManagerPanel 
                                    courses={selectedGroup.courses || []}
                                    students={filteredStudents}
                                />
                            </TabsContent>

                            {/* TAB 2: ATTENDANCE */}
                            <TabsContent value="attendance" className="m-0 space-y-6 outline-none">
                                {/* Header Controls for Attendance */}
                                <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-muted/20 p-5 rounded-2xl border">
                                    <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                                        <div className="space-y-1.5 w-full sm:w-[200px]">
                                            <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Fecha de Clase</Label>
                                            <Input type="date" className="h-12 rounded-xl border-muted-foreground/20 font-semibold" value={attDate} onChange={e => setAttDate(e.target.value)} />
                                        </div>
                                        <div className="space-y-1.5 w-full sm:w-[300px]">
                                            <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Materia / Módulo</Label>
                                            <Select value={attCourseId} onValueChange={setAttCourseId}>
                                                <SelectTrigger className="h-12 rounded-xl border-muted-foreground/20 font-semibold bg-background">
                                                    <SelectValue placeholder="Seleccionar Materia" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {selectedGroup.courses?.map((c: any) => (
                                                        <SelectItem key={c.id} value={c.id} className="font-semibold">{c.title}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="flex items-center p-1 bg-muted/50 rounded-xl">
                                        <Button 
                                            variant={attMode === "list" ? "default" : "ghost"} 
                                            size="sm"
                                            className={`rounded-lg font-bold ${attMode === "list" ? "shadow-sm" : ""}`}
                                            onClick={() => setAttMode("list")}
                                        >
                                            <ListTodo className="w-4 h-4 mr-2" /> Listado Rápido
                                        </Button>
                                        <Button 
                                            variant={attMode === "sequential" ? "default" : "ghost"} 
                                            size="sm"
                                            className={`rounded-lg font-bold ${attMode === "sequential" ? "shadow-sm" : ""}`}
                                            onClick={() => setAttMode("sequential")}
                                        >
                                            <Play className="w-4 h-4 mr-2" /> Modo Secuencial
                                        </Button>
                                    </div>
                                </div>

                                {attMode === "list" ? (
                                    // MODE 1: LIST VIEW
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                                                <CheckSquare className="w-3 h-3 mr-1" />
                                                Por defecto todos están presentes
                                            </Badge>
                                            <span className="text-xs font-semibold text-muted-foreground">
                                                {Object.keys(attRecords).length} Inasistencias/Tardanzas marcadas
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                            {filteredStudents.map((s: any) => {
                                                const rec = attRecords[s.id];
                                                const isAbsent = rec?.status === "ABSENT";
                                                const isLate = rec?.status === "LATE";
                                                
                                                const studentHistory = attendanceHistory.filter(a => a.userId === s.id);
                                                const absentCount = studentHistory.filter(a => a.status === 'ABSENT').length;
                                                const lateCount = studentHistory.filter(a => a.status === 'LATE').length;

                                                return (
                                                    <div key={s.id} className={`p-4 rounded-xl border-2 transition-all duration-200 ${isAbsent ? 'bg-red-100 border-red-500 shadow-md dark:bg-red-950/40' : isLate ? 'bg-amber-100 border-amber-500 shadow-md dark:bg-amber-950/40' : 'bg-background hover:border-primary/50 shadow-sm border-transparent'}`}>
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className={`font-bold text-sm line-clamp-1 ${isAbsent ? 'text-red-900 dark:text-red-100' : isLate ? 'text-amber-900 dark:text-amber-100' : ''}`}>{formatName(s.name, s.profile)}</div>
                                                            {(absentCount > 0 || lateCount > 0) && (
                                                                <div className="flex gap-1 ml-2 shrink-0">
                                                                    {absentCount > 0 && (
                                                                        <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-400 dark:border-red-800 whitespace-nowrap">
                                                                            {absentCount} F
                                                                        </Badge>
                                                                    )}
                                                                    {lateCount > 0 && (
                                                                        <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-400 dark:border-amber-800 whitespace-nowrap">
                                                                            {lateCount} R
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Acciones Rápidas */}
                                                        <div className="flex gap-2 mb-3">
                                                            <Button 
                                                                size="sm" 
                                                                variant={isAbsent ? "default" : "outline"}
                                                                className={`flex-1 h-9 font-bold text-xs ${isAbsent ? 'bg-red-600 hover:bg-red-700 text-white shadow-inner ring-2 ring-red-300 ring-offset-1' : 'text-muted-foreground hover:text-red-600 hover:bg-red-50 hover:border-red-200 border-dashed'}`}
                                                                onClick={() => setStudentAttendance(s.id, isAbsent ? "PRESENT" : "ABSENT")}
                                                            >
                                                                <UserX className="w-3.5 h-3.5 mr-1" />
                                                                {isAbsent ? "Falta" : "Falta"}
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant={isLate ? "default" : "outline"}
                                                                className={`flex-1 h-9 font-bold text-xs ${isLate ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-inner ring-2 ring-amber-300 ring-offset-1' : 'text-muted-foreground hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 border-dashed'}`}
                                                                onClick={() => setStudentAttendance(s.id, isLate ? "PRESENT" : "LATE")}
                                                            >
                                                                <Clock className="w-3.5 h-3.5 mr-1" />
                                                                {isLate ? "Tarde" : "Tarde"}
                                                            </Button>
                                                        </div>

                                                        {/* Inputs Condicionales */}
                                                        <AnimatePresence>
                                                            {isLate && (
                                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="pt-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <Label className="text-xs font-bold text-amber-900 dark:text-amber-100 whitespace-nowrap">Hora Ingreso:</Label>
                                                                        <Input 
                                                                            type="time" 
                                                                            className="h-8 text-xs border-amber-400 bg-white dark:bg-black font-bold text-amber-900 dark:text-amber-100" 
                                                                            value={rec?.arrivalTime || ""}
                                                                            onChange={e => updateLateTime(s.id, e.target.value)}
                                                                        />
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                            {isAbsent && (
                                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="pt-2">
                                                                    <Input 
                                                                        placeholder="Justificación / Motivo (Opcional)" 
                                                                        className="h-8 text-xs border-red-400 bg-white dark:bg-black placeholder:text-red-300/70 font-semibold text-red-900 dark:text-red-100" 
                                                                        value={rec?.justification || ""}
                                                                        onChange={e => updateJustification(s.id, e.target.value)}
                                                                    />
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    // MODE 2: SEQUENTIAL VIEW (Flashcards)
                                    <div className="flex flex-col items-center py-8">
                                        {filteredStudents.length > 0 ? (
                                            <div className="w-full max-w-2xl relative">
                                                <div className="text-center font-bold text-sm text-muted-foreground mb-4">
                                                    Estudiante {seqIndex + 1} de {filteredStudents.length}
                                                </div>
                                                
                                                <Card className="border-2 shadow-xl bg-gradient-to-b from-background to-muted/20">
                                                    <CardContent className="p-10 flex flex-col items-center text-center">
                                                        <Avatar className="w-32 h-32 border-4 border-muted shadow-sm mb-6">
                                                            <AvatarImage src={filteredStudents[seqIndex].image} />
                                                            <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                                                                {filteredStudents[seqIndex].name?.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <h2 className="text-3xl font-black mb-2">{formatName(filteredStudents[seqIndex].name, filteredStudents[seqIndex].profile)}</h2>
                                                        <p className="text-muted-foreground font-mono mb-8">{filteredStudents[seqIndex].profile?.identificacion || "Sin ID"}</p>

                                                        {/* Status Indicator */}
                                                        {attRecords[filteredStudents[seqIndex].id] && (
                                                            <Badge className={`mb-6 text-sm py-1 px-4 ${attRecords[filteredStudents[seqIndex].id].status === 'ABSENT' ? 'bg-red-500' : 'bg-amber-500'}`}>
                                                                {attRecords[filteredStudents[seqIndex].id].status === 'ABSENT' ? 'Falta Registrada' : 'Llegada Tarde Registrada'}
                                                            </Badge>
                                                        )}

                                                        {/* Historial Panel */}
                                                        <div className="bg-muted/10 p-4 rounded-xl mb-6 w-full max-w-sm flex justify-around">
                                                            <div className="text-center">
                                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Inasistencias</p>
                                                                <p className="text-2xl font-black text-red-600">{attendanceHistory.filter(a => a.userId === filteredStudents[seqIndex].id && a.status === 'ABSENT').length}</p>
                                                            </div>
                                                            <div className="w-px bg-border"></div>
                                                            <div className="text-center">
                                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Retrasos</p>
                                                                <p className="text-2xl font-black text-amber-600">{attendanceHistory.filter(a => a.userId === filteredStudents[seqIndex].id && a.status === 'LATE').length}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap justify-center gap-4 w-full">
                                                            <Button 
                                                                size="lg"
                                                                variant="outline"
                                                                className="h-16 px-8 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 font-bold text-lg"
                                                                onClick={() => {
                                                                    setStudentAttendance(filteredStudents[seqIndex].id, "ABSENT");
                                                                    setTimeout(nextSeqStudent, 300);
                                                                }}
                                                            >
                                                                <UserX className="w-6 h-6 mr-2" /> Inasistencia
                                                            </Button>
                                                            
                                                            <Button 
                                                                size="lg"
                                                                variant="outline"
                                                                className="h-16 px-8 rounded-2xl border-amber-200 text-amber-600 hover:bg-amber-50 font-bold text-lg"
                                                                onClick={() => {
                                                                    setStudentAttendance(filteredStudents[seqIndex].id, "LATE");
                                                                    // Do not auto next on LATE so they can adjust time if needed.
                                                                }}
                                                            >
                                                                <Clock className="w-6 h-6 mr-2" /> Llegada Tarde
                                                            </Button>

                                                            <Button 
                                                                size="lg"
                                                                className="h-16 px-12 rounded-2xl font-black text-lg bg-emerald-600 hover:bg-emerald-700"
                                                                onClick={() => {
                                                                    setStudentAttendance(filteredStudents[seqIndex].id, "PRESENT");
                                                                    nextSeqStudent();
                                                                }}
                                                            >
                                                                <UserCheck className="w-6 h-6 mr-2" /> Presente (Siguiente)
                                                            </Button>
                                                        </div>

                                                        {/* Late Input if Late */}
                                                        {attRecords[filteredStudents[seqIndex].id]?.status === "LATE" && (
                                                            <div className="mt-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
                                                                <Label className="font-bold text-amber-600 mb-2">Ajustar Hora de Ingreso</Label>
                                                                <Input 
                                                                    type="time" 
                                                                    className="h-12 w-48 text-center text-lg font-bold border-amber-300 rounded-xl"
                                                                    value={attRecords[filteredStudents[seqIndex].id]?.arrivalTime || ""}
                                                                    onChange={e => updateLateTime(filteredStudents[seqIndex].id, e.target.value)}
                                                                />
                                                                <Button variant="ghost" className="mt-4 text-muted-foreground" onClick={nextSeqStudent}>
                                                                    Continuar <ArrowRight className="w-4 h-4 ml-1" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>

                                                {/* Navigation Controls */}
                                                <div className="flex justify-between mt-6">
                                                    <Button variant="ghost" disabled={seqIndex === 0} onClick={prevSeqStudent} className="font-bold">
                                                        <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
                                                    </Button>
                                                    <Button variant="ghost" disabled={seqIndex === filteredStudents.length - 1} onClick={nextSeqStudent} className="font-bold">
                                                        Saltar <ArrowRight className="w-4 h-4 ml-2" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground">No hay estudiantes en este grupo.</p>
                                        )}
                                    </div>
                                )}

                                {/* Sticky Footer Save Button */}
                                <div className="sticky bottom-0 mt-8 pt-4 pb-2 bg-background/80 backdrop-blur-sm border-t flex justify-end">
                                    <Button onClick={handleSaveAttendance} disabled={isSavingAtt || !attCourseId} size="lg" className="h-14 px-10 rounded-2xl font-black text-lg shadow-lg">
                                        <Save className="w-5 h-5 mr-2" /> Guardar Asistencia (Todos)
                                    </Button>
                                </div>
                            </TabsContent>

                            {/* TAB 3: REMARKS & HISTORY */}
                            <TabsContent value="remarks" className="m-0 space-y-8 outline-none">
                                {/* Omitted for brevity, kept exactly as before but optimized classes */}
                                {/* Create Remark Section */}
                                <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 space-y-4 relative overflow-hidden">
                                    <ShieldAlert className="absolute right-0 top-0 w-64 h-64 text-primary/5 -translate-y-1/4 translate-x-1/4 pointer-events-none" />
                                    <div className="relative z-10">
                                        <h3 className="text-2xl font-black text-foreground mb-6">Registrar Observación Disciplinaria / Académica</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tipo de Observación</Label>
                                                <Select value={remarkType} onValueChange={v => setRemarkType(v as any)}>
                                                    <SelectTrigger className="h-12 rounded-xl bg-background border-primary/20">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ATTENTION" className="text-red-600 font-bold">Llamado de Atención</SelectItem>
                                                        <SelectItem value="COMMENDATION" className="text-emerald-600 font-bold">Felicitación</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Materia Asociada</Label>
                                                <Select value={remarkCourseId} onValueChange={setRemarkCourseId}>
                                                    <SelectTrigger className="h-12 rounded-xl bg-background border-primary/20">
                                                        <SelectValue placeholder="Seleccionar Materia" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {selectedGroup.courses?.map((c: any) => (
                                                            <SelectItem key={c.id} value={c.id} className="font-semibold">{c.title}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mb-6">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Título</Label>
                                            <Input className="h-12 rounded-xl bg-background border-primary/20" value={remarkTitle} onChange={e => setRemarkTitle(e.target.value)} placeholder="Ej. Excelente participación, Retraso constante..." />
                                        </div>
                                        <div className="space-y-2 mb-6">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descripción Detallada</Label>
                                            <Textarea className="min-h-[120px] rounded-xl bg-background border-primary/20 p-4" value={remarkDesc} onChange={e => setRemarkDesc(e.target.value)} placeholder="Describe el suceso o justificación de la observación..." />
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-background/50 p-4 rounded-xl border border-primary/10">
                                            <div className="text-sm font-semibold flex items-center gap-2">
                                                <Users className="w-5 h-5 text-primary" />
                                                Aplicará a <Badge className="text-sm px-3">{selectedStudents.length}</Badge> estudiantes seleccionados en la pestaña principal.
                                            </div>
                                            <Button onClick={handleSaveRemarks} disabled={isSavingRemark || selectedStudents.length === 0} size="lg" className="rounded-xl px-10 h-12 font-bold w-full sm:w-auto">
                                                Registrar Observación
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                {/* History Section */}
                                <div className="mt-8 border-t pt-8">
                                    <h3 className="font-bold text-2xl mb-6">Historial Reciente del Grupo</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Remarks history */}
                                        <div className="border border-border/50 rounded-2xl bg-card p-6 shadow-sm space-y-4">
                                            <h4 className="font-bold text-lg flex items-center gap-2 border-b pb-4">
                                                <MessageSquare className="w-5 h-5 text-primary" /> Últimas Observaciones
                                            </h4>
                                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                                {remarksHistory.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No hay observaciones registradas</p> : null}
                                                {remarksHistory.map((rem: any) => (
                                                    <div key={rem.id} className="text-sm p-4 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/30 transition-colors">
                                                        <div className="flex justify-between mb-2">
                                                            <span className="font-bold text-sm">{formatName(rem.user.name, rem.user.profile)}</span>
                                                            <span className="text-xs font-semibold text-muted-foreground bg-background px-2 py-1 rounded-md">{format(new Date(rem.date), "dd MMM")}</span>
                                                        </div>
                                                        <Badge variant="outline" className={`text-xs mb-2 ${rem.type === 'ATTENTION' ? 'text-red-600 bg-red-50 border-red-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'}`}>
                                                            {rem.type === 'ATTENTION' ? 'Llamado Atención' : 'Felicitación'}
                                                        </Badge>
                                                        <p className="font-bold text-foreground">{rem.title}</p>
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rem.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Attendance history */}
                                        <div className="border border-border/50 rounded-2xl bg-card p-6 shadow-sm space-y-4">
                                            <h4 className="font-bold text-lg flex items-center gap-2 border-b pb-4">
                                                <Clock className="w-5 h-5 text-primary" /> Últimas Faltas y Retrasos
                                            </h4>
                                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                                {attendanceHistory.filter(a => a.status !== 'PRESENT').length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Excelente asistencia, no hay registros problemáticos.</p> : null}
                                                {attendanceHistory.filter(a => a.status !== 'PRESENT').map((att: any) => (
                                                    <div key={att.id} className="text-sm flex items-center justify-between p-4 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/30 transition-colors">
                                                        <div>
                                                            <p className="font-bold text-sm mb-1">{formatName(att.user.name, att.user.profile)}</p>
                                                            <p className="text-xs font-semibold text-muted-foreground">{att.course.title}</p>
                                                        </div>
                                                        <div className="text-right flex flex-col items-end gap-1">
                                                            <Badge variant="outline" className={`text-xs font-bold ${att.status === 'ABSENT' ? 'text-red-600 bg-red-50 border-red-200' : 'text-amber-600 bg-amber-50 border-amber-200'}`}>
                                                                {att.status === 'ABSENT' ? 'Inasistencia' : 'Llegada Tarde'}
                                                            </Badge>
                                                            <span className="text-xs font-semibold text-muted-foreground bg-background px-2 py-1 rounded-md">{format(new Date(att.date), "dd MMM")}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-[600px]">
                        <Users className="w-20 h-20 mb-6 opacity-20" />
                        <h2 className="text-2xl font-bold text-foreground">Ningún Grupo Seleccionado</h2>
                        <p className="mt-2">Utiliza el selector en la parte superior para elegir un grupo.</p>
                    </div>
                )}
            </Card>

            

            {/* Student Analytics Dialog */}
            <Dialog open={!!selectedStudentForAnalytics} onOpenChange={(open) => !open && setSelectedStudentForAnalytics(null)}>
                <DialogContent className="!max-w-[100vw] sm:!max-w-[100vw] w-screen h-screen m-0 p-6 !rounded-none overflow-y-auto border-none bg-background flex flex-col">
                    {selectedStudentForAnalytics && (
                        <StudentAnalyticsPanel 
                            studentName={formatName(selectedStudentForAnalytics.name, selectedStudentForAnalytics.profile)}
                            attendances={attendanceHistory.filter(a => a.userId === selectedStudentForAnalytics.id)}
                            remarks={remarksHistory.filter(r => r.userId === selectedStudentForAnalytics.id)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
