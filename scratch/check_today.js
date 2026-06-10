const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: today } },
    include: { item: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log("=== SALES TODAY ===");
  console.log(sales.map(s => `${s.createdAt.toISOString()} | ${s.item?.name} | Qty: ${s.quantity} | Total: ${s.totalAmount} | Type: ${s.paymentType}`).join('\n'));

  const registers = await prisma.cashRegister.findMany({
    orderBy: { openedAt: 'desc' },
    take: 3
  });

  console.log("\n=== RECENT REGISTERS ===");
  console.log(registers.map(r => `${r.status} | Opened: ${r.openedAt.toISOString()} | Closed: ${r.closedAt?.toISOString()} | OpenBal: ${r.openingBalance} | CloseBal: ${r.closingBalance} | ExpClose: ${r.expectedClosingBalance}`).join('\n'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
