"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
    Search, Trash2, Edit, Plus, Folder, BookOpen, Users, Calendar, 
    ChevronRight, Layers, Clock, X, Info, GraduationCap, ArrowLeft, ArrowUpRight, GripVertical,
    AlertCircle, Building, Code, Database, Binary, MessageSquare, Terminal,
    ShieldCheck, Cloud, Rocket, NotebookTabs
} from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

// Server Actions
import { deleteCourseAction, getAllUsersAction, deleteUserAction } from "@/app/admin-actions";
import {
    getProgramsAction,
    createProgramAction,
    updateProgramAction,
    deleteProgramAction,
    createPeriodAction,
    updatePeriodAction,
    deletePeriodAction,
    getGroupsAction,
    createGroupAction,
    updateGroupAction,
    deleteGroupAction,
    assignStudentToGroupAction,
    assignCourseToPeriodAction,
    reorderCoursesAction,
    registerStudentManualAction,
    registerStudentsBulkAction,
    assignTeacherToProgramAction,
    registerTeacherManualAction,
    registerTeachersBulkAction,
    assignGroupsToTeacherAction,
    getTeacherGroupsAction,
    scheduleGroupCourseAction,
    updateGroupCourseScheduleAction,
    deleteGroupCourseAction,
    checkScheduleConflictsAction,
    updateTeacherAction
} from "@/features/admin/actions/academicActions";
import { createCourseAction, updateCourseAction } from "@/features/teacher/actions/courseActions";
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
import * as XLSX from "xlsx";
import { TeacherAvailabilityView } from "@/features/schedule/components/TeacherAvailabilityView";
import { TeacherQualificationsView } from "@/features/teacher/components/TeacherQualificationsView";
import { DayOfWeek } from "@/generated/prisma/client";
import { EnvironmentManagement, TrainingEnvironment } from "@/features/admin/components/EnvironmentManagement";

const DAYS_OF_WEEK_ORDERED: { value: DayOfWeek; label: string }[] = [
    { value: "MONDAY", label: "Lunes" },
    { value: "TUESDAY", label: "Martes" },
    { value: "WEDNESDAY", label: "Miércoles" },
    { value: "THURSDAY", label: "Jueves" },
    { value: "FRIDAY", label: "Viernes" },
    { value: "SATURDAY", label: "Sábado" },
    { value: "SUNDAY", label: "Domingo" }
];

const toFormat12h = (t24: string) => {
    if (!t24) return "";
    const [h, m] = t24.split(":").map(Number);
    const ap = h >= 12 ? "p.m." : "a.m.";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
};

