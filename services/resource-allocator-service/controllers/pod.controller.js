import * as k8s from "@kubernetes/client-node";
import { createDeployment, createIngress, createService, ensureIngressPortForward, getIngressIp } from "../kubernetes/k8s.service.js";
import { selectBestNode } from "../scheduler/schedulerClient.js";
import { createDeploymentManifest } from "../utils/deplyment-menifest.js";
import { createIngressManifest } from "../utils/ingress-manifest.js";
import { createServiceManifest } from "../utils/service-menifest.js";

export async function allocateResource(req, res) {
    try {
        const node = await selectBestNode();

        const appName = `user-${Date.now()}-chatanya`;

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

        //  Deploy to Kubernetes
        await createDeployment(deployment);
        await createService(service);
        await createIngress(ingressManifest, "default");

        // RETURN TO USER
        res.json({
            success: true,
            appName,
            node,
            url: `http://${appName}.${metalLBIp}.nip.io:${port}`
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
}

// delete pods-
export async function deletePod(req, res) {
    try {
        // TODO: Implement pod deletion logic
        res.status(200).json({ message: "Pod deletion endpoint - not yet implemented" });
    } catch (error) {
        console.error("Error deleting pod:", error);
        res.status(500).json({ error: "Failed to delete pod" });
    }
}

export async function getPodById(req, res) {
    try {
        // TODO: Implement pod retrieval logic
        res.status(200).json({ message: "Pod retrieval endpoint - not yet implemented" });
    } catch (error) {
        console.error("Error retrieving pods:", error);
        res.status(500).json({ error: "Failed to retrieve pods" });
    }
}


export async function getAllPodsWithNodes() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    const res = await k8sApi.listPodForAllNamespaces();

    const pods = res.body.items.map(pod => ({
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        node: pod.spec.nodeName,
        status: pod.status.phase,
        ip: pod.status.podIP
    }));

    return pods;
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