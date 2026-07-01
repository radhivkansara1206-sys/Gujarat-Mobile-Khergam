const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({ take: 3 });
    
    const categoryCount = await prisma.category.count();
    const itemCount = await prisma.item.count();
    const saleCount = await prisma.sale.count();
    
    console.log(`Users: ${userCount}`);
    console.log(`Categories: ${categoryCount}`);
    console.log(`Items: ${itemCount}`);
    console.log(`Sales: ${saleCount}`);
    
    console.log('\nSample Users:', users.map(u => ({ email: u.email, name: u.name, role: u.role })));
  } catch (e) {
    console.error('Error connecting to database:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
