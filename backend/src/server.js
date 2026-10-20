
require("dotenv").config();

const app = require("./app");
const prisma = require("./lib/prisma");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected through Prisma");

    app.listen(PORT, () => {
      console.log(`VyaparSetu API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

startServer();
