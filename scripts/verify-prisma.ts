import { prisma } from '../src/lib/prisma';

async function verify() {
  try {
    await prisma.user.findFirst();
    console.log('✅ Connected');
  } catch (error) {
    console.error('Failed to connect:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
