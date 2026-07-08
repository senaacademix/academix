"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { adminService } from "@/features/admin/services/adminService";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

// Middleware to check admin role
async function requireAdmin() {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
    }
    return session;
}

// ============ DASHBOARD ============
export async function getAdminDashboardStatsAction() {
    await requireAdmin();
    return await adminService.getSystemStats();
}

export async function getRecentActivityAction(limit?: number) {
    await requireAdmin();
    return await adminService.getRecentActivity(limit);
}

// ============ USER MANAGEMENT ============
export async function getAllUsersAction(filters?: {
    role?: "teacher" | "student" | "admin";
    search?: string;
    courseId?: string;
    groupId?: string;
    programId?: string;
    limit?: number;
    offset?: number;
}) {
    await requireAdmin();
    return await adminService.getAllUsers(filters);
}

export async function getAllCoursesForFilterAction() {
    await requireAdmin();
    return await adminService.getAllCoursesSimple();
}

export async function createUserAction(data: {
    email: string;
    name: string;
    role: "teacher" | "admin" | "student";
    password: string;
    groupId?: string;
    identificacion?: string;
    nombres?: string;
    apellido?: string;
    telefono?: string;
}) {
    await requireAdmin();


    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
    });

    if (existingUser) {
        throw new Error("Ya existe un usuario con este correo electrónico");
    }

    if (data.identificacion) {
        const existingProfile = await prisma.profile.findFirst({
            where: { identificacion: data.identificacion }
        });
        if (existingProfile) {
            throw new Error(`Ya existe un perfil registrado con el número de documento: ${data.identificacion}`);
        }
    }

    // Hash password
    const { hashPassword } = await import("better-auth/crypto");
    const hashedPassword = await hashPassword(data.password);

    // Create user with account
    const user = await prisma.user.create({
        data: {
            id: crypto.randomUUID(),
            email: data.email.trim().toLowerCase(),
            name: data.name.trim(),
            role: data.role,
            groupId: data.groupId || null,
            emailVerified: true,
            profile: (data.identificacion || data.nombres || data.apellido) ? {
                create: {
                    identificacion: data.identificacion || "",
                    nombres: data.nombres || data.name.split(" ")[0] || "",
                    apellido: data.apellido || data.name.split(" ").slice(1).join(" ") || "",
                    telefono: data.telefono || null,
                    dataProcessingConsent: true,
                    dataProcessingConsentDate: new Date(),
                }
            } : undefined,
            accounts: {
                create: {
                    id: crypto.randomUUID(),
                    accountId: crypto.randomUUID(),
                    providerId: "credential",
                    password: hashedPassword,
                }
            }
        },
        include: {
            profile: true,
            group: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    const session = await getSession();
    await auditLogger.log({
        action: "CREATE",
        entity: "USER",
        entityId: user.id,
        userId: session?.user.id,
        userName: session?.user.name || "Admin",
        userRole: "admin",
        description: `Usuario ${data.role} creado: ${data.name} (${data.email})`,
        metadata: { email: data.email, role: data.role },
        success: true,
    });

    revalidatePath("/dashboard/admin/users");
    return user;
}

export async function getUserDetailsAction(userId: string) {
    await requireAdmin();
    return await adminService.getUserDetails(userId);
}


export async function updateUserRoleAction(userId: string, newRole: "teacher" | "student" | "admin") {
    const session = await requireAdmin();

    // Get user info before update
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, role: true }
    });

    const result = await adminService.updateUserRole(userId, newRole);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: userId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Rol de usuario actualizado: ${user?.name || "Usuario"} de ${user?.role} a ${newRole}`,
        metadata: { oldRole: user?.role, newRole, email: user?.email },
        success: true,
    });

    revalidatePath("/dashboard/admin/users");
    return result;
}


export async function toggleUserBanAction(userId: string, banned: boolean) {
    const session = await requireAdmin();

    // Get user info before update
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
    });

    const result = await adminService.toggleUserBan(userId, banned);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: userId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Usuario ${banned ? 'baneado' : 'desbaneado'}: ${user?.name || "Usuario"} (${user?.email})`,
        metadata: { banned, email: user?.email },
        success: true,
    });

    revalidatePath("/dashboard/admin/users");
    return result;
}



