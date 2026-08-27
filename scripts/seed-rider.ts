import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const EMAIL = 'rider@jebbsdeli.test';
const PASSWORD = 'rider123';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const hashed = await bcrypt.hash(PASSWORD, 10);
    const existing = await prisma.user.findUnique({ where: { email: EMAIL } });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: 'Demo Rider',
          password: hashed,
          telephone: '+2348000000001',
          role: 'RIDER',
          riderProfile: {
            upsert: {
              create: {
                isAvailable: true,
                vehicle: 'bike',
                notes: 'Seeded rider',
              },
              update: {
                isAvailable: true,
                vehicle: 'bike',
                notes: 'Seeded rider',
              },
            },
          },
          riderWallet: {
            upsert: {
              create: {},
              update: {},
            },
          },
        },
      });
      console.log(JSON.stringify({ status: 'updated', email: EMAIL, password: PASSWORD }));
    } else {
      await prisma.user.create({
        data: {
          name: 'Demo Rider',
          email: EMAIL,
          password: hashed,
          telephone: '+2348000000001',
          role: 'RIDER',
          riderProfile: {
            create: {
              isAvailable: true,
              vehicle: 'bike',
              notes: 'Seeded rider',
            },
          },
          riderWallet: { create: {} },
        },
      });
      console.log(JSON.stringify({ status: 'created', email: EMAIL, password: PASSWORD }));
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
