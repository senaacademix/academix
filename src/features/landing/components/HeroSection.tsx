"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LampContainer } from "@/components/ui/lamp";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <LampContainer>
        <motion.div
          initial={{ opacity: 0.5, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="flex flex-col items-center text-center"
        >

          
          <h1 className="text-white text-5xl font-bold tracking-tight md:text-8xl mb-6">
            AcademiX
            <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent mt-2 pb-2">
              Educación Inteligente
            </span>
          </h1>

          <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed mb-10">
            Plataforma integral para la gestión académica moderna, incluyendo control de asistencia, horarios, calificaciones y reportes detallados.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white border-none px-8" asChild>
              <Link href="/signin">Entrar al panel</Link>
            </Button>
          </div>


        </motion.div>
      </LampContainer>
    </section>
  );
}
