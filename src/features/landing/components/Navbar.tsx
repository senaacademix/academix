"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Menu, X, Sparkles, BookOpen, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 transition-all duration-300">
      <div
        className={`mx-auto max-w-6xl rounded-2xl transition-all duration-300 border ${
          scrolled
            ? "bg-slate-950/80 backdrop-blur-xl border-slate-800/80 shadow-2xl shadow-primary/5 py-3 px-5"
            : "bg-slate-900/40 backdrop-blur-md border-slate-800/40 py-4 px-6"
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 group-hover:border-primary/60 transition-all duration-300 shadow-lg shadow-primary/10">
              <Image
                src="/logo.png"
                alt="AcademiX Logo"
                width={28}
                height={28}
                className="object-contain transform group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Academi<span className="text-primary">X</span>
              </span>
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider -mt-1">
                Gestión Académica
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800/60 text-sm">
            <a
              href="#caracteristicas"
              className="px-4 py-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all font-medium"
            >
              Características
            </a>
            <a
              href="#modulos"
              className="px-4 py-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all font-medium"
            >
              Módulos
            </a>
            <a
              href="#beneficios"
              className="px-4 py-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all font-medium"
            >
              Beneficios
            </a>
          </nav>

          {/* CTA & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <Button
              asChild
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-xl font-semibold px-5 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <Link href="/signin" className="flex items-center gap-2">
                <span>Ingresar</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/50 border border-slate-700/50"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="md:hidden mx-auto max-w-6xl mt-2 rounded-2xl bg-slate-950/95 border border-slate-800/80 backdrop-blur-xl p-5 shadow-2xl space-y-3"
          >
            <a
              href="#caracteristicas"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-slate-200 hover:bg-slate-800/60 font-medium"
            >
              Características
            </a>
            <a
              href="#modulos"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-slate-200 hover:bg-slate-800/60 font-medium"
            >
              Módulos
            </a>
            <a
              href="#beneficios"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-slate-200 hover:bg-slate-800/60 font-medium"
            >
              Beneficios
            </a>
            <div className="pt-2 border-t border-slate-800/80">
              <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl">
                <Link href="/signin">Ingresar al Panel</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
