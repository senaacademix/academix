"use client";

import { MessageSquare, Users, Clock, BookOpen, GraduationCap, ArrowRight, ArrowLeft, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { SharedContentList } from './SharedContentList';
import { StudentRemarks } from "./StudentRemarks";
import { StudentGradesView } from './StudentGradesView';
import { formatName } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CreditsModal } from "@/components/CreditsModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshButton } from "@/components/navigation/RefreshButton";


export function MyEnrollments({
    enrollments,
    selectedCourse,
    onSelectCourse,
    activeTab = "grades",
    onTabChange,
    themes = []
}: {
    enrollments: any[],
    selectedCourse?: string,
    onSelectCourse: (courseId: string | null) => void,
    activeTab?: string,
    onTabChange?: (tab: string) => void,
    themes?: any[]
}) {
    const filteredEnrollments = selectedCourse
        ? enrollments.filter(e => e.course.id === selectedCourse)
        : enrollments;

    if (filteredEnrollments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-muted/5">
                <p className="text-muted-foreground font-medium">No estás inscrito en ninguna materia todavía.</p>
            </div>
        );
    }

    if (!selectedCourse) {
        return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-12 w-full max-w-7xl mx-auto">
                {enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="relative group flex flex-col">
                        <div className="absolute inset-0 bg-primary/5 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Card className="h-full flex flex-col relative bg-background/60 backdrop-blur-xl border-border/50 rounded-[1.8rem] overflow-hidden hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-xl text-center">
                            <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                            
                            <CardHeader className="pb-1 pt-5 px-5">
                                <div className="flex flex-col items-center gap-2">
                                    <Badge variant="outline" className="text-[8px] px-2 h-4 uppercase font-black tracking-widest bg-primary/5 text-primary border-primary/20 rounded-full">
                                        Matriculado
                                    </Badge>
                                    <CardTitle className="text-sm font-bold leading-tight group-hover:text-primary transition-colors w-full uppercase tracking-tight line-clamp-3 min-h-[3rem] flex items-center justify-center">
                                        {enrollment.course.title}
                                    </CardTitle>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 px-5 py-4 space-y-4 flex flex-col justify-center">
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <div className="flex flex-col items-center p-2 rounded-xl bg-muted/20 border border-border/10">
                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Inicio</span>
                                        <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-foreground/80">
                                            <Calendar className="h-2.5 w-2.5 text-primary" />
                                            {enrollment.course.group?.startDate ? format(new Date(enrollment.course.group.startDate), "dd/MM/yy", { locale: es }) : "---"}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center p-2 rounded-xl bg-muted/20 border border-border/10">
                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Estado</span>
                                        <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text--600 dark:text--400 dark:text-emerald-400">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Activo
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 justify-center">
                                    <Clock className="h-2.5 w-2.5" />
                                    Finaliza: {enrollment.course.group?.endDate ? format(new Date(enrollment.course.group.endDate), "dd MMM yyyy", { locale: es }) : "INDETERMINADO"}
                                </div>
                            </CardContent>

                            <CardFooter className="px-5 pb-5 pt-0">
                                <Button 
                                    className="w-full font-black text-[10px] uppercase tracking-widest shadow-md hover:shadow-primary/20 transition-all active:scale-[0.98] h-10 rounded-xl border border-primary/20"
                                    onClick={() => onSelectCourse(enrollment.course.id)}
                                >
                                    Ingresar al Aula <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            {filteredEnrollments.map((enrollment) => {
                return (
                    <div key={enrollment.id} className="flex flex-col h-screen overflow-hidden">
                        <Tabs key={activeTab} defaultValue={activeTab} onValueChange={onTabChange} className="w-full h-full flex flex-col">
                            {/* Unified Master Header: Matching Teacher Style */}
                            <div className="flex-none bg-background/95 backdrop-blur-md w-full z-30 border-b border-border/50 shadow-sm transition-all duration-300">
                                <style jsx global>{`
                                    .nav-indicator-active-student {
                                        position: relative;
                                    }
                                    
                                    .nav-indicator-active-student::after {
                                        content: '';
                                        position: absolute;
                                        bottom: -1px;
                                        left: 0;
                                        right: 0;
                                        height: 2px;
                                        background: hsl(var(--primary));
                                        border-radius: 2px 2px 0 0;
                                        box-shadow: 0 0 10px hsl(var(--primary) / 0.5);
                                    }
                                `}</style>

                                <TooltipProvider delayDuration={300}>
                                    {/* Row 1: Primary Controls & Identity (h-12) */}
                                    <div className="flex items-center px-4 h-12 border-b-2 border-foreground/10">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <SidebarTrigger className="h-8 w-8 hover:bg-muted/80 rounded-lg transition-colors" />
                                                <div className="h-6 w-[2px] bg-foreground/15" />
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => onSelectCourse(null)}
                                                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
                                                        >
                                                            <ArrowLeft className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom">Salir del aula</TooltipContent>
                                                </Tooltip>
                                            </div>
                                            
                                            <div className="h-6 w-[1px] bg-foreground/10 mx-1 hidden sm:block" />
                                                <div className="flex flex-col min-w-0">
                                                    <h2 className="text-[13px] font-black tracking-tight leading-none uppercase truncate opacity-90 transition-opacity">
                                                        {enrollment.course.title}
                                                    </h2>
                                                </div>
                                        </div>

                                        {/* Right utilities */}
                                        <div className="flex items-center gap-2 ml-auto">




                                            <div className="h-6 w-[2px] bg-foreground/15 mx-1 hidden sm:block" />
                                            
                                            <div className="flex items-center gap-1">
                                                 <RefreshButton />
                                                 <CreditsModal />
                                             </div>
                                        </div>
                                    </div>

                                    {/* Row 2: Content Navigation (h-10) */}
                                    <div className="px-4 h-10 flex items-center justify-center bg-muted/5 border-b border-foreground/10 shadow-[0_1px_10px_rgba(0,0,0,0.05)] dark:shadow-none">
                                        <TabsList className="flex w-full md:w-auto h-10 p-0 bg-transparent gap-0 overflow-x-auto scrollbar-none justify-center">
                                            



                                            <TabsTrigger value="grades" className="group relative flex items-center gap-2 h-10 px-3 text-[10px] uppercase tracking-wider font-bold bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none transition-all opacity-60 hover:opacity-100 data-[state=active]:opacity-100 data-[state=active]:nav-indicator-active-student shrink-0">
                                                <GraduationCap className="h-3.5 w-3.5 group-data-[state=active]:text-primary" />
                                                <span className="group-data-[state=active]:text-primary">Calificaciones</span>
                                            </TabsTrigger>

                                            <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />

                                            <TabsTrigger value="remarks" className="group relative flex items-center gap-2 h-10 px-3 text-[10px] uppercase tracking-wider font-bold bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none transition-all opacity-60 hover:opacity-100 data-[state=active]:opacity-100 data-[state=active]:nav-indicator-active-student shrink-0">
                                                <MessageSquare className="h-3.5 w-3.5 group-data-[state=active]:text-primary" />
                                                <span className="group-data-[state=active]:text-primary">Observaciones</span>
                                            </TabsTrigger>

                                            <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />

                                            <TabsTrigger value="resources" className="group relative flex items-center gap-2 h-10 px-3 text-[10px] uppercase tracking-wider font-bold bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none transition-all opacity-60 hover:opacity-100 data-[state=active]:opacity-100 data-[state=active]:nav-indicator-active-student shrink-0">
                                                <BookOpen className="h-3.5 w-3.5 group-data-[state=active]:text-primary" />
                                                <span className="group-data-[state=active]:text-primary">Documentación</span>
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>
                                </TooltipProvider>
                            </div>

                            {/* Independently Scrollable Content Area - Subdivided by Tabs */}
                            <div className="flex-1 min-h-0 w-full overflow-hidden">

                                <TabsContent value="resources" className="h-full overflow-y-auto p-4 sm:p-6 md:p-8 pt-0 mt-0 scrollbar-thin">
                                    <div className="pt-6">
                                        <SharedContentList contents={enrollment.course.sharedContent || []} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="remarks" className="h-full overflow-y-auto p-4 sm:p-6 md:p-8 pt-0 mt-0 scrollbar-thin">
                                    <div className="pt-6">
                                        <StudentRemarks courseId={enrollment.course.id} userId={enrollment.userId} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="grades" className="h-full overflow-y-auto p-4 sm:p-6 md:p-8 pt-0 mt-0 scrollbar-thin">
                                    <div className="pt-6">
                                        <StudentGradesView enrollment={enrollment} />
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                );
            })}
        </div>
    );
}
