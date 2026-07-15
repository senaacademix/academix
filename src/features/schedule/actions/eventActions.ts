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

function getEasterDate(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day, 12, 0, 0);
}

function moveToNextMonday(date: Date): Date {
    const day = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
    if (day === 1) return date;
    const daysToAdd = day === 0 ? 1 : 8 - day;
    const nextMonday = new Date(date);
    nextMonday.setDate(date.getDate() + daysToAdd);
    return nextMonday;
}

function getColombianHolidays(year: number): { name: string, date: Date }[] {
    const holidays: { name: string, date: Date }[] = [];

    // Fixed Holidays (No Emiliani law)
    holidays.push({ name: "Año Nuevo", date: new Date(year, 0, 1, 12, 0, 0) });
    holidays.push({ name: "Día del Trabajo", date: new Date(year, 4, 1, 12, 0, 0) });
    holidays.push({ name: "Grito de Independencia", date: new Date(year, 6, 20, 12, 0, 0) });
    holidays.push({ name: "Batalla de Boyacá", date: new Date(year, 7, 7, 12, 0, 0) });
    holidays.push({ name: "Inmaculada Concepción", date: new Date(year, 11, 8, 12, 0, 0) });
    holidays.push({ name: "Navidad", date: new Date(year, 11, 25, 12, 0, 0) });

    // Emiliani Law Holidays (Moved to next Monday)
    holidays.push({ name: "Reyes Magos", date: moveToNextMonday(new Date(year, 0, 6, 12, 0, 0)) });
    holidays.push({ name: "San José", date: moveToNextMonday(new Date(year, 2, 19, 12, 0, 0)) });
    holidays.push({ name: "San Pedro y San Pablo", date: moveToNextMonday(new Date(year, 5, 29, 12, 0, 0)) });
    holidays.push({ name: "Asunción de la Virgen", date: moveToNextMonday(new Date(year, 7, 15, 12, 0, 0)) });
    holidays.push({ name: "Día de la Raza", date: moveToNextMonday(new Date(year, 9, 12, 12, 0, 0)) });
    holidays.push({ name: "Todos los Santos", date: moveToNextMonday(new Date(year, 10, 1, 12, 0, 0)) });
    holidays.push({ name: "Independencia de Cartagena", date: moveToNextMonday(new Date(year, 10, 11, 12, 0, 0)) });

    // Easter-based mobile holidays
    const easter = getEasterDate(year);

    const juevesSanto = new Date(easter);
    juevesSanto.setDate(easter.getDate() - 3);
    holidays.push({ name: "Jueves Santo", date: juevesSanto });

    const viernesSanto = new Date(easter);
    viernesSanto.setDate(easter.getDate() - 2);
    holidays.push({ name: "Viernes Santo", date: viernesSanto });

    const ascension = new Date(easter);
    ascension.setDate(easter.getDate() + 43);
    holidays.push({ name: "Ascensión del Señor", date: ascension });

    const corpus = new Date(easter);
    corpus.setDate(easter.getDate() + 64);
    holidays.push({ name: "Corpus Christi", date: corpus });

    const sagradoCorazon = new Date(easter);
    sagradoCorazon.setDate(easter.getDate() + 71);
    holidays.push({ name: "Sagrado Corazón de Jesús", date: sagradoCorazon });

    return holidays;
}

export async function generateHolidaysForPeriod() {
    try {
        // 1. Get range with multi-level fallback
        let startRange: Date;
        let endRange: Date;

        const settings = await prisma.systemSettings.findUnique({
            where: { id: "settings" }
        });

        if (settings?.scheduleStartDate && settings?.scheduleEndDate) {
            startRange = new Date(settings.scheduleStartDate);
            endRange = new Date(settings.scheduleEndDate);
        } else {
            // Fallback to Programs range
            const programs = await prisma.program.findMany({
                where: {
                    startDate: { not: null },
                    endDate: { not: null }
                },
                select: {
                    startDate: true,
                    endDate: true
                }
            });

            if (programs.length > 0) {
                const startDates = programs.map(p => new Date(p.startDate!).getTime());
                const endDates = programs.map(p => new Date(p.endDate!).getTime());
                startRange = new Date(Math.min(...startDates));
                endRange = new Date(Math.max(...endDates));
            } else {
                // Current year fallback
                const currentYear = new Date().getFullYear();
                startRange = new Date(currentYear, 0, 1);
                endRange = new Date(currentYear, 11, 31);
            }
        }

        // Normalize ranges to start/end of day
        startRange.setHours(0, 0, 0, 0);
        endRange.setHours(23, 59, 59, 999);

        const startYear = startRange.getFullYear();
        const endYear = endRange.getFullYear();

        // 2. Generate all Colombian holidays for the years involved
        let allHolidays: { name: string, date: Date }[] = [];
        for (let y = startYear; y <= endYear; y++) {
            allHolidays = allHolidays.concat(getColombianHolidays(y));
        }

        // 3. Filter holidays strictly within schedule period
        const filteredHolidays = allHolidays.filter(h => {
            const time = h.date.getTime();
            return time >= startRange.getTime() && time <= endRange.getTime();
        });

        if (filteredHolidays.length === 0) {
            return {
                success: true,
                count: 0,
                message: "No se encontraron festivos de Colombia en el rango de fechas configurado."
            };
        }

        // 4. Fetch existing holiday events to prevent duplicates
        const existingEvents = await prisma.scheduleEvent.findMany({
            where: {
                type: "HOLIDAY",
                startDate: {
                    gte: startRange,
                    lte: endRange
                }
            }
        });

        // Set of existing date strings (YYYY-MM-DD)
        const existingDates = new Set(
            existingEvents.map(e => {
                const d = new Date(e.startDate);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            })
        );

        let createdCount = 0;

        // 5. Insert non-duplicate holidays
        for (const holiday of filteredHolidays) {
            const y = holiday.date.getFullYear();
            const m = String(holiday.date.getMonth() + 1).padStart(2, "0");
            const d = String(holiday.date.getDate()).padStart(2, "0");
            const dateStr = `${y}-${m}-${d}`;

            if (!existingDates.has(dateStr)) {
                // Ensure correct ISO Dates
                const start = new Date(dateStr + "T12:00:00");
                const end = new Date(dateStr + "T12:00:00");

                await prisma.scheduleEvent.create({
                    data: {
                        title: `Día Festivo: ${holiday.name}`,
                        startDate: start,
                        endDate: end,
                        type: "HOLIDAY"
                    }
                });
                createdCount++;
            }
        }

        revalidatePath("/dashboard/admin/schedule");
        return {
            success: true,
            count: createdCount,
            message: `Generación completada. Se agregaron ${createdCount} nuevos festivos al periodo.`
        };

    } catch (error) {
        console.error("Error generating holidays:", error);
        return { success: false, error: "Error al generar los días festivos." };
    }
}

