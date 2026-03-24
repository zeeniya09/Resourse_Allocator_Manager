import { coreApi } from "../kubernetes/client.js";

export async function getNodeMap() {
    const nodes = await coreApi.listNode();

    const map = {};

    nodes.body.items.forEach((node) => {
        const name = node.metadata.name;

        const ipObj = node.status.addresses.find(
            (addr) => addr.type === "InternalIP"
        );

        if (ipObj) {
            map[ipObj.address] = name;
        }
    });

    return map;
}