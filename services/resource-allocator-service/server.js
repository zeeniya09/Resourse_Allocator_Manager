import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import { cleanupPortForwards } from "./kubernetes/k8s.service.js";
import DatabaseService from "./services/database.service.js";
import { podSocketHandler } from "./sockets/podSocket.js";

const PORT = process.env.PORT || 5000;
const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
    : "*";

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

        // Create HTTP server from Express app (required for Socket.IO)
        const server = http.createServer(app);

        // Attach Socket.IO to the HTTP server
        const io = new SocketIOServer(server, {
            cors: {
                origin: corsOrigin,
                methods: ["GET", "POST"],
            },
            pingTimeout: 60000,
            pingInterval: 25000,
        });

        // Register socket handlers
        podSocketHandler(io);
        console.log('🔌 Socket.IO attached — real-time logs & status ready');

        // Start server
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Pod allocation API ready`);
            console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
            if (healthCheck.status === 'unhealthy') {
                console.log('💡 Tip: Set up DATABASE_URL to enable database features');
            }
        });

        // Graceful cleanup
        const gracefulShutdown = (signal) => {
            console.log(`\n🔄 Received ${signal}. Shutting down gracefully...`);
            cleanupPortForwards();
            DatabaseService.disconnect();
            io.close(() => {
                console.log('🔌 Socket.IO closed');
            });
            server.close(() => {
                console.log('✅ Server closed');
                process.exit(0);
            });

            // Force exit after 10 seconds
            setTimeout(() => {
                console.error('⚠️ Forced exit after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

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