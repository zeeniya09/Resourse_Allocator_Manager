import { coreApi, k8sApi, k8sNetworkingApi } from "./client.js";
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Store active port forwards and the current ingress port
const activePortForwards = new Map();
let currentIngressPort = null;

// Get the currently active ingress port (for URL construction)
export function getCurrentIngressPort() {
    return currentIngressPort || 8080; // Default to 8080 if not set
}

export async function getIngressIp() {
    return process.env.INGRESS_IP || "127.0.0.1";
}

// Check if port-forward is actually responding
async function isPortForwardAlive(port = 8080) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`http://localhost:${port}/healthz`, {
            signal: controller.signal
        });
        clearTimeout(timeout);
        return response.status === 200 || response.status === 404;
    } catch (error) {
        return false;
    }
}

// Check if a port is available (not in use)
async function isPortAvailable(port) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 500);
        await fetch(`http://localhost:${port}`, { signal: controller.signal });
        clearTimeout(timeout);
        return false; // Port is in use
    } catch {
        return true; // Port is available
    }
}

// Find an available port starting from preferred ports
async function findAvailablePort() {
    // Start with 8080 on Windows (avoids privilege issues with port 80)
    const preferredPorts = process.platform === 'win32'
        ? [8080, 8081, 8082, 8083, 3000, 3001, 5001, 9000, 80]
        : [80, 8080, 8081, 8082, 8083, 3000, 3001, 5001, 9000];

    for (const port of preferredPorts) {
        if (await isPortAvailable(port)) {
            console.log(`[PortForward] Found available port: ${port}`);
            return port;
        }
    }

    // If none available, pick random high port
    const randomPort = 10000 + Math.floor(Math.random() * 1000);
    console.log(`[PortForward] Using random port: ${randomPort}`);
    return randomPort;
}

// Kill any existing process using a specific port
async function killExistingPortForward(port) {
    try {
        if (process.platform === 'win32') {
            // Windows: Find and kill process using the exact port
            // Use regex to match exact port (e.g., :80 followed by space or end of line)
            const { stdout } = await execAsync(`netstat -ano | findstr /R /C:"\\<${port}\>"`);
            const lines = stdout.split('\n');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 5) {
                    const localAddr = parts[1]; // e.g., 0.0.0.0:80 or [::]:80
                    const pid = parts[4];
                    // Verify exact port match
                    if (localAddr.endsWith(`:${port}`) && pid && !isNaN(parseInt(pid))) {
                        try {
                            await execAsync(`taskkill /PID ${pid} /F`);
                            console.log(`[PortForward] Killed process ${pid} using port ${port}`);
                        } catch (e) {
                            // Process might already be gone
                        }
                    }
                }
            }
        } else {
            // Linux/Mac: Find and kill kubectl port-forward processes
            const { stdout } = await execAsync(`lsof -ti:${port}`);
            if (stdout) {
                const pids = stdout.trim().split('\n');
                for (const pid of pids) {
                    if (pid) {
                        try {
                            await execAsync(`kill -9 ${pid}`);
                            console.log(`[PortForward] Killed process ${pid} using port ${port}`);
                        } catch (e) {
                            // Process might already be gone
                        }
                    }
                }
            }
        }
    } catch (error) {
        // No process found using the port, which is fine
    }
}

