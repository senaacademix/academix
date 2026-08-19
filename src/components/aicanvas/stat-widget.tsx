"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";

interface StatWidgetProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: LucideIcon;
  description?: string;
  className?: string;
}

export function StatWidget({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  description,
  className,
}: StatWidgetProps) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 350, damping: 20 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 group",
        className
      )}
    >
      {/* Background Subtle Gradient */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-pretty">
          {title}
        </span>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 transition-transform duration-300 group-hover:scale-110">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          {value}
        </span>

        {change && (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border",
              isPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 badge-glow-emerald"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {change}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-2 text-xs text-muted-foreground text-pretty">
          {description}
        </p>
      )}
    </motion.div>
  );
}
