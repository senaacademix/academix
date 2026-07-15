"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sendPushNotification } from "@/lib/push-notifications";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

function processExpiredPlans(plans: any[]) {
    const now = new Date();
    
    // 1. Revert automatic grades (0.0) for plans where the teacher countersign is still missing
    const toRevertIds = plans
        .filter(p => p.finalGrade === 0 && p.planScore === 0 && !p.teacherSignedDocUrl)
        .map(p => p.id);

    if (toRevertIds.length > 0) {
        prisma.improvementPlan.updateMany({
            where: { id: { in: toRevertIds } },
            data: {
                finalGrade: null,
                planScore: null
            }
        }).catch(err => console.error("Error reverting invalid auto-grades:", err));
    }

    // 2. Find plans to auto-grade to 0.0
    const toUpdateIds = plans
        .filter(p => now > new Date(p.endDate) && !!p.teacherSignedDocUrl && !p.evidenceUrl && p.finalGrade === null)
        .map(p => p.id);

    if (toUpdateIds.length > 0) {
        prisma.improvementPlan.updateMany({
            where: { id: { in: toUpdateIds } },
            data: {
                finalGrade: 0.0,
                planScore: 0.0
            }
        }).catch(err => console.error("Error auto-grading expired plans:", err));
    }

    return plans.map(p => {
        if (p.finalGrade === 0 && p.planScore === 0 && !p.teacherSignedDocUrl) {
            return {
                ...p,
                finalGrade: null,
                planScore: null
            };
        }
        if (now > new Date(p.endDate) && !!p.teacherSignedDocUrl && !p.evidenceUrl && p.finalGrade === null) {
            return {
                ...p,
                finalGrade: 0.0,
                planScore: 0.0
            };
        }
        return p;
    });
}

export async function getImprovementPlans(targetStudentId?: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autorizado");
    }

    let studentId = session.user.id;
    if (targetStudentId) {
        if (session.user.role !== "teacher" && session.user.role !== "admin" && session.user.id !== targetStudentId) {
            throw new Error("No autorizado");
        }
        studentId = targetStudentId;
    }

    try {
        const plans = await prisma.improvementPlan.findMany({
            where: { 
                studentId,
                ...(session.user.role === "teacher" ? { teacherId: session.user.id } : {})
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: { select: { nombres: true, apellido: true, identificacion: true } }
                    }
                },
                teacher: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { nombres: true, apellido: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        return { success: true, data: processExpiredPlans(plans) };
    } catch (error: any) {
        console.error("Error al obtener planes de mejoramiento:", error);
        return { success: false, error: error.message || "Error al obtener planes" };
    }
}

export async function getGroupImprovementPlans(groupId: string) {
    const session = await getSession();
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("No autorizado");
    }

    try {
        const plans = await prisma.improvementPlan.findMany({
            where: {
                student: { groupId },
                ...(session.user.role === "teacher" ? { teacherId: session.user.id } : {})
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: { select: { nombres: true, apellido: true, identificacion: true } }
                    }
                },
                teacher: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { nombres: true, apellido: true } }
                    }
                }
            },
            orderBy: [{ studentId: "asc" }, { createdAt: "desc" }]
        });
        return { success: true, data: processExpiredPlans(plans) };
    } catch (error: any) {
        console.error("Error al obtener planes de mejoramiento del grupo:", error);
        return { success: false, error: error.message || "Error al obtener planes" };
    }
}

