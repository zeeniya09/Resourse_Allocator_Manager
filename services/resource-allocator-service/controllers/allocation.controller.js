// import { selectBestNode } from "../services/allocation.service";
// import { createDeploymentManifest } from "../services/deployment";
// import { createServiceManifest } from "../services/service";
// import { createDeployment, createService } from "../services/k8s.service";

import { createDeployment, createService } from "../kubernetes/k8s.service.js";
import { selectBestNode } from "../scheduler/schedulerClient.js";
import { createDeploymentManifest } from "../utils/deplyment-menifest.js";
import { createServiceManifest } from "../utils/service-menifest.js";

export async function allocateResource(req, res) {
    try {
        const node = await selectBestNode();

        const appName = `user-${Date.now()}`;

        // 1️⃣ Create manifests
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

        // 2️⃣ Deploy to Kubernetes
        await createDeployment(deployment);
        const svcRes = await createService(service);

        // 3️⃣ Extract NodePort 🔥
        const nodePort =
            svcRes.body.spec.ports[0].nodePort;

        // 4️⃣ RETURN TO USER ✅
        res.json({
            success: true,
            appName,
            node,
            url: `http://localhost:${nodePort}`
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
}