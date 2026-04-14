import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

const NODE_ENV = process.env.NODE_ENV || "development";
const PROM_URL = process.env.PROM_URL || (NODE_ENV === "development" ? "http://localhost:9090/api/v1/query" : "");

if (!PROM_URL && NODE_ENV !== "development") {
  throw new Error("PROM_URL is required in non-development environments");
}
console.log('PROM_URL:', PROM_URL);

export async function getNodeCPUUsage() {
  const cpuQuery = `
    100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)
  `;

  const memQuery = `
    (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) 
    / node_memory_MemTotal_bytes * 100
  `;

  try {
    const [cpuRes, memRes] = await Promise.all([
      axios.get(PROM_URL, { params: { query: cpuQuery } }),
      axios.get(PROM_URL, { params: { query: memQuery } }),
    ]);

    console.log('CPU Response:', JSON.stringify(cpuRes.data, null, 2));
    console.log('Memory Response:', JSON.stringify(memRes.data, null, 2));

    return {
      cpu: cpuRes.data.data.result,
      memory: memRes.data.data.result
    };
  } catch (error) {
    console.error('Prometheus API Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}