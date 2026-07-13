"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DayOfWeek } from "@/generated/prisma/client";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

async function requireAdmin() {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
    }
    return session;
}

async function requireAdminOrObserver() {
    const session = await getSession();
    if (!session || (session.user.role !== "admin" && session.user.role !== "observer")) {
        throw new Error("Unauthorized: Admin or Observer access required");
    }
    return session;
}

// ============ PROGRAM CRUD ============

export async function getProgramsAction() {
    const session = await requireAdminOrObserver();
    const isObserver = session.user.role === "observer";
    const whereClause = isObserver ? {
        teachers: {
            some: {
                id: session.user.id
            }
        }
    } : {};

    return await prisma.program.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
            teachers: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    availabilityLocked: true,
                    qualifiedCoursesLocked: true,
                    availabilities: true,
                    profile: true,
                    qualifiedCourses: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            },
            periods: {
                orderBy: { order: "asc" },
                include: {
                    courses: {
                        where: { groupId: null },
                        orderBy: { order: "asc" },
                        include: {
                            group: true,
                            schedules: true,
                            teacher: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    icon: true
                                }
                            },
                            _count: {
                                select: {
                                    enrollments: true
                                }
                            }
                        }
                    }
                }
            },
            groups: {
                orderBy: { createdAt: "asc" },
                include: {
                    environment: true,
                    students: {
                        orderBy: { name: "asc" },
                        include: {
                            profile: true
                        }
                    },
                    teachers: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            icon: true
                        }
                    },
                    period: {
                        include: {
                            courses: {
                                where: { groupId: null }
                            }
                        }
                    },
                    courses: {
                        include: {
                            group: true,
                            schedules: true,
                            teacher: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    icon: true
                                }
                            }
                        }
                    }
                }
            },
            environments: {
                orderBy: { createdAt: "desc" }
            }
        }
    });
}

