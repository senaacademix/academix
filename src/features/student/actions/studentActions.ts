"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getStudentRecords() {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const studentId = session.user.id;

    // Fetch Attendance
    const attendances = await prisma.attendance.findMany({
        where: { userId: studentId },
        include: {
            course: { select: { title: true } },
        },
        orderBy: { date: "desc" },
    });

    // Fetch Remarks
    const remarks = await prisma.remark.findMany({
        where: { userId: studentId },
        include: {
            course: { select: { title: true } },
            teacher: { select: { name: true, profile: { select: { nombres: true, apellido: true } } } }
        },
        orderBy: { date: "desc" },
    });

    return {
        attendances,
        remarks,
    };
}

export async function justifyAttendanceAction(attendanceId: string, justification: string, url: string = "") {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const studentId = session.user.id;

    const attendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
    });

    if (!attendance || attendance.userId !== studentId) {
        throw new Error("No autorizado para justificar esta asistencia");
    }

    if (attendance.justification) {
        throw new Error("Esta falta ya ha sido justificada previamente.");
    }

    if (!justification.trim()) {
        throw new Error("La justificación no puede estar vacía.");
    }

    const updated = await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
            justification: justification.trim(),
            justificationUrl: url.trim() || null,
        }
    });

    return { success: true, attendance: updated };
}
