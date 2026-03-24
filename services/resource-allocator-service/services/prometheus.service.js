// services/prometheus.service.ts
import axios from "axios";

const PROM_URL = process.env.PROM_URL;

export async function getNodeCPUUsage() {
    const cpuQuery = `
    100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)
  `;

    const memQuery = `
    (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) 
    / node_memory_MemTotal_bytes * 100
  `;

    const [cpuRes, memRes] = await Promise.all([
        axios.get(PROM_URL, { params: { query: cpuQuery } }),
        axios.get(PROM_URL, { params: { query: memQuery } }),
    ]);

    return {
        cpu: cpuRes.data.data.result,
        memory: memRes.data.data.result
    };
}