"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfileAction, updateProfileAction } from "@/features/profile/actions/profileActions";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { formatName } from "@/lib/utils";

export function ProfileCompletionCheck() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [identificacion, setIdentificacion] = useState("");
    const [nombres, setNombres] = useState("");
    const [apellido, setApellido] = useState("");
    const [telefono, setTelefono] = useState("");
    const [consent, setConsent] = useState(false);

    // Config State
    const [profileIncomplete, setProfileIncomplete] = useState(false);
    // true = solo falta el consentimiento (perfil ya completo)
    const [consentOnly, setConsentOnly] = useState(false);

    const { data: session, refetch } = authClient.useSession();

    useEffect(() => {
        if (session?.user) {
            checkStatus();
        }
    }, [session]);

    const checkStatus = async () => {
        try {
            const [profile] = await Promise.all([
                getProfileAction()
            ]);

            let isProfileIncomplete = false;

            // Check Profile
            if (!profile?.identificacion || !profile?.nombres || !profile?.apellido) {
                isProfileIncomplete = true;
                setNombres(profile?.nombres || session?.user?.name?.split(" ")[0] || "");
                setApellido(profile?.apellido || session?.user?.name?.split(" ").slice(1).join(" ") || "");
                setIdentificacion(profile?.identificacion || "");
                setTelefono(profile?.telefono || "");
            } else {
                setIdentificacion(profile.identificacion);
                setNombres(profile.nombres);
                setApellido(profile.apellido);
                setTelefono(profile.telefono || "");
            }
            setConsent(!!profile?.dataProcessingConsent);

            const needsConsent = !profile?.dataProcessingConsent;

            if (isProfileIncomplete || needsConsent) {
                setProfileIncomplete(isProfileIncomplete);
                // Solo falta consentimiento si el perfil está completo
                setConsentOnly(!isProfileIncomplete && needsConsent);
                setIsOpen(true);
            } else {
                setIsOpen(false);
            }

        } catch (error) {
            console.error("Error checking profile status:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (profileIncomplete && (!identificacion.trim() || !nombres.trim() || !apellido.trim())) {
            toast.error("Por favor completa todos los campos obligatorios del perfil.");
            return;
        }

        if (!consent) {
            toast.error("Debes aceptar la autorización de tratamiento de datos para continuar.");
            return;
        }

        setSaving(true);
        try {
            const capitalizedNombres = formatName(nombres);
            const capitalizedApellido = formatName(apellido);

            const formData = new FormData();
            formData.append("identificacion", identificacion);
            formData.append("nombres", capitalizedNombres);
            formData.append("apellido", capitalizedApellido);
            if (telefono) formData.append("telefono", telefono);
            formData.append("dataProcessingConsent", "true");

            await updateProfileAction(formData);

            // Update session name if changed
            const fullName = `${capitalizedNombres} ${capitalizedApellido}`.trim();
            if (session?.user?.name !== fullName) {
                await authClient.updateUser({ name: fullName });
            }

            await refetch?.();
            toast.success(
                consentOnly
                    ? "Tratamiento de datos aceptado correctamente"
                    : "Información actualizada correctamente"
            );

            await checkStatus();

        } catch (error) {
            console.error("Error saving profile:", error);
            toast.error("Error al guardar la información");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    // ── Modal exclusivo de consentimiento (perfil ya está completo) ──
    if (consentOnly) {
        return (
            <Dialog open={isOpen} onOpenChange={() => { }}>
                <DialogContent
                    className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto [&>button]:hidden text-left"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            <DialogTitle className="text-lg">Autorización de Tratamiento de Datos Personales</DialogTitle>
                        </div>
                        <DialogDescription>
                            Conforme a la legislación colombiana de protección de datos, debes autorizar el tratamiento
                            de tu información antes de usar la plataforma.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4 text-sm">
                        <div className="rounded-lg bg-muted/50 border p-4 space-y-3">
                            <p className="font-semibold text-foreground">Aviso de Privacidad</p>
                            <p className="text-muted-foreground text-justify leading-relaxed">
                                En cumplimiento de la <strong className="text-foreground">Ley Estatutaria 1581 de 2012</strong> de protección de datos personales, le informamos que al utilizar la plataforma <strong>AcademiX</strong> sus datos personales (identificación, nombres, apellidos, teléfono y correo electrónico) serán tratados de manera confidencial y segura.
                            </p>
                            <p className="text-muted-foreground text-justify leading-relaxed">
                                La finalidad del tratamiento es netamente académica, orientada a la gestión y administración de procesos formativos, control de asistencia, registro de calificaciones y comunicación. Como titular de la información, tiene derecho a conocer, actualizar y rectificar sus datos.
                            </p>
                        </div>

                        {/* Checkbox */}
                        <div className="flex items-start space-x-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                            <Checkbox
                                id="consent-only"
                                checked={consent}
                                onCheckedChange={(checked) => setConsent(checked as boolean)}
                                className="mt-0.5"
                            />
                            <label
                                htmlFor="consent-only"
                                className="text-sm font-medium leading-snug cursor-pointer select-none"
                            >
                                Autorizo de manera <strong>voluntaria, previa, explícita, informada e inequívoca</strong> el tratamiento de mis datos personales en la plataforma AcademiX.
                            </label>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <p className="text-xs text-muted-foreground flex-1 hidden sm:block">
                            Esta autorización es obligatoria para el uso de la plataforma.
                        </p>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !consent}
                            className="w-full sm:w-auto"
                        >
                            {saving ? "Guardando..." : "Aceptar y Continuar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // ── Modal completo: perfil incompleto + consentimiento ──
    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent
                className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto [&>button]:hidden text-left"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Información Requerida para Continuar</DialogTitle>
                    <DialogDescription>
                        Para usar la plataforma debes completar tu perfil y autorizar el tratamiento de tus datos personales
                        conforme a la legislación colombiana vigente.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4 text-sm">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Atención</AlertTitle>
                        <AlertDescription>
                            Los siguientes datos son obligatorios para el correcto funcionamiento del sistema y la gestión académica.
                        </AlertDescription>
                    </Alert>

                    {profileIncomplete && (
                        <div className="space-y-4">
                            <h3 className="font-medium border-b pb-2">Datos Personales</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nombres">Nombres *</Label>
                                    <Input id="nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} placeholder="Tus nombres" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="apellido">Apellido *</Label>
                                    <Input id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Tu apellido" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="identificacion">Identificación (Cédula/DNI) *</Label>
                                    <Input id="identificacion" value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} placeholder="Número de documento" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telefono">Teléfono</Label>
                                    <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Número de contacto" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sección legal */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            Autorización de Tratamiento de Datos Personales
                        </h3>

                        <div className="rounded-lg bg-muted/50 border p-4 space-y-3">
                            <p className="font-semibold text-foreground">Aviso de Privacidad</p>
                            <p className="text-muted-foreground text-justify leading-relaxed">
                                En cumplimiento de la <strong className="text-foreground">Ley Estatutaria 1581 de 2012</strong> de protección de datos personales, le informamos que al utilizar la plataforma <strong>AcademiX</strong> sus datos personales (identificación, nombres, apellidos, teléfono y correo electrónico) serán tratados de manera confidencial y segura.
                            </p>
                            <p className="text-muted-foreground text-justify leading-relaxed">
                                La finalidad del tratamiento es netamente académica, orientada a la gestión y administración de procesos formativos, control de asistencia, registro de calificaciones y comunicación. Como titular de la información, tiene derecho a conocer, actualizar y rectificar sus datos.
                            </p>
                        </div>

                        {/* Checkbox */}
                        <div className="flex items-start space-x-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                            <Checkbox
                                id="consent"
                                checked={consent}
                                onCheckedChange={(checked) => setConsent(checked as boolean)}
                                className="mt-0.5"
                            />
                            <label
                                htmlFor="consent"
                                className="text-sm font-medium leading-snug cursor-pointer select-none"
                            >
                                Autorizo de manera <strong>voluntaria, previa, explícita, informada e inequívoca</strong> el tratamiento de mis datos personales en la plataforma AcademiX.
                            </label>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <p className="text-xs text-muted-foreground flex-1 hidden sm:block">
                        Esta autorización es requerida para el uso de la plataforma.
                    </p>
                    <Button onClick={handleSave} disabled={saving || !consent}>
                        {saving ? "Guardando..." : "Guardar y Continuar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
