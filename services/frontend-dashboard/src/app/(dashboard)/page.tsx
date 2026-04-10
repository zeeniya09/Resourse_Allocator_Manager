"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { podApi, type PodStats } from "@/lib/api";
import {
  TelemetryChart,
  ActivityFeed,
  StatusBanner,
  SystemLogs,
} from "@/components";

interface StatsData {
  total: number;
  byStatus: Record<string, number>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await podApi.getStats();
        setStats(data.stats);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
        // Use zero stats on error
        setStats({ total: 0, byStatus: {} });
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const displayName = user?.email?.split("@")[0] || "Operator";

  const statCards = [
    {
      id: "stat-total-pods",
      label: "Total Pods",
      value: stats ? stats.total.toString() : "—",
      icon: "hub",
      borderColor: "border-l-primary-container",
    },
    {
      id: "stat-running",
      label: "Running",
      value: stats?.byStatus?.RUNNING?.toString() ?? "0",
      icon: "check_circle",
      borderColor: "border-l-green-500/50",
      signal: { color: "bg-green-500", glow: true },
    },
    {
      id: "stat-deploying",
      label: "Deploying",
      value: stats?.byStatus?.DEPLOYING?.toString() ?? "0",
      icon: "pending",
      borderColor: "border-l-blue-400/50",
      signal: { color: "bg-blue-400", glow: false, pulse: true },
    },
    {
      id: "stat-failed",
      label: "Failed",
      value: stats?.byStatus?.FAILED?.toString() ?? "0",
      icon: "error",
      borderColor: "border-l-error",
      signal: { color: "bg-error", glow: true, pulse: true },
    },
  ];

 return (
  <div>
    {/* Welcome Row */}
    <div className="mb-10 flex justify-between items-end">
      <div>
        <h2 className="text-3xl font-black text-on-surface tracking-tight">
          Welcome back, {displayName}
        </h2>

        <p className="text-sm text-gray-400">
          Updated by Zeeniya Singh 🚀
        </p>
      </div>
    </div>

    {/* Rest of your code */}
  </div>
);
        
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-lg">
            <div
              className="w-2 h-2 rounded-full bg-green-500"
              style={{ boxShadow: "0 0 8px rgba(34, 197, 94, 0.6)" }}
            />
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">
              Cluster Online
            </span>
          </div>
        </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 stagger-children">
        {statCards.map((stat) => (
          <div
            key={stat.id}
            id={stat.id}
            className={`animate-fade-in-up bg-surface-container rounded-xl p-6 border-l-4 ${stat.borderColor} relative overflow-hidden group hover:bg-surface-container-high transition-colors duration-300`}
          >
            {/* Background icon */}
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <span className="material-symbols-outlined text-4xl">
                {stat.icon}
              </span>
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              {stat.label}
            </p>

            <div className="flex items-baseline gap-2">
              {isLoading ? (
                <div className="w-16 h-10 bg-surface-container-highest rounded animate-pulse" />
              ) : (
                <span className="text-4xl font-black text-white">
                  {stat.value}
                </span>
              )}

              {stat.signal && (
                <div
                  className={`w-2 h-2 rounded-full ${stat.signal.color} ${
                    stat.signal.pulse ? "animate-pulse" : ""
                  }`}
                  style={
                    stat.signal.glow
                      ? {
                          boxShadow: `0 0 8px ${
                            stat.signal.color.includes("green")
                              ? "rgba(34, 197, 94, 0.6)"
                              : stat.signal.color.includes("blue")
                              ? "rgba(96, 165, 250, 0.6)"
                              : "rgba(255, 180, 171, 0.6)"
                          }`,
                        }
                      : undefined
                  }
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-8">
        <TelemetryChart />
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <ActivityFeed />
          <StatusBanner />
        </div>
      </div>

      {/* System Logs */}
      <SystemLogs />
  
  
}
