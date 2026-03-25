import * as k8s from "@kubernetes/client-node";
import { createDeployment, createIngress, createService, ensureIngressPortForward, getIngressIp } from "../kubernetes/k8s.service.js";
import { selectBestNode } from "../scheduler/schedulerClient.js";
import { createDeploymentManifest } from "../utils/deplyment-menifest.js";
import { createIngressManifest } from "../utils/ingress-manifest.js";
import { createServiceManifest } from "../utils/service-menifest.js";
import DatabaseService from "../services/database.service.js";

export async function allocateResource(req, res) {
    let allocationRecord = null;

    try {
        // Extract user input with defaults
        const {
            email,
            cpu = 200,
            memory = 256,
            image = "nginx",
            port = 80,
            userId // Optional: if provided, use it directly
        } = req.body;

        // Validate required inputs
        if (!email) {
            return res.status(400).json({
                error: "Email is required for pod allocation"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: "Invalid email format"
            });
        }

        // Validate resource limits
        if (cpu < 50 || cpu > 1000) {
            return res.status(400).json({
                error: "CPU must be between 50 and 1000 millicores"
            });
        }

        if (memory < 64 || memory > 2048) {
            return res.status(400).json({
                error: "Memory must be between 64 and 2048 MB"
            });
        }

        console.log('🔍 Processing allocation request for:', { email, cpu, memory, image, port });

        const node = await selectBestNode();
        const appName = `user-${Date.now()}-${email.split('@')[0]}`;

        // Find or create user based on email
        console.log('🔍 About to call findOrCreateUser...');
        const user = await DatabaseService.findOrCreateUser(userId, email);
        const userIdToUse = user.id;

        if (!userIdToUse) {
            throw new Error('User ID is null or undefined after user creation');
        }

        console.log('✅ User ready:', { id: userIdToUse, email: user.email });
        console.log('🔍 Using userId:', userIdToUse);

        // Create database record first
        allocationRecord = await DatabaseService.createAllocation({
            userId: String(userIdToUse),
            appName,
            node,
            cpu,
            memory,
            image,
            port
        });

        console.log('✅ Allocation record created:', allocationRecord.id);

        // Ensure ingress controller is port-forwarded
        const portForward = await ensureIngressPortForward();
        console.log(`Ingress controller port-forwarded to localhost:${portForward}`);

        // Create manifests
        const metalLBIp = await getIngressIp();
        const deployment = createDeploymentManifest({
            nodeName: node,
            appName,
            image,
            cpu: `${cpu}m`,
            memory: `${memory}Mi`,
            port,
            userId: userIdToUse
        });

        const service = createServiceManifest(appName);
        const ingressManifest = createIngressManifest({ appName, metalLBIp });

        // Update status to DEPLOYING
        await DatabaseService.updateAllocationStatus(appName, 'DEPLOYING');

        // Deploy to Kubernetes
        const deploymentResult = await createDeployment(deployment);
        const serviceResult = await createService(service);
        const ingressResult = await createIngress(ingressManifest, "default");

        // Update status to RUNNING with K8s resource IDs and URL
        const url = `http://${appName}.${metalLBIp}.nip.io:${portForward}`;
        await DatabaseService.updateAllocationWithK8sResources(appName, {
            deploymentId: deploymentResult.body?.metadata?.name || deploymentResult.metadata?.name,
            serviceId: serviceResult.body?.metadata?.name || serviceResult.metadata?.name,
            ingressId: ingressResult.body?.metadata?.name || ingressResult.metadata?.name,
            url
        });

        // RETURN TO USER
        res.json({
            success: true,
            appName,
            node,
            url,
            allocationId: allocationRecord.id,
            userId: userIdToUse,
            resources: {
                cpu,
                memory,
                image,
                port
            },
            status: 'RUNNING'
        });

    } catch (err) {
        console.error('Allocation failed:', err);

        // Update database record if it was created
        if (allocationRecord) {
            try {
                await DatabaseService.updateAllocationStatus(
                    allocationRecord.appName,
                    'FAILED',
                    { error: err.message }
                );
            } catch (dbErr) {
                console.error('Failed to update allocation status:', dbErr);
            }
        }

        res.status(500).json({
            error: err.message,
            allocationId: allocationRecord?.id
        });
    }
}

