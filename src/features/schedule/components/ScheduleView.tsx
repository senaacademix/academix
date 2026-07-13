"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Clock, BookOpen, Info, Users, GraduationCap, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { getScheduleViewAction } from "@/features/schedule/actions/scheduleActions";
import { useSession } from "@/lib/auth-client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
    addDays as addDaysFn,
    addWeeks,
    subWeeks,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    format,
    isSameDay,
    getDay,
    startOfDay,
    getDaysInMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { fromUTC } from "@/lib/dateUtils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Day index helpers (0 = Monday, 6 = Sunday)
const DAY_INDEX: Record<string, number> = {
    MONDAY: 0,
    TUESDAY: 1,
    WEDNESDAY: 2,
    THURSDAY: 3,
    FRIDAY: 4,
    SATURDAY: 5,
    SUNDAY: 6,
};

const DAY_NAMES_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_NAMES_ES_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const toFormat12h = (t24: string) => {
    if (!t24) return "";
    const [h, m] = t24.split(":").map(Number);
    const ap = h >= 12 ? "p.m." : "a.m.";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
};

const formatHour12h = (h24: number) => {
    const ap = h24 >= 12 ? "p.m." : "a.m.";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12} ${ap}`;
};

// Paleta de colores para las materias
const COURSE_COLORS = [
    "bg-blue-500/20 border-blue-500 text--700 dark:text--300 dark:text-blue-300",
    "bg-emerald-500/20 border-emerald-500 text--700 dark:text--300 dark:text-emerald-300",
    "bg-violet-500/20 border-violet-500 text-violet-700 dark:text-violet-300",
    "bg-orange-500/20 border-orange-500 text-orange-700 dark:text-orange-300",
    "bg-pink-500/20 border-pink-500 text-pink-700 dark:text-pink-300",
    "bg-cyan-500/20 border-cyan-500 text-cyan-700 dark:text-cyan-300",
    "bg-amber-500/20 border-amber-500 text--700 dark:text--300 dark:text-amber-300",
    "bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300",
];

const DOT_COLORS = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-amber-500",
    "bg-rose-500",
];

type ScheduleViewData = NonNullable<Awaited<ReturnType<typeof getScheduleViewAction>>>;
type CourseWithSchedules = ScheduleViewData["courses"][number];

interface ScheduleEvent {
    courseId: string;
    courseTitle: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    colorIndex: number;
    course: CourseWithSchedules;
}

function getWeekDays(weekStart: Date): Date[] {
    return Array.from({ length: 7 }, (_, i) => addDaysFn(weekStart, i));
}

function getMonthDays(monthDate: Date): Date[] {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = getDaysInMonth(monthDate);
    // Start from Monday
    const startDow = (getDay(start) + 6) % 7; // Convert Sunday=0 to Monday=0
    const totalCells = Math.ceil((startDow + days) / 7) * 7;
    return Array.from({ length: totalCells }, (_, i) =>
        addDaysFn(start, i - startDow)
    );
}

export function ScheduleView() {
    const { data: session } = useSession();
    const router = useRouter();
    const [courses, setCourses] = useState<CourseWithSchedules[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<"week" | "month">("week");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedCourse, setSelectedCourse] = useState<CourseWithSchedules | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [globalDates, setGlobalDates] = useState<{title: string, start: Date | null, end: Date | null}>({title: "", start: null, end: null});
    const [scheduleEvents, setScheduleEvents] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"schedule" | "events">("schedule");
    const [currentEventIndex, setCurrentEventIndex] = useState(0);

    useEffect(() => {
        getScheduleViewAction()
            .then(data => {
                setCourses(data.courses);
                const start = data.scheduleStartDate ? fromUTC(data.scheduleStartDate) : null;
                const end = data.scheduleEndDate ? fromUTC(data.scheduleEndDate) : null;
                setGlobalDates({ title: data.scheduleTitle || "", start, end });
                setScheduleEvents(data.events || []);
                
                // Adjust current date if outside bounds
                setCurrentDate(prev => {
                    if (start && startOfDay(prev) < startOfDay(start)) return start;
                    if (end && startOfDay(prev) > startOfDay(end)) return end;
                    return prev;
                });
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    // Build schedule events with color indices
    const events: ScheduleEvent[] = [];
    courses.forEach((course, idx) => {
        const colorIndex = idx % COURSE_COLORS.length;
        (course.schedules || []).forEach((schedule: any) => {
            events.push({
                courseId: course.id,
                courseTitle: course.title,
                dayOfWeek: schedule.dayOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                colorIndex,
                course,
            });
        });
    });

    // Build color map for courses
    const courseColorMap: Record<string, number> = {};
    courses.forEach((c, idx) => {
        courseColorMap[c.id] = idx % COURSE_COLORS.length;
    });

    // Navigation
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = getWeekDays(weekStart);
    const monthDays = getMonthDays(currentDate);
    const today = new Date();

    let canGoBack = true;
    if (globalDates.start) {
        if (view === "week") canGoBack = weekStart > startOfWeek(globalDates.start, { weekStartsOn: 1 });
        else canGoBack = startOfMonth(currentDate) > startOfMonth(globalDates.start);
    }
    
    let canGoForward = true;
    if (globalDates.end) {
        if (view === "week") canGoForward = weekEnd < endOfWeek(globalDates.end, { weekStartsOn: 1 });
        else canGoForward = startOfMonth(currentDate) < startOfMonth(globalDates.end);
    }

    function goBack() {
        if (!canGoBack) return;
        if (view === "week") setCurrentDate(d => subWeeks(d, 1));
        else setCurrentDate(d => subMonths(d, 1));
    }
    function goForward() {
        if (!canGoForward) return;
        if (view === "week") setCurrentDate(d => addWeeks(d, 1));
        else setCurrentDate(d => addMonths(d, 1));
    }
    function goToday() {
        const t = new Date();
        if (globalDates.start && startOfDay(t) < startOfDay(globalDates.start)) setCurrentDate(globalDates.start);
        else if (globalDates.end && startOfDay(t) > startOfDay(globalDates.end)) setCurrentDate(globalDates.end);
        else setCurrentDate(t);
    }

    const sortedEvents = [...scheduleEvents].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    function goPrevEvent() {
        if (currentEventIndex > 0) {
            const newIdx = currentEventIndex - 1;
            setCurrentEventIndex(newIdx);
            setCurrentDate(fromUTC(sortedEvents[newIdx].startDate));
        }
    }

    function goNextEvent() {
        if (currentEventIndex < sortedEvents.length - 1) {
            const newIdx = currentEventIndex + 1;
            setCurrentEventIndex(newIdx);
            setCurrentDate(fromUTC(sortedEvents[newIdx].startDate));
        }
    }

    // Get events for a specific day
    function getEventsForDay(date: Date): ScheduleEvent[] {
        const dow = (getDay(date) + 6) % 7; // Monday=0
        const dayName = Object.keys(DAY_INDEX).find(k => DAY_INDEX[k] === dow);
        if (!dayName) return [];
        return events.filter(e => {
            if (e.dayOfWeek !== dayName) return false;
            
            // Filter by global schedule dates
            const dayStart = startOfDay(date);
            if (globalDates.start && dayStart < startOfDay(globalDates.start)) return false;
            if (globalDates.end && dayStart > startOfDay(globalDates.end)) return false;
            
            return true;
        });
    }

    // Header label
    const headerLabel =
        view === "week"
            ? `${format(weekStart, "d MMM", { locale: es })} – ${format(weekEnd, "d MMM yyyy", { locale: es })}`
            : format(currentDate, "MMMM yyyy", { locale: es });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    const noSchedules = activeTab === "schedule" ? events.length === 0 : scheduleEvents.length === 0;

    // Calculate grid start and end hours dynamically based on classes and events
    let minHour = 6;
    let maxHour = 20;

    courses.forEach(c => {
        (c.schedules || []).forEach((s: any) => {
            if (s.startTime) {
                const hour = parseInt(s.startTime.split(":")[0], 10);
                if (hour < minHour) minHour = hour;
            }
            if (s.endTime) {
                const hour = Math.ceil(parseFloat(s.endTime.split(":")[0]) + parseFloat(s.endTime.split(":")[1])/60);
                if (hour > maxHour) maxHour = hour;
            }
        });
    });

    scheduleEvents.forEach((e: any) => {
        if (e.startTime) {
            const hour = parseInt(e.startTime.split(":")[0], 10);
            if (hour < minHour) minHour = hour;
        }
        if (e.endTime) {
            const hour = Math.ceil(parseFloat(e.endTime.split(":")[0]) + parseFloat(e.endTime.split(":")[1])/60);
            if (hour > maxHour) maxHour = hour;
        }
    });

    minHour = Math.max(0, Math.min(minHour, 6));
    maxHour = Math.min(24, Math.max(maxHour, 20));
    const gridHoursLength = maxHour - minHour;

    // Calculate teacher hours
    let weeklyHoursStr = "0";
    let periodHoursStr = "0";
    let execWeeklyStr = "0";
    let execPeriodStr = "0";
    
    if (session?.user?.role === "teacher") {
        let weeklyMinutes = 0;
        const dailyMinutes: Record<string, number> = { MONDAY: 0, TUESDAY: 0, WEDNESDAY: 0, THURSDAY: 0, FRIDAY: 0, SATURDAY: 0, SUNDAY: 0 };
        
        courses.forEach(course => {
            (course.schedules || []).forEach((schedule: any) => {
                const [sh, sm] = schedule.startTime.split(":").map(Number);
                const [eh, em] = schedule.endTime.split(":").map(Number);
                const mins = (eh * 60 + em) - (sh * 60 + sm);
                weeklyMinutes += mins;
                if (schedule.dayOfWeek in dailyMinutes) {
                    dailyMinutes[schedule.dayOfWeek] += mins;
                }
            });
        });
        
        const weeklyHours = weeklyMinutes / 60;
        weeklyHoursStr = weeklyHours.toFixed(1).replace(".0", "");
        
        let execPeriodMins = 0;
        if (globalDates.start && globalDates.end) {
            const diffTime = Math.abs(globalDates.end.getTime() - globalDates.start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const weeks = diffDays / 7;
            periodHoursStr = (weeklyHours * weeks).toFixed(1).replace(".0", "");
            
            // Calculate executed period
            const startCalc = startOfDay(globalDates.start);
            const endCalc = startOfDay(today) > startOfDay(globalDates.end) ? startOfDay(globalDates.end) : startOfDay(today);
            let d = startCalc;
            while (d < endCalc) {
                const dow = (getDay(d) + 6) % 7;
                const dayName = Object.keys(DAY_INDEX).find(k => DAY_INDEX[k] === dow);
                if (dayName) execPeriodMins += dailyMinutes[dayName];
                d = addDaysFn(d, 1);
            }
        }
        
        execPeriodStr = (execPeriodMins / 60).toFixed(1).replace(".0", "");
        
        // Calculate executed weekly
        let execWeeklyMins = 0;
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        let dw = weekStart;
        while (dw < startOfDay(today)) {
            if ((!globalDates.start || dw >= startOfDay(globalDates.start)) && (!globalDates.end || dw <= startOfDay(globalDates.end))) {
                const dow = (getDay(dw) + 6) % 7;
                const dayName = Object.keys(DAY_INDEX).find(k => DAY_INDEX[k] === dow);
                if (dayName) execWeeklyMins += dailyMinutes[dayName];
            }
            dw = addDaysFn(dw, 1);
        }
        execWeeklyStr = (execWeeklyMins / 60).toFixed(1).replace(".0", "");
    }

    // Calculate global period progress percentage
    let periodProgress = 0;
    if (globalDates.start && globalDates.end) {
        const totalTime = globalDates.end.getTime() - globalDates.start.getTime();
        const passedTime = today.getTime() - globalDates.start.getTime();
        if (passedTime < 0) {
            periodProgress = 0;
        } else if (passedTime > totalTime) {
            periodProgress = 100;
        } else {
            periodProgress = (passedTime / totalTime) * 100;
        }
    }

    return (
        <TooltipProvider delayDuration={200}>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "schedule" | "events")} className="flex flex-col gap-2">
                <TabsList className="w-full sm:w-auto self-start bg-muted/40 p-1 rounded-xl">
                    <TabsTrigger value="schedule" className="rounded-lg flex-1 sm:flex-none flex items-center gap-1.5 text-xs font-semibold px-6">
                        <Calendar className="w-3.5 h-3.5" />
                        Horario
                    </TabsTrigger>
                    <TabsTrigger value="events" className="rounded-lg flex-1 sm:flex-none flex items-center gap-1.5 text-xs font-semibold px-6">
                        <Info className="w-3.5 h-3.5" />
                        Eventos
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="flex-1 flex flex-col gap-4 mt-2 focus-visible:outline-none">
                {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={goBack} disabled={!canGoBack}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToday}>
                        Hoy
                    </Button>
                    <Button variant="outline" size="sm" onClick={goForward} disabled={!canGoForward}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold capitalize ml-1 sm:ml-2">{headerLabel}</span>

                    {activeTab === "events" && sortedEvents.length > 0 && (
                        <div className="flex items-center gap-1 border rounded-md p-0.5 bg-background shadow-sm ml-0 sm:ml-4">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrevEvent} disabled={currentEventIndex === 0}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-semibold px-2">Evento {currentEventIndex + 1} de {sortedEvents.length}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNextEvent} disabled={currentEventIndex === sortedEvents.length - 1}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                    {globalDates.title && (
                        <div className="text-xs text-primary-foreground bg-primary px-3 py-1.5 rounded-md font-bold shadow-sm">
                            {globalDates.title}
                        </div>
                    )}
                    {(globalDates.start || globalDates.end) && (
                        <div className="text-xs text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-md border font-medium flex items-center gap-1.5 shadow-sm">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span>
                                {globalDates.start ? format(globalDates.start, "dd/MM/yyyy") : "Inicio"} – {globalDates.end ? format(globalDates.end, "dd/MM/yyyy") : "Fin"}
                            </span>
                        </div>
                    )}
                    {session?.user?.role === "teacher" && (
                        <div className="text-xs text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-md border font-medium flex items-center gap-2 shadow-sm">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            <span><span className="opacity-70">{execWeeklyStr}h/</span>{weeklyHoursStr}h <span className="hidden xs:inline">Semanal</span><span className="xs:hidden">Sem.</span></span>
                            <span className="text-muted-foreground/30">|</span>
                            <span><span className="opacity-70">{execPeriodStr}h/</span>{periodHoursStr}h Total</span>
                        </div>
                    )}
                    <Tabs value={view} onValueChange={(v) => setView(v as "week" | "month")} className="w-full sm:w-auto">
                        <TabsList className="w-full sm:w-auto">
                            <TabsTrigger value="week" className="flex-1 sm:flex-none">Semana</TabsTrigger>
                            <TabsTrigger value="month" className="flex-1 sm:flex-none">Mes</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {globalDates.start && globalDates.end && (
                <div className="w-full flex items-center gap-3 px-1 mb-1 mt-1">
                    <span className="text-[10px] text-muted-foreground font-bold shrink-0 uppercase tracking-wider">Progreso del Periodo</span>
                    <Progress value={periodProgress} className="h-2 flex-1" />
                    <span className="text-[10px] text-muted-foreground font-bold shrink-0 w-8 text-right">{Math.round(periodProgress)}%</span>
                </div>
            )}

            {/* Legend */}
            {activeTab === "schedule" && courses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {courses.map((course, idx) => (
                        <button
                            key={course.id}
                            onClick={() => { setSelectedCourse(course); setIsDialogOpen(true); }}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-80",
                                COURSE_COLORS[idx % COURSE_COLORS.length]
                            )}
                        >
                            <span className={cn("w-2 h-2 rounded-full", DOT_COLORS[idx % DOT_COLORS.length])} />
                            {course.title}
                        </button>
                    ))}
                </div>
            )}

            {/* No schedules placeholder */}
            {noSchedules && (
                <div className="flex flex-col items-center justify-center flex-1 py-16 text-center gap-3 text-muted-foreground border-2 border-dashed rounded-xl">
                    <Calendar className="w-12 h-12 opacity-30" />
                    <div>
                        <p className="font-semibold text-base">
                            {activeTab === "schedule" ? "Sin horarios configurados" : "Sin eventos configurados"}
                        </p>
                        <p className="text-sm mt-1">
                            {activeTab === "schedule" 
                                ? "Las materias aún no tienen horarios asignados. Edita una materia y agrega sus días y horas de clase." 
                                : "No hay eventos ni festivos programados para este rango de fechas."}
                        </p>
                    </div>
                </div>
            )}

            {/* Scroll Indicator for mobile */}
            {!noSchedules && (
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold md:hidden bg-muted/40 px-3 py-2 rounded-xl border border-border/50 w-fit select-none animate-pulse">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Desliza horizontalmente para ver el horario completo.</span>
                </div>
            )}

            {/* Week View */}
            {!noSchedules && view === "week" && (
                <div className="flex-1 border rounded-xl overflow-hidden overflow-x-auto scrollbar-thin">
                    <div className="min-w-[800px] md:min-w-0 flex flex-col">
                        <div className="grid grid-cols-8 divide-x border-b bg-muted/30">
                        <div className="py-2 px-2 text-xs text-muted-foreground text-center" />
                        {weekDays.map((day, i) => {
                            const allDbEventsForDay = scheduleEvents.filter(e => {
                                const sDate = startOfDay(fromUTC(e.startDate));
                                const eDate = startOfDay(fromUTC(e.endDate));
                                const d = startOfDay(day);
                                return d >= sDate && d <= eDate;
                            });
                            const dbEventsForDay = allDbEventsForDay;
                            const holidays = dbEventsForDay.filter(e => e.type === "HOLIDAY");
                            const isHoliday = holidays.length > 0;

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "py-2 px-1 text-center flex flex-col items-center overflow-hidden",
                                        isSameDay(day, today) && !isHoliday && "bg-primary/5",
                                        isHoliday && "bg-red-50/50 dark:bg-red-950/20"
                                    )}
                                >
                                    <div className={cn("text-xs font-semibold uppercase", isHoliday ? "text--600 dark:text--400 dark:text-red-400" : "text-muted-foreground")}>{DAY_NAMES_ES[i]}</div>
                                    <div className={cn(
                                        "text-sm font-bold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full shrink-0",
                                        isSameDay(day, today) && !isHoliday && "bg-primary text-primary-foreground",
                                        isSameDay(day, today) && isHoliday && "bg-red-600 text-white",
                                        !isSameDay(day, today) && isHoliday && "text--600 dark:text--400 dark:text-red-400"
                                    )}>
                                        {format(day, "d")}
                                    </div>
                                    {dbEventsForDay.filter(e => !e.startTime).length > 0 && (
                                        <div className="flex flex-col gap-0.5 mt-1.5 w-full px-0.5">
                                            {dbEventsForDay.filter(e => !e.startTime).map(evt => (
                                                <Popover key={evt.id}>
                                                    <PopoverTrigger asChild>
                                                        <div className={cn(
                                                            "text-[10px] leading-tight font-bold text-center rounded py-1 px-1.5 truncate w-full shadow-sm cursor-pointer transition-all hover:brightness-110",
                                                            evt.type === "HOLIDAY" ? "bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 text-red-700 dark:text-red-300" : "bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300"
                                                        )}>
                                                            {evt.startTime && <span className="opacity-70 mr-1">[{evt.startTime}]</span>}
                                                            {evt.title}
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 p-5 shadow-2xl border-muted/20 z-[100]" side="bottom" align="start">
                                                        <div className="space-y-1">
                                                            <div className="font-extrabold text-lg leading-tight text-foreground">{evt.title}</div>
                                                            <div className="text-sm font-semibold text-muted-foreground">{evt.type === "HOLIDAY" ? "Día Festivo" : "Evento Institucional"}</div>
                                                            {(evt.startTime || evt.endTime) && (
                                                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                                                                    <Clock className="w-4 h-4" />
                                                                    {evt.startTime || "--:--"} hasta {evt.endTime || "--:--"}
                                                                </div>
                                                            )}
                                                            {evt.description && (
                                                                <p className="text-sm text-foreground/80 mt-3 bg-muted/40 p-3 rounded-lg border border-border/50 break-words">
                                                                    {evt.description}
                                                                </p>
                                                            )}
                                                            {evt.externalUrl && (
                                                                <div className="mt-3">
                                                                    <a 
                                                                        href={evt.externalUrl} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1 font-semibold"
                                                                    >
                                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                                        <span>Ver información externa</span>
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="grid grid-cols-8 divide-x min-h-[400px]">
                        {/* Time labels placeholder */}
                        <div className="flex flex-col divide-y text-xs text-muted-foreground">
                            {Array.from({ length: gridHoursLength }, (_, i) => i + minHour).map(h => (
                                <div key={h} className="px-1 py-1 min-h-[40px] flex items-start">{formatHour12h(h)}</div>
                            ))}
                        </div>
                        {weekDays.map((day, i) => {
                            const originalDayEvents = getEventsForDay(day);
                            const isOutside = (globalDates.start && startOfDay(day) < startOfDay(globalDates.start)) || 
                                              (globalDates.end && startOfDay(day) > startOfDay(globalDates.end));
                                              
                            // Check for DB Events / Holidays
                            const allDbEventsForDay = scheduleEvents.filter(e => {
                                const sDate = startOfDay(fromUTC(e.startDate));
                                const eDate = startOfDay(fromUTC(e.endDate));
                                const d = startOfDay(day);
                                return d >= sDate && d <= eDate;
                            });
                            const dbEventsForDay = allDbEventsForDay;
                            
                            const dayNameString = Object.keys(DAY_INDEX).find(k => DAY_INDEX[k] === ((getDay(day) + 6) % 7)) || "MONDAY";
                            const timeBoundEvents = dbEventsForDay.filter(e => e.startTime && e.endTime).map((e, idx) => ({
                                startTime: e.startTime,
                                endTime: e.endTime,
                                courseTitle: e.title,
                                dayOfWeek: dayNameString,
                                colorIndex: idx % COURSE_COLORS.length,
                                course: { 
                                    id: e.id, 
                                    title: e.title, 
                                    description: e.description, 
                                    teacher: null, 
                                    group: null, 
                                    schedules: [],
                                    isEvent: true,
                                    startTime: e.startTime,
                                    endTime: e.endTime,
                                    externalUrl: e.externalUrl,
                                    type: e.type
                                } as any
                            }));
                            const dayEvents = activeTab === "schedule" ? [...originalDayEvents, ...timeBoundEvents] : timeBoundEvents;
                            const holidays = dbEventsForDay.filter(e => e.type === "HOLIDAY");
                            const isHoliday = holidays.length > 0;
                            const isPast = startOfDay(day) < startOfDay(today);

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "relative flex flex-col divide-y min-h-[560px]",
                                        isSameDay(day, today) && !isHoliday && "bg-primary/5",
                                        isOutside && "bg-muted/40 opacity-50 pointer-events-none"
                                    )}
                                    style={isHoliday ? { 
                                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239, 68, 68, 0.05) 10px, rgba(239, 68, 68, 0.05) 20px)' 
                                    } : undefined}
                                >

                                    {Array.from({ length: gridHoursLength }, (_, h) => (
                                        <div key={h} className="min-h-[40px] relative" />
                                    ))}
                                    {/* Event blocks */}
                                    {dayEvents.map((event, ei) => {
                                        const [sh, sm] = event.startTime.split(":").map(Number);
                                        const [eh, em] = event.endTime.split(":").map(Number);
                                        const startMinutes = (sh - minHour) * 60 + sm;
                                        const durationMinutes = (eh - minHour) * 60 + em - startMinutes;
                                        const top = (startMinutes / 60) * 40;
                                        const height = (durationMinutes / 60) * 40;
                                        return (
                                            <Tooltip key={ei}>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => { setSelectedCourse(event.course); setIsDialogOpen(true); }}
                                                        className={cn(
                                                            "absolute left-1 right-1 rounded-md border px-1.5 py-0.5 text-left text-xs font-medium overflow-hidden transition-all hover:opacity-90 hover:shadow-md z-10 flex flex-col justify-between",
                                                            COURSE_COLORS[event.colorIndex],
                                                            isPast && "opacity-60 saturate-50 grayscale-[0.5] border-dashed"
                                                        )}
                                                        style={{ top: `${top}px`, height: `${Math.max(height, 34)}px` }}
                                                    >
                                                        <div>
                                                            <div className="font-semibold truncate leading-tight">{event.courseTitle}</div>
                                                            {event.course.group && (
                                                                <div className="text-[9px] opacity-75 truncate flex flex-col gap-0.5">
                                                                    <span>Grupo: {event.course.group.name}</span>
                                                                    {event.course.teacher && <span>Docente: {event.course.teacher.name}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="opacity-80 text-[10px]">{toFormat12h(event.startTime)} – {toFormat12h(event.endTime)}</div>
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="font-semibold">{event.courseTitle}</p>
                                                    <p className="text-xs">{DAY_NAMES_ES_FULL[DAY_INDEX[event.dayOfWeek]]} {toFormat12h(event.startTime)} – {toFormat12h(event.endTime)}</p>
                                                    {event.course.teacher && <p className="text-[10px] text-muted-foreground mt-1">Docente: {event.course.teacher.name}</p>}
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                    </div>
                </div>
            )}

            {/* Month View */}
            {!noSchedules && view === "month" && (
                <div className="flex-1 border rounded-xl overflow-hidden overflow-x-auto scrollbar-thin">
                    <div className="min-w-[700px] md:min-w-0 flex flex-col">
                        <div className="grid grid-cols-7 divide-x border-b bg-muted/30">
                        {DAY_NAMES_ES.map(d => (
                            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 divide-x divide-y">
                        {monthDays.map((day, i) => {
                            const originalDayEvents = getEventsForDay(day);
                            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                            const isOutside = (globalDates.start && startOfDay(day) < startOfDay(globalDates.start)) || 
                                              (globalDates.end && startOfDay(day) > startOfDay(globalDates.end));

                            // Check for DB Events / Holidays
                            const allDbEventsForDay = scheduleEvents.filter(e => {
                                const sDate = startOfDay(fromUTC(e.startDate));
                                const eDate = startOfDay(fromUTC(e.endDate));
                                const d = startOfDay(day);
                                return d >= sDate && d <= eDate;
                            });
                            const dbEventsForDay = allDbEventsForDay;
                            
                            const dayNameString = Object.keys(DAY_INDEX).find(k => DAY_INDEX[k] === ((getDay(day) + 6) % 7)) || "MONDAY";
                            const timeBoundEvents = dbEventsForDay.filter(e => e.startTime && e.endTime).map((e, idx) => ({
                                startTime: e.startTime,
                                endTime: e.endTime,
                                courseTitle: e.title,
                                dayOfWeek: dayNameString,
                                colorIndex: idx % COURSE_COLORS.length,
                                course: { 
                                    id: e.id, 
                                    title: e.title, 
                                    description: e.description, 
                                    teacher: null, 
                                    group: null, 
                                    schedules: [],
                                    isEvent: true,
                                    startTime: e.startTime,
                                    endTime: e.endTime,
                                    externalUrl: e.externalUrl,
                                    type: e.type
                                } as any
                            }));
                            const dayEvents = activeTab === "schedule" ? [...originalDayEvents, ...timeBoundEvents] : timeBoundEvents;
                            const isHoliday = dbEventsForDay.some(e => e.type === "HOLIDAY");
                            const isPast = startOfDay(day) < startOfDay(today);

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "min-h-[80px] p-1.5 flex flex-col",
                                        !isCurrentMonth && "bg-muted/20",
                                        isSameDay(day, today) && "bg-primary/5",
                                        isOutside && "bg-muted/40 opacity-50 pointer-events-none",
                                        isHoliday && "bg-red-50/50 dark:bg-red-950/20"
                                    )}
                                >
                                    <div className={cn(
                                        "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full shrink-0",
                                        isSameDay(day, today) ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                                        !isCurrentMonth && "opacity-40"
                                    )}>
                                        {format(day, "d")}
                                    </div>
                                    
                                    <div className="flex flex-col gap-0.5 mb-1 shrink-0">
                                        {dbEventsForDay.filter(e => !e.startTime).map(evt => (
                                            <Popover key={evt.id}>
                                                <PopoverTrigger asChild>
                                                    <div className={cn(
                                                        "text-[9px] font-bold px-1.5 py-0.5 rounded border truncate cursor-pointer transition-all hover:brightness-110",
                                                        evt.type === "HOLIDAY" ? "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30 text-red-700 dark:text-red-300" : "bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300"
                                                    )}>
                                                        {evt.startTime && <span className="opacity-70 mr-1">[{evt.startTime}]</span>}
                                                        {evt.title}
                                                    </div>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-5 shadow-2xl border-muted/20 z-[100]" side="right" align="start">
                                                    <div className="space-y-1">
                                                        <div className="font-extrabold text-lg leading-tight text-foreground">{evt.title}</div>
                                                        <div className="text-sm font-semibold text-muted-foreground">{evt.type === "HOLIDAY" ? "Día Festivo" : "Evento Institucional"}</div>
                                                        {(evt.startTime || evt.endTime) && (
                                                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                                                                <Clock className="w-4 h-4" />
                                                                {evt.startTime || "--:--"} hasta {evt.endTime || "--:--"}
                                                            </div>
                                                        )}
                                                        {evt.description && (
                                                            <p className="text-sm text-foreground/80 mt-3 bg-muted/40 p-3 rounded-lg border border-border/50 break-words">
                                                                {evt.description}
                                                            </p>
                                                        )}
                                                        {evt.externalUrl && (
                                                            <div className="mt-3">
                                                                <a 
                                                                    href={evt.externalUrl} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1 font-semibold"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                    <span>Ver información externa</span>
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        ))}
                                    </div>

                                    <div className="space-y-0.5 overflow-hidden">
                                        {dayEvents.slice(0, 3).map((event, ei) => (
                                            <button
                                                key={ei}
                                                onClick={() => { setSelectedCourse(event.course); setIsDialogOpen(true); }}
                                                className={cn(
                                                    "w-full text-left text-[10px] px-1 py-0.5 rounded truncate border font-medium leading-tight",
                                                    COURSE_COLORS[event.colorIndex],
                                                    isPast && "opacity-60 saturate-50 grayscale-[0.5] border-dashed"
                                                )}
                                            >
                                                {toFormat12h(event.startTime)} {event.courseTitle}
                                            </button>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="text-[10px] text-muted-foreground pl-1">
                                                +{dayEvents.length - 3} más
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    </div>
                </div>
            )}

            {/* Course Detail Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[480px] rounded-2xl">
                    {(selectedCourse as any)?.isEvent ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-primary" />
                                    {selectedCourse?.title}
                                </DialogTitle>
                                <DialogDescription className="text-sm font-semibold text-muted-foreground">
                                    {(selectedCourse as any)?.type === "HOLIDAY" ? "Día Festivo" : "Evento Institucional"}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-2">
                                {/* Time range */}
                                {((selectedCourse as any)?.startTime || (selectedCourse as any)?.endTime) && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" /> Horario
                                        </p>
                                        <p className="text-sm font-medium">
                                            {(selectedCourse as any).startTime || "--:--"} hasta {(selectedCourse as any).endTime || "--:--"}
                                        </p>
                                    </div>
                                )}
                                
                                {/* Description */}
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Descripción</p>
                                    <p className="text-sm text-foreground/80 bg-muted/40 p-3 rounded-lg border border-border/50 break-words">
                                        {selectedCourse?.description || "Sin descripción"}
                                    </p>
                                </div>

                                {/* External URL Button / Link */}
                                {(selectedCourse as any)?.externalUrl && (
                                    <div className="pt-2">
                                        <a 
                                            href={(selectedCourse as any).externalUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1 font-semibold"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>Ver información externa</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 font-black">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                    {selectedCourse?.title}
                                </DialogTitle>
                                <DialogDescription className="text-xs uppercase tracking-wider font-bold">
                                    Detalles de la Materia Académica
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-2">
                                {/* Description / Competencies / RAP */}
                                <div className="space-y-1.5">
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descripción, Competencias y RAP</p>
                                    <div className="text-xs text-foreground/80 bg-muted/40 p-3 rounded-xl border border-border/50 break-words whitespace-pre-wrap max-h-[140px] overflow-y-auto scrollbar-thin">
                                        {selectedCourse?.description || "Esta materia no tiene descripción, competencias o resultados de aprendizaje registrados todavía."}
                                    </div>
                                </div>
                                {/* Docente & Grupo */}
                                <div className="grid grid-cols-2 gap-4">

                                    {selectedCourse?.group && (
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <GraduationCap className="w-3 h-3" /> Grupo
                                            </p>
                                            <p className="text-sm font-medium">{selectedCourse.group.name}</p>
                                        </div>
                                    )}
                                    {selectedCourse?.teacher && (
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Users className="w-3 h-3" /> Docente
                                            </p>
                                            <p className="text-sm font-medium">{selectedCourse.teacher.name}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Dates */}
                                {(selectedCourse?.group?.startDate || selectedCourse?.group?.endDate) && (
                                    <div className="flex gap-4">
                                        {selectedCourse?.group?.startDate && (
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Inicio</p>
                                                <p className="text-sm font-medium">{new Date(selectedCourse.group.startDate).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>
                                            </div>
                                        )}
                                        {selectedCourse?.group?.endDate && (
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Fin</p>
                                                <p className="text-sm font-medium">{new Date(selectedCourse.group.endDate).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Schedules */}
                                {selectedCourse?.schedules && selectedCourse.schedules.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Horarios</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCourse.schedules.map((schedule: any, index: number) => (
                                                <Badge key={index} variant="outline" className={cn("text-sm py-1", COURSE_COLORS[courseColorMap[selectedCourse.id] ?? 0])}>
                                                    {DAY_NAMES_ES_FULL[DAY_INDEX[schedule.dayOfWeek]]} · {toFormat12h(schedule.startTime)} – {toFormat12h(schedule.endTime)}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Info className="w-4 h-4" />
                                        <span>Esta materia no tiene horarios configurados</span>
                                    </div>
                                )}
                            
                                {selectedCourse?.group && session?.user?.role === "teacher" && (
                                    <DialogFooter className="mt-4 pt-4 border-t border-border/50">
                                        <Button 
                                            className="w-full sm:w-auto font-bold" 
                                            onClick={() => router.push(`/dashboard/teacher?group=${selectedCourse?.group?.id}`)}
                                        >
                                            <Users className="w-4 h-4 mr-2" />
                                            Ir al Grupo
                                        </Button>
                                    </DialogFooter>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
        </TooltipProvider>
    );
}
