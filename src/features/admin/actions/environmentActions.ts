"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

// ============ TRAINING ENVIRONMENTS CRUD ============

export async function getEnvironmentsAction(programId?: string) {
    const session = await requireAdminOrObserver();
    const isObserver = session.user.role === "observer";
    
    const whereClause: any = {};
    if (programId) {
        whereClause.programId = programId;
    }
    if (isObserver) {
        whereClause.program = {
            teachers: {
                some: {
                    id: session.user.id
                }
            }
        };
    }

    return await prisma.trainingEnvironment.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
    });
}

export async function createEnvironmentAction(data: {
    name: string;
    capacity: number;
    location?: string;
    resources?: string[];
    description?: string;
    isActive?: boolean;
    programId: string;
}) {
    await requireAdmin();

    const env = await prisma.trainingEnvironment.create({
        data: {
            name: data.name,
            capacity: data.capacity,
            location: data.location ?? null,
            resources: data.resources ?? [],
            description: data.description ?? null,
            isActive: data.isActive ?? true,
            programId: data.programId,
        },
    });

    revalidatePath("/dashboard/admin/courses");
    return env;
}

export async function updateEnvironmentAction(
    id: string,
    data: {
        name?: string;
        capacity?: number;
        location?: string | null;
        resources?: string[];
        description?: string | null;
        isActive?: boolean;
    }
) {
    await requireAdmin();

    const env = await prisma.trainingEnvironment.update({
        where: { id },
        data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.capacity !== undefined && { capacity: data.capacity }),
            ...(data.location !== undefined && { location: data.location }),
            ...(data.resources !== undefined && { resources: data.resources }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
    });

    revalidatePath("/dashboard/admin/courses");
    return env;
}

export async function deleteEnvironmentAction(id: string) {
    await requireAdmin();

    await prisma.trainingEnvironment.delete({ where: { id } });

    revalidatePath("/dashboard/admin/courses");
    return { success: true };
}
