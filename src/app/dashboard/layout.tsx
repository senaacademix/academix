import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { CreditsModal } from "@/components/CreditsModal";
import { LicenseModal } from "@/components/license/LicenseModal";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { BackButton } from "@/components/navigation/BackButton";
import { HeaderPushToggle } from "@/components/HeaderPushToggle";
import { Footer } from "@/components/Footer";
import { ProfileCompletionCheck } from "@/components/profile/ProfileCompletionCheck";
import { getAvailableThemes } from "@/app/actions/themes";
import prisma from "@/lib/prisma";
import { ExceededLimitScreen } from "@/components/auth/ExceededLimitScreen";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HelpCircle, Bug, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/");
  }

  // Interceptar accesos del rol de estudiante
  const isStudent = session.user.role === "student";
  let hasExceededLimit = false;
  let dailyLimit = 2;

  if (isStudent) {
    const timeHeaders = await headers();
    const timezone = timeHeaders.get("x-vercel-ip-timezone") || "America/Bogota";
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date()); // YYYY-MM-DD
    
    // Obtener configuración del límite diario
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "settings" }
    });
    dailyLimit = settings?.studentDailyLimit ?? 2;

    // Verificar cantidad de accesos en el día de hoy
    const currentLog = await prisma.studentAccessLog.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: todayStr
        }
      }
    });

    const currentCount = currentLog?.count ?? 0;

    if (currentCount >= dailyLimit) {
      hasExceededLimit = true;
    } else {
      // Throttle accesses: Only increment count if the last access was more than 15 minutes ago
      const lastUpdated = currentLog ? new Date(currentLog.updatedAt).getTime() : 0;
      const shouldIncrement = Date.now() - lastUpdated > 15 * 60 * 1000;

      if (shouldIncrement) {
        // Incrementar o crear registro de acceso diario
        await prisma.studentAccessLog.upsert({
          where: {
            userId_date: {
              userId: session.user.id,
              date: todayStr
            }
          },
          update: {
            count: { increment: 1 }
          },
          create: {
            userId: session.user.id,
            date: todayStr,
            count: 1
          }
        });
      } else {
        // Actualizar el updatedAt sin incrementar para mantener la sesión de navegación activa
        await prisma.studentAccessLog.update({
          where: {
            userId_date: {
              userId: session.user.id,
              date: todayStr
            }
          },
          data: {
            updatedAt: new Date()
          }
        });
      }
    }
  }

  let studentNovedad: string | null = null;
  let studentNovedadColor: string | null = null;
  let bannerClasses = "";

  if (isStudent) {
    const studentProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { novedad: true, novedadColor: true }
    });
    studentNovedad = studentProfile?.novedad ?? null;
    studentNovedadColor = studentProfile?.novedadColor ?? null;

    if (studentNovedad) {
      const activeColor = studentNovedadColor || "blue";
      switch (activeColor) {
        case "red":
          bannerClasses = "bg-red-600 text-white border-red-700 dark:bg-red-800 dark:border-red-900";
          break;
        case "orange":
          bannerClasses = "bg-orange-500 text-white border-orange-600 dark:bg-orange-700 dark:border-orange-800";
          break;
        case "yellow":
          bannerClasses = "bg-yellow-400 text-amber-950 border-yellow-500";
          break;
        case "green":
          bannerClasses = "bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-800 dark:border-emerald-900";
          break;
        case "purple":
          bannerClasses = "bg-purple-600 text-white border-purple-700 dark:bg-purple-800 dark:border-purple-900";
          break;
        case "gray":
          bannerClasses = "bg-slate-600 text-white border-slate-700 dark:bg-slate-800 dark:border-slate-900";
          break;
        case "blue":
        default:
          bannerClasses = "bg-blue-600 text-white border-blue-700 dark:bg-blue-800 dark:border-blue-900";
          break;
      }
    }
  }

  if (hasExceededLimit) {
    return <ExceededLimitScreen limit={dailyLimit} />;
  }

  const themes = await getAvailableThemes();
  const showModeToggle = true;
  const showThemeSelector = true;
  const showLicenseModal = session.user.role !== "student";

  return (

    <SidebarProvider defaultOpen={false}>
      <ProfileCompletionCheck />
      <AppSidebar />
      <SidebarInset className={`min-w-0 ${studentNovedad ? "md:peer-data-[variant=inset]:mt-0 md:peer-data-[variant=inset]:rounded-t-none" : ""}`}>
        {studentNovedad && (
          <div className={`sticky top-0 z-50 w-full py-2 px-4 flex items-center justify-center gap-2 text-[11px] font-black border-b uppercase tracking-wider select-none animate-pulse shrink-0 ${bannerClasses}`}>
            <AlertTriangle className="h-4 h-4 shrink-0" />
            <span>Novedad: {studentNovedad}</span>
          </div>
        )}
        <header className={`sticky z-40 flex h-16 w-full items-center gap-2 bg-background text-foreground border-b group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 transition-all ${studentNovedad ? "top-[33px]" : "top-0"}`}>
          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <BackButton />
            </div>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <HeaderPushToggle />
              {showThemeSelector && <ThemeSelector themes={themes} />}
              {showModeToggle && <ModeToggle />}
              {showLicenseModal && <LicenseModal />}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100 transition-all">
                    <Link href="/dashboard/help">
                      <HelpCircle className="h-4 w-4" />
                      <span className="sr-only">Ayuda</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Centro de Ayuda</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100 transition-all">
                    <a href="mailto:senaacademix@gmail.com?subject=Reporte%20de%20Problema%20-%20AcademiX">
                      <Bug className="h-4 w-4" />
                      <span className="sr-only">Reportar un problema</span>
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reportar un problema</p>
                </TooltipContent>
              </Tooltip>
              <CreditsModal />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0 min-h-[calc(100vh-4rem)] relative overflow-hidden min-w-0">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none -z-10" />
          {children}
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>

  );
}
