"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Users, 
    BookOpen, 
    Activity, 
    ShieldCheck, 
    UserCheck, 
    GraduationCap, 
    Settings,
    ArrowUpRight,
    TrendingUp,
    Clock,
    UserPlus,
    FileText,
    Sparkles
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatName } from "@/lib/utils";
import { motion } from "framer-motion";

interface AdminDashboardProps {
    stats: {
        users: {
            admin: number;
            teacher: number;
            student: number;
            total: number;
        };
        courses: {
            total: number;
            active: number;
            archived: number;
        };
        activity: {
            submissions: number;
        };
        health: {
            connected: boolean;
        };
    };
    recentActivity: any[];
    isObserver?: boolean;
}

export function AdminDashboard({ stats, recentActivity, isObserver = false }: AdminDashboardProps) {
    const kpis = [
        {
            title: "Usuarios Totales",
            value: stats.users.total,
            description: "Comunidad AcademiX",
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            link: "/dashboard/admin/users"
        },
        {
            title: "Materias Activas",
            value: stats.courses.active,
            description: `${stats.courses.total} materias en total`,
            icon: BookOpen,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            link: "/dashboard/admin/courses"
        },
        {
            title: "Documentación",
            value: (stats as any).documentation?.total || 0,
            description: "Proyectos generados",
            icon: FileText,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            link: "/dashboard/admin/docs"
        }
    ];

    const userDistribution = [
        { label: "Estudiantes", value: stats.users.student, icon: GraduationCap, color: "bg-blue-500" },
        { label: "Profesores", value: stats.users.teacher, icon: UserCheck, color: "bg-indigo-500" },
        { label: "Administradores", value: stats.users.admin, icon: ShieldCheck, color: "bg-purple-500" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header Hero Banner Estilo AI Canvas Adaptativo */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-3xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 backdrop-blur-2xl shadow-md dark:shadow-xl overflow-hidden transition-colors"
            >
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Panel de Administración Global</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Panel de{" "}
                            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-primary dark:from-white dark:via-slate-200 dark:to-primary bg-clip-text text-transparent">
                                Control
                            </span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed font-medium">
                            Métricas globales, monitoreo de actividad e infraestructura de AcademiX.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto">
                        <Button variant="outline" asChild className="rounded-2xl h-11 border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold">
                            <Link href="/dashboard/admin/settings">
                                <Settings className="h-4 w-4 mr-2" />
                                Configuración
                            </Link>
                        </Button>
                        {!isObserver && (
                            <Button asChild className="rounded-2xl h-11 bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-lg shadow-primary/25">
                                <Link href="/dashboard/admin/users">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Nuevo Usuario
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {kpis.map((kpi, idx) => (
                    <Link href={kpi.link} key={idx} className="block group">
                        <Card className="h-full border border-slate-200/90 dark:border-slate-800/80 shadow-sm dark:shadow-xl bg-white/90 dark:bg-slate-900/70 overflow-hidden hover:scale-[1.02] transition-all duration-300 relative rounded-3xl">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {kpi.title}
                                </CardTitle>
                                <div className={`p-2.5 rounded-2xl ${kpi.bg} ${kpi.color}`}>
                                    <kpi.icon className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-slate-900 dark:text-white">{kpi.value}</div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-medium">
                                    {kpi.description}
                                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary font-bold flex items-center gap-0.5">
                                        Gestionar <ArrowUpRight className="h-3 w-3" />
                                    </span>
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Activity & User Distribution Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Distribution */}
                <Card className="lg:col-span-1 border border-slate-200/90 dark:border-slate-800/80 shadow-sm dark:shadow-xl bg-white/90 dark:bg-slate-900/70 rounded-3xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Distribución de Usuarios
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400">Composición de la comunidad educativa</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            {userDistribution.map((dist, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                                        <div className="flex items-center gap-2">
                                            <dist.icon className={`h-4 w-4 ${dist.color.replace('bg-', 'text-')}`} />
                                            {dist.label}
                                        </div>
                                        <span>{dist.value} ({((dist.value / stats.users.total) * 100 || 0).toFixed(1)}%)</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${dist.color} transition-all duration-1000`} 
                                            style={{ width: `${(dist.value / stats.users.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between text-base font-bold text-slate-900 dark:text-white">
                                <span>Capacidad del Servidor</span>
                                <Badge className="bg-emerald-500 text-white shadow-none rounded-xl px-3 py-1">92% Libre</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="lg:col-span-2 border border-slate-200/90 dark:border-slate-800/80 shadow-sm dark:shadow-xl bg-white/90 dark:bg-slate-900/70 overflow-hidden rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <Clock className="h-5 w-5 text-primary" />
                                Actividad Global Reciente
                            </CardTitle>
                            <CardDescription className="text-slate-500 dark:text-slate-400">Últimas interacciones registradas en el sistema</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border-dashed border-2 border-slate-200 dark:border-slate-800">
                                    No se ha registrado actividad reciente.
                                </div>
                            ) : (
                                recentActivity.slice(0, 5).map((activity, idx) => (
                                    <div key={idx} className="group flex items-start gap-4 p-4 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 rounded-2xl transition-all duration-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl group-hover:scale-110 transition-transform">
                                            <Activity className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-base text-slate-900 dark:text-white">{formatName(activity.user.name, activity.user.profile)}</span>
                                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full capitalize">
                                                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: es })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                                Entregó la actividad <span className="font-bold text-primary">"{activity.details.activity}"</span> en la materia <span className="font-medium">"{activity.details.course}"</span>.
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
