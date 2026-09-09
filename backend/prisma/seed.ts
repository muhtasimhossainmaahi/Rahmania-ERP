import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set, skipping admin seed");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user ${email} already exists, skipping`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      role: Role.SUPER_ADMIN,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  console.log(`Created admin user ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
