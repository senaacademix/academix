"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { X, Users } from "lucide-react";

export function TeacherOverviewDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none sm:max-w-none w-screen h-[100dvh] p-0 m-0 !rounded-none border-none flex flex-col bg-background/95 backdrop-blur-3xl overflow-hidden shadow-none z-50">
                <div className="relative z-10 px-6 py-4 border-b bg-background/40 backdrop-blur-md shadow-sm shrink-0 flex items-center justify-between gap-4">
                    <DialogHeader className="text-left space-y-0">
                        <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight m-0">
                            <div className="p-1.5 bg-gradient-to-br from-primary/20 to-primary/40 rounded-xl shadow-inner border border-primary/10">
                                <Users className="w-5 h-5 text-blue-500" />
                            </div>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary animate-gradient-x">
                                Vista Docentes
                            </span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            En construcción...
                        </DialogDescription>
                    </DialogHeader>
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
