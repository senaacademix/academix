"use server";
import { gradeService } from "@/features/teacher/services/gradeService";


import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

async function requireTeacherOrAdmin() {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized: Teacher or Admin access required");
    }
    return session.user;
}

async function verifyCourseTeacher(courseId: string, user: { id: string, role: string }) {
    if (user.role === "admin") return;
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true }
    });
    if (!course || course.teacherId !== user.id) {
        throw new Error("Unauthorized: You do not have permission to modify this course");
    }
}

export async function getCourseActivities(courseId: string) {
    try {
        const teacher = await requireTeacherOrAdmin();
        await verifyCourseTeacher(courseId, teacher);

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { usePercentageWeights: true }
        });

        const activities = await prisma.activity.findMany({
            where: { courseId },
            include: {
                grades: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        
        return { 
            activities, 
            usePercentageWeights: course?.usePercentageWeights ?? true 
        };
    } catch (error) {
        console.error("Error fetching course activities:", error);
        return { activities: [], usePercentageWeights: true };
    }
}

export async function toggleCourseWeightMode(courseId: string, usePercentageWeights: boolean) {
    try {
        const teacher = await requireTeacherOrAdmin();
        await verifyCourseTeacher(courseId, teacher);

        await prisma.course.update({
            where: { id: courseId },
            data: { usePercentageWeights }
        });
        
        revalidatePath("/dashboard/teacher");
        return { success: true };
    } catch (error: any) {
        console.error("Error toggling weight mode:", error);
        return { success: false, error: error.message };
    }
}

export async function createActivity(courseId: string, title: string, description: string, weight: number, allowSubmissionLink: boolean = false) {
    try {
        const teacher = await requireTeacherOrAdmin();
        await verifyCourseTeacher(courseId, teacher);

        await prisma.activity.create({
            data: {
                courseId,
                title,
                description,
                weight,
                allowSubmissionLink
            }
        });
        revalidatePath("/dashboard/teacher");
        return { success: true };
    } catch (error: any) {
        console.error("Error creating activity:", error);
        return { success: false, error: error.message };
    }
}

export async function updateActivity(activityId: string, title: string, description: string, weight: number, allowSubmissionLink: boolean = false) {
    try {
        const teacher = await requireTeacherOrAdmin();
        const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { courseId: true } });
        if (!activity) throw new Error("Activity not found");
        await verifyCourseTeacher(activity.courseId, teacher);

        await prisma.activity.update({
            where: { id: activityId },
            data: {
                title,
                description,
                weight,
                allowSubmissionLink
            }
        });
        revalidatePath("/dashboard/teacher");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating activity:", error);
        return { success: false, error: error.message };
    }
}

export async function submitStudentSubmissionLink(activityId: string, link: string) {
    try {
        const session = await getSession();
        if (!session?.user) throw new Error("Unauthorized");
        const userId = session.user.id;

        // Validate URL format
        try { new URL(link); } catch { throw new Error("URL inválida"); }

        await prisma.studentGrade.upsert({
            where: { activityId_userId: { activityId, userId } },
            update: { submissionLink: link },
            create: { activityId, userId, score: 0, submissionLink: link }
        });
        revalidatePath("/dashboard/student/records");
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting link:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteActivity(activityId: string) {
    try {
        const teacher = await requireTeacherOrAdmin();
        const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { courseId: true } });
        if (!activity) throw new Error("Activity not found");
        await verifyCourseTeacher(activity.courseId, teacher);

        await prisma.activity.delete({
            where: { id: activityId }
        });
        revalidatePath("/dashboard/teacher");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting activity:", error);
        return { success: false, error: error.message };
    }
}

export async function saveStudentGrades(activityId: string, grades: { userId: string, score: number, feedback?: string }[]) {
    try {
        const teacher = await requireTeacherOrAdmin();
        const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { courseId: true } });
        if (!activity) throw new Error("Activity not found");
        await verifyCourseTeacher(activity.courseId, teacher);

        // Since we want to update or create, we can use a transaction with upsert
        await prisma.$transaction(
            grades.map(grade => 
                prisma.studentGrade.upsert({
                    where: {
                        activityId_userId: {
                            activityId,
                            userId: grade.userId
                        }
                    },
                    update: {
                        score: grade.score,
                        feedback: grade.feedback
                    },
                    create: {
                        activityId,
                        userId: grade.userId,
                        score: grade.score,
                        feedback: grade.feedback
                    }
                })
            )
        );

        revalidatePath("/dashboard/teacher");
        return { success: true };
    } catch (error: any) {
        console.error("Error saving student grades:", error);
        return { success: false, error: error.message };
    }
}

