"use client";

import { useState } from "react";
import { useWebPush } from "@/hooks/useWebPush";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bell, BellOff, Send, Loader2, Info } from "lucide-react";

export function PushTestCard() {
  const {
    permission,
    isSubscribed,
    subscription,
    loading,
    error,
    subscribe,
    unsubscribe,
  } = useWebPush();

  const [title, setTitle] = useState("¡Prueba de Notificación Push!");
  const [body, setBody] = useState("Este es un mensaje de prueba enviado directamente desde el backend nativo.");
  const [url, setUrl] = useState("/dashboard");
  const [sending, setSending] = useState(false);

  const handleSubscribe = async () => {
    try {
      await subscribe();
      toast.success("Te has suscrito a las notificaciones correctamente");
    } catch (err: any) {
      toast.error(err.message || "Error al suscribirse");
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe();
      toast.success("Te has desuscrito de las notificaciones");
    } catch (err: any) {
      toast.error(err.message || "Error al desuscribirse");
    }
  };

  const sendTestNotification = async () => {
    if (!subscription) {
      toast.error("Debes estar suscrito para enviar una notificación de prueba");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription,
          title,
          body,
          url,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Notificación enviada correctamente al backend");
      } else {
        throw new Error(data.error || "Error al enviar la notificación");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al enviar la notificación de prueba");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border border-border/50 shadow-lg mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Bell className="h-5 w-5 text-indigo-500" /> Notificaciones Push Web
        </CardTitle>
        <CardDescription>
          Configura y prueba las notificaciones push nativas de tu dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground font-sans">Estado del Navegador:</span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-sans font-bold uppercase ${
                  permission === "granted"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                    : permission === "denied"
                    ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                    : permission === "unsupported"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                }`}
              >
                {permission === "granted"
                  ? "Permitido"
                  : permission === "denied"
                  ? "Bloqueado"
                  : permission === "unsupported"
                  ? "No Soportado"
                  : "Por Solicitar"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-sans">
              {permission === "unsupported"
                ? "Este navegador no soporta la API Web Push o requiere HTTPS."
                : permission === "denied"
                ? "Has bloqueado los permisos. Debes restablecerlos en la configuración del navegador."
                : "Recibe avisos y alertas institucionales en tiempo real en segundo plano."}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            {loading ? (
              <Button disabled size="sm" className="h-8 font-sans text-xs">
                <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Cargando
              </Button>
            ) : isSubscribed ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleUnsubscribe}
                className="h-8 font-sans font-bold text-xs"
              >
                <BellOff className="mr-2 h-3.5 w-3.5" /> Desactivar
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubscribe}
                disabled={permission === "unsupported"}
                className="h-8 font-sans font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Bell className="mr-2 h-3.5 w-3.5" /> Activar Notificaciones
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200/50 dark:border-red-900/50">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Test form */}
        {isSubscribed && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h4 className="text-sm font-bold text-foreground font-sans">Enviar Notificación de Prueba</h4>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label htmlFor="push-title" className="text-xs font-sans">Título</Label>
                <Input
                  id="push-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título de la notificación"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="push-body" className="text-xs font-sans">Mensaje</Label>
                <Input
                  id="push-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Cuerpo de la notificación"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="push-url" className="text-xs font-sans">URL de Redirección</Label>
                <Input
                  id="push-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="/dashboard"
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  onClick={sendTestNotification}
                  disabled={sending}
                  size="sm"
                  className="h-8 font-sans font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-3.5 w-3.5" /> Probar Envío Directo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
