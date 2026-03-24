// import { selectBestNode } from "../services/allocation.service";
// import { createDeploymentManifest } from "../services/deployment";
// import { createServiceManifest } from "../services/service";
// import { createDeployment, createService } from "../services/k8s.service";

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