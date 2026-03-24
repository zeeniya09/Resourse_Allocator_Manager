import { coreApi, k8sApi } from "./client.js";

export async function createDeployment(manifest) {
    return await k8sApi.createNamespacedDeployment(
        "default",
        manifest
    );
}

export async function createService(serviceManifest) {
    const response = await coreApi.createNamespacedService(
        "default",
        serviceManifest
    );

    return response; // 🔥 IMPORTANT
}