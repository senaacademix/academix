"use client";

import { AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface StudentNovedadBadgeProps {
    novedad?: string | null;
    color?: string | null;
    className?: string;
}

export function StudentNovedadBadge({ novedad, color, className = "" }: StudentNovedadBadgeProps) {
    if (!novedad) return null;

    const lowerNovedad = novedad.toLowerCase();
    
    // Si no tiene color asignado en BD, determinar por palabra clave
    let activeColor = color;
    if (!activeColor) {
        const isCritical = lowerNovedad.includes("condicionado") || lowerNovedad.includes("condicion") || lowerNovedad.includes("alerta") || lowerNovedad.includes("disciplina");
        activeColor = isCritical ? "red" : "blue";
    }

    // Configurar clases de colores de Tailwind para los distintos tipos de estados
    let colorClasses = "";
    switch (activeColor) {
        case "red":
            colorClasses = "bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800/50";
            break;
        case "orange":
            colorClasses = "bg-orange-500/10 text-orange-600 border-orange-200 hover:bg-orange-500/20 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800/50";
            break;
        case "yellow":
            colorClasses = "bg-yellow-500/10 text-amber-600 border-yellow-200 hover:bg-yellow-500/20 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-800/50";
            break;
        case "green":
            colorClasses = "bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/50";
            break;
        case "purple":
            colorClasses = "bg-purple-500/10 text-purple-600 border-purple-200 hover:bg-purple-500/20 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800/50";
            break;
        case "gray":
            colorClasses = "bg-slate-500/10 text-slate-600 border-slate-200 hover:bg-slate-500/20 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800/50";
            break;
        case "blue":
        default:
            colorClasses = "bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/50";
            break;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span 
                        className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider select-none hover:animate-none cursor-help transition-all duration-150 shrink-0 ${colorClasses} ${className}`}
                    >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Novedad</span>
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover border text-popover-foreground max-w-[250px] p-2.5 rounded-xl shadow-xl z-[9999]">
                    <div className="space-y-1">
                        <p className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Novedad del Estudiante</p>
                        <p className="text-xs font-semibold leading-relaxed">{novedad}</p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
