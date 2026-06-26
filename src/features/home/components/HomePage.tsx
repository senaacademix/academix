"use client";

import { Bell, Calendar, Info, AlertTriangle, Wrench, Trophy, AlertCircle, Newspaper, PartyPopper, BookOpen, Settings2, CalendarClock, BarChart, Users, Activity, ScrollText, Home, GraduationCap, Building2, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { getSettingsAction } from "@/features/admin/actions/settingsActions";
import MDEditor from "@uiw/react-md-editor";
import { authClient } from "@/lib/auth-client";
import { getRoleFromUser } from "@/features/auth/services/authService";
import Link from "next/link";
import { formatName } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LampContainer } from "@/components/ui/lamp";
import { motion } from "framer-motion";

interface HomePageProps {
    initialUserName?: string;
    initialUserRole?: string;
    initialDate?: string;
}

export default function HomePage({ initialUserName, initialUserRole, initialDate }: HomePageProps) {
    const [settings, setSettings] = useState<{ institutionName?: string | null }>({});
    const [mounted, setMounted] = useState(false);
    const { data: session } = authClient.useSession();
    
    const role = initialUserRole || getRoleFromUser(session?.user);
    const userName = initialUserName || session?.user?.name;

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const [settingsData] = await Promise.all([
                getSettingsAction(),
            ]);
            setSettings(settingsData || {});
        };
        fetchData();
    }, []);

    const getNavigationItems = () => {
        const activeRole = role;
        if (!activeRole) {
            return [];
        }

        if (activeRole === "admin") {
            return [
                { title: "Gestión de Estudiantes", url: "/dashboard/admin/users", icon: Users, color: "text-blue-500" },
                { title: "Estructura Académica", url: "/dashboard/admin/courses", icon: BookOpen, color: "text-green-500" },
                { title: "Banco de Profesores", url: "/dashboard/admin/teachers", icon: GraduationCap, color: "text-yellow-500" },
                { title: "Programación de Horarios", url: "/dashboard/admin/schedule", icon: Calendar, color: "text-teal-500" },
                { title: "Configuración", url: "/dashboard/admin/settings", icon: Settings2, color: "text-gray-500" },
            ];
        } else if (activeRole === "teacher") {
            return [
                { title: "Mis Grupos", url: "/dashboard/teacher", icon: Users, color: "text-blue-500" },
                { title: "Horario y Config.", url: "/dashboard/teacher/schedule", icon: CalendarClock, color: "text-purple-500" },
            ];
        } else {
            // Student
            return [
                { title: "Registro Académico", url: "/dashboard/student/records", icon: ClipboardList, color: "text-blue-500" },
                { title: "Horario", url: "/dashboard/student/schedule", icon: CalendarClock, color: "text-purple-500" },
            ];
        }
    };

    const navItems = getNavigationItems();


    return (
        <div className="min-h-[calc(100vh-4rem)] h-auto -mx-2 sm:-mx-4 -mb-4 w-[calc(100%+1rem)] sm:w-[calc(100%+2rem)] rounded-none overflow-hidden pb-12">
            <div className="relative flex flex-col w-full">
                <section className="w-full relative overflow-hidden">
                    <LampContainer className="min-h-[400px]">
                        <motion.div
                            initial={{ opacity: 0.5, y: 100 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: 0.3,
                                duration: 0.8,
                                ease: "easeInOut",
                            }}
                            className="flex flex-col items-center justify-center text-center translate-y-24"
                        >
                            <h1 className="text-slate-950 dark:text-white text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight px-4 drop-shadow-2xl">
                                {settings.institutionName || ""}
                            </h1>

                            <div className="mt-6 space-y-2 text-slate-900/90 dark:text-white/90">
                                <h2 className="text-xl md:text-2xl font-medium drop-shadow-md">
                                    ¡Hola, {userName ? formatName(userName) : 'Usuario'}!
                                </h2>
                                <p className="text-sm md:text-base opacity-90 capitalize drop-shadow-md">
                                    {initialDate || (mounted ? new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '')}
                                </p>
                            </div>
                        </motion.div>
                    </LampContainer>
                </section>

                {/* Navigation Cards */}
                <div className="w-full py-12 px-6 bg-muted/30 border-y">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-2xl font-bold mb-8 text-center">Acceso Rápido</h2>
                        <div className="flex flex-wrap justify-center gap-6">
                            {navItems.map((item, index) => (
                                <Link key={index} href={item.url} className="w-full sm:w-[280px] md:w-[320px]">
                                    <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer h-full border-primary/10">
                                        <CardHeader className="flex flex-col items-center justify-center text-center space-y-4 p-6">
                                            <div className={`p-4 rounded-full bg-background shadow-sm ${item.color}`}>
                                                <item.icon className="w-10 h-10" />
                                            </div>
                                            <CardTitle className="text-xl font-bold uppercase tracking-tight">{item.title}</CardTitle>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