// delete pods-
export async function deletePod(req, res) {
    try {
        const { appName } = req.params;

        // Get allocation details first
        const allocation = await DatabaseService.getAllocationByAppName(appName);

        if (!allocation) {
            return res.status(404).json({
                error: 'Pod allocation not found'
            });
        }

        // TODO: Add Kubernetes cleanup here
        // await deleteDeployment(allocation.deploymentId);
        // await deleteService(allocation.serviceId);
        // await deleteIngress(allocation.ingressId);

        // Update database record
        await DatabaseService.updateAllocationStatus(appName, 'DELETED');

        res.json({
            success: true,
            message: 'Pod allocation marked as deleted'
        });
    } catch (error) {
        console.error("Error deleting pod:", error);
        res.status(500).json({ error: "Failed to delete pod" });
    }
}

export async function getPodById(req, res) {
    try {
        const { appName } = req.params;

        const allocation = await DatabaseService.getAllocationByAppName(appName);

        if (!allocation) {
            return res.status(404).json({
                error: 'Pod allocation not found'
            });
        }

        res.json({
            success: true,
            pod: allocation
        });
    } catch (error) {
        console.error("Error retrieving pod:", error);
        res.status(500).json({ error: "Failed to retrieve pod" });
    }
}

export async function getUserPods(req, res) {
    try {
        // For demo purposes, using a fixed user ID - in real app, get from auth
        const userId = req.user?.id || "demo-user-123";

        const allocations = await DatabaseService.getAllocationsByUserId(userId);

        res.json({
            success: true,
            pods: allocations,
            total: allocations.length
        });
    } catch (error) {
        console.error("Error retrieving user pods:", error);
        res.status(500).json({ error: "Failed to retrieve user pods" });
    }
}

export async function getAllPods(req, res) {
    try {
        const allocations = await DatabaseService.getAllAllocations();

        res.json({
            success: true,
            pods: allocations,
            total: allocations.length
        });
    } catch (error) {
        console.error("Error retrieving all pods:", error);
        res.status(500).json({ error: "Failed to retrieve all pods" });
    }
}

export async function getPodStats(req, res) {
    try {
        const stats = await DatabaseService.getAllocationStats();

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error("Error retrieving pod stats:", error);
        res.status(500).json({ error: "Failed to retrieve pod stats" });
    }
}

export async function getAllPodsWithNodes() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    const res = await k8sApi.listPodForAllNamespaces();

    console.log('🔍 K8s API Response structure:', {
        hasBody: !!res.body,
        hasItems: !!(res.body?.items || res.items),
        bodyKeys: res.body ? Object.keys(res.body) : 'no body',
        resKeys: Object.keys(res),
        responseType: typeof res
    });

    // The response structure is different - items is at root level, not in body
    const podItems = res.body || res;

    if (!podItems.items) {
        console.error('❌ No items found in Kubernetes response:', Object.keys(res));
        console.error('❌ Response data:', JSON.stringify(res, null, 2).substring(0, 500) + '...');
        return [];
    }

    const pods = podItems.items.map(pod => ({
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        node: pod.spec.nodeName,
        status: pod.status.phase,
        ip: pod.status.podIP
    }));

    console.log(`✅ Found ${pods.length} pods`);
    return pods;
}

// Express route handler for getting all pods with nodes
export async function listAllPodsWithNodes(req, res) {
    try {
        const pods = await getAllPodsWithNodes();
        res.json({
            success: true,
            pods: pods,
            total: pods.length
        });
    } catch (error) {
        console.error("Error retrieving pods with nodes:", error);
        res.status(500).json({ error: "Failed to retrieve pods with nodes" });
    }
}

export async function getPodsGroupedByNode() {
    const pods = await getAllPodsWithNodes();

    const grouped = {};

    pods.forEach(pod => {
        if (!grouped[pod.node]) {
            grouped[pod.node] = [];
        }
        grouped[pod.node].push(pod);
    });

    return grouped;
}