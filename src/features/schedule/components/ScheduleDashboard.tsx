"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleView } from "./ScheduleView";
import { TeacherAvailabilityView } from "./TeacherAvailabilityView";
import { TeacherQualificationsView } from "@/features/teacher/components/TeacherQualificationsView";
import { Calendar, Clock, BookOpen } from "lucide-react";

export function ScheduleDashboard() {
    const [activeTab, setActiveTab] = useState("calendar");

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
            <TabsList className="flex w-full max-w-[400px] bg-muted/40 p-1 rounded-xl">
                <TabsTrigger value="calendar" className="rounded-lg flex-1 flex items-center gap-1.5 text-xs font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    Mi Horario
                </TabsTrigger>
                <TabsTrigger value="availability" className="rounded-lg flex-1 flex items-center gap-1.5 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    Mi Disponibilidad
                </TabsTrigger>
                <TabsTrigger value="qualifications" className="rounded-lg flex-1 flex items-center gap-1.5 text-xs font-semibold">
                    <BookOpen className="w-3.5 h-3.5" />
                    Mis Materias
                </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="space-y-6 mt-0">
                <ScheduleView />
            </TabsContent>

            <TabsContent value="availability" className="space-y-6 mt-0">
                <TeacherAvailabilityView />
            </TabsContent>

            <TabsContent value="qualifications" className="space-y-6 mt-0">
                <TeacherQualificationsView />
            </TabsContent>
        </Tabs>
    );
}
