import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { cleanupPortForwards } from "./kubernetes/k8s.service.js";
import DatabaseService from "./services/database.service.js";

const PORT = process.env.PORT || 5000;

// Initialize database connection
async function initializeServer() {
    try {
        // Test database connection
        const healthCheck = await DatabaseService.healthCheck();
        if (healthCheck.status === 'unhealthy') {
            console.warn('⚠️ Database connection failed:', healthCheck.error);
            console.log('🔄 Server will run in database-less mode');
        } else {
            console.log('✅ Database connected successfully');
        }

        // Start server
        const server = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Pod allocation API ready`);
            if (healthCheck.status === 'unhealthy') {
                console.log('💡 Tip: Set up DATABASE_URL to enable database features');
            }
        });

        // Graceful cleanup
        process.on('SIGINT', () => {
            console.log('🔄 Shutting down gracefully...');
            cleanupPortForwards();
            DatabaseService.disconnect();
            server.close(() => {
                console.log('✅ Server closed');
                process.exit(0);
            });
        });

        process.on('SIGTERM', () => {
            console.log('🔄 Shutting down gracefully...');
            cleanupPortForwards();
            DatabaseService.disconnect();
            server.close(() => {
                console.log('✅ Server closed');
                process.exit(0);
            });
        });

        return server;
    } catch (error) {
        console.error('❌ Failed to initialize server:', error);
        process.exit(1);
    }
}

// Start the server
initializeServer().catch(error => {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
});