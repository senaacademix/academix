"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, ShieldAlert, BadgeCheck, XSquare, Calendar, LinkIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatName } from "@/lib/utils";
import { getStudentRecords, justifyAttendanceAction } from "../actions/studentActions";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function StudentRecords() {
    const [records, setRecords] = useState<{ attendances: any[], remarks: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Justification State
    const [isPending, startTransition] = useTransition();
    const [justifyingId, setJustifyingId] = useState<string | null>(null);
    const [justificationText, setJustificationText] = useState("");
    const [justificationUrl, setJustificationUrl] = useState("");

    useEffect(() => {
        loadRecords();
    }, []);

    const loadRecords = () => {
        getStudentRecords()
            .then(data => setRecords(data))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }

    const handleJustifySubmit = () => {
        if (!justifyingId) return;
        if (!justificationText.trim()) {
            toast.error("El motivo de la justificación es requerido");
            return;
        }

        startTransition(async () => {
            try {
                await justifyAttendanceAction(justifyingId, justificationText, justificationUrl);
                toast.success("Justificación enviada correctamente");
                setJustifyingId(null);
                setJustificationText("");
                setJustificationUrl("");
                loadRecords(); // Reload data
            } catch (error: any) {
                toast.error(error.message || "Error al enviar la justificación");
            }
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    const { attendances = [], remarks = [] } = records || {};

    // Filter problematic attendances (late, absent without justification)
    const issueAttendances = attendances.filter(a => (a.status === 'ABSENT' || a.status === 'LATE') && !a.justification);

    return (
        <div className="space-y-8">
            {/* Header info cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="uppercase font-bold tracking-wider text-xs flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            Alertas de Asistencia
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex items-end gap-3">
                        <div className="text-3xl font-black text-foreground">{issueAttendances.length}</div>
                        <div className="text-sm text-muted-foreground font-medium pb-1">Fallas / Retardos Sin Justificar</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="uppercase font-bold tracking-wider text-xs flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-500" />
                            Observaciones Disciplinarias
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex items-end gap-3">
                        <div className="text-3xl font-black text-foreground">{remarks.filter(r => r.type === 'ATTENTION').length}</div>
                        <div className="text-sm text-muted-foreground font-medium pb-1">Llamados de Atención</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="attendance" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="attendance">Asistencia</TabsTrigger>
                    <TabsTrigger value="remarks">Observaciones</TabsTrigger>
                </TabsList>

                {/* ATTENDANCE TAB */}
                <TabsContent value="attendance" className="m-0 border-none p-0 outline-none">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
                        {attendances.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-muted/5 text-muted-foreground">
                                <Calendar className="w-12 h-12 mb-4 opacity-50 text-green-500" />
                                <p className="font-semibold text-base text-green-600">¡Asistencia Perfecta!</p>
                                <p className="text-sm text-center mt-1">No tienes registros de inasistencias ni llegadas tarde.</p>
                            </div>
                        ) : (
                            <Card className="overflow-hidden">
                                <div className="grid grid-cols-1 divide-y">
                                    {attendances.map(att => {
                                        const isJustified = !!att.justification;
                                        const canJustify = !isJustified && (att.status === 'ABSENT' || att.status === 'LATE');

                                        return (
                                            <div key={att.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-muted/10 transition-colors gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                                        att.status === 'LATE' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                                        'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                    }`}>
                                                        {att.status === 'LATE' ? <Clock className="w-5 h-5" /> :
                                                         <XSquare className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-foreground">{att.course.title}</div>
                                                        <div className="text-sm text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                                                            <span>{format(new Date(att.date), "EEEE, d 'de' MMMM", { locale: es })}</span>
                                                            {att.arrivalTime && <span>• Llegada: {format(new Date(att.arrivalTime), "HH:mm")}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-col sm:items-end gap-2">
                                                    <div className="flex items-center gap-2">
                                                        {isJustified && (
                                                            <Badge variant="outline" className="text--600 dark:text--400 border--200 dark:border--800/50 bg--50 dark:bg--950/20 font-bold">
                                                                Justificado
                                                            </Badge>
                                                        )}
                                                        <Badge variant="outline" className={`font-bold ${
                                                            att.status === 'LATE' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                                                            'text-red-600 border-red-200 bg-red-50'
                                                        }`}>
                                                            {att.status === 'LATE' ? 'Llegada Tarde' :
                                                            'Ausencia'}
                                                        </Badge>
                                                    </div>

                                                    {canJustify && (
                                                        <Dialog open={justifyingId === att.id} onOpenChange={(open) => {
                                                            if (open) {
                                                                setJustifyingId(att.id);
                                                                setJustificationText("");
                                                                setJustificationUrl("");
                                                            } else {
                                                                setJustifyingId(null);
                                                            }
                                                        }}>
                                                            <DialogTrigger asChild>
                                                                <Button size="sm" variant="outline" className="h-8 text-xs font-semibold">
                                                                    Justificar
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle>Justificar {att.status === 'LATE' ? 'Retardo' : 'Ausencia'}</DialogTitle>
                                                                    <DialogDescription>
                                                                        Explica el motivo y adjunta un enlace a tu soporte (ej. Google Drive). Una vez enviada, no podrás modificarla.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="space-y-4 py-4">
                                                                    <div className="space-y-2">
                                                                        <Label>Motivo de la justificación *</Label>
                                                                        <Textarea 
                                                                            placeholder="Explica brevemente el motivo de tu ausencia o retardo..."
                                                                            value={justificationText}
                                                                            onChange={(e) => setJustificationText(e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label>Enlace al soporte (Opcional)</Label>
                                                                        <Input 
                                                                            placeholder="https://drive.google.com/..."
                                                                            type="url"
                                                                            value={justificationUrl}
                                                                            onChange={(e) => setJustificationUrl(e.target.value)}
                                                                        />
                                                                        <p className="text-xs text-muted-foreground">Asegúrate de que el enlace sea público o accesible para el docente.</p>
                                                                    </div>
                                                                </div>
                                                                <DialogFooter>
                                                                    <Button variant="outline" onClick={() => setJustifyingId(null)} disabled={isPending}>
                                                                        Cancelar
                                                                    </Button>
                                                                    <Button onClick={handleJustifySubmit} disabled={isPending}>
                                                                        {isPending ? "Enviando..." : "Enviar Justificación"}
                                                                    </Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    )}

                                                    {isJustified && (
                                                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md max-w-sm mt-1">
                                                            <div className="font-semibold text-foreground mb-1">Motivo:</div>
                                                            <p className="mb-1">{att.justification}</p>
                                                            {att.justificationUrl && (
                                                                <a href={att.justificationUrl} target="_blank" rel="noopener noreferrer" className="text--600 dark:text--400 hover:underline flex items-center gap-1 mt-1">
                                                                    <LinkIcon className="w-3 h-3" /> Ver soporte
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}
                    </motion.div>
                </TabsContent>

                {/* REMARKS TAB */}
                <TabsContent value="remarks" className="m-0 border-none p-0 outline-none">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
                        {remarks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-muted/5 text-muted-foreground">
                                <BadgeCheck className="w-12 h-12 mb-4 opacity-50" />
                                <p className="font-semibold text-base">Sin observaciones</p>
                                <p className="text-sm text-center mt-1">No tienes felicitaciones ni llamados de atención registrados.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {remarks.map(remark => (
                                    <Card key={remark.id} className="relative overflow-hidden transition-all hover:shadow-md">
                                        <CardContent className="p-5">
                                            <div className="flex justify-between items-start mb-3">
                                            <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${
                                                remark.type === 'ATTENTION' ? 'text--600 dark:text--400 bg--50 dark:bg--950/20 border--200 dark:border--800/50' : 'text--600 dark:text--400 bg--50 dark:bg--950/20 border--200 dark:border--800/50'
                                            }`}>
                                                {remark.type === 'ATTENTION' ? 'Llamado de Atención' : 'Felicitación'}
                                            </Badge>
                                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(remark.date), "dd MMM, yyyy", { locale: es })}
                                            </span>
                                        </div>
                                        <h4 className="font-black text-lg text-foreground mb-2 leading-tight">{remark.title}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                            {remark.description}
                                        </p>
                                            <div className="text-xs font-medium text-muted-foreground flex items-center justify-between border-t border-border/50 pt-3">
                                                <span className="truncate max-w-[120px]">{remark.course.title}</span>
                                                <span className="opacity-60 truncate">Por: {formatName(remark.teacher.name, remark.teacher.profile)}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