export async function upsertImprovementPlan(data: {
    id?: string;
    planNumber: string;
    studentId: string;
    teacherDocUrl?: string;
    signedDocUrl?: string;
    teacherSignedDocUrl?: string;
    startDate: Date | string;
    endDate: Date | string;
    observations?: string;
    planScore?: number;
    finalGrade?: number;
    evidenceUrl?: string;
}) {
    const session = await getSession();
    if (!session?.user || session.user.role !== "teacher") {
        throw new Error("No autorizado");
    }

    const {
        id,
        planNumber,
        studentId,
        teacherDocUrl,
        signedDocUrl,
        startDate,
        endDate,
        observations,
        planScore,
        finalGrade,
        evidenceUrl
    } = data;

    try {
        if (id) {
            // Update
            const existing = await prisma.improvementPlan.findUnique({
                where: { id },
                select: { teacherId: true }
            });
            if (!existing || existing.teacherId !== session.user.id) {
                throw new Error("No autorizado a modificar este plan");
            }

            const updated = await prisma.improvementPlan.update({
                where: { id },
                data: {
                    planNumber,
                    studentId,
                    teacherDocUrl: teacherDocUrl || null,
                    signedDocUrl: signedDocUrl || null,
                    teacherSignedDocUrl: data.teacherSignedDocUrl || null,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    observations: observations || null,
                    planScore: planScore !== undefined ? planScore : null,
                    finalGrade: finalGrade !== undefined ? finalGrade : null,
                    evidenceUrl: evidenceUrl || null,
                }
            });

            // Send push notification asynchronously
            (async () => {
                try {
                    await sendPushNotification(studentId, {
                        title: "Plan de Mejoramiento Modificado",
                        body: `Se han registrado actualizaciones en tu plan de mejoramiento ${planNumber}.`,
                        url: "/dashboard/student/records"
                    });
                } catch (err) {
                    console.error("Error sending improvement plan update notification:", err);
                }
            })();

            return { success: true, data: updated };
        } else {
            // Create
            const created = await prisma.improvementPlan.create({
                data: {
                    planNumber,
                    studentId,
                    teacherId: session.user.id,
                    teacherDocUrl: teacherDocUrl || null,
                    signedDocUrl: signedDocUrl || null,
                    teacherSignedDocUrl: data.teacherSignedDocUrl || null,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    observations: observations || null,
                    planScore: planScore !== undefined ? planScore : null,
                    finalGrade: finalGrade !== undefined ? finalGrade : null,
                    evidenceUrl: evidenceUrl || null,
                }
            });

            // Send push notification asynchronously
            (async () => {
                try {
                    await sendPushNotification(studentId, {
                        title: "Nuevo Plan de Mejoramiento",
                        body: `Se ha creado un nuevo plan de mejoramiento (${planNumber}) para ti.`,
                        url: "/dashboard/student/records"
                    });
                } catch (err) {
                    console.error("Error sending improvement plan create notification:", err);
                }
            })();

            return { success: true, data: created };
        }
    } catch (error: any) {
        console.error("Error al guardar plan de mejoramiento:", error);
        return { success: false, error: error.message || "Error al guardar el plan" };
    }
}

export async function deleteImprovementPlan(id: string) {
    const session = await getSession();
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("No autorizado");
    }

    try {
        if (session.user.role === "teacher") {
            const plan = await prisma.improvementPlan.findUnique({
                where: { id },
                select: { teacherId: true }
            });
            if (!plan || plan.teacherId !== session.user.id) {
                throw new Error("No autorizado a eliminar este plan");
            }
        }

        await prisma.improvementPlan.delete({
            where: { id }
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error al eliminar plan de mejoramiento:", error);
        return { success: false, error: error.message || "Error al eliminar el plan" };
    }
}

export async function submitSignedDocument(planId: string, signedDocUrl: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autorizado");
    }

    try {
        const plan = await prisma.improvementPlan.findUnique({
            where: { id: planId }
        });

        if (!plan) {
            throw new Error("Plan de mejoramiento no encontrado");
        }

        // Student can only submit for their own plan
        if (session.user.role === "student" && plan.studentId !== session.user.id) {
            throw new Error("No autorizado");
        }

        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: { signedDocUrl }
        });

        // Send push notification to teacher asynchronously
        if (plan.teacherId) {
            const studentName = session.user.name || "Un aprendiz";
            (async () => {
                try {
                    await sendPushNotification(plan.teacherId, {
                        title: "Plan de Mejoramiento Firmado",
                        body: `El aprendiz ${studentName} ha firmado y cargado el Plan de Mejoramiento ${plan.planNumber}.`,
                        url: "/dashboard/teacher"
                    });
                } catch (err) {
                    console.error("Error sending push notification to teacher on plan signature:", err);
                }
            })();
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al enviar documento firmado:", error);
        return { success: false, error: error.message || "Error al enviar documento" };
    }
}

export async function deleteSignedDocument(planId: string) {
    const session = await getSession();
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("No autorizado");
    }

    try {
        const plan = await prisma.improvementPlan.findUnique({ where: { id: planId } });
        if (!plan) throw new Error("Plan no encontrado");
        if (session.user.role === "teacher" && plan.teacherId !== session.user.id) {
            throw new Error("No autorizado");
        }

        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: { signedDocUrl: null }
        });
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al eliminar documento firmado:", error);
        return { success: false, error: error.message || "Error al eliminar el documento" };
    }
}

