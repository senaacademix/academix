"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotebookTabs, X } from "lucide-react";
import { useState, useEffect } from "react";

export function PeriodOverviewDialog({ 
    open, 
    onOpenChange, 
    programs, 
    pendingChanges,
    setPendingChanges,
    programId,
    onSave,
    isSaving
}: { 
    open: boolean, 
    onOpenChange: (open: boolean) => void, 
    programs: any[], 
    pendingChanges: any[],
    setPendingChanges: React.Dispatch<React.SetStateAction<any[]>>,
    programId: string,
    onSave: () => void,
    isSaving: boolean
}) {

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none sm:max-w-none w-screen h-[100dvh] p-0 m-0 !rounded-none border-none flex flex-col bg-background/95 backdrop-blur-3xl overflow-hidden shadow-none z-50">
                {/* Header Section */}
                <div className="relative z-10 px-6 py-4 border-b bg-background/40 backdrop-blur-md shadow-sm shrink-0 flex items-center justify-between gap-4">
                    <DialogHeader className="text-left space-y-0">
                        <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight m-0">
                            <div className="p-1.5 bg-gradient-to-br from-primary/20 to-primary/40 rounded-xl shadow-inner border border-primary/10">
                                <NotebookTabs className="w-5 h-5 text-blue-500" />
                            </div>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary animate-gradient-x">
                                Vista de Trimestres
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Actualiza el trimestre activo para cada grupo
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center gap-4 flex-wrap">
                        <Button 
                            onClick={onSave} 
                            disabled={isSaving || pendingChanges.length === 0}
                            className={`rounded-full shadow hover:shadow-md transition-all h-8 px-4 text-xs font-bold ${
                                pendingChanges.length > 0 
                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {isSaving ? "Guardando..." : pendingChanges.length > 0 ? "Guardar cambios" : "Guardado"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full bg-muted/50 hover:bg-muted shrink-0 z-50 w-8 h-8">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {programs.filter(p => p.id === programId).map(prog => (
                            <div key={prog.id} className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-border/50 bg-muted/20 flex items-center gap-2">
                                    <span className="font-bold text-sm text-foreground">{prog.name}</span>
                                    <Badge variant="secondary" className="text-[10px]">{prog.groups.length} grupos</Badge>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {prog.groups.map((g: any) => {
                                        const pendingPeriod = pendingChanges.find(ch => ch.type === "ASSIGN_PERIOD" && ch.groupId === g.id);
                                        const currentPeriodId = pendingPeriod ? pendingPeriod.periodId : g.periodId;

                                        return (
                                            <div key={g.id} className="flex flex-col gap-2 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-background transition-colors">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Tooltip><TooltipTrigger asChild><span className="font-bold text-xs truncate">{g.name}</span></TooltipTrigger><TooltipContent><p>{g.name}</p></TooltipContent></Tooltip>
                                                </div>
                                                <Select
                                                    value={currentPeriodId || "none"}
                                                    onValueChange={(val) => {
                                                        const pId = val === "none" ? null : val;
                                                        setPendingChanges((prev: any[]) => {
                                                            const filtered = prev.filter(ch => !(ch.type === "ASSIGN_PERIOD" && ch.groupId === g.id));
                                                            if (pId === g.periodId) return filtered;
                                                            return [...filtered, { type: "ASSIGN_PERIOD", groupId: g.id, periodId: pId }];
                                                        });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-7 text-xs rounded border-border/40 font-semibold w-full">
                                                        <SelectValue placeholder="Sin trimestre" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none" className="text-xs text-muted-foreground">Sin trimestre</SelectItem>
                                                        {prog.periods.map((p: any) => (
                                                            <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        );
                                    })}
                                    {prog.groups.length === 0 && (
                                        <div className="col-span-full py-4 text-center text-xs text-muted-foreground">
                                            No hay grupos en este programa.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {programs.filter(p => p.id === programId).length === 0 && (
                            <div className="py-12 text-center text-muted-foreground">
                                <NotebookTabs className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">No se encontraron programas</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
