const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Current Date/Time on system:", new Date().toISOString());

  // Get total counts
  const totalSales = await prisma.sale.count();
  const totalExpenses = await prisma.expense.count();
  const totalRegisters = await prisma.cashRegister.count();
  console.log(`Total Sales: ${totalSales}, Total Expenses: ${totalExpenses}, Total Registers: ${totalRegisters}`);

  // Fetch all sales today
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { item: { select: { name: true } } }
  });
  console.log("--- LATEST SALES ---");
  for (const s of sales) {
    console.log({
      id: s.id,
      itemName: s.item?.name,
      quantity: s.quantity,
      totalAmount: s.totalAmount,
      paymentType: s.paymentType,
      createdAt: s.createdAt.toISOString()
    });
  }

  // Fetch all registers today
  const registers = await prisma.cashRegister.findMany({
    orderBy: { openedAt: 'desc' },
    take: 5
  });
  console.log("--- LATEST REGISTERS ---");
  for (const r of registers) {
    console.log({
      id: r.id,
      status: r.status,
      openingBalance: r.openingBalance,
      closingBalance: r.closingBalance,
      openedAt: r.openedAt.toISOString(),
      closedAt: r.closedAt ? r.closedAt.toISOString() : null
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
