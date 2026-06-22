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

// ============ TRAINING ENVIRONMENTS CRUD ============

export async function getEnvironmentsAction() {
    await requireAdmin();
    return await prisma.trainingEnvironment.findMany({
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
        },
    });

    revalidatePath("/dashboard/admin/environments");
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

    revalidatePath("/dashboard/admin/environments");
    return env;
}

export async function deleteEnvironmentAction(id: string) {
    await requireAdmin();

    await prisma.trainingEnvironment.delete({ where: { id } });

    revalidatePath("/dashboard/admin/environments");
    return { success: true };
}
