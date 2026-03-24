// import { selectBestNode } from "../services/allocation.service";
// import { createDeploymentManifest } from "../services/deployment";
// import { createServiceManifest } from "../services/service";
// import { createDeployment, createService } from "../services/k8s.service";

import { createDeployment, createIngress, createService } from "../kubernetes/k8s.service.js";
import { selectBestNode } from "../scheduler/schedulerClient.js";
import { createDeploymentManifest } from "../utils/deplyment-menifest.js";
import { createIngressManifest } from "../utils/ingress-manifest.js";
import { createServiceManifest } from "../utils/service-menifest.js";

export async function allocateResource(req, res) {
    try {
        const node = await selectBestNode();

        const appName = `user-${Date.now()}-chatanya`;

        // Create manifests
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
        const ingressManifest = createIngressManifest({ appName, host: appName });

        //  Deploy to Kubernetes
        await createDeployment(deployment);
        await createService(service);
        await createIngress(ingressManifest, "default");


        // 3️⃣ Extract NodePort 🔥
        // const nodePort =
        //     svcRes.body?.spec?.ports[0]?.nodePort || svcRes.spec?.ports[0]?.nodePort;

        // RETURN TO USER
        res.json({
            success: true,
            appName,
            node,
            // nodePort,
            url: `http://${appName}`
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
}