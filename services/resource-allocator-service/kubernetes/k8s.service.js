import { coreApi, k8sApi, k8sNetworkingApi } from "./client.js";

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