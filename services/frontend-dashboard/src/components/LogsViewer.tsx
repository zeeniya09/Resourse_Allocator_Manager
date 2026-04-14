"use client";

import {
    useEffect,
    useRef,
    useState,
    useCallback,
    useMemo,
    type JSX,
} from "react";
import io, { type Socket } from "socket.io-client";

const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_RESOURCE_ALLOCATOR_URL ||
    "http://localhost:5000";

/* ──────────────────────────────────────────────── types */
interface LogEntry {
    podName: string;
    message: string;
    timestamp: string;
    level: "info" | "warn" | "error" | "debug";
}

interface PodStatusInfo {
    podName: string;
    phase: string;
    displayStatus: string;
    reason: string | null;
    restartCount: number;
    ready: boolean;
    createdAt: string;
    nodeName: string | null;
    containerCount: number;
}

interface PodStatusPayload {
    appName: string;
    aggregateStatus: string;
    pods: PodStatusInfo[];
    url: string | null;
    timestamp: string;
    error?: string;
}

interface Props {
    appName: string;
}

/* ──────────────────────────────────── status helpers */
const STATUS_CONFIG: Record<
    string,
    { color: string; bg: string; glow: string; icon: string; pulse?: boolean }
> = {
    Running: {
        color: "text-emerald-400",
        bg: "bg-emerald-500/15",
        glow: "shadow-[0_0_10px_rgba(16,185,129,0.4)]",
        icon: "check_circle",
    },
    Deploying: {
        color: "text-blue-400",
        bg: "bg-blue-500/15",
        glow: "shadow-[0_0_10px_rgba(59,130,246,0.4)]",
        icon: "rocket_launch",
        pulse: true,
    },
    Starting: {
        color: "text-sky-400",
        bg: "bg-sky-500/15",
        glow: "shadow-[0_0_10px_rgba(56,189,248,0.4)]",
        icon: "hourglass_top",
        pulse: true,
    },
    Failed: {
        color: "text-red-400",
        bg: "bg-red-500/15",
        glow: "shadow-[0_0_10px_rgba(239,68,68,0.4)]",
        icon: "cancel",
    },
    CrashLoopBackOff: {
        color: "text-orange-400",
        bg: "bg-orange-500/15",
        glow: "shadow-[0_0_10px_rgba(249,115,22,0.4)]",
        icon: "error",
        pulse: true,
    },
    ImagePullFailed: {
        color: "text-amber-400",
        bg: "bg-amber-500/15",
        glow: "shadow-[0_0_10px_rgba(245,158,11,0.4)]",
        icon: "cloud_off",
    },
    NoPods: {
        color: "text-slate-400",
        bg: "bg-slate-500/15",
        glow: "",
        icon: "cloud_queue",
    },
    Error: {
        color: "text-red-400",
        bg: "bg-red-500/15",
        glow: "",
        icon: "warning",
    },
    Completed: {
        color: "text-violet-400",
        bg: "bg-violet-500/15",
        glow: "",
        icon: "task_alt",
    },
};

const DEFAULT_STATUS_CFG = {
    color: "text-slate-400",
    bg: "bg-slate-500/15",
    glow: "",
    icon: "help",
};

const LOG_LEVEL_COLORS: Record<string, string> = {
    error: "text-red-400",
    warn: "text-amber-400",
    debug: "text-slate-500",
    info: "text-slate-300",
};

const MAX_LOGS = 2000;

