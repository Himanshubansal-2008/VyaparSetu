const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const app = require("./app");
const prisma = require("./lib/prisma");

const PORT = process.env.PORT || 5050;

// Prevent server process termination on transient unhandled rejections or uncaught exceptions
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Backend] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[Backend] Uncaught Exception:", err);
});

async function startServer() {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected through Prisma");

    const server = app.listen(PORT, () => {
      console.log(`VyaparSetu API running on port ${PORT}`);
    });

    server.on("error", (err) => {
      console.error("[Backend] HTTP Server error:", err);
    });
  } catch (error) {
    console.error("Failed to start backend:", error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

startServer();
