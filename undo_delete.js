const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restoreItem() {
  await prisma.item.update({
    where: { id: 'faecf15d-d7d2-4509-aee9-b9d2833c7bf3' },
    data: { isActive: true }
  });
  console.log("Item restored!");
}

restoreItem().catch(console.error).finally(() => prisma.$disconnect());
