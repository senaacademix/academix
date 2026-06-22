"use client";

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Save, Calendar, X } from "lucide-react";

interface ScheduleSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scheduleTitle: string;
    setScheduleTitle: (val: string) => void;
    scheduleStartDate: string;
    setScheduleStartDate: (val: string) => void;
    scheduleEndDate: string;
    setScheduleEndDate: (val: string) => void;
    maxTeacherHours: number;
    setMaxTeacherHours: (val: number) => void;
    triggerSettingsChange: (title: string, startDate: string, endDate: string) => void;
}

export function ScheduleSettingsDialog({
    open,
    onOpenChange,
    scheduleTitle,
    setScheduleTitle,
    scheduleStartDate,
    setScheduleStartDate,
    scheduleEndDate,
    setScheduleEndDate,
    maxTeacherHours,
    setMaxTeacherHours,
    triggerSettingsChange
}: ScheduleSettingsDialogProps) {
    
    // We keep local state for the inputs to only apply them when the user clicks "Save"
    const [localTitle, setLocalTitle] = React.useState(scheduleTitle);
    const [localStartDate, setLocalStartDate] = React.useState(scheduleStartDate);
    const [localEndDate, setLocalEndDate] = React.useState(scheduleEndDate);
    const [localMaxHours, setLocalMaxHours] = React.useState(maxTeacherHours.toString());

    // Update local state when dialog opens
    React.useEffect(() => {
        if (open) {
            setLocalTitle(scheduleTitle);
            setLocalStartDate(scheduleStartDate);
            setLocalEndDate(scheduleEndDate);
            setLocalMaxHours(maxTeacherHours.toString());
        }
    }, [open, scheduleTitle, scheduleStartDate, scheduleEndDate, maxTeacherHours]);

    const handleSave = () => {
        setScheduleTitle(localTitle);
        setScheduleStartDate(localStartDate);
        setScheduleEndDate(localEndDate);
        setMaxTeacherHours(Number(localMaxHours) || 40);
        
        triggerSettingsChange(localTitle, localStartDate, localEndDate);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 border-border/50 shadow-2xl overflow-hidden bg-background">
                {/* Header Section */}
                <div className="relative z-10 px-6 py-5 border-b bg-muted/30 shadow-sm shrink-0 flex items-center justify-between gap-4">
                    <DialogHeader className="text-left space-y-0">
                        <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight m-0">
                            <div className="p-1.5 bg-gradient-to-br from-primary/20 to-primary/40 rounded-xl shadow-inner border border-primary/10">
                                <Settings className="w-5 h-5 text-primary" />
                            </div>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary animate-gradient-x">
                                Configuración General del Horario
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Ajusta los parámetros globales de la planificación actual.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <div className="grid gap-6">
                        <div className="grid gap-3">
                            <Label htmlFor="title" className="font-bold text-base">Título del Horario</Label>
                            <Input
                                id="title"
                                className="h-12 text-lg px-4 rounded-xl"
                                value={localTitle}
                                onChange={(e) => setLocalTitle(e.target.value)}
                                placeholder="Ej: Horario Trimestre 1 - 2026"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="grid gap-3">
                                <Label htmlFor="start-date" className="font-bold text-base flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-primary" /> Fecha Inicio
                                </Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    className="h-12 text-lg px-4 rounded-xl"
                                    value={localStartDate}
                                    onChange={(e) => setLocalStartDate(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="end-date" className="font-bold text-base flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-primary" /> Fecha Fin
                                </Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    className="h-12 text-lg px-4 rounded-xl"
                                    value={localEndDate}
                                    onChange={(e) => setLocalEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid gap-3">
                            <Label htmlFor="max-hours" className="font-bold text-base">Límite Legal (Horas Semanales por Docente)</Label>
                            <Input
                                id="max-hours"
                                type="number"
                                min="1"
                                max="60"
                                className="h-12 text-lg px-4 rounded-xl"
                                value={localMaxHours}
                                onChange={(e) => setLocalMaxHours(e.target.value)}
                                placeholder="40"
                            />
                            <p className="text-sm text-muted-foreground">
                                Este valor se utilizará para bloquear asignaciones que superen el límite legal del contrato.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t bg-muted/10 flex gap-3 justify-end items-center">
                    <Button variant="outline" size="lg" className="rounded-xl h-12 px-6" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} size="lg" className="gap-2 rounded-xl h-12 px-8 text-base">
                        <Save className="w-5 h-5" /> Guardar Configuración
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