export async function createProgramAction(data: { name: string; description?: string; startDate?: Date | null; endDate?: Date | null; scheduleTitle?: string | null; maxTeacherHours?: number | null }) {
    const session = await requireAdmin();
    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre del programa debe tener al menos 2 caracteres");
    }

    const program = await prisma.program.create({
        data: {
            name: data.name,
            description: data.description || null,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            scheduleTitle: data.scheduleTitle || null,
            maxTeacherHours: data.maxTeacherHours ?? 40,
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "OTHER",
        entityId: program.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Programa de formación creado: ${program.name}`,
        metadata: { name: program.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return program;
}

export async function updateProgramAction(id: string, data: { name: string; description?: string; startDate?: Date | null; endDate?: Date | null; scheduleTitle?: string | null; maxTeacherHours?: number | null }) {
    const session = await requireAdmin();
    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre del programa debe tener al menos 2 caracteres");
    }

    const program = await prisma.program.update({
        where: { id },
        data: {
            name: data.name,
            description: data.description || null,
            startDate: data.startDate !== undefined ? data.startDate : undefined,
            endDate: data.endDate !== undefined ? data.endDate : undefined,
            scheduleTitle: data.scheduleTitle !== undefined ? data.scheduleTitle : undefined,
            maxTeacherHours: data.maxTeacherHours !== undefined ? (data.maxTeacherHours ?? 40) : undefined,
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: program.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Programa de formación actualizado: ${program.name}`,
        metadata: { name: program.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return program;
}

export async function deleteProgramAction(id: string) {
    const session = await requireAdmin();

    const program = await prisma.program.findUnique({
        where: { id },
        select: { name: true }
    });

    const result = await prisma.program.delete({
        where: { id }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "OTHER",
        entityId: id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Programa de formación eliminado: ${program?.name || "Desconocido"}`,
        metadata: { name: program?.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return result;
}

// ============ PERIOD CRUD ============

export async function createPeriodAction(data: { name: string; description?: string; programId: string }) {
    const session = await requireAdmin();
    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre del periodo debe tener al menos 2 caracteres");
    }
    if (!data.programId) {
        throw new Error("El programa es obligatorio");
    }

    const period = await prisma.period.create({
        data: {
            name: data.name,
            description: data.description || null,
            programId: data.programId,
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "OTHER",
        entityId: period.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Periodo creado: ${period.name}`,
        metadata: { name: period.name, programId: period.programId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return period;
}

export async function updatePeriodAction(id: string, data: { name: string; description?: string }) {
    const session = await requireAdmin();
    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre del periodo debe tener al menos 2 caracteres");
    }

    const period = await prisma.period.update({
        where: { id },
        data: {
            name: data.name,
            description: data.description || null,
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: period.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Periodo actualizado: ${period.name}`,
        metadata: { name: period.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return period;
}

export async function deletePeriodAction(id: string) {
    const session = await requireAdmin();

    const period = await prisma.period.findUnique({
        where: { id },
        select: { name: true }
    });

    const result = await prisma.period.delete({
        where: { id }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "OTHER",
        entityId: id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Periodo eliminado: ${period?.name || "Desconocido"}`,
        metadata: { name: period?.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return result;
}

// ============ GROUP CRUD ============

export async function getGroupsAction() {
    const session = await requireAdminOrObserver();
    const isObserver = session.user.role === "observer";
    const whereClause = isObserver ? {
        program: {
            teachers: {
                some: {
                    id: session.user.id
                }
            }
        }
    } : {};

    return await prisma.group.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
            program: true,
            students: {
                include: {
                    profile: true
                }
            }
        }
    });
}

export async function createGroupAction(data: { name: string; description?: string; programId: string; startTime?: string; endTime?: string; periodId?: string; categoria?: string }) {
    const session = await requireAdmin();
    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre del grupo debe tener al menos 2 caracteres");
    }
    if (!data.programId) {
        throw new Error("El programa es obligatorio");
    }
    if (!data.startTime) {
        throw new Error("La hora de inicio es obligatoria");
    }
    if (!data.endTime) {
        throw new Error("La hora de fin es obligatoria");
    }

    const group = await prisma.group.create({
        data: {
            name: data.name,
            description: data.description || null,
            programId: data.programId,
            startTime: data.startTime,
            endTime: data.endTime,
            periodId: data.periodId || null,
            categoria: data.categoria || "LECTIVA",
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "GROUP",
        entityId: group.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Grupo creado: ${group.name}`,
        metadata: { name: group.name, programId: group.programId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return group;
}

export async function updateGroupAction(id: string, data: { name: string; description?: string; startTime?: string; endTime?: string; periodId?: string; categoria?: string }) {
    const session = await requireAdmin();
    if (!data.name || data.name.trim().length < 2) {
        throw new Error("El nombre del grupo debe tener al menos 2 caracteres");
    }
    if (!data.startTime) {
        throw new Error("La hora de inicio es obligatoria");
    }
    if (!data.endTime) {
        throw new Error("La hora de fin es obligatoria");
    }

    const group = await prisma.group.update({
        where: { id },
        data: {
            name: data.name,
            description: data.description || null,
            startTime: data.startTime,
            endTime: data.endTime,
            periodId: data.periodId || null,
            categoria: data.categoria || "LECTIVA",
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "GROUP",
        entityId: group.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Grupo actualizado: ${group.name}`,
        metadata: { name: group.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return group;
}

export async function deleteGroupAction(id: string) {
    const session = await requireAdmin();

    const group = await prisma.group.findUnique({
        where: { id },
        select: { name: true }
    });

    const result = await prisma.group.delete({
        where: { id }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "GROUP",
        entityId: id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Grupo eliminado: ${group?.name || "Desconocido"}`,
        metadata: { name: group?.name },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return result;
}

export async function updateGroupPeriodAction(groupId: string, periodId: string | null) {
    const session = await requireAdmin();

    await prisma.$transaction(async (tx) => {
        // Update the group's period
        await tx.group.update({
            where: { id: groupId },
            data: { periodId }
        });

        // Update all courses associated with this group to belong to the new period
        // This ensures we only keep ONE schedule per group, moving it to the active period
        if (periodId) {
            await tx.course.updateMany({
                where: { groupId },
                data: { periodId }
            });
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "GROUP",
        entityId: groupId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Período del grupo actualizado a: ${periodId || "Ninguno"}`,
        metadata: { periodId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return { success: true };
}

// ============ STUDENT ASSIGNMENT TO GROUP ============

export async function assignStudentToGroupAction(studentId: string, groupId: string | null) {
    const session = await requireAdmin();

    const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { name: true }
    });

    const result = await prisma.user.update({
        where: { id: studentId },
        data: { groupId }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: studentId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: groupId
            ? `Estudiante "${student?.name || 'Desconocido'}" asignado al grupo ID: ${groupId}`
            : `Estudiante "${student?.name || 'Desconocido'}" desasignado de su grupo`,
        metadata: { studentId, groupId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return result;
}

// ============ COURSE ASSIGNMENT TO PERIOD ============

export async function assignCourseToPeriodAction(courseId: string, periodId: string | null) {
    const session = await requireAdmin();

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true }
    });

    const result = await prisma.course.update({
        where: { id: courseId },
        data: { periodId }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "COURSE",
        entityId: courseId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: periodId
            ? `Materia "${course?.title || 'Desconocido'}" asignado al periodo ID: ${periodId}`
            : `Materia "${course?.title || 'Desconocido'}" removido de su periodo`,
        metadata: { courseId, periodId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return result;
}

export async function reorderCoursesAction(orderedIds: string[]) {
    await requireAdmin();
    
    if (!orderedIds || orderedIds.length === 0) return;

    await prisma.$transaction(
        orderedIds.map((id, index) =>
            prisma.course.update({
                where: { id },
                data: { order: index }
            })
        )
    );

    revalidatePath("/dashboard/admin/courses");
}

export async function reorderPeriodsAction(orderedIds: string[]) {
    await requireAdmin();
    
    if (!orderedIds || orderedIds.length === 0) return;

    await prisma.$transaction(
        orderedIds.map((id, index) =>
            prisma.period.update({
                where: { id },
                data: { order: index }
            })
        )
    );

    revalidatePath("/dashboard/admin/courses");
}

export async function registerStudentManualAction(data: {
    groupId: string;
    identificacion: string;
    nombres: string;
    apellido: string;
    email: string;
    telefono?: string;
}) {
    const session = await requireAdmin();

    if (!data.groupId) throw new Error("El grupo es obligatorio");
    if (!data.identificacion) throw new Error("El número de documento es obligatorio");
    if (!data.nombres) throw new Error("El nombre es obligatorio");
    if (!data.apellido) throw new Error("El apellido es obligatorio");
    if (!data.email) throw new Error("El correo electrónico es obligatorio");

    // Normalizar
    const emailNorm = data.email.trim().toLowerCase();
    const idenNorm = data.identificacion.trim();

    // Validar duplicados en la base de datos
    const existingUser = await prisma.user.findUnique({
        where: { email: emailNorm }
    });
    if (existingUser) {
        throw new Error(`Ya existe un usuario registrado con el correo: ${emailNorm}`);
    }

    const existingProfile = await prisma.profile.findFirst({
        where: { identificacion: idenNorm }
    });
    if (existingProfile) {
        throw new Error(`Ya existe un perfil registrado con el número de documento: ${idenNorm}`);
    }

    // Hash de la contraseña (contraseña inicial es el número de documento)
    const { hashPassword } = await import("better-auth/crypto");
    const hashedPassword = await hashPassword(idenNorm);
    const studentId = crypto.randomUUID();

    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                id: studentId,
                email: emailNorm,
                name: `${data.nombres.trim()} ${data.apellido.trim()}`,
                role: "student",
                emailVerified: true,
                groupId: data.groupId,
                accounts: {
                    create: {
                        id: crypto.randomUUID(),
                        accountId: crypto.randomUUID(),
                        providerId: "credential",
                        password: hashedPassword,
                    }
                }
            }
        });

        const profile = await tx.profile.create({
            data: {
                userId: studentId,
                identificacion: idenNorm,
                nombres: data.nombres.trim(),
                apellido: data.apellido.trim(),
                telefono: data.telefono?.trim() || null,
                dataProcessingConsent: false,
                dataProcessingConsentDate: null,
            }
        });

        return { user, profile };
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "USER",
        entityId: studentId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Estudiante registrado manualmente en grupo: ${data.nombres} ${data.apellido} (${emailNorm})`,
        metadata: { email: emailNorm, groupId: data.groupId, identificacion: idenNorm },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return result;
}

interface StudentImportRow {
    identificacion: string;
    nombres: string;
    apellido: string;
    email: string;
    telefono?: string;
}

export async function registerStudentsBulkAction(groupId: string, list: StudentImportRow[]) {
    const session = await requireAdmin();
    if (!groupId) throw new Error("El grupo es obligatorio");
    if (!list || list.length === 0) throw new Error("La lista de estudiantes está vacía");

    // Filtrar duplicados dentro del mismo archivo excel e identificar registros incompletos
    const seenIdentificacions = new Set<string>();
    const seenEmails = new Set<string>();
    const uniqueInputList: StudentImportRow[] = [];
    const skippedErrors: string[] = [];

    for (let index = 0; index < list.length; index++) {
        const item = list[index];
        const rowNum = index + 2; // Asumiendo fila 1 encabezados, 1-based index
        const iden = item.identificacion?.toString().trim();
        const email = item.email?.toString().trim().toLowerCase();

        if (!iden) {
            skippedErrors.push(`Fila ${rowNum}: Omitido por número de identificación faltante.`);
            continue;
        }

        if (!email) {
            skippedErrors.push(`Fila ${rowNum} (Identificación: ${iden}): Omitido por correo electrónico faltante.`);
            continue;
        }

        if (seenIdentificacions.has(iden)) {
            skippedErrors.push(`Fila ${rowNum} (Identificación: ${iden}): Omitido por identificación duplicada dentro del archivo.`);
            continue;
        }

        if (seenEmails.has(email)) {
            skippedErrors.push(`Fila ${rowNum} (Correo: ${email}): Omitido por correo electrónico duplicado dentro del archivo.`);
            continue;
        }

        seenIdentificacions.add(iden);
        seenEmails.add(email);

        uniqueInputList.push({
            identificacion: iden,
            email: email,
            nombres: item.nombres?.toString().trim() || "Estudiante",
            apellido: item.apellido?.toString().trim() || "",
            telefono: item.telefono?.toString().trim() || undefined,
        });
    }

    if (uniqueInputList.length === 0) {
        return {
            successCount: 0,
            skippedCount: list.length,
            errors: ["No se encontraron estudiantes válidos con datos únicos en el archivo.", ...skippedErrors]
        };
    }

    // Verificar colisiones de correos e identificaciones en base de datos
    const emailsToCheck = uniqueInputList.map(u => u.email).filter(Boolean);
    const idensToCheck = uniqueInputList.map(u => u.identificacion).filter(Boolean);

    const existingUsers = await prisma.user.findMany({
        where: { email: { in: emailsToCheck } },
        select: { email: true }
    });
    const existingProfiles = await prisma.profile.findMany({
        where: { identificacion: { in: idensToCheck } },
        select: { identificacion: true }
    });

    const existingEmailsSet = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const existingIdensSet = new Set(existingProfiles.map(p => p.identificacion));

    const finalImportList: StudentImportRow[] = [];

    for (const student of uniqueInputList) {
        let isCollision = false;

        if (existingIdensSet.has(student.identificacion)) {
            skippedErrors.push(`Identificación ya registrada en el sistema: ${student.identificacion}`);
            isCollision = true;
        }

        if (existingEmailsSet.has(student.email)) {
            skippedErrors.push(`Correo ya registrado en el sistema: ${student.email}`);
            isCollision = true;
        }

        if (!isCollision) {
            finalImportList.push(student);
        }
    }

    if (finalImportList.length === 0) {
        return {
            successCount: 0,
            skippedCount: list.length,
            errors: ["Todos los estudiantes del archivo ya se encuentran registrados en el sistema.", ...skippedErrors]
        };
    }

    const { hashPassword } = await import("better-auth/crypto");
    let successCount = 0;
    const errors: string[] = [];

    for (const student of finalImportList) {
        try {
            const studentId = crypto.randomUUID();
            const password = student.identificacion;
            const hashedPassword = await hashPassword(password);

            await prisma.$transaction(async (tx) => {
                await tx.user.create({
                    data: {
                        id: studentId,
                        email: student.email,
                        name: `${student.nombres} ${student.apellido}`.trim(),
                        role: "student",
                        emailVerified: true,
                        groupId,
                        accounts: {
                            create: {
                                id: crypto.randomUUID(),
                                accountId: crypto.randomUUID(),
                                providerId: "credential",
                                password: hashedPassword,
                            }
                        }
                    }
                });

                await tx.profile.create({
                    data: {
                        userId: studentId,
                        identificacion: student.identificacion,
                        nombres: student.nombres,
                        apellido: student.apellido,
                        telefono: student.telefono || null,
                        dataProcessingConsent: false,
                        dataProcessingConsentDate: null,
                    }
                });
            });
            successCount++;
        } catch (e: any) {
            errors.push(`Error registrando a ${student.nombres} ${student.apellido}: ${e.message}`);
        }
    }

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "USER",
        entityId: groupId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Importación masiva de estudiantes. Registrados con éxito: ${successCount}. Omitidos/Errores: ${list.length - successCount}.`,
        metadata: { groupId, successCount, totalInput: list.length },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");

    return {
        successCount,
        skippedCount: list.length - successCount,
        errors: [...skippedErrors, ...errors]
    };
}



export async function assignTeacherToProgramAction(programId: string, teacherId: string, assign: boolean) {
    const session = await requireAdmin();

    const teacher = await prisma.user.findUnique({
        where: { id: teacherId }
    });

    if (!teacher || teacher.role !== "teacher") {
        throw new Error("El usuario seleccionado debe ser un profesor");
    }

    if (assign) {
        await prisma.program.update({
            where: { id: programId },
            data: {
                teachers: {
                    connect: { id: teacherId }
                }
            }
        });
    } else {
        await prisma.program.update({
            where: { id: programId },
            data: {
                teachers: {
                    disconnect: { id: teacherId }
                }
            }
        });
    }

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: programId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `${assign ? "Profesor asociado" : "Profesor desasociado"} del programa: ${teacher.name} (${teacher.email})`,
        metadata: { programId, teacherId, assign },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return { success: true };
}

export async function registerTeacherManualAction(data: {
    programId?: string;
    identificacion: string;
    nombres: string;
    apellido: string;
    email: string;
    telefono?: string;
}) {
    try {
        const session = await requireAdmin();

        if (!data.identificacion) return { success: false, error: "El número de documento es obligatorio" };
        if (!data.nombres) return { success: false, error: "El nombre es obligatorio" };
        if (!data.apellido) return { success: false, error: "El apellido es obligatorio" };
        if (!data.email) return { success: false, error: "El correo electrónico es obligatorio" };

        // Normalizar
        const emailNorm = data.email.trim().toLowerCase();
        const idenNorm = data.identificacion.trim();

        // Validar duplicados en la base de datos
        const existingUser = await prisma.user.findUnique({
            where: { email: emailNorm }
        });
        if (existingUser) {
            return { success: false, error: "Usuario existente" };
        }

        const existingProfile = await prisma.profile.findFirst({
            where: { identificacion: idenNorm }
        });
        if (existingProfile) {
            return { success: false, error: `Ya existe un perfil registrado con el número de documento: ${idenNorm}` };
        }

        // Hash de la contraseña (contraseña inicial es el número de documento)
        const { hashPassword } = await import("better-auth/crypto");
        const hashedPassword = await hashPassword(idenNorm);
        const teacherId = crypto.randomUUID();

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    id: teacherId,
                    email: emailNorm,
                    name: `${data.nombres.trim()} ${data.apellido.trim()}`,
                    role: "teacher",
                    emailVerified: true,
                    ...(data.programId ? {
                        programs: {
                            connect: { id: data.programId }
                        }
                    } : {}),
                    accounts: {
                        create: {
                            id: crypto.randomUUID(),
                            accountId: crypto.randomUUID(),
                            providerId: "credential",
                            password: hashedPassword,
                        }
                    }
                }
            });

            const profile = await tx.profile.create({
                data: {
                    userId: teacherId,
                    identificacion: idenNorm,
                    nombres: data.nombres.trim(),
                    apellido: data.apellido.trim(),
                    telefono: data.telefono?.trim() || null,
                    dataProcessingConsent: true,
                    dataProcessingConsentDate: new Date(),
                }
            });

            return { user, profile };
        });

        const { auditLogger } = await import("../services/auditLogger");
        await auditLogger.log({
            action: "CREATE",
            entity: "USER",
            entityId: teacherId,
            userId: session.user.id,
            userName: session.user.name || "Admin",
            userRole: "admin",
            description: data.programId
                ? `Profesor registrado manualmente en programa: ${data.nombres} ${data.apellido} (${emailNorm})`
                : `Profesor registrado manualmente en el banco global: ${data.nombres} ${data.apellido} (${emailNorm})`,
            metadata: { email: emailNorm, programId: data.programId, identificacion: idenNorm },
            success: true,
        });

        revalidatePath("/dashboard/admin/courses");
        return { success: true, ...result };
    } catch (error: any) {
        console.error("Error in registerTeacherManualAction:", error);
        return { success: false, error: error.message || "Error al registrar profesor" };
    }
}

interface TeacherImportRow {
    identificacion: string;
    nombres: string;
    apellido: string;
    email: string;
    telefono?: string;
}

export async function registerTeachersBulkAction(programId: string | null | undefined, list: TeacherImportRow[]) {
    const session = await requireAdmin();
    if (!list || list.length === 0) throw new Error("La lista de profesores está vacía");

    // Filtrar duplicados dentro del mismo archivo excel e identificar registros incompletos
    const seenIdentificacions = new Set<string>();
    const seenEmails = new Set<string>();
    const uniqueInputList: TeacherImportRow[] = [];
    const skippedErrors: string[] = [];

    for (let index = 0; index < list.length; index++) {
        const item = list[index];
        const rowNum = index + 2; // Asumiendo fila 1 encabezados, 1-based index
        const iden = item.identificacion?.toString().trim();
        const email = item.email?.toString().trim().toLowerCase();

        if (!iden) {
            skippedErrors.push(`Fila ${rowNum}: Omitido por número de identificación faltante.`);
            continue;
        }

        if (!email) {
            skippedErrors.push(`Fila ${rowNum} (Identificación: ${iden}): Omitido por correo electrónico faltante.`);
            continue;
        }

        if (seenIdentificacions.has(iden)) {
            skippedErrors.push(`Fila ${rowNum} (Identificación: ${iden}): Omitido por identificación duplicada dentro del archivo.`);
            continue;
        }

        if (seenEmails.has(email)) {
            skippedErrors.push(`Fila ${rowNum} (Correo: ${email}): Omitido por correo electrónico duplicado dentro del archivo.`);
            continue;
        }

        seenIdentificacions.add(iden);
        seenEmails.add(email);

        uniqueInputList.push({
            identificacion: iden,
            email: email,
            nombres: item.nombres?.toString().trim() || "Profesor",
            apellido: item.apellido?.toString().trim() || "",
            telefono: item.telefono?.toString().trim() || undefined,
        });
    }

    if (uniqueInputList.length === 0) {
        return {
            successCount: 0,
            skippedCount: list.length,
            errors: ["No se encontraron profesores válidos con datos únicos en el archivo.", ...skippedErrors]
        };
    }

    // Verificar colisiones de correos e identificaciones en base de datos
    const emailsToCheck = uniqueInputList.map(u => u.email).filter(Boolean);
    const idensToCheck = uniqueInputList.map(u => u.identificacion).filter(Boolean);

    const existingUsers = await prisma.user.findMany({
        where: { email: { in: emailsToCheck } },
        select: { email: true }
    });
    const existingProfiles = await prisma.profile.findMany({
        where: { identificacion: { in: idensToCheck } },
        select: { identificacion: true }
    });

    const existingEmailsSet = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const existingIdensSet = new Set(existingProfiles.map(p => p.identificacion));

    const finalImportList: TeacherImportRow[] = [];

    for (const teacher of uniqueInputList) {
        let isCollision = false;

        if (existingIdensSet.has(teacher.identificacion)) {
            skippedErrors.push(`Identificación ya registrada en el sistema: ${teacher.identificacion}`);
            isCollision = true;
        }

        if (existingEmailsSet.has(teacher.email)) {
            skippedErrors.push(`Correo ya registrado en el sistema: ${teacher.email}`);
            isCollision = true;
        }

        if (!isCollision) {
            finalImportList.push(teacher);
        }
    }

    if (finalImportList.length === 0) {
        return {
            successCount: 0,
            skippedCount: list.length,
            errors: ["Todos los profesores del archivo ya se encuentran registrados en el sistema.", ...skippedErrors]
        };
    }

    const { hashPassword } = await import("better-auth/crypto");
    let successCount = 0;
    const errors: string[] = [];

    for (const teacher of finalImportList) {
        try {
            const teacherId = crypto.randomUUID();
            const password = teacher.identificacion;
            const hashedPassword = await hashPassword(password);

            await prisma.$transaction(async (tx) => {
                await tx.user.create({
                    data: {
                        id: teacherId,
                        email: teacher.email,
                        name: `${teacher.nombres} ${teacher.apellido}`.trim(),
                        role: "teacher",
                        emailVerified: true,
                        ...(programId ? {
                            programs: {
                                connect: { id: programId }
                            }
                        } : {}),
                        accounts: {
                            create: {
                                id: crypto.randomUUID(),
                                accountId: crypto.randomUUID(),
                                providerId: "credential",
                                password: hashedPassword,
                            }
                        }
                    }
                });

                await tx.profile.create({
                    data: {
                        userId: teacherId,
                        identificacion: teacher.identificacion,
                        nombres: teacher.nombres,
                        apellido: teacher.apellido,
                        telefono: teacher.telefono || null,
                        dataProcessingConsent: true,
                        dataProcessingConsentDate: new Date(),
                    }
                });
            });
            successCount++;
        } catch (e: any) {
            errors.push(`Error registrando a ${teacher.nombres} ${teacher.apellido}: ${e.message}`);
        }
    }

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "USER",
        entityId: programId || "global",
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: programId 
            ? `Importación masiva de profesores. Registrados con éxito: ${successCount}. Omitidos/Errores: ${list.length - successCount}.`
            : `Importación masiva de profesores al banco global. Registrados con éxito: ${successCount}. Omitidos/Errores: ${list.length - successCount}.`,
        metadata: { programId, successCount, totalInput: list.length },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");

    return {
        successCount,
        skippedCount: list.length - successCount,
        errors: [...skippedErrors, ...errors]
    };
}

export async function updateTeacherAction(data: {
    id: string;
    identificacion: string;
    nombres: string;
    apellido: string;
    email: string;
    telefono?: string;
}) {
    const session = await requireAdmin();

    if (!data.id) throw new Error("ID del profesor es requerido");
    if (!data.identificacion) throw new Error("El número de documento es obligatorio");
    if (!data.nombres) throw new Error("El nombre es obligatorio");
    if (!data.apellido) throw new Error("El apellido es obligatorio");
    if (!data.email) throw new Error("El correo electrónico es obligatorio");

    const emailNorm = data.email.trim().toLowerCase();
    const idenNorm = data.identificacion.trim();

    // Check email unique collision
    const otherUser = await prisma.user.findFirst({
        where: {
            email: emailNorm,
            id: { not: data.id }
        }
    });
    if (otherUser) {
        throw new Error(`Ya existe otro usuario registrado con el correo: ${emailNorm}`);
    }

    // Check identification unique collision
    const otherProfile = await prisma.profile.findFirst({
        where: {
            identificacion: idenNorm,
            userId: { not: data.id }
        }
    });
    if (otherProfile) {
        throw new Error(`Ya existe otro perfil registrado con el número de documento: ${idenNorm}`);
    }

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: data.id },
            data: {
                email: emailNorm,
                name: `${data.nombres.trim()} ${data.apellido.trim()}`,
            }
        });

        await tx.profile.upsert({
            where: { userId: data.id },
            update: {
                identificacion: idenNorm,
                nombres: data.nombres.trim(),
                apellido: data.apellido.trim(),
                telefono: data.telefono?.trim() || null,
            },
            create: {
                userId: data.id,
                identificacion: idenNorm,
                nombres: data.nombres.trim(),
                apellido: data.apellido.trim(),
                telefono: data.telefono?.trim() || null,
                dataProcessingConsent: true,
                dataProcessingConsentDate: new Date(),
            }
        });
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: data.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Profesor actualizado: ${data.nombres} ${data.apellido} (${emailNorm})`,
        metadata: { email: emailNorm, identificacion: idenNorm },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return { success: true };
}

export async function assignGroupsToTeacherAction(teacherId: string, groupIds: string[]) {
    const session = await requireAdmin();

    await prisma.user.update({
        where: { id: teacherId },
        data: {
            groupsTaught: {
                set: groupIds.map(id => ({ id }))
            }
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "USER",
        entityId: teacherId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Grupos asignados al profesor. Total de grupos: ${groupIds.length}`,
        metadata: { teacherId, groupIds },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return { success: true };
}

export async function getTeacherGroupsAction(teacherId: string) {
    await requireAdminOrObserver();
    const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        select: {
            groupsTaught: {
                select: { id: true, name: true }
            }
        }
    });
    return teacher?.groupsTaught || [];
}

