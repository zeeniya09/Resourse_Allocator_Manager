"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { login, register, isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        const result = await register(email);
        setSuccess(result.message || "Account created! You can now log in.");
        setIsRegisterMode(false);
      } else {
        await login(email);
        router.push("/");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show nothing while checking auth (prevents flash)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-cta flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-white" style={{ fontSize: "24px" }}>
              layers
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, rgba(50, 108, 229, 0.4) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, rgba(190, 82, 0, 0.3) 0%, transparent 70%)",
          }}
        />
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="w-full max-w-md z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl gradient-cta mx-auto flex items-center justify-center mb-6"
            style={{ boxShadow: "0 12px 32px rgba(50, 108, 229, 0.4)" }}>
            <span
              className="material-symbols-outlined text-white"
              style={{ fontSize: "32px" }}
            >
              layers
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            KubeLitho
          </h1>
          <p className="text-on-surface-variant text-sm mt-2">
            Control Plane Access
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-surface-container rounded-2xl p-8 border border-outline-variant/10"
          style={{
            boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.03) inset",
          }}
        >
          <h2 className="text-lg font-bold text-white mb-1">
            {isRegisterMode ? "Create Account" : "Sign In"}
          </h2>
          <p className="text-xs text-on-surface-variant mb-6">
            {isRegisterMode
              ? "Register a new account to access the dashboard."
              : "Enter your email to access the control plane."}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">
                check_circle
              </span>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">
                  mail
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-lowest rounded-lg pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none border-b-2 border-outline-variant focus:border-primary transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <button
              id="btn-login"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 gradient-cta hover:brightness-110 text-white font-bold rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{ boxShadow: "0 8px 24px rgba(50, 108, 229, 0.35)" }}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">
                    progress_activity
                  </span>
                  Processing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">
                    {isRegisterMode ? "person_add" : "login"}
                  </span>
                  {isRegisterMode ? "Create Account" : "Sign In"}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError("");
                setSuccess("");
              }}
              className="text-xs text-primary hover:text-primary-fixed transition-colors cursor-pointer"
            >
              {isRegisterMode
                ? "Already have an account? Sign in"
                : "New user? Create an account"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-600 mt-8 font-mono">
          KubeLitho Control Plane v1.28.4-stable
        </p>
      </div>
    </div>
  );
}
