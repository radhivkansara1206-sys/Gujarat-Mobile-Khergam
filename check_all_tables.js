const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllTables() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public';
    `;
    console.log('Tables found:', tables.map(t => t.tablename));

    for (const table of tables) {
      if (table.tablename === '_prisma_migrations') continue;
      const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "${table.tablename}";`);
      console.log(`Table ${table.tablename}: ${Number(count[0].count)} rows`);
    }
  } catch (e) {
    console.error('Error connecting to database:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTables();
