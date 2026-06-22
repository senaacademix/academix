"use server";

import prisma from "@/lib/prisma";
import { AttendanceStatus, RemarkType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

        const defaultPassword = student.profile?.identificacion;

        if (!defaultPassword) {
            throw new Error("Student has no identification to use as password");
        }

        // We can use the admin plugin from betterAuth to set the password,
        // or just update the account. Since betterAuth password hashing is internal,
        // we might need to rely on the auth instance if we have it here.
        // If we don't have better-auth admin plugin configured easily here, 
        // we can update it using better-auth api directly or bcrypt.
        
        const { auth } = await import("@/lib/auth");
        
        // better-auth admin plugin provides setUserPassword:
        await auth.api.setUserPassword({
            headers: new Headers(),
            body: {
                userId: studentId,
                newPassword: defaultPassword
            }
        });
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
