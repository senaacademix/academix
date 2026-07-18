import "dotenv/config";
import prisma from "../lib/prisma";
import { hashPassword } from "better-auth/crypto";
import readline from "readline";
import crypto from "crypto";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  console.log("\n=== Creación de Usuario Administrador Seguro ===\n");
  
  const name = await question("Nombre Completo: ");
  if (!name.trim()) {
    console.error("Error: El nombre es obligatorio.");
    process.exit(1);
  }

  const email = await question("Correo Electrónico: ");
  if (!email.trim() || !email.includes("@")) {
    console.error("Error: Correo electrónico inválido.");
    process.exit(1);
  }

  const password = await question("Contraseña: ");
  if (password.length < 8) {
    console.error("Error: La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const identificacion = await question("Número de Identificación: ");
  if (!identificacion.trim()) {
    console.error("Error: La identificación es obligatoria.");
    process.exit(1);
  }

  const emailNorm = email.trim().toLowerCase();

  // Check duplicate email
  const existing = await prisma.user.findUnique({
    where: { email: emailNorm },
  });
  if (existing) {
    console.error("Error: Ya existe un usuario con este correo electrónico.");
    process.exit(1);
  }

  console.log("\nCreando administrador...");

  const hashedPassword = await hashPassword(password);
  const userId = crypto.randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        email: emailNorm,
        name: name.trim(),
        role: "admin",
        emailVerified: true,
        accounts: {
          create: {
            id: crypto.randomUUID(),
            accountId: crypto.randomUUID(),
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
    });

    const nameParts = name.trim().split(/\s+/);
    const nombres = nameParts[0] || "Admin";
    const apellido = nameParts.slice(1).join(" ") || "Sistema";

    await tx.profile.create({
      data: {
        userId,
        identificacion: identificacion.trim(),
        nombres,
        apellido,
        telefono: null,
        dataProcessingConsent: true,
        dataProcessingConsentDate: new Date(),
      },
    });
  });

  console.log(`\n¡Éxito! Administrador creado: ${name.trim()} (${emailNorm})`);
}

main()
  .catch((e) => {
    console.error("Error inesperado:", e);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
