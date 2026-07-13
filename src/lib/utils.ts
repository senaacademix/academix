import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatName(name: string | undefined | null, profile?: { nombres?: string | null, apellido?: string | null } | null): string {
    const nombres = profile?.nombres?.trim();
    const apellido = profile?.apellido?.trim();
    const baseName = name?.trim();

    let rawName = "";
    if (nombres && apellido) {
        rawName = `${nombres} ${apellido}`;
    } else if (nombres) {
        rawName = nombres;
    } else if (apellido) {
        rawName = apellido;
    } else {
        rawName = baseName || "";
    }

    if (!rawName) return "Sin Nombre";

    return rawName
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function getInitials(name: string): string {
    if (!name) return "??";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "??";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}


