import 'dotenv/config';
import prisma from './config/db.js';

async function createAllocation() {
  try {
    const allocation = await prisma.allocation.create({
      data: {
        userId: 'user-123',
        cpu: 2,
        memory: 4,
        nodeId: 'node-1',
        status: 'ALLOCATED',
      },
    });
    console.log('Created allocation:', allocation);
  } catch (error) {
    console.error('Error creating allocation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAllocation();
