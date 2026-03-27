"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi, podApi, type PodAllocation } from "@/lib/api";

export default function ProfilePage() {
  const { user, isAdmin, logout } = useAuth();
  const [recentPods, setRecentPods] = useState<PodAllocation[]>([]);
  const [podCount, setPodCount] = useState(0);
  const [isLoadingPods, setIsLoadingPods] = useState(true);

  const displayName = user?.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    async function fetchUserPods() {
      try {
        const data = await podApi.getUserPods();
        setRecentPods((data.pods || []).slice(0, 5));
        setPodCount(data.total || 0);
      } catch (err) {
        console.error("Failed to fetch user pods:", err);
      } finally {
        setIsLoadingPods(false);
      }
    }
    fetchUserPods();
  }, []);

  const statusColors: Record<string, string> = {
    RUNNING: "text-green-500",
    DEPLOYING: "text-blue-400",
    FAILED: "text-error",
    DELETED: "text-slate-500",
  };

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-black text-on-surface tracking-tight">
          Profile
        </h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Manage your account and view your activity.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Profile Card */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-surface-container rounded-xl p-8 text-center animate-fade-in-up">
            <div
              className="w-20 h-20 rounded-full gradient-cta mx-auto flex items-center justify-center text-2xl font-black text-white mb-4"
              style={{ boxShadow: "0 8px 24px rgba(50, 108, 229, 0.35)" }}
            >
              {initials}
            </div>
            <h3 className="text-lg font-bold text-white">{displayName}</h3>
            <p className="text-xs text-slate-500 font-mono mt-1">
              {user?.email || "—"}
            </p>
            <p className="text-[10px] text-primary uppercase tracking-widest font-bold mt-2">
              {isAdmin ? "Root Admin" : "Member"}
            </p>

            <div className="mt-6 pt-6 border-t border-outline-variant/15 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">User ID</span>
                <span className="text-slate-300 font-mono truncate max-w-[140px]">
                  {user?.id || "—"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total Pods</span>
                <span className="text-slate-300 font-mono">
                  {isLoadingPods ? "..." : podCount}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Role</span>
                <span className="text-slate-300 font-mono">
                  {isAdmin ? "admin" : "user"}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="mt-6 w-full py-2.5 rounded-lg bg-error/10 text-error text-xs font-bold uppercase tracking-widest hover:bg-error/20 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Personal Info */}
          <div
            className="bg-surface-container rounded-xl p-8 animate-fade-in-up"
            style={{ animationDelay: "0.05s" }}
          >
            <h3 className="font-bold text-white uppercase text-xs tracking-widest mb-6">
              Account Information
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: "Display Name", value: displayName },
                { label: "Email", value: user?.email || "—" },
                { label: "Role", value: isAdmin ? "Root Admin" : "Standard User" },
                { label: "Account Type", value: isAdmin ? "Administrator" : "Member" },
              ].map((field) => (
                <div key={field.label} className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {field.label}
                  </label>
                  <div className="bg-surface-container-highest rounded-lg px-4 py-2.5 text-sm text-slate-200">
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div
            className="bg-surface-container rounded-xl p-8 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <h3 className="font-bold text-white uppercase text-xs tracking-widest mb-6">
              Permissions & Access
            </h3>
            <div className="flex flex-wrap gap-2">
              {(isAdmin
                ? [
                    "cluster:admin",
                    "pods:create",
                    "pods:delete",
                    "pods:view-all",
                    "nodes:manage",
                    "users:manage",
                    "rbac:admin",
                    "logs:view",
                  ]
                : ["pods:create", "pods:delete-own", "pods:view-own", "logs:view"]
              ).map((perm) => (
                <span
                  key={perm}
                  className="px-3 py-1.5 rounded-lg bg-primary-container/15 text-primary text-[10px] font-mono font-bold uppercase"
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>

          {/* Recent Pods */}
          <div
            className="bg-surface-container rounded-xl p-8 animate-fade-in-up"
            style={{ animationDelay: "0.15s" }}
          >
            <h3 className="font-bold text-white uppercase text-xs tracking-widest mb-6">
              Recent Pod Allocations
            </h3>
            {isLoadingPods ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-surface-container-highest rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : recentPods.length === 0 ? (
              <p className="text-sm text-slate-500">No pods allocated yet.</p>
            ) : (
              <div className="space-y-3">
                {recentPods.map((pod) => (
                  <div
                    key={pod.id}
                    className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-sm">
                        deployed_code
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-200">
                          {pod.appName}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {pod.image} • {pod.cpu}m / {pod.memory}Mi
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        statusColors[pod.status] || "text-slate-400"
                      }`}
                    >
                      {pod.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
