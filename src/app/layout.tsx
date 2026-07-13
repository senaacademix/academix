import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ScrollRestorer } from "@/components/ScrollRestorer";
import { ThemeInitializer } from "@/components/theme/ThemeInitializer";
import NextTopLoader from "nextjs-toploader";
import { NetworkStatus } from "@/components/NetworkStatus";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWARegister } from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "AcademiX",
  description: "Plataforma educativa inteligente",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
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
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <ThemeInitializer />
            <ScrollRestorer />
          </Suspense>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
          <NetworkStatus />
          <PWARegister />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