export async function ensureIngressPortForward() {
    const forwardKey = 'ingress-controller';

    // Check if we have a stored process
    if (activePortForwards.has(forwardKey)) {
        const storedProcess = activePortForwards.get(forwardKey);
        const storedPort = currentIngressPort;

        // Check if stored process is still alive
        if (storedProcess && !storedProcess.killed && storedPort) {
            // Verify it's actually responding
            const isAlive = await isPortForwardAlive(storedPort);
            if (isAlive) {
                console.log(`[PortForward] Existing port-forward on port ${storedPort} is alive`);
                return storedPort;
            }
        }

        // Remove dead entry
        activePortForwards.delete(forwardKey);
        currentIngressPort = null;
    }

    // Find an available port
    const port = await findAvailablePort();
    currentIngressPort = port;

    // Kill any zombie processes using this port
    await killExistingPortForward(port);

    // Small delay to ensure port is released
    await new Promise(resolve => setTimeout(resolve, 500));

    return new Promise((resolve, reject) => {
        let resolved = false;

        console.log(`[PortForward] Starting kubectl port-forward for ingress-nginx-controller...`);

        // Port-forward ingress controller to localhost:port
        const portForward = spawn('kubectl', [
            'port-forward',
            'svc/ingress-nginx-controller',
            `${port}:80`,
            '-n', 'ingress-nginx'
        ], {
            detached: false,
            windowsHide: true // Hide console window on Windows
        });

        // Handle stdout
        portForward.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[PortForward] stdout: ${output.trim()}`);

            if (!resolved && output.includes('Forwarding from')) {
                resolved = true;
                activePortForwards.set(forwardKey, portForward);
                console.log(`[PortForward] Successfully started on port ${port}`);
                resolve(port);
            }
        });

        // Handle stderr
        portForward.stderr.on('data', (data) => {
            const msg = data.toString();
            console.error(`[PortForward] stderr: ${msg.trim()}`);

            // If port is already in use, kill it and retry
            if (!resolved && msg.includes('already in use')) {
                console.log(`[PortForward] Port ${port} is in use, attempting to kill existing process and retry...`);
                killExistingPortForward(port).then(() => {
                    // Don't resolve here - let the spawn fail and caller can retry
                });
            }
        });

        // Handle process exit
        portForward.on('close', (code) => {
            console.log(`[PortForward] Process exited with code ${code}`);
            activePortForwards.delete(forwardKey);

            if (!resolved && code !== 0) {
                resolved = true;
                reject(new Error(`Port-forward failed with code ${code}`));
            }
        });

        // Handle errors
        portForward.on('error', (err) => {
            console.error(`[PortForward] Process error:`, err);
            if (!resolved) {
                resolved = true;
                reject(err);
            }
        });

        // Timeout fallback
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                activePortForwards.set(forwardKey, portForward);
                console.log(`[PortForward] Assuming success after timeout (port ${port})`);
                resolve(port);
            }
        }, 5000);
    });
}

export async function createDeployment(manifest) {
    try {
        console.log('Creating deployment with manifest:', JSON.stringify(manifest, null, 2));
        const result = await k8sApi.createNamespacedDeployment({
            namespace: "default",
            body: manifest
        });
        console.log('Deployment created successfully:', result.metadata?.name || result.body?.metadata?.name);
        return result;
    } catch (error) {
        console.error('Error creating deployment:', error.message);
        if (error.response) {
            console.error('Kubernetes API error:', error.response.body);
        }
        throw error;
    }
}

export async function createService(serviceManifest) {
    try {
        console.log('Creating service with manifest:', JSON.stringify(serviceManifest, null, 2));
        const response = await coreApi.createNamespacedService({
            namespace: "default",
            body: serviceManifest
        });
        console.log('Service created successfully:', response.metadata?.name || response.body?.metadata?.name);
        return response;
    } catch (error) {
        console.error('Error creating service:', error.message);
        if (error.response) {
            console.error('Kubernetes API error:', error.response.body);
        }
        throw error;
    }
}

export async function createIngress(manifest, namespace = "default") {
    try {
        console.log('Creating ingress with manifest:', JSON.stringify(manifest, null, 2));
        const result = await k8sNetworkingApi.createNamespacedIngress({
            namespace: namespace,
            body: manifest
        });
        console.log('Ingress created successfully:', result.metadata?.name || result.body?.metadata?.name);
        return result;
    } catch (error) {
        console.error('Error creating ingress:', error.message);
        if (error.response) {
            console.error('Kubernetes API error:', error.response.body);
        }
        throw error;
    }
}

export async function deleteDeployment(deploymentName, namespace = "default") {
    try {
        console.log(`🗑️ Deleting deployment: ${deploymentName} in namespace: ${namespace}`);

        const result = await k8sApi.deleteNamespacedDeployment({
            name: deploymentName,
            namespace: namespace,
            body: {
                gracePeriodSeconds: 30,
                propagationPolicy: 'Foreground'
            }
        });

        console.log(`✅ Deployment ${deploymentName} deleted successfully`);
        return result;
    } catch (error) {
        console.error(`❌ Error deleting deployment ${deploymentName}:`, error.message);

        // Handle specific error cases
        if (error.response?.statusCode === 404) {
            console.log(`⚠️ Deployment ${deploymentName} not found (already deleted)`);
            return { status: 'not_found' };
        }

        if (error.response) {
            console.error('Kubernetes API error:', error.response.body);
        }
        throw error;
    }
}

export async function deleteService(serviceName, namespace = "default") {
    try {
        console.log(`🗑️ Deleting service: ${serviceName} in namespace: ${namespace}`);

        const result = await coreApi.deleteNamespacedService({
            name: serviceName,
            namespace: namespace,
            body: {
                gracePeriodSeconds: 30
            }
        });

        console.log(`✅ Service ${serviceName} deleted successfully`);
        return result;
    } catch (error) {
        console.error(`❌ Error deleting service ${serviceName}:`, error.message);

        // Handle specific error cases
        if (error.response?.statusCode === 404) {
            console.log(`⚠️ Service ${serviceName} not found (already deleted)`);
            return { status: 'not_found' };
        }

        if (error.response) {
            console.error('Kubernetes API error:', error.response.body);
        }
        throw error;
    }
}

export async function deleteIngress(ingressName, namespace = "default") {
    try {
        console.log(`🗑️ Deleting ingress: ${ingressName} in namespace: ${namespace}`);

        const result = await k8sNetworkingApi.deleteNamespacedIngress({
            name: ingressName,
            namespace: namespace,
            body: {
                gracePeriodSeconds: 30
            }
        });

        console.log(`✅ Ingress ${ingressName} deleted successfully`);
        return result;
    } catch (error) {
        console.error(`❌ Error deleting ingress ${ingressName}:`, error.message);

        // Handle specific error cases
        if (error.response?.statusCode === 404) {
            console.log(`⚠️ Ingress ${ingressName} not found (already deleted)`);
            return { status: 'not_found' };
        }

        if (error.response) {
            console.error('Kubernetes API error:', error.response.body);
        }
        throw error;
    }
}

export async function cleanupPortForwards() {
    for (const [key, childProcess] of activePortForwards) {
        if (childProcess && typeof childProcess.kill === 'function') {
            childProcess.kill();
        }
    }
    activePortForwards.clear();
}