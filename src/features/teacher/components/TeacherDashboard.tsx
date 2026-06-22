"use client";

import { useState } from "react";
import { GroupManager } from "./GroupManager";
import { Button } from "@/components/ui/button";
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
}

export function TeacherDashboard({ courses, groups, currentDate }: TeacherDashboardProps) {
    const { data: session } = authClient.useSession();
    const [courseFilter, setCourseFilter] = useState("active");

    const now = currentDate ? new Date(currentDate) : new Date();
    const activeCoursesCount = courses.filter(course => !course.group?.endDate || new Date(course.group.endDate) >= now).length;
    const archivedCoursesCount = courses.filter(course => course.group?.endDate && new Date(course.group.endDate) < now).length;



    return (
        <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8 pt-6 overflow-x-hidden w-full max-w-full min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Panel de Control
                    </h2>
                    <p className="text-muted-foreground">
                        Bienvenido, gestiona tus grupos y revisa el progreso de tus estudiantes.
                    </p>
                </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <GroupManager groups={groups} />
            </motion.div>
        </div>
    );
}
