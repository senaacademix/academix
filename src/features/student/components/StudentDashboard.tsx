"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseCatalog } from "./CourseCatalog";
import { MyEnrollments } from "./MyEnrollments";
import { formatName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { checkIfPasswordIsDocAction, changeUserPasswordAction } from "@/features/profile/actions/profileActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useWebPush } from "@/hooks/useWebPush";
import { Bell, BellOff, Loader2 } from "lucide-react";

export function StudentDashboard({
    availableCourses,
    myEnrollments,
    studentName,
    pendingEnrollments = [],
    themes = [],
    formattedDate
}: {
    availableCourses: any[],
    myEnrollments: any[],
    studentName: string,
    pendingEnrollments?: string[],
    themes?: any[],
    formattedDate?: string
}) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const selectedCourse = searchParams.get("courseId") || "";
    const activeTab = searchParams.get("tab") || "activities";
    const isInsideCourse = !!selectedCourse;

    const {
        permission,
        isSubscribed,
        loading: pushLoading,
        subscribe,
        unsubscribe
    } = useWebPush();

    const handlePushToggle = async () => {
        if (permission === "denied") {
            toast.error("Permiso bloqueado: Por favor, activa las notificaciones en la barra de direcciones de tu navegador (icono del candado/configuración).", {
                duration: 6000
            });
            return;
        }

        try {
            if (isSubscribed) {
                await unsubscribe();
                toast.success("Notificaciones desactivadas.");
            } else {
                await subscribe();
                toast.success("Notificaciones activadas con éxito.");
            }
        } catch (err: any) {
            toast.error(err.message || "Error al cambiar estado de notificaciones");
        }
    };

    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    // States for password change suggestion
    const [suggestPasswordChange, setSuggestPasswordChange] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        const checkPassword = async () => {
            try {
                const isDoc = await checkIfPasswordIsDocAction();
                if (isDoc) {
                    setSuggestPasswordChange(true);
                }
            } catch (err) {
                console.error("Error checking student password status:", err);
            }
        };
        checkPassword();
    }, []);

    const handleSuggestedPasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess("");

        if (!newPassword || newPassword.length < 8) {
            setPasswordError("La contraseña debe tener al menos 8 caracteres.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError("Las contraseñas no coinciden.");
            return;
        }

        setChangingPassword(true);
        try {
            await changeUserPasswordAction({
                newPassword,
                skipVerification: true
            });
            setPasswordSuccess("Contraseña cambiada exitosamente.");
            toast.success("Contraseña actualizada con éxito");
            setTimeout(() => {
                setSuggestPasswordChange(false);
            }, 1500);
        } catch (err: any) {
            setPasswordError(err.message || "Error al actualizar la contraseña.");
        } finally {
            setChangingPassword(false);
        }
    };

    const handleSelectCourse = (courseId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (courseId) {
            params.set("courseId", courseId);
            params.set("tab", "activities"); // Default tab when entering
        } else {
            params.delete("courseId");
            params.delete("tab");
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleTabChange = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className={cn(
            "flex-1 w-full",
            isInsideCourse ? "p-0 h-[calc(100vh-4rem)] overflow-hidden flex flex-col" : "p-4 sm:p-6 md:p-8 space-y-6"
        )}>
            {/* Header - Hidden when inside a course */}
            {!isInsideCourse && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            ¡Hola, {studentName ? formatName(studentName) : 'Estudiante'}!
                        </h1>
                        <p className="text-sm text-muted-foreground capitalize">
                            {formattedDate || (mounted ? new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '')} — Aquí tienes un resumen de tu actividad académica en AcademiX.
                        </p>
                    </div>
                    {/* Botón de Notificaciones para el Estudiante */}
                    {mounted && permission !== "unsupported" && (
                        <div className="shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePushToggle}
                                disabled={pushLoading}
                                className={cn(
                                    "h-9 font-bold text-xs gap-2 rounded-2xl border border-border/50 shadow-md transition-all duration-200",
                                    isSubscribed 
                                        ? "text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 border-emerald-500/20" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {pushLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isSubscribed ? (
                                    <>
                                        <Bell className="h-4 w-4 fill-current text-emerald-500 animate-pulse" />
                                        <span>Notificaciones Activas</span>
                                    </>
                                ) : (
                                    <>
                                        <BellOff className="h-4 w-4" />
                                        <span>Activar Notificaciones</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {pendingEnrollments.length > 0 && !isInsideCourse && (
                <div className="bg--50 dark:bg--950/20 dark:bg-yellow-900/20 border border--200 dark:border--800/50 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-200 ml-4 sm:ml-6 md:ml-8 mr-4 sm:mr-6 md:mr-8">
                    Tienes {pendingEnrollments.length} solicitud{pendingEnrollments.length !== 1 ? 'es' : ''} de inscripción pendiente{pendingEnrollments.length !== 1 ? 's' : ''} de aprobación por el profesor.
                </div>
            )}

            {/* Content area */}
            <div className={cn(isInsideCourse ? "h-full" : "")}>
                {isInsideCourse && (
                    <style jsx global>{`
                        /* Hide the global App Header when inside a course to allow course-specific unified header */
                        main[data-slot="sidebar-inset"] > header {
                            display: none !important;
                        }

                        /* Remove all margins, radius and force full height on the main inset */
                        main[data-slot="sidebar-inset"] {
                            margin: 0 !important;
                            border-radius: 0 !important;
                            height: 100vh !important;
                            overflow: hidden !important;
                            display: flex !important;
                            flex-direction: column !important;
                        }

                        /* Force the child container to be flush and fill the ENTIRE height since we hid the header */
                        main[data-slot="sidebar-inset"] > div {
                            padding: 0 !important;
                            margin: 0 !important;
                            height: 100vh !important;
                            max-height: 100vh !important;
                            flex: 1 !important;
                            display: flex !important;
                            flex-direction: column !important;
                            overflow: hidden !important;
                        }

                        /* Hide any potential footers and lock global scroll */
                        footer, .footer {
                            display: none !important;
                        }
                        /* Ocultar scrollbar global de windows si persiste */
                        body, html {
                            overflow: hidden !important;
                            height: 100vh !important;
                        }
                    `}</style>
                )}
                {isInsideCourse ? (
                    <MyEnrollments
                        enrollments={myEnrollments}
                        selectedCourse={selectedCourse}
                        onSelectCourse={handleSelectCourse}
                        themes={themes}
                    />
                ) : (
                    <Tabs defaultValue="my-courses" className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <TabsList className="grid w-full sm:w-auto grid-cols-2">
                                <TabsTrigger value="my-courses">Mis Materias</TabsTrigger>
                                <TabsTrigger value="catalog">Catálogo de Materias</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="my-courses" className="space-y-6 mt-0">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <MyEnrollments 
                                    enrollments={myEnrollments} 
                                    selectedCourse={selectedCourse} 
                                    onSelectCourse={handleSelectCourse}
                                    activeTab={activeTab}
                                    onTabChange={handleTabChange}
                                    themes={themes}
                                />
                            </motion.div>
                        </TabsContent>
                        <TabsContent value="catalog" className="space-y-6 mt-0">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <CourseCatalog
                                    courses={availableCourses.filter(course =>
                                        !myEnrollments.some(enrollment => enrollment.courseId === course.id) &&
                                        (!course.group?.endDate || new Date(course.group.endDate) >= new Date())
                                    )}
                                    pendingEnrollments={pendingEnrollments}
                                />
                            </motion.div>
                        </TabsContent>
                    </Tabs>
                )}
            </div>

            {/* ============ DIALOG: SUGGEST PASSWORD CHANGE ============ */}
            <Dialog open={suggestPasswordChange} onOpenChange={setSuggestPasswordChange}>
                <DialogContent
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text--600 dark:text--400 dark:text-yellow-500">
                            🛡️ Seguridad de la cuenta
                        </DialogTitle>
                        <DialogDescription className="mt-2 text-foreground">
                            Detectamos que estás usando tu <strong>número de documento</strong> como contraseña.
                            Por motivos de seguridad y para proteger tu información personal, te sugerimos actualizarla ahora.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSuggestedPasswordChange} className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label htmlFor="s-new-password">Nueva Contraseña</Label>
                            <Input
                                id="s-new-password"
                                type="password"
                                placeholder="Mínimo 8 caracteres"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                disabled={changingPassword}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="s-confirm-password">Confirmar Nueva Contraseña</Label>
                            <Input
                                id="s-confirm-password"
                                type="password"
                                placeholder="Repite la nueva contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={changingPassword}
                            />
                        </div>

                        {passwordError && (
                            <div className="text-sm font-medium text-destructive">{passwordError}</div>
                        )}
                        {passwordSuccess && (
                            <div className="text-sm font-medium text--600 dark:text--400 dark:text-green-500">{passwordSuccess}</div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setSuggestPasswordChange(false)} 
                                disabled={changingPassword}
                            >
                                Omitir por ahora
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={changingPassword || !newPassword || !confirmPassword}
                            >
                                {changingPassword ? "Guardando..." : "Actualizar Contraseña"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
