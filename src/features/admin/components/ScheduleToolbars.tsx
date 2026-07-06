"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import { ZoomIn, ZoomOut, Users, Building, NotebookTabs, CalendarDays, BarChart3, Globe, Lock, RotateCcw, Save, CheckCircle2, Settings, Download, FileSpreadsheet, FileText } from "lucide-react";

interface ScheduleToolbarsProps {
    zoomLevel: number;
    setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
    setTeacherOverviewOpen: (open: boolean) => void;
    setEnvOverviewOpen: (open: boolean) => void;
    setPeriodOverviewOpen: (open: boolean) => void;

    setIsAnalyticsModalOpen: (open: boolean) => void;
    setIsSettingsModalOpen: (open: boolean) => void;
    schedulesPublished: boolean;
    setPublishConfirmOpen: (open: boolean) => void;
    isDirty: boolean;
    pendingChangesLength: number;
    isSaving: boolean;
    isSaveDisabled?: boolean;
    handleDiscard: () => void;
    handleSaveAll: () => void;
    handleExportExcel?: () => void;
    isExportingExcel?: boolean;
}

export function ScheduleToolbars({
    zoomLevel,
    setZoomLevel,
    setTeacherOverviewOpen,
    setEnvOverviewOpen,
    setPeriodOverviewOpen,

    setIsAnalyticsModalOpen,
    setIsSettingsModalOpen,
    schedulesPublished,
    setPublishConfirmOpen,
    isDirty,
    pendingChangesLength,
    isSaving,
    isSaveDisabled = false,
    handleDiscard,
    handleSaveAll,
    handleExportExcel,
    isExportingExcel = false
}: ScheduleToolbarsProps) {
    return (
        <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center bg-muted/40 rounded-lg p-0.5 border border-border/30 shrink-0">
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setZoomLevel(prev => Math.max(1, prev - 1))}
                            disabled={zoomLevel === 1}
                            className="h-7 w-7 rounded shrink-0 border-border/40 text-primary disabled:opacity-50"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="center">
                        <p className="text-xs">Acercar</p>
                    </TooltipContent>
                </Tooltip>
                <span className="text-[11px] font-bold text-primary w-5 text-center select-none">{zoomLevel}</span>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setZoomLevel(prev => Math.min(4, prev + 1))}
                            disabled={zoomLevel === 4}
                            className="h-7 w-7 rounded shrink-0 border-border/40 text-primary disabled:opacity-50"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="center">
                        <p className="text-xs">Alejar</p>
                    </TooltipContent>
                </Tooltip>
            </div>

            <div className="w-px h-4 bg-border/40 mx-1 shrink-0" />

            {/* View toggles */}
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setTeacherOverviewOpen(true)} className="h-7 w-7 rounded border-border/40 shrink-0">
                        <Users className="w-3.5 h-3.5 text-primary" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center"><p className="text-xs">Vista Docentes</p></TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setEnvOverviewOpen(true)} className="h-7 w-7 rounded border-border/40 shrink-0">
                        <Building className="w-3.5 h-3.5 text-primary" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center"><p className="text-xs">Vista Ambientes</p></TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setPeriodOverviewOpen(true)} className="h-7 w-7 rounded border-border/40 shrink-0">
                        <NotebookTabs className="w-3.5 h-3.5 text-primary" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center"><p className="text-xs">Actualizar Trimestres</p></TooltipContent>
            </Tooltip>



            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setIsAnalyticsModalOpen(true)} className="h-7 w-7 rounded border-border/40 shrink-0">
                        <BarChart3 className="w-3.5 h-3.5 text-primary" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center"><p className="text-xs">Analítica de Horarios</p></TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setIsSettingsModalOpen(true)} className="h-7 w-7 rounded border-border/40 shrink-0">
                        <Settings className="w-3.5 h-3.5 text-primary" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center"><p className="text-xs">Configuración</p></TooltipContent>
            </Tooltip>


            <Button
                variant="outline"
                size="sm"
                onClick={() => setPublishConfirmOpen(true)}
                className={`h-7 px-3 text-xs font-semibold rounded gap-1.5 transition-colors border-border/40 ${schedulesPublished ? 'bg-emerald-50/50 hover:bg--100 dark:bg--900/30 dark:bg-emerald-900/20 text--600 dark:text--400 dark:text-emerald-400 border--200 dark:border--800/50 dark:border-emerald-800' : 'bg-orange-50/50 hover:bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800'}`}
            >
                {schedulesPublished ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {schedulesPublished ? "Publicado" : "Borrador"}
            </Button>

            {/* Export Button */}
            {handleExportExcel && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportExcel}
                    disabled={isExportingExcel}
                    className="h-7 px-3 text-xs rounded gap-1.5 border-border/40 shrink-0"
                >
                    {isExportingExcel ? (
                        <span className="animate-spin w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full" />
                    ) : (
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    Exportar a Excel
                </Button>
            )}

            {/* Save/Discard Controls */}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
                {isDirty && (
                    <>
                        <span className="text-xs text--600 dark:text--400 dark:text-amber-400 font-bold animate-pulse whitespace-nowrap mr-2">
                            {pendingChangesLength} cambio(s)
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDiscard}
                            disabled={isSaving}
                            className="h-7 px-3 text-xs font-semibold rounded border-border/40 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive shrink-0 gap-1.5 transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Descartar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSaveAll}
                            disabled={isSaving || isSaveDisabled}
                            className={`h-7 px-4 text-xs font-black rounded gap-1.5 shadow-sm shrink-0 ${
                                isSaveDisabled 
                                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                        >
                            {isSaving ? <span className="animate-spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> : <Save className="w-3.5 h-3.5" />}
                            {isSaving ? "Guardando…" : `Guardar (${pendingChangesLength})`}
                        </Button>
                    </>
                )}
                {!isDirty && (
                    <span className="text-xs text--600 dark:text--400 dark:text-emerald-400 font-semibold flex items-center gap-1.5 whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Guardado
                    </span>
                )}
            </div>
        </div>
    );
}
