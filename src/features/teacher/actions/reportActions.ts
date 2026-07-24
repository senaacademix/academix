"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { courseService } from "../services/courseService";
import prisma from "@/lib/prisma";
import { formatName } from "@/lib/utils";
import { toUTCStartOfDayFromLocal, formatCalendarDate } from "@/lib/dateUtils";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function getCourseGradesReportAction(courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) throw new Error("Unauthorized");
    return await courseService.getCourseGradesReport(courseId);
}

export async function getCourseAttendanceReportAction(courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) throw new Error("Unauthorized");
    return await courseService.getCourseAttendanceReport(courseId);
}

export async function getMultiCourseGradesReportAction(courseIds: string[]) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) throw new Error("Unauthorized");

    const reports = [];
    for (const id of courseIds) {
        const course = await prisma.course.findUnique({ where: { id }, select: { title: true } });
        if (course) {
            const data = await courseService.getCourseGradesReport(id);
            reports.push({
                name: course.title.substring(0, 30), // Excel sheet name limit
                data: data
            });
        }
    }
    return reports;
}

export async function getCourseCompleteDataAction(courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    // Get course info
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            enrollments: {
                where: { status: "APPROVED" },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    user: { name: 'asc' }
                }
            },
            gradeCategories: {
                include: {
                    groups: {
                        include: {
                            items: {
                                orderBy: { createdAt: 'asc' }
                            }
                        },
                        orderBy: { createdAt: 'asc' }
                    }
                },
                orderBy: { createdAt: 'asc' }
            },
            attendances: {
                orderBy: { date: 'desc' },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            },
            remarks: {
                orderBy: { date: 'desc' },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            }
        }
    });

    if (!course) {
        throw new Error("Course not found");
    }

    // 1. GRADES DATA
    const { calculateFinalGrade } = await import("@/lib/gradeUtils");
    const gradesData = course.enrollments.map((enrollment: any) => {
        const student = enrollment.user;
        const studentId = student.id;

        const { finalGrade } = calculateFinalGrade(
            studentId,
            (course as any).gradeCategories || [],
            []
        );

        const row: any = {
            "Estudiante": student.name || "Sin nombre",
            "Email": student.email
        };

        row["Nota Final"] = finalGrade.toFixed(1);

        return row;
    });

    // 2. ATTENDANCE DATA
    const attendanceData = course.attendances.map((attendance: any) => ({
        "Estudiante": attendance.user.name || "Sin nombre",
        "Email": attendance.user.email,
        "Fecha": formatCalendarDate(attendance.date, "dd/MM/yyyy"),
        "Estado": attendance.status === 'ABSENT' ? 'Ausente' :
                attendance.status === 'LATE' ? 'Tarde' : 'Excusado',
        "Hora Llegada": attendance.arrivalTime ? new Date(attendance.arrivalTime).toLocaleTimeString('es-ES') : "-",
        "Justificación": attendance.justification || "-"
    }));

    // 3. REMARKS DATA
    const remarksData = course.remarks.map((remark: any) => ({
        "Estudiante": remark.user.name || "Sin nombre",
        "Email": remark.user.email,
        "Fecha": formatCalendarDate(remark.date, "dd/MM/yyyy"),
        "Tipo": remark.type === 'COMMENDATION' ? 'Felicitación' : remark.type === 'ATTENTION' ? 'Llamado de Atención' : remark.type === 'CITATION' ? 'Citación' : 'Otra',
        "Título": remark.title,
        "Descripción": remark.description
    }));

    // 4. STATISTICS DATA
    const totalStudents = course.enrollments.length;
    const totalActivities = 0;

    // Calculate average grade
    let sumGrades = 0;
    let countGrades = 0;
    course.enrollments.forEach((enrollment: any) => {
        const { finalGrade } = calculateFinalGrade(
            enrollment.userId,
            (course as any).gradeCategories || [],
            []
        );
        sumGrades += finalGrade;
        countGrades++;
    });
    const averageGrade = countGrades > 0 ? sumGrades / countGrades : 0;

    // Calculate attendance rate deductively
    const uniqueDates = new Set([
        ...course.attendances.map((a: any) => new Date(a.date).toISOString().split('T')[0]),
        ...course.remarks.map((r: any) => new Date(r.date).toISOString().split('T')[0])
    ]);
    const totalCourseClasses = uniqueDates.size;
    
    // For overall course attendance rate, we can sum expected attendances (totalStudents * totalCourseClasses)
    // minus total absences
    const totalExpectedAttendances = totalStudents * totalCourseClasses;
    const totalAbsences = course.attendances.filter((a: any) => a.status === 'ABSENT').length;
    const totalPresentRecords = totalExpectedAttendances - totalAbsences;
    const attendanceRate = totalExpectedAttendances > 0 ? (totalPresentRecords / totalExpectedAttendances) * 100 : 100;

    // Count remarks
    const positiveRemarks = course.remarks.filter((r: any) => r.type === 'COMMENDATION').length;
    const negativeRemarks = course.remarks.filter((r: any) => r.type === 'ATTENTION').length;

    const statisticsData = [
        { "Métrica": "Total Estudiantes", "Valor": totalStudents.toString() },
        { "Métrica": "Actividades Totales", "Valor": totalActivities.toString() },
        { "Métrica": "Promedio General", "Valor": averageGrade.toFixed(1) },
        { "Métrica": "Tasa de Asistencia", "Valor": `${attendanceRate.toFixed(1)}%` },
        { "Métrica": "Observaciones Positivas", "Valor": positiveRemarks.toString() },
        { "Métrica": "Observaciones Negativas", "Valor": negativeRemarks.toString() },
        { "Métrica": "Clases Dictadas", "Valor": totalCourseClasses.toString() }
    ];

    return {
        grades: gradesData,
        attendance: attendanceData,
        remarks: remarksData,
        statistics: statisticsData
    };
}

