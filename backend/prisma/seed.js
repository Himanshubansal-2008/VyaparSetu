require("dotenv/config");
const prisma = require("../src/lib/prisma");

const sampleCategories = [
  {
    name: "Electronics",
    description: "Electronic devices, accessories, and industrial equipment",
    imageUrl: null,
    isActive: true,
  },
  {
    name: "Clothing & Textiles",
    description: "Apparel, garments, fabrics, and textile materials",
    imageUrl: null,
    isActive: true,
  },
  {
    name: "Food & Beverages",
    description: "Packaged foods, agricultural produce, and beverages",
    imageUrl: null,
    isActive: true,
  },
  {
    name: "Furniture",
    description: "Office, commercial, and residential furniture",
    imageUrl: null,
    isActive: true,
  },
  {
    name: "Home & Kitchen",
    description: "Home appliances, cookware, and kitchen essentials",
    imageUrl: null,
    isActive: true,
  },
  {
    name: "Beauty & Personal Care",
    description: "Cosmetics, personal grooming, and hygiene products",
    imageUrl: null,
    isActive: true,
  },
  {
    name: "Industrial Supplies",
    description: "Industrial machinery, tools, and hardware equipment",
    imageUrl: null,
    isActive: true,
  },
  {
    name: "Agriculture",
    description: "Farming supplies, seeds, fertilizers, and agricultural tools",
    imageUrl: null,
    isActive: true,
  },
  {
    name: "Stationery & Office Supplies",
    description: "Office stationery, paper products, and writing instruments",
    imageUrl: null,
    isActive: true,
  },
  {
    name: "Packaging Materials",
    description: "Corrugated boxes, containers, tapes, and packing materials",
    imageUrl: null,
    isActive: true,
  },
];

async function main() {
  console.log("Seeding marketplace categories...");

  for (const category of sampleCategories) {
    const record = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: {
        name: category.name,
        description: category.description,
        imageUrl: category.imageUrl,
        isActive: category.isActive,
      },
    });
    console.log(`- Category upserted: ${record.name} (${record.id})`);
  }

  console.log(`Successfully completed seeding of ${sampleCategories.length} categories.`);
}

main()
  .catch((e) => {
    console.error("Error during category seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

