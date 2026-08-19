"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface ProgressTrackerProps {
  title: string;
  subtitle?: string;
  progressPercentage: number;
  completedTasks: number;
  totalTasks: number;
  className?: string;
}

export function ProgressTrackerCard({
  title,
  subtitle,
  progressPercentage,
  completedTasks,
  totalTasks,
  className,
}: ProgressTrackerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-extrabold text-foreground tracking-tight">{title}</h4>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>

        <span className="text-xl font-black text-primary tracking-tight">
          {progressPercentage}%
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="mt-4 relative h-3 w-full overflow-hidden rounded-full bg-secondary/80 p-0.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary shadow-sm"
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>{completedTasks} de {totalTasks} completadas</span>
        </span>
        <span className="font-semibold text-foreground">
          {totalTasks - completedTasks} pendientes
        </span>
      </div>
    </div>
  );
}
