"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, GraduationCap, Users, Calendar, Award } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center pt-32 pb-20 px-4 sm:px-6 overflow-hidden bg-slate-950">
      {/* Dynamic Background Glow & Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[200px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
        
        {/* Animated AI Canvas Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs sm:text-sm font-semibold mb-8 backdrop-blur-xl shadow-lg shadow-primary/10"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>Plataforma Inteligente de Gestión Académica</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.15]"
        >
          Transforma la gestión de tu <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-white via-slate-200 to-primary bg-clip-text text-transparent">
            institución educativa
          </span>
        </motion.h1>

        {/* Hero Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-400 text-base sm:text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed font-normal"
        >
          <strong className="text-slate-200 font-semibold">AcademiX</strong> unifica control de asistencia, horarios inteligentes, registros de calificaciones y generación de reportes detallados en una experiencia rápida e intuitiva.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-6 rounded-2xl shadow-xl shadow-primary/25 transition-all duration-300 hover:scale-105 active:scale-95 text-base"
          >
            <Link href="/signin" className="flex items-center justify-center gap-2">
              <span>Iniciar Sesión en el Panel</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>

          <a
            href="#caracteristicas"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 text-slate-300 hover:text-white font-semibold transition-all duration-300 text-center text-base backdrop-blur-md"
          >
            Explorar Funciones
          </a>
        </motion.div>

        {/* Stat Highlights Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-16 w-full max-w-4xl pt-8 border-t border-slate-800/60"
        >
          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/40 border border-slate-800/40 backdrop-blur-md">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary mb-2">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-white">Multi-Rol</span>
            <span className="text-xs text-slate-400">Admin, Docente, Estudiante</span>
          </div>

          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/40 border border-slate-800/40 backdrop-blur-md">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-white">Asistencia</span>
            <span className="text-xs text-slate-400">Trazabilidad en tiempo real</span>
          </div>

          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/40 border border-slate-800/40 backdrop-blur-md">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 mb-2">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-white">Horarios</span>
            <span className="text-xs text-slate-400">Planificación organizada</span>
          </div>

          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/40 border border-slate-800/40 backdrop-blur-md">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 mb-2">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-white">Notas</span>
            <span className="text-xs text-slate-400">Calificaciones y Promedios</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
