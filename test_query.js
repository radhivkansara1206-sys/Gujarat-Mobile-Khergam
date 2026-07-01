const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const reg = await prisma.cashRegister.findMany({ orderBy: { openedAt: 'desc' }, take: 2 }); 
  console.log('Registers:', reg); 
  const sales = await prisma.sale.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { item: true } }); 
  console.log('Sales:', sales.map(s => ({ item: s.item?.name, total: s.totalAmount, time: s.createdAt, type: s.paymentType }))); 
} 
main().finally(() => prisma.$disconnect());
