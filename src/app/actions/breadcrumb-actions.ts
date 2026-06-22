"use server";

import { courseService } from "@/features/teacher/services/courseService";

export async function getCourseTitle(courseId: string): Promise<string | null> {
    try {
        const course = await courseService.getCourseById(courseId);
        return course?.title || null;
    } catch (error) {
        console.error("Error fetching course title:", error);
        return null;
    }
}