/* ──────────────────────────────────── component */
export default function DeploymentLogsViewer({ appName }: Props) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [status, setStatus] = useState<PodStatusPayload | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const [filterLevel, setFilterLevel] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedPod, setExpandedPod] = useState<string | null>(null);

    const logEndRef = useRef<HTMLDivElement>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);

    /* ──── scroll handling */
    const scrollToBottom = useCallback(() => {
        if (autoScroll && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [autoScroll]);

    const handleScroll = useCallback(() => {
        const el = logContainerRef.current;
        if (!el) return;
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        setAutoScroll(isNearBottom);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [logs, scrollToBottom]);

    /* ──── socket lifecycle */
    useEffect(() => {
        if (!appName) return;

        const socket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            setIsConnected(true);
            setLogs([]); // clear previous logs on reconnect
            socket.emit("watch-app", { appName });
        });

        socket.on("disconnect", () => {
            setIsConnected(false);
        });

        socket.on("log-update", (data: LogEntry) => {
            setLogs((prev) => {
                const next = [...prev, data];
                return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
            });
        });

        socket.on("pod-status", (data: PodStatusPayload) => {
            setStatus(data);
        });

        socket.on("watch-error", (data: { message: string }) => {
            setLogs((prev) => [
                ...prev,
                {
                    podName: "system",
                    message: `[SOCKET ERROR] ${data.message}`,
                    timestamp: new Date().toISOString(),
                    level: "error",
                },
            ]);
        });

        return () => {
            socket.emit("stop-watch", { appName });
            socket.disconnect();
            socketRef.current = null;
        };
    }, [appName]);

    /* ──── computed */
    const cfg = STATUS_CONFIG[status?.aggregateStatus || ""] || DEFAULT_STATUS_CFG;

    const filteredLogs = useMemo(() => {
        return logs.filter((l) => {
            if (filterLevel !== "all" && l.level !== filterLevel) return false;
            if (searchQuery && !l.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [logs, filterLevel, searchQuery]);

    const clearLogs = () => setLogs([]);

    /* ──── render */
    return (
        <div className="flex flex-col h-full gap-6 animate-fade-in-up">
            {/* ──── Status Header Card */}
            <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.glow} flex items-center justify-center transition-all duration-500`}
                        >
                            <span
                                className={`material-symbols-outlined ${cfg.color} ${cfg.pulse ? "animate-pulse" : ""}`}
                                style={{ fontSize: "20px" }}
                            >
                                {cfg.icon}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-tight">
                                {appName}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div
                                    className={`w-1.5 h-1.5 rounded-full ${cfg.pulse ? "animate-pulse" : ""} ${isConnected ? "bg-emerald-500" : "bg-red-500"
                                        }`}
                                    style={
                                        isConnected
                                            ? { boxShadow: "0 0 6px rgba(16,185,129,0.6)" }
                                            : { boxShadow: "0 0 6px rgba(239,68,68,0.6)" }
                                    }
                                />
                                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                                    {isConnected ? "Connected" : "Disconnected"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Aggregate badge */}
                    <div
                        className={`px-4 py-1.5 rounded-lg ${cfg.bg} border border-white/5`}
                    >
                        <span
                            className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}
                        >
                            {status?.aggregateStatus || "Connecting…"}
                        </span>
                    </div>
                </div>

                {/* ──── Live URL Banner — shown when deployment succeeds */}
                {status?.aggregateStatus === "Running" && status?.url && (
                    <div className="flex items-center  float-right">
                        {/* <div
                            className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0"
                            style={{ boxShadow: "0 0 12px rgba(16,185,129,0.3)" }}
                        >
                            <span
                                className="material-symbols-outlined text-emerald-400"
                                style={{ fontSize: "20px" }}
                            >
                                rocket_launch
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-0.5">
                                Deployment Ready
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                                Your app is live and serving traffic
                            </p>
                        </div> */}
                        <a
                            href={status.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 shrink-0 text-white"
                            style={{
                                background: "linear-gradient(135deg, #059669, #10b981)",
                                boxShadow: "0 8px 24px rgba(16,185,129,0.3)",
                            }}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "16px" }}
                            >
                                open_in_new
                            </span>
                            Open Live App
                        </a>
                    </div>
                )}

                {/* Pod details grid */}
                {status?.pods && status.pods.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {status.pods.map((pod) => {
                            const podCfg =
                                STATUS_CONFIG[pod.displayStatus] || DEFAULT_STATUS_CFG;
                            const isExpanded = expandedPod === pod.podName;

                            return (
                                <button
                                    key={pod.podName}
                                    onClick={() =>
                                        setExpandedPod(isExpanded ? null : pod.podName)
                                    }
                                    className={`text-left bg-surface-container-high rounded-lg p-3 border border-outline-variant/10 hover:border-outline-variant/20 transition-all duration-200 cursor-pointer ${isExpanded ? "ring-1 ring-primary/30" : ""
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div
                                            className={`w-1.5 h-1.5 rounded-full ${pod.ready
                                                ? "bg-emerald-500"
                                                : pod.displayStatus === "Failed"
                                                    ? "bg-red-500"
                                                    : "bg-blue-400 animate-pulse"
                                                }`}
                                        />
                                        <span className="text-[10px] font-mono text-slate-400 truncate flex-1">
                                            {pod.podName}
                                        </span>
                                        <span
                                            className={`text-[9px] font-bold uppercase ${podCfg.color}`}
                                        >
                                            {pod.displayStatus}
                                        </span>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-2 pt-2 border-t border-white/5 space-y-1 text-[10px] text-slate-500 font-mono">
                                            <p>
                                                Phase: <span className="text-slate-300">{pod.phase}</span>
                                            </p>
                                            <p>
                                                Node:{" "}
                                                <span className="text-slate-300">
                                                    {pod.nodeName || "—"}
                                                </span>
                                            </p>
                                            <p>
                                                Restarts:{" "}
                                                <span
                                                    className={
                                                        pod.restartCount > 0
                                                            ? "text-amber-400"
                                                            : "text-slate-300"
                                                    }
                                                >
                                                    {pod.restartCount}
                                                </span>
                                            </p>
                                            {pod.reason && (
                                                <p>
                                                    Reason:{" "}
                                                    <span className="text-amber-400">{pod.reason}</span>
                                                </p>
                                            )}
                                            <p>
                                                Containers:{" "}
                                                <span className="text-slate-300">
                                                    {pod.containerCount}
                                                </span>
                                            </p>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ──── Live Logs Panel */}
            <div className="flex-1 flex flex-col bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden min-h-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10 bg-surface-container-low">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <span
                                className="material-symbols-outlined text-primary"
                                style={{ fontSize: "16px" }}
                            >
                                terminal
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                Live Logs
                            </span>
                        </div>

                        <div className="h-4 w-px bg-outline-variant/20" />

                        <span className="text-[10px] font-mono text-slate-600">
                            {filteredLogs.length} lines
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Search */}
                        <div className="relative">
                            <span
                                className="material-symbols-outlined text-slate-600 absolute left-2 top-1/2 -translate-y-1/2"
                                style={{ fontSize: "14px" }}
                            >
                                search
                            </span>
                            <input
                                type="text"
                                placeholder="Filter logs…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-7 pr-3 py-1 bg-surface-container-high rounded-md text-[11px] text-slate-300 font-mono placeholder:text-slate-600 border border-outline-variant/10 focus:border-primary/30 focus:outline-none w-40 transition-colors"
                            />
                        </div>

                        {/* Level filter */}
                        <select
                            value={filterLevel}
                            onChange={(e) => setFilterLevel(e.target.value)}
                            className="px-2 py-1 bg-surface-container-high rounded-md text-[10px] text-slate-400 font-bold uppercase tracking-widest border border-outline-variant/10 focus:border-primary/30 focus:outline-none cursor-pointer appearance-none"
                        >
                            <option value="all">All</option>
                            <option value="info">Info</option>
                            <option value="warn">Warn</option>
                            <option value="error">Error</option>
                            <option value="debug">Debug</option>
                        </select>

                        {/* Auto-scroll toggle */}
                        <button
                            onClick={() => setAutoScroll(!autoScroll)}
                            className={`p-1.5 rounded-md text-xs transition-all cursor-pointer ${autoScroll
                                ? "bg-primary/15 text-primary"
                                : "bg-surface-container-high text-slate-500 hover:text-slate-300"
                                }`}
                            title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "14px" }}
                            >
                                {autoScroll ? "vertical_align_bottom" : "pause"}
                            </span>
                        </button>

                        {/* Clear */}
                        <button
                            onClick={clearLogs}
                            className="p-1.5 rounded-md bg-surface-container-high text-slate-500 hover:text-slate-300 hover:bg-surface-container-highest transition-all cursor-pointer"
                            title="Clear logs"
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "14px" }}
                            >
                                delete_sweep
                            </span>
                        </button>
                    </div>
                </div>

                {/* Log output */}
                <div
                    ref={logContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-5 bg-[#0a0c10]"
                >
                    {filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <span
                                className="material-symbols-outlined text-slate-700 mb-3"
                                style={{ fontSize: "48px" }}
                            >
                                {isConnected ? "hourglass_empty" : "cloud_off"}
                            </span>
                            <p className="text-slate-600 text-xs">
                                {isConnected
                                    ? "Waiting for logs…"
                                    : "Connecting to log stream…"}
                            </p>
                        </div>
                    ) : (
                        filteredLogs.map((entry, i) => (
                            <div
                                key={i}
                                className="flex gap-3 hover:bg-white/[0.02] px-1 rounded group"
                            >
                                <span className="text-slate-700 select-none shrink-0 w-8 text-right tabular-nums">
                                    {i + 1}
                                </span>
                                <span className="text-slate-600 shrink-0 w-[140px] tabular-nums">
                                    {formatTime(entry.timestamp)}
                                </span>
                                {entry.podName !== "system" && (
                                    <span className="text-primary/50 shrink-0 w-24 truncate">
                                        {shortPodName(entry.podName)}
                                    </span>
                                )}
                                <span
                                    className={`flex-1 break-all ${LOG_LEVEL_COLORS[entry.level] || "text-slate-300"
                                        }`}
                                >
                                    {entry.message}
                                </span>
                            </div>
                        ))
                    )}
                    <div ref={logEndRef} />
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────── helpers */
function formatTime(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
        });
    } catch {
        return iso;
    }
}

function shortPodName(name: string): string {
    // Extract just the suffix hash, e.g. "user-xxx-deployment-abc12" → "abc12"
    const parts = name.split("-");
    return parts.length > 2 ? parts.slice(-2).join("-") : name;
}