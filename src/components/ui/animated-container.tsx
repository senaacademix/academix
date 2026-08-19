"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// 1. Page Entry Transition Component
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// 2. Cascading Stagger Container Group
export function StaggerGroup({
  children,
  className,
  staggerDelay = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// 3. Stagger Item Component
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.98 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 24,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// 4. Interactive Spring Button/Card Wrapper
export function MotionButton({
  children,
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      whileHover={{ scale: 1.025, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      onClick={onClick}
      className={cn("cursor-pointer select-none", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
