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
        const node = await selectBestNode();
        const appName = `user-${Date.now()}-chatanya`;

        // For demo purposes, using a fixed user ID - in real app, get from auth
        // Create or find a user with a proper UUID
        const user = await DatabaseService.findOrCreateUser(undefined, "demo@example.com");
        const userId = user.id;

        console.log('🔍 Using userId:', userId);

        // Create database record first
        allocationRecord = await DatabaseService.createAllocation({
            userId: typeof userId === 'string' ? userId : userId.id,
            appName,
            node,
            cpu: 200,
            memory: 256,
            image: "nginx",
            port: 80
        });

        // Ensure ingress controller is port-forwarded
        const port = await ensureIngressPortForward();
        console.log(`Ingress controller port-forwarded to localhost:${port}`);

        // Create manifests
        const metalLBIp = await getIngressIp();
        const deployment = createDeploymentManifest({
            nodeName: node,
            appName,
            image: "nginx",
            cpu: "200m",
            memory: "256Mi",
            port: 80,
            userId: "user123"
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
        const url = `http://${appName}.${metalLBIp}.nip.io:${port}`;
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
            allocationId: allocationRecord.id
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