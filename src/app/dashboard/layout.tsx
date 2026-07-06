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
import { Footer } from "@/components/Footer";
import { ProfileCompletionCheck } from "@/components/profile/ProfileCompletionCheck";
import { getAvailableThemes } from "@/app/actions/themes";
import prisma from "@/lib/prisma";
import { ExceededLimitScreen } from "@/components/auth/ExceededLimitScreen";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
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
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 w-full items-center gap-2 bg-background text-foreground border-b group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 transition-all">
          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <BackButton />
            </div>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">

              {showThemeSelector && <ThemeSelector themes={themes} />}
              {showModeToggle && <ModeToggle />}
              {showLicenseModal && <LicenseModal />}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/dashboard/help">
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100 transition-all">
                      <HelpCircle className="h-4 w-4" />
                      <span className="sr-only">Ayuda</span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Centro de Ayuda</p>
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
