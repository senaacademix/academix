"use client";

import { Link2, ExternalLink, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SharedContentProps {
    contents: any[];
}

export function SharedContentList({ contents }: SharedContentProps) {
    // Flatten all entries into individual links
    const links = contents.flatMap((c) => {
        const raw: any[] = Array.isArray(c.links) ? c.links : [];
        return raw
            .filter((l) => l?.url)
            .map((l) => ({
                id: c.id + l.url,
                title: l.label || c.title,
                url: l.url,
                createdAt: new Date(c.createdAt),
            }));
    });

    if (links.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 rounded-xl border-2 border-dashed">
                <div className="p-4 bg-muted rounded-full">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <p className="text-lg font-semibold">Sin recursos publicados</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Tu profesor aún no ha compartido enlaces en esta materia.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Recursos Compartidos
                </h3>
                <Badge variant="secondary" className="px-3 py-1">
                    {links.length} {links.length === 1 ? "enlace" : "enlaces"}
                </Badge>
            </div>

            <div className="space-y-2">
                {links.map((link) => (
                    <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between p-4 rounded-xl border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-sm transition-all"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-primary/10 rounded-lg shrink-0 group-hover:bg-primary/20 transition-colors">
                                <Link2 className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                                    {link.title}
                                </p>
                                <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                                    {link.url}
                                </p>
                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                    {format(link.createdAt, "dd MMM yyyy", { locale: es })}
                                </p>
                            </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 ml-4 transition-colors" />
                    </a>
                ))}
            </div>
        </div>
    );
}
