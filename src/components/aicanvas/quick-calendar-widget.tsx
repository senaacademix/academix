"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickCalendarWidgetProps {
  events?: {
    id: string;
    title: string;
    time: string;
    tag?: string;
  }[];
  className?: string;
}

export function QuickCalendarWidget({
  events = [
    { id: "1", title: "Clase de Matemáticas - 10A", time: "08:00 AM - 09:30 AM", tag: "Próxima" },
    { id: "2", title: "Evaluación de Física", time: "10:00 AM - 11:30 AM", tag: "Hoy" },
    { id: "3", title: "Reunión de Docentes", time: "02:00 PM - 03:30 PM", tag: "Tarde" },
  ],
  className,
}: QuickCalendarWidgetProps) {
  const today = new Date();
  const dayNumber = today.getDate();
  const monthName = today.toLocaleDateString("es-ES", { month: "short" }).toUpperCase();
  const dayName = today.toLocaleDateString("es-ES", { weekday: "long" });

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          {/* Flip Desk Date Pill */}
          <div className="flex flex-col items-center justify-center w-12 h-14 rounded-xl bg-primary text-primary-foreground font-black shadow-md shadow-primary/20">
            <span className="text-[10px] tracking-wider uppercase leading-none opacity-80 pt-1">{monthName}</span>
            <span className="text-xl leading-none font-extrabold pb-1">{dayNumber}</span>
          </div>

          <div>
            <h4 className="text-base font-extrabold text-foreground capitalize tracking-tight">{dayName}</h4>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3 text-primary" />
              <span>Agenda de hoy</span>
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 badge-glow">
          <Sparkles className="w-3 h-3" />
          <span>{events.length} Eventos</span>
        </div>
      </div>

      {/* Events List */}
      <div className="mt-4 space-y-2.5">
        {events.map((evt, idx) => (
          <motion.div
            key={evt.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group/item flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/40 transition-colors"
          >
            <div className="space-y-0.5 min-w-0 pr-2">
              <h5 className="text-xs font-bold text-foreground truncate group-hover/item:text-primary transition-colors">
                {evt.title}
              </h5>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                <span className="truncate">{evt.time}</span>
              </div>
            </div>

            {evt.tag && (
              <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-md bg-primary/15 text-primary border border-primary/20">
                {evt.tag}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