export async function deleteUserAction(userId: string) {
    const session = await requireAdmin();

    // Get user info before deletion
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, role: true }
    });

    const result = await adminService.deleteUser(userId);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "USER",
        entityId: userId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Usuario eliminado: ${user?.name || "Usuario"} (${user?.email || "Email desconocido"}) - Rol: ${user?.role}`,
        metadata: { email: user?.email, role: user?.role },
        success: true,
    });

    revalidatePath("/dashboard/admin/users");
    return result;
}


// ============ COURSE MANAGEMENT ============
export async function getAllCoursesAdminAction(filters?: {
    status?: 'active' | 'archived' | 'all';
    search?: string;
    limit?: number;
    offset?: number;
}) {
    await requireAdmin();
    return await adminService.getAllCoursesAdmin(filters);
}

export async function getCourseDetailsAdminAction(courseId: string) {
    return await adminService.getCourseDetailsAdmin(courseId);
}


// reassignCourseTeacherAction removed - courses are no longer linked to teachers






// ============ BULK OPERATIONS ============
export async function bulkArchiveCoursesAction(courseIds: string[]) {
    await requireAdmin();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const courses = await prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { groupId: true }
    });

    const groupIds = courses.map(c => c.groupId).filter(Boolean) as string[];

    const results = await prisma.group.updateMany({
        where: { id: { in: groupIds } },
        data: { endDate: yesterday }
    });

    revalidatePath("/dashboard/admin/courses");
    return results;
}

export async function bulkDeleteUsersAction(userIds: string[]) {
    await requireAdmin();

    const results = await Promise.all(
        userIds.map(id => adminService.deleteUser(id))
    );

    revalidatePath("/dashboard/admin/users");
    return results;
}

// ============ SYSTEM SETTINGS ============
export async function getSystemSettingsAction() {
    await requireAdmin();



    let settings = await prisma.systemSettings.findUnique({
        where: { id: "settings" }
    });

    if (!settings) {
        settings = await prisma.systemSettings.create({
            data: {
                id: "settings"
            }
        });
    }
return {
        ...settings,
        institutionName: settings.institutionName,
        institutionLogo: settings.institutionLogo,
        institutionHeroImage: settings.institutionHeroImage,
        footerText: settings.footerText
    };
}


export async function updateSystemSettingsAction(data: {
    footerText?: string;
    appThemeMode?: string;
    appThemeColor?: string;
    appAllowThemeColorChange?: boolean;
    appCodeTheme?: string;
    appAllowCodeThemeChange?: boolean;
}) {
    const session = await requireAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
        geminiApiKeyMode: "USER", // Siempre forzar modo por usuario
        footerText: data.footerText,
        appThemeMode: data.appThemeMode,
        appThemeColor: data.appThemeColor,
        appAllowThemeColorChange: data.appAllowThemeColorChange,
        appCodeTheme: data.appCodeTheme,
        appAllowCodeThemeChange: data.appAllowCodeThemeChange,
    };

    const settings = await prisma.systemSettings.upsert({
        where: { id: "settings" },
        update: updateData,
        create: {
            id: "settings",
            ...updateData
        }
    });

    // 🎯 AUDIT LOG
    const { auditLogger, clearAuditCache } = await import("@/features/admin/services/auditLogger");
    
    // Clear the memory cache since settings just changed
    clearAuditCache();

    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: "system-settings",
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Configuración del sistema actualizada por el administrador`,
        metadata: {},
        success: true,
    });

    revalidatePath("/dashboard/admin/settings");
    return settings;
}




// ============ AUDIT LOGS ============

export async function deleteCourseAction(courseId: string) {
    const session = await requireAdmin();
    const { courseService } = await import("@/features/teacher/services/courseService");
    const { auditLogger } = await import("@/features/admin/services/auditLogger");

    // Get course info first for logging
    const course = await courseService.getCourseById(courseId);

    // Delete course
    await courseService.deleteCourse(courseId);

    // Log deletion
    await auditLogger.logCourseDelete(
        courseId,
        course?.title || "Materia desconocido",
        session.user.id,
        session.user.name || "Admin"
    );

    revalidatePath("/dashboard/admin/courses");
return { success: true };
}