export async function submitTeacherSignedDoc(planId: string, teacherSignedDocUrl: string) {
    const session = await getSession();
    if (!session?.user || session.user.role !== "teacher") {
        throw new Error("No autorizado");
    }

    try {
        const plan = await prisma.improvementPlan.findUnique({ where: { id: planId } });
        if (!plan) throw new Error("Plan no encontrado");
        if (plan.teacherId !== session.user.id) throw new Error("Solo el profesor asignado puede firmar el plan");

        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: { teacherSignedDocUrl }
        });
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al subir contrafirma del profesor:", error);
        return { success: false, error: error.message || "Error al guardar" };
    }
}

export async function deleteTeacherSignedDoc(planId: string) {
    const session = await getSession();
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("No autorizado");
    }

    try {
        const plan = await prisma.improvementPlan.findUnique({ where: { id: planId } });
        if (!plan) throw new Error("Plan no encontrado");
        if (session.user.role === "teacher" && plan.teacherId !== session.user.id) {
            throw new Error("No autorizado");
        }

        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: { teacherSignedDocUrl: null }
        });
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al eliminar contrafirma del profesor:", error);
        return { success: false, error: error.message || "Error al eliminar" };
    }
}

export async function markPlanViewed(planId: string) {
    const session = await getSession();
    if (!session?.user || session.user.role !== "student") {
        return { success: false, error: "Only students can mark plans as viewed" };
    }

    try {
        const plan = await prisma.improvementPlan.findUnique({
            where: { id: planId }
        });

        if (!plan || plan.studentId !== session.user.id) {
            return { success: false, error: "Unauthorized" };
        }

        if (plan.viewedAt) {
            return { success: true, alreadyViewed: true }; // already viewed
        }

        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: { viewedAt: new Date() }
        });

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al marcar plan como visto:", error);
        return { success: false, error: error.message || "Error" };
    }
}

export async function submitEvidenceUrl(planId: string, evidenceUrl: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autorizado");
    }

    try {
        const plan = await prisma.improvementPlan.findUnique({
            where: { id: planId }
        });

        if (!plan) {
            throw new Error("Plan de mejoramiento no encontrado");
        }

        if (plan.studentId !== session.user.id) {
            throw new Error("No autorizado");
        }

        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: { evidenceUrl }
        });

        if (plan.teacherId) {
            const studentName = session.user.name || "Un aprendiz";
            (async () => {
                try {
                    await sendPushNotification(plan.teacherId, {
                        title: "Evidencias Cargadas",
                        body: `El aprendiz ${studentName} ha cargado las evidencias para el Plan de Mejoramiento ${plan.planNumber}.`,
                        url: "/dashboard/teacher"
                    });
                } catch (err) {
                    console.error("Error sending push notification to teacher on plan evidence:", err);
                }
            })();
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al subir evidencias:", error);
        return { success: false, error: error.message || "Error al subir evidencias" };
    }
}

export async function deleteEvidenceUrl(planId: string) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("No autorizado");
    }

    try {
        const plan = await prisma.improvementPlan.findUnique({ where: { id: planId } });
        if (!plan) throw new Error("Plan no encontrado");

        const isStudent = session.user.role === "student" && plan.studentId === session.user.id;
        const isTeacher = session.user.role === "teacher" && plan.teacherId === session.user.id;
        const isAdmin = session.user.role === "admin";

        if (!isStudent && !isTeacher && !isAdmin) {
            throw new Error("No autorizado");
        }

        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: { evidenceUrl: null }
        });
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al eliminar evidencias:", error);
        return { success: false, error: error.message || "Error al eliminar" };
    }
}