export async function scheduleGroupCourseAction(data: {
    title: string;
    description?: string;
    groupId: string;
    periodId: string;
    teacherId?: string;
    weeklyHours?: number;
    schedules: Array<{
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
    }>;
}) {
    const session = await requireAdmin();

    const draftTeachersCount = await prisma.user.count({
        where: {
            role: "teacher",
            OR: [
                { availabilityLocked: false },
                { qualifiedCoursesLocked: false }
            ]
        }
    });

    if (draftTeachersCount > 0) {
        throw new Error(`No se pueden programar horarios. Hay ${draftTeachersCount} profesor(es) con disponibilidad o materias en borrador.`);
    }

    const conflictsResult = await checkScheduleConflictsAction({
        groupId: data.groupId,
        schedules: data.schedules,
        teacherId: data.teacherId || undefined
    });

    if (conflictsResult.hasHardConflicts) {
        throw new Error(`No es posible programar la clase por colisiones en el horario: ${conflictsResult.conflicts.join(" | ")}`);
    }

    const course = await prisma.course.create({
        data: {
            title: data.title,
            description: data.description,
            groupId: data.groupId,
            periodId: data.periodId,
            teacherId: data.teacherId || null,
            weeklyHours: data.weeklyHours || 0,
            schedules: {
                create: data.schedules.map(s => ({
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                }))
            }
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "COURSE",
        entityId: course.id,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Asignatura programada para grupo ID: ${data.groupId}`,
        metadata: { courseId: course.id, groupId: data.groupId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return course;
}

export async function updateGroupCourseScheduleAction(courseId: string, data: {
    title: string;
    description?: string;
    teacherId?: string;
    weeklyHours?: number;
    schedules: Array<{
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
    }>;
}) {
    const session = await requireAdmin();

    const draftTeachersCount = await prisma.user.count({
        where: {
            role: "teacher",
            OR: [
                { availabilityLocked: false },
                { qualifiedCoursesLocked: false }
            ]
        }
    });

    if (draftTeachersCount > 0) {
        throw new Error(`No se pueden actualizar horarios. Hay ${draftTeachersCount} profesor(es) con disponibilidad o materias en borrador.`);
    }

    const currentCourse = await prisma.course.findUnique({
        where: { id: courseId },
        select: { groupId: true }
    });

    if (!currentCourse || !currentCourse.groupId) {
        throw new Error("Clase no encontrada");
    }

    const conflictsResult = await checkScheduleConflictsAction({
        courseId,
        groupId: currentCourse.groupId,
        schedules: data.schedules,
        teacherId: data.teacherId || undefined
    });

    if (conflictsResult.hasHardConflicts) {
        throw new Error(`No es posible actualizar la clase por colisiones en el horario: ${conflictsResult.conflicts.join(" | ")}`);
    }

    await prisma.$transaction(async (tx) => {
        await tx.course.update({
            where: { id: courseId },
            data: {
                title: data.title,
                description: data.description,
                teacherId: data.teacherId || null,
                weeklyHours: data.weeklyHours || 0,
            }
        });

        await tx.courseSchedule.deleteMany({
            where: { courseId }
        });

        if (data.schedules.length > 0) {
            await tx.courseSchedule.createMany({
                data: data.schedules.map(s => ({
                    courseId,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime
                }))
            });
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "COURSE",
        entityId: courseId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Programación y horarios actualizados para materia ID: ${courseId}`,
        metadata: { courseId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return { success: true };
}

export async function deleteGroupCourseAction(courseId: string) {
    const session = await requireAdmin();

    await prisma.course.delete({
        where: { id: courseId }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "COURSE",
        entityId: courseId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Programación de asignatura eliminada: Materia ID ${courseId}`,
        metadata: { courseId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return { success: true };
}

export async function checkScheduleConflictsAction(data: {
    courseId?: string;
    groupId: string;
    teacherId?: string;
    schedules: Array<{
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
    }>;
}) {
    await requireAdminOrObserver();

    const groupConflicts: string[] = [];
    const DAYS_SPANISH: Record<DayOfWeek, string> = {
        MONDAY: "Lunes",
        TUESDAY: "Martes",
        WEDNESDAY: "Miércoles",
        THURSDAY: "Jueves",
        FRIDAY: "Viernes",
        SATURDAY: "Sábado",
        SUNDAY: "Domingo"
    };

    // 1. Check internal overlaps/duplicates in the input list
    for (let i = 0; i < data.schedules.length; i++) {
        const s1 = data.schedules[i];
        for (let j = i + 1; j < data.schedules.length; j++) {
            const s2 = data.schedules[j];
            if (s1.dayOfWeek === s2.dayOfWeek) {
                const start1 = s1.startTime;
                const end1 = s1.endTime;
                const start2 = s2.startTime;
                const end2 = s2.endTime;

                const overlap = (start1 >= start2 && start1 < end2) ||
                                (end1 > start2 && end1 <= end2) ||
                                (start1 <= start2 && end1 >= end2);
                if (overlap) {
                    const dayLabel = DAYS_SPANISH[s1.dayOfWeek] || s1.dayOfWeek;
                    groupConflicts.push(`Hay un traslape interno en la lista de horarios para el día ${dayLabel}: ${start1}-${end1} y ${start2}-${end2}.`);
                }
            }
        }
    }

    // 2. Check if schedule is within group's shift/jornada
    const group = await prisma.group.findUnique({
        where: { id: data.groupId },
        select: { name: true, startTime: true, endTime: true }
    });

    if (group) {
        const grpStart = group.startTime || "08:00";
        const grpEnd = group.endTime || "12:00";

        const [startH, startM] = grpStart.split(":").map(Number);
        const [endH, endM] = grpEnd.split(":").map(Number);
        const grpStartMin = startH * 60 + startM;
        let grpEndMin = endH * 60 + endM;
        if (grpEndMin < grpStartMin) grpEndMin += 1440;

        for (const slot of data.schedules) {
            const [schStartH, schStartM] = slot.startTime.split(":").map(Number);
            const [schEndH, schEndM] = slot.endTime.split(":").map(Number);
            let schStartMin = schStartH * 60 + schStartM;
            let schEndMin = schEndH * 60 + schEndM;
            if (schStartMin < grpStartMin) schStartMin += 1440;
            if (schEndMin < grpStartMin) schEndMin += 1440;

            if (schStartMin < grpStartMin || schEndMin > grpEndMin) {
                const dayLabel = DAYS_SPANISH[slot.dayOfWeek] || slot.dayOfWeek;
                groupConflicts.push(`El horario programado para el ${dayLabel} (${slot.startTime} a ${slot.endTime}) está fuera de la jornada del grupo (${grpStart} a ${grpEnd}).`);
            }
        }
    }

    // 3. Check conflicts with other group courses in DB
    for (const slot of data.schedules) {
        const groupConflict = await prisma.course.findFirst({
            where: {
                groupId: data.groupId,
                id: data.courseId ? { not: data.courseId } : undefined,
                schedules: {
                    some: {
                        dayOfWeek: slot.dayOfWeek,
                        OR: [
                            { startTime: { lte: slot.startTime }, endTime: { gt: slot.startTime } },
                            { startTime: { lt: slot.endTime }, endTime: { gte: slot.endTime } },
                            { startTime: { gte: slot.startTime }, endTime: { lte: slot.endTime } }
                        ]
                    }
                }
            },
            select: { title: true }
        });
        if (groupConflict) {
            const dayLabel = DAYS_SPANISH[slot.dayOfWeek] || slot.dayOfWeek;
            groupConflicts.push(`El grupo ya tiene la asignatura "${groupConflict.title}" programada el día ${dayLabel} entre ${slot.startTime} y ${slot.endTime}.`);
        }
    }

    const teacherBusyConflicts: string[] = [];
    const availabilityConflicts: string[] = [];

    if (data.teacherId) {
        // 4. Check if teacher has another course overlapping
        for (const slot of data.schedules) {
            const teacherConflict = await prisma.course.findFirst({
                where: {
                    teacherId: data.teacherId,
                    id: data.courseId ? { not: data.courseId } : undefined,
                    schedules: {
                        some: {
                            dayOfWeek: slot.dayOfWeek,
                            OR: [
                                { startTime: { lte: slot.startTime }, endTime: { gt: slot.startTime } },
                                { startTime: { lt: slot.endTime }, endTime: { gte: slot.endTime } },
                                { startTime: { gte: slot.startTime }, endTime: { lte: slot.endTime } }
                            ]
                        }
                    }
                },
                select: { title: true }
            });
            if (teacherConflict) {
                const dayLabel = DAYS_SPANISH[slot.dayOfWeek] || slot.dayOfWeek;
                teacherBusyConflicts.push(`El profesor ya tiene la asignatura "${teacherConflict.title}" programada el día ${dayLabel} entre ${slot.startTime} y ${slot.endTime}.`);
            }
        }

        // 5. Check if slot is within teacher availability
        const teacherAvailabilities = await prisma.teacherAvailability.findMany({
            where: { teacherId: data.teacherId }
        });

        if (teacherAvailabilities.length > 0) {
            for (const slot of data.schedules) {
                const dayAvailabilities = teacherAvailabilities.filter(a => a.dayOfWeek === slot.dayOfWeek);
                
                const [schStartH, schStartM] = slot.startTime.split(":").map(Number);
                const [schEndH, schEndM] = slot.endTime.split(":").map(Number);
                const schStartMin = schStartH * 60 + schStartM;
                const schEndMin = schEndH * 60 + schEndM;

                let isCovered = false;
                for (const avail of dayAvailabilities) {
                    const [avStartH, avStartM] = avail.startTime.split(":").map(Number);
                    const [avEndH, avEndM] = avail.endTime.split(":").map(Number);
                    const avStartMin = avStartH * 60 + avStartM;
                    const avEndMin = avEndH * 60 + avEndM;
                    
                    if (schStartMin >= avStartMin && schEndMin <= avEndMin) {
                        isCovered = true;
                        break;
                    }
                }

                if (!isCovered) {
                    const dayLabel = DAYS_SPANISH[slot.dayOfWeek] || slot.dayOfWeek;
                    availabilityConflicts.push(`El profesor no tiene disponibilidad registrada para cubrir el horario del día ${dayLabel} de ${slot.startTime} a ${slot.endTime}.`);
                }
            }
        }
    }

    const conflicts = [...groupConflicts, ...teacherBusyConflicts, ...availabilityConflicts];
    const hasHardConflicts = conflicts.length > 0;

    return {
        hasHardConflicts,
        hasAvailabilityConflicts: availabilityConflicts.length > 0,
        groupConflicts,
        teacherBusyConflicts,
        availabilityConflicts,
        hasConflicts: hasHardConflicts,
        conflicts
    };
}

export async function assignTeacherToCourseAction(courseId: string, teacherId: string | null) {
    const session = await requireAdmin();

    if (teacherId) {
        const currentCourse = await prisma.course.findUnique({
            where: { id: courseId },
            include: { schedules: true }
        });

        if (currentCourse && currentCourse.groupId) {
            const conflictsResult = await checkScheduleConflictsAction({
                courseId,
                groupId: currentCourse.groupId,
                teacherId,
                schedules: currentCourse.schedules.map(s => ({
                    dayOfWeek: s.dayOfWeek as DayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime
                }))
            });

            if (conflictsResult.hasHardConflicts) {
                throw new Error(`No es posible asignar al profesor por cruces de horario o disponibilidad: ${conflictsResult.conflicts.join(" | ")}`);
            }
        }
    }

    const course = await prisma.course.update({
        where: { id: courseId },
        data: {
            teacherId
        },
        include: {
            teacher: {
                select: { name: true }
            }
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "COURSE",
        entityId: courseId,
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: teacherId
            ? `Profesor "${course.teacher?.name || 'Desconocido'}" asignado a la materia: ${course.title}`
            : `Profesor desasignado de la materia: ${course.title}`,
        metadata: { courseId, teacherId },
        success: true,
    });

    revalidatePath("/dashboard/admin/courses");
    return course;
}

export async function getQualifiedTeachersAction(programId: string, courseTitle: string) {
    await requireAdminOrObserver();
    const program = await prisma.program.findUnique({
        where: { id: programId },
        select: {
            teachers: {
                where: {
                    role: "teacher",
                    qualifiedCourses: {
                        some: {
                            title: {
                                equals: courseTitle,
                                mode: "insensitive"
                            }
                        }
                    }
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    icon: true,
                    availabilities: {
                        select: {
                            dayOfWeek: true,
                            startTime: true,
                            endTime: true
                        }
                    }
                }
            }
        }
    });

    return program?.teachers || [];
}

export async function updateGroupEnvironmentAction(groupId: string, environmentId: string | null) {
    await requireAdmin();
    const session = await getSession();
    
    // Check if the environment is already assigned to another group
    if (environmentId) {
        const alreadyAssigned = await prisma.group.findFirst({
            where: {
                environmentId,
                id: { not: groupId }
            }
        });
        if (alreadyAssigned) {
            throw new Error(`El ambiente ya está asignado al grupo: ${alreadyAssigned.name}`);
        }
    }

    const group = await prisma.group.update({
        where: { id: groupId },
        data: {
            environmentId: environmentId || null
        },
        include: {
            environment: true
        }
    });

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "GROUP",
        entityId: group.id,
        userId: session!.user.id,
        userName: session!.user.name || "Admin",
        userRole: "admin",
        description: environmentId 
            ? `Ambiente "${group.environment?.name}" asignado al grupo: ${group.name}`
            : `Ambiente desasignado del grupo: ${group.name}`,
        metadata: { groupId, environmentId },
        success: true,
    });

    revalidatePath("/dashboard/admin/schedule");
    return group;
}

export async function saveScheduleBatchAction(pendingChanges: any[]) {
    const session = await requireAdmin();
    
    // Process UPDATE_SETTINGS outside of the transaction since it's global and uses a different action/module
    const settingsChanges = pendingChanges.filter(ch => ch.type === "UPDATE_SETTINGS");
    if (settingsChanges.length > 0) {
        const { updateSettingsAction } = await import("@/app/actions/settings");
        for (const ch of settingsChanges) {
            await updateSettingsAction({ 
                schedulesPublished: ch.schedulesPublished,
            });
            if (ch.programId) {
                await prisma.program.update({
                    where: { id: ch.programId },
                    data: {
                        startDate: ch.scheduleStartDate ? new Date(ch.scheduleStartDate + "T12:00:00") : null,
                        endDate: ch.scheduleEndDate ? new Date(ch.scheduleEndDate + "T12:00:00") : null,
                        scheduleTitle: ch.scheduleTitle ?? null,
                        maxTeacherHours: ch.maxTeacherHours ?? 40,
                    }
                });
            }
        }
    }

    const transactionChanges = pendingChanges.filter(ch => ch.type !== "UPDATE_SETTINGS");

    if (transactionChanges.length > 0) {
        await prisma.$transaction(async (tx) => {
            for (const ch of transactionChanges) {
                if (ch.type === "DELETE") {
                    await tx.course.delete({ where: { id: ch.courseId } });
                } else if (ch.type === "CREATE") {
                    let description = ch.description;
                    if (!description && ch.periodId) {
                        const template = await tx.course.findFirst({
                            where: {
                                title: ch.title,
                                periodId: ch.periodId,
                                groupId: null
                            },
                            select: { description: true }
                        });
                        description = template?.description || "";
                    }
                    await tx.course.create({
                        data: {
                            title: ch.title,
                            description: description || "",
                            groupId: ch.groupId,
                            periodId: ch.periodId,
                            teacherId: ch.teacherId || null,
                            schedules: {
                                create: ch.schedules.map((s: any) => ({
                                    dayOfWeek: s.dayOfWeek,
                                    startTime: s.startTime,
                                    endTime: s.endTime,
                                }))
                            }
                        }
                    });
                } else if (ch.type === "UPDATE") {
                    await tx.course.update({
                        where: { id: ch.courseId },
                        data: {
                            title: ch.title,
                            teacherId: ch.teacherId || null,
                        }
                    });
                    await tx.courseSchedule.deleteMany({ where: { courseId: ch.courseId } });
                    if (ch.schedules && ch.schedules.length > 0) {
                        await tx.courseSchedule.createMany({
                            data: ch.schedules.map((s: any) => ({
                                courseId: ch.courseId,
                                dayOfWeek: s.dayOfWeek,
                                startTime: s.startTime,
                                endTime: s.endTime
                            }))
                        });
                    }
                } else if (ch.type === "ASSIGN_ENV") {
                    await tx.group.update({
                        where: { id: ch.groupId },
                        data: { environmentId: ch.envId || null }
                    });
                } else if (ch.type === "ASSIGN_PERIOD") {
                    await tx.group.update({
                        where: { id: ch.groupId },
                        data: { periodId: ch.periodId || null }
                    });
                }
            }
        });
    }

    const { auditLogger } = await import("../services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "COURSE",
        entityId: "BATCH",
        userId: session.user.id,
        userName: session.user.name || "Admin",
        userRole: "admin",
        description: `Guardado en lote de programación de horarios. Cambios procesados: ${pendingChanges.length}`,
        metadata: { changesCount: pendingChanges.length },
        success: true,
    });

    revalidatePath("/dashboard/admin/schedule");
    revalidatePath("/dashboard/admin/courses");
    return { success: true };
}
