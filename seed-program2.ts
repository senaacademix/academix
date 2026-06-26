import { DayOfWeek } from './src/generated/prisma/client';
import prisma from './src/lib/prisma';
import crypto from 'crypto';


async function main() {
  console.log('Seeding second program...');

  // 1. Create Program
  const program2 = await prisma.program.create({
    data: {
      name: 'Diseño Gráfico y Multimedia',
      description: 'Programa técnico en diseño y contenido multimedia',
    },
  });

  console.log('Created program:', program2.name);

  // 2. Create Periods
  const period1 = await prisma.period.create({
    data: { name: 'Trimestre 1', programId: program2.id },
  });
  const period2 = await prisma.period.create({
    data: { name: 'Trimestre 2', programId: program2.id },
  });
  const period3 = await prisma.period.create({
    data: { name: 'Trimestre 3', programId: program2.id },
  });

  // 3. Create Courses
  const periods = [period1, period2, period3];
  const coursesData = [
    ['Fundamentos de Diseño', 'Color y Composición', 'Tipografía Básica'],
    ['Ilustración Digital', 'Retoque Fotográfico', 'Identidad Visual'],
    ['Animación 2D', 'Diseño Web UI/UX', 'Producción Audiovisual']
  ];

  const createdCourses = [];
  for (let i = 0; i < periods.length; i++) {
    for (const title of coursesData[i]) {
      const c = await prisma.course.create({
        data: {
          title,
          periodId: periods[i].id,
          weeklyHours: 10,
        },
      });
      createdCourses.push(c);
    }
  }

  // 4. Create Teachers and Availability
  const teachers = [];
  const teacherNames = ['Laura Diseñadora', 'Carlos Animador', 'Marta Fotógrafa'];
  const { hashPassword } = await import("better-auth/crypto");
  const dummyPassword = await hashPassword('password123');
  const days: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  for (let i = 0; i < teacherNames.length; i++) {
    const tId = crypto.randomUUID();
    const t = await prisma.user.create({
      data: {
        id: tId,
        name: teacherNames[i],
        email: `profesor_diseno${i+1}@test.com`,
        role: 'teacher',
        availabilityLocked: true,
        qualifiedCoursesLocked: true,
        emailVerified: true,
        programs: {
          connect: {
            id: program2.id
          }
        },
        availabilities: {
          create: days.flatMap(day => [
            { dayOfWeek: day, startTime: '06:00', endTime: '12:00' },
            { dayOfWeek: day, startTime: '12:00', endTime: '18:00' },
            { dayOfWeek: day, startTime: '18:00', endTime: '22:00' },
          ])
        },
        qualifiedCourses: {
          connect: createdCourses.map(c => ({ id: c.id }))
        },
        accounts: {
          create: {
            id: crypto.randomUUID(),
            accountId: crypto.randomUUID(),
            providerId: 'credential',
            password: dummyPassword
          }
        }
      }
    });
    teachers.push(t);
  }

  // 5. Create Environments
  const env1 = await prisma.trainingEnvironment.create({
    data: { name: 'Sala Mac 1', capacity: 30, location: 'Piso 2', programId: program2.id }
  });
  const env2 = await prisma.trainingEnvironment.create({
    data: { name: 'Estudio Foto 1', capacity: 30, location: 'Piso 2', programId: program2.id }
  });
  const env3 = await prisma.trainingEnvironment.create({
    data: { name: 'Sala PC 1', capacity: 30, location: 'Piso 3', programId: program2.id }
  });

  // 6. Create Groups
  const group1 = await prisma.group.create({
    data: {
      name: 'Grupo Diseño Mañana',
      description: 'Jornada Mañana',
      startTime: '06:00',
      endTime: '12:00',
      programId: program2.id,
      environmentId: env1.id,
      periodId: period1.id
    }
  });
  
  const group2 = await prisma.group.create({
    data: {
      name: 'Grupo Diseño Tarde',
      description: 'Jornada Tarde',
      startTime: '12:00',
      endTime: '18:00',
      programId: program2.id,
      environmentId: env2.id,
      periodId: period1.id
    }
  });

  const group3 = await prisma.group.create({
    data: {
      name: 'Grupo Diseño Noche',
      description: 'Jornada Noche',
      startTime: '18:00',
      endTime: '22:00',
      programId: program2.id,
      environmentId: env3.id,
      periodId: period1.id
    }
  });

  // 7. Create Students
  for (let i = 1; i <= 20; i++) {
    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Estudiante Mañana ${i}`,
        email: `est_diseno_m${i}@test.com`,
        role: 'student',
        groupId: group1.id,
        emailVerified: true,
        accounts: {
          create: {
            id: crypto.randomUUID(),
            accountId: crypto.randomUUID(),
            providerId: 'credential',
            password: dummyPassword
          }
        }
      }
    });
    
    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Estudiante Tarde ${i}`,
        email: `est_diseno_t${i}@test.com`,
        role: 'student',
        groupId: group2.id,
        emailVerified: true,
        accounts: {
          create: {
            id: crypto.randomUUID(),
            accountId: crypto.randomUUID(),
            providerId: 'credential',
            password: dummyPassword
          }
        }
      }
    });

    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Estudiante Noche ${i}`,
        email: `est_diseno_n${i}@test.com`,
        role: 'student',
        groupId: group3.id,
        emailVerified: true,
        accounts: {
          create: {
            id: crypto.randomUUID(),
            accountId: crypto.randomUUID(),
            providerId: 'credential',
            password: dummyPassword
          }
        }
      }
    });
  }

  console.log('Seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
