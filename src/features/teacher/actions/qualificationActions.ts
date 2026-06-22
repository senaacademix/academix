"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getTeacherQualificationsAction(teacherId: string) {
    const session = await getSession();
    if (!session) {
        throw new Error("Unauthorized");
    }
    if (session.user.role !== "admin" && session.user.id !== teacherId) {
        throw new Error("Unauthorized");
    }

    const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        include: {
            programs: {
                include: {
                    periods: {
                        include: {
                            courses: {
                                orderBy: { order: "asc" }
                            }
                        },
                        orderBy: { createdAt: "asc" }
                    }
                }
            },
            qualifiedCourses: {
                select: {
                    id: true,
                    title: true
                }
            },
            qualificationsLastModifiedBy: {
                select: { name: true, role: true }
            }
        }
    });

    if (!teacher) {
        throw new Error("Teacher not found");
    }

    return {
        programs: teacher.programs || [],
        qualifiedCourses: teacher.qualifiedCourses || [],
        locked: teacher.qualifiedCoursesLocked,
        lastModifiedBy: teacher.qualificationsLastModifiedBy ? {
            name: teacher.qualificationsLastModifiedBy.name,
            role: teacher.qualificationsLastModifiedBy.role
        } : null,
        updatedAt: teacher.qualificationsUpdatedAt
    };
}

export async function updateTeacherQualificationsAction(teacherId: string, courseIds: string[]) {
    const session = await getSession();
    if (!session) {
        throw new Error("Unauthorized");
    }
    if (session.user.role !== "admin" && session.user.id !== teacherId) {
        throw new Error("Unauthorized");
    }

    const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { qualifiedCoursesLocked: true }
    });

    if (teacher?.qualifiedCoursesLocked && session.user.role !== "admin") {
        throw new Error("La configuración de materias está bloqueada y no se puede modificar.");
    }

    await prisma.user.update({
        where: { id: teacherId },
        data: {
            qualifiedCourses: {
                set: courseIds.map(id => ({ id }))
            },
            qualificationsLastModifiedById: session.user.id,
            qualificationsUpdatedAt: new Date()
        }
    });
}

// Bloquea las asignaturas (publicar)
export async function publishTeacherQualificationsAction(teacherId: string) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");
    if (session.user.role !== "admin" && session.user.id !== teacherId) throw new Error("Unauthorized");

    await prisma.user.update({
        where: { id: teacherId },
        data: { 
            qualifiedCoursesLocked: true,
            qualificationsLastModifiedById: session.user.id,
            qualificationsUpdatedAt: new Date()
        }
    });
}

// Desbloquea las asignaturas (por el admin)
export async function unlockTeacherQualificationsAction(teacherId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") throw new Error("Unauthorized");
    
    await prisma.user.update({
        where: { id: teacherId },
        data: { 
            qualifiedCoursesLocked: false,
            qualificationsLastModifiedById: session.user.id,
            qualificationsUpdatedAt: new Date()
        }
    });
    revalidatePath("/dashboard/admin/teachers");
    return { success: true };
}

export async function adminLockTeacherQualificationsAction(teacherId: string) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") throw new Error("Unauthorized");
    
    await prisma.user.update({
        where: { id: teacherId },
        data: { 
            qualifiedCoursesLocked: true,
            qualificationsLastModifiedById: session.user.id,
            qualificationsUpdatedAt: new Date()
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
        description: `Materias habilitadas de docente publicadas/aprobadas por administrador`,
        success: true,
    });

    revalidatePath("/dashboard/admin/teachers");
    return { success: true };
}

// Guarda las asignaturas y las bloquea (por el admin)
export async function adminSaveTeacherQualificationsAction(teacherId: string, courseIds: string[]) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") throw new Error("Unauthorized");

    await prisma.user.update({
        where: { id: teacherId },
        data: {
            qualifiedCourses: {
                set: courseIds.map(id => ({ id }))
            },
            qualifiedCoursesLocked: true,
            qualificationsLastModifiedById: session.user.id,
            qualificationsUpdatedAt: new Date()
        }
    });
}
