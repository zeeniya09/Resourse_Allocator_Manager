"use client";

import { useEffect, useState } from "react";
import { podApi, type PodStats, type K8sPod } from "@/lib/api";

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<PodStats | null>(null);
  const [k8sPods, setK8sPods] = useState<K8sPod[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingPods, setIsLoadingPods] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await podApi.getStats();
        setStats(data.stats);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setIsLoadingStats(false);
      }
    }

    async function fetchK8sPods() {
      try {
        const data = await podApi.listK8sPods();
        setK8sPods(data.pods || []);
      } catch (err) {
        console.error("Failed to fetch k8s pods:", err);
      } finally {
        setIsLoadingPods(false);
      }
    }

    fetchStats();
    fetchK8sPods();
  }, []);

  // Group pods by node
  const nodeMap = new Map<
    string,
    { pods: K8sPod[]; healthy: number; total: number }
  >();
  k8sPods.forEach((pod) => {
    const node = pod.node || "unassigned";
    if (!nodeMap.has(node)) {
      nodeMap.set(node, { pods: [], healthy: 0, total: 0 });
    }
    const entry = nodeMap.get(node)!;
    entry.pods.push(pod);
    entry.total++;
    if (pod.status === "Running") entry.healthy++;
  });

  const statusEntries = stats?.byStatus
    ? Object.entries(stats.byStatus)
    : [];

  const statusIcons: Record<string, string> = {
    RUNNING: "check_circle",
    DEPLOYING: "pending",
    FAILED: "error",
    DELETED: "delete",
    PENDING: "schedule",
  };

  const statusColors: Record<string, string> = {
    RUNNING: "text-green-500",
    DEPLOYING: "text-blue-400",
    FAILED: "text-error",
    DELETED: "text-slate-500",
    PENDING: "text-blue-400",
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-on-surface tracking-tight">
          Cluster Statistics
        </h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Real-time pod allocation metrics and Kubernetes node health.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 stagger-children">
        {/* Total Allocations */}
        <div className="animate-fade-in-up bg-surface-container rounded-xl p-6 relative overflow-hidden group hover:bg-surface-container-high transition-colors duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-4xl">hub</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
            Total Allocations
          </p>
          {isLoadingStats ? (
            <div className="w-16 h-8 bg-surface-container-highest rounded animate-pulse" />
          ) : (
            <span className="text-3xl font-black text-white">
              {stats?.total ?? 0}
            </span>
          )}
        </div>

        {/* K8s Pods */}
        <div className="animate-fade-in-up bg-surface-container rounded-xl p-6 relative overflow-hidden group hover:bg-surface-container-high transition-colors duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-4xl">grid_view</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
            K8s Pods
          </p>
          {isLoadingPods ? (
            <div className="w-16 h-8 bg-surface-container-highest rounded animate-pulse" />
          ) : (
            <span className="text-3xl font-black text-white">
              {k8sPods.length}
            </span>
          )}
        </div>

        {/* Active Nodes */}
        <div className="animate-fade-in-up bg-surface-container rounded-xl p-6 relative overflow-hidden group hover:bg-surface-container-high transition-colors duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-4xl">dns</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
            Active Nodes
          </p>
          {isLoadingPods ? (
            <div className="w-16 h-8 bg-surface-container-highest rounded animate-pulse" />
          ) : (
            <span className="text-3xl font-black text-white">
              {nodeMap.size}
            </span>
          )}
        </div>

        {/* Running Pods */}
        <div className="animate-fade-in-up bg-surface-container rounded-xl p-6 relative overflow-hidden group hover:bg-surface-container-high transition-colors duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-4xl">
              check_circle
            </span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
            Running K8s Pods
          </p>
          {isLoadingPods ? (
            <div className="w-16 h-8 bg-surface-container-highest rounded animate-pulse" />
          ) : (
            <span className="text-3xl font-black text-white">
              {k8sPods.filter((p) => p.status === "Running").length}
            </span>
          )}
        </div>
      </div>

      {/* Status Breakdown */}
      {statusEntries.length > 0 && (
        <>
          <h3 className="text-xl font-bold text-white tracking-tight mb-6">
            Allocation Status Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {statusEntries.map(([status, count]) => (
              <div
                key={status}
                className="bg-surface-container rounded-xl p-6 animate-fade-in-up hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`material-symbols-outlined ${
                      statusColors[status] || "text-slate-400"
                    }`}
                  >
                    {statusIcons[status] || "circle"}
                  </span>
                  <span className="text-sm font-bold text-slate-200 uppercase">
                    {status}
                  </span>
                </div>
                <span className="text-3xl font-black text-white">{count}</span>
                <div className="mt-3">
                  <ProgressBar
                    value={stats ? (count / stats.total) * 100 : 0}
                    color={
                      status === "RUNNING"
                        ? "bg-green-500"
                        : status === "FAILED"
                        ? "bg-error"
                        : "bg-primary-container"
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Node Health */}
      {nodeMap.size > 0 && (
        <>
          <h3 className="text-xl font-bold text-white tracking-tight mb-6">
            Node Health
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from(nodeMap.entries()).map(([nodeName, data]) => {
              const healthPct =
                data.total > 0
                  ? Math.round((data.healthy / data.total) * 100)
                  : 0;
              return (
                <div
                  key={nodeName}
                  className="bg-surface-container rounded-xl p-6 animate-fade-in-up hover:bg-surface-container-high transition-colors duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-bold text-slate-200">
                        {nodeName}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">
                        {data.total} pods
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        healthPct > 80
                          ? "text-green-500"
                          : healthPct > 50
                          ? "text-tertiary-container"
                          : "text-error"
                      }`}
                    >
                      {healthPct > 80
                        ? "Healthy"
                        : healthPct > 50
                        ? "Warning"
                        : "Critical"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-400 uppercase tracking-widest font-bold">
                          Pod Health
                        </span>
                        <span className="text-slate-300 font-mono">
                          {healthPct}%
                        </span>
                      </div>
                      <ProgressBar
                        value={healthPct}
                        color={
                          healthPct > 80
                            ? "bg-green-500"
                            : healthPct > 50
                            ? "bg-tertiary-container"
                            : "bg-error"
                        }
                      />
                    </div>
                  </div>

                  {/* Pod list for this node */}
                  <div className="mt-4 space-y-1.5 max-h-32 overflow-y-auto">
                    {data.pods.slice(0, 5).map((pod) => (
                      <div
                        key={pod.name}
                        className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-surface-container-lowest"
                      >
                        <span className="font-mono text-slate-400 truncate max-w-[60%]">
                          {pod.name}
                        </span>
                        <span
                          className={`font-bold uppercase ${
                            pod.status === "Running"
                              ? "text-green-500"
                              : "text-blue-400"
                          }`}
                        >
                          {pod.status}
                        </span>
                      </div>
                    ))}
                    {data.pods.length > 5 && (
                      <p className="text-[10px] text-slate-600 text-center">
                        +{data.pods.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
