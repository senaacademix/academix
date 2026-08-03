"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  CalendarDays,
  FileSpreadsheet,
  UserCog,
  BookOpenCheck,
  ShieldCheck,
  Zap,
  TrendingUp
} from "lucide-react";

const features = [
  {
    icon: CheckCircle2,
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    title: "Control de Asistencia",
    description: "Registro rápido por grupo y jornada con estadísticas detalladas de ausencias y puntualidad."
  },
  {
    icon: CalendarDays,
    color: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    title: "Gestión de Horarios",
    description: "Organización eficiente de franjas horarias por materia, aula y docente asignado."
  },
  {
    icon: BookOpenCheck,
    color: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    title: "Sistema de Calificaciones",
    description: "Evaluación continua con cálculo automático de promedios por periodo académico."
  },
  {
    icon: FileSpreadsheet,
    color: "from-purple-500/20 to-purple-500/5",
    iconColor: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    title: "Reportes en Excel y PDF",
    description: "Exportación centralizada de boletines, sábanas de notas e historial de asistencia."
  },
  {
    icon: UserCog,
    color: "from-rose-500/20 to-rose-500/5",
    iconColor: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    title: "Administración de Roles",
    description: "Permisos dinámicos y paneles adaptados para administradores, profesores y estudiantes."
  },
  {
    icon: ShieldCheck,
    color: "from-cyan-500/20 to-cyan-500/5",
    iconColor: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    title: "Seguridad y Control",
    description: "Autenticación robusta y trazabilidad completa de acciones y cambios en el sistema."
  }
];

export function FeaturesGrid() {
  return (
    <section id="caracteristicas" className="py-24 px-4 sm:px-6 bg-slate-950 relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span>Módulos Integrados</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Todo lo que necesitas para tu <span className="text-primary">gestión académica</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Diseñado para simplificar procesos complejos, ahorrar tiempo administrativo y brindar claridad a docentes y alumnos.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -6 }}
                className="group relative rounded-3xl bg-slate-900/60 border border-slate-800/80 p-7 hover:border-slate-700/80 transition-all duration-300 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:shadow-primary/5"
              >
                {/* Gradient background overlay on hover */}
                <div
                  className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />

                <div className="relative z-10 space-y-4">
                  <div
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${item.iconColor} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-slate-400 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
