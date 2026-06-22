"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

async function requireTeacherOrAdmin() {
    const session = await getSession();
    if (!session || (session.user.role !== "teacher" && session.user.role !== "admin")) {
        throw new Error("Unauthorized: Teacher or Admin access required");
    }
    return session.user;
}
import { revalidatePath } from "next/cache";

export async function getCourseWorkGroups(courseId: string) {
  try {
    const teacherId = (await requireTeacherOrAdmin()).id;
    const groups = await prisma.courseWorkGroup.findMany({
      where: {
        courseId,
        teacherId
      },
      include: {
        students: {
          select: { id: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });
    return { success: true, groups };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCourseWorkGroup(courseId: string, name: string, studentIds: string[]) {
  try {
    const teacherId = (await requireTeacherOrAdmin()).id;
    const group = await prisma.courseWorkGroup.create({
      data: {
        name,
        courseId,
        teacherId,
        students: {
          connect: studentIds.map(id => ({ id }))
        }
      }
    });
    revalidatePath("/dashboard/teacher");
    return { success: true, group };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCourseWorkGroup(groupId: string, name: string, studentIds: string[]) {
  try {
    const teacherId = (await requireTeacherOrAdmin()).id;
    const group = await prisma.courseWorkGroup.update({
      where: {
        id: groupId,
        teacherId // Ensure they own it
      },
      data: {
        name,
        students: {
          set: studentIds.map(id => ({ id }))
        }
      }
    });
    revalidatePath("/dashboard/teacher");
    return { success: true, group };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCourseWorkGroup(groupId: string) {
  try {
    const teacherId = (await requireTeacherOrAdmin()).id;
    await prisma.courseWorkGroup.delete({
      where: {
        id: groupId,
        teacherId
      }
    });
    revalidatePath("/dashboard/teacher");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function syncCourseWorkGroups(courseId: string, groupsData: { id?: string, name: string, studentIds: string[] }[]) {
  try {
    const teacherId = (await requireTeacherOrAdmin()).id;
    
    // Using transaction for safety
    await prisma.$transaction(async (tx) => {
      // 1. Get all current groups
      const existingGroups = await tx.courseWorkGroup.findMany({
        where: { courseId, teacherId }
      });
      const existingIds = existingGroups.map(g => g.id);
      
      // 2. Identify which groups to delete, update, or create
      const incomingIds = groupsData.filter(g => g.id).map(g => g.id);
      const toDelete = existingIds.filter(id => !incomingIds.includes(id));
      
      if (toDelete.length > 0) {
        await tx.courseWorkGroup.deleteMany({
          where: { id: { in: toDelete }, teacherId }
        });
      }
      
      for (const group of groupsData) {
        if (group.id && existingIds.includes(group.id)) {
          // Update
          await tx.courseWorkGroup.update({
            where: { id: group.id },
            data: {
              name: group.name,
              students: {
                set: group.studentIds.map(id => ({ id }))
              }
            }
          });
        } else {
          // Create
          await tx.courseWorkGroup.create({
            data: {
              name: group.name,
              courseId,
              teacherId,
              students: {
                connect: group.studentIds.map(id => ({ id }))
              }
            }
          });
        }
      }
    });
    
    revalidatePath("/dashboard/teacher");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