export async function getStudentCompleteDataAction(studentId: string, courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    // Get course info with full hierarchy for THIS student
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            gradeCategories: {
                include: {
                    groups: {
                        include: {
                            items: true
                        }
                    }
                },
                orderBy: { createdAt: 'asc' }
            },
            enrollments: {
                where: { userId: studentId, status: "APPROVED" },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profile: {
                                select: {
                                    nombres: true,
                                    apellido: true
                                }
                            }
                        }
                    }
                }
            },

            attendances: {
                where: { userId: studentId },
                orderBy: { date: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            },
            remarks: {
                where: { userId: studentId },
                orderBy: { date: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            }
        }
    });

    if (!course || course.enrollments.length === 0) {
        throw new Error("Enrollment not found");
    }

    const teacherName = "Sin asignación";
    const courseName = course.title;
    const enrollment = course.enrollments[0];
    const student = enrollment.user;

    // Calculate total course classes globally for this course
    // We need to fetch all attendances and remarks for the whole course, not just the student
    const allCourseData = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
            attendances: { select: { date: true } },
            remarks: { select: { date: true } }
        }
    });
    const uniqueDates = new Set([
        ...(allCourseData?.attendances || []).map(a => new Date(a.date).toISOString().split('T')[0]),
        ...(allCourseData?.remarks || []).map(r => new Date(r.date).toISOString().split('T')[0])
    ]);
    const totalCourseClasses = uniqueDates.size;

    // Hierarchical Grade Calculation
    const categoriesGrades = course.gradeCategories.map((cat: any) => {
        const groupGrades = cat.groups.map((group: any) => {
            let totalWeightedGrade = 0;
            let totalWeight = 0;

            const itemsWithGrades = group.items.map((item: any) => {
                const grade = 0;
                const title = "Nota Manual";

                totalWeightedGrade += grade * item.weight;
                totalWeight += item.weight;

                return {
                    id: item.id,
                    title,
                    weight: item.weight,
                    grade
                };
            });

            const groupAvg = totalWeight > 0 ? totalWeightedGrade / totalWeight : 0;
            return {
                id: group.id,
                name: group.name,
                weight: group.weight,
                grade: groupAvg,
                items: itemsWithGrades
            };
        });

        let catWeightedGrade = 0;
        let catTotalWeight = 0;

        groupGrades.forEach((g: any) => {
            catWeightedGrade += g.grade * g.weight;
            catTotalWeight += g.weight;
        });

        const catAvg = catTotalWeight > 0 ? catWeightedGrade / catTotalWeight : 0;
        return {
            id: cat.id,
            name: cat.name,
            weight: cat.weight,
            grade: catAvg,
            groups: groupGrades
        };
    });

    let finalWeightedGrade = 0;
    let finalTotalWeight = 0;

    categoriesGrades.forEach((c: any) => {
        finalWeightedGrade += c.grade * c.weight;
        finalTotalWeight += c.weight;
    });

    const finalGrade = finalTotalWeight > 0 ? finalWeightedGrade / finalTotalWeight : 0;

    return {
        studentId: student.id,
        studentName: formatName(student.name, student.profile),
        studentEmail: student.email,
        courseName,
        teacherName,
        averageGrade: finalGrade,
        totalCourseClasses,
        categories: categoriesGrades,
        attendances: course.attendances.map((a: any) => ({
            id: a.id,
            date: a.date,
            status: a.status,
            justification: a.justification,
            justificationUrl: a.justificationUrl
        })),
        remarks: course.remarks.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            type: r.type,
            date: r.date
        })),
        // For Excel compatibility
        _hierarchy: categoriesGrades,
        "ID": student.id,
        "Estudiante": formatName(student.name, student.profile),
        "Correo": student.email,
        "Nota Final": finalGrade.toFixed(2)
    };
}

