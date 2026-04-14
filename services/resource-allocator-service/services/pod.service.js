import { coreApi, watch } from "../kubernetes/client.js";
import DatabaseService from "./database.service.js";

/**
 * Resolve detailed status for all pods matching appName.
 * Maps Kubernetes phases + container states to human-friendly status strings.
 */
async function resolvePodStatuses(appName, namespace = "default") {
    const res = await coreApi.listNamespacedPod({
        namespace,
        labelSelector: `app=${appName}`,
    });

    const pods = res.items || [];

    return pods.map((pod) => {
        const podName = pod.metadata.name;
        const phase = pod.status?.phase || "Unknown";
        const conditions = pod.status?.conditions || [];
        const containerStatuses = pod.status?.containerStatuses || [];

        let displayStatus = mapPhaseToDisplay(phase);
        let reason = null;
        let restartCount = 0;
        let ready = false;

        if (containerStatuses.length > 0) {
            const cs = containerStatuses[0];
            restartCount = cs.restartCount || 0;
            ready = cs.ready || false;

            if (cs.state?.waiting) {
                reason = cs.state.waiting.reason;
                displayStatus = mapWaitingReason(reason);
            } else if (cs.state?.terminated) {
                reason = cs.state.terminated.reason || "Terminated";
                displayStatus = "Failed";
            } else if (cs.state?.running) {
                displayStatus = ready ? "Running" : "Starting";
            }
        }

        // Check for CrashLoopBackOff specifically
        if (reason === "CrashLoopBackOff") {
            displayStatus = "CrashLoopBackOff";
        }

        return {
            podName,
            phase,
            displayStatus,
            reason,
            restartCount,
            ready,
            createdAt: pod.metadata.creationTimestamp,
            nodeName: pod.spec.nodeName || null,
            containerCount: pod.spec.containers?.length || 0,
            conditions: conditions.map((c) => ({
                type: c.type,
                status: c.status,
                reason: c.reason,
            })),
        };
    });
}

/**
 * Map Kubernetes phase to a user-friendly display status.
 */
function mapPhaseToDisplay(phase) {
    const map = {
        Pending: "Deploying",
        Running: "Running",
        Succeeded: "Completed",
        Failed: "Failed",
        Unknown: "Unknown",
    };
    return map[phase] || phase;
}

/**
 * Map waiting reason to a user-friendly display status.
 */
function mapWaitingReason(reason) {
    const map = {
        ContainerCreating: "Deploying",
        PodInitializing: "Deploying",
        ImagePullBackOff: "ImagePullFailed",
        ErrImagePull: "ImagePullFailed",
        CrashLoopBackOff: "CrashLoopBackOff",
        CreateContainerConfigError: "ConfigError",
    };
    return map[reason] || "Deploying";
}

/**
 * Derive an aggregate status for the entire appName from all its pod statuses.
 * Priority: Failed > CrashLoopBackOff > Deploying > Running > Completed
 */
function deriveAggregateStatus(podStatuses) {
    if (podStatuses.length === 0) return "NoPods";

    const priority = ["Failed", "CrashLoopBackOff", "ImagePullFailed", "ConfigError", "Deploying", "Starting", "Running", "Completed", "Unknown"];

    let highest = "Unknown";
    for (const ps of podStatuses) {
        const idx = priority.indexOf(ps.displayStatus);
        const curIdx = priority.indexOf(highest);
        if (idx !== -1 && idx < curIdx) {
            highest = ps.displayStatus;
        }
    }

    return highest;
}

/**
 * Watch pod status for a given appName using polling.
 * Uses Kubernetes API to fetch pod statuses every `intervalMs`.
 *
 * @param {string}   appName     The Kubernetes label value (label: app=<appName>)
 * @param {object}   socket      Socket.IO socket instance
 * @param {string}   namespace   Kubernetes namespace (default: "default")
 * @param {number}   intervalMs  Polling interval (default: 3000ms)
 * @returns {Function}           Cleanup function to stop watching
 */
export function watchPodStatus(appName, socket, namespace = "default", intervalMs = 3000) {
    let stopped = false;
    let lastEmittedJSON = "";

    async function poll() {
        if (stopped) return;

        try {
            const podStatuses = await resolvePodStatuses(appName, namespace);
            const aggregateStatus = deriveAggregateStatus(podStatuses);

            // Fetch the allocation URL from the database
            let url = null;
            try {
                const allocation = await DatabaseService.getAllocationByAppName(appName);
                if (allocation?.url) {
                    url = allocation.url;
                }
            } catch (_) {
                // DB might be unavailable — URL will be null
            }

            const payload = {
                appName,
                aggregateStatus,
                pods: podStatuses,
                url,
                timestamp: new Date().toISOString(),
            };

            // Only emit if something actually changed (avoid noise)
            const payloadJSON = JSON.stringify(payload);
            if (payloadJSON !== lastEmittedJSON) {
                lastEmittedJSON = payloadJSON;
                socket.emit("pod-status", payload);
            }
        } catch (err) {
            socket.emit("pod-status", {
                appName,
                aggregateStatus: "Error",
                pods: [],
                url: null,
                error: err.message,
                timestamp: new Date().toISOString(),
            });
        }
    }

    // Initial poll immediately
    poll();

    const intervalId = setInterval(poll, intervalMs);

    // Return cleanup
    return () => {
        stopped = true;
        clearInterval(intervalId);
    };
}