"use client";

import { useEffect, useState } from "react";
import { getStudentRemarksAction } from "@/features/student/actions/remarkActions";
import { markRemarkViewed } from "@/features/student/actions/studentActions";
import { Badge } from "@/components/ui/badge";
import { MessageSquareWarning, Award, Search, Info, CalendarDays, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatName } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface StudentRemarksProps {
    courseId: string;
    userId: string;
}

export function StudentRemarks({ courseId, userId }: StudentRemarksProps) {
    const [remarks, setRemarks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingRemark, setViewingRemark] = useState<any | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

    useEffect(() => {
        const fetchRemarks = async () => {
            try {
                const data = await getStudentRemarksAction(courseId, userId);
                setRemarks(data);
            } catch (error) {
                console.error("Failed to fetch remarks", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRemarks();
    }, [courseId, userId]);

    const handleViewRemark = (remark: any) => {
        setViewingRemark(remark);
        setIsViewDialogOpen(true);
        if (!remark.viewedAt) {
            markRemarkViewed(remark.id)
                .then(() => {
                    setRemarks(prev => prev.map(r => r.id === remark.id ? { ...r, viewedAt: new Date().toISOString() } : r));
                })
                .catch(console.error);
        }
    };

    if (loading) {
        return <div className="text-sm text-muted-foreground">Cargando observaciones...</div>;
    }

    if (remarks.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground text-sm">
                No tienes observaciones registradas en esta materia.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquareWarning className="h-4 w-4" />
                    Observaciones del Profesor
                </h3>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                    <span>{remarks.filter(r => r.type === "ATTENTION").length} atenciones</span>
                    <span>•</span>
                    <span>{remarks.filter(r => r.type === "COMMENDATION").length} felicitaciones</span>
                    <span>•</span>
                    <span>{remarks.filter(r => r.type === "CITATION").length} citaciones</span>
                    <span>•</span>
                    <span>{remarks.filter(r => r.type === "OTHER").length} otras</span>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Profesor</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {remarks.map((remark) => (
                            <TableRow key={remark.id} className={!remark.viewedAt ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}>
                                <TableCell className="text-sm">
                                    {format(new Date(remark.date), "PPP", { locale: es })}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {formatName(remark.teacher.name, remark.teacher.profile)}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className={
                                            remark.type === "ATTENTION"
                                                ? "text-red-600 bg-red-50 border-red-200 hover:bg-red-50 dark:bg-red-950/20 dark:border-red-900/30"
                                                : remark.type === "COMMENDATION"
                                                ? "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/30"
                                                : remark.type === "CITATION"
                                                ? "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/30"
                                                : "text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-50 dark:bg-gray-950/20 dark:border-gray-900/30"
                                        }
                                    >
                                        {remark.type === "ATTENTION" && (
                                            <><MessageSquareWarning className="h-3.5 w-3.5 mr-1" /> Atención</>
                                        )}
                                        {remark.type === "COMMENDATION" && (
                                            <><Award className="h-3.5 w-3.5 mr-1" /> Felicitación</>
                                        )}
                                        {remark.type === "CITATION" && (
                                            <><CalendarDays className="h-3.5 w-3.5 mr-1" /> Citación</>
                                        )}
                                        {remark.type === "OTHER" && (
                                            <><Info className="h-3.5 w-3.5 mr-1" /> Otra</>
                                        )}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{remark.title}</TableCell>
                                <TableCell className="text-center">
                                    {remark.viewedAt ? (
                                        <Badge variant="outline" className="text-xs gap-1 text-emerald-700 border-emerald-200 bg-emerald-50">
                                            <Eye className="w-3 h-3" /> Visto
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs gap-1 text-amber-700 border-amber-200 bg-amber-50">
                                            <EyeOff className="w-3 h-3" /> No leído
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewRemark(remark)}
                                    >
                                        Ver Descripción
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* View Remark Dialog — full screen */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="!fixed !inset-0 !max-w-none !max-h-none !w-screen !h-screen !rounded-none !translate-x-0 !translate-y-0 flex flex-col p-0 gap-0">
                    
                    {/* Header */}
                    <DialogHeader className="shrink-0 px-6 py-4 border-b bg-background flex flex-row items-center gap-3">
                        <MessageSquareWarning className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-xl font-black leading-tight">Detalle de Observación</DialogTitle>
                            <DialogDescription className="text-xs mt-0.5">
                                {viewingRemark && format(new Date(viewingRemark.date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                            </DialogDescription>
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setIsViewDialogOpen(false)}>
                            Cerrar
                        </Button>
                    </DialogHeader>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                        <div className="max-w-3xl space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Tipo:</span>
                                    {viewingRemark && (
                                        <Badge
                                            variant="outline"
                                            className={
                                                viewingRemark.type === "ATTENTION"
                                                    ? "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20"
                                                    : viewingRemark.type === "COMMENDATION"
                                                    ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20"
                                                    : viewingRemark.type === "CITATION"
                                                    ? "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20"
                                                    : "text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950/20"
                                            }
                                        >
                                            {viewingRemark.type === "ATTENTION" && "Llamado de Atención"}
                                            {viewingRemark.type === "COMMENDATION" && "Felicitación"}
                                            {viewingRemark.type === "CITATION" && "Citación"}
                                            {viewingRemark.type === "OTHER" && "Otra"}
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Profesor:</span>
                                    <span className="text-sm font-semibold">
                                        {viewingRemark && formatName(viewingRemark.teacher.name, viewingRemark.teacher.profile)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1 pt-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Título:</span>
                                <h3 className="text-lg font-black text-foreground">{viewingRemark?.title}</h3>
                            </div>

                            <div className="border-t pt-4 space-y-2">
                                <h4 className="font-bold text-base">Descripción / Detalle</h4>
                                <div className="prose prose-sm max-w-none border rounded-lg p-5 bg-muted/5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                    {viewingRemark?.description}
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
