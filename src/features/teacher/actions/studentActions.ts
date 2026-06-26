"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { courseService } from "../services/courseService";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function addStudentToCourseAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized");
    }

    const userId = formData.get("userId") as string;
    const courseId = formData.get("courseId") as string;

    if (!userId || !courseId) {
        throw new Error("Missing required fields");
    }

    const enrollment = await courseService.enrollStudent(userId, courseId, 'APPROVED');

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const [course, student] = await Promise.all([
        prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    ]);

    await auditLogger.logEnrollment(
        enrollment.id,
        course?.title || "Materia",
        userId,
        student?.name || "Estudiante"
    );

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function searchStudentsAction(query: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    return await courseService.searchStudents(query);
}

export async function removeStudentFromCourseAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized");
    }

    const userId = formData.get("userId") as string;
    const courseId = formData.get("courseId") as string;

    if (!userId || !courseId) {
        throw new Error("Missing required fields");
    }

    // Get info before removal for audit log
    const [course, student] = await Promise.all([
        prisma.course.findUnique({ where: { id: courseId }, select: { title: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    ]);

    await courseService.removeStudentFromCourse(userId, courseId);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    await auditLogger.logUnenrollment(
        course?.title || "Materia",
        userId,
        student?.name || "Estudiante",
        session.user.id,
        session.user.name || "Profesor"
    );

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function getStudentsForTeacherAction() {
    const session = await getSession();
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    return await courseService.getStudentsForTeacher(session.user.id);
}

export async function getStudentCourseEnrollmentAction(userId: string, courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    return await courseService.getStudentCourseEnrollment(userId, courseId);
}



export async function getCourseStudentsAction(courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    return await courseService.getCourseStudents(courseId);
}

export async function updateStudentStatusAction(enrollmentId: string, status: 'APPROVED' | 'REJECTED') {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized");
    }

    const enrollment = await courseService.updateEnrollmentStatus(enrollmentId, status);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("../../admin/services/auditLogger");
    const [course, student] = await Promise.all([
        prisma.course.findUnique({ where: { id: enrollment.courseId }, select: { title: true } }),
        prisma.user.findUnique({ where: { id: enrollment.userId }, select: { name: true } })
    ]);

    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: enrollmentId,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Estado de matrícula actualizado para ${student?.name || "Estudiante"} en ${course?.title || "Materia"}: ${status}`,
        metadata: { status, enrollmentId },
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${enrollment.courseId}`);
    return enrollment;
}
