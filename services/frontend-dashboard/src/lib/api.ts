/**
 * API service layer for communicating with backend microservices.
 * All requests are proxied through Next.js rewrites to avoid CORS.
 */

// ─── Auth helpers ───

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Token expired/invalid — clear and redirect
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Auth Service API ───

export const authApi = {
  async login(email: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{
      token: string;
      user: { id: string; email: string; isAdmin: boolean };
      isAdmin: boolean;
    }>(res);
  },

  async register(email: string) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{
      message: string;
      user: { id: string; email: string; isAdmin: boolean };
    }>(res);
  },

  async getProfile() {
    const res = await fetch("/api/auth-protected/profile", {
      headers: authHeaders(),
    });
    return handleResponse<{
      id: string;
      email: string;
      isAdmin: boolean;
      createdAt: string;
      allocations?: unknown[];
    }>(res);
  },

  async verifyToken() {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },
};

// ─── Resource Allocator Service API ───

export interface PodAllocation {
  id: string;
  userId: string;
  appName: string;
  status: string;
  node: string | null;
  cpu: number;
  memory: number;
  image: string;
  port: number;
  url: string | null;
  deploymentId: string | null;
  serviceId: string | null;
  ingressId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string };
}

export interface PodStats {
  total: number;
  byStatus: Record<string, number>;
}

export interface K8sPod {
  name: string;
  namespace: string;
  node: string;
  status: string;
  ip: string;
}

export const podApi = {
  /** Get pod statistics (public) */
  async getStats() {
    const res = await fetch("/api/resources/pod/stats");
    return handleResponse<{ success: boolean; stats: PodStats }>(res);
  },

  /** List K8s pods with nodes (public) */
  async listK8sPods() {
    const res = await fetch("/api/resources/pod/list");
    return handleResponse<{
      success: boolean;
      pods: K8sPod[];
      total: number;
    }>(res);
  },

  /** Get all pods — admin only (protected) */
  async getAllPods() {
    const res = await fetch("/api/resources/pod/", {
      headers: authHeaders(),
    });
    return handleResponse<{
      success: boolean;
      pods: PodAllocation[];
      total: number;
    }>(res);
  },

  /** Get current user's pods (protected) */
  async getUserPods() {
    const res = await fetch("/api/resources/pod/user", {
      headers: authHeaders(),
    });
    return handleResponse<{
      success: boolean;
      pods: PodAllocation[];
      total: number;
    }>(res);
  },

  /** Get pod by appName (protected) */
  async getPod(appName: string) {
    const res = await fetch(`/api/resources/pod/${appName}`, {
      headers: authHeaders(),
    });
    return handleResponse<{ success: boolean; pod: PodAllocation }>(res);
  },

  /** Allocate a new pod (protected) */
  async allocatePod(data: {
    email?: string;
    cpu?: number;
    memory?: number;
    image?: string;
    port?: number;
  }) {
    const res = await fetch("/api/resources/pod/allocate", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{
      success: boolean;
      appName: string;
      node: string;
      url: string;
      allocationId: string;
      userId: string;
      resources: { cpu: number; memory: number; image: string; port: number };
      status: string;
    }>(res);
  },

  /** Delete a pod (protected) */
  async deletePod(appName: string) {
    const res = await fetch(`/api/resources/pod/${appName}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },
};
