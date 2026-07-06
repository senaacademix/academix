"use client";

import { AlertOctagon, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { useState } from "react";

interface ExceededLimitScreenProps {
  limit: number;
}

export function ExceededLimitScreen({ limit }: ExceededLimitScreenProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/signin";
          }
        }
      });
    } catch (error) {
      console.error("Sign out error:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-4 relative overflow-hidden">
      {/* Subtle background grids and lights */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,white,transparent)] opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-destructive/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-destructive/20 rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive animate-pulse">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-destructive uppercase">Límite Diario Alcanzado</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Optimización de Recursos</p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Has superado el límite de <strong className="text-foreground">{limit}</strong> accesos diarios permitidos para el rol de estudiante.
          Esta medida está activa para optimizar las consultas a la base de datos y mejorar la velocidad de la plataforma.
        </p>

        <div className="p-4 bg-muted/40 rounded-2xl border border-border/50 text-xs text-muted-foreground font-medium">
          El contador se reiniciará automáticamente al inicio del siguiente día calendario (UTC).
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()} 
            className="flex-1 rounded-xl h-11 text-xs font-bold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSignOut} 
            disabled={isLoggingOut}
            className="flex-1 rounded-xl h-11 text-xs font-bold bg-destructive hover:bg-destructive/90"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
