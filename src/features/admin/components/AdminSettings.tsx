"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Building2, CalendarDays, Save, Sparkles, HelpCircle } from "lucide-react";

interface AdminSettingsProps {
    initialSettings: {
        hasGithubToken: boolean;
        institutionName?: string | null;
        institutionLogo?: string | null;
        institutionHeroImage?: string | null;
        footerText?: string | null;
        studentDailyLimit?: number | null;
        limitAttendanceToCurrentWeek: boolean;
        scheduleTitle?: string | null;
        scheduleStartDate?: Date | string | null;
        scheduleEndDate?: Date | string | null;
        maxTeacherHours?: number | null;
    };
    initialRequests: any[];
    isObserver?: boolean;
}

export function AdminSettings({ initialSettings, isObserver = false }: AdminSettingsProps) {
    const [allowPreviousWeeks, setAllowPreviousWeeks] = useState(!initialSettings.limitAttendanceToCurrentWeek);
    const [institutionName, setInstitutionName] = useState(initialSettings.institutionName || "");
    const [footerText, setFooterText] = useState(initialSettings.footerText || "");
    const [studentDailyLimit, setStudentDailyLimit] = useState(initialSettings.studentDailyLimit ?? 2);
    const [scheduleTitle, setScheduleTitle] = useState(initialSettings.scheduleTitle || "");
    const [scheduleStartDate, setScheduleStartDate] = useState(formatDateForInput(initialSettings.scheduleStartDate));
    const [scheduleEndDate, setScheduleEndDate] = useState(formatDateForInput(initialSettings.scheduleEndDate));
    const [maxTeacherHours, setMaxTeacherHours] = useState(initialSettings.maxTeacherHours ?? 40);

    useEffect(() => {
        setAllowPreviousWeeks(!initialSettings.limitAttendanceToCurrentWeek);
        setInstitutionName(initialSettings.institutionName || "");
        setFooterText(initialSettings.footerText || "");
        setStudentDailyLimit(initialSettings.studentDailyLimit ?? 2);
        setScheduleTitle(initialSettings.scheduleTitle || "");
        setScheduleStartDate(formatDateForInput(initialSettings.scheduleStartDate));
        setScheduleEndDate(formatDateForInput(initialSettings.scheduleEndDate));
        setMaxTeacherHours(initialSettings.maxTeacherHours ?? 40);
    }, [
        initialSettings.limitAttendanceToCurrentWeek,
        initialSettings.institutionName,
        initialSettings.footerText,
        initialSettings.studentDailyLimit,
        initialSettings.scheduleTitle,
        initialSettings.scheduleStartDate,
        initialSettings.scheduleEndDate,
        initialSettings.maxTeacherHours
    ]);

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-2">
            {/* Elegant Header with Sparkle/Icon and Gradients */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
                            Configuración del Sistema
                        </h2>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                        Gestiona y personaliza las preferencias globales del entorno institucional
                    </p>
                </div>
            </div>

            {/* Two-Column Responsive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* CARD 1: Personalización */}
                <Card className="border border-border/40 bg-card/60 backdrop-blur-md shadow-xl hover:shadow-2xl hover:border-primary/20 transition-all duration-300 flex flex-col justify-between overflow-hidden">
                    <div>
                        <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold">Personalización de la Institución</CardTitle>
                                    <CardDescription className="text-xs">Define la identidad visual y límites básicos de la plataforma.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">
                            <form action={async (formData) => {
                                const { updateSettingsAction } = await import("@/features/admin/actions/settingsActions");
                                await updateSettingsAction(formData);
                                toast.success("Personalización de la institución actualizada");
                            }} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="institutionName" className="text-sm font-semibold flex items-center gap-1.5">
                                        Nombre de la Institución
                                    </Label>
                                    <Input
                                        id="institutionName"
                                        name="institutionName"
                                        value={institutionName}
                                        onChange={(e) => setInstitutionName(e.target.value)}
                                        placeholder="Ej: Universidad AcademiX"
                                        className="h-10 transition-all focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                                        disabled={isObserver}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="footerText" className="text-sm font-semibold flex items-center gap-1.5">
                                        Texto del Footer
                                    </Label>
                                    <Input
                                        id="footerText"
                                        name="footerText"
                                        value={footerText}
                                        onChange={(e) => setFooterText(e.target.value)}
                                        placeholder="Ej: © 2026 AcademiX - Todos los derechos reservados"
                                        className="h-10 transition-all focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                                        disabled={isObserver}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="studentDailyLimit" className="text-sm font-semibold flex items-center gap-1.5">
                                        Límite Diario de Accesos (Estudiante)
                                    </Label>
                                    <Input
                                        id="studentDailyLimit"
                                        name="studentDailyLimit"
                                        type="number"
                                        min={1}
                                        value={studentDailyLimit}
                                        onChange={(e) => setStudentDailyLimit(Number(e.target.value))}
                                        placeholder="Ej: 2"
                                        className="h-10 transition-all focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                                        disabled={isObserver}
                                    />
                                    <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1">
                                        <HelpCircle className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/75 flex-shrink-0" />
                                        Controla el número máximo de veces que un estudiante puede acceder a la plataforma por día.
                                    </p>
                                </div>
                                
                                <div className="border-t border-border/30 pt-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <Label htmlFor="limitAttendanceToCurrentWeek" className="text-sm font-semibold cursor-pointer">
                                                Permitir edición de fechas anteriores
                                            </Label>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                Si está activo, los docentes pueden registrar/modificar asistencias de semanas anteriores libremente.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Switch
                                                id="limitAttendanceToCurrentWeek"
                                                checked={allowPreviousWeeks}
                                                onCheckedChange={setAllowPreviousWeeks}
                                                disabled={isObserver}
                                                className="data-[state=checked]:bg-emerald-500"
                                            />
                                            <input
                                                type="hidden"
                                                name="limitAttendanceToCurrentWeek"
                                                value={allowPreviousWeeks ? "false" : "true"}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {!isObserver && (
                                    <div className="flex justify-end pt-4 border-t border-border/20">
                                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 transition-all active:scale-[0.98]">
                                            <Save className="w-4 h-4" />
                                            Guardar Personalización
                                        </Button>
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </div>
                </Card>

                {/* CARD 2: Horario */}
                <Card className="border border-border/40 bg-card/60 backdrop-blur-md shadow-xl hover:shadow-2xl hover:border-primary/20 transition-all duration-300 flex flex-col justify-between overflow-hidden">
                    <div>
                        <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <CalendarDays className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold">Configuración del Horario Académico</CardTitle>
                                    <CardDescription className="text-xs">Define los periodos de vigencia y límites del calendario lectivo.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">
                            <form action={async (formData) => {
                                const { updateSettingsAction } = await import("@/features/admin/actions/settingsActions");
                                await updateSettingsAction(formData);
                                toast.success("Configuración del horario actualizada");
                            }} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="scheduleTitle" className="text-sm font-semibold">
                                        Título del Horario
                                    </Label>
                                    <Input
                                        id="scheduleTitle"
                                        name="scheduleTitle"
                                        value={scheduleTitle}
                                        onChange={(e) => setScheduleTitle(e.target.value)}
                                        placeholder="Ej: Horario Trimestre 1 - 2026"
                                        className="h-10 transition-all focus-visible:ring-primary focus-visible:border-primary"
                                        disabled={isObserver}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="scheduleStartDate" className="text-sm font-semibold">
                                            Fecha Inicio del Periodo
                                        </Label>
                                        <Input
                                            id="scheduleStartDate"
                                            name="scheduleStartDate"
                                            type="date"
                                            value={scheduleStartDate}
                                            onChange={(e) => setScheduleStartDate(e.target.value)}
                                            className="h-10 transition-all focus-visible:ring-primary focus-visible:border-primary"
                                            disabled={isObserver}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="scheduleEndDate" className="text-sm font-semibold">
                                            Fecha Fin del Periodo
                                        </Label>
                                        <Input
                                            id="scheduleEndDate"
                                            name="scheduleEndDate"
                                            type="date"
                                            value={scheduleEndDate}
                                            onChange={(e) => setScheduleEndDate(e.target.value)}
                                            className="h-10 transition-all focus-visible:ring-primary focus-visible:border-primary"
                                            disabled={isObserver}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="maxTeacherHours" className="text-sm font-semibold">
                                        Límite Legal (Horas Semanales por Docente)
                                    </Label>
                                    <Input
                                        id="maxTeacherHours"
                                        name="maxTeacherHours"
                                        type="number"
                                        min={1}
                                        max={168}
                                        value={maxTeacherHours}
                                        onChange={(e) => setMaxTeacherHours(Number(e.target.value))}
                                        placeholder="40"
                                        className="h-10 transition-all focus-visible:ring-primary focus-visible:border-primary"
                                        disabled={isObserver}
                                    />
                                    <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1">
                                        <HelpCircle className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/75 flex-shrink-0" />
                                        Este valor se utiliza para controlar y alertar sobre asignaciones semanales que superen el límite legal del contrato.
                                    </p>
                                </div>

                                {!isObserver && (
                                    <div className="flex justify-end pt-[34px] border-t border-border/20">
                                        <Button type="submit" className="bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-1.5 transition-all active:scale-[0.98]">
                                            <Save className="w-4 h-4" />
                                            Guardar Configuración del Horario
                                        </Button>
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </div>
                </Card>
            </div>
        </div>
    );
}

function formatDateForInput(dateVal: any) {
    if (!dateVal) return "";
    const dateObj = new Date(dateVal);
    if (isNaN(dateObj.getTime())) return "";
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
