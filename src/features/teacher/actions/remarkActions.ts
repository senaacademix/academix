"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { parseISOAsUTC } from "@/lib/dateUtils";
import { RemarkType } from "@/generated/prisma/client";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function createRemarkAction(formData: FormData) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const type = formData.get("type") as "ATTENTION" | "COMMENDATION" | "CITATION" | "OTHER";
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const courseId = formData.get("courseId") as string;
    const userId = formData.get("userId") as string;

    const dateStr = formData.get("date") as string;
    const date = dateStr ? parseISOAsUTC(dateStr) : undefined;

    const { remarkService } = await import("../../student/services/remarkService");
    const remark = await remarkService.createRemark({
        type,
        title,
        description,
        courseId,
        userId,
        teacherId: session.user.id,
        date: date,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const [course, student] = await Promise.all([
        prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    ]);

    await auditLogger.logRemark(
        remark.id,
        type,
        student?.name || "Estudiante",
        course?.title || "Materia",
        session.user.id,
        session.user.name || "Profesor"
    );

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function updateRemarkAction(formData: FormData) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const remarkId = formData.get("remarkId") as string;
    const type = formData.get("type") as "ATTENTION" | "COMMENDATION" | "CITATION" | "OTHER" | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const courseId = formData.get("courseId") as string;
    const dateStr = formData.get("date") as string;
    const date = dateStr ? parseISOAsUTC(dateStr) : undefined;

    const { remarkService } = await import("../../student/services/remarkService");
    await remarkService.updateRemark(remarkId, {
        ...(type && { type }),
        ...(title && { title }),
        ...(description && { description }),
        ...(date && { date }),
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "REMARK",
        entityId: remarkId,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Observación actualizada: ${title || "Sin título"}`,
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function deleteRemarkAction(remarkId: string, courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    // Get remark info before deletion
    const remark = await prisma.remark.findUnique({
        where: { id: remarkId },
        select: { title: true, type: true }
    });

    const { remarkService } = await import("../../student/services/remarkService");
    await remarkService.deleteRemark(remarkId);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "REMARK",
        entityId: remarkId,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Observación eliminada: ${remark?.title || "Sin título"} (${remark?.type})`,
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function getRemarkTemplatesAction() {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    return await prisma.remarkTemplate.findMany({
        orderBy: { createdAt: "desc" },
    });
}

export async function createRemarkTemplateAction(title: string, description: string, type: RemarkType) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    if (!title || !description || !type) {
        throw new Error("El título, la descripción y el tipo son obligatorios.");
    }

    const template = await prisma.remarkTemplate.create({
        data: { title, description, type },
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "REMARK_TEMPLATE",
        entityId: template.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Plantilla de observación creada: ${title}`,
        success: true,
    });

    return template;
}

export async function updateRemarkTemplateAction(id: string, title: string, description: string, type: RemarkType) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    if (!title || !description || !type) {
        throw new Error("El título, la descripción y el tipo son obligatorios.");
    }

    const template = await prisma.remarkTemplate.update({
        where: { id },
        data: { title, description, type },
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "REMARK_TEMPLATE",
        entityId: template.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Plantilla de observación actualizada: ${title}`,
        success: true,
    });

    return template;
}

export async function deleteRemarkTemplateAction(id: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    const template = await prisma.remarkTemplate.delete({
        where: { id },
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "REMARK_TEMPLATE",
        entityId: template.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Plantilla de observación eliminada: ${template.title}`,
        success: true,
    });

    return template;
}

