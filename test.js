// test-prisma.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔄 Testing Prisma connection...");

    // Simple query — list all users (or empty if none)
    const users = await prisma.user.findMany();

    console.log("✅ Connected! Users in DB:", users);
  } catch (err) {
    console.error("❌ Prisma connection failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
