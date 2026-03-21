import prisma from "../config/db.js";
import { validateResources } from "../allocator/validator.js";
import { selectNode } from "../scheduler/schedulerClient.js";

export const allocate = async (data) => {
    // 1. Validate request
    validateResources(data);

    // 2. Ask scheduler
    const node = await selectNode(data);

    // 3. Save allocation
    const allocation = await prisma.allocation.create({
        data: {
            userId: data.userId,
            cpu: data.cpu,
            memory: data.memory,
            nodeId: node.id,
            status: "ALLOCATED",
        },
    });

    return allocation;
};