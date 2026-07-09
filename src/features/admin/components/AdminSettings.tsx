"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

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
}

export function AdminSettings({ initialSettings, initialRequests }: AdminSettingsProps) {
    const [limitWeek, setLimitWeek] = useState(initialSettings.limitAttendanceToCurrentWeek || false);
    const [requests, setRequests] = useState<any[]>(initialRequests);
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
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="footerText">Texto del Footer</Label>
                                <Input
                                    id="footerText"
                                    name="footerText"
                                    defaultValue={initialSettings.footerText || ""}
                                    placeholder="Ej: © 2026 AcademiX - Todos los derechos reservados"
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
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Controla el número máximo de veces que un estudiante puede acceder a la plataforma por día para optimizar la base de datos.
                                </p>
                            </div>
                            <div className="flex items-center justify-between border-t border-border/50 pt-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="limitAttendanceToCurrentWeek">Limitar registro a la semana actual</Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Si está activo, el docente solo puede registrar/modificar asistencias de fechas que pertenezcan a la semana actual. Para modificar semanas anteriores, requerirá autorización del administrador.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="limitAttendanceToCurrentWeek"
                                        checked={limitWeek}
                                        onCheckedChange={setLimitWeek}
                                    />
                                    <input 
                                        type="hidden" 
                                        name="limitAttendanceToCurrentWeek" 
                                        value={limitWeek ? "true" : "false"} 
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button type="submit">Guardar Personalización</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Permission requests card */}
                    <Card className="border border-border/50 shadow-lg mt-6">
                        <CardHeader>
                            <CardTitle>Solicitudes de Permiso de Edición</CardTitle>
                            <CardDescription>
                                Profesores que solicitan editar la asistencia de fechas pertenecientes a semanas anteriores.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {requests.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-4 text-center">
                                    No hay solicitudes de permiso pendientes o registradas.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {requests.map((req) => (
                                        <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-foreground">{req.teacherName}</span>
                                                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                                                        {req.groupName} • {req.courseName}
                                                    </span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                                        req.status === "PENDING" 
                                                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                                                            : req.status === "APPROVED"
                                                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                                                                : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                                                    }`}>
                                                        {req.status === "PENDING" ? "Pendiente" : req.status === "APPROVED" ? "Aprobado" : "Rechazado"}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground font-semibold">
                                                    Fecha solicitada: <span className="text-foreground">{new Date(req.date).toLocaleDateString("es-CO", { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}</span>
                                                </p>
                                                {req.reason && (
                                                    <p className="text-[11px] bg-background border rounded-lg p-2 mt-1 text-muted-foreground">
                                                        Motivo: <span className="text-foreground font-medium">{req.reason}</span>
                                                    </p>
                                                )}
                                            </div>
                                            
                                            {req.status === "PENDING" && (
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs font-bold border-red-500/20 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                        onClick={async () => {
                                                            const { respondToAttendancePermissionRequestAction } = await import("@/features/teacher/actions/groupActions");
                                                            const res = await respondToAttendancePermissionRequestAction(req.id, "REJECTED");
                                                            if (res.success) {
                                                                toast.success("Solicitud rechazada.");
                                                                window.location.reload();
                                                            }
                                                        }}
                                                    >
                                                        Rechazar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        onClick={async () => {
                                                            const { respondToAttendancePermissionRequestAction } = await import("@/features/teacher/actions/groupActions");
                                                            const res = await respondToAttendancePermissionRequestAction(req.id, "APPROVED");
                                                            if (res.success) {
                                                                toast.success("Solicitud aprobada.");
                                                                window.location.reload();
                                                            }
                                                        }}
                                                    >
                                                        Aprobar
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
            </div>
        </div>
    );
}
