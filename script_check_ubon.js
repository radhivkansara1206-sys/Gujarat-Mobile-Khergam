const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany();
  console.log("Categories:", categories.map(c => ({ id: c.id, name: c.name })));

  const ubonCategory = categories.find(c => c.name.toLowerCase().includes('ubon'));
  if (ubonCategory) {
    const items = await prisma.item.findMany({
      where: { categoryId: ubonCategory.id }
    });
    console.log(`\nFound UBON category (${ubonCategory.id}). Items in it: ${items.length}`);
    items.forEach(item => {
      console.log(`- ${item.name} | SubCat: ${item.subCategory} | Brand: ${item.brand}`);
    });
  } else {
    console.log("\nNo UBON category found.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
