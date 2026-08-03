"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleView } from "./ScheduleView";
import { TeacherAvailabilityView } from "./TeacherAvailabilityView";
import { TeacherQualificationsView } from "@/features/teacher/components/TeacherQualificationsView";
import { Calendar, Clock, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export function ScheduleDashboard() {
  const [activeTab, setActiveTab] = useState("calendar");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
      <TabsList className="flex w-full sm:w-auto inline-flex bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/80 p-1.5 rounded-2xl overflow-x-auto scrollbar-none gap-2 shrink-0 backdrop-blur-xl shadow-sm">
        <TabsTrigger
          value="calendar"
          className="rounded-xl flex-1 sm:flex-none shrink-0 flex items-center justify-center gap-2 text-xs font-semibold px-5 py-2.5 text-slate-700 dark:text-slate-300 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 shadow-none data-[state=active]:shadow-md"
        >
          <Calendar className="w-4 h-4" />
          <span>Mi Horario</span>
        </TabsTrigger>

        <TabsTrigger
          value="availability"
          className="rounded-xl flex-1 sm:flex-none shrink-0 flex items-center justify-center gap-2 text-xs font-semibold px-5 py-2.5 text-slate-700 dark:text-slate-300 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 shadow-none data-[state=active]:shadow-md"
        >
          <Clock className="w-4 h-4" />
          <span>Mi Disponibilidad</span>
        </TabsTrigger>

        <TabsTrigger
          value="qualifications"
          className="rounded-xl flex-1 sm:flex-none shrink-0 flex items-center justify-center gap-2 text-xs font-semibold px-5 py-2.5 text-slate-700 dark:text-slate-300 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 shadow-none data-[state=active]:shadow-md"
        >
          <BookOpen className="w-4 h-4" />
          <span>Mis Materias</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="calendar" className="space-y-6 mt-0">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <ScheduleView />
        </motion.div>
      </TabsContent>

      <TabsContent value="availability" className="space-y-6 mt-0">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <TeacherAvailabilityView />
        </motion.div>
      </TabsContent>

      <TabsContent value="qualifications" className="space-y-6 mt-0">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <TeacherQualificationsView />
        </motion.div>
      </TabsContent>
    </Tabs>
  );
}
