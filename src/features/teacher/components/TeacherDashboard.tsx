"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const GroupManager = dynamic(
    () => import("./GroupManager").then((m) => ({ default: m.GroupManager })),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner className="w-8 h-8 text-primary" />
            </div>
        ),
    }
);
import { Button } from "@/components/ui/button";
import { formatName } from "@/lib/utils";
import { BookOpen, Calendar, Settings, Users } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

interface TeacherDashboardProps {
    courses: any[];
    groups: any[];
    currentDate?: string;
    teacherName: string;
    formattedDate?: string;
}

export function TeacherDashboard({ courses, groups, currentDate, teacherName, formattedDate }: TeacherDashboardProps) {
    const { data: session } = authClient.useSession();
    const [courseFilter, setCourseFilter] = useState("active");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const now = currentDate ? new Date(currentDate) : new Date();
    const activeCoursesCount = courses.filter(course => !course.group?.endDate || new Date(course.group.endDate) >= now).length;
    const archivedCoursesCount = courses.filter(course => course.group?.endDate && new Date(course.group.endDate) < now).length;

    return (
        <div className="flex-1 space-y-6 sm:space-y-8 px-2 py-4 sm:p-6 md:p-8 overflow-x-hidden w-full max-w-full min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        ¡Hola, {teacherName ? formatName(teacherName) : 'Profesor'}!
                    </h2>
                    <p className="text-sm text-muted-foreground capitalize">
                        {formattedDate || (mounted ? new Date(currentDate || "").toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '')} — Bienvenido, gestiona tus grupos y revisa el progreso de tus estudiantes.
                    </p>
                </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <GroupManager groups={groups} />
            </motion.div>
        </div>
    );
}
