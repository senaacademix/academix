"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface NeonGradientCardProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
  glowColor?: string;
}

export function NeonGradientCard({
  children,
  className,
  glowColor = "var(--primary)",
  ...props
}: NeonGradientCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl p-[1px] transition-all duration-500 hover:scale-[1.01]",
        className
      )}
      {...props}
    >
      {/* Outer Neon Glow */}
      <div
        className="absolute -inset-0.5 rounded-2xl opacity-40 blur-lg transition duration-500 group-hover:opacity-80"
        style={{
          background: `linear-gradient(135deg, ${glowColor}, transparent 50%, ${glowColor})`,
        }}
      />

      {/* Animated Border Gradient */}
      <div
        className="absolute inset-0 rounded-2xl opacity-60 transition duration-500 group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, ${glowColor}, transparent 40%, ${glowColor})`,
        }}
      />

      {/* Card Content Container */}
      <div className="relative rounded-[15px] bg-card text-card-foreground p-6 h-full w-full">
        {children}
      </div>
    </div>
  );
}
