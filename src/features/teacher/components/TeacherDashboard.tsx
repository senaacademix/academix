"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { authClient } from "@/lib/auth-client";
import { getFormattedTodayDate } from "@/lib/dateUtils";

const GroupManager = dynamic(
  () => import("./GroupManager").then((m) => ({ default: m.GroupManager })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <LoadingSpinner className="w-10 h-10 text-primary" />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
          Cargando panel del profesor...
        </span>
      </div>
    ),
  }
);

interface TeacherDashboardProps {
  courses: any[];
  groups: any[];
  currentDate?: string;
  teacherName: string;
  formattedDate?: string;
  scheduleStartDate?: string | null;
  scheduleEndDate?: string | null;
}

export function TeacherDashboard({
  courses,
  groups,
  currentDate,
  teacherName,
  formattedDate,
  scheduleStartDate,
  scheduleEndDate
}: TeacherDashboardProps) {
  const { data: session } = authClient.useSession();
  const [mounted, setMounted] = useState(false);
  const [clientDate, setClientDate] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setClientDate(getFormattedTodayDate());
  }, []);

  const displayDate = mounted && clientDate ? clientDate : (formattedDate || "");

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 overflow-x-hidden w-full max-w-full min-w-0">
      <GroupManager
        groups={groups}
        scheduleStartDate={scheduleStartDate}
        scheduleEndDate={scheduleEndDate}
        teacherName={teacherName}
        displayDate={displayDate}
      />
    </div>
  );
}
