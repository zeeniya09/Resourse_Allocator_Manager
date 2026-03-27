"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar, TopBar } from "@/components";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-surface items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-cta flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-white" style={{ fontSize: "24px" }}>
              layers
            </span>
          </div>
          <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">
            Initializing Control Plane...
          </p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (render nothing during redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="ml-64 min-h-screen flex flex-col flex-1">
        <TopBar />
        <div className="mt-16 p-8 flex-1 bg-surface-dim">{children}</div>
      </main>
    </div>
  );
}
