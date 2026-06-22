import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ScrollRestorer } from "@/components/ScrollRestorer";
import { ThemeInitializer } from "@/components/theme/ThemeInitializer";
import NextTopLoader from "nextjs-toploader";
import { getAvailableThemes } from "@/app/actions/themes";
import { getVisualSettingsAction } from "@/app/actions/settings";
import { NetworkStatus } from "@/components/NetworkStatus";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { TooltipProvider } from "@/components/ui/tooltip";


export const metadata: Metadata = {
  title: "AcademiX",
  description: "Plataforma educativa inteligente",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, themes, visualSettings] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getAvailableThemes(),
    getVisualSettingsAction()
  ]);

  const isAdmin = session?.user?.role === "admin";
  const isForced = !isAdmin || !visualSettings.allowThemeColorChange;
  const forcedTheme = visualSettings.themeColor && visualSettings.themeColor !== "zinc"
    ? themes.find(t => t.id === visualSettings.themeColor) 
    : null;

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        {!isAdmin ? (
          forcedTheme ? (
            <style 
              id="academix-dynamic-theme" 
              dangerouslySetInnerHTML={{ __html: forcedTheme.cssContent }} 
            />
          ) : null
        ) : (
          isForced && forcedTheme ? (
            <style 
              id="academix-dynamic-theme" 
              dangerouslySetInnerHTML={{ __html: forcedTheme.cssContent }} 
            />
          ) : (
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  (function() {
                    try {
                      var css = localStorage.getItem("academix-theme-css-v2");
                      if (css) {
                        var style = document.createElement("style");
                        style.id = "academix-dynamic-theme";
                        style.innerHTML = css;
                        document.head.appendChild(style);
                      }
                    } catch (e) {}
                  })();
                `,
              }}
            />
          )
        )}
      </head>
      <body className="min-h-screen bg-background font-sans antialiased overflow-x-hidden max-w-[100vw]">
        <NextTopLoader 
          color="#3b82f6" 
          initialPosition={0.08} 
          crawlSpeed={200} 
          height={3} 
          crawl={true} 
          showSpinner={false} 
          easing="ease" 
          speed={200} 
          shadow="0 0 10px #3b82f6,0 0 5px #3b82f6"
          zIndex={999999}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme={visualSettings.themeMode === "DARK" ? "dark" : visualSettings.themeMode === "LIGHT" ? "light" : "light"}
          enableSystem={visualSettings.themeMode === "STUDENT"}
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <ThemeInitializer isAdmin={isAdmin} />
            <ScrollRestorer />
          </Suspense>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
          <NetworkStatus />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

