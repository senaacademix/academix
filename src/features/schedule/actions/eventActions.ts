"use server";

import prisma from "@/lib/prisma";
import { ScheduleEventType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function getScheduleEvents() {
    try {
        const events = await prisma.scheduleEvent.findMany({
            orderBy: { startDate: "asc" }
        });
        return { success: true, data: events };
    } catch (error) {
        console.error("Error fetching schedule events:", error);
        return { success: false, error: "Failed to fetch events" };
    }
}

export async function createScheduleEvent(data: { title: string, description?: string | null, startTime?: string | null, endTime?: string | null, startDate: Date, endDate: Date, type: ScheduleEventType, externalUrl?: string | null }) {
    try {
        const event = await prisma.scheduleEvent.create({
            data: {
                title: data.title,
                description: data.description,
                startTime: data.startTime,
                endTime: data.endTime,
                startDate: data.startDate,
                endDate: data.endDate,
                type: data.type,
                externalUrl: data.externalUrl
            }
        });
        revalidatePath("/dashboard/admin/schedule");
        return { success: true, data: event };
    } catch (error) {
        console.error("Error creating schedule event:", error);
        return { success: false, error: "Failed to create event" };
    }
}

export async function deleteScheduleEvent(id: string) {
    try {
        await prisma.scheduleEvent.delete({
            where: { id }
        });
        revalidatePath("/dashboard/admin/schedule");
        return { success: true };
    } catch (error) {
        console.error("Error deleting schedule event:", error);
        return { success: false, error: "Failed to delete event" };
    }
}

export async function deleteEventsBeforeDate(cutoffDate: Date) {
    try {
        const result = await prisma.scheduleEvent.deleteMany({
            where: {
                startDate: {
                    lt: cutoffDate
                }
            }
        });
        revalidatePath("/dashboard/admin/schedule");
        return { success: true, count: result.count };
    } catch (error) {
        console.error("Error deleting events before date:", error);
        return { success: false, error: "Failed to delete events" };
    }
}
