"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { X, Users } from "lucide-react";

export function TeacherOverviewDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none sm:max-w-none w-screen h-[100dvh] p-0 m-0 !rounded-none border-none flex flex-col bg-background/95 backdrop-blur-3xl overflow-hidden shadow-none z-50">
                <div className="relative z-10 px-6 py-4 border-b bg-card/80 backdrop-blur-sm shadow-sm shrink-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/30 shrink-0">
                            <Users className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-black text-foreground leading-tight flex items-center gap-2">
                                <span>Vista Docentes</span>
                            </DialogTitle>
                            <DialogDescription className="text-[11px] text-muted-foreground mt-0">
                                Sección en construcción para la gestión general de docentes.
                            </DialogDescription>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full bg-muted/50 hover:bg-muted shrink-0 z-50 w-8 h-8">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                    <Users className="w-16 h-16 mb-4 opacity-20" />
                    <h2 className="text-2xl font-bold mb-2">Vista Docentes</h2>
                    <p className="text-center max-w-md">Esta sección está actualmente en construcción. Aquí podrás gestionar y visualizar toda la disponibilidad y carga horaria de los docentes en una vista general.</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
