"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BookOpen, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
    getTeacherQualificationsAction,
    updateTeacherQualificationsAction,
    publishTeacherQualificationsAction
} from "../actions/qualificationActions";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { authClient } from "@/lib/auth-client";

export function TeacherQualificationsView() {
    const { data: session } = authClient.useSession();
    const [locked, setLocked] = useState(false);
    const [qualPrograms, setQualPrograms] = useState<any[]>([]);
    const [selectedQualCourses, setSelectedQualCourses] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [publishDialogOpen, setPublishDialogOpen] = useState(false);
    const [lastModifiedBy, setLastModifiedBy] = useState<{name: string, role: string} | null>(null);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

    useEffect(() => {
        if (session?.user?.id) {
            loadQualifications();
        }
    }, [session?.user?.id]);

    const loadQualifications = async () => {
        if (!session?.user?.id) return;
        setLoading(true);
        try {
            const data = await getTeacherQualificationsAction(session.user.id);
            if (data) {
                setQualPrograms((data as any).programs || []);
                setSelectedQualCourses(((data as any).qualifiedCourses || []).map((c: any) => c.id));
                setLocked((data as any).locked || false);
                setLastModifiedBy((data as any).lastModifiedBy || null);
                setUpdatedAt((data as any).updatedAt ? new Date((data as any).updatedAt) : null);
            }
        } catch (e: any) {
            toast.error(e.message || "Error al cargar asignaturas");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveChanges = () => {
        if (!session?.user?.id) return;
        startTransition(async () => {
            try {
                await updateTeacherQualificationsAction(session.user.id, selectedQualCourses);
                toast.success("Borrador de materias guardado exitosamente");
                await loadQualifications();
            } catch (e: any) {
                toast.error(e.message || "Error al guardar los cambios");
            }
        });
    };

    const handlePublish = () => {
        if (!session?.user?.id) return;
        startTransition(async () => {
            try {
                // First save the current state
                await updateTeacherQualificationsAction(session.user.id, selectedQualCourses);
                // Then publish/lock
                await publishTeacherQualificationsAction(session.user.id);
                toast.success("Materias publicadas y bloqueadas con éxito");
                setPublishDialogOpen(false);
                await loadQualifications();
            } catch (e: any) {
                toast.error(e.message || "Error al publicar las materias");
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Status alerts */}
            {locked ? (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-sm">Materias Publicadas y Bloqueadas</p>
                        <p className="text-xs opacity-90 mt-0.5">
                            Las materias que dictas están registradas y bloqueadas para edición. Si necesitas realizar alguna modificación, por favor ponte en contacto con el administrador de la institución para que proceda a desbloquear tu perfil.
                        </p>
                        {lastModifiedBy && (
                            <p className="text-[11px] mt-2 font-medium bg-emerald-600/10 border border-emerald-600/20 px-2 py-1 rounded-md inline-block">
                                Última modificación: <span className="font-bold">{lastModifiedBy.name}</span> ({lastModifiedBy.role === "admin" ? "Administrador" : "Tú"}) 
                                {updatedAt && ` - ${updatedAt.toLocaleDateString()} ${updatedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-sm">Materias en Modo Borrador</p>
                            <p className="text-xs opacity-90 mt-0.5">
                                Puedes configurar qué materias de tu programa estás en capacidad de dictar. Recuerda hacer clic en **Publicar** para enviarla de forma oficial; esto bloqueará tus cambios para edición.
                            </p>
                            {lastModifiedBy && (
                                <p className="text-[11px] mt-2 font-medium bg-amber-600/10 border border-amber-600/20 px-2 py-1 rounded-md inline-block">
                                    Última modificación: <span className="font-bold">{lastModifiedBy.name}</span> ({lastModifiedBy.role === "admin" ? "Administrador" : "Tú"}) 
                                    {updatedAt && ` - ${updatedAt.toLocaleDateString()} ${updatedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleSaveChanges} 
                            disabled={isPending}
                            className="bg-background text-foreground hover:bg-muted"
                        >
                            Guardar Borrador
                        </Button>
                        <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                                    Publicar y Bloquear
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                        <Lock className="w-5 h-5 text--600 dark:text--400" />
                                        ¿Confirmas publicar tus materias?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Una vez publicadas, tus materias quedarán **bloqueadas** y no podrás realizar más cambios. Solo un administrador podrá desbloquearlas para que puedas editar nuevamente.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={handlePublish}
                                        className="bg-amber-600 hover:bg-amber-700 text-white"
                                    >
                                        Confirmar y Bloquear
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            )}

            <Card className="border-none shadow-sm bg-background">
                <CardHeader className="bg-muted/10 pb-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Asignaturas Disponibles en tus Programas
                    </CardTitle>
                    <CardDescription>
                        Selecciona de la lista a continuación las materias que estás en capacidad de ejecutar.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    {qualPrograms.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground italic border border-dashed rounded-lg">
                            No tienes programas de formación asociados en tu perfil.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {qualPrograms.map(program => (
                                <div key={program.id} className="space-y-3 p-4 bg-muted/5 rounded-xl border border-border/30">
                                    <h4 className="font-bold text-sm text-primary uppercase tracking-wider border-b border-border/30 pb-2">{program.name}</h4>
                                    <div className="space-y-4">
                                        {program.periods.map((period: any) => (
                                            <div key={period.id} className="space-y-2">
                                                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 p-1.5 rounded">{period.name}</h5>
                                                {period.courses.length === 0 ? (
                                                    <div className="text-[10px] text-muted-foreground/60 italic pl-2">No hay materias registradas en este periodo.</div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                                                        {period.courses.map((course: any) => {
                                                            const isChecked = selectedQualCourses.includes(course.id);
                                                            return (
                                                                <div 
                                                                    key={course.id} 
                                                                    className={`flex items-center space-x-2.5 p-2.5 rounded-lg border transition-colors ${
                                                                        isChecked 
                                                                            ? "bg-primary/5 border-primary/20" 
                                                                            : "bg-background border-border hover:bg-muted/30"
                                                                    }`}
                                                                >
                                                                    <Checkbox
                                                                        id={`qual-course-${course.id}`}
                                                                        checked={isChecked}
                                                                        disabled={locked}
                                                                        onCheckedChange={(checked) => {
                                                                            if (checked) {
                                                                                setSelectedQualCourses(prev => [...prev, course.id]);
                                                                            } else {
                                                                                setSelectedQualCourses(prev => prev.filter(id => id !== course.id));
                                                                            }
                                                                        }}
                                                                        className="h-4 w-4 rounded-sm border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                                    />
                                                                    <Label 
                                                                        htmlFor={`qual-course-${course.id}`} 
                                                                        className={`text-xs font-semibold cursor-pointer select-none transition-colors ${locked ? "opacity-70" : "hover:text-foreground"}`}
                                                                    >
                                                                        {course.title}
                                                                    </Label>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