const formatWeeklyHours = (hours: number | null | undefined) => {
    if (hours == null || hours === 0) return "";
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const BADGE_COLORS: Record<string, { label: string; bg: string }> = {
    slate: { label: "Gris", bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
    blue: { label: "Azul", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    green: { label: "Verde", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
    red: { label: "Rojo", bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
    amber: { label: "Naranja", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
    purple: { label: "Púrpura", bg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
    pink: { label: "Rosa", bg: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
};

const getInitials = (name: string | null) => {
    if (!name) return "NN";
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "NN";
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const getCourseIcon = (title: string) => {
    const t = title.toLowerCase().trim();
    if (t.includes("programación") || t.includes("código") || t.includes("programacion")) {
        if (t.includes("introducción") || t.includes("introduccion")) return Terminal;
        return Code;
    }
    if (t.includes("datos") || t.includes("database") || t.includes("sql") || t.includes("nosql")) {
        return Database;
    }
    if (t.includes("matemática") || t.includes("matematica") || t.includes("cálculo") || t.includes("calculo") || t.includes("álgebra") || t.includes("algebra")) {
        return Binary;
    }
    if (t.includes("comunicación") || t.includes("comunicacion") || t.includes("ética") || t.includes("etica") || t.includes("inglés") || t.includes("ingles")) {
        if (t.includes("comunicación") || t.includes("comunicacion")) return MessageSquare;
        return BookOpen;
    }
    if (t.includes("arquitectura") || t.includes("ingeniería") || t.includes("ingenieria") || t.includes("diseño") || t.includes("metodología") || t.includes("metodologia") || t.includes("scrum")) {
        return Layers;
    }
    if (t.includes("pruebas") || t.includes("calidad") || t.includes("qa") || t.includes("seguridad") || t.includes("ciberseguridad")) {
        return ShieldCheck;
    }
    if (t.includes("despliegue") || t.includes("devops") || t.includes("nube") || t.includes("cloud") || t.includes("docker")) {
        return Cloud;
    }
    if (t.includes("proyecto") || t.includes("grado") || t.includes("tesis") || t.includes("innovación") || t.includes("innovacion")) {
        return Rocket;
    }
    return NotebookTabs;
};

interface Program {
    id: string;
    name: string;
    description: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    scheduleTitle?: string | null;
    maxTeacherHours?: number | null;
    createdAt: Date;
    periods: Period[];
    groups: Group[];
    teachers: Teacher[];
    environments?: TrainingEnvironment[];
}

interface Period {
    id: string;
    name: string;
    description: string | null;
    programId: string;
    createdAt: Date;
    courses: Course[];
}

interface Group {
    id: string;
    name: string;
    description: string | null;
    programId: string;
    createdAt: Date;
    students: Student[];
    teachers?: Teacher[];
    courses?: Course[];
    startDate: Date | null;
    endDate: Date | null;
    startTime: string;
    endTime: string;
    periodId?: string | null;
    period?: {
        id: string;
        name: string;
        description: string | null;
    } | null;
    environmentId?: string | null;
    environment?: {
        id: string;
        name: string;
        capacity: number;
        location: string | null;
        resources: string[];
        description?: string | null;
    } | null;
}

interface Student {
    id: string;
    name: string;
    email: string;
    groupId: string | null;
    profile?: {
        identificacion: string;
        nombres: string;
        apellido: string;
        telefono: string | null;
    } | null;
}

interface Course {
    id: string;
    title: string;
    description: string | null;
    externalUrl: string | null;
    weeklyHours?: number | null;
    badge?: string | null;
    badgeColor?: string | null;
    createdAt: Date;
    group?: Group | null;
    periodId: string | null;
    period?: {
        id: string;
        name: string;
        program?: {
            id: string;
            name: string;
        } | null;
    } | null;
    _count: {
        enrollments: number;
    };
}

interface Teacher {
    id: string;
    name: string | null;
    email: string;
    profile?: {
        identificacion: string;
        nombres: string;
        apellido: string;
        telefono: string | null;
    } | null;
}

interface AcademicManagementProps {
    initialCourses: Course[];
    teachers: Teacher[];
    totalCount: number;
}

interface SortableCourseItemProps {
    course: Course;
    openEditCourse: (course: Course) => void;
    triggerDelete: (type: "program" | "period" | "group" | "course" | "teacher", id: string, name: string) => void;
    setSelectedCourseForDesc: (course: Course) => void;
    setDescriptionDialogOpen: (open: boolean) => void;
}

function SortableCourseItem({
    course,
    openEditCourse,
    triggerDelete,
    setSelectedCourseForDesc,
    setDescriptionDialogOpen
}: SortableCourseItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: course.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? "none" : transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 50 : "auto",
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-muted/20 hover:border-muted/50 hover:shadow-sm transition-colors duration-200"
        >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Tooltip><TooltipTrigger asChild><div 
                                    {...attributes} 
                                    {...listeners}
                                    className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/75 p-1 transition-colors rounded hover:bg-muted/5 shrink-0"
                                >
                                    <GripVertical className="h-4 w-4" />
                                </div></TooltipTrigger><TooltipContent><p>Arrastrar para ordenar</p></TooltipContent></Tooltip>
                <div className="min-w-0 pr-2 flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate text-foreground/90">{course.title}</p>
                    {course.weeklyHours !== undefined && course.weeklyHours !== null && course.weeklyHours > 0 && (
                        <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold py-0.5 px-1.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatWeeklyHours(course.weeklyHours)}
                        </Badge>
                    )}
                    {course.badge && (
                        <Badge className={cn("shrink-0 border text-[10px] font-bold py-0.5 px-1.5", (course.badgeColor && BADGE_COLORS[course.badgeColor]) ? BADGE_COLORS[course.badgeColor].bg : BADGE_COLORS.slate.bg)}>
                            {course.badge}
                        </Badge>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
                <Tooltip><TooltipTrigger asChild><Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7 text-muted-foreground hover:bg-muted/10"
                                    onClick={() => {
                                        setSelectedCourseForDesc(course);
                                        setDescriptionDialogOpen(true);
                                    }}
                                >
                                    <Info className="h-3.5 w-3.5" />
                                </Button></TooltipTrigger><TooltipContent><p>Ver Descripción</p></TooltipContent></Tooltip>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => openEditCourse(course)}>
                    <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => triggerDelete("course", course.id, course.title)}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}

export function AcademicManagement({ initialCourses, teachers, totalCount }: AcademicManagementProps) {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [teachersList, setTeachersList] = useState<Teacher[]>(teachers);
    const [subTab, setSubTab] = useState<string>("overview");
    const [isPending, startTransition] = useTransition();

    const router = useRouter();
    const searchParams = useSearchParams();
    const programIdParam = searchParams.get("programId");

    // Selection states
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [managingGroup, setManagingGroup] = useState<Group | null>(null);

    useEffect(() => {
        if (programIdParam && programs.length > 0) {
            const prog = programs.find(p => p.id === programIdParam);
            if (prog) {
                setSelectedProgram(prog);
            } else {
                setSelectedProgram(null);
            }
        } else {
            setSelectedProgram(null);
        }
    }, [programIdParam, programs]);

    const [selectedSchedulePeriodId, setSelectedSchedulePeriodId] = useState<string>("");

    useEffect(() => {
        if (managingGroup) {
            if (managingGroup.periodId) {
                setSelectedSchedulePeriodId(managingGroup.periodId);
            } else if (selectedProgram && selectedProgram.periods.length > 0) {
                setSelectedSchedulePeriodId(selectedProgram.periods[0].id);
            } else {
                setSelectedSchedulePeriodId("");
            }
        } else {
            setSelectedSchedulePeriodId("");
        }
    }, [managingGroup, selectedProgram]);

    // Modal/Dialog states
    const [programDialogOpen, setProgramDialogOpen] = useState(false);
    const [programToEdit, setProgramToEdit] = useState<Program | null>(null);
    const [programName, setProgramName] = useState("");
    const [programDescription, setProgramDescription] = useState("");
    const [programStartDate, setProgramStartDate] = useState("");
    const [programEndDate, setProgramEndDate] = useState("");
    const [programScheduleTitle, setProgramScheduleTitle] = useState("");
    const [programMaxHours, setProgramMaxHours] = useState(40);

    const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
    const [periodToEdit, setPeriodToEdit] = useState<Period | null>(null);
    const [periodName, setPeriodName] = useState("");
    const [periodDescription, setPeriodDescription] = useState("");

    const [groupDialogOpen, setGroupDialogOpen] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);
    const [groupName, setGroupName] = useState("");
    const [groupDescription, setGroupDescription] = useState("");
    const [groupStartTime, setGroupStartTime] = useState("");
    const [groupEndTime, setGroupEndTime] = useState("");
    const [groupPeriodId, setGroupPeriodId] = useState<string>("none");

    const [courseDialogOpen, setCourseDialogOpen] = useState(false);
    const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
    const [courseTitle, setCourseTitle] = useState("");
    const [courseDescription, setCourseDescription] = useState("");
    const [coursePeriodId, setCoursePeriodId] = useState("");
    const [courseWeeklyHours, setCourseWeeklyHours] = useState<number>(0);
    const [courseBadge, setCourseBadge] = useState("");
    const [courseBadgeColor, setCourseBadgeColor] = useState("slate");

    // Description Dialog States
    const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
    const [selectedCourseForDesc, setSelectedCourseForDesc] = useState<Course | null>(null);

    // Delete dialog states
    const [deleteType, setDeleteType] = useState<"program" | "period" | "group" | "course" | "teacher" | "student" | null>(null);
    const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
    const [deleteItemName, setDeleteItemName] = useState("");
    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);



    // Teacher assignment confirm dialog
    const [teacherConfirmOpen, setTeacherConfirmOpen] = useState(false);
    const [teacherToConfirm, setTeacherToConfirm] = useState<{ id: string; name: string; assign: boolean } | null>(null);

    // Sensors for drag-and-drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent, periodId: string) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const period = selectedProgram?.periods.find(p => p.id === periodId);
            if (!period) return;

            const oldIndex = period.courses.findIndex(c => c.id === active.id);
            const newIndex = period.courses.findIndex(c => c.id === over.id);

            const reorderedCourses = arrayMove(period.courses, oldIndex, newIndex);

            const updatedPrograms = programs.map(p => {
                if (p.id === selectedProgram?.id) {
                    return {
                        ...p,
                        periods: p.periods.map(per => {
                            if (per.id === periodId) {
                                return {
                                    ...per,
                                    courses: reorderedCourses
                                };
                            }
                            return per;
                        })
                    };
                }
                return p;
            });
            setPrograms(updatedPrograms);

            if (selectedProgram) {
                const updatedSel = updatedPrograms.find(p => p.id === selectedProgram.id);
                if (updatedSel) {
                    setSelectedProgram(updatedSel);
                }
            }

            try {
                const orderedIds = reorderedCourses.map(c => c.id);
                await reorderCoursesAction(orderedIds);
                toast.success("Orden de las materias actualizado");
            } catch (error) {
                toast.error("Error al reordenar las materias");
                refreshAll();
            }
        }
    };

    // Assignment states
    const [assignStudentsDialogOpen, setAssignStudentsDialogOpen] = useState(false);
    const [selectedGroupForStudents, setSelectedGroupForStudents] = useState<Group | null>(null);
    const [assignTeachersDialogOpen, setAssignTeachersDialogOpen] = useState(false);


    // Group Course Scheduling states
    const [groupCourseDialogOpen, setGroupCourseDialogOpen] = useState(false);
    const [groupCourseToEdit, setGroupCourseToEdit] = useState<Course | null>(null);
    const [groupCourseTitle, setGroupCourseTitle] = useState("");
    const [groupCourseDescription, setGroupCourseDescription] = useState("");
    const [groupCourseWeeklyHours, setGroupCourseWeeklyHours] = useState<number>(0);
    const [selectedCatalogCourseId, setSelectedCatalogCourseId] = useState("");
    const [showAllTeachersForAssignment, setShowAllTeachersForAssignment] = useState(false);

    // Schedule slot editor states
    const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState<DayOfWeek>("MONDAY");
    const [scheduleStartTime, setScheduleStartTime] = useState("");
    const [scheduleEndTime, setScheduleEndTime] = useState("");
    const [selectedStartBlockIndex, setSelectedStartBlockIndex] = useState<number | null>(null);
    const [selectedEndBlockIndex, setSelectedEndBlockIndex] = useState<number | null>(null);
    const [hoveredBlockIndex, setHoveredBlockIndex] = useState<number | null>(null);

    // Scheduling conflict states
    const [scheduleConflicts, setScheduleConflicts] = useState<string[]>([]);
    const [conflictChecking, setConflictChecking] = useState(false);

    // Reset group course conflicts when options change
    useEffect(() => {
        setScheduleConflicts([]);
    }, [selectedCatalogCourseId, scheduleDayOfWeek, scheduleStartTime, scheduleEndTime]);

    // Manual registration states
    const [manualIdentificacion, setManualIdentificacion] = useState("");
    const [manualNombres, setManualNombres] = useState("");
    const [manualApellido, setManualApellido] = useState("");
    const [manualEmail, setManualEmail] = useState("");
    const [manualTelefono, setManualTelefono] = useState("");

    // Manual registration states for teachers
    const [manualTeacherIdentificacion, setManualTeacherIdentificacion] = useState("");
    const [manualTeacherNombres, setManualTeacherNombres] = useState("");
    const [manualTeacherApellido, setManualTeacherApellido] = useState("");
    const [manualTeacherEmail, setManualTeacherEmail] = useState("");
    const [manualTeacherTelefono, setManualTeacherTelefono] = useState("");

    // Excel import states
    const [excelStudents, setExcelStudents] = useState<any[]>([]);
    const [importResult, setImportResult] = useState<{
        successCount: number;
        skippedCount: number;
        errors: string[];
    } | null>(null);
    const [excelFileName, setExcelFileName] = useState("");

    // Excel import states for teachers
    const [excelTeachers, setExcelTeachers] = useState<any[]>([]);
    const [importTeacherResult, setImportTeacherResult] = useState<{
        successCount: number;
        skippedCount: number;
        errors: string[];
    } | null>(null);
    const [excelTeacherFileName, setExcelTeacherFileName] = useState("");

    // Teacher Management States
    const [editTeacherDialogOpen, setEditTeacherDialogOpen] = useState(false);
    const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
    const [editTeacherDoc, setEditTeacherDoc] = useState("");
    const [editTeacherNames, setEditTeacherNames] = useState("");
    const [editTeacherLastName, setEditTeacherLastName] = useState("");
    const [editTeacherEmail, setEditTeacherEmail] = useState("");
    const [editTeacherPhone, setEditTeacherPhone] = useState("");



    // Teacher Qualifications States
    const [qualDialogOpen, setQualDialogOpen] = useState(false);
    const [qualTeacher, setQualTeacher] = useState<Teacher | null>(null);

    // Admin availability view states
    const [adminTeacherAvailabilityOpen, setAdminTeacherAvailabilityOpen] = useState(false);
    const [selectedTeacherForAvailability, setSelectedTeacherForAvailability] = useState<Teacher | null>(null);

    const scheduledTitles = managingGroup?.courses
        ?.filter(c => !groupCourseToEdit || c.id !== groupCourseToEdit.id)
        ?.map(c => c.title.toLowerCase()) || [];

    const catalogCourses = (selectedProgram?.periods
        .filter(p => !managingGroup || p.id === managingGroup.periodId)
        .flatMap(p => p.courses) || [])
        .filter(c => !c.group)
        .filter(c => !scheduledTitles.includes(c.title.toLowerCase()));

    const getTimeSlots = () => {
        if (!managingGroup) return [];
        const slots = [];
        const start = managingGroup.startTime || "08:00";
        const end = managingGroup.endTime || "12:00";
        
        const [startH, startM] = start.split(":").map(Number);
        const [endH, endM] = end.split(":").map(Number);
        
        let currentMinutes = startH * 60 + startM;
        let endMinutes = endH * 60 + endM;

        if (endMinutes < currentMinutes) {
            endMinutes += 1440; // Crosses midnight, add 24 hours
        }
        
        while (currentMinutes <= endMinutes) {
            const h = (Math.floor(currentMinutes / 60)) % 24;
            const m = currentMinutes % 60;
            const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            slots.push(timeString);
            currentMinutes += 15;
        }
        return slots;
    };

    const timeSlots = getTimeSlots();

    const filteredProgramTeachers = (selectedProgram?.teachers || []);

    const filteredOtherTeachers = teachersList
        .filter(t => !selectedProgram?.teachers?.some(pt => pt.id === t.id));

    // Initial load
    useEffect(() => {
        refreshAll();
        fetchSystemStudents();
        fetchSystemTeachers();
    }, []);

    // Reset managingGroup on tab or program change
    useEffect(() => {
        setManagingGroup(null);
    }, [subTab, selectedProgram]);

    const fetchSystemStudents = async () => {
        try {
            const { users } = await getAllUsersAction({ role: "student", limit: 1000 });
            setStudents(users as any[]);
        } catch (e) {
            console.error("Error al cargar estudiantes:", e);
        }
    };

    const fetchSystemTeachers = async () => {
        try {
            const { users } = await getAllUsersAction({ role: "teacher", limit: 1000 });
            const mapped = users.map((user: any) => ({
                id: user.id,
                name: user.name,
                email: user.email,
            }));
            setTeachersList(mapped);
        } catch (e) {
            console.error("Error al cargar profesores:", e);
        }
    };

    const refreshAll = async () => {
        try {
            const fetched = await getProgramsAction();
            const parsed = fetched.map((p: any) => ({
                ...p,
                createdAt: new Date(p.createdAt),
                teachers: p.teachers || [],
                environments: (p.environments || []).map((env: any) => ({
                    ...env,
                    createdAt: new Date(env.createdAt),
                })),
                periods: (p.periods || []).map((per: any) => ({
                    ...per,
                    createdAt: new Date(per.createdAt),
                    courses: (per.courses || []).map((c: any) => ({
                        ...c,
                        createdAt: new Date(c.createdAt),
                        group: c.group ? {
                            ...c.group,
                            createdAt: new Date(c.group.createdAt),
                            
                            endDate: c.group.endDate ? new Date(c.group.endDate) : null,
                        } : null,
                    }))
                })),
                groups: (p.groups || []).map((g: any) => ({
                    ...g,
                    createdAt: new Date(g.createdAt),
                    startDate: g.startDate ? new Date(g.startDate) : null,
                    endDate: g.endDate ? new Date(g.endDate) : null,
                    students: (g.students || []).map((s: any) => ({
                        ...s,
                        createdAt: new Date(s.createdAt)
                    })),
                    courses: (g.courses || []).map((c: any) => ({
                        ...c,
                        createdAt: new Date(c.createdAt),
                        group: c.group ? {
                            ...c.group,
                            createdAt: new Date(c.group.createdAt),
                            
                            endDate: c.group.endDate ? new Date(c.group.endDate) : null,
                        } : null,
                    })) || []
                }))
            })) as Program[];
            
            setPrograms(parsed);
            
            if (selectedProgram) {
                const updated = parsed.find(p => p.id === selectedProgram.id);
                setSelectedProgram(updated || null);
                if (managingGroup) {
                    const updatedGroup = updated?.groups.find(g => g.id === managingGroup.id);
                    setManagingGroup(updatedGroup || null);
                }
            }
        } catch (error) {
            toast.error("Error al cargar la información académica");
        }
    };


    const openCreateGroupCourse = () => {
        setGroupCourseToEdit(null);
        setGroupCourseTitle("");
        setGroupCourseDescription("");
        setGroupCourseWeeklyHours(0);
        setScheduleDayOfWeek("MONDAY");
        
        const slots = getTimeSlots();
        if (slots.length > 1) {
            setSelectedStartBlockIndex(0);
            setSelectedEndBlockIndex(1);
            setScheduleStartTime(slots[0]);
            setScheduleEndTime(slots[1]);
        } else {
            setSelectedStartBlockIndex(null);
            setSelectedEndBlockIndex(null);
            setScheduleStartTime("");
            setScheduleEndTime("");
        }

        setScheduleConflicts([]);
        setSelectedCatalogCourseId("");
        setShowAllTeachersForAssignment(false);
        setGroupCourseDialogOpen(true);
    };

    const openEditGroupCourse = (course: any) => {
        setGroupCourseToEdit(course);
        setGroupCourseTitle(course.title);
        setGroupCourseDescription(course.description || "");
        setGroupCourseWeeklyHours(course.weeklyHours || 0);
        
        const firstSlot = course.schedules?.[0];
        const slots = getTimeSlots();
        if (firstSlot) {
            setScheduleDayOfWeek(firstSlot.dayOfWeek);
            setScheduleStartTime(firstSlot.startTime);
            setScheduleEndTime(firstSlot.endTime);
            const startIdx = slots.indexOf(firstSlot.startTime);
            const endIdx = slots.indexOf(firstSlot.endTime);
            setSelectedStartBlockIndex(startIdx !== -1 ? startIdx : 0);
            setSelectedEndBlockIndex(endIdx !== -1 ? endIdx : 1);
        } else {
            setScheduleDayOfWeek("MONDAY");
            if (slots.length > 1) {
                setSelectedStartBlockIndex(0);
                setSelectedEndBlockIndex(1);
                setScheduleStartTime(slots[0]);
                setScheduleEndTime(slots[1]);
            } else {
                setSelectedStartBlockIndex(null);
                setSelectedEndBlockIndex(null);
                setScheduleStartTime("");
                setScheduleEndTime("");
            }
        }

        setScheduleConflicts([]);
        
        // Find matching catalog course by title
        const catalogCourse = selectedProgram?.periods
            .flatMap(p => p.courses)
            .find(c => c.title.toLowerCase() === course.title.toLowerCase());
        setSelectedCatalogCourseId(catalogCourse?.id || "");
        setShowAllTeachersForAssignment(false);
        
        setGroupCourseDialogOpen(true);
    };

    const handleSaveGroupCourse = async (isOverride: boolean = false) => {
        if (!groupCourseTitle.trim()) {
            toast.error("Debe ingresar el título de la asignatura");
            return;
        }
        if (!scheduleStartTime || !scheduleEndTime) {
            toast.error("Debe ingresar hora de inicio y fin");
            return;
        }
        if (scheduleStartTime >= scheduleEndTime) {
            toast.error("La hora de inicio debe ser menor a la hora de fin");
            return;
        }

        const schedules = [{
            dayOfWeek: scheduleDayOfWeek,
            startTime: scheduleStartTime,
            endTime: scheduleEndTime
        }];

        startTransition(async () => {
            try {
                if (groupCourseToEdit) {
                    await updateGroupCourseScheduleAction(groupCourseToEdit.id, {
                        title: groupCourseTitle,
                        description: "",
                        weeklyHours: groupCourseWeeklyHours,
                        schedules
                    });
                    toast.success("Horario de clase actualizado con éxito");
                } else {
                    const periodId = managingGroup?.periodId;
                    if (!periodId) {
                        throw new Error("El grupo debe tener configurado un periodo académico actual para poder programar clases.");
                    }

                    await scheduleGroupCourseAction({
                        title: groupCourseTitle,
                        description: "",
                        weeklyHours: groupCourseWeeklyHours,
                        groupId: managingGroup!.id,
                        periodId,
                        schedules
                    });
                    toast.success("Clase programada con éxito");
                }

                setGroupCourseDialogOpen(false);
                setScheduleConflicts([]);
                await refreshAll();
            } catch (e: any) {
                const msg = e.message || "Error al programar la clase";
                if (msg.includes("colisiones en el horario:")) {
                    const cleanMsg = msg.replace("No es posible programar la clase por colisiones en el horario: ", "")
                                        .replace("No es posible actualizar la clase por colisiones en el horario: ", "");
                    const conflicts = cleanMsg.split(" | ");
                    setScheduleConflicts(conflicts);
                } else {
                    setScheduleConflicts([msg]);
                }
                toast.error(msg);
            }
        });
    };

    const handleDeleteGroupCourse = async (courseId: string) => {
        if (confirm("¿Está seguro de eliminar esta programación de clase? Esta acción no se puede deshacer.")) {
            startTransition(async () => {
                try {
                    await deleteGroupCourseAction(courseId);
                    toast.success("Programación de clase eliminada");
                    await refreshAll();
                } catch (e: any) {
                    toast.error("Error al eliminar la clase");
                }
            });
        }
    };

    // ============ PROGRAM HANDLERS ============

    const openCreateProgram = () => {
        setProgramToEdit(null);
        setProgramName("");
        setProgramDescription("");
        setProgramStartDate("");
        setProgramEndDate("");
        setProgramScheduleTitle("");
        setProgramMaxHours(40);
        setProgramDialogOpen(true);
    };

    const openEditProgram = (program: Program) => {
        setProgramToEdit(program);
        setProgramName(program.name);
        setProgramDescription(program.description || "");
        setProgramStartDate(program.startDate ? new Date(program.startDate).toISOString().split('T')[0] : "");
        setProgramEndDate(program.endDate ? new Date(program.endDate).toISOString().split('T')[0] : "");
        setProgramScheduleTitle(program.scheduleTitle || "");
        setProgramMaxHours(program.maxTeacherHours ?? 40);
        setProgramDialogOpen(true);
    };

    const handleSaveProgram = async () => {
        if (!programName || programName.trim().length < 2) {
            toast.error("El nombre del programa debe tener al menos 2 caracteres");
            return;
        }

        startTransition(async () => {
            try {
                const sDate = programStartDate ? new Date(programStartDate + "T12:00:00") : null;
                const eDate = programEndDate ? new Date(programEndDate + "T12:00:00") : null;

                if (programToEdit) {
                    await updateProgramAction(programToEdit.id, {
                        name: programName,
                        description: programDescription,
                        startDate: sDate,
                        endDate: eDate,
                        scheduleTitle: programScheduleTitle || null,
                        maxTeacherHours: programMaxHours
                    });
                    toast.success("Programa de formación actualizado");
                } else {
                    await createProgramAction({
                        name: programName,
                        description: programDescription,
                        startDate: sDate,
                        endDate: eDate,
                        scheduleTitle: programScheduleTitle || null,
                        maxTeacherHours: programMaxHours
                    });
                    toast.success("Programa de formación creado");
                }
                setProgramDialogOpen(false);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al guardar el programa");
            }
        });
    };

    // ============ PERIOD HANDLERS ============

    const openCreatePeriod = () => {
        if (!selectedProgram) return;
        setPeriodToEdit(null);
        setPeriodName("");
        setPeriodDescription("");
        setPeriodDialogOpen(true);
    };

    const openEditPeriod = (period: Period) => {
        setPeriodToEdit(period);
        setPeriodName(period.name);
        setPeriodDescription(period.description || "");
        setPeriodDialogOpen(true);
    };

    const handleSavePeriod = async () => {
        if (!selectedProgram) return;
        if (!periodName || periodName.trim().length < 2) {
            toast.error("El nombre del periodo debe tener al menos 2 caracteres");
            return;
        }

        startTransition(async () => {
            try {
                if (periodToEdit) {
                    await updatePeriodAction(periodToEdit.id, {
                        name: periodName,
                        description: periodDescription
                    });
                    toast.success("Periodo académico actualizado");
                } else {
                    await createPeriodAction({
                        name: periodName,
                        description: periodDescription,
                        programId: selectedProgram.id
                    });
                    toast.success("Periodo académico agregado");
                }
                setPeriodDialogOpen(false);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al guardar el periodo");
            }
        });
    };

    // ============ GROUP HANDLERS ============

    const openCreateGroup = () => {
        if (!selectedProgram) return;
        setGroupToEdit(null);
        setGroupName("");
        setGroupDescription("");
        setGroupStartTime("");
        setGroupEndTime("");
        setGroupPeriodId("none");
        setGroupDialogOpen(true);
    };

    const openEditGroup = (group: Group) => {
        setGroupToEdit(group);
        setGroupName(group.name);
        setGroupDescription(group.description || "");
        setGroupStartTime(group.startTime || "");
        setGroupEndTime(group.endTime || "");
        setGroupPeriodId(group.periodId || "none");
        setGroupDialogOpen(true);
    };

    const handleSaveGroup = async () => {
        if (!selectedProgram) return;
        if (!groupName || groupName.trim().length < 2) {
            toast.error("El nombre del grupo debe tener al menos 2 caracteres");
            return;
        }
        if (!groupStartTime) {
            toast.error("La hora de inicio es obligatoria");
            return;
        }
        if (!groupEndTime) {
            toast.error("La hora de fin es obligatoria");
            return;
        }

        startTransition(async () => {
            try {
                if (groupToEdit) {
                    await updateGroupAction(groupToEdit.id, {
                        name: groupName,
                        description: groupDescription || undefined,
                        startTime: groupStartTime,
                        endTime: groupEndTime,
                        periodId: groupPeriodId === "none" ? undefined : groupPeriodId
                    });
                    toast.success("Grupo académico actualizado");
                } else {
                    await createGroupAction({
                        programId: selectedProgram.id,
                        name: groupName,
                        description: groupDescription || undefined,
                        startTime: groupStartTime,
                        endTime: groupEndTime,
                        periodId: groupPeriodId === "none" ? undefined : groupPeriodId
                    });
                    toast.success("Grupo académico creado");
                }
                setGroupDialogOpen(false);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al guardar el grupo");
            }
        });
    };

    // ============ ASSIGN STUDENT HANDLERS ============

    const openAssignStudents = (group: Group) => {
        setSelectedGroupForStudents(group);
        setAssignStudentsDialogOpen(true);
        // Reset states
        setManualIdentificacion("");
        setManualNombres("");
        setManualApellido("");
        setManualEmail("");
        setManualTelefono("");
        setExcelStudents([]);
        setExcelFileName("");
        setImportResult(null);
    };

    const handleAssignStudent = async (studentId: string, assign: boolean) => {
        if (!selectedGroupForStudents) return;

        startTransition(async () => {
            try {
                await assignStudentToGroupAction(studentId, assign ? selectedGroupForStudents.id : null);
                toast.success(assign ? "Estudiante agregado al grupo" : "Estudiante removido del grupo");
                
                await refreshAll();
                await fetchSystemStudents();
            } catch (error: any) {
                toast.error(error.message || "Error al asignar estudiante");
            }
        });
    };

    const handleAssignTeacher = (teacherId: string, name: string, assign: boolean) => {
        setTeacherToConfirm({ id: teacherId, name, assign });
        setTeacherConfirmOpen(true);
    };

    const confirmTeacherAction = async () => {
        if (!selectedProgram || !teacherToConfirm) return;

        startTransition(async () => {
            try {
                await assignTeacherToProgramAction(selectedProgram.id, teacherToConfirm.id, teacherToConfirm.assign);
                toast.success(teacherToConfirm.assign ? "Profesor asociado exitosamente" : "Profesor desasociado exitosamente");
                setTeacherConfirmOpen(false);
                setTeacherToConfirm(null);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al asociar profesor");
            }
        });
    };

    const handleRegisterStudentManual = async () => {
        if (!selectedGroupForStudents) return;
        if (!manualIdentificacion) {
            toast.error("El número de documento es obligatorio");
            return;
        }
        if (!manualNombres) {
            toast.error("El nombre es obligatorio");
            return;
        }
        if (!manualApellido) {
            toast.error("El apellido es obligatorio");
            return;
        }
        if (!manualEmail) {
            toast.error("El correo electrónico es obligatorio");
            return;
        }

        startTransition(async () => {
            try {
                await registerStudentManualAction({
                    groupId: selectedGroupForStudents.id,
                    identificacion: manualIdentificacion,
                    nombres: manualNombres,
                    apellido: manualApellido,
                    email: manualEmail,
                    telefono: manualTelefono || undefined
                });

                toast.success("Estudiante registrado exitosamente");
                
                // Clear manual inputs
                setManualIdentificacion("");
                setManualNombres("");
                setManualApellido("");
                setManualEmail("");
                setManualTelefono("");
                
                await refreshAll();
                await fetchSystemStudents();
            } catch (error: any) {
                toast.error(error.message || "Error al registrar estudiante");
            }
        });
    };

    const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setExcelFileName(file.name);
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length <= 1) {
                    toast.error("El archivo está vacío o no contiene filas de datos");
                    return;
                }

                // Extrayendo encabezados (fila 0) y normalizándolos
                const firstRow = (jsonData[0] as any[]) || [];
                const headers: string[] = [];
                for (let i = 0; i < firstRow.length; i++) {
                    const val = firstRow[i];
                    headers.push(val ? val.toString().trim().toLowerCase() : "");
                }
                
                // Encontrar los índices de cada columna requerida
                const getIndex = (aliases: string[]) => {
                    // Primero buscar coincidencia exacta
                    const exactIdx = headers.findIndex(h => h && aliases.includes(h));
                    if (exactIdx !== -1) return exactIdx;
                    
                    // Si no, buscar coincidencia parcial (evitando colisión con "tipo de documento")
                    return headers.findIndex(h => h && 
                        h !== "tipo de documento" && 
                        h !== "tipo de doc" && 
                        h !== "tipodoc" && 
                        h !== "tipo_documento" && 
                        aliases.some(alias => h.includes(alias))
                    );
                };

                const numDocIdx = getIndex(["identificacion", "identificación", "número de documento", "numero de documento", "documento", "cedula", "tarjeta", "nro doc"]);
                const nombreIdx = getIndex(["nombre", "nombres", "primer nombre"]);
                const apellidoIdx = getIndex(["apellido", "apellidos"]);
                const emailIdx = getIndex(["email", "mail", "correo electrónico", "correo electronico", "correo"]);
                const telefonoIdx = getIndex(["teléfono", "telefono", "tel", "celular", "movil", "cel"]);

                if (numDocIdx === -1) {
                    toast.error("No se encontró la columna de 'Identificacion' en el archivo Excel");
                    return;
                }

                if (emailIdx === -1) {
                    toast.error("No se encontró la columna de 'Email' en el archivo Excel");
                    return;
                }

                // Mostrar aviso si faltan algunas columnas comunes, pero permitir continuar
                const missingCols: string[] = [];
                if (nombreIdx === -1) missingCols.push("Nombre");
                if (apellidoIdx === -1) missingCols.push("Apellidos");
                if (missingCols.length > 0) {
                    toast.info(`Nota: No se encontraron las columnas: ${missingCols.join(", ")}. Se auto-completarán los datos.`);
                }

                const parsedList: any[] = [];
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    const identificacion = row[numDocIdx]?.toString().trim();
                    // Si no hay número de identificación, se salta la fila
                    if (!identificacion) continue;

                    const nombres = nombreIdx !== -1 && row[nombreIdx] ? row[nombreIdx].toString().trim() : "Estudiante";
                    const apellido = apellidoIdx !== -1 && row[apellidoIdx] ? row[apellidoIdx].toString().trim() : "";
                    const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].toString().trim() : "";
                    const telefono = telefonoIdx !== -1 && row[telefonoIdx] ? row[telefonoIdx].toString().trim() : "";

                    parsedList.push({
                        identificacion,
                        nombres,
                        apellido,
                        email,
                        telefono
                    });
                }

                if (parsedList.length === 0) {
                    toast.error("No se encontraron registros de estudiantes válidos en el archivo");
                } else {
                    setExcelStudents(parsedList);
                    toast.success(`Se leyeron ${parsedList.length} estudiantes del archivo Excel.`);
                }
            } catch (err: any) {
                toast.error("Error al procesar el archivo Excel: " + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImportExcel = async () => {
        if (!selectedGroupForStudents || excelStudents.length === 0) return;

        startTransition(async () => {
            try {
                const res = await registerStudentsBulkAction(selectedGroupForStudents.id, excelStudents);
                setImportResult(res);
                setExcelStudents([]);
                setExcelFileName("");
                
                toast.success(`Importación finalizada. Registrados: ${res.successCount}`);
                
                await refreshAll();
                await fetchSystemStudents();
            } catch (error: any) {
                toast.error(error.message || "Error durante la importación masiva");
            }
        });
    };

    const handleRegisterTeacherManual = async () => {
        if (!selectedProgram) return;
        if (!manualTeacherIdentificacion) {
            toast.error("El número de documento es obligatorio");
            return;
        }
        if (!manualTeacherNombres) {
            toast.error("El nombre es obligatorio");
            return;
        }
        if (!manualTeacherApellido) {
            toast.error("El apellido es obligatorio");
            return;
        }
        if (!manualTeacherEmail) {
            toast.error("El correo electrónico es obligatorio");
            return;
        }

        startTransition(async () => {
            try {
                await registerTeacherManualAction({
                    programId: selectedProgram.id,
                    identificacion: manualTeacherIdentificacion,
                    nombres: manualTeacherNombres,
                    apellido: manualTeacherApellido,
                    email: manualTeacherEmail,
                    telefono: manualTeacherTelefono || undefined
                });

                toast.success("Profesor registrado exitosamente");
                
                // Clear manual inputs
                setManualTeacherIdentificacion("");
                setManualTeacherNombres("");
                setManualTeacherApellido("");
                setManualTeacherEmail("");
                setManualTeacherTelefono("");
                
                await refreshAll();
                await fetchSystemTeachers();
            } catch (error: any) {
                toast.error(error.message || "Error al registrar profesor");
            }
        });
    };

    const handleTeacherExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setExcelTeacherFileName(file.name);
        setImportTeacherResult(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length <= 1) {
                    toast.error("El archivo está vacío o no contiene filas de datos");
                    return;
                }

                // Extrayendo encabezados (fila 0) y normalizándolos
                const firstRow = (jsonData[0] as any[]) || [];
                const headers: string[] = [];
                for (let i = 0; i < firstRow.length; i++) {
                    const val = firstRow[i];
                    headers.push(val ? val.toString().trim().toLowerCase() : "");
                }
                
                // Encontrar los índices de cada columna requerida
                const getIndex = (aliases: string[]) => {
                    const exactIdx = headers.findIndex(h => h && aliases.includes(h));
                    if (exactIdx !== -1) return exactIdx;
                    
                    return headers.findIndex(h => h && 
                        h !== "tipo de documento" && 
                        h !== "tipo de doc" && 
                        h !== "tipodoc" && 
                        h !== "tipo_documento" && 
                        aliases.some(alias => h.includes(alias))
                    );
                };

                const numDocIdx = getIndex(["identificacion", "identificación", "número de documento", "numero de documento", "documento", "cedula", "tarjeta", "nro doc"]);
                const nombreIdx = getIndex(["nombre", "nombres", "primer nombre"]);
                const apellidoIdx = getIndex(["apellido", "apellidos"]);
                const emailIdx = getIndex(["email", "mail", "correo electrónico", "correo electronico", "correo"]);
                const telefonoIdx = getIndex(["teléfono", "telefono", "tel", "celular", "movil", "cel"]);

                if (numDocIdx === -1) {
                    toast.error("No se encontró la columna de 'Identificacion' en el archivo Excel");
                    return;
                }

                if (emailIdx === -1) {
                    toast.error("No se encontró la columna de 'Email' en el archivo Excel");
                    return;
                }

                const missingCols: string[] = [];
                if (nombreIdx === -1) missingCols.push("Nombre");
                if (apellidoIdx === -1) missingCols.push("Apellidos");
                if (missingCols.length > 0) {
                    toast.info(`Nota: No se encontraron las columnas: ${missingCols.join(", ")}. Se auto-completarán los datos.`);
                }

                const parsedList: any[] = [];
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    const identificacion = row[numDocIdx]?.toString().trim();
                    if (!identificacion) continue;

                    const nombres = nombreIdx !== -1 && row[nombreIdx] ? row[nombreIdx].toString().trim() : "Profesor";
                    const apellido = apellidoIdx !== -1 && row[apellidoIdx] ? row[apellidoIdx].toString().trim() : "";
                    const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].toString().trim() : "";
                    const telefono = telefonoIdx !== -1 && row[telefonoIdx] ? row[telefonoIdx].toString().trim() : "";

                    parsedList.push({
                        identificacion,
                        nombres,
                        apellido,
                        email,
                        telefono
                    });
                }

                if (parsedList.length === 0) {
                    toast.error("No se encontraron registros de profesores válidos en el archivo");
                } else {
                    setExcelTeachers(parsedList);
                    toast.success(`Se leyeron ${parsedList.length} profesores del archivo Excel.`);
                }
            } catch (err: any) {
                toast.error("Error al procesar el archivo Excel: " + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImportTeacherExcel = async () => {
        if (!selectedProgram || excelTeachers.length === 0) return;

        startTransition(async () => {
            try {
                const res = await registerTeachersBulkAction(selectedProgram.id, excelTeachers);
                setImportTeacherResult(res);
                setExcelTeachers([]);
                setExcelTeacherFileName("");
                
                toast.success(`Importación finalizada. Registrados: ${res.successCount}`);
                
                await refreshAll();
                await fetchSystemTeachers();
            } catch (error: any) {
                toast.error(error.message || "Error durante la importación masiva");
            }
        });
    };

    const handleOpenTeacherAvailability = (teacher: Teacher) => {
        setSelectedTeacherForAvailability(teacher);
        setAdminTeacherAvailabilityOpen(true);
    };

    // ============ GENERAL DELETE HANDLER ============


    const handleOpenEditTeacher = (teacher: Teacher) => {
        setTeacherToEdit(teacher);
        setEditTeacherDoc(teacher.profile?.identificacion || "");
        
        let names = teacher.profile?.nombres || "";
        let lastName = teacher.profile?.apellido || "";
        if (!names && teacher.name) {
            const parts = teacher.name.trim().split(/\s+/);
            if (parts.length > 1) {
                names = parts[0];
                lastName = parts.slice(1).join(" ");
            } else {
                names = parts[0];
            }
        }

        setEditTeacherNames(names);
        setEditTeacherLastName(lastName);
        setEditTeacherEmail(teacher.email || "");
        setEditTeacherPhone(teacher.profile?.telefono || "");
        setEditTeacherDialogOpen(true);
    };


    const handleEditTeacherSave = async () => {
        if (!teacherToEdit) return;
        if (!editTeacherDoc || !editTeacherNames || !editTeacherLastName || !editTeacherEmail) {
            toast.error("Por favor completa todos los campos obligatorios");
            return;
        }

        startTransition(async () => {
            try {
                await updateTeacherAction({
                    id: teacherToEdit.id,
                    identificacion: editTeacherDoc,
                    nombres: editTeacherNames,
                    apellido: editTeacherLastName,
                    email: editTeacherEmail,
                    telefono: editTeacherPhone || undefined,
                });
                toast.success("Información del profesor actualizada");
                setEditTeacherDialogOpen(false);
                setTeacherToEdit(null);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al actualizar profesor");
            }
        });
    };



    const handleOpenQual = (teacher: Teacher) => {
        setQualTeacher(teacher);
        setQualDialogOpen(true);
    };



    const triggerDelete = (type: "program" | "period" | "group" | "course" | "teacher" | "student", id: string, name: string) => {
        setDeleteType(type);
        setDeleteItemId(id);
        setDeleteItemName(name);
        setDeleteConfirmationOpen(true);
    };



    const handleDeleteConfirm = async () => {
        if (!deleteType || !deleteItemId) return;

        startTransition(async () => {
            try {
                if (deleteType === "program") {
                    await deleteProgramAction(deleteItemId);
                    toast.success("Programa de formación eliminado");
                    if (selectedProgram?.id === deleteItemId) {
                        router.push('/dashboard/admin/courses');
                    }
                } else if (deleteType === "period") {
                    await deletePeriodAction(deleteItemId);
                    toast.success("Periodo académico eliminado");
                } else if (deleteType === "group") {
                    await deleteGroupAction(deleteItemId);
                    toast.success("Grupo académico eliminado");
                } else if (deleteType === "course") {
                    await deleteCourseAction(deleteItemId);
                    toast.success("Materia académica eliminada");
                } else if (deleteType === "teacher") {
                    await deleteUserAction(deleteItemId);
                    toast.success("Profesor eliminado del sistema");
                } else if (deleteType === "student") {
                    await deleteUserAction(deleteItemId);
                    toast.success("Estudiante eliminado del sistema");
                }
                setDeleteConfirmationOpen(false);
                await refreshAll();
                await fetchSystemStudents();
            } catch (error: any) {
                toast.error(error.message || "Error al eliminar el elemento");
            }
        });
    };

    // ============ COURSE FORM CRUD HANDLERS ============

    const openCreateCourseForPeriod = (periodId: string) => {
        setCourseToEdit(null);
        setCourseTitle("");
        setCourseDescription("");
        setCourseWeeklyHours(0);
        setCourseBadge("");
        setCourseBadgeColor("slate");
        setCoursePeriodId(periodId);
        setCourseDialogOpen(true);
    };

    const openEditCourse = (course: Course) => {
        setCourseToEdit(course);
        setCourseTitle(course.title);
        setCourseDescription(course.description || "");
        setCourseWeeklyHours(course.weeklyHours || 0);
        setCourseBadge(course.badge || "");
        setCourseBadgeColor(course.badgeColor || "slate");
        setCoursePeriodId(course.periodId || "");
        setCourseDialogOpen(true);
    };

    const handleSaveCourse = async () => {
        if (!courseTitle || courseTitle.trim().length < 3) {
            toast.error("El título de la materia debe tener al menos 3 caracteres");
            return;
        }
        if (!coursePeriodId || coursePeriodId === "none") {
            toast.error("Debes asociar la materia a un periodo académico");
            return;
        }

        const formData = new FormData();
        formData.append("title", courseTitle);
        formData.append("description", courseDescription);
        formData.append("periodId", coursePeriodId);
        formData.append("externalUrl", "");
        formData.append("weeklyHours", courseWeeklyHours.toString());
        formData.append("badge", courseBadge);
        formData.append("badgeColor", courseBadgeColor);
        formData.append("startDate", "");
        formData.append("endDate", "");
        formData.append("schedules", "[]");

        startTransition(async () => {
            try {
                if (courseToEdit) {
                    formData.append("courseId", courseToEdit.id);
                    await updateCourseAction(formData);
                    toast.success("Materia académica actualizada");
                } else {
                    await createCourseAction(formData);
                    toast.success("Materia creada exitosamente");
                }
                setCourseDialogOpen(false);
                await refreshAll();
            } catch (error: any) {
                toast.error(error.message || "Error al guardar la materia");
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Estructura Académica</h2>
                    <p className="text-muted-foreground">
                        Gestiona Programas de Formación, Periodos, Grupos y Materias.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={openCreateProgram} className="shadow-md hover:shadow-lg transition-all">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Programa
                    </Button>
                </div>
            </div>

            {selectedProgram === null ? (
                /* GRID VIEW OF ALL PROGRAMS */
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-muted-foreground">Programas de Formación Activos</h3>
                    </div>
                    
                    {programs.length === 0 ? (
                        <div className="text-center py-20 bg-muted/10 rounded-2xl border border-dashed border-muted/50">
                            <GraduationCap className="h-16 w-16 text-muted/30 mx-auto mb-4" />
                            <h3 className="font-semibold text-lg">No hay programas de formación</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                                Crea tu primer programa de formación profesional para empezar a organizar periodos académicos y grupos.
                            </p>
                            <Button onClick={openCreateProgram} className="mt-4">
                                <Plus className="mr-2 h-4 w-4" /> Crear Programa
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {programs.map((program) => {
                                const totalStudents = program.groups.reduce((acc, g) => acc + g.students.length, 0);
                                const totalCourses = program.periods.reduce((acc, p) => acc + p.courses.length, 0);
                                return (
                                    <Card key={program.id} className="border-none shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden bg-gradient-to-br from-background to-muted/10">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                                    <GraduationCap className="h-6 w-6" />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditProgram(program)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => triggerDelete("program", program.id, program.name)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <CardTitle className="text-xl font-bold mt-3 leading-tight">{program.name}</CardTitle>
                                            <CardDescription className="line-clamp-2 text-sm mt-1 h-10">
                                                {program.description || "Sin descripción proporcionada."}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-2">
                                            <div className="grid grid-cols-3 gap-2 border-t border-muted/50 pt-4 text-center">
                                                <div>
                                                    <div className="text-sm font-bold">{program.periods.length}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase">Periodos</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold">{totalCourses}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase">Materias</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold">{totalStudents}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase">Alumnos</div>
                                                </div>
                                            </div>
                                            
                                            <Button 
                                                onClick={() => {
                                                    router.push(`/dashboard/admin/courses?programId=${program.id}`);
                                                    setSubTab("overview");
                                                }}
                                                className="w-full mt-5 shadow-sm group-hover:bg-primary transition-all rounded-lg h-9"
                                            >
                                                Administrar
                                                <ArrowUpRight className="ml-1.5 h-4 w-4" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* PROGRAM-CENTRIC WORKSPACE */
                <div className="space-y-6">
                    {/* Header Panel */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20 p-5 rounded-2xl border border-muted/40 shadow-sm">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                                <GraduationCap className="h-7 w-7 text-primary" />
                                <h3 className="text-2xl font-bold tracking-tight">{selectedProgram.name}</h3>
                            </div>
                            <p className="text-muted-foreground text-sm max-w-2xl pl-10">
                                {selectedProgram.description || "Sin descripción."}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pl-10 sm:pl-0">
                            <Button size="sm" variant="outline" onClick={() => openEditProgram(selectedProgram)}>
                                <Edit className="h-4 w-4 mr-1.5" />
                                Editar
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => triggerDelete("program", selectedProgram.id, selectedProgram.name)}>
                                <Trash2 className="h-4 w-4 mr-1.5" />
                                Eliminar
                            </Button>
                        </div>
                    </div>

                    <Tabs value={subTab} onValueChange={setSubTab} className="space-y-6">
                        <TabsList className="flex w-full md:max-w-none overflow-x-auto bg-muted/40 p-1 rounded-xl scrollbar-none justify-start md:justify-center">
                            <TabsTrigger value="overview" className="rounded-lg flex-1 shrink-0">Vista General</TabsTrigger>
                            <TabsTrigger value="periods" className="rounded-lg flex-1 shrink-0">Periodos y Materias</TabsTrigger>
                            <TabsTrigger value="groups" className="rounded-lg flex-1 shrink-0">Grupos y Alumnos</TabsTrigger>
                            <TabsTrigger value="teachers" className="rounded-lg flex-1 shrink-0">Profesores</TabsTrigger>
                            <TabsTrigger value="environments" className="rounded-lg flex-1 shrink-0">Ambientes</TabsTrigger>
                        </TabsList>

                        {/* SUB-TAB: OVERVIEW */}
                        <TabsContent value="overview" className="space-y-6 mt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="bg-muted/10 border-none">
                                    <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
                                        <CardTitle className="text-sm font-medium">Periodos Académicos</CardTitle>
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="text-2xl font-bold">{selectedProgram.periods.length}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Periodos creados</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-muted/10 border-none">
                                    <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
                                        <CardTitle className="text-sm font-medium">Materias Totales</CardTitle>
                                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="text-2xl font-bold">
                                            {selectedProgram.periods.reduce((acc, p) => acc + p.courses.length, 0)}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Materias creadas</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-muted/10 border-none">
                                    <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
                                        <CardTitle className="text-sm font-medium">Total Estudiantes</CardTitle>
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="text-2xl font-bold">
                                            {selectedProgram.groups.reduce((acc, g) => acc + g.students.length, 0)}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Alumnos asignados</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-muted/10 border-none">
                                    <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
                                        <CardTitle className="text-sm font-medium">Profesores Asociados</CardTitle>
                                        <GraduationCap className="h-4.5 w-4.5 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="text-2xl font-bold">{selectedProgram.teachers?.length || 0}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Docentes vinculados</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* SUB-TAB: PERIODS & COURSES */}
                        <TabsContent value="periods" className="space-y-6 mt-0">
                            <div className="flex justify-between items-center pb-2">
                                <h4 className="text-base font-semibold text-muted-foreground">Periodos y Materias de {selectedProgram.name}</h4>
                                <Button onClick={openCreatePeriod} size="sm" className="shadow-sm">
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    Agregar Periodo
                                </Button>
                            </div>

                            {selectedProgram.periods.length === 0 ? (
                                <div className="text-center py-16 bg-muted/10 rounded-2xl border border-dashed border-muted/50">
                                    <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                    <h4 className="font-semibold">Sin Periodos Académicos</h4>
                                    <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
                                        Crea el primer periodo académico para este programa para empezar a crear materias.
                                    </p>
                                    <Button onClick={openCreatePeriod} className="mt-4" size="sm">
                                        <Plus className="mr-1.5 h-4 w-4" /> Crear Periodo
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {selectedProgram.periods.map(period => (
                                        <Card key={period.id} className="border-none shadow-sm relative overflow-hidden bg-background flex flex-col justify-between">
                                            <div>
                                                <CardHeader className="bg-muted/10 pb-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <CardTitle className="text-lg font-bold">{period.name}</CardTitle>
                                                            <CardDescription className="text-xs mt-1">
                                                                {period.description || "Periodo académico del programa"}
                                                            </CardDescription>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => openEditPeriod(period)}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => triggerDelete("period", period.id, period.name)}>
                                                                                               <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-5 space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Materias del Periodo ({period.courses.length})</span>
                                                    </div>

                                                    {period.courses.length === 0 ? (
                                                        <div className="text-center py-8 text-muted-foreground text-xs bg-muted/5 border border-dashed border-muted/50 rounded-xl">
                                                            No hay materias creadas para este periodo.
                                                        </div>
                                                    ) : (
                                                        <DndContext
                                                            sensors={sensors}
                                                            collisionDetection={closestCenter}
                                                            onDragEnd={(event) => handleDragEnd(event, period.id)}
                                                        >
                                                            <SortableContext
                                                                items={period.courses.map(c => c.id)}
                                                                strategy={verticalListSortingStrategy}
                                                            >
                                                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                                                    {period.courses.map(course => (
                                                                        <SortableCourseItem
                                                                            key={course.id}
                                                                            course={course}
                                                                            openEditCourse={openEditCourse}
                                                                            triggerDelete={triggerDelete}
                                                                            setSelectedCourseForDesc={setSelectedCourseForDesc}
                                                                            setDescriptionDialogOpen={setDescriptionDialogOpen}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </SortableContext>
                                                        </DndContext>
                                                    )}
                                                    {period.courses.length > 0 && (
                                                        <div className="pt-3 border-t border-muted/30 flex justify-between items-center text-xs font-bold text-muted-foreground mt-2 animate-in fade-in duration-200">
                                                            <span>Total Horas Programadas:</span>
                                                            <span className="flex items-center gap-1 bg-primary/5 text-primary border border-primary/15 px-2.5 py-1 rounded-lg">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                {formatWeeklyHours(period.courses.reduce((sum, c) => sum + (c.weeklyHours || 0), 0))}
                                                            </span>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </div>
                                            <CardContent className="px-5 pb-5 pt-0">
                                                <Button size="sm" variant="outline" className="w-full h-9 text-xs border-dashed border-primary/30 hover:border-primary/60" onClick={() => openCreateCourseForPeriod(period.id)}>
                                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                                    Crear Materia
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* SUB-TAB: GROUPS & STUDENTS */}
                        <TabsContent value="groups" className="space-y-6 mt-0">
                            {managingGroup ? (
                                <div className="space-y-6 animate-in fade-in-50 duration-200">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20 p-5 rounded-2xl border border-muted/40 shadow-sm">
                                        <div className="space-y-1.5">
                                            <Button 
                                                variant="ghost" 
                                                onClick={() => setManagingGroup(null)}
                                                className="h-8 pl-1 text-muted-foreground hover:text-foreground text-xs"
                                            >
                                                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                                                Volver a Grupos
                                            </Button>
                                            <div className="flex items-center flex-wrap gap-3">
                                                <Users className="h-6 w-6 text-primary" />
                                                <h4 className="text-xl font-bold tracking-tight">Gestión de Grupo: {managingGroup.name}</h4>
                                                {managingGroup.period && (
                                                    <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5 bg-secondary/80 text-secondary-foreground border border-muted">
                                                        Periodo: {managingGroup.period.name}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-muted-foreground text-xs max-w-2xl pl-7">
                                                {managingGroup.description || "Grupo de alumnos de este programa"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-4 mt-0">
                                            <div className="flex justify-between items-center">
                                                <h5 className="text-sm font-semibold text-muted-foreground">Listado de Estudiantes ({managingGroup.students.length})</h5>
                                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openAssignStudents(managingGroup)}>
                                                    <Plus className="h-3 w-3 mr-1.5" />
                                                    Asociar Estudiantes
                                                </Button>
                                            </div>
                                            <Card className="border-none shadow-sm bg-background">
                                                <CardContent className="p-5">
                                                    {managingGroup.students.length === 0 ? (
                                                        <div className="text-center py-16 text-muted-foreground text-sm bg-muted/5 border border-dashed border-muted/50 rounded-xl">
                                                            No hay estudiantes asignados en este grupo.
                                                            <br />
                                                            <Button size="sm" variant="outline" className="mt-4 text-xs" onClick={() => openAssignStudents(managingGroup)}>
                                                                <Plus className="h-3.5 w-3.5 mr-1.5" /> Asociar Estudiantes
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="border border-muted/40 rounded-xl overflow-hidden">
                                                            <Table>
                                                                <TableHeader className="bg-muted/10">
                                                                    <TableRow>
                                                                        <TableHead className="py-3 text-xs font-semibold">Identificación</TableHead>
                                                                        <TableHead className="py-3 text-xs font-semibold">Nombre Completo</TableHead>
                                                                        <TableHead className="py-3 text-xs font-semibold">Correo Electrónico</TableHead>
                                                                        <TableHead className="py-3 text-xs font-semibold">Teléfono</TableHead>
                                                                        <TableHead className="py-3 text-xs font-semibold text-right">Acción</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {managingGroup.students.map((student) => (
                                                                        <TableRow key={student.id} className="hover:bg-muted/5">
                                                                            <TableCell className="py-3 text-xs font-mono">
                                                                                {student.profile?.identificacion || "S/D"}
                                                                            </TableCell>
                                                                            <TableCell className="py-3 text-xs font-medium">{student.name}</TableCell>
                                                                            <TableCell className="py-3 text-xs text-muted-foreground font-sans">{student.email}</TableCell>
                                                                            <TableCell className="py-3 text-xs text-muted-foreground font-sans">{student.profile?.telefono || "—"}</TableCell>
                                                                            <TableCell className="py-3 text-right">
                                                                                <div className="flex items-center justify-end gap-1.5">
                                                                                    <Tooltip><TooltipTrigger asChild><Button
                                                                                        size="icon"
                                                                                        variant="ghost"
                                                                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                                                        onClick={() => triggerDelete("student", student.id, student.name)}
                                                                                    >
                                                                                        <Trash2 className="h-4 w-4" />
                                                                                    </Button></TooltipTrigger><TooltipContent><p>Eliminar estudiante del sistema</p></TooltipContent></Tooltip>
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* GROUPS LIST TABLE VIEW */
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-2">
                                        <h4 className="text-base font-semibold text-muted-foreground">Grupos de Alumnos de {selectedProgram.name}</h4>
                                        <Button onClick={openCreateGroup} size="sm" className="shadow-sm">
                                            <Plus className="h-4 w-4 mr-1.5" />
                                            Agregar Grupo
                                        </Button>
                                    </div>

                                    {selectedProgram.groups.length === 0 ? (
                                        <div className="text-center py-16 bg-muted/10 rounded-2xl border border-dashed border-muted/50">
                                            <Layers className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                            <h4 className="font-semibold">Sin Grupos</h4>
                                            <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
                                                Crea el primer grupo en este programa para empezar a asociar estudiantes.
                                            </p>
                                            <Button onClick={openCreateGroup} className="mt-4" size="sm">
                                                <Plus className="mr-1.5 h-4 w-4" /> Crear Grupo
                                            </Button>
                                        </div>
                                    ) : (
                                        <Card className="border-none shadow-sm bg-background overflow-hidden">
                                            <CardContent className="p-0">
                                                <Table>
                                                    <TableHeader className="bg-muted/10">
                                                        <TableRow>
                                                            <TableHead className="py-3 text-xs font-semibold">Grupo</TableHead>
                                                            <TableHead className="py-3 text-xs font-semibold">Descripción</TableHead>
                                                            <TableHead className="py-3 text-xs font-semibold text-center">Cantidad de Alumnos</TableHead>
                                                            <TableHead className="py-3 text-xs font-semibold text-right">Acciones</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {selectedProgram.groups.map(group => (
                                                            <TableRow key={group.id} className="hover:bg-muted/5">
                                                                <TableCell className="py-3 text-xs font-bold text-foreground">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span>{group.name}</span>
                                                                        {group.period && (
                                                                            <Badge variant="secondary" className="font-semibold text-[10px] px-1.5 py-0.2 bg-primary/10 text-primary border border-primary/20 shrink-0">
                                                                                {group.period.name}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    {(group.startTime || group.endTime) && (
                                                                        <div className="text-[10px] text-muted-foreground font-normal mt-1 flex flex-col gap-0.5">
                                                                            {(group.startTime || group.endTime) && (
                                                                                <div className="flex items-center gap-1">
                                                                                    <Clock className="h-3 w-3 text-primary/70 shrink-0" />
                                                                                    <span>
                                                                                        Horario: {group.startTime ? toFormat12h(group.startTime) : "---"} - {group.endTime ? toFormat12h(group.endTime) : "---"}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="py-3 text-xs text-muted-foreground max-w-xs truncate">
                                                                    {group.description || "Grupo de alumnos de este programa"}
                                                                </TableCell>
                                                                <TableCell className="py-3 text-xs text-center font-semibold">
                                                                    <Badge variant="secondary" className="px-2 py-0.5 font-mono text-[11px]">
                                                                        {group.students.length}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="py-3 text-right">
                                                                    <div className="flex justify-end items-center gap-1.5">
                                                                        <Tooltip><TooltipTrigger asChild><Button 
                                                                                                                                                    size="sm" 
                                                                                                                                                    variant="outline" 
                                                                                                                                                    className="h-8 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/5 flex items-center gap-1.5"
                                                                                                                                                    onClick={() => setManagingGroup(group)}
                                                                                                                                                >
                                                                                                                                                    <Users className="h-3.5 w-3.5" />
                                                                                                                                                    <span>Gestionar</span>
                                                                                                                                                </Button></TooltipTrigger><TooltipContent><p>Gestionar Estudiantes</p></TooltipContent></Tooltip>
                                                                        <Tooltip><TooltipTrigger asChild><Button 
                                                                                                                                                    size="icon" 
                                                                                                                                                    variant="ghost" 
                                                                                                                                                    className="h-8 w-8 text-muted-foreground hover:bg-muted/10" 
                                                                                                                                                    onClick={() => openEditGroup(group)}
                                                                                                                                                >
                                                                                                                                                    <Edit className="h-3.5 w-3.5" />
                                                                                                                                                </Button></TooltipTrigger><TooltipContent><p>Editar Grupo</p></TooltipContent></Tooltip>
                                                                        <Tooltip><TooltipTrigger asChild><Button 
                                                                                                                                                    size="icon" 
                                                                                                                                                    variant="ghost" 
                                                                                                                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                                                                                                                                                    onClick={() => triggerDelete("group", group.id, group.name)}
                                                                                                                                                >
                                                                                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                                                                                </Button></TooltipTrigger><TooltipContent><p>Eliminar Grupo</p></TooltipContent></Tooltip>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* SUB-TAB: TEACHERS */}
                        <TabsContent value="teachers" className="space-y-6 mt-0">
                            <div className="flex justify-between items-center pb-2">
                                <h4 className="text-base font-semibold text-muted-foreground">Profesores de {selectedProgram.name}</h4>
                                <Button onClick={() => setAssignTeachersDialogOpen(true)} size="sm" className="shadow-sm">
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    Registrar Profesor
                                </Button>
                            </div>

                            {(!selectedProgram.teachers || selectedProgram.teachers.length === 0) ? (
                                <div className="text-center py-16 bg-muted/10 rounded-2xl border border-dashed border-muted/50">
                                    <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                    <h4 className="font-semibold">Sin Profesores</h4>
                                    <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
                                        Registra profesores en este programa de formación para que puedan ser asignados a impartir materias.
                                    </p>
                                    <Button onClick={() => setAssignTeachersDialogOpen(true)} className="mt-4" size="sm">
                                        <Plus className="mr-1.5 h-4 w-4" /> Registrar Profesor
                                    </Button>
                                </div>
                            ) : (
                                <Card className="border-none shadow-sm bg-background overflow-hidden">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader className="bg-muted/10">
                                                <TableRow>
                                                    <TableHead className="py-3 text-xs font-semibold">Identificación</TableHead>
                                                    <TableHead className="py-3 text-xs font-semibold">Nombre Completo</TableHead>
                                                    <TableHead className="py-3 text-xs font-semibold">Correo Electrónico</TableHead>
                                                    <TableHead className="py-3 text-xs font-semibold">Teléfono</TableHead>
                                                    <TableHead className="py-3 text-xs font-semibold text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedProgram.teachers.map(teacher => (
                                                    <TableRow key={teacher.id} className="hover:bg-muted/5 group">
                                                        <TableCell className="py-3 text-xs font-medium text-foreground">
                                                            {teacher.profile?.identificacion || "—"}
                                                        </TableCell>
                                                        <TableCell className="py-3 text-xs font-bold text-foreground">
                                                            {teacher.name || "Sin nombre"}
                                                        </TableCell>
                                                        <TableCell className="py-3 text-xs text-muted-foreground font-sans">
                                                            {teacher.email}
                                                        </TableCell>
                                                        <TableCell className="py-3 text-xs text-muted-foreground font-sans">
                                                            {teacher.profile?.telefono || "—"}
                                                        </TableCell>
                                                        <TableCell className="py-3 text-right">
                                                            <div className="flex justify-end items-center gap-1.5 ml-auto opacity-80 group-hover:opacity-100 transition-opacity">
                                                                <Tooltip><TooltipTrigger asChild><Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground hover:bg-muted/10"
                                                                    onClick={() => handleOpenEditTeacher(teacher)}
                                                                >
                                                                    <Edit className="h-3.5 w-3.5" />
                                                                </Button></TooltipTrigger><TooltipContent><p>Editar Información</p></TooltipContent></Tooltip>
                                                                <Tooltip><TooltipTrigger asChild><Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground hover:bg-muted/10"
                                                                    onClick={() => handleOpenQual(teacher)}
                                                                >
                                                                    <BookOpen className="h-3.5 w-3.5" />
                                                                </Button></TooltipTrigger><TooltipContent><p>Materias Habilitadas</p></TooltipContent></Tooltip>
                                                                <Tooltip><TooltipTrigger asChild><Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground hover:bg-muted/10"
                                                                    onClick={() => handleOpenTeacherAvailability(teacher)}
                                                                >
                                                                    <Clock className="h-3.5 w-3.5" />
                                                                </Button></TooltipTrigger><TooltipContent><p>Ver Disponibilidad</p></TooltipContent></Tooltip>

                                                                <Tooltip><TooltipTrigger asChild><Button 
                                                                    size="icon" 
                                                                    variant="ghost" 
                                                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                                    onClick={() => triggerDelete("teacher", teacher.id, teacher.name || "Profesor")}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button></TooltipTrigger><TooltipContent><p>Eliminar profesor del sistema</p></TooltipContent></Tooltip>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        {/* SUB-TAB: ENVIRONMENTS */}
                        <TabsContent value="environments" className="space-y-6 mt-0">
                            <EnvironmentManagement
                                initialEnvironments={selectedProgram.environments || []}
                                programId={selectedProgram.id}
                                onActionComplete={refreshAll}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            )}

            {/* ============ DIALOG: PROGRAM CRUD ============ */}
            <Dialog open={programDialogOpen} onOpenChange={setProgramDialogOpen}>
                <DialogContent className="max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>{programToEdit ? "Editar Programa de Formación" : "Crear Programa de Formación"}</DialogTitle>
                        <DialogDescription>Completa la información del programa para tu institución.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="progName">Nombre del Programa</Label>
                            <Input
                                id="progName"
                                placeholder="Ej: Ingeniería de Sistemas, Técnico de Redes..."
                                value={programName}
                                onChange={(e) => setProgramName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="progDesc">Descripción</Label>
                            <Textarea
                                id="progDesc"
                                placeholder="Detalles o descripción breve del programa formativo..."
                                value={programDescription}
                                onChange={(e) => setProgramDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="progStartDate">Fecha de Inicio</Label>
                                <Input
                                    id="progStartDate"
                                    type="date"
                                    value={programStartDate}
                                    onChange={(e) => setProgramStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="progEndDate">Fecha de Fin</Label>
                                <Input
                                    id="progEndDate"
                                    type="date"
                                    value={programEndDate}
                                    onChange={(e) => setProgramEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="progScheduleTitle">Título del Horario</Label>
                            <Input
                                id="progScheduleTitle"
                                placeholder="Ej: Horario Académico 2026-1"
                                value={programScheduleTitle}
                                onChange={(e) => setProgramScheduleTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="progMaxHours">Límite Legal de Horas Semanales por Docente</Label>
                            <Input
                                id="progMaxHours"
                                type="number"
                                min={1}
                                max={80}
                                value={programMaxHours}
                                onChange={(e) => setProgramMaxHours(Number(e.target.value))}
                            />
                            <p className="text-xs text-muted-foreground">Este valor se usará para alertar asignaciones que superen el límite contractual.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setProgramDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveProgram} disabled={isPending}>
                            {programToEdit ? "Actualizar" : "Crear"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: PERIOD CRUD ============ */}
            <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
                <DialogContent className="max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>{periodToEdit ? "Editar Periodo Académico" : "Agregar Periodo Académico"}</DialogTitle>
                        <DialogDescription>Define un periodo académico (Ej: Semestre I, Ciclo 2026-1) bajo {selectedProgram?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="perName">Nombre del Periodo</Label>
                            <Input
                                id="perName"
                                placeholder="Ej: Semestre I, Trimestre II..."
                                value={periodName}
                                onChange={(e) => setPeriodName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="perDesc">Descripción</Label>
                            <Textarea
                                id="perDesc"
                                placeholder="Notas opcionales del periodo..."
                                value={periodDescription}
                                onChange={(e) => setPeriodDescription(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPeriodDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSavePeriod} disabled={isPending}>
                            {periodToEdit ? "Actualizar" : "Agregar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: GROUP CRUD ============ */}
            <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                <DialogContent className="max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>{groupToEdit ? "Editar Grupo Académico" : "Crear Grupo Académico"}</DialogTitle>
                        <DialogDescription>Define un grupo de estudiantes (Ej: Ficha 25567, Grupo A) bajo {selectedProgram?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="grpName">Nombre/Código del Grupo</Label>
                            <Input
                                id="grpName"
                                placeholder="Ej: Grupo A, Ficha 2529..."
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>
                        {selectedProgram && selectedProgram.periods.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="grpPeriod">Periodo Académico Actual (Opcional)</Label>
                                <Select value={groupPeriodId} onValueChange={setGroupPeriodId}>
                                    <SelectTrigger id="grpPeriod">
                                        <SelectValue placeholder="Selecciona el periodo actual que cursa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Ninguno / Sin definir</SelectItem>
                                        {selectedProgram.periods.map(per => (
                                            <SelectItem key={per.id} value={per.id}>{per.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="grpDesc">Descripción</Label>
                            <Textarea
                                id="grpDesc"
                                placeholder="Detalles de este grupo..."
                                value={groupDescription}
                                onChange={(e) => setGroupDescription(e.target.value)}
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="grpStartTime">Hora de Inicio *</Label>
                                <Input
                                    id="grpStartTime"
                                    type="time"
                                    value={groupStartTime}
                                    onChange={(e) => setGroupStartTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="grpEndTime">Hora de Fin *</Label>
                                <Input
                                    id="grpEndTime"
                                    type="time"
                                    value={groupEndTime}
                                    onChange={(e) => setGroupEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setGroupDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveGroup} disabled={isPending}>
                            {groupToEdit ? "Actualizar" : "Crear"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: ASSOCIATE STUDENTS TO GROUP ============ */}
            <Dialog open={assignStudentsDialogOpen} onOpenChange={setAssignStudentsDialogOpen}>
                <DialogContent className="max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Asociar Estudiantes al Grupo {selectedGroupForStudents?.name}</DialogTitle>
                        <DialogDescription>Registra estudiantes manualmente o impórtalos desde un archivo de Excel.</DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="manual" className="w-full mt-2">
                        <TabsList className="grid w-full grid-cols-2 bg-muted/40 p-1 rounded-xl mb-4">
                            <TabsTrigger value="manual" className="rounded-lg text-xs">Registro Manual</TabsTrigger>
                            <TabsTrigger value="excel" className="rounded-lg text-xs">Importar Excel</TabsTrigger>
                        </TabsList>

                        {/* TAB: MANUAL REGISTRATION */}
                        <TabsContent value="manual" className="space-y-4 mt-0">
                            <div className="space-y-3 border border-muted/40 p-4 rounded-xl bg-muted/5">
                                <span className="text-xs font-semibold text-muted-foreground uppercase">Formulario de Registro</span>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1 col-span-2">
                                        <Label htmlFor="mNumDoc" className="text-xs">Número de Documento *</Label>
                                        <Input
                                            id="mNumDoc"
                                            placeholder="Ej: 10245678 (Este número será la contraseña inicial)"
                                            className="h-9 text-xs"
                                            value={manualIdentificacion}
                                            onChange={(e) => setManualIdentificacion(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="mNombres" className="text-xs">Nombres *</Label>
                                        <Input
                                            id="mNombres"
                                            placeholder="Ej: Juan Carlos"
                                            className="h-9 text-xs"
                                            value={manualNombres}
                                            onChange={(e) => setManualNombres(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="mApellidos" className="text-xs">Apellidos *</Label>
                                        <Input
                                            id="mApellidos"
                                            placeholder="Ej: Pérez Gómez"
                                            className="h-9 text-xs"
                                            value={manualApellido}
                                            onChange={(e) => setManualApellido(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1 col-span-2">
                                        <Label htmlFor="mEmail" className="text-xs">Correo Electrónico *</Label>
                                        <Input
                                            id="mEmail"
                                            type="email"
                                            placeholder="Ej: juan.perez@correo.com"
                                            className="h-9 text-xs"
                                            value={manualEmail}
                                            onChange={(e) => setManualEmail(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1 col-span-2">
                                        <Label htmlFor="mTel" className="text-xs">Teléfono / Celular</Label>
                                        <Input
                                            id="mTel"
                                            placeholder="Ej: 3123456789"
                                            className="h-9 text-xs"
                                            value={manualTelefono}
                                            onChange={(e) => setManualTelefono(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Button 
                                    onClick={handleRegisterStudentManual} 
                                    className="w-full mt-2 h-9 text-xs"
                                    disabled={isPending}
                                >
                                    {isPending ? "Registrando..." : "Registrar y Asociar"}
                                </Button>
                            </div>
                        </TabsContent>

                        {/* TAB: EXCEL IMPORT */}
                        <TabsContent value="excel" className="space-y-4 mt-0">
                            <div className="space-y-3">
                                <div className="border border-dashed border-muted/50 rounded-xl p-4 bg-muted/5 text-center relative hover:bg-muted/10 transition-colors duration-150">
                                    <input 
                                        type="file" 
                                        accept=".xlsx, .xls" 
                                        onChange={handleExcelFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={isPending}
                                    />
                                    <div className="py-2">
                                        <p className="text-xs font-semibold text-foreground/80">
                                            {excelFileName ? `Archivo: ${excelFileName}` : "Haz clic o arrastra un archivo de Excel aquí"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Soporta .xlsx y .xls</p>
                                    </div>
                                </div>

                                <div className="bg-muted/10 p-3 rounded-lg text-[10px] text-muted-foreground space-y-1">
                                    <p className="font-semibold text-foreground/70">Columnas requeridas en la primera hoja:</p>
                                    <p>• <span className="font-semibold">Identificacion</span> (identificación única y contraseña inicial)</p>
                                    <p>• <span className="font-semibold">Email</span> (correo electrónico único y obligatorio)</p>
                                    <p>• <span className="font-semibold">Nombre</span>, <span className="font-semibold">Apellidos</span></p>
                                    <p className="mt-1 font-semibold text-foreground/70">Columnas opcionales:</p>
                                    <p>• <span className="font-semibold">Teléfono</span></p>
                                </div>

                                {excelStudents.length > 0 && (
                                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex justify-between items-center">
                                        <span className="text-xs font-medium text-primary">Se leyeron {excelStudents.length} estudiantes listos para importar.</span>
                                        <Button 
                                            size="sm" 
                                            onClick={handleImportExcel} 
                                            disabled={isPending}
                                            className="h-8 text-xs shrink-0"
                                        >
                                            {isPending ? "Importando..." : "Importar Ahora"}
                                        </Button>
                                    </div>
                                )}

                                {importResult && (
                                    <div className="border border-muted/30 rounded-xl p-3 bg-muted/5 space-y-2 text-xs">
                                        <p className="font-bold text-foreground/90 uppercase tracking-wider text-[10px]">Resultado de la Importación:</p>
                                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                            <div className="bg-green-500/10 border border-green-500/20 p-2 rounded text--600 dark:text--400">
                                                <span className="block font-bold text-lg">{importResult.successCount}</span>
                                                Registrados con éxito
                                            </div>
                                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text--600 dark:text--400">
                                                <span className="block font-bold text-lg">{importResult.skippedCount}</span>
                                                Omitidos/Duplicados
                                            </div>
                                        </div>
                                        {importResult.errors && importResult.errors.length > 0 && (
                                            <div className="mt-2">
                                                <p className="font-semibold text-destructive mb-1 text-[11px]">Detalle de omisiones/errores:</p>
                                                <ul className="max-h-[100px] overflow-y-auto space-y-1 list-disc pl-4 text-muted-foreground text-[10px]">
                                                    {importResult.errors.map((err, idx) => (
                                                        <li key={idx}>{err}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-4 pt-2 border-t border-muted/20">
                        <Button onClick={() => setAssignStudentsDialogOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: REGISTER TEACHER TO PROGRAM ============ */}
            <Dialog open={assignTeachersDialogOpen} onOpenChange={setAssignTeachersDialogOpen}>
                <DialogContent className="max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Registrar Profesor en {selectedProgram?.name}</DialogTitle>
                        <DialogDescription>Crea un profesor manualmente o impórtalo desde Excel. Quedará automáticamente asociado a este programa.</DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="manual" className="w-full mt-2">
                        <TabsList className="grid w-full grid-cols-2 bg-muted/40 p-1 rounded-xl mb-4">
                            <TabsTrigger value="manual" className="rounded-lg text-xs">Registro Manual</TabsTrigger>
                            <TabsTrigger value="excel" className="rounded-lg text-xs">Importar Excel</TabsTrigger>
                        </TabsList>

                        {/* TAB: MANUAL TEACHER REGISTRATION */}
                        <TabsContent value="manual" className="space-y-4 mt-0">
                            <div className="space-y-3 border border-muted/40 p-4 rounded-xl bg-muted/5">
                                <span className="text-xs font-semibold text-muted-foreground uppercase">Formulario de Registro</span>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1 col-span-2">
                                        <Label htmlFor="mtNumDoc" className="text-xs">Número de Documento *</Label>
                                        <Input
                                            id="mtNumDoc"
                                            placeholder="Ej: 10245678 (Contraseña inicial)"
                                            className="h-9 text-xs"
                                            value={manualTeacherIdentificacion}
                                            onChange={(e) => setManualTeacherIdentificacion(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="mtNombres" className="text-xs">Nombres *</Label>
                                        <Input
                                            id="mtNombres"
                                            placeholder="Ej: Ana María"
                                            className="h-9 text-xs"
                                            value={manualTeacherNombres}
                                            onChange={(e) => setManualTeacherNombres(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="mtApellidos" className="text-xs">Apellidos *</Label>
                                        <Input
                                            id="mtApellidos"
                                            placeholder="Ej: López Soto"
                                            className="h-9 text-xs"
                                            value={manualTeacherApellido}
                                            onChange={(e) => setManualTeacherApellido(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1 col-span-2">
                                        <Label htmlFor="mtEmail" className="text-xs">Correo Electrónico *</Label>
                                        <Input
                                            id="mtEmail"
                                            type="email"
                                            placeholder="Ej: ana.lopez@correo.com"
                                            className="h-9 text-xs"
                                            value={manualTeacherEmail}
                                            onChange={(e) => setManualTeacherEmail(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1 col-span-2">
                                        <Label htmlFor="mtTel" className="text-xs">Teléfono / Celular</Label>
                                        <Input
                                            id="mtTel"
                                            placeholder="Ej: 3001234567"
                                            className="h-9 text-xs"
                                            value={manualTeacherTelefono}
                                            onChange={(e) => setManualTeacherTelefono(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Button 
                                    onClick={handleRegisterTeacherManual} 
                                    className="w-full mt-2 h-9 text-xs"
                                    disabled={isPending}
                                >
                                    {isPending ? "Registrando..." : "Registrar Profesor"}
                                </Button>
                            </div>
                        </TabsContent>

                        {/* TAB: EXCEL TEACHER IMPORT */}
                        <TabsContent value="excel" className="space-y-4 mt-0">
                            <div className="space-y-3">
                                <div className="border border-dashed border-muted/50 rounded-xl p-4 bg-muted/5 text-center relative hover:bg-muted/10 transition-colors duration-150">
                                    <input 
                                        type="file" 
                                        accept=".xlsx, .xls" 
                                        onChange={handleTeacherExcelFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={isPending}
                                    />
                                    <div className="py-2">
                                        <p className="text-xs font-semibold text-foreground/80">
                                            {excelTeacherFileName ? `Archivo: ${excelTeacherFileName}` : "Haz clic o arrastra un archivo de Excel aquí"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Soporta .xlsx y .xls</p>
                                    </div>
                                </div>

                                <div className="bg-muted/10 p-3 rounded-lg text-[10px] text-muted-foreground space-y-1">
                                    <p className="font-semibold text-foreground/70">Columnas requeridas en la primera hoja:</p>
                                    <p>• <span className="font-semibold">Identificacion</span> (contraseña inicial)</p>
                                    <p>• <span className="font-semibold">Email</span> (correo único)</p>
                                    <p>• <span className="font-semibold">Nombre</span>, <span className="font-semibold">Apellidos</span></p>
                                    <p className="mt-1 font-semibold text-foreground/70">Columnas opcionales:</p>
                                    <p>• <span className="font-semibold">Teléfono</span></p>
                                </div>

                                {excelTeachers.length > 0 && (
                                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex justify-between items-center">
                                        <span className="text-xs font-medium text-primary">Se leyeron {excelTeachers.length} profesores listos para importar.</span>
                                        <Button 
                                            size="sm" 
                                            onClick={handleImportTeacherExcel} 
                                            disabled={isPending}
                                            className="h-8 text-xs shrink-0"
                                        >
                                            {isPending ? "Importando..." : "Importar Ahora"}
                                        </Button>
                                    </div>
                                )}

                                {importTeacherResult && (
                                    <div className="border border-muted/30 rounded-xl p-3 bg-muted/5 space-y-2 text-xs">
                                        <p className="font-bold text-foreground/90 uppercase tracking-wider text-[10px]">Resultado de la Importación:</p>
                                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                            <div className="bg-green-500/10 border border-green-500/20 p-2 rounded text-green-600 dark:text-green-400">
                                                <span className="block font-bold text-lg">{importTeacherResult.successCount}</span>
                                                Registrados con éxito
                                            </div>
                                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-yellow-600 dark:text-yellow-400">
                                                <span className="block font-bold text-lg">{importTeacherResult.skippedCount}</span>
                                                Omitidos/Duplicados
                                            </div>
                                        </div>
                                        {importTeacherResult.errors && importTeacherResult.errors.length > 0 && (
                                            <div className="mt-2">
                                                <p className="font-semibold text-destructive mb-1 text-[11px]">Detalle de omisiones/errores:</p>
                                                <ul className="max-h-[100px] overflow-y-auto space-y-1 list-disc pl-4 text-muted-foreground text-[10px]">
                                                    {importTeacherResult.errors.map((err, idx) => (
                                                        <li key={idx}>{err}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-4 pt-2 border-t border-muted/20">
                        <Button onClick={() => setAssignTeachersDialogOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: EDIT TEACHER ============ */}
            <Dialog open={editTeacherDialogOpen} onOpenChange={setEditTeacherDialogOpen}>
                <DialogContent className="max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Editar Profesor</DialogTitle>
                        <DialogDescription>Actualiza la información del profesor seleccionado.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="edTDoc">Número de Documento *</Label>
                            <Input id="edTDoc" value={editTeacherDoc} onChange={(e) => setEditTeacherDoc(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edTName">Nombres *</Label>
                            <Input id="edTName" value={editTeacherNames} onChange={(e) => setEditTeacherNames(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edTLast">Apellidos *</Label>
                            <Input id="edTLast" value={editTeacherLastName} onChange={(e) => setEditTeacherLastName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edTEmail">Correo Electrónico *</Label>
                            <Input id="edTEmail" type="email" value={editTeacherEmail} onChange={(e) => setEditTeacherEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edTTel">Teléfono</Label>
                            <Input id="edTTel" value={editTeacherPhone} onChange={(e) => setEditTeacherPhone(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditTeacherDialogOpen(false)} disabled={isPending}>Cancelar</Button>
                        <Button onClick={handleEditTeacherSave} disabled={isPending}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: TEACHER QUALIFICATIONS (MATERIAS) ============ */}
            <Dialog open={qualDialogOpen} onOpenChange={setQualDialogOpen}>
                <DialogContent className="max-w-[100vw] sm:max-w-[100vw] w-screen h-[100dvh] max-h-[100dvh] rounded-none m-0 border-0 flex flex-col p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>
                            {qualTeacher ? `Materias de ${qualTeacher.name}` : "Cargando..."}
                        </DialogTitle>
                        <DialogDescription>
                            Selecciona las materias que este docente está calificado para dictar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-4 max-h-[70vh]">
                        {qualTeacher && (
                            <TeacherQualificationsView 
                                teacherId={qualTeacher.id} 
                                isAdminMode={true} 
                                onAdminActionComplete={refreshAll} 
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>



            {/* ============ DIALOG: COURSE CRUD ============ */}
            <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
                <DialogContent className="max-w-[550px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{courseToEdit ? "Editar Materia Académica" : "Crear Nueva Materia Académica"}</DialogTitle>
                        <DialogDescription>Registra una materia e inicializa su planificación.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="cTitle">Título de la Materia</Label>
                                <Input
                                    id="cTitle"
                                    placeholder="Ej: Matemáticas Básicas, Algoritmos..."
                                    value={courseTitle}
                                    onChange={(e) => setCourseTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="cDesc">Descripción</Label>
                                <Textarea
                                    id="cDesc"
                                    placeholder="Temario u objetivos..."
                                    value={courseDescription}
                                    onChange={(e) => setCourseDescription(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label htmlFor="cWeeklyHours">Horas Semanales</Label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Select value={Math.floor(courseWeeklyHours || 0).toString()} onValueChange={(val) => setCourseWeeklyHours(parseInt(val) + ((courseWeeklyHours || 0) % 1))}>
                                            <SelectTrigger id="cWeeklyHours" className="h-9">
                                                <SelectValue placeholder="Horas" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[200px]">
                                                {Array.from({ length: 41 }, (_, i) => (
                                                    <SelectItem key={`h-${i}`} value={i.toString()}>{i} hr</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1">
                                        <Select value={Math.round(((courseWeeklyHours || 0) % 1) * 60).toString()} onValueChange={(val) => setCourseWeeklyHours(Math.floor(courseWeeklyHours || 0) + parseInt(val) / 60)}>
                                            <SelectTrigger id="cWeeklyMinutes" className="h-9">
                                                <SelectValue placeholder="Minutos" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">0 min</SelectItem>
                                                <SelectItem value="15">15 min</SelectItem>
                                                <SelectItem value="30">30 min</SelectItem>
                                                <SelectItem value="45">45 min</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            {selectedProgram && (
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <Label htmlFor="cPeriod">Periodo Académico</Label>
                                    <Select value={coursePeriodId} onValueChange={setCoursePeriodId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un periodo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedProgram.periods.map(per => (
                                                <SelectItem key={per.id} value={per.id}>{per.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label htmlFor="cBadge">Leyenda (Badge Opcional)</Label>
                                <Input
                                    id="cBadge"
                                    placeholder="Ej: Virtual, Electiva, Nivelatorio..."
                                    value={courseBadge}
                                    onChange={(e) => setCourseBadge(e.target.value)}
                                    maxLength={25}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label htmlFor="cBadgeColor">Color de Leyenda</Label>
                                <Select value={courseBadgeColor} onValueChange={setCourseBadgeColor}>
                                    <SelectTrigger id="cBadgeColor" className="h-9">
                                        <SelectValue placeholder="Selecciona un color" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(BADGE_COLORS).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("w-3 h-3 rounded-full border", value.bg)} />
                                                    <span>{value.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCourseDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveCourse} disabled={isPending}>
                            {courseToEdit ? "Guardar Cambios" : "Crear Materia"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: COURSE DESCRIPTION ============ */}
            <Dialog open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
                <DialogContent className="max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Info className="h-5 w-5 text-primary" />
                            {selectedCourseForDesc?.title}
                        </DialogTitle>
                        <DialogDescription>Información detallada de la materia.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Meta information row */}
                        <div className="flex flex-wrap gap-2">
                            {selectedCourseForDesc?.period && (
                                <Badge variant="outline" className="bg-muted/30 border-muted text-xs font-semibold px-2 py-0.5">
                                    Periodo: {selectedCourseForDesc.period.name}
                                </Badge>
                            )}
                            {selectedCourseForDesc?.weeklyHours !== undefined && selectedCourseForDesc?.weeklyHours !== null && selectedCourseForDesc?.weeklyHours > 0 && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold px-2 py-0.5 flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatWeeklyHours(selectedCourseForDesc.weeklyHours)}
                                </Badge>
                            )}
                            {selectedCourseForDesc?.badge && (
                                <Badge className={cn("border text-xs font-bold px-2 py-0.5", (selectedCourseForDesc.badgeColor && BADGE_COLORS[selectedCourseForDesc.badgeColor]) ? BADGE_COLORS[selectedCourseForDesc.badgeColor].bg : BADGE_COLORS.slate.bg)}>
                                    {selectedCourseForDesc.badge}
                                </Badge>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</h4>
                            <div className="text-sm text-foreground/80 whitespace-pre-wrap bg-muted/20 p-4 rounded-xl border border-muted/40 max-h-[250px] overflow-y-auto custom-scrollbar">
                                {selectedCourseForDesc?.description || "Esta materia no tiene una descripción detallada registrada."}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setDescriptionDialogOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: DELETE CONFIRMATION ============ */}
            <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Eliminarás definitivamente{" "}
                            <strong>{deleteItemName}</strong> de la base de datos (junto con todas sus relaciones en cascada si corresponde).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteConfirm();
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isPending}
                        >
                            {isPending ? "Eliminando..." : "Eliminar de todas formas"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ============ DIALOG: TEACHER ASSIGN/UNASSIGN CONFIRMATION ============ */}
            <AlertDialog open={teacherConfirmOpen} onOpenChange={setTeacherConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Acción</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro que deseas {teacherToConfirm?.assign ? "asociar" : "desasociar"} a <strong>{teacherToConfirm?.name}</strong> del programa {selectedProgram?.name}?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmTeacherAction();
                            }}
                            className={teacherToConfirm?.assign ? "" : "bg-destructive hover:bg-destructive/90"}
                            disabled={isPending}
                        >
                            {isPending ? "Procesando..." : (teacherToConfirm?.assign ? "Asociar" : "Desasociar")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>



            {/* ============ DIALOG: VIEW & UNLOCK TEACHER AVAILABILITY ============ */}
            <Dialog open={adminTeacherAvailabilityOpen} onOpenChange={setAdminTeacherAvailabilityOpen}>
                <DialogContent className="max-w-[100vw] sm:max-w-[100vw] w-screen h-[100dvh] max-h-[100dvh] rounded-none m-0 border-0 flex flex-col p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            <span>Disponibilidad: {selectedTeacherForAvailability?.name}</span>
                        </DialogTitle>
                        <DialogDescription>
                            Visualiza la disponibilidad horaria configurada por el profesor para la semana.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 max-h-[70vh]">
                        {selectedTeacherForAvailability && (
                            <TeacherAvailabilityView 
                                teacherId={selectedTeacherForAvailability.id} 
                                isAdminMode={true} 
                                onAdminActionComplete={refreshAll} 
                            />
                        )}
                    </div>

                    <DialogFooter className="pt-2 border-t border-muted/20">
                        <Button onClick={() => setAdminTeacherAvailabilityOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ============ DIALOG: ASSIGN GROUPS TO TEACHER ============ */}
            {/* ============ DIALOG: ASSIGN COURSES TO TEACHER ============ */}


            {/* ============ DIALOG: PROGRAM GROUP COURSE (SCHEDULE COURSE) ============ */}
            <Dialog open={groupCourseDialogOpen} onOpenChange={setGroupCourseDialogOpen}>
                <DialogContent className="max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {groupCourseToEdit ? "Editar Clase Programada" : "Programar Nueva Clase"}
                        </DialogTitle>
                        <DialogDescription>
                            Define la asignatura y configura el horario semanal para el grupo <strong>{managingGroup?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label htmlFor="gcCatalogCourse">Seleccionar Asignatura del Catálogo *</Label>
                            {catalogCourses.length === 0 ? (
                                <div className="p-3 text-xs bg-yellow-500/10 border border-yellow-500/20 text--600 dark:text--400 rounded-xl">
                                    No hay asignaturas en el catálogo. Agrégalas en la pestaña "Periodos y Materias".
                                </div>
                            ) : (
                                <Select 
                                    value={selectedCatalogCourseId} 
                                    onValueChange={(val) => {
                                        setSelectedCatalogCourseId(val);
                                        const selected = catalogCourses.find(c => c.id === val);
                                        if (selected) {
                                            setGroupCourseTitle(selected.title);
                                            setGroupCourseDescription(selected.description || "");
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una asignatura..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px] overflow-y-auto">
                                        {catalogCourses.map(course => (
                                            <SelectItem key={course.id} value={course.id}>
                                                {course.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {selectedCatalogCourseId && (
                                <div className="text-[10px] text-muted-foreground pl-1 mt-1">
                                    Materia seleccionada: <strong>{groupCourseTitle}</strong>
                                </div>
                            )}
                        </div>



                        <div className="space-y-1 mt-3">
                            <Label htmlFor="gcWeeklyHours" className="text-xs">Horas Semanales Asignadas</Label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Select value={Math.floor(groupCourseWeeklyHours || 0).toString()} onValueChange={(val) => setGroupCourseWeeklyHours(parseInt(val) + ((groupCourseWeeklyHours || 0) % 1))}>
                                        <SelectTrigger id="gcWeeklyHours" className="h-9 text-xs">
                                            <SelectValue placeholder="Horas" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {Array.from({ length: 41 }, (_, i) => (
                                                <SelectItem key={`h-${i}`} value={i.toString()}>{i} hr</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1">
                                    <Select value={Math.round(((groupCourseWeeklyHours || 0) % 1) * 60).toString()} onValueChange={(val) => setGroupCourseWeeklyHours(Math.floor(groupCourseWeeklyHours || 0) + parseInt(val) / 60)}>
                                        <SelectTrigger id="gcWeeklyMinutes" className="h-9 text-xs">
                                            <SelectValue placeholder="Minutos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">0 min</SelectItem>
                                            <SelectItem value="15">15 min</SelectItem>
                                            <SelectItem value="30">30 min</SelectItem>
                                            <SelectItem value="45">45 min</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Schedule slots editor section */}
                        <div className="space-y-3 border border-muted/50 p-4 rounded-xl bg-muted/5">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">Ranuras Horarias</span>
                            
                            <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Día de la Semana</Label>
                                    <Select value={scheduleDayOfWeek} onValueChange={(v: any) => setScheduleDayOfWeek(v)}>
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DAYS_OF_WEEK_ORDERED.map(day => (
                                                <SelectItem key={day.value} value={day.value} className="text-xs">
                                                    {day.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground">Seleccionar Franja Horaria (Intervalos de 15 min)</Label>
                                    <div className="p-4 bg-muted/20 border border-muted/50 rounded-xl space-y-4">
                                        {(() => {
                                            if (timeSlots.length <= 1) {
                                                return (
                                                    <p className="col-span-full text-xs text-muted-foreground italic text-center py-2">
                                                        Configure el horario del grupo para ver los bloques disponibles.
                                                    </p>
                                                );
                                            }

                                            const startIdx = selectedStartBlockIndex !== null ? selectedStartBlockIndex : 0;
                                            const endIdx = selectedEndBlockIndex !== null ? selectedEndBlockIndex : 1;
                                            const totalSlots = timeSlots.length;
                                            
                                            // Progress bar range percentage calculations
                                            const pctStart = (startIdx / (totalSlots - 1)) * 100;
                                            const pctWidth = ((endIdx - startIdx) / (totalSlots - 1)) * 100;

                                            // Calculate duration in hours and minutes
                                            const [startH, startM] = timeSlots[startIdx].split(":").map(Number);
                                            const [endH, endM] = timeSlots[endIdx].split(":").map(Number);
                                            const durStartMinutes = startH * 60 + startM;
                                            let durEndMinutes = endH * 60 + endM;
                                            if (durEndMinutes < durStartMinutes) {
                                                durEndMinutes += 1440; // overnight
                                            }
                                            const durDiff = durEndMinutes - durStartMinutes;
                                            const durHours = Math.floor(durDiff / 60);
                                            const durMins = durDiff % 60;
                                            const durationText = durHours > 0 
                                                ? `${durHours} ${durHours === 1 ? 'hora' : 'horas'}${durMins > 0 ? ` y ${durMins} min` : ''}`
                                                : `${durMins} min`;

                                            return (
                                                <div className="space-y-4">
                                                    {/* Timeline Bar visualization */}
                                                    <div className="space-y-1">
                                                        <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden border border-muted/80 shadow-inner">
                                                            <div 
                                                                className="absolute h-full bg-primary/70 backdrop-blur-xs transition-all duration-150"
                                                                style={{ left: `${pctStart}%`, width: `${pctWidth}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-0.5">
                                                            <span>{timeSlots[0]}</span>
                                                            {totalSlots > 6 && (
                                                                <span>{timeSlots[Math.floor((totalSlots - 1) / 2)]}</span>
                                                            )}
                                                            <span>{timeSlots[totalSlots - 1]}</span>
                                                        </div>
                                                    </div>

                                                    {/* Sliders and badges */}
                                                    <div className="space-y-3">
                                                        {/* Slider 1: Start Time */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="font-semibold text-muted-foreground">Hora de Inicio</span>
                                                                <Badge variant="outline" className="font-mono bg-background/50 border-muted/50 px-2 py-0.5 text-primary text-[11px] font-bold">
                                                                    {timeSlots[startIdx]}
                                                                </Badge>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min={0}
                                                                max={totalSlots - 2}
                                                                step={1}
                                                                value={startIdx}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    setSelectedStartBlockIndex(val);
                                                                    setScheduleStartTime(timeSlots[val]);
                                                                    
                                                                    // Auto-adjust end time if it falls behind the new start time
                                                                    if (endIdx <= val) {
                                                                        const newEnd = val + 1;
                                                                        setSelectedEndBlockIndex(newEnd);
                                                                        setScheduleEndTime(timeSlots[newEnd]);
                                                                    }
                                                                }}
                                                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                                                            />
                                                        </div>

                                                        {/* Slider 2: End Time */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="font-semibold text-muted-foreground">Hora de Fin</span>
                                                                <Badge variant="outline" className="font-mono bg-background/50 border-muted/50 px-2 py-0.5 text-primary text-[11px] font-bold">
                                                                    {timeSlots[endIdx]}
                                                                </Badge>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min={startIdx + 1}
                                                                max={totalSlots - 1}
                                                                step={1}
                                                                value={endIdx}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    setSelectedEndBlockIndex(val);
                                                                    setScheduleEndTime(timeSlots[val]);
                                                                }}
                                                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Selected range display */}
                                                    <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-2.5 mt-2">
                                                        <div className="space-y-0.5">
                                                            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Franja Horaria Elegida</span>
                                                            <span className="text-xs font-semibold text-foreground">
                                                                {timeSlots[startIdx]} a {timeSlots[endIdx]}
                                                            </span>
                                                        </div>
                                                        <Badge className="bg-primary/95 text-primary-foreground hover:bg-primary text-[10px] px-2 py-0.5 font-bold">
                                                            {durationText}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                            
                        </div>

                            {scheduleConflicts.length > 0 && (
                                <div className="p-3 rounded-xl space-y-1 border bg-destructive/10 border-destructive/20 text-destructive">
                                    <p className="text-xs font-bold flex items-center gap-1.5">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>Conflictos detectados:</span>
                                    </p>
                                    <ul className="list-disc pl-4 text-[11px] space-y-1 opacity-90">
                                        {scheduleConflicts.map((c, i) => (
                                            <li key={i}>{c}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    <DialogFooter className="mt-4 pt-2 border-t border-muted/20">
                        <Button variant="ghost" onClick={() => setGroupCourseDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={() => handleSaveGroupCourse(false)} 
                            disabled={isPending}
                        >
                            {isPending ? "Insertando..." : groupCourseToEdit ? "Guardar Cambios" : "Insertar Horario"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
