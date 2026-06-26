"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createSharedContent, deleteSharedContent } from "../sharedContentActions";
import { toast } from "sonner";
import { Plus, Link2, Trash2, ExternalLink, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DocLink {
    id: string;
    title: string;
    url: string;
    createdAt: Date;
}

function toDocLinks(contents: any[]): DocLink[] {
    return contents.map((c) => ({
        id: c.id,
        title: c.title,
        url: (Array.isArray(c.links) && c.links[0]?.url) ? c.links[0].url : "",
        createdAt: new Date(c.createdAt),
    })).filter((l) => l.url); // only those with a valid URL
}

export function CourseDocLinks({
    courseId,
    initialContent = [],
}: {
    courseId: string;
    initialContent: any[];
}) {
    const [links, setLinks] = useState<DocLink[]>(toDocLinks(initialContent));

    // Create dialog state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Delete confirm state
    const [deleteTarget, setDeleteTarget] = useState<DocLink | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const openCreate = () => {
        setTitle("");
        setUrl("");
        setIsCreateOpen(true);
    };

    const handleCreate = async () => {
        const trimmedTitle = title.trim();
        const trimmedUrl = url.trim();
        if (!trimmedTitle) return toast.error("El título es obligatorio");
        if (!trimmedUrl) return toast.error("La URL es obligatoria");

        // Basic URL validation
        try { new URL(trimmedUrl); } catch {
            return toast.error("Ingresa una URL válida (debe comenzar con https://)");
        }

        setIsSaving(true);
        try {
            const content = await createSharedContent({
                title: trimmedTitle,
                links: [{ label: trimmedTitle, url: trimmedUrl }],
                files: [],
                courseId,
            });
            setLinks((prev) => [
                ...prev,
                {
                    id: content.id,
                    title: trimmedTitle,
                    url: trimmedUrl,
                    createdAt: new Date(content.createdAt),
                },
            ]);
            setIsCreateOpen(false);
            toast.success("Enlace publicado correctamente");
        } catch {
            toast.error("Error al publicar el enlace");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteSharedContent(deleteTarget.id, courseId);
            setLinks((prev) => prev.filter((l) => l.id !== deleteTarget.id));
            toast.success("Enlace eliminado");
        } catch {
            toast.error("Error al eliminar el enlace");
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Material de Documentación
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Los estudiantes ven estos enlaces en la pestaña <strong>Documentación</strong>
                    </p>
                </div>
                <Button onClick={openCreate} className="gap-2 rounded-xl h-10 px-5 font-bold">
                    <Plus className="w-4 h-4" />
                    Nuevo Enlace
                </Button>
            </div>

            {/* Links list */}
            {links.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-2xl space-y-3 bg-muted/5">
                    <div className="p-4 bg-muted rounded-full">
                        <Link2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-semibold text-muted-foreground">No hay enlaces publicados</p>
                    <p className="text-sm text-muted-foreground">
                        Agrega el primer enlace para compartir con tus estudiantes
                    </p>
                    <Button variant="outline" onClick={openCreate} className="mt-2 gap-2 rounded-xl">
                        <Plus className="w-4 h-4" /> Agregar Enlace
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {links.map((link) => (
                        <div
                            key={link.id}
                            className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/20 transition-colors group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                    <Link2 className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm leading-tight">{link.title}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                                        {link.url}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                        {format(link.createdAt, "dd MMM yyyy, HH:mm", { locale: es })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="h-9 w-9 p-0 text-primary hover:text-primary hover:bg-primary/10"
                                    title="Abrir enlace"
                                >
                                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setDeleteTarget(link)}
                                    title="Eliminar enlace"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Create Dialog ── */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!isSaving) setIsCreateOpen(open); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-primary" />
                            Agregar Enlace de Documentación
                        </DialogTitle>
                        <DialogDescription>
                            Comparte un recurso externo con tus estudiantes.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="doc-link-title" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                                Título
                            </Label>
                            <Input
                                id="doc-link-title"
                                placeholder="Ej. Guía de estudio, Video de clase..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-11 rounded-xl"
                                autoFocus
                                onKeyDown={(e) => e.key === "Enter" && document.getElementById("doc-link-url")?.focus()}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="doc-link-url" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                                URL del Enlace
                            </Label>
                            <Input
                                id="doc-link-url"
                                placeholder="https://..."
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="h-11 rounded-xl"
                                type="url"
                                onKeyDown={(e) => e.key === "Enter" && !isSaving && handleCreate()}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateOpen(false)}
                            disabled={isSaving}
                            className="rounded-xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={isSaving || !title.trim() || !url.trim()}
                            className="rounded-xl gap-2"
                        >
                            {isSaving ? (
                                <>Publicando...</>
                            ) : (
                                <><Plus className="w-4 h-4" /> Publicar Enlace</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirm ── */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !isDeleting) setDeleteTarget(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este enlace?</AlertDialogTitle>
                        <AlertDialogDescription>
                            El enlace <strong>"{deleteTarget?.title}"</strong> dejará de estar disponible para los estudiantes. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
