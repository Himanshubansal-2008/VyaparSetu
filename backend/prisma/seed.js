require("dotenv/config");
const prisma = require("../src/lib/prisma");
const { sampleProducts } = require("./data/sampleProducts");

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

async function seedCategories() {
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

async function seedProducts() {
  const existingBusinesses = await prisma.business.findMany({
    select: { id: true, name: true },
  });

  if (existingBusinesses.length === 0) {
    console.log("\n⚠️  Missing database prerequisite: No Business records found in database.");
    console.log("ℹ️  Skipping product and bulk pricing seeding. Products require existing seller businesses.\n");
    return;
  }

  const existingCategories = await prisma.category.findMany({
    select: { id: true, name: true },
  });
  const categoryMap = new Map();
  for (const cat of existingCategories) {
    categoryMap.set(cat.name.trim().toLowerCase(), cat.id);
  }

  console.log("\nSeeding marketplace products and bulk pricing tiers...");
  for (let i = 0; i < sampleProducts.length; i++) {
    const p = sampleProducts[i];
    const categoryId = categoryMap.get(p.categoryName.trim().toLowerCase());
    if (!categoryId) {
      console.warn(`Skipping '${p.name}': Category '${p.categoryName}' not found in database.`);
      continue;
    }

    const business = existingBusinesses[(p.businessIndex !== undefined ? p.businessIndex : i) % existingBusinesses.length];

    const productRecord = await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        minOrderQuantity: p.minOrderQuantity,
        unit: p.unit,
        imageUrl: p.imageUrl,
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        isSurplus: p.isSurplus,
        surplusQuantity: p.surplusQuantity,
        surplusPrice: p.surplusPrice,
        surplusDeadline: p.surplusDeadline,
        categoryId,
        businessId: business.id,
      },
    });

    console.log(`- Product upserted: ${productRecord.name} (${productRecord.id})`);

    if (p.bulkPricing && p.bulkPricing.length > 0) {
      for (const tier of p.bulkPricing) {
        await prisma.bulkPricing.upsert({
          where: { id: tier.id },
          update: {},
          create: {
            id: tier.id,
            productId: productRecord.id,
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity,
            pricePerUnit: tier.pricePerUnit,
          },
        });
      }
    }
  }

  console.log(`Successfully completed seeding of ${sampleProducts.length} sample products.`);
}

async function main() {
  await seedCategories();
  await seedProducts();
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

