"use client";

import React, { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Save, Trash2, Edit, Users, Search, UsersRound, Link2 } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import { getCourseWorkGroups } from "../actions/workGroupActions";
import { WorkGroupManagerDialog } from "./WorkGroupManagerDialog";
import { getCourseActivities, createActivity, updateActivity, deleteActivity, saveStudentGrades, toggleCourseWeightMode } from "../actions/gradeActions";
import { formatName, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

interface GradeManagerPanelProps {
  courses: any[];
  students: any[];
}

export function GradeManagerPanel({ courses, students }: GradeManagerPanelProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [activities, setActivities] = useState<any[]>([]);
  const [usePercentageWeights, setUsePercentageWeights] = useState(true);
  const [grades, setGrades] = useState<Record<string, Record<string, string>>>({}); // [activityId][studentId] = score as string
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");

  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({ id: "", title: "", description: "", weight: 0, allowSubmissionLink: false });

  const [isBulkGradeDialogOpen, setIsBulkGradeDialogOpen] = useState(false);
  const [bulkGradeActivity, setBulkGradeActivity] = useState<any | null>(null);
  const [bulkGradeValue, setBulkGradeValue] = useState("");
  const [bulkSelectedStudents, setBulkSelectedStudents] = useState<string[]>([]);
  const [bulkOverwrite, setBulkOverwrite] = useState(true);
  const [bulkSearchQuery, setBulkSearchQuery] = useState("");
  
  // Work Groups State
  const [workGroups, setWorkGroups] = useState<any[]>([]);
  const [isWorkGroupDialogOpen, setIsWorkGroupDialogOpen] = useState(false);
  const [bulkSelectedGroupId, setBulkSelectedGroupId] = useState<string>("all");

  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses]);

  useEffect(() => {
    if (selectedCourseId) {
      loadActivities();
    }
  }, [selectedCourseId]);

  const loadActivities = async () => {
    setLoading(true);
    const data = await getCourseActivities(selectedCourseId) as any;
    setActivities(data.activities);
    setUsePercentageWeights(data.usePercentageWeights);
    
    // Initialize grades state
    const newGrades: Record<string, Record<string, string>> = {};
    data.activities.forEach((act: any) => {
      newGrades[act.id] = {};
      act.grades.forEach((g: any) => {
        newGrades[act.id][g.userId] = g.score.toString();
      });
    });
    setGrades(newGrades);
    const wgData = await getCourseWorkGroups(selectedCourseId);
    if (wgData.success) setWorkGroups(wgData.groups || []);
    setLoading(false);
  };

  const handleSaveActivity = async () => {
    if (!activityForm.title || (usePercentageWeights && activityForm.weight <= 0)) {
      toast.error("El título y un peso válido (>0) son requeridos");
      return;
    }

    if (usePercentageWeights) {
      const currentTotal = activities.reduce((sum, act) => sum + act.weight, 0);
      const currentActivityWeight = activities.find(a => a.id === activityForm.id)?.weight || 0;
      const proposedTotalWeight = currentTotal - currentActivityWeight + activityForm.weight;
      if (proposedTotalWeight > 100) {
        toast.warning(`Atención: El peso total (${proposedTotalWeight}%) excede el 100%. Por favor ajusta las demás actividades.`);
      }
    }

    startTransition(async () => {
      let res;
      if (activityForm.id) {
        res = await updateActivity(activityForm.id, activityForm.title, activityForm.description, activityForm.weight, activityForm.allowSubmissionLink);
      } else {
        res = await createActivity(selectedCourseId, activityForm.title, activityForm.description, activityForm.weight, activityForm.allowSubmissionLink);
      }

      if (res.success) {
        toast.success(`Actividad ${activityForm.id ? "actualizada" : "creada"}`);
        setIsActivityDialogOpen(false);
        loadActivities();
      } else {
        toast.error("Error al guardar: " + res.error);
      }
    });
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm("¿Eliminar actividad y todas sus calificaciones?")) return;
    
    startTransition(async () => {
      const res = await deleteActivity(id);
      if (res.success) {
        toast.success("Actividad eliminada");
        loadActivities();
      } else {
        toast.error("Error al eliminar: " + res.error);
      }
    });
  };

  const handleGradeChange = (activityId: string, studentId: string, value: string) => {
    // allow empty or numbers up to 5
    if (value === "" || (/^\d*\.?\d*$/.test(value) && parseFloat(value) <= 5)) {
      setGrades(prev => ({
        ...prev,
        [activityId]: {
          ...prev[activityId],
          [studentId]: value
        }
      }));
    }
  };

  const handleSaveAllActivities = () => {
    startTransition(async () => {
      let hasError = false;
      for (const act of activities) {
        const payload = Object.entries(grades[act.id] || {}).map(([userId, scoreStr]) => ({
          userId,
          score: parseFloat(scoreStr as string)
        })).filter(g => !isNaN(g.score));
        
        if (payload.length > 0) {
          const res = await saveStudentGrades(act.id, payload);
          if (!res.success) hasError = true;
        }
      }
      
      if (hasError) {
        toast.error("Error guardando algunas calificaciones");
      } else {
        toast.success("Todas las calificaciones guardadas con éxito");
      }
    });
  };

  const handleSaveGrades = async (activityId: string) => {
    const gradesToSave: { userId: string; score: number }[] = [];
    for (const studentId of Object.keys(grades[activityId] || {})) {
      const val = grades[activityId][studentId];
      if (val !== "") {
        gradesToSave.push({
          userId: studentId,
          score: parseFloat(val)
        });
      }
    }

    startTransition(async () => {
      const res = await saveStudentGrades(activityId, gradesToSave);
      if (res.success) {
        toast.success("Calificaciones guardadas");
      } else {
        toast.error("Error guardando calificaciones: " + res.error);
      }
    });
  };

  const handleOpenBulkGrade = (activity: any) => {
    setBulkGradeActivity(activity);
    setBulkGradeValue("");
    setBulkSelectedStudents([]);
    setBulkOverwrite(true);
    setBulkSearchQuery("");
    setBulkSelectedGroupId("all");
    setIsBulkGradeDialogOpen(true);
  };

  const handleApplyBulkGrade = () => {
    if (!bulkGradeActivity || !bulkGradeValue) return;
    
    const num = parseFloat(bulkGradeValue);
    if (isNaN(num) || num < 0 || num > 5) {
      toast.error("La nota debe estar entre 0.0 y 5.0");
      return;
    }

    const activityId = bulkGradeActivity.id;
    const currentGrades = { ...(grades[activityId] || {}) };
    let assignedCount = 0;

    bulkSelectedStudents.forEach(studentId => {
      // If not overwriting and grade exists, skip
      if (!bulkOverwrite && currentGrades[studentId] && currentGrades[studentId] !== "") {
        return;
      }
      currentGrades[studentId] = bulkGradeValue;
      assignedCount++;
    });

    if (assignedCount === 0) {
      toast.info("No se asignaron notas (posiblemente porque elegiste no sobrescribir).");
      return;
    }

    setGrades(prev => ({
      ...prev,
      [activityId]: currentGrades
    }));

    startTransition(async () => {
      const payload = Object.entries(currentGrades).map(([userId, scoreStr]) => ({
        userId,
        score: parseFloat(scoreStr as string)
      })).filter(g => !isNaN(g.score));

      if (payload.length > 0) {
        const res = await saveStudentGrades(activityId, payload);
        if (res.success) {
          toast.success(`Nota ${bulkGradeValue} asignada a ${assignedCount} estudiantes`);
          setIsBulkGradeDialogOpen(false);
        } else {
          toast.error("Error guardando calificaciones en base de datos");
        }
      }
    });
  };

  const filteredBulkStudents = students.filter(s => {
    // Filter by group first
    if (bulkSelectedGroupId !== "all") {
      const targetGroup = workGroups.find(wg => wg.id === bulkSelectedGroupId);
      if (targetGroup && !targetGroup.students.some((st: any) => st.id === s.id)) {
        return false;
      }
    }
    // Then filter by search query
    if (!bulkSearchQuery) return true;
    const q = bulkSearchQuery.toLowerCase();
    return formatName(s.name, s.profile).toLowerCase().includes(q) || (s.email && s.email.toLowerCase().includes(q));
  });

  const handleToggleBulkStudent = (studentId: string) => {
    setBulkSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleToggleAllBulkStudents = () => {
    if (bulkSelectedStudents.length === filteredBulkStudents.length && filteredBulkStudents.length > 0) {
      setBulkSelectedStudents([]);
    } else {
      setBulkSelectedStudents(filteredBulkStudents.map(s => s.id));
    }
  };

  const getColorForGrade = (val: string) => {
    if (!val || val === "-") return { input: "bg-transparent text-foreground", badge: "bg-muted text-muted-foreground" };
    const num = parseFloat(val);
    if (isNaN(num)) return { input: "bg-transparent text-foreground", badge: "bg-muted text-muted-foreground" };
    if (num < 3.0) return { input: "text-red-600 dark:text-red-400 font-bold", badge: "bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-500/20" };
    if (num >= 4.0) return { input: "text-green-700 dark:text-green-400 font-bold", badge: "bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-500/20" };
    return { input: "text-amber-700 dark:text-amber-400 font-bold", badge: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20" };
  };

  const calculateAverage = (studentId: string) => {
    let totalScore = 0;
    let totalWeight = 0;
    let count = 0;

    activities.forEach(act => {
      const scoreStr = grades[act.id]?.[studentId];
      if (scoreStr && scoreStr !== "") {
        if (usePercentageWeights) {
            totalScore += parseFloat(scoreStr) * (act.weight / 100);
            totalWeight += act.weight;
        } else {
            totalScore += parseFloat(scoreStr);
            count++;
        }
      }
    });

    if (usePercentageWeights) {
        if (totalWeight === 0) return "-";
        return (totalScore / (totalWeight / 100)).toFixed(2);
    } else {
        if (count === 0) return "-";
        return (totalScore / count).toFixed(2);
    }
  };

  const handleToggleWeightMode = (checked: boolean) => {
    setUsePercentageWeights(checked);
    startTransition(async () => {
        const res = await toggleCourseWeightMode(selectedCourseId, checked);
        if (res.success) {
            toast.success(checked ? "Pesos por porcentaje activados" : "Pesos por porcentaje desactivados");
        } else {
            toast.error("Error al cambiar la configuración: " + res.error);
            setUsePercentageWeights(!checked); // revert
        }
    });
  };

  const totalWeight = activities.reduce((sum, act) => sum + act.weight, 0);

  const filteredStudents = students.filter(student => 
    formatName(student.name, student.profile).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.email && student.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      <Card>
        <CardContent className="flex flex-col lg:flex-row gap-4 items-center justify-between p-4 bg-muted/20 border-b">
          <div className="flex-1 w-full max-w-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="w-full sm:max-w-[200px]">
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="bg-background shadow-sm h-9 border-border/60 transition-colors hover:border-border">
                  <SelectValue placeholder="Materia" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full sm:max-w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar estudiante..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background shadow-sm border-border/60 w-full"
              />
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap justify-center lg:justify-end w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-md border border-border/60 shadow-sm w-full sm:w-auto justify-center sm:justify-start">
               <Switch checked={usePercentageWeights} onCheckedChange={handleToggleWeightMode} id="weight-mode" className="scale-90 data-[state=checked]:bg-primary" />
               <Label htmlFor="weight-mode" className="text-xs font-semibold cursor-pointer whitespace-nowrap">Porcentajes</Label>
               {usePercentageWeights && (
                   <Badge variant="outline" className={`ml-2 ${totalWeight > 100 ? 'border-red-500 text-red-600 bg-red-50' : 'bg-muted/50 text-muted-foreground'}`}>
                     {totalWeight}%
                   </Badge>
               )}
            </div>
            <Button size="sm" variant="outline" className="h-9 gap-2 shadow-sm w-full sm:w-auto justify-center" onClick={() => setIsWorkGroupDialogOpen(true)}>
              <UsersRound className="w-3.5 h-3.5" />
              Equipos
            </Button>
            <Button size="sm" variant="outline" className="h-9 gap-2 shadow-sm w-full sm:w-auto justify-center" onClick={() => {
              setActivityForm({ id: "", title: "", description: "", weight: 20, allowSubmissionLink: false });
              setIsActivityDialogOpen(true);
            }}>
              <Plus className="w-3.5 h-3.5" />
              Nueva Actividad
            </Button>
            <Button size="sm" onClick={handleSaveAllActivities} disabled={isPending} className="h-9 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm px-4 w-full sm:w-auto justify-center">
              <Save className="w-4 h-4" />
              Guardar Todo
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground animate-pulse">Cargando actividades...</div>
      ) : activities.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border rounded-xl border-dashed">
          No hay actividades creadas en esta materia.
        </div>
      ) : (
        <Card className="w-full min-w-0 border-0 ring-1 ring-border shadow-sm rounded-xl overflow-hidden">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-muted/50 backdrop-blur-md sticky top-0 z-30">
                <TableRow>
                  <TableHead className="font-bold text-xs tracking-wider uppercase min-w-[250px] sticky left-0 bg-muted/80 backdrop-blur-md z-40 shadow-[1px_0_0_0_theme(colors.border)] pl-4">Estudiante</TableHead>
                {activities.map((act, index) => (
                  <TableHead key={act.id} className="w-[100px] min-w-[100px] max-w-[100px] px-1 py-2 align-top border-l border-muted/50 text-center">
                    <div className="flex flex-col h-full items-center justify-between group px-1">
                      <div className="w-full flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity h-6 mb-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => handleOpenBulkGrade(act)} title="Asignación Masiva">
                          <Users className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => { setActivityForm({ id: act.id, title: act.title, description: act.description || "", weight: act.weight, allowSubmissionLink: act.allowSubmissionLink ?? false }); setIsActivityDialogOpen(true); }}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteActivity(act.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="font-bold text-xs cursor-default text-foreground/80 hover:text-foreground pb-2 flex flex-col items-center gap-0.5">
                              <span>Act. {index + 1}</span>
                              {usePercentageWeights && <span className="text-[10px] text-muted-foreground font-normal">{act.weight}%</span>}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-center max-w-[200px]" side="bottom">
                            <p className="font-bold">{act.title}</p>
                            {act.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{act.description}</p>}
                            <p className="text-xs text-muted-foreground mt-1">Peso: {act.weight}%</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[100px] min-w-[100px] max-w-[100px] font-bold uppercase text-center bg-muted/10">Definitiva</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map(student => (
                <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium text-sm sticky left-0 bg-background/95 backdrop-blur-sm z-10 shadow-[1px_0_0_0_theme(colors.border)] transition-colors group-hover:bg-muted/30">
                    <div className="flex items-center gap-3 py-1 pl-2">
                      <Avatar className="h-8 w-8 border shadow-sm">
                        <AvatarImage src={student.image} />
                        <AvatarFallback className="text-[10px] font-bold bg-primary/5 text-primary">{getInitials(formatName(student.name, student.profile))}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="leading-tight">{formatName(student.name, student.profile)}</span>
                        <span className="text-[10px] text-muted-foreground/80 font-normal">{student.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  {activities.map(act => (
                    <TableCell key={act.id} className="p-1 w-[100px] min-w-[100px] max-w-[100px]">
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        max="5"
                        placeholder="-"
                        className={`text-center h-9 w-16 mx-auto bg-transparent border-transparent hover:bg-muted focus:bg-background focus:border-primary transition-all focus:ring-1 focus:ring-primary/20 ${getColorForGrade(grades[act.id]?.[student.id]).input}`}
                        value={grades[act.id]?.[student.id] || ""}
                        onChange={(e) => handleGradeChange(act.id, student.id, e.target.value)}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-center border-l bg-muted/5 w-[100px] min-w-[100px] max-w-[100px]">
                    <Badge variant="default" className={`w-14 justify-center text-sm font-bold shadow-none ${getColorForGrade(calculateAverage(student.id)).badge}`}>
                      {calculateAverage(student.id)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      )}

      {/* Activity Dialog — Full Screen */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none flex flex-col overflow-hidden bg-background !border-0" data-color-mode="auto">
          <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black">{activityForm.id ? "Editar" : "Nueva"} Actividad</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">Define los detalles, descripción y configuración de la actividad.</DialogDescription>
            </div>
          </DialogHeader>

          {/* Main content — overflow-hidden so columns manage their own scroll */}
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
              {/* Left — Metadata (own scroll) */}
              <div className="lg:col-span-1 border-r p-6 space-y-5 overflow-y-auto">
                <div className="space-y-2">
                  <Label className="font-semibold">Título de la Actividad *</Label>
                  <Input
                    value={activityForm.title}
                    onChange={e => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej. Taller 1, Examen Final..."
                    className="bg-background"
                  />
                </div>

                {usePercentageWeights && (
                  <div className="space-y-2">
                    <Label className="font-semibold">Peso Porcentual (%)</Label>
                    <Input
                      type="number" min="1" max="100"
                      value={activityForm.weight}
                      onChange={e => setActivityForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                      className="bg-background"
                    />
                  </div>
                )}

                {/* Submission Link Toggle */}
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/20">
                  <Switch
                    id="submission-link-toggle"
                    checked={activityForm.allowSubmissionLink}
                    onCheckedChange={val => setActivityForm(prev => ({ ...prev, allowSubmissionLink: val }))}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <Label htmlFor="submission-link-toggle" className="font-semibold cursor-pointer flex items-center gap-1.5">
                      <Link2 className="w-4 h-4 text-primary" />
                      Permitir Enlace de Entrega
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Los estudiantes podrán enviar un enlace (URL) con su trabajo para esta actividad.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right — Markdown Editor (fills all remaining height) */}
              <div className="lg:col-span-2 flex flex-col overflow-hidden p-6 gap-3">
                <Label className="font-semibold shrink-0">Descripción / Instrucciones (Markdown)</Label>
                <div className="flex-1 overflow-hidden" data-color-mode="auto">
                  <MDEditor
                    value={activityForm.description}
                    onChange={val => setActivityForm(prev => ({ ...prev, description: val || "" }))}
                    height="100%"
                    style={{ height: "100%", display: "flex", flexDirection: "column" }}
                    preview="edit"
                    visibleDragbar={false}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setIsActivityDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveActivity} disabled={isPending} className="gap-2">
              <Save className="w-4 h-4" />
              {isPending ? "Guardando..." : "Guardar Actividad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isBulkGradeDialogOpen} onOpenChange={setIsBulkGradeDialogOpen}>
        <DialogContent className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !max-w-none !w-screen !h-screen !m-0 !p-0 !rounded-none flex flex-col overflow-hidden bg-background !border-0">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle>Asignación Masiva de Notas</DialogTitle>
            <DialogDescription>
              Asigna una misma nota a varios estudiantes para la actividad <strong>{bulkGradeActivity?.title}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-muted/30 p-4 rounded-lg border">
              <div className="flex-1 max-w-[200px]">
                <Label htmlFor="bulk-group" className="text-sm font-bold text-muted-foreground">Equipo</Label>
                <Select value={bulkSelectedGroupId} onValueChange={setBulkSelectedGroupId}>
                  <SelectTrigger id="bulk-group" className="mt-1 w-full bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estudiantes</SelectItem>
                    {workGroups.map(wg => (
                      <SelectItem key={wg.id} value={wg.id}>{wg.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 max-w-[200px]">
                <Label htmlFor="bulk-grade" className="text-sm font-bold">Nota a asignar</Label>
                <Input 
                  id="bulk-grade" 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="5" 
                  placeholder="Ej. 5.0"
                  value={bulkGradeValue}
                  onChange={e => setBulkGradeValue(e.target.value)}
                  className="mt-1 w-full"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="bulk-search" className="text-sm font-bold text-muted-foreground">Buscar Estudiante</Label>
                <Input 
                  id="bulk-search" 
                  placeholder="Filtrar por nombre..."
                  value={bulkSearchQuery}
                  onChange={e => setBulkSearchQuery(e.target.value)}
                  className="mt-1 w-full"
                />
              </div>
              <div className="flex items-center gap-2 sm:mt-6">
                <Switch 
                  id="bulk-overwrite" 
                  checked={bulkOverwrite} 
                  onCheckedChange={setBulkOverwrite} 
                />
                <Label htmlFor="bulk-overwrite" className="cursor-pointer text-sm">Sobrescribir</Label>
              </div>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox 
                        checked={filteredBulkStudents.length > 0 && bulkSelectedStudents.length === filteredBulkStudents.length}
                        onCheckedChange={handleToggleAllBulkStudents}
                        aria-label="Seleccionar todos"
                      />
                    </TableHead>
                    <TableHead>Estudiante</TableHead>
                    <TableHead className="text-right">Nota Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBulkStudents.map(student => {
                    const currentGrade = bulkGradeActivity ? (grades[bulkGradeActivity.id]?.[student.id] || "-") : "-";
                    return (
                      <TableRow key={student.id} className="hover:bg-muted/30">
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={bulkSelectedStudents.includes(student.id)}
                            onCheckedChange={() => handleToggleBulkStudent(student.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={student.image} />
                              <AvatarFallback className="text-[10px]">{getInitials(formatName(student.name, student.profile))}</AvatarFallback>
                            </Avatar>
                            <span>{formatName(student.name, student.profile)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                           <Badge variant="outline" className={currentGrade === "-" ? "text-muted-foreground" : "font-bold"}>{currentGrade}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={activities.length + 2} className="h-24 text-center text-muted-foreground">
                        No se encontraron estudiantes que coincidan con la búsqueda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
            <Button variant="outline" onClick={() => setIsBulkGradeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleApplyBulkGrade} disabled={isPending || !bulkGradeValue || bulkSelectedStudents.length === 0}>
              Aplicar a {bulkSelectedStudents.length} {bulkSelectedStudents.length === 1 ? 'estudiante' : 'estudiantes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <WorkGroupManagerDialog 
        open={isWorkGroupDialogOpen} 
        onOpenChange={setIsWorkGroupDialogOpen}
        courseId={selectedCourseId}
        courseName={courses.find(c => c.id === selectedCourseId)?.name || ""}
        allStudents={students}
        initialWorkGroups={workGroups}
        onSaved={async () => {
          const wgData = await getCourseWorkGroups(selectedCourseId);
          if (wgData.success) setWorkGroups(wgData.groups || []);
        }}
      />
    </div>
  );
}
