"use client";

import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getScheduleEvents, createScheduleEvent, deleteScheduleEvent, deleteEventsBeforeDate, generateHolidaysForPeriod } from "@/features/schedule/actions/eventActions";
import { Calendar as CalendarIcon, Trash2, Plus, CalendarDays, Loader2, Sparkles, Clock, AlignLeft, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { fromUTC } from "@/lib/dateUtils";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, startOfDay, isBefore, isAfter } from "date-fns";
import { es } from "date-fns/locale";

export function ScheduleEventManagement({ 
    isObserver = false,
    scheduleStartDate,
    scheduleEndDate
}: { 
    isObserver?: boolean;
    scheduleStartDate?: string | null;
    scheduleEndDate?: string | null;
}) {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // Bulk delete state
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkDeleteDate, setBulkDeleteDate] = useState("");
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [type, setType] = useState<"HOLIDAY" | "EVENT">("HOLIDAY");
    const [externalUrl, setExternalUrl] = useState("");

    // Calendar navigation state
    const [currentMonth, setCurrentMonth] = useState(() => new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const monthDays: Date[] = [];
    let d = startDate;
    while (d <= endDate) {
        monthDays.push(d);
        d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    }

    const DAY_NAMES_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const today = new Date();

    // Sort events by date for navigation
    const sortedEventDates = events
        .map(e => startOfDay(fromUTC(e.startDate)))
        .sort((a, b) => a.getTime() - b.getTime());

    // Get unique months that have events
    const eventMonths = Array.from(
        new Set(sortedEventDates.map(d => `${d.getFullYear()}-${d.getMonth()}`))
    ).map(key => {
        const [year, month] = key.split("-").map(Number);
        return new Date(year, month, 1);
    }).sort((a, b) => a.getTime() - b.getTime());

    const currentMonthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
    const currentEventMonthIdx = eventMonths.findIndex(
        m => `${m.getFullYear()}-${m.getMonth()}` === currentMonthKey
    );

    const prevEventMonth = eventMonths[currentEventMonthIdx - 1] ?? null;
    const nextEventMonth = eventMonths[currentEventMonthIdx + 1] ?? null;

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        const res = await getScheduleEvents();
        if (res.success && res.data) {
            setEvents(res.data);
        } else {
            toast.error("Error al cargar eventos");
        }
        setLoading(false);
    };

    const handleCreate = async () => {
        const finalTitle = type === "HOLIDAY" ? "Día Festivo" : title.trim();

        if ((type === "EVENT" && !finalTitle) || !eventDate) {
            toast.error("Por favor completa los campos requeridos (Título y Fecha)");
            return;
        }

        if (scheduleStartDate && scheduleEndDate) {
            const startLimit = new Date(scheduleStartDate);
            const endLimit = new Date(scheduleEndDate);
            startLimit.setHours(0, 0, 0, 0);
            endLimit.setHours(23, 59, 59, 999);

            const chosenDate = new Date(eventDate + "T12:00:00");

            if (chosenDate < startLimit || chosenDate > endLimit) {
                toast.error(`La fecha seleccionada debe estar dentro del periodo de programación del horario (${format(startLimit, "dd/MM/yyyy")} a ${format(endLimit, "dd/MM/yyyy")})`);
                return;
            }
        }

        const start = new Date(eventDate + "T12:00:00");
        const end = new Date(eventDate + "T12:00:00");

        setSaving(true);
        const res = await createScheduleEvent({
            title: finalTitle,
            description: type === "EVENT" ? description : null,
            startTime: type === "EVENT" && startTime ? startTime : null,
            endTime: type === "EVENT" && endTime ? endTime : null,
            startDate: start,
            endDate: end,
            type,
            externalUrl: type === "EVENT" && externalUrl.trim() ? externalUrl.trim() : null
        });

        if (res.success) {
            toast.success("Registro creado exitosamente");
            setTitle("");
            setDescription("");
            setStartTime("");
            setEndTime("");
            setEventDate("");
            setExternalUrl("");
            fetchEvents();
        } else {
            toast.error(res.error || "Error al crear el evento");
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const res = await deleteScheduleEvent(id);
        if (res.success) {
            toast.success("Evento eliminado");
            fetchEvents();
        } else {
            toast.error("Error al eliminar el evento");
        }
    };

    const handleBulkDelete = async () => {
        if (!bulkDeleteDate) {
            toast.error("Selecciona una fecha de corte");
            return;
        }
        setBulkDeleting(true);
        // End of the chosen day (23:59:59)
        const cutoff = new Date(bulkDeleteDate + "T23:59:59");
        const res = await deleteEventsBeforeDate(cutoff);
        if (res.success) {
            toast.success(`Se eliminaron ${res.count} evento(s) anteriores a la fecha seleccionada`);
            setBulkDeleteOpen(false);
            setBulkDeleteDate("");
            fetchEvents();
        } else {
            toast.error("Error al eliminar los eventos");
        }
        setBulkDeleting(false);
    };

    const [generatingHolidays, setGeneratingHolidays] = useState(false);

    const handleGenerateHolidays = async () => {
        setGeneratingHolidays(true);
        try {
            const res = await generateHolidaysForPeriod();
            if (res.success) {
                toast.success(res.message);
                fetchEvents();
            } else {
                toast.error(res.error || "Ocurrió un error al generar los festivos");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de comunicación con el servidor");
        } finally {
            setGeneratingHolidays(false);
        }
    };

    // Count events before bulkDeleteDate for the warning preview
    const eventsBeforeCutoff = bulkDeleteDate
        ? events.filter(e => {
            const evtDate = fromUTC(e.startDate);
            return evtDate <= new Date(bulkDeleteDate + "T23:59:59");
        }).length
        : 0;

    const prevMonthDate = subMonths(currentMonth, 1);
    const prevMonthEnd = endOfMonth(prevMonthDate);
    const isPrevMonthDisabled = scheduleStartDate ? prevMonthEnd < new Date(scheduleStartDate) : false;

    const nextMonthDate = addMonths(currentMonth, 1);
    const nextMonthStart = startOfMonth(nextMonthDate);
    const isNextMonthDisabled = scheduleEndDate ? nextMonthStart > new Date(scheduleEndDate) : false;

    return (
        <div className="w-full h-full flex flex-col bg-background overflow-hidden relative">

            {/* Decorative background gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

            {/* Header Section */}
            <div className="relative z-10 px-6 py-4 border-b bg-card/80 backdrop-blur-sm shadow-sm shrink-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/30 shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-black text-foreground leading-tight">
                                Gestión de Eventos y Festivos
                            </h2>
                            {scheduleStartDate && scheduleEndDate && (
                                <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-md text-[9px] font-bold text-muted-foreground select-none">
                                    <CalendarIcon className="w-3 h-3 text-primary" />
                                    <span>Periodo:</span>
                                    <span className="text-primary font-black">
                                        {(() => {
                                            const start = new Date(scheduleStartDate);
                                            const end = new Date(scheduleEndDate);
                                            const formatD = (d: Date) => {
                                                if (isNaN(d.getTime())) return "N/A";
                                                const date = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
                                                return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
                                            };
                                            return `${formatD(start)} al ${formatD(end)}`;
                                        })()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0">
                            Configuración de eventos especiales, festivos y fechas no lectivas de la institución.
                        </p>
                    </div>
                </div>
                {!isObserver && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 rounded-xl border-emerald-500/30 hover:border-emerald-500/50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 shrink-0 font-semibold"
                            onClick={handleGenerateHolidays}
                            disabled={generatingHolidays}
                        >
                            {generatingHolidays ? (
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                            ) : (
                                <Sparkles className="w-4 h-4 text-emerald-500" />
                            )}
                            Generar Festivos Colombia
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2 rounded-xl shrink-0"
                            onClick={() => setBulkDeleteOpen(true)}
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar desde fecha
                        </Button>
                    </div>
                )}
            </div>

            {/* Main Content Scroll Area */}
            <div className="flex-1 flex overflow-hidden relative z-10">
                <div className="w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-1 gap-6 h-full flex-1">

                    {/* Left Column: Form */}
                    {!isObserver && (
                        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent min-h-0">
                            <div className="bg-card border border-border rounded-3xl p-7 shadow-sm transition-all shrink-0">
                                <h3 className="text-xl font-bold flex items-center gap-2.5 mb-6 text-foreground/90">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-primary" />
                                    </div>
                                    Registrar Evento / Festivo
                                </h3>

                                <div className="space-y-5">
                                    <div className="space-y-2.5">
                                        <Label className="text-sm font-semibold text-muted-foreground">Tipo de Registro</Label>
                                        <Select
                                            value={type}
                                            onValueChange={(val: any) => setType(val)}
                                        >
                                            <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/50 transition-colors focus:border-primary">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="HOLIDAY">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarIcon className="w-4 h-4 text-orange-500" />
                                                        Día Festivo / No Lectivo
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="EVENT">
                                                    <div className="flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                                                        Evento Institucional
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {type === "EVENT" && (
                                        <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-2.5">
                                                <Label className="text-sm font-semibold text-muted-foreground">Título del Evento</Label>
                                                <Input
                                                    value={title}
                                                    onChange={e => setTitle(e.target.value)}
                                                    placeholder="Ej: Ceremonia de Grado, Open House..."
                                                    className="h-12 rounded-xl bg-background/50 border-border/50 transition-colors focus:border-primary"
                                                />
                                            </div>
                                            <div className="space-y-2.5">
                                                <Label className="text-sm font-semibold text-muted-foreground">Descripción Adicional (Opcional)</Label>
                                                <Textarea
                                                    value={description}
                                                    onChange={e => setDescription(e.target.value)}
                                                    className="min-h-[100px] resize-none rounded-xl bg-background/50 border-border/50 transition-colors focus:border-primary"
                                                    placeholder="Detalles sobre el evento..."
                                                />
                                            </div>
                                            <div className="space-y-2.5">
                                                <Label className="text-sm font-semibold text-muted-foreground">Enlace de Información Externa (Opcional)</Label>
                                                <Input
                                                    value={externalUrl}
                                                    onChange={e => setExternalUrl(e.target.value)}
                                                    placeholder="Ej: https://sena.edu.co/evento"
                                                    className="h-12 rounded-xl bg-background/50 border-border/50 transition-colors focus:border-primary"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2.5">
                                                    <Label className="text-sm font-semibold text-muted-foreground">Hora de Inicio</Label>
                                                    <Input
                                                        type="time"
                                                        value={startTime}
                                                        onChange={e => setStartTime(e.target.value)}
                                                        className="h-12 rounded-xl bg-background/50 border-border/50 transition-colors focus:border-primary"
                                                    />
                                                </div>
                                                <div className="space-y-2.5">
                                                    <Label className="text-sm font-semibold text-muted-foreground">Hora de Fin</Label>
                                                    <Input
                                                        type="time"
                                                        value={endTime}
                                                        onChange={e => setEndTime(e.target.value)}
                                                        className="h-12 rounded-xl bg-background/50 border-border/50 transition-colors focus:border-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2.5">
                                        <Label className="text-sm font-semibold text-muted-foreground">Fecha Seleccionada</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full h-12 justify-start text-left font-normal rounded-xl bg-background/50 border-border/50 hover:bg-background/80 transition-colors",
                                                        !eventDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                                    {eventDate ? format(new Date(eventDate + "T12:00:00"), "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 rounded-2xl border border-border shadow-xl">
                                                <Calendar
                                                    mode="single"
                                                    selected={eventDate ? new Date(eventDate + "T12:00:00") : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            const year = date.getFullYear();
                                                            const month = String(date.getMonth() + 1).padStart(2, "0");
                                                            const day = String(date.getDate()).padStart(2, "0");
                                                            setEventDate(`${year}-${month}-${day}`);
                                                        } else {
                                                            setEventDate("");
                                                        }
                                                    }}
                                                    disabled={(date) => {
                                                        if (!scheduleStartDate || !scheduleEndDate) return false;
                                                        const start = new Date(scheduleStartDate);
                                                        const end = new Date(scheduleEndDate);
                                                        start.setHours(0, 0, 0, 0);
                                                        end.setHours(23, 59, 59, 999);
                                                        return date < start || date > end;
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <Button
                                        onClick={handleCreate}
                                        disabled={saving}
                                        className="w-full h-12 mt-6 rounded-xl text-base font-bold text-white shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/90 transition-all active:scale-[0.98] disabled:opacity-70"
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                <AlignLeft className="w-4 h-4 mr-2" />
                                                Guardar Registro
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Right Column: Month Calendar */}
                    <div className={cn("flex flex-col min-w-0 min-h-0", isObserver ? "lg:col-span-12" : "lg:col-span-8")}>
                        <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col h-full transition-all">

                            {/* ── Calendar navigation header ── */}
                            <div className="px-6 py-4 border-b border-border/50 bg-muted/30 flex items-center justify-between gap-3 flex-wrap">

                                {/* Month navigation */}
                                <div className="flex items-center gap-2">
                                    {/* Previous month */}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                        disabled={isPrevMonthDisabled}
                                        title="Mes anterior"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>

                                    {/* Month label — plain text, no popover */}
                                    <h3 className="font-bold text-lg capitalize min-w-[190px] text-center select-none">
                                        {format(currentMonth, "MMMM yyyy", { locale: es })}
                                    </h3>

                                    {/* Next month */}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                        disabled={isNextMonthDisabled}
                                        title="Mes siguiente"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Event navigation: prev event ← → next event */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 rounded-lg gap-1.5 text-xs font-semibold disabled:opacity-40"
                                        disabled={!prevEventMonth}
                                        onClick={() => prevEventMonth && setCurrentMonth(prevEventMonth)}
                                        title={prevEventMonth ? `Evento en ${format(prevEventMonth, "MMM yyyy", { locale: es })}` : "Sin eventos anteriores"}
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        Evento anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 rounded-lg gap-1.5 text-xs font-semibold disabled:opacity-40"
                                        disabled={!nextEventMonth}
                                        onClick={() => nextEventMonth && setCurrentMonth(nextEventMonth)}
                                        title={nextEventMonth ? `Evento en ${format(nextEventMonth, "MMM yyyy", { locale: es })}` : "Sin eventos posteriores"}
                                    >
                                        Evento siguiente
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </Button>
                                </div>

                                {/* Right side controls */}
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-lg"
                                        onClick={() => setCurrentMonth(new Date())}
                                    >
                                        Hoy
                                    </Button>
                                    <div className="flex items-center gap-2 bg-background px-4 py-1.5 rounded-full border border-border/50 shadow-sm">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-sm font-bold">{events.length} Registros</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 p-6 flex flex-col relative overflow-hidden">
                                {loading ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                                            <p className="text-sm font-medium text-muted-foreground animate-pulse">Cargando calendario...</p>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="flex-1 border rounded-xl overflow-hidden flex flex-col bg-background shadow-inner">
                                    {/* Day headers */}
                                    <div className="grid grid-cols-7 divide-x border-b bg-muted/30 shrink-0">
                                        {DAY_NAMES_ES.map(d => (
                                            <div key={d} className="py-3 text-center text-sm font-bold text-muted-foreground uppercase tracking-wider">{d}</div>
                                        ))}
                                    </div>

                                    {/* Days grid */}
                                    <div className="grid grid-cols-7 divide-x divide-y flex-1 auto-rows-fr overflow-hidden">
                                        {monthDays.map((day, i) => {
                                            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                                            const dbEventsForDay = events.filter(e => {
                                                const eStartDate = startOfDay(fromUTC(e.startDate));
                                                const dayStart = startOfDay(day);
                                                return dayStart.getTime() === eStartDate.getTime();
                                            });

                                            return (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "p-2 flex flex-col relative group/day transition-colors cursor-pointer hover:bg-muted/30",
                                                        !isCurrentMonth && "bg-muted/10",
                                                        isSameDay(day, today) && "bg-primary/5",
                                                    )}
                                                    onClick={() => setEventDate(format(day, "yyyy-MM-dd"))}
                                                >
                                                    <div className={cn(
                                                        "text-xs font-bold mb-1.5 w-7 h-7 flex items-center justify-center rounded-full shrink-0",
                                                        isSameDay(day, today) ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground",
                                                        !isCurrentMonth && "opacity-40"
                                                    )}>
                                                        {format(day, "d")}
                                                    </div>

                                                    <div className="flex flex-col gap-1.5 overflow-y-auto hide-scrollbar z-10">
                                                        {dbEventsForDay.map(evt => (
                                                            <div key={evt.id} onClick={(e) => e.stopPropagation()}>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <div className={cn(
                                                                            "text-[10px] font-bold px-2 py-1 rounded-md border truncate cursor-help transition-all hover:-translate-y-0.5 hover:shadow-md",
                                                                            evt.type === "HOLIDAY"
                                                                                ? "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                                                                                : "bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300"
                                                                        )}>
                                                                            {evt.startTime && <span className="opacity-70 mr-1.5">[{evt.startTime}]</span>}
                                                                            {evt.title}
                                                                        </div>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-80 p-5 shadow-2xl border-muted/20 z-[100]" side="right" align="start">
                                                                        <div className="flex justify-between items-start gap-4">
                                                                            <div className="space-y-1 min-w-0">
                                                                                <div className="font-extrabold text-lg leading-tight">{evt.title}</div>
                                                                                <div className="text-sm font-semibold text-muted-foreground">
                                                                                    {evt.type === "HOLIDAY" ? "Día Festivo" : "Evento Institucional"}
                                                                                </div>
                                                                                <div className="text-xs text-muted-foreground font-medium">
                                                                                    {format(fromUTC(evt.startDate), "PPP", { locale: es })}
                                                                                </div>
                                                                                {(evt.startTime || evt.endTime) && (
                                                                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                                                                                        <Clock className="w-4 h-4" />
                                                                                        {evt.startTime || "--:--"} hasta {evt.endTime || "--:--"}
                                                                                    </div>
                                                                                )}
                                                                                {evt.description && (
                                                                                    <p className="text-sm text-foreground/80 mt-3 bg-muted/40 p-3 rounded-lg border border-border/50">
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
                                                                            {!isObserver && (
                                                                                <Button
                                                                                    variant="destructive"
                                                                                    size="icon"
                                                                                    onClick={(e) => { e.stopPropagation(); setItemToDelete(evt.id); }}
                                                                                    className="shrink-0 h-9 w-9 shadow-md rounded-full"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="absolute inset-0 border-2 border-primary/40 opacity-0 group-hover/day:opacity-100 pointer-events-none transition-opacity rounded-sm z-0" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Single delete confirmation ── */}
            <AlertDialog open={!!itemToDelete} onOpenChange={open => { if (!open) setItemToDelete(null); }}>
                <AlertDialogContent className="max-w-sm rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-destructive" />
                            Eliminar Evento
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                            ¿Estás seguro de que deseas eliminar este evento? Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-2">
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (itemToDelete) {
                                    await handleDelete(itemToDelete);
                                    setItemToDelete(null);
                                }
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl"
                        >
                            Aceptar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Bulk delete by date confirmation ── */}
            <AlertDialog open={bulkDeleteOpen} onOpenChange={open => { if (!open) { setBulkDeleteOpen(false); } }}>
                <AlertDialogContent className="max-w-md rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="w-5 h-5" />
                            Eliminar eventos antes de una fecha
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-foreground/80">
                            Se eliminarán <strong>permanentemente</strong> todos los eventos (festivos y eventos institucionales)
                            cuya fecha sea igual o anterior a la fecha seleccionada. Esta acción <strong>no se puede deshacer</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-3 space-y-3">
                        <Label className="text-sm font-semibold">Fecha de corte (inclusive)</Label>
                        <Input
                            type="date"
                            value={bulkDeleteDate}
                            onChange={e => setBulkDeleteDate(e.target.value)}
                            className="h-12 rounded-xl"
                        />
                        {bulkDeleteDate && (
                            <div className={cn(
                                "text-sm font-semibold px-4 py-3 rounded-xl border",
                                eventsBeforeCutoff > 0
                                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                                    : "bg-muted/50 border-border text-muted-foreground"
                            )}>
                                {eventsBeforeCutoff > 0
                                    ? `⚠️ Se eliminarán ${eventsBeforeCutoff} evento(s) registrado(s)`
                                    : "✅ No hay eventos en ese rango para eliminar"}
                            </div>
                        )}
                    </div>

                    <AlertDialogFooter className="mt-1">
                        <AlertDialogCancel
                            className="rounded-xl"
                            onClick={() => { setBulkDeleteOpen(false); setBulkDeleteDate(""); }}
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            disabled={bulkDeleting || !bulkDeleteDate || eventsBeforeCutoff === 0}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl gap-2 disabled:opacity-50"
                        >
                            {bulkDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            {bulkDeleting ? "Eliminando..." : `Eliminar ${eventsBeforeCutoff > 0 ? eventsBeforeCutoff : ""} evento(s)`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
