"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 py-12 px-4 sm:px-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="AcademiX Logo"
            width={32}
            height={32}
            className="object-contain"
          />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white tracking-tight">
              Academi<span className="text-primary">X</span>
            </span>
            <span className="text-xs text-slate-400">
              © {new Date().getFullYear()} AcademiX. Plataforma de Gestión Académica.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-slate-400">
          <Link href="/signin" className="hover:text-white transition-colors">
            Iniciar Sesión
          </Link>
          <a href="#caracteristicas" className="hover:text-white transition-colors">
            Características
          </a>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Sistema Operativo
          </span>
        </div>
      </div>
    </footer>
  );
}
