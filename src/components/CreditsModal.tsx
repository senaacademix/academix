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
import { Info, Code2, Crown } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function CreditsModal() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60">
                <Info className="h-4 w-4" />
                <span className="sr-only">Créditos</span>
            </Button>
        );
    }

    return (
        <Dialog>
            <Tooltip>
                <DialogTrigger asChild>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100 transition-all">
                            <Info className="h-4 w-4" />
                            <span className="sr-only">Créditos</span>
                        </Button>
                    </TooltipTrigger>
                </DialogTrigger>
                <TooltipContent>
                    <p>Créditos</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Créditos de la Aplicación</DialogTitle>
                    <DialogDescription>
                        Información sobre el autor y desarrollo.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                        <Info className="h-12 w-12 text-primary" />
                    </div>
                    <div className="space-y-4 w-full max-w-sm">
                        {/* Desarrolladores del Proyecto (ALTAMENTE RESALTADO) */}
                        <div className="relative overflow-hidden p-6 rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-teal-500/10 shadow-sm transition-all hover:shadow-md hover:border-primary/40 text-center space-y-3">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex items-center justify-center gap-2">
                                <Code2 className="h-4.5 w-4.5 text-primary animate-pulse shrink-0" />
                                <span className="text-[10px] text-primary font-black tracking-widest uppercase">
                                    Desarrolladores del Proyecto
                                </span>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-base font-extrabold text-foreground tracking-tight hover:scale-[1.01] transition-transform cursor-default">
                                    Jhon Fredy Valencia Gómez
                                </h3>
                                <h3 className="text-base font-extrabold text-foreground tracking-tight hover:scale-[1.01] transition-transform cursor-default">
                                    Deimer Andrés Miranda Montoya
                                </h3>
                                <h3 className="text-base font-extrabold text-foreground tracking-tight hover:scale-[1.01] transition-transform cursor-default">
                                    Jaime Alberto Zapata Valencia
                                </h3>
                            </div>
                        </div>

                        {/* Líder del Proyecto (DISEÑO MÁS DISCRETO) */}
                        <div className="p-3.5 rounded-2xl bg-muted/40 border border-muted/50 transition-all hover:bg-muted/60 text-center space-y-0.5">
                            <div className="flex items-center justify-center gap-1.5 text-muted-foreground/80">
                                <Crown className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-[9px] font-bold tracking-widest uppercase">
                                    Líder del Proyecto
                                </span>
                            </div>
                            <h4 className="text-sm font-semibold text-muted-foreground">
                                Boris David Gómez Guerrero
                            </h4>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground pt-4">
                        © {new Date().getFullYear()} AcademiX. Todos los derechos reservados.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
