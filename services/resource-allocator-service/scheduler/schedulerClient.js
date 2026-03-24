import { getNodeCPUUsage } from "../services/prometheus.service.js";
import { getNodeMap } from "../utils/node-mapper.js";

export async function selectBestNode() {
    const { cpu, memory } = await getNodeCPUUsage();

    console.log('CPU array:', cpu);
    console.log('Memory array:', memory);
    console.log('CPU type:', typeof cpu);
    console.log('Memory type:', typeof memory);

    if (!cpu || !Array.isArray(cpu)) {
        throw new Error('CPU data is not an array or is undefined');
    }
    if (!memory || !Array.isArray(memory)) {
        throw new Error('Memory data is not an array or is undefined');
    }

    const nodeMap = await getNodeMap();

    const nodeScores = {};

    cpu.forEach((c) => {
        const instance = c.metric.instance;
        const ip = instance.split(":")[0];

        const nodeName = nodeMap[ip];

        if (!nodeName) return;

        const cpuUsage = parseFloat(c.value[1]);

        const memObj = memory.find(
            (m) => m.metric.instance === instance
        );

        const memUsage = memObj
            ? parseFloat(memObj.value[1])
            : 0;

        const score = (0.7 * cpuUsage) + (0.3 * memUsage);

        nodeScores[nodeName] = score;
    });

    const bestNode = Object.entries(nodeScores).sort(
        (a, b) => a[1] - b[1]
    )[0][0];

    return bestNode;
}
// import axios from "axios";

// export const selectNode = async (data) => {
//     const res = await axios.post(
//         "http://scheduler-service:4000/schedule",
//         data
//     );

//     return res.data;
// };