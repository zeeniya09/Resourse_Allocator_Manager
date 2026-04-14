"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { podApi } from "@/lib/api";

const presetImages = [
  { label: "Nginx", value: "nginx", icon: "dns", desc: "Web server & reverse proxy", defaultPort: 80 },
  { label: "Node.js", value: "node:20-alpine", icon: "javascript", desc: "JavaScript runtime", defaultPort: 3000 },
  { label: "Redis", value: "redis:alpine", icon: "storage", desc: "In-memory data store", defaultPort: 6379 },
  { label: "PostgreSQL", value: "postgres:16-alpine", icon: "database", desc: "Relational database", defaultPort: 5432 },
  { label: "TTYD", value: "tsl0922/ttyd", icon: "terminal", desc: "Web-based terminal", defaultPort: 7681 },
  { label: "Custom", value: "", icon: "edit", desc: "Specify your own image", defaultPort: 80 },
];

export default function CreatePodPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [cpuValue, setCpuValue] = useState(200);
  const [memoryValue, setMemoryValue] = useState(256);
  const [selectedImage, setSelectedImage] = useState("nginx");
  const [customImage, setCustomImage] = useState("");
  const [port, setPort] = useState(80);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    success: boolean;
    appName?: string;
    url?: string;
    node?: string;
    error?: string;
  } | null>(null);

  const effectiveImage = selectedImage || customImage;

  const handleDeploy = async () => {
    if (!effectiveImage) {
      setDeployResult({ success: false, error: "Please select or enter a container image." });
      return;
    }

    setIsDeploying(true);
    setDeployResult(null);

    try {
      const result = await podApi.allocatePod({
        email: user?.email,
        cpu: cpuValue,
        memory: memoryValue,
        image: effectiveImage,
        port,
      });

      // Redirect to Deployments page to watch live logs
      router.push(`/deployments?app=${encodeURIComponent(result.appName)}`);
    } catch (err) {
      setDeployResult({
        success: false,
        error: err instanceof Error ? err.message : "Deployment failed",
      });
      setIsDeploying(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-px w-8 bg-primary-container" />
          <span className="text-primary-container text-xs font-bold tracking-[0.2em] uppercase">
            Provisioning Engine
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tighter mb-4">
              Deploy New Workload
            </h1>
            <p className="text-on-surface-variant max-w-2xl leading-relaxed">
              Configure and instantiate a new container pod. Ensure resource
              limits align with namespace quotas.
            </p>
          </div>
          <Link
            href="/allocations"
            className="text-slate-400 hover:text-slate-200 transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <span className="material-symbols-outlined">close</span>
          </Link>
        </div>
      </div>

      {/* Success / Error Banner */}
      {/* Error Banner (success redirects to /deployments) */}
      {deployResult && !deployResult.success && (
        <div className="mb-8 p-6 rounded-xl border animate-fade-in-up bg-error/10 border-error/20">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-error text-2xl">
              error
            </span>
            <div>
              <h3 className="text-sm font-bold text-error">
                Deployment Failed
              </h3>
              <p className="text-xs text-error/80 mt-1">
                {deployResult.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Configuration */}
        <div className="col-span-12 lg:col-span-7 space-y-8">
          {/* Container Image Selection */}
          <section className="bg-surface-container rounded-xl p-8 border border-outline-variant/10 relative overflow-hidden animate-fade-in-up">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="material-symbols-outlined text-8xl">
                upload_file
              </span>
            </div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                layers
              </span>
              Container Image
            </h3>

            {/* Image Presets */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {presetImages.map((img) => (
                <button
                  key={img.label}
                  onClick={() => {
                    setSelectedImage(img.value);
                    setPort(img.defaultPort);
                    if (img.value) setCustomImage("");
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer group ${(img.value && selectedImage === img.value) ||
                    (!img.value && selectedImage === "")
                    ? "border-primary-container bg-primary-container/10"
                    : "border-outline-variant/15 bg-surface-container-low hover:border-outline-variant/30 hover:bg-surface-container-high"
                    }`}
                >
                  <span className="material-symbols-outlined text-primary mb-2 block">
                    {img.icon}
                  </span>
                  <p className="text-xs font-bold text-slate-200">
                    {img.label}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Port {img.defaultPort} • {img.desc}
                  </p>
                </button>
              ))}
            </div>

            {/* Custom Image Input (shown when "Custom" is selected) */}
            {selectedImage === "" && (
              <div className="mt-4">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Custom Registry Path
                </label>
                <div className="bg-surface-container-lowest rounded-lg p-3 border-b-2 border-outline-variant focus-within:border-primary transition-all">
                  <input
                    className="w-full bg-transparent border-none p-0 text-primary font-mono text-sm outline-none"
                    type="text"
                    placeholder="docker.io/myimage:latest"
                    value={customImage}
                    onChange={(e) => setCustomImage(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Port Input */}
            <div className="mt-6">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Container Port
              </label>
              <div className="bg-surface-container-lowest rounded-lg p-3 border-b-2 border-outline-variant focus-within:border-primary transition-all max-w-[140px]">
                <input
                  className="w-full bg-transparent border-none p-0 text-on-surface font-mono text-sm outline-none"
                  placeholder="80"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                />
              </div>
            </div>
          </section>

          {/* Resource Constraints */}
          <section
            className="bg-surface-container rounded-xl p-8 border border-outline-variant/10 animate-fade-in-up"
            style={{ animationDelay: "0.05s" }}
          >
            <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                memory
              </span>
              Resource Constraints
            </h3>
            <div className="space-y-12">
              {/* CPU Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-on-surface">
                      CPU Millicores
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Allocated processing power (50–1000m)
                    </p>
                  </div>
                  <span className="text-2xl font-black text-primary font-mono tracking-tighter">
                    {cpuValue}
                    <span className="text-xs ml-1 text-on-surface-variant uppercase">
                      m
                    </span>
                  </span>
                </div>
                <input
                  className="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary-container"
                  type="range"
                  min={50}
                  max={1000}
                  step={50}
                  value={cpuValue}
                  onChange={(e) => setCpuValue(Number(e.target.value))}
                />
                <div className="flex justify-between text-[10px] text-outline font-bold uppercase">
                  <span>50m (Min)</span>
                  <span>1000m (Max)</span>
                </div>
              </div>

              {/* Memory Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-on-surface">
                      Memory Allocation
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Reserved system RAM (64–4096 MB)
                    </p>
                  </div>
                  <span className="text-2xl font-black text-primary font-mono tracking-tighter">
                    {memoryValue}
                    <span className="text-xs ml-1 text-on-surface-variant uppercase">
                      mb
                    </span>
                  </span>
                </div>
                <input
                  className="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary-container"
                  type="range"
                  min={64}
                  max={4096}
                  step={64}
                  value={memoryValue}
                  onChange={(e) => setMemoryValue(Number(e.target.value))}
                />
                <div className="flex justify-between text-[10px] text-outline font-bold uppercase">
                  <span>64 MB</span>
                  <span>4096 MB</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Preview & Deploy */}
        <div className="col-span-12 lg:col-span-5 space-y-8">
          <section
            className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10 flex flex-col animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="p-6 border-b border-surface-container-highest bg-surface-container-high/50">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  visibility
                </span>
                Deployment Summary
              </h3>
            </div>
            <div className="flex-1 p-8 flex flex-col">
              {/* Summary Details */}
              <div className="space-y-4 flex-1">
                {[
                  {
                    icon: "layers",
                    label: "Image",
                    value: effectiveImage || "Not selected",
                  },
                  { icon: "speed", label: "CPU", value: `${cpuValue}m` },
                  {
                    icon: "memory",
                    label: "Memory",
                    value: `${memoryValue} MB`,
                  },
                  { icon: "lan", label: "Port", value: port.toString() },
                  {
                    icon: "person",
                    label: "Owner",
                    value: user?.email || "—",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-sm">
                        {item.icon}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-on-surface-variant truncate max-w-[180px]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Resource Warning */}
              {(cpuValue > 500 || memoryValue > 2048) && (
                <div className="mt-6 p-3 rounded-lg bg-tertiary-container/10 border border-tertiary-container/20 flex items-center gap-3">
                  <span className="material-symbols-outlined text-tertiary-container text-sm">
                    warning
                  </span>
                  <p className="text-[10px] text-tertiary font-medium">
                    High resource allocation detected. Ensure namespace quota allows this.
                  </p>
                </div>
              )}

              {/* Deploy CTA */}
              <div className="mt-8">
                <button
                  id="btn-deploy-pod"
                  onClick={handleDeploy}
                  disabled={isDeploying || !effectiveImage}
                  className="w-full py-5 gradient-cta rounded-xl text-white font-black text-lg tracking-tight hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    boxShadow: "0 20px 40px rgba(50, 108, 229, 0.3)",
                  }}
                >
                  {isDeploying ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">
                        progress_activity
                      </span>
                      DEPLOYING...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">
                        rocket_launch
                      </span>
                      DEPLOY POD
                    </>
                  )}
                </button>
                {!isDeploying && (
                  <p className="text-center mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                    Estimated Deployment: ~15s
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