export async function getCourseStudentsCompleteDataAction(courseId: string) {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized");
    }

    // Get course info with full hierarchy
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            gradeCategories: {
                include: {
                    groups: {
                        include: {
                            items: {
                                orderBy: { createdAt: 'asc' }
                            }
                        },
                        orderBy: { createdAt: 'asc' }
                    }
                },
                orderBy: { createdAt: 'asc' }
            },
            enrollments: {
                where: { status: "APPROVED" },
                include: {
                    user: {
                        include: {
                            profile: true
                        }
                    }
                },
                orderBy: {
                    user: { name: 'asc' }
                }
            },
            attendances: {
                orderBy: { date: 'desc' },
                include: {
                    user: true
                }
            },
            remarks: {
                orderBy: { date: 'desc' },
                include: {
                    user: true
                }
            },

        }
    });

    if (!course) {
        throw new Error("Course not found");
    }

    const { calculateFinalGrade } = await import("@/lib/gradeUtils");
    const teacherName = "Sin asignación";
    const courseName = course.title;

    const uniqueDates = new Set([
        ...course.attendances.map((a: any) => new Date(a.date).toISOString().split('T')[0]),
        ...course.remarks.map((r: any) => new Date(r.date).toISOString().split('T')[0])
    ]);
    const totalCourseClasses = uniqueDates.size;

    // Process data per student
    const studentsData = course.enrollments.map((enrollment: any) => {
        const student = enrollment.user;
        const studentId = student.id;

        // Hierarchical Grade Calculation using unified utility
        const { finalGrade, categoriesGrades } = calculateFinalGrade(
            studentId, 
            course.gradeCategories as any, 
            []
        );

        // Filter Attendances
        const studentAttendances = course.attendances
            .filter((a: any) => a.userId === studentId)
            .map((a: any) => ({
                id: a.id,
                date: a.date,
                status: a.status,
                justification: a.justification,
                justificationUrl: a.justificationUrl
            }));

        // Filter Remarks
        const studentRemarks = course.remarks
            .filter((r: any) => r.userId === studentId)
            .map((r: any) => ({
                id: r.id,
                name: r.title,
                title: r.title,
                description: r.description,
                type: r.type,
                date: r.date
            }));

        return {
            studentName: formatName(student.name, student.profile),
            courseName,
            teacherName,
            averageGrade: finalGrade,
            totalCourseClasses,
            categories: categoriesGrades, // Hierarchical data for PDF
            attendances: studentAttendances,
            remarks: studentRemarks
        };
    });

    return studentsData;
}


