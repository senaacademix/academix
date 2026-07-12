"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getImprovementPlans(targetStudentId?: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autorizado");
    }

    let studentId = session.user.id;
    if (targetStudentId) {
        if (session.user.role !== "teacher" && session.user.role !== "admin" && session.user.id !== targetStudentId) {
            throw new Error("No autorizado");
        }
        studentId = targetStudentId;
    }

    try {
        const plans = await prisma.improvementPlan.findMany({
            where: { studentId },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: { select: { nombres: true, apellido: true, identificacion: true } }
                    }
                },
                teacher: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { nombres: true, apellido: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        return { success: true, data: plans };
    } catch (error: any) {
        console.error("Error al obtener planes de mejoramiento:", error);
        return { success: false, error: error.message || "Error al obtener planes" };
    }
}

export async function getGroupImprovementPlans(groupId: string) {
    const session = await getSession();
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("No autorizado");
    }

    try {
        const plans = await prisma.improvementPlan.findMany({
            where: {
                student: { groupId }
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: { select: { nombres: true, apellido: true, identificacion: true } }
                    }
                },
                teacher: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { nombres: true, apellido: true } }
                    }
                }
            },
            orderBy: [{ studentId: "asc" }, { createdAt: "desc" }]
        });
        return { success: true, data: plans };
    } catch (error: any) {
        console.error("Error al obtener planes de mejoramiento del grupo:", error);
        return { success: false, error: error.message || "Error al obtener planes" };
    }
}

export async function upsertImprovementPlan(data: {
    id?: string;
    planNumber: string;
    studentId: string;
    teacherDocUrl?: string;
    signedDocUrl?: string;
    teacherSignedDocUrl?: string;
    startDate: Date | string;
    endDate: Date | string;
    observations?: string;
    planScore?: number;
    finalGrade?: number;
    evidenceUrl?: string;
}) {
    const session = await getSession();
    if (!session?.user || session.user.role !== "teacher") {
        throw new Error("No autorizado");
    }

    const {
        id,
        planNumber,
        studentId,
        teacherDocUrl,
        signedDocUrl,
        startDate,
        endDate,
        observations,
        planScore,
        finalGrade,
        evidenceUrl
    } = data;

    try {
        if (id) {
            // Update
            const updated = await prisma.improvementPlan.update({
                where: { id },
                data: {
                    planNumber,
                    studentId,
                    teacherDocUrl: teacherDocUrl || null,
                    signedDocUrl: signedDocUrl || null,
                    teacherSignedDocUrl: data.teacherSignedDocUrl || null,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    observations: observations || null,
                    planScore: planScore !== undefined ? planScore : null,
                    finalGrade: finalGrade !== undefined ? finalGrade : null,
                    evidenceUrl: evidenceUrl || null,
                }
            });
            return { success: true, data: updated };
        } else {
            // Create
            const created = await prisma.improvementPlan.create({
                data: {
                    planNumber,
                    studentId,
                    teacherId: session.user.id,
                    teacherDocUrl: teacherDocUrl || null,
                    signedDocUrl: signedDocUrl || null,
                    teacherSignedDocUrl: data.teacherSignedDocUrl || null,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    observations: observations || null,
                    planScore: planScore !== undefined ? planScore : null,
                    finalGrade: finalGrade !== undefined ? finalGrade : null,
                    evidenceUrl: evidenceUrl || null,
                }
            });
            return { success: true, data: created };
        }
    } catch (error: any) {
        console.error("Error al guardar plan de mejoramiento:", error);
        return { success: false, error: error.message || "Error al guardar el plan" };
    }
}

export async function deleteImprovementPlan(id: string) {
    const session = await getSession();
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("No autorizado");
    }

    try {
        await prisma.improvementPlan.delete({
            where: { id }
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error al eliminar plan de mejoramiento:", error);
        return { success: false, error: error.message || "Error al eliminar el plan" };
    }
}

export async function submitSignedDocument(planId: string, signedDocUrl: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autorizado");
    }

    try {
        const plan = await prisma.improvementPlan.findUnique({
            where: { id: planId }
        });

        if (!plan) {
            throw new Error("Plan de mejoramiento no encontrado");
        }

        // Student can only submit for their own plan
        if (session.user.role === "student" && plan.studentId !== session.user.id) {
            throw new Error("No autorizado");
        }

        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: { signedDocUrl }
        });

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al enviar documento firmado:", error);
        return { success: false, error: error.message || "Error al enviar documento" };
    }
}

export async function deleteSignedDocument(planId: string) {
    const session = await getSession();
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("No autorizado");
    }

    try {
        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: { signedDocUrl: null }
        });
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al eliminar documento firmado:", error);
        return { success: false, error: error.message || "Error al eliminar el documento" };
    }
}

export async function submitTeacherSignedDoc(planId: string, teacherSignedDocUrl: string) {
    const session = await getSession();
    if (!session?.user || session.user.role !== "teacher") {
        throw new Error("No autorizado");
    }

    try {
        const plan = await prisma.improvementPlan.findUnique({ where: { id: planId } });
        if (!plan) throw new Error("Plan no encontrado");
        if (plan.teacherId !== session.user.id) throw new Error("Solo el profesor asignado puede firmar el plan");

        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: { teacherSignedDocUrl }
        });
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al subir contrafirma del profesor:", error);
        return { success: false, error: error.message || "Error al guardar" };
    }
}

export async function deleteTeacherSignedDoc(planId: string) {
    const session = await getSession();
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("No autorizado");
    }

    try {
        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: { teacherSignedDocUrl: null }
        });
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al eliminar contrafirma del profesor:", error);
        return { success: false, error: error.message || "Error al eliminar" };
    }
}

export async function markPlanViewed(planId: string) {
    const session = await getSession();
    if (!session?.user || session.user.role !== "student") {
        return { success: false, error: "Only students can mark plans as viewed" };
    }

    try {
        const plan = await prisma.improvementPlan.findUnique({
            where: { id: planId }
        });

        if (!plan || plan.studentId !== session.user.id) {
            return { success: false, error: "Unauthorized" };
        }

        if (plan.viewedAt) {
            return { success: true, alreadyViewed: true }; // already viewed
        }

        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: { viewedAt: new Date() }
        });

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al marcar plan como visto:", error);
        return { success: false, error: error.message || "Error" };
    }
}
