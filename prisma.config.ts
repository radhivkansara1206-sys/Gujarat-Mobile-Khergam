import { PrismaConfig } from '@prisma/config';
import dotenv from 'dotenv';
dotenv.config();

export default {
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' }
} satisfies PrismaConfig;
