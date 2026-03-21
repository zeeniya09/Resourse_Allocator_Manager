// prismaClient.js
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Create a Prisma client singleton
const prismaClientSingleton = () => {
    const connectionString = process.env.DATABASE_URL;
    const adapter = new PrismaPg(new pg.Pool({ connectionString }));
    return new PrismaClient({
        adapter,
        log:
            process.env.NODE_ENV === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
    });
};

// Use globalThis to avoid creating multiple instances in dev (hot reload)
const prisma = globalThis.prismaGlobal || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = prisma;
}

export default prisma;