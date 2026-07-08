const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const s = await prisma.systemSettings.findUnique({where: {id: "settings"}});
    console.log(s);
}
main();
