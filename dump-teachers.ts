import db from './src/lib/prisma';

async function main() {
    const teachers = await db.user.findMany({
        where: { role: 'teacher' },
        include: {
            qualifiedCourses: true,
            availabilities: true
        }
    });

    console.log(JSON.stringify(teachers.map((t: any) => ({
        name: t.name,
        qualifiedCourses: t.qualifiedCourses.map((q: any) => q.title),
        availabilities: t.availabilities.map((a: any) => `${a.dayOfWeek} ${a.startTime}-${a.endTime}`)
    })), null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
