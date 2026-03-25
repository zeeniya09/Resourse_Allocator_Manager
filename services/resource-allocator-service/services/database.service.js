import { PrismaClient } from '../generated/client/index.js';
import { randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let prisma = null;
let dbAvailable = false;

// Initialize database connection
async function initializeDatabase() {
  try {
    // Check if DATABASE_URL is available
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in environment variables');
    }

    console.log('🔗 Connecting to database...');

    // Create PostgreSQL connection pool
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false
    });

    // Test the connection first
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    // Create Prisma adapter
    const adapter = new PrismaPg(pool);

    prisma = new PrismaClient({
      adapter,
      log: ['error', 'warn'], // Reduce verbosity during startup
    });

    // Test Prisma connection
    await prisma.$queryRaw`SELECT 1`;

    console.log('✅ Database connected successfully');
    dbAvailable = true;

  } catch (error) {
    console.warn('⚠️ Database adapter not available:', error.message);
    console.log('🔄 Running in database-less mode');
    prisma = null;
    dbAvailable = false;
  }
}

// Initialize database immediately
initializeDatabase();

export class DatabaseService {
  // User operations
  static async findOrCreateUser(userId, email = null) {
    if (!prisma) {
      console.warn('Database not available - returning mock user');
      return { id: userId || 'mock-user-id', email: email || `${userId}@example.com` };
    }

    try {
      let user;

      // If userId is provided, try to find by ID
      if (userId) {
        user = await prisma.user.findUnique({
          where: { id: userId }
        });
      }

      // If user not found and email is provided, try to find by email
      if (!user && email) {
        user = await prisma.user.findUnique({
          where: { email }
        });
      }

      // If still not found, create new user
      if (!user && email) {
        user = await prisma.user.create({
          data: {
            id: userId || randomUUID(),
            email: email
          }
        });
        console.log(`✅ Created new user: ${user.id} (${user.email})`);
      }

      if (!user) {
        throw new Error('Unable to find or create user - both userId and email are missing');
      }

      return user;
    } catch (error) {
      console.error('Error in findOrCreateUser:', error);
      throw error;
    }
  }

  // Allocation operations
  static async createAllocation(data) {
    if (!prisma) {
      console.warn('Database not available - returning mock allocation');
      return {
        id: 'mock-' + Date.now(),
        ...data,
        status: 'CREATING',
        createdAt: new Date()
      };
    }

    try {
      console.log('🔍 Creating allocation with data:', JSON.stringify(data, null, 2));

      // Validate required fields before creating
      if (!data.userId) {
        throw new Error('userId is required for allocation creation');
      }
      if (!data.appName) {
        throw new Error('appName is required for allocation creation');
      }

      const allocation = await prisma.allocation.create({
        data: {
          userId: data.userId,
          appName: data.appName,
          status: 'CREATING',
          node: data.node || null,
          cpu: data.cpu || 200,
          memory: data.memory || 256,
          image: data.image || 'nginx',
          port: data.port || 80,
          // Ensure all nullable fields are properly handled
          url: null,
          deploymentId: null,
          serviceId: null,
          ingressId: null,
        }
      });

      console.log(`✅ Created allocation record: ${allocation.id}`);
      return allocation;
    } catch (error) {
      console.error('❌ Error in createAllocation:', error);

      // If it's a constraint error, try to find what's missing
      if (error.code === 'P2011') {
        console.error('❌ Null constraint violation. Check if all required fields are provided.');
        console.error('❌ Data being inserted:', JSON.stringify(data, null, 2));

        // Try to get more details about the constraint
        if (error.meta && error.meta.driverAdapterError) {
          console.error('❌ Driver adapter error:', error.meta.driverAdapterError);
        }
      }

      throw error;
    }
  }

  static async updateAllocationStatus(appName, status, additionalData = {}) {
    if (!prisma) {
      console.warn('Database not available - mocking status update');
      return { appName, status, ...additionalData };
    }

    try {
      const updateData = {
        status,
        updatedAt: new Date(),
        ...additionalData
      };

      const allocation = await prisma.allocation.update({
        where: { appName },
        data: updateData
      });

      console.log(`Updated allocation ${appName} status to: ${status}`);
      return allocation;
    } catch (error) {
      console.error('Error in updateAllocationStatus:', error);
      throw error;
    }
  }

  static async updateAllocationWithK8sResources(appName, k8sResources) {
    if (!prisma) {
      console.warn('Database not available - mocking K8s resource update');
      return { appName, ...k8sResources, status: 'RUNNING' };
    }

    try {
      const allocation = await prisma.allocation.update({
        where: { appName },
        data: {
          deploymentId: k8sResources.deploymentId,
          serviceId: k8sResources.serviceId,
          ingressId: k8sResources.ingressId,
          url: k8sResources.url,
          status: 'RUNNING',
          updatedAt: new Date()
        }
      });

      console.log(`Updated allocation ${appName} with K8s resources`);
      return allocation;
    } catch (error) {
      console.error('Error in updateAllocationWithK8sResources:', error);
      throw error;
    }
  }

  static async getAllocationByAppName(appName) {
    if (!prisma) {
      console.warn('Database not available - returning mock allocation');
      return {
        id: 'mock-' + Date.now(),
        appName,
        status: 'RUNNING',
        url: `http://${appName}.127.0.0.1.nip.io:8080`,
        user: { id: 'demo-user-123', email: 'demo-user-123@example.com' }
      };
    }

    try {
      return await prisma.allocation.findUnique({
        where: { appName },
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          }
        }
      });
    } catch (error) {
      console.error('Error in getAllocationByAppName:', error);
      throw error;
    }
  }

  static async getAllocationsByUserId(userId) {
    if (!prisma) {
      console.warn('Database not available - returning empty array');
      return [];
    }

    try {
      return await prisma.allocation.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Error in getAllocationsByUserId:', error);
      throw error;
    }
  }

  static async getAllAllocations() {
    if (!prisma) {
      console.warn('Database not available - returning empty array');
      return [];
    }

    try {
      return await prisma.allocation.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Error in getAllAllocations:', error);
      throw error;
    }
  }

  static async deleteAllocation(appName) {
    if (!prisma) {
      console.warn('Database not available - mocking deletion');
      return { appName, deleted: true };
    }

    try {
      const allocation = await prisma.allocation.delete({
        where: { appName }
      });

      console.log(`Deleted allocation: ${allocation.id}`);
      return allocation;
    } catch (error) {
      console.error('Error in deleteAllocation:', error);
      throw error;
    }
  }

  static async getAllocationStats() {
    if (!prisma) {
      console.warn('Database not available - returning mock stats');
      return {
        total: 0,
        byStatus: { RUNNING: 0, CREATING: 0, FAILED: 0 }
      };
    }

    try {
      const stats = await prisma.allocation.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      });

      const total = await prisma.allocation.count();

      return {
        total,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.status;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error in getAllocationStats:', error);
      throw error;
    }
  }

  // Cleanup and utility methods
  static async disconnect() {
    if (prisma) {
      await prisma.$disconnect();
    }
  }

  static async healthCheck() {
    if (!prisma) {
      return { status: 'unhealthy', error: 'Database not configured', timestamp: new Date() };
    }

    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
  }
}

export default DatabaseService;
