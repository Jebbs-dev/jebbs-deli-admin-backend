import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import fs from 'fs';
import path from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function deleteAllData(orderedFileNames: string[]) {
  // Prisma client delegates are lowercase (store, product), matching seed filenames.
  const modelNames = orderedFileNames.map((fileName) =>
    path.basename(fileName, path.extname(fileName)),
  );

  // Delete products before stores to satisfy FK constraints.
  for (const modelName of [...modelNames].reverse()) {
    const model: any = prisma[modelName as keyof typeof prisma];
    if (model?.deleteMany) {
      await model.deleteMany({});
      console.log(`Cleared data from ${modelName}`);
    } else {
      console.error(
        `Model ${modelName} not found. Please ensure the model name is correctly specified.`,
      );
    }
  }
}

async function main() {
  const dataDirectory = path.join(__dirname, 'seedData');

  const orderedFileNames = ['store.json', 'product.json'];

  await deleteAllData(orderedFileNames);

  for (const fileName of orderedFileNames) {
    const filePath = path.join(dataDirectory, fileName);
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const modelName = path.basename(fileName, path.extname(fileName));
    const model: any = prisma[modelName as keyof typeof prisma];

    if (!model) {
      console.error(`No Prisma model matches the file name: ${fileName}`);
      continue;
    }

    for (const data of jsonData) {
      await model.create({
        data,
      });
    }

    console.log(`Seeded ${modelName} with data from ${fileName}`);
  }

  // Seed a demo rider (password: rider123)
  const bcrypt = await import('bcrypt');
  const riderEmail = 'rider@jebbsdeli.test';
  const existingRider = await prisma.user.findUnique({ where: { email: riderEmail } });
  if (!existingRider) {
    const hashed = await bcrypt.hash('rider123', 10);
    await prisma.user.create({
      data: {
        name: 'Demo Rider',
        email: riderEmail,
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
    console.log(`Seeded rider ${riderEmail} / rider123`);
  } else {
    console.log(`Rider ${riderEmail} already exists`);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
