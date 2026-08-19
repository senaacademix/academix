"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    badge?: number;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarGroup className="py-3 px-2">
      <SidebarGroupLabel className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
        Navegación
      </SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        {items.map((item) => {
          const isDashboard = item.url === "/dashboard";
          const active =
            item.isActive ||
            (isDashboard
              ? pathname === item.url
              : pathname === item.url ||
                (pathname.startsWith(item.url + "/") &&
                  !items.some(
                    (other) =>
                      other.url.length > item.url.length &&
                      pathname.startsWith(other.url)
                  )));

          if (!item.items || item.items.length === 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={active}
                  className={cn(
                    "relative h-11 px-3.5 rounded-2xl transition-all duration-300 font-semibold text-xs sm:text-sm flex items-center gap-3 overflow-hidden",
                    active
                      ? "bg-sidebar-primary/15 text-sidebar-primary shadow-sm shadow-sidebar-primary/10 border border-sidebar-primary/30 font-bold"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Link href={item.url} onClick={handleLinkClick}>
                    {/* Active Left Glow Bar */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full bg-sidebar-primary shadow-lg shadow-sidebar-primary" />
                    )}

                    {item.icon && (
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-transform duration-300",
                          active
                            ? "text-sidebar-primary scale-110"
                            : "text-sidebar-foreground/60 group-hover/menu-item:text-sidebar-accent-foreground"
                        )}
                      />
                    )}
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={active}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={active}
                    className={cn(
                      "h-11 px-3.5 rounded-2xl transition-all duration-300 font-semibold text-xs sm:text-sm flex items-center gap-3",
                      active
                        ? "bg-sidebar-primary/15 text-sidebar-primary font-bold border border-sidebar-primary/30"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {item.icon && (
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          active ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover/menu-item:text-sidebar-accent-foreground"
                        )}
                      />
                    )}
                    <span className="truncate">{item.title}</span>
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-sidebar-foreground/60" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 pt-1 space-y-1">
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === subItem.url}
                          className="rounded-xl h-9 px-3 text-xs"
                        >
                          <Link href={subItem.url} onClick={handleLinkClick}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
