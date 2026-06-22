import prisma from "@/lib/prisma";


export const adminService = {
    // ============ DASHBOARD METRICS ============
    async getSystemStats() {
        const [
            userCounts,
            courseCounts,
            totalSubmissions,
            activeCourses,
            systemHealth
        ] = await Promise.all([
            // Usuarios por rol
            prisma.user.groupBy({
                by: ['role'],
                _count: true
            }),
            // Cursos totales
            prisma.course.count(),
            // Entregas totales (stubbed to 0)
            Promise.resolve(0),
            // Cursos activos (sin fecha de fin o fecha gte a hoy)
            prisma.course.count({
                where: {
                    OR: [
                        { group: null },
                        { group: {
                            OR: [
                                { endDate: null },
                                { endDate: { gte: new Date() } }
                            ]
                        } }
                    ]
                }
            }),
            { connected: true }
        ]);

        const roleCounts = {
            admin: userCounts.find(u => u.role === 'admin')?._count || 0,
            teacher: userCounts.find(u => u.role === 'teacher')?._count || 0,
            student: userCounts.find(u => u.role === 'student')?._count || 0,
            total: userCounts.reduce((acc, curr) => acc + curr._count, 0)
        };

        return {
            users: roleCounts,
            courses: {
                total: courseCounts,
                active: activeCourses,
                archived: courseCounts - activeCourses
            },
            activity: {
                submissions: totalSubmissions
            },

            health: systemHealth
        };
    },


    // ============ USER MANAGEMENT ============
    async getAllUsers(filters?: {
        role?: "teacher" | "student" | "admin";
        search?: string;
        courseId?: string;
        groupId?: string;
        limit?: number;
        offset?: number;
    }) {
        const where: any = {};
        const andConditions: any[] = [];

        if (filters?.role) {
            where.role = filters.role;
        }

        if (filters?.groupId && filters.groupId !== 'all') {
            where.groupId = filters.groupId;
        }

        if (filters?.courseId && filters.courseId !== 'all') {
            andConditions.push({
                OR: [
                    // Student enrolled in course
                    { enrollments: { some: { courseId: filters.courseId } } },
                    // Teacher who created the course
                    { coursesCreated: { some: { id: filters.courseId } } }
                ]
            });
        }

        if (filters?.search) {
            andConditions.push({
                OR: [
                    { name: { contains: filters.search, mode: 'insensitive' as const } },
                    { email: { contains: filters.search, mode: 'insensitive' as const } }
                ]
            });
        }

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                take: filters?.limit || 50,
                skip: filters?.offset || 0,
                orderBy: { createdAt: 'desc' },
                include: {
                    profile: true,
                    group: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    programs: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    qualifiedCourses: {
                        select: {
                            id: true,
                            title: true,
                            schedules: {
                                select: {
                                    id: true,
                                    dayOfWeek: true,
                                    startTime: true,
                                    endTime: true
                                }
                            },
                            group: {
                                select: { id: true, name: true }
                            },
                            period: {
                                select: {
                                    id: true,
                                    name: true,
                                    program: { select: { id: true, name: true } }
                                }
                            }
                        }
                    },
                    coursesTaught: {
                        select: {
                            id: true,
                            title: true,
                            schedules: {
                                select: {
                                    id: true,
                                    dayOfWeek: true,
                                    startTime: true,
                                    endTime: true
                                }
                            },
                            group: {
                                select: { id: true, name: true }
                            },
                            period: {
                                select: {
                                    id: true,
                                    name: true,
                                    program: { select: { id: true, name: true } }
                                }
                            }
                        }
                    },
                    availabilities: {
                        select: {
                            id: true,
                            dayOfWeek: true,
                            startTime: true,
                            endTime: true
                        },
                        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
                    },
                    _count: {
                        select: {
                            enrollments: true
                        }
                    }
                }
            }),
            prisma.user.count({ where })
        ]);

        return { users, total };
    },


    async getUserDetails(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                group: {
                    include: {
                        courses: {
                            include: {
                                teacher: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                },
                enrollments: {
                    include: {
                        course: {
                            include: {
                                teacher: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                },
                remarks: {
                    include: {
                        course: true,
                        teacher: {
                            include: {
                                profile: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                attendances: {
                    include: {
                        user: true,
                        course: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    },
                    orderBy: { date: 'desc' }
                }
            }
        });

        if (!user) return null;

        // Combine direct enrollments and group courses
        const directCourses = user.enrollments.map(e => ({
            id: e.course.id,
            title: e.course.title,
            teacher: e.course.teacher,
            createdAt: e.course.createdAt,
            status: e.status,
            isDirect: true
        }));

        const groupCourses = user.group?.courses.map(c => ({
            id: c.id,
            title: c.title,
            teacher: c.teacher,
            createdAt: c.createdAt,
            status: 'APPROVED' as any,
            isDirect: false
        })) || [];

        const courses = [...directCourses];
        groupCourses.forEach(gc => {
            if (!courses.some(c => c.id === gc.id)) {
                courses.push(gc);
            }
        });

        return {
            ...user,
            courses
        };
    },

    async updateUserRole(userId: string, newRole: "teacher" | "student" | "admin") {
        return await prisma.user.update({
            where: { id: userId },
            data: { role: newRole }
        });
    },

    async toggleUserBan(userId: string, banned: boolean) {
        return await prisma.user.update({
            where: { id: userId },
            data: { banned }
        });
    },

    async deleteUser(userId: string) {
        // This will cascade delete related records based on schema
        return await prisma.user.delete({
            where: { id: userId }
        });
    },

    // ============ COURSE MANAGEMENT ============
    async getAllCoursesAdmin(filters?: {
        status?: 'active' | 'archived' | 'all';
        search?: string;
        limit?: number;
        offset?: number;
    }) {
        const where: any = {};
        const andConditions: any[] = [];

        if (filters?.status === 'active') {
            andConditions.push({
                OR: [
                    { group: null },
                    { group: {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: new Date() } }
                        ]
                    } }
                ]
            });
        } else if (filters?.status === 'archived') {
            andConditions.push({
                group: {
                    endDate: { lt: new Date() }
                }
            });
        }

        if (filters?.search) {
            andConditions.push({
                OR: [
                    { title: { contains: filters.search, mode: 'insensitive' as const } },
                    { description: { contains: filters.search, mode: 'insensitive' as const } }
                ]
            });
        }

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        const [courses, total] = await Promise.all([
            prisma.course.findMany({
                where,
                take: filters?.limit || 50,
                skip: filters?.offset || 0,
                orderBy: { createdAt: 'desc' },
                include: {
                    group: true,
                    period: {
                        include: {
                            program: true
                        }
                    },
                    _count: {
                        select: {
                            enrollments: true
                        }
                    }
                }
            }),
            prisma.course.count({ where })
        ]);

        return { courses, total };
    },

    async getCourseDetailsAdmin(courseId: string) {
        return await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                group: true,
                enrollments: {
                    include: {
                        user: {
                            include: {
                                profile: true
                            }
                        }
                    }
                },

                remarks: {
                    include: {
                        user: true,
                        teacher: true
                    }
                },
                attendances: {
                    include: {
                        user: true,
                        course: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    },
                    orderBy: { date: 'desc' }
                }
            }
        });
    },



    async getAllCoursesSimple() {
        return await prisma.course.findMany({
            // Fetch all courses for filtering, regardless of date
            where: {},
            select: {
                id: true,
                title: true
            },
            orderBy: {
                title: 'asc'
            }
        });
    },

    // ============ NOTIFICATION MANAGEMENT ============


    // ============ SYSTEM STATISTICS ============


    // ============ AUDIT LOGS (Simple version) ============
    async getRecentActivity(limit: number = 20) {
        return [];
    }
};
