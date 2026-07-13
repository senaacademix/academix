"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PushTestCard } from "@/components/PushTestCard";

interface AdminSettingsProps {
    initialSettings: {
        hasGithubToken: boolean;
        institutionName?: string | null;
        institutionLogo?: string | null;
        institutionHeroImage?: string | null;
        footerText?: string | null;
        studentDailyLimit?: number | null;
        limitAttendanceToCurrentWeek: boolean;
    };
    initialRequests: any[];
    isObserver?: boolean;
}

export function AdminSettings({ initialSettings, isObserver = false }: AdminSettingsProps) {
    const [allowPreviousWeeks, setAllowPreviousWeeks] = useState(!initialSettings.limitAttendanceToCurrentWeek);
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h2>
                    <p className="text-muted-foreground">
                        Gestiona las preferencias globales de la institución
                    </p>
                </div>
            </div>

            <div className="max-w-2xl">
                <Card className="border border-border/50 shadow-lg">
                    <CardHeader>
                        <CardTitle>Personalización de la Institución</CardTitle>
                        <CardDescription>Define el nombre y footer que aparecerán en la plataforma.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={async (formData) => {
                            const { updateSettingsAction } = await import("@/features/admin/actions/settingsActions");
                            await updateSettingsAction(formData);
                            toast.success("Configuración actualizada");
                        }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="institutionName">Nombre de la Institución</Label>
                                <Input
                                    id="institutionName"
                                    name="institutionName"
                                    defaultValue={initialSettings.institutionName || ""}
                                    placeholder="Ej: Universidad AcademiX"
                                    disabled={isObserver}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="footerText">Texto del Footer</Label>
                                <Input
                                    id="footerText"
                                    name="footerText"
                                    defaultValue={initialSettings.footerText || ""}
                                    placeholder="Ej: © 2026 AcademiX - Todos los derechos reservados"
                                    disabled={isObserver}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="studentDailyLimit">Límite Diario de Accesos (Estudiante)</Label>
                                <Input
                                    id="studentDailyLimit"
                                    name="studentDailyLimit"
                                    type="number"
                                    min={1}
                                    defaultValue={initialSettings.studentDailyLimit ?? 2}
                                    placeholder="Ej: 2"
                                    disabled={isObserver}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Controla el número máximo de veces que un estudiante puede acceder a la plataforma por día para optimizar la base de datos.
                                </p>
                            </div>
                            <div className="flex items-center justify-between border-t border-border/50 pt-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="limitAttendanceToCurrentWeek">Permitir edición de fechas anteriores</Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Si está activo, los docentes pueden registrar/modificar asistencias de semanas anteriores libremente. Si está inactivo, el registro de asistencia estará limitado únicamente a la semana actual.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="limitAttendanceToCurrentWeek"
                                        checked={allowPreviousWeeks}
                                        onCheckedChange={setAllowPreviousWeeks}
                                        disabled={isObserver}
                                    />
                                    <input
                                        type="hidden"
                                        name="limitAttendanceToCurrentWeek"
                                        value={allowPreviousWeeks ? "false" : "true"}
                                    />
                                </div>
                            </div>
                            {!isObserver && (
                                <div className="flex justify-end pt-2">
                                    <Button type="submit">Guardar Personalización</Button>
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>

                <div className="mt-6">
                    <PushTestCard />
                </div>
            </div>
        </div>
    );
}
