"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { podApi, type PodAllocation } from "@/lib/api";

const statusStyles: Record<string, string> = {
  RUNNING: "text-green-500",
  DEPLOYING: "text-blue-400",
  PENDING: "text-blue-400",
  FAILED: "text-error",
  DELETED: "text-slate-500",
};

const statusDotStyles: Record<string, string> = {
  RUNNING: "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]",
  DEPLOYING: "bg-blue-400 animate-pulse",
  PENDING: "bg-blue-400 animate-pulse",
  FAILED: "bg-error/50 animate-pulse",
  DELETED: "bg-slate-500/50",
};

export default function AllocationsPage() {
  const { isAdmin } = useAuth();
  const [pods, setPods] = useState<PodAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [deletingPod, setDeletingPod] = useState<string | null>(null);

  const fetchPods = useCallback(async () => {
    try {
      setError("");
      // Admin sees all pods, regular users see their own
      const data = isAdmin
        ? await podApi.getAllPods()
        : await podApi.getUserPods();
      setPods(data.pods || []);
    } catch (err) {
      console.error("Failed to fetch pods:", err);
      setError(err instanceof Error ? err.message : "Failed to load allocations");
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchPods();
  }, [fetchPods]);

  const handleDelete = async (appName: string) => {
    if (!confirm(`Are you sure you want to delete pod "${appName}"? This will remove all associated Kubernetes resources.`)) {
      return;
    }
    setDeletingPod(appName);
    try {
      await podApi.deletePod(appName);
      // Refresh the list
      await fetchPods();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete pod");
    } finally {
      setDeletingPod(null);
    }
  };

  const activePods = pods.filter((p) => p.status !== "DELETED");
  const filtered =
    filter === "All"
      ? activePods
      : activePods.filter((a) => a.status === filter);

  const allStatuses = ["All", ...new Set(activePods.map((p) => p.status))];

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-on-surface tracking-tight">
            Pod Allocations
          </h2>
          <p className="text-on-surface-variant text-sm mt-1">
            {isAdmin
              ? "All pod allocations across the cluster."
              : "Your pod allocations and deployments."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPods}
            className="px-4 py-2.5 bg-surface-container-high text-slate-300 font-bold text-xs uppercase tracking-widest rounded-lg flex items-center gap-2 hover:bg-surface-container-highest transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
          <Link
            href="/create-pod"
            className="gradient-cta text-white font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-lg flex items-center gap-2 hover:brightness-110 transition-all active:scale-95 cursor-pointer"
            style={{ boxShadow: "0 8px 24px rgba(50, 108, 229, 0.3)" }}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Allocation
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-medium flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          {error}
          <button
            onClick={fetchPods}
            className="ml-auto text-xs uppercase tracking-widest font-bold hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {allStatuses.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              filter === f
                ? "bg-primary-container text-white"
                : "bg-surface-container-high text-slate-400 hover:bg-surface-container-highest hover:text-slate-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="bg-surface-container rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4 block">
            progress_activity
          </span>
          <p className="text-sm text-on-surface-variant">Loading allocations...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-container rounded-xl p-12 text-center animate-fade-in-up">
          <span
            className="material-symbols-outlined text-outline mb-4 block"
            style={{ fontSize: "64px" }}
          >
            deployed_code
          </span>
          <h3 className="text-lg font-bold text-white mb-2">No Pods Found</h3>
          <p className="text-sm text-on-surface-variant mb-6">
            {filter !== "All"
              ? `No pods with status "${filter}".`
              : "You haven't allocated any pods yet. Deploy your first workload!"}
          </p>
          <Link
            href="/create-pod"
            className="inline-flex items-center gap-2 gradient-cta text-white font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-lg hover:brightness-110 transition-all"
            style={{ boxShadow: "0 8px 24px rgba(50, 108, 229, 0.3)" }}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Deploy New Pod
          </Link>
        </div>
      ) : (
        /* Table */
        <div className="bg-surface-container rounded-xl overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/15">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    App Name
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Node
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    CPU
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Memory
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Image
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Age
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pod, i) => (
                  <tr
                    key={pod.id}
                    className={`border-b border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors ${
                      i % 2 === 0
                        ? "bg-surface-container"
                        : "bg-surface-container-low"
                    }`}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center border border-white/5">
                          <span className="material-symbols-outlined text-primary text-sm">
                            deployed_code
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">
                            {pod.appName}
                          </span>
                          {pod.url && (
                            <a
                              href={pod.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline font-mono"
                            >
                              {pod.url}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-mono text-slate-400">
                      {pod.node || "—"}
                    </td>
                    <td className="px-6 py-3.5 text-xs font-mono text-slate-300">
                      {pod.cpu}m
                    </td>
                    <td className="px-6 py-3.5 text-xs font-mono text-slate-300">
                      {pod.memory}Mi
                    </td>
                    <td className="px-6 py-3.5 text-xs font-mono text-slate-400 max-w-[120px] truncate">
                      {pod.image}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            statusDotStyles[pod.status] || "bg-slate-500"
                          }`}
                        />
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            statusStyles[pod.status] || "text-slate-400"
                          }`}
                        >
                          {pod.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-mono text-slate-500">
                      {formatDate(pod.createdAt)}
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => handleDelete(pod.appName)}
                        disabled={
                          deletingPod === pod.appName ||
                          pod.status === "DELETED"
                        }
                        className="p-1.5 text-slate-500 hover:text-error hover:bg-error/10 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Delete Pod"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {deletingPod === pod.appName
                            ? "progress_activity"
                            : "delete"}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer info */}
      {!isLoading && filtered.length > 0 && (
        <div className="mt-4 flex justify-between items-center">
          <p className="text-[10px] text-slate-500 font-mono">
            Showing {filtered.length} of {activePods.length} pods
          </p>
          <p className="text-[10px] text-slate-600 font-mono">
            Live data from cluster
          </p>
        </div>
      )}
    </>
  );
}