export async function resetPlanToStep(planId: string, stepNumber: number, reason?: string) {
    const session = await getSession();
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("No autorizado");
    }

    try {
        const plan = await prisma.improvementPlan.findUnique({ where: { id: planId } });
        if (!plan) {
            throw new Error("Plan no encontrado");
        }

        if (session.user.role === "teacher" && plan.teacherId !== session.user.id) {
            throw new Error("No autorizado a modificar este plan");
        }

        const dataUpdate: any = {};
        let stepName = "";

        if (stepNumber <= 1) {
            dataUpdate.signedDocUrl = null;
            dataUpdate.teacherSignedDocUrl = null;
            dataUpdate.evidenceUrl = null;
            dataUpdate.planScore = null;
            dataUpdate.finalGrade = null;
            stepName = "Paso 1: Plan creado";
        } else if (stepNumber === 2) {
            dataUpdate.signedDocUrl = null;
            dataUpdate.teacherSignedDocUrl = null;
            dataUpdate.evidenceUrl = null;
            dataUpdate.planScore = null;
            dataUpdate.finalGrade = null;
            stepName = "Paso 2: Firma del aprendiz";
        } else if (stepNumber === 3) {
            dataUpdate.teacherSignedDocUrl = null;
            dataUpdate.evidenceUrl = null;
            dataUpdate.planScore = null;
            dataUpdate.finalGrade = null;
            stepName = "Paso 3: Firma del docente";
        } else if (stepNumber === 4) {
            dataUpdate.evidenceUrl = null;
            dataUpdate.planScore = null;
            dataUpdate.finalGrade = null;
            stepName = "Paso 4: Evidencias";
        } else if (stepNumber === 5) {
            dataUpdate.planScore = null;
            dataUpdate.finalGrade = null;
            stepName = "Paso 5: Evaluación";
        }

        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: dataUpdate
        });

        (async () => {
            try {
                await sendPushNotification(plan.studentId, {
                    title: "Plan de Mejoramiento Devuelto",
                    body: `El plan ${plan.planNumber} fue devuelto al ${stepName}.${reason ? ` Motivo: ${reason}` : ""}`,
                    url: "/dashboard/student/records"
                });
            } catch (err) {
                console.error("Error sending push notification on plan reset:", err);
            }
        })();

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al restablecer plan de mejoramiento:", error);
        return { success: false, error: error.message || "Error al restablecer the plan" };
    }
}

export async function gradeImprovementPlan(planId: string, grade: number) {
    const session = await getSession();
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("No autorizado");
    }

    if (grade < 0 || grade > 5) {
        throw new Error("La nota debe estar entre 0 y 5.0");
    }

    try {
        const plan = await prisma.improvementPlan.findUnique({
            where: { id: planId }
        });

        if (!plan) {
            throw new Error("Plan de mejoramiento no encontrado");
        }

        if (session.user.role === "teacher" && plan.teacherId !== session.user.id) {
            throw new Error("No autorizado a calificar este plan");
        }

        const isPastEnd = new Date() > new Date(plan.endDate);
        if (!isPastEnd) {
            throw new Error("No se puede calificar el plan hasta que finalice la fecha de entrega");
        }

        const updated = await prisma.improvementPlan.update({
            where: { id: planId },
            data: {
                finalGrade: grade,
                planScore: grade
            }
        });

        (async () => {
            try {
                await sendPushNotification(plan.studentId, {
                    title: "Plan Calificado",
                    body: `Tu Plan de Mejoramiento ${plan.planNumber} ha sido calificado con una nota de ${grade.toFixed(1)}.`,
                    url: "/dashboard/student/records"
                });
            } catch (err) {
                console.error("Error sending push notification on plan grading:", err);
            }
        })();

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error al calificar plan:", error);
        return { success: false, error: error.message || "Error al calificar el plan" };
    }
}

export async function getAllImprovementPlansAdmin() {
    const session = await getSession();
    if (!session?.user || session.user.role !== "admin") {
        throw new Error("No autorizado");
    }

    try {
        const plans = await prisma.improvementPlan.findMany({
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        groupId: true,
                        group: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        profile: { select: { nombres: true, apellido: true, identificacion: true } }
                    }
                },
                teacher: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { nombres: true, apellido: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        const courses = await prisma.course.findMany({
            select: {
                id: true,
                title: true,
                groupId: true,
                teacherId: true
            }
        });

        const processedPlans = processExpiredPlans(plans);

        const courseMap = new Map<string, string>();
        courses.forEach(c => {
            if (c.groupId && c.teacherId) {
                courseMap.set(`${c.groupId}-${c.teacherId}`, c.title);
            }
        });

        const mappedPlans = processedPlans.map(plan => {
            const groupId = plan.student?.groupId || "";
            const teacherId = plan.teacherId;
            const subject = courseMap.get(`${groupId}-${teacherId}`) || "General / Otras asignaturas";
            return {
                ...plan,
                subject
            };
        });

        return { success: true, data: mappedPlans };
    } catch (error: any) {
        console.error("Error al obtener todos los planes para admin:", error);
        return { success: false, error: error.message || "Error al obtener planes" };
    }
}


