const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const registers = await prisma.cashRegister.findMany({
    orderBy: { openedAt: 'desc' },
    take: 10,
    include: {
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
    }
  });
  
  console.log("--- CASH REGISTER RECORDS ---");
  for (const reg of registers) {
    console.log({
      id: reg.id,
      status: reg.status,
      openingBalance: reg.openingBalance,
      closingBalance: reg.closingBalance,
      openedAt: reg.openedAt,
      closedAt: reg.closedAt,
      openedBy: reg.openedBy?.name,
      closedBy: reg.closedBy?.name,
      openingNotes: reg.openingNotes,
      closingNotes: reg.closingNotes
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
