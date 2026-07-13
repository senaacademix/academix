"use server";

import { sharedContentService } from "@/features/teacher/services/sharedContentService";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push-notifications";

export async function createSharedContent(data: {
    title: string;
    description?: string;
    links: any[];
    files: any[];
    courseId: string;
    createdAt?: Date;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const content = await sharedContentService.create({
        ...data,
        teacherId: session.user.id,
    });

    // Send push notifications to all enrolled students asynchronously
    (async () => {
        try {
            const course = await prisma.course.findUnique({
                where: { id: data.courseId },
                select: { title: true }
            });
            const courseTitle = course?.title || "Materia";

            const enrollments = await prisma.enrollment.findMany({
                where: { courseId: data.courseId, status: "APPROVED" },
                select: { userId: true }
            });

            await Promise.all(
                enrollments.map(async (enrollment) => {
                    await sendPushNotification(enrollment.userId, {
                        title: "Nuevo Material Compartido",
                        body: `Se ha publicado nuevo material de estudio ("${data.title}") en la materia ${courseTitle}.`,
                        url: "/dashboard/student/records"
                    });
                })
            );
        } catch (err) {
            console.error("Error sending shared content notifications:", err);
        }
    })();

    revalidatePath(`/dashboard/teacher/courses/${data.courseId}`);
    return content;
}

export async function updateSharedContent(id: string, data: {
    title?: string;
    description?: string;
    links?: any[];
    files?: any[];
    courseId: string;
    createdAt?: Date;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const content = await sharedContentService.update(id, {
        title: data.title,
        description: data.description,
        links: data.links,
        files: data.files,
        createdAt: data.createdAt,
    });

    revalidatePath(`/dashboard/teacher/courses/${data.courseId}`);
    return content;
}

export async function deleteSharedContent(id: string, courseId: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    await sharedContentService.delete(id);

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function getSharedContentByCourse(courseId: string) {
    return await sharedContentService.getByCourse(courseId);
}
