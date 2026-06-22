"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getScheduleEvents, createScheduleEvent, deleteScheduleEvent } from "@/features/schedule/actions/eventActions";
import { Calendar as CalendarIcon, Trash2, Plus, CalendarDays, Loader2, Sparkles, AlertTriangle, Clock, AlignLeft } from "lucide-react";
import { parseISOAsUTC, fromUTC, formatCalendarDate } from "@/lib/dateUtils";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function ScheduleEventDialog({ open, onOpenChange, globalStartDate, globalEndDate }: { open: boolean, onOpenChange: (open: boolean) => void, globalStartDate?: string | null, globalEndDate?: string | null }) {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [type, setType] = useState<"HOLIDAY" | "EVENT">("HOLIDAY");

    const sDate = globalStartDate ? parseISOAsUTC(globalStartDate) : null;
    const eDate = globalEndDate ? parseISOAsUTC(globalEndDate) : null;

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(() => {
        const today = new Date();
        if (sDate && startOfDay(today) < startOfDay(sDate)) return sDate;
        if (eDate && startOfDay(today) > startOfDay(eDate)) return eDate;
        return today;
    });

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    let canGoBack = true;
    let canGoForward = true;
    if (sDate) canGoBack = startOfMonth(currentMonth) > startOfMonth(sDate);
    if (eDate) canGoForward = startOfMonth(currentMonth) < startOfMonth(eDate);

    const monthDays: Date[] = [];
    let d = startDate;
    while (d <= endDate) {
        monthDays.push(d);
        d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    }

    const DAY_NAMES_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const today = new Date();

    useEffect(() => {
        if (open) {
            fetchEvents();
        }
    }, [open]);

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

        const start = parseISOAsUTC(eventDate);
        const end = parseISOAsUTC(eventDate);

        setSaving(true);
        const res = await createScheduleEvent({
            title: finalTitle,
            description: type === "EVENT" ? description : null,
            startTime: type === "EVENT" && startTime ? startTime : null,
            endTime: type === "EVENT" && endTime ? endTime : null,
            startDate: start,
            endDate: end,
            type
        });

        if (res.success) {
            toast.success("Registro creado exitosamente");
            setTitle("");
            setDescription("");
            setStartTime("");
            setEndTime("");
            setEventDate("");
            fetchEvents();
        } else {
            toast.error(res.error || "Error al crear el evento");
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este evento?")) return;
        
        const res = await deleteScheduleEvent(id);
        if (res.success) {
            toast.success("Evento eliminado");
            fetchEvents();
        } else {
            toast.error("Error al eliminar el evento");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none sm:max-w-none w-screen h-[100dvh] p-0 m-0 !rounded-none border-none flex flex-col bg-background overflow-hidden">
                
                {/* Decorative background gradients */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

                {/* Header Section */}
                <div className="relative z-10 px-6 py-3 border-b bg-card shadow-sm shrink-0 flex items-center justify-between gap-4">
                    <DialogHeader className="text-left space-y-0">
                        <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight m-0">
                            <div className="p-1.5 bg-gradient-to-br from-primary/20 to-primary/40 rounded-xl shadow-inner border border-primary/10">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60 animate-gradient-x">
                                Gestión de Eventos y Festivos
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Gestión de Eventos y Festivos del calendario
                        </DialogDescription>
                    </DialogHeader>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full bg-muted/50 hover:bg-muted shrink-0 z-50 w-8 h-8">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Main Content Scroll Area */}
                <div className="flex-1 flex overflow-hidden relative z-10">
                    <div className="max-w-[1600px] mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-1 gap-6 h-full flex-1">
                        
                        {/* Left Column: Form */}
                        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent min-h-0">
                            <div className="bg-card border border-border rounded-3xl p-7 shadow-sm transition-all shrink-0">
                                <h3 className="text-xl font-bold flex items-center gap-2.5 mb-6 text-foreground/90">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-primary" />
                                    </div>
                                    Registrar Nuevo
                                </h3>
                                
                                <div className="space-y-5">
                                    <div className="space-y-2.5">
                                        <Label className="text-sm font-semibold text-muted-foreground">Tipo de Registro</Label>
                                        <Select value={type} onValueChange={(v: "HOLIDAY"| "EVENT") => {
                                            setType(v);
                                            if (v === "HOLIDAY") setTitle("");
                                        }}>
                                            <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/50 transition-colors hover:border-primary/50">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="HOLIDAY" className="py-3 cursor-pointer">
                                                    <div className="flex items-center gap-3 font-semibold">
                                                        <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
                                                        Día Festivo (Bloqueo Total)
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="EVENT" className="py-3 cursor-pointer">
                                                    <div className="flex items-center gap-3 font-semibold">
                                                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
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
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2.5">
                                                    <Label className="text-sm font-semibold text-muted-foreground">Hora de Inicio</Label>
                                                    <div className="relative">
                                                        <Input 
                                                            type="time" 
                                                            value={startTime} 
                                                            onChange={e => setStartTime(e.target.value)}
                                                            className="h-12 pl-10 rounded-xl bg-background/50 border-border/50 transition-colors focus:border-primary"
                                                        />
                                                        <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2.5">
                                                    <Label className="text-sm font-semibold text-muted-foreground">Hora de Fin</Label>
                                                    <div className="relative">
                                                        <Input 
                                                            type="time" 
                                                            value={endTime} 
                                                            onChange={e => setEndTime(e.target.value)}
                                                            className="h-12 pl-10 rounded-xl bg-background/50 border-border/50 transition-colors focus:border-primary"
                                                        />
                                                        <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2.5">
                                            <Label className="text-sm font-semibold text-muted-foreground">Fecha Seleccionada</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full h-12 justify-start text-left font-normal rounded-xl bg-background/50 border-border/50 transition-colors hover:border-primary/50 hover:bg-transparent",
                                                            !eventDate && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarDays className="mr-2 h-4 w-4" />
                                                        {eventDate ? format(new Date(eventDate + "T12:00:00"), "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={eventDate ? new Date(eventDate + "T12:00:00") : undefined}
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                setEventDate(format(date, "yyyy-MM-dd"));
                                                            } else {
                                                                setEventDate("");
                                                            }
                                                        }}
                                                        fromDate={sDate || undefined}
                                                        toDate={eDate || undefined}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
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

                        {/* Right Column: Month Calendar */}
                        <div className="lg:col-span-8 flex flex-col min-w-0 min-h-0">
                            <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col h-full transition-all">
                                <div className="px-6 py-5 border-b border-border/50 bg-muted/30 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} disabled={!canGoBack}>
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <h3 className="text-xl font-bold flex items-center gap-3 text-foreground/90 capitalize w-48 justify-center">
                                            {format(currentMonth, "MMMM yyyy", { locale: es })}
                                        </h3>
                                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} disabled={!canGoForward}>
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => {
                                                const today = new Date();
                                                if (sDate && startOfDay(today) < startOfDay(sDate)) setCurrentMonth(sDate);
                                                else if (eDate && startOfDay(today) > startOfDay(eDate)) setCurrentMonth(eDate);
                                                else setCurrentMonth(today);
                                            }}
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
                                        <div className="grid grid-cols-7 divide-x border-b bg-muted/30 shrink-0">
                                            {DAY_NAMES_ES.map(d => (
                                                <div key={d} className="py-3 text-center text-sm font-bold text-muted-foreground uppercase tracking-wider">{d}</div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 divide-x divide-y flex-1 auto-rows-fr overflow-hidden">
                                            {monthDays.map((day, i) => {
                                                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                                                const dbEventsForDay = events.filter(e => {
                                                    const eStartDate = startOfDay(fromUTC(e.startDate));
                                                    const d = startOfDay(day);
                                                    return d.getTime() === eStartDate.getTime();
                                                });
                                                
                                                const isOutside = (sDate && startOfDay(day) < startOfDay(sDate)) || (eDate && startOfDay(day) > startOfDay(eDate));

                                                return (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            "p-2 flex flex-col relative group/day transition-colors",
                                                            !isCurrentMonth && "bg-muted/10",
                                                            isSameDay(day, today) && "bg-primary/5",
                                                            isOutside ? "opacity-50 pointer-events-none bg-muted/40" : "cursor-pointer hover:bg-muted/30"
                                                        )}
                                                        onClick={() => {
                                                            if (!isOutside) setEventDate(format(day, "yyyy-MM-dd"));
                                                        }}
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
                                                                                evt.type === "HOLIDAY" ? "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30 text-red-700 dark:text-red-300" : "bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300"
                                                                            )}>
                                                                                {evt.startTime && <span className="opacity-70 mr-1.5">[{evt.startTime}]</span>}
                                                                                {evt.title}
                                                                            </div>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-80 p-5 shadow-2xl border-muted/20 z-[100]" side="right" align="start">
                                                                            <div className="flex justify-between items-start gap-4">
                                                                                <div className="space-y-1">
                                                                                    <div className="font-extrabold text-lg leading-tight">{evt.title}</div>
                                                                                    <div className="text-sm font-semibold text-muted-foreground">{evt.type === "HOLIDAY" ? "Día Festivo" : "Evento Institucional"}</div>
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
                                                                                </div>
                                                                                <Button 
                                                                                    variant="destructive" 
                                                                                    size="icon" 
                                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(evt.id); }}
                                                                                    className="shrink-0 h-9 w-9 shadow-md rounded-full"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </Button>
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
            </DialogContent>
        </Dialog>
    );
}
