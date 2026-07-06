"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    ScrollText, 
    Scale, 
    ShieldAlert, 
    Sparkles, 
    Users, 
    UserX 
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function LicenseModal() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60">
                <ScrollText className="h-4 w-4" />
                <span className="sr-only">Licencia de Uso</span>
            </Button>
        );
    }

    return (
        <Dialog>
            <Tooltip>
                <DialogTrigger asChild>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100 transition-all">
                            <ScrollText className="h-4 w-4" />
                            <span className="sr-only">Licencia de Uso</span>
                        </Button>
                    </TooltipTrigger>
                </DialogTrigger>
                <TooltipContent>
                    <p>Licencia de Uso</p>
                </TooltipContent>
            </Tooltip>
            
            <DialogContent className="max-w-4xl sm:max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Scale className="h-5 w-5 text-primary" />
                            <DialogTitle className="text-xl font-bold">Licencia de Uso</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs mt-1">
                            Términos de uso condicional y restricciones legales de la plataforma AcademiX.
                        </DialogDescription>
                    </div>
                    <Badge variant="outline" className="whitespace-nowrap border-primary/20 text-primary self-start sm:self-auto bg-primary/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        Uso Gratuito (Código Cerrado)
                    </Badge>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* Warning Banner */}
                    <div className="relative overflow-hidden flex items-start gap-3 p-4 rounded-xl border border-destructive/20 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent text-destructive-foreground dark:text-red-300 shadow-sm">
                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-destructive" />
                        <div className="space-y-1">
                            <p className="font-semibold text-sm text-destructive dark:text-red-400">
                                Restricción Legal Absoluta de Campo de Uso
                            </p>
                            <p className="text-xs opacity-90 leading-relaxed">
                                Este software está licenciado bajo condiciones estrictas de propósito. Está <strong>estrictamente prohibido</strong> su uso para la fiscalización, control laboral de asistencia o supervisión de desempeño de <strong>profesores, instructores o personal administrativo</strong>. Su uso está restringido exclusivamente al seguimiento académico de <strong>estudiantes</strong>.
                            </p>
                        </div>
                    </div>

                    {/* Overview Cards */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="border border-muted-foreground/10 bg-card shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2 text-primary">
                                    <Sparkles className="w-4 h-4" />
                                    <CardTitle className="text-sm">¿Por qué esta Licencia?</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                                <p>
                                    La prioridad absoluta de esta licencia es la <strong>protección laboral de los docentes</strong>. A diferencia del software libre tradicional, este modelo prohíbe la modificación y reutilización del código, y restringe el uso del sistema para evitar que sea transformado en una herramienta de vigilancia o control del profesorado por parte de las instituciones.
                                </p>
                                <p>
                                    El software se ofrece de forma gratuita para su uso final, garantizando que cumpla con el propósito original sin alteraciones no autorizadas.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border border-muted-foreground/10 bg-card shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2 text-primary">
                                    <Scale className="w-4 h-4" />
                                    <CardTitle className="text-sm">Ventajas Clave</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-start gap-2 text-xs">
                                    <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                        <Users className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">Claridad jurídica para profesores</p>
                                        <p className="text-muted-foreground text-[10px] mt-0.5">Los sindicatos o profesores pueden exigir el cese inmediato de uso si detectan vigilancia.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 text-xs">
                                    <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                        <UserX className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">Manos atadas para abusos</p>
                                        <p className="text-muted-foreground text-[10px] mt-0.5">El código no puede ser modificado ni reutilizado, garantizando que ninguna institución pueda alterar sus restricciones protectoras.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
