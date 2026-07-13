"use client";

import { useWebPush } from "@/hooks/useWebPush";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export function HeaderPushToggle() {
  const [mounted, setMounted] = useState(false);
  const {
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  } = useWebPush();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || permission === "unsupported") return null;

  const handleToggle = async () => {
    if (permission === "denied") {
      toast.error("Permiso bloqueado: Por favor, activa las notificaciones en la barra de direcciones de tu navegador (icono del candado/configuración).", {
        duration: 6000
      });
      return;
    }

    try {
      if (isSubscribed) {
        await unsubscribe();
        toast.success("Notificaciones desactivadas.");
      } else {
        await subscribe();
        toast.success("Notificaciones activadas con éxito.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al configurar las notificaciones");
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            disabled={loading}
            className="h-8 w-8 shrink-0 relative transition-all"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : isSubscribed ? (
              <>
                <Bell className="h-4 w-4 text-emerald-500 fill-current" />
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </>
            ) : (
              <BellOff className="h-4 w-4 opacity-60 hover:opacity-100" />
            )}
            <span className="sr-only">Notificaciones</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isSubscribed
              ? "Notificaciones push activadas"
              : "Activar notificaciones push"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