export async function getStudentGrades(userId: string) {
    try {
        const session = await getSession();
        if (!session?.user) throw new Error("Unauthorized");
        // Ensure student can only fetch their own grades, or admin/teacher fetching
        if (session.user.role === 'student' && session.user.id !== userId) {
            throw new Error("Unauthorized");
        }

        // ── 1. Materias por inscripción directa (Enrollment) ──────────────────
        const enrollments = await prisma.enrollment.findMany({
            where: { userId, status: 'APPROVED' },
            include: {
                course: {
                    include: {
                        teacher: { select: { name: true, profile: { select: { nombres: true, apellido: true } } } },
                        schedules: { orderBy: { dayOfWeek: 'asc' } },
                        activities: {
                            orderBy: { createdAt: 'asc' },
                            include: {
                                grades: { where: { userId } }
                            }
                        }
                    }
                }
            }
        });
        const directCourses = enrollments.map((e: any) => e.course);

        // ── 2. Materias del grupo al que pertenece el estudiante ──────────────
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                groupId: true,
                group: {
                    select: {
                        courses: {
                            include: {
                                teacher: { select: { name: true, profile: { select: { nombres: true, apellido: true } } } },
                                schedules: { orderBy: { dayOfWeek: 'asc' } },
                                activities: {
                                    orderBy: { createdAt: 'asc' },
                                    include: {
                                        grades: { where: { userId } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        const groupCourses: any[] = user?.group?.courses ?? [];

        // ── 3. Unir y deduplicar por id ───────────────────────────────────────
        const allCourses = [...directCourses];
        for (const gc of groupCourses) {
            if (!allCourses.some(c => c.id === gc.id)) {
                allCourses.push(gc);
            }
        }

        return allCourses;
    } catch (error) {
        console.error("Error fetching student grades:", error);
        return [];
    }
}


// Migrated from src/app/actions/grade-actions.ts
export async function createGradeCategoryAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const weight = parseFloat(formData.get("weight") as string);
    const courseId = formData.get("courseId") as string;

    const category = await gradeService.createGradeCategory({ name, weight, courseId });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "OTHER",
        entityId: category.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Categoría de calificación creada: ${name}`,
        metadata: { name, weight, courseId },
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return category;
}

export async function updateGradeCategoryAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const id = formData.get("id") as string;
    const name = formData.get("name") as string | undefined;
    const weightStr = formData.get("weight") as string | undefined;
    const courseId = formData.get("courseId") as string;

    const category = await gradeService.updateGradeCategory(id, {
        name: name || undefined,
        weight: weightStr ? parseFloat(weightStr) : undefined,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: category.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Categoría de calificación actualizada: ${category.name}`,
        metadata: { name, weight: weightStr, courseId },
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return category;
}

export async function deleteGradeCategoryAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const id = formData.get("id") as string;
    const courseId = formData.get("courseId") as string;

    await gradeService.deleteGradeCategory(id);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "OTHER",
        entityId: id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Categoría de calificación eliminada`,
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function createGradeGroupAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const weight = parseFloat(formData.get("weight") as string);
    const courseId = formData.get("courseId") as string;
    const categoryId = formData.get("categoryId") as string || undefined;

    const group = await gradeService.createGradeGroup({ name, weight, courseId, categoryId });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "OTHER",
        entityId: group.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Grupo de calificación creado: ${name}`,
        metadata: { name, weight, courseId },
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return group;
}

export async function updateGradeGroupAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const id = formData.get("id") as string;
    const name = formData.get("name") as string | undefined;
    const weightStr = formData.get("weight") as string | undefined;
    const courseId = formData.get("courseId") as string;

    const group = await gradeService.updateGradeGroup(id, {
        name: name || undefined,
        weight: weightStr ? parseFloat(weightStr) : undefined,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: group.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Grupo de calificación actualizado: ${group.name}`,
        metadata: { name, weight: weightStr, courseId },
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return group;
}

export async function deleteGradeGroupAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const id = formData.get("id") as string;
    const courseId = formData.get("courseId") as string;

    await gradeService.deleteGradeGroup(id);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "OTHER",
        entityId: id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Grupo de calificación eliminado`,
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function addGradeGroupItemAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const groupId = formData.get("groupId") as string;
    const weight = parseFloat(formData.get("weight") as string);
    const courseId = formData.get("courseId") as string;

    const item = await gradeService.addItemToGradeGroup({
        groupId,
        weight,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return item;
}

export async function removeGradeGroupItemAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const id = formData.get("itemId") as string;
    const courseId = formData.get("courseId") as string;

    await gradeService.removeItemFromGradeGroup(id);

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function updateGradeGroupItemAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const id = formData.get("itemId") as string;
    const weight = parseFloat(formData.get("weight") as string);
    const courseId = formData.get("courseId") as string;

    await gradeService.updateGradeGroupItem(id, weight);

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}
