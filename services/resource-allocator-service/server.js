import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { cleanupPortForwards } from "./kubernetes/k8s.service.js";

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful cleanup
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    cleanupPortForwards();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    cleanupPortForwards();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});