require("dotenv").config();

const prisma = require("../src/lib/prisma");

async function main() {
  const user = await prisma.user.upsert({
    where: {
      email: "seller@vyaparsetu.test",
    },
    update: {},
    create: {
      name: "VyaparSetu Test Seller",
      email: "seller@vyaparsetu.test",
      passwordHash: "DEV_ONLY_NOT_A_REAL_PASSWORD_HASH",
      role: "SELLER",
      phone: "9999999999",
    },
  });

  const business = await prisma.business.upsert({
    where: {
      ownerId: user.id,
    },
    update: {},
    create: {
      name: "VyaparSetu Demo Store",
      description: "Demo wholesale business for local development",
      category: "General Wholesale",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452001",
      ownerId: user.id,
    },
  });

  console.log("Test seller created:", user.email);
  console.log("Business created:", business.name);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