export async function resetUserPasswordToDocAction(userId: string) {
    const session = await requireAdmin();

    // 1. Find user and their profile to get the identification
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
    });

    if (!user) {
        throw new Error("Usuario no encontrado");
    }

    if (!user.profile || !user.profile.identificacion) {
        throw new Error("El usuario no tiene un número de identificación registrado en su perfil");
    }

    const docNumber = user.profile.identificacion.trim();
    if (!docNumber) {
        throw new Error("El número de identificación está vacío");
    }

    // 2. Hash the identification number
    const { hashPassword } = await import("better-auth/crypto");
    const hashedPassword = await hashPassword(docNumber);

    // 3. Find and update the Account record or create it if not present
    const existingAccount = await prisma.account.findFirst({
        where: { userId: user.id, providerId: "credential" }
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
                userId: user.id,
                password: hashedPassword
            }
        });
    }

    // 4. Create an audit log
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: user.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Contraseña restablecida al número de documento para: ${user.name} (${user.email})`,
        metadata: { email: user.email },
        success: true,
    });
return { success: true };
}

// ============ ANALYTICS ============
export async function getComprehensiveGroupAnalyticsAction(groupId: string) {
    await requireAdmin();

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
                    teacher: { select: { name: true } },
                    schedules: { select: { dayOfWeek: true } },
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
        select: { status: true, date: true, userId: true, arrivalTime: true, courseId: true }
    });

    // Fetch remarks
    const remarks = await prisma.remark.findMany({
        where: { courseId: { in: courseIds } },
        select: { type: true, date: true, userId: true, courseId: true }
    });

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

    // Calculate start and end dates for the group class interval
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startDate = group.startDate ? new Date(group.startDate) : threeMonthsAgo;
    const endDate = group.endDate ? new Date(group.endDate) : new Date();

    const dayIndexMap: Record<string, number> = {
        SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
    };

    const gStart = group.startTime || "08:00";
    const gEnd = group.endTime || "12:00";
    const [gsh, gsm] = gStart.split(":").map(Number);
    const [geh, gem] = gEnd.split(":").map(Number);
    const groupDailyHours = Math.max(0, (geh * 60 + gem - (gsh * 60 + gsm)) / 60);

    const courseTotalClassesMap: Record<string, number> = {};
    let globalTotalCourseClasses = 0;

    group.courses.forEach(c => {
        const scheduledDays = c.schedules?.map((s: any) => s.dayOfWeek) || [];
        let classDaysCount = 0;
        
        const cur = new Date(startDate);
        cur.setUTCHours(12, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(12, 0, 0, 0);
        
        // If no schedules are explicitly set, assume Mon-Fri (SENA default)
        const activeScheduledDays = scheduledDays.length > 0 
            ? scheduledDays 
            : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

        while (cur <= end) {
            const jsDay = cur.getUTCDay();
            const isClassDay = activeScheduledDays.some((d: string) => dayIndexMap[d] === jsDay);
            if (isClassDay) classDaysCount++;
            cur.setUTCDate(cur.getUTCDate() + 1);
        }

        // Ensure we don't undercount if they took attendance on unscheduled days
        const cAtts = attendances.filter(a => a.courseId === c.id);
        const allDateStrings = new Set<string>();
        cAtts.forEach(a => {
            const ds = new Date(a.date).toISOString().split('T')[0];
            allDateStrings.add(ds);
        });
        
        const maxDays = Math.max(classDaysCount, allDateStrings.size);
        courseTotalClassesMap[c.id] = maxDays;
        globalTotalCourseClasses += maxDays;
    });

    const totalCourseClasses = globalTotalCourseClasses;

    // Calculate individual student metrics
    const studentMetrics = group.students.map(student => {
        const sAttendances = attendances.filter(a => a.userId === student.id);
        const sRemarks = remarks.filter(r => r.userId === student.id);
        
        let totalScore = 0;
        let gradesCount = 0;
        const courseGrades: Record<string, number> = {};
        const courseAttendances: Record<string, { present: number, absent: number, late: number, absentHours: number, lateHours: number, totalClasses: number }> = {};
        const courseRemarks: Record<string, { attention: number, commendation: number }> = {};

        let globalAbsent = 0;
        let globalLate = 0;
        let globalPresent = 0;
        let globalAbsentHours = 0;
        let globalLateHours = 0;
        
        let globalAttention = 0;
        let globalCommendation = 0;

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
            const cAtts = sAttendances.filter(a => a.courseId === c.id);
            const cAbsent = cAtts.filter(a => a.status === 'ABSENT').length;
            const cLate = cAtts.filter(a => a.status === 'LATE').length;
            
            const cTotalClasses = courseTotalClassesMap[c.id];
            const cPresent = Math.max(0, cTotalClasses - cAbsent - cLate);
            
            const cAbsentHours = cAbsent * groupDailyHours;
            let cLateHours = 0;
            cAtts.filter(a => a.status === 'LATE').forEach(rec => {
                if (!rec.arrivalTime) return;
                let timePart = "";
                try {
                    const dateObj = new Date(rec.arrivalTime);
                    if (!isNaN(dateObj.getTime())) {
                        timePart = `${dateObj.getUTCHours().toString().padStart(2, '0')}:${dateObj.getUTCMinutes().toString().padStart(2, '0')}`;
                    } else {
                        timePart = String(rec.arrivalTime);
                    }
                } catch {
                    timePart = String(rec.arrivalTime);
                }
                const [ah, am] = timePart.split(":").map(Number);
                if (!isNaN(ah) && !isNaN(am)) {
                    const lateMinutes = (ah * 60 + am) - (gsh * 60 + gsm);
                    if (lateMinutes > 0) {
                        cLateHours += lateMinutes / 60;
                    }
                }
            });
            courseAttendances[c.id] = { present: cPresent, absent: cAbsent, late: cLate, absentHours: cAbsentHours, lateHours: cLateHours, totalClasses: cTotalClasses };

            globalAbsent += cAbsent;
            globalLate += cLate;
            globalPresent += cPresent;
            globalAbsentHours += cAbsentHours;
            globalLateHours += cLateHours;

            // Remarks
            const cRems = sRemarks.filter(r => r.courseId === c.id);
            const cAtten = cRems.filter(r => r.type === 'ATTENTION').length;
            const cComm = cRems.filter(r => r.type === 'COMMENDATION').length;
            courseRemarks[c.id] = { attention: cAtten, commendation: cComm };
            
            globalAttention += cAtten;
            globalCommendation += cComm;
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
            attendances: { present: globalPresent, absent: globalAbsent, late: globalLate, absentHours: globalAbsentHours, lateHours: globalLateHours },
            remarks: { attention: globalAttention, commendation: globalCommendation }
        };
    });

    return {
        studentMetrics,
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
        coursesStats,
        coursesList: group.courses.map(c => ({ 
            id: c.id, 
            title: c.title,
            teacherName: c.teacher?.name || "No asignado"
        }))
    };
}

export async function getStudentBehaviorAnalyticsAction(filters?: {
    programId?: string;
    groupId?: string;
}) {
    await requireAdmin();

    const whereClause: any = {
        role: "student"
    };

    if (filters?.groupId && filters.groupId !== "ALL") {
        whereClause.groupId = filters.groupId;
    } else if (filters?.programId && filters.programId !== "ALL") {
        whereClause.group = {
            programId: filters.programId
        };
    }

    // Query students
    const students = await prisma.user.findMany({
        where: whereClause,
        include: {
            group: {
                include: {
                    program: true
                }
            },
            studentGrades: {
                include: {
                    activity: true
                }
            },
            attendances: true,
            remarks: true,
            profile: true
        }
    });

    // Process students metrics
    const studentData = students.map(student => {
        // Average Grade
        const scores = student.studentGrades.map(g => g.score);
        const avgGrade = scores.length > 0 ? Number((scores.reduce((acc, s) => acc + s, 0) / scores.length).toFixed(2)) : 0;

        // Attendances
        const totalAttendances = student.attendances.length;
        const absentCount = student.attendances.filter(a => a.status === "ABSENT").length;
        const lateCount = student.attendances.filter(a => a.status === "LATE").length;
        const absenceRate = totalAttendances > 0 ? Number(((absentCount / totalAttendances) * 100).toFixed(1)) : 0;

        // Remarks
        const attentionCount = student.remarks.filter(r => r.type === "ATTENTION").length;
        const citationCount = student.remarks.filter(r => r.type === "CITATION").length;
        const commendationCount = student.remarks.filter(r => r.type === "COMMENDATION").length;

        return {
            id: student.id,
            name: student.name,
            email: student.email,
            identificacion: student.profile?.identificacion || "N/A",
            groupName: student.group?.name || "Sin Grupo",
            programName: student.group?.program?.name || "Sin Programa",
            avgGrade,
            absenceRate,
            absentCount,
            lateCount,
            totalAttendances,
            attentionCount,
            citationCount,
            commendationCount,
            remarksCount: student.remarks.length
        };
    });

    // 1. Top Performing Students (avg grade >= 3.0 and zero warnings/citations)
    const topStudents = [...studentData]
        .filter(s => s.avgGrade >= 3.0 && (s.attentionCount + s.citationCount) === 0)
        .sort((a, b) => b.avgGrade - a.avgGrade)
        .slice(0, 10);

    // 2. Students at Academic Risk (avg grade < 3.0 & has grades)
    const academicRiskStudents = [...studentData]
        .filter(s => s.avgGrade > 0 && s.avgGrade < 3.0)
        .sort((a, b) => a.avgGrade - b.avgGrade);

    // 3. Students at Absence Risk (absence rate > 15%)
    const attendanceRiskStudents = [...studentData]
        .filter(s => s.absenceRate > 15)
        .sort((a, b) => b.absenceRate - a.absenceRate);

    // 4. Students with Disciplinary Attention / Citation
    const disciplinaryRiskStudents = [...studentData]
        .filter(s => (s.attentionCount + s.citationCount) > 0)
        .sort((a, b) => (b.attentionCount + b.citationCount) - (a.attentionCount + a.citationCount));

    return {
        topStudents,
        academicRiskStudents,
        attendanceRiskStudents,
        disciplinaryRiskStudents,
        totalStudentsCount: studentData.length
    };
}

// ============ GEMINI API USAGE ============
