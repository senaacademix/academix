"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DayOfWeek } from "@/generated/prisma/client";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

async function requireTeacher() {
    const session = await getSession();
    if (!session?.user || session.user.role !== "teacher") {
        throw new Error("Unauthorized: Teacher access required");
    }
    return session;
}

async function requireAdmin() {
    const session = await getSession();
    if (!session?.user || session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
    }
    return session;
}

// 1. Get teacher availability
export async function getTeacherAvailabilityAction() {
    const session = await requireTeacher();
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
            availabilityLocked: true,
            availabilityLastModifiedBy: {
                select: { name: true, role: true }
            },
            availabilityUpdatedAt: true
        }
    });

    const slots = await prisma.teacherAvailability.findMany({
        where: { teacherId: userId },
        orderBy: [
            { dayOfWeek: "asc" },
            { startTime: "asc" }
        ]
    });

    return {
        locked: user?.availabilityLocked ?? false,
        lastModifiedBy: user?.availabilityLastModifiedBy ? {
            name: user.availabilityLastModifiedBy.name,
            role: user.availabilityLastModifiedBy.role
        } : null,
        updatedAt: user?.availabilityUpdatedAt,
        slots: slots.map(s => ({
            id: s.id,
            dayOfWeek: s.dayOfWeek as DayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime
        }))
    };
}

// 2. Save teacher availability (draft)
export async function saveTeacherAvailabilityAction(slots: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[]) {
    const session = await requireTeacher();
    const userId = session.user.id;

    // Check lock status
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { availabilityLocked: true }
    });

    if (user?.availabilityLocked) {
        throw new Error("Tu disponibilidad está bloqueada y no puede ser modificada.");
    }

    // Save in transaction
    await prisma.$transaction(async (tx) => {
        // Delete all existing slots
        await tx.teacherAvailability.deleteMany({
            where: { teacherId: userId }
        });

        // Create new slots
        if (slots.length > 0) {
            await tx.teacherAvailability.createMany({
                data: slots.map(s => ({
                    teacherId: userId,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime
                }))
            });
        }

        // Update tracking info
        await tx.user.update({
            where: { id: userId },
            data: {
                availabilityLastModifiedById: userId,
                availabilityUpdatedAt: new Date()
            }
        });
    });

    revalidatePath("/dashboard/teacher/schedule");
    return { success: true };
}

// 3. Publish and lock teacher availability
export async function publishTeacherAvailabilityAction() {
    const session = await requireTeacher();
    const userId = session.user.id;

    // Check lock status
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { availabilityLocked: true }
    });

    if (user?.availabilityLocked) {
        throw new Error("La disponibilidad ya se encuentra publicada y bloqueada.");
    }

    await prisma.user.update({
        where: { id: userId },
        data: { 
            availabilityLocked: true,
            availabilityLastModifiedById: userId,
            availabilityUpdatedAt: new Date()
        }
    });

    revalidatePath("/dashboard/teacher/schedule");
    return { success: true };
}

// 4. Get availability for admin
export async function getTeacherAvailabilityForAdminAction(teacherId: string) {
    await requireAdmin();

    const user = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { 
            name: true,
            email: true,
            availabilityLocked: true,
            availabilityLastModifiedBy: {
                select: { name: true, role: true }
            },
            availabilityUpdatedAt: true
        }
    });

    if (!user) {
        throw new Error("Profesor no encontrado");
    }

    const slots = await prisma.teacherAvailability.findMany({
        where: { teacherId },
        orderBy: [
            { dayOfWeek: "asc" },
            { startTime: "asc" }
        ]
    });

    return {
        teacherName: user.name,
        teacherEmail: user.email,
        locked: user.availabilityLocked,
        lastModifiedBy: user.availabilityLastModifiedBy ? {
            name: user.availabilityLastModifiedBy.name,
            role: user.availabilityLastModifiedBy.role
        } : null,
        updatedAt: user.availabilityUpdatedAt,
        slots: slots.map(s => ({
            id: s.id,
            dayOfWeek: s.dayOfWeek as DayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime
        }))
    };
}

// 5. Unlock availability by admin
export async function unlockTeacherAvailabilityAction(teacherId: string) {
    const session = await requireAdmin();
    
    await prisma.user.update({
        where: { id: teacherId },
        data: { 
            availabilityLocked: false,
            availabilityLastModifiedById: session.user.id,
            availabilityUpdatedAt: new Date()
        }
    });

    // Audit log
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: teacherId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Disponibilidad de docente desbloqueada por administrador`,
        success: true,
    });

    revalidatePath("/dashboard/admin/teachers");
    return { success: true };
}

export async function adminLockTeacherAvailabilityAction(teacherId: string) {
    const session = await requireAdmin();
    
    await prisma.user.update({
        where: { id: teacherId },
        data: { 
            availabilityLocked: true,
            availabilityLastModifiedById: session.user.id,
            availabilityUpdatedAt: new Date()
        }
    });

    // Audit log
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: teacherId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Disponibilidad de docente publicada/aprobada por administrador`,
        success: true,
    });

    revalidatePath("/dashboard/admin/teachers");
    return { success: true };
}

// 6. Save availability by admin
export async function adminSaveTeacherAvailabilityAction(teacherId: string, slots: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[]) {
    const session = await requireAdmin();

    // Check if the user is a teacher
    const user = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { role: true }
    });

    if (!user || user.role !== "teacher") {
        throw new Error("El usuario especificado no es un profesor válido.");
    }

    // Save in transaction
    await prisma.$transaction(async (tx) => {
        // Delete all existing slots
        await tx.teacherAvailability.deleteMany({
            where: { teacherId }
        });

        // Create new slots
        if (slots.length > 0) {
            await tx.teacherAvailability.createMany({
                data: slots.map(s => ({
                    teacherId,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime
                }))
            });
        }
    });

    // Automatically lock it since admin saved it and update tracking
    await prisma.user.update({
        where: { id: teacherId },
        data: { 
            availabilityLocked: true,
            availabilityLastModifiedById: session.user.id,
            availabilityUpdatedAt: new Date()
        }
    });

    revalidatePath("/dashboard/admin/courses");
    revalidatePath("/dashboard/teacher/schedule");
    return { success: true };
}
