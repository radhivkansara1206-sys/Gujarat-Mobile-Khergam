const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getLocalDayBounds(dateStr, offsetMinutes) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const startLocalUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const endLocalUtc = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  
  const startUtc = new Date(startLocalUtc + offsetMinutes * 60000);
  const endUtc = new Date(endLocalUtc + offsetMinutes * 60000);
  
  return { start: startUtc, end: endUtc };
}

async function main() {
  const dateStr = "2026-06-08";
  const offsetMinutes = -330;
  const bounds = getLocalDayBounds(dateStr, offsetMinutes);
  console.log("Bounds:", { start: bounds.start.toISOString(), end: bounds.end.toISOString() });
  
  const register = await prisma.cashRegister.findFirst({
    where: {
      openedAt: { gte: bounds.start, lt: bounds.end }
    }
  });
  console.log("Register:", register);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
