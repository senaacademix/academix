"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { JSX, SVGProps, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getRedirectForSession, signInEmail } from "@/features/auth/services/authService";
import Image from "next/image";




export default function SignIn() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    const target = getRedirectForSession(session);
    if (target) router.replace(target);
  }, [session, router]);

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  const handleEmailSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signInEmail({ email, password });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(message);
    } finally {
      setLoading(false);
    }
  };





  

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <Image src="/logo.svg?v=2" alt="Logo" width={64} height={64} className="mx-auto h-16 w-16" />
          <h1 className="text-3xl font-semibold">Bienvenido de nuevo</h1>
          <p className="text-muted-foreground">
            Inicia sesión para acceder a tu panel, ajustes y proyectos.
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleEmailSignIn(); }} className="space-y-5">
          <div className="space-y-6">
            <div>
              <Label htmlFor="email">Correo</Label>
              <div className="relative mt-2.5">
                <Input
                  id="email"
                  className="peer ps-9"
                  placeholder="tu@correo.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                  <Mail size={16} aria-hidden="true" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
              </div>
              <div className="relative mt-2.5">
                <Input
                  id="password"
                  className="ps-9 pe-9"
                  placeholder="Ingresa tu contraseña"
                  type={isVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                  <Lock size={16} aria-hidden="true" />
                </div>
                <button
                  className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={toggleVisibility}
                  aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={isVisible}
                  aria-controls="password"
                >
                  {isVisible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>           

            {error && (
              <div className="text-sm text--600 dark:text--400">{error}</div>
            )}
          </div>

          <Button className="w-full" type="submit" disabled={loading}>
            Iniciar sesión
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
    </div>
  </div>
  );
}
