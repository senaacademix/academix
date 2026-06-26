"use server";

import prisma from "@/lib/prisma";
import { AttendanceStatus, RemarkType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

async function requireTeacher() {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized: Teacher access required");
    }
    return session.user;
}

async function verifyCourseTeacher(courseId: string, teacherId: string) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true }
    });
    if (!course || course.teacherId !== teacherId) {
        throw new Error("Unauthorized: You do not have permission to modify this course");
    }
}

export async function resetStudentPassword(studentId: string) {
    try {
        await requireTeacher();

        const student = await prisma.user.findUnique({
            where: { id: studentId },
            include: { profile: true }
        });

        if (!student) throw new Error("Student not found");

        const defaultPassword = student.profile?.identificacion?.trim();

        if (!defaultPassword) {
            throw new Error("El estudiante no tiene número de identificación registrado en su perfil.");
        }

        // Hash the password (same logic as student creation / teacher password recovery)
        const { hashPassword } = await import("better-auth/crypto");
        const hashedPassword = await hashPassword(defaultPassword);

        // Find and update the Account record or create it if not present
        const existingAccount = await prisma.account.findFirst({
            where: { userId: studentId, providerId: "credential" }
        });

        if (existingAccount) {
            await prisma.account.update({
                where: { id: existingAccount.id },
                data: { password: hashedPassword }
            });
        } else {
            await prisma.account.create({
                data: {
                    id: crypto.randomUUID(),
                    accountId: crypto.randomUUID(),
                    providerId: "credential",
                    userId: studentId,
                    password: hashedPassword
                }
            });
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error resetting password:", error);
        return { success: false, error: error.message };
    }
}

export async function saveAttendanceBatch(
    courseId: string, 
    date: string, 
    records: { studentId: string; status: AttendanceStatus; arrivalTime?: string; justification?: string }[]
) {
    try {
        const teacher = await requireTeacher();
        await verifyCourseTeacher(courseId, teacher.id);

        const dateObj = new Date(date);

        // Delete existing attendance for this course and date
        await prisma.attendance.deleteMany({
            where: {
                courseId,
                date: dateObj
            }
        });

        const filteredRecords = records.filter(r => r.status !== 'PRESENT' as any);

        if (filteredRecords.length > 0) {
            await prisma.attendance.createMany({
                data: filteredRecords.map(r => ({
                    courseId,
                    userId: r.studentId,
                    date: dateObj,
                    status: r.status,
                    arrivalTime: r.arrivalTime ? new Date(r.arrivalTime) : null,
                    justification: r.justification
                }))
            });
        }

        revalidatePath("/dashboard/teacher");
return { success: true };
    } catch (error: any) {
        console.error("Error saving attendance:", error);
return { success: false, error: error.message };
    }
}

export async function saveRemarkBatch(
    teacherId: string,
    courseId: string, 
    studentIds: string[], 
    type: RemarkType, 
    title: string, 
    description: string
) {
    try {
        const teacher = await requireTeacher();
        if (teacher.id !== teacherId) throw new Error("Unauthorized");
        await verifyCourseTeacher(courseId, teacher.id);

        if (studentIds.length === 0) throw new Error("No students selected");

        await prisma.remark.createMany({
            data: studentIds.map(studentId => ({
                userId: studentId,
                teacherId,
                courseId,
                type,
                title,
                description,
                date: new Date()
            }))
        });

        revalidatePath("/dashboard/teacher");
return { success: true };
    } catch (error: any) {
        console.error("Error saving remarks:", error);
return { success: false, error: error.message };
    }
}

export async function getGroupAttendanceHistory(groupId: string) {
    try {
        await requireTeacher();
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: { courses: true }
        });

        if (!group) return [];

        const courseIds = group.courses.map(c => c.id);

        const attendances = await prisma.attendance.findMany({
            where: {
                courseId: { in: courseIds }
            },
            include: {
                course: true,
                user: {
                    include: {
                        profile: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        return attendances;
    } catch (error) {
        console.error("Error fetching attendance history:", error);
        return [];
    }
}

export async function getGroupRemarksHistory(groupId: string) {
    try {
        await requireTeacher();
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: { courses: true }
        });

        if (!group) return [];

        const courseIds = group.courses.map(c => c.id);

        const remarks = await prisma.remark.findMany({
            where: {
                courseId: { in: courseIds }
            },
            include: {
                course: true,
                user: {
                    include: {
                        profile: true
                    }
                },
                teacher: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        return remarks;
    } catch (error) {
        console.error("Error fetching remarks history:", error);
        return [];
    }
}

export async function getTeacherComprehensiveGroupAnalyticsAction(groupId: string) {
    await requireTeacher();

    const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
            program: true,
            period: true,
            environment: true,
            students: {
                select: { id: true, name: true, banned: true, profile: { select: { identificacion: true } } }
            },
            courses: {
                select: {
                    id: true,
                    title: true,
                    activities: {
                        select: {
                            grades: {
                                select: { score: true, userId: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!group) throw new Error("Grupo no encontrado");

    const courseIds = group.courses.map(c => c.id);

    // Fetch attendances
    const attendances = await prisma.attendance.findMany({
        where: { courseId: { in: courseIds } },
        select: { status: true, date: true, userId: true, courseId: true }
    });

    // Fetch remarks
    const remarks = await prisma.remark.findMany({
        where: { courseId: { in: courseIds } },
        select: { type: true, date: true, userId: true, courseId: true }
    });

    const uniqueDates = new Set([
        ...attendances.map(a => new Date(a.date).toISOString().split('T')[0]),
        ...remarks.map(r => new Date(r.date).toISOString().split('T')[0])
    ]);
    const totalCourseClasses = uniqueDates.size;

    // Calculate students stats
    const totalStudents = group.students.length;
    const bannedStudents = group.students.filter(s => s.banned).length;
    const activeStudents = totalStudents - bannedStudents;

    // Calculate courses average grades
    const coursesStats = group.courses.map(course => {
        const allGrades = course.activities.flatMap(a => a.grades);
        const sum = allGrades.reduce((acc, g) => acc + g.score, 0);
        const avg = allGrades.length > 0 ? sum / allGrades.length : 0;
return {
            title: course.title,
            averageGrade: Number(avg.toFixed(2)),
            totalGrades: allGrades.length
        };
    });

    // Calculate individual student metrics
    const studentMetrics = group.students.map(student => {
        const sAttendances = attendances.filter(a => a.userId === student.id);
        const absent = sAttendances.filter(a => a.status === 'ABSENT').length;
        const late = sAttendances.filter(a => a.status === 'LATE').length;
        const present = Math.max(0, totalCourseClasses - absent - late);

        const sRemarks = remarks.filter(r => r.userId === student.id);
        const attention = sRemarks.filter(r => r.type === 'ATTENTION').length;
        const commendation = sRemarks.filter(r => r.type === 'COMMENDATION').length;

        let totalScore = 0;
        let gradesCount = 0;
        const courseGrades: Record<string, number> = {};

        const courseAttendances: Record<string, { present: number, absent: number, late: number }> = {};
        const courseRemarks: Record<string, { attention: number, commendation: number }> = {};

        group.courses.forEach(c => {
            // Grades
            let cScore = 0;
            let cCount = 0;
            c.activities.forEach(a => {
                a.grades.filter(g => g.userId === student.id).forEach(g => {
                    cScore += g.score;
                    cCount++;
                    totalScore += g.score;
                    gradesCount++;
                });
            });
            courseGrades[c.id] = cCount > 0 ? Number((cScore / cCount).toFixed(2)) : 0;

            // Attendances
            const cAtts = attendances.filter(a => a.userId === student.id && a.courseId === c.id);
            const cAbsent = cAtts.filter(a => a.status === 'ABSENT').length;
            const cLate = cAtts.filter(a => a.status === 'LATE').length;
            // Assuming course total classes is total dates for that course
            const cDates = new Set(attendances.filter(a => a.courseId === c.id).map(a => new Date(a.date).toISOString().split('T')[0]));
            const cPresent = Math.max(0, cDates.size - cAbsent - cLate);
            courseAttendances[c.id] = { present: cPresent, absent: cAbsent, late: cLate };

            // Remarks
            const cRems = remarks.filter(r => r.userId === student.id && r.courseId === c.id);
            const cAtten = cRems.filter(r => r.type === 'ATTENTION').length;
            const cComm = cRems.filter(r => r.type === 'COMMENDATION').length;
            courseRemarks[c.id] = { attention: cAtten, commendation: cComm };
        });

        const gradesAvg = gradesCount > 0 ? Number((totalScore / gradesCount).toFixed(2)) : 0;

        return {
            id: student.id,
            name: student.name,
            identificacion: student.profile?.identificacion || 'N/A',
            banned: student.banned,
            gradesAvg,
            courseGrades,
            courseAttendances,
            courseRemarks,
            attendances: { present, absent, late },
            remarks: { attention, commendation }
        };
    });

    const coursesList = group.courses.map(c => ({ id: c.id, title: c.title }));

    return {
        studentMetrics,
        coursesList,
        groupName: group.name,
        groupDescription: group.description,
        program: group.program?.name,
        period: group.period?.name,
        environment: group.environment?.name,
        startDate: group.startDate,
        endDate: group.endDate,
        startTime: group.startTime,
        endTime: group.endTime,
        students: {
            total: totalStudents,
            active: activeStudents,
            banned: bannedStudents
        },
        totalCourseClasses,
        attendances,
        remarks,
        coursesStats
    };
}

export async function saveSingleAttendanceAction(
    courseId: string,
    studentId: string,
    dateStr: string,
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
    justification?: string
) {
    try {
        const teacher = await requireTeacher();
        await verifyCourseTeacher(courseId, teacher.id);

        const dateObj = new Date(dateStr);
        // Avoid timezone shifting issues by setting hours in UTC
        dateObj.setUTCHours(12, 0, 0, 0);

        if (status === "PRESENT") {
            // Delete the attendance record for this student and date
            await prisma.attendance.deleteMany({
                where: {
                    courseId,
                    userId: studentId,
                    date: dateObj
                }
            });
        } else {
            // Find existing record
            const existing = await prisma.attendance.findFirst({
                where: {
                    courseId,
                    userId: studentId,
                    date: dateObj
                }
            });

            const dbStatus = (status === "EXCUSED" || status === "ABSENT") ? "ABSENT" : "LATE";
            const dbJustification = status === "EXCUSED" ? (justification || "Justificado en planilla") : null;

            if (existing) {
                await prisma.attendance.update({
                    where: { id: existing.id },
                    data: {
                        status: dbStatus as any,
                        justification: dbJustification,
                        arrivalTime: null
                    }
                });
            } else {
                await prisma.attendance.create({
                    data: {
                        courseId,
                        userId: studentId,
                        date: dateObj,
                        status: dbStatus as any,
                        justification: dbJustification
                    }
                });
            }
        }

        revalidatePath("/dashboard/teacher");
        return { success: true };
    } catch (error: any) {
        console.error("Error saving single attendance:", error);
        return { success: false, error: error.message };
    }
}

