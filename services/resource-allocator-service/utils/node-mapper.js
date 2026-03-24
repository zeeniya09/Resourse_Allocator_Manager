import { coreApi } from "../kubernetes/client.js";

export async function getNodeMap() {
    try {
        const nodes = await coreApi.listNode();

        console.log('Kubernetes nodes response type:', typeof nodes);
        console.log('nodes.items:', nodes.items);

        if (!nodes.items || !Array.isArray(nodes.items)) {
            console.error('Kubernetes API response missing items array');
            return {};
        }

        const map = {};

        nodes.items.forEach((node) => {
            const name = node.metadata.name;

            const ipObj = node.status.addresses.find(
                (addr) => addr.type === "InternalIP"
            );

            if (ipObj) {
                map[ipObj.address] = name;
            }
        });

        console.log('Node map created:', map);
        return map;
    } catch (error) {
        console.error('Error in getNodeMap:', error.message);
        if (error.response) {
            console.error('Kubernetes API error response:', error.response.body);
        }
        return {};
    }
}