const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cablesId = '9b137227-77ba-4ad5-97f8-5e77e076adbc';
  const earphonesId = '1daae10b-dafb-4e2b-8d29-1c5e401d7b36';

  const ubonCategoryId = '8f538d89-e0e1-487a-ba43-16573f488ac8';

  const items = await prisma.item.findMany({
    where: { categoryId: ubonCategoryId }
  });

  for (const item of items) {
    const name = item.name.toLowerCase();
    let newCategoryId = '';
    
    if (name.includes('to') || name.includes('cable') || name.includes('data')) {
      newCategoryId = cablesId;
    } else {
      newCategoryId = earphonesId;
    }

    await prisma.item.update({
      where: { id: item.id },
      data: { categoryId: newCategoryId }
    });
    console.log(`Updated ${item.name} -> ${newCategoryId === cablesId ? 'Cables' : 'Earphones'}`);
  }

  // optionally delete the UBON category
  // await prisma.category.delete({ where: { id: ubonCategoryId }});
  console.log("Migration complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
