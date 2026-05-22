import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'Earphones & Headphones', icon: '🎧', color: '#8b5cf6', sortOrder: 1 },
  { name: 'Chargers & Adapters', icon: '🔌', color: '#10b981', sortOrder: 2 },
  { name: 'Cables & Connectors', icon: '🔗', color: '#3b82f6', sortOrder: 3 },
  { name: 'Phone Cases & Covers', icon: '📱', color: '#f59e0b', sortOrder: 4 },
  { name: 'Screen Protectors', icon: '🛡️', color: '#06b6d4', sortOrder: 5 },
  { name: 'Power Banks', icon: '🔋', color: '#ef4444', sortOrder: 6 },
  { name: 'Memory Cards & Pen Drives', icon: '💾', color: '#ec4899', sortOrder: 7 },
  { name: 'Speakers', icon: '🔊', color: '#f97316', sortOrder: 8 },
  { name: 'Holders & Stands', icon: '📌', color: '#14b8a6', sortOrder: 9 },
  { name: 'Other Accessories', icon: '🎁', color: '#64748b', sortOrder: 10 },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gujaratmobile.com' },
    update: {},
    create: {
      email: 'admin@gujaratmobile.com',
      name: 'Admin',
      password: hashedPassword,
      role: 'admin',
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create default categories
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log(`✅ ${DEFAULT_CATEGORIES.length} categories created`);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Email: admin@gujaratmobile.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
