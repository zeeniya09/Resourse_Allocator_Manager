"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  icon: string;
  label: string;
  href: string;
  external?: boolean;
}

const navItems: NavItem[] = [
  { icon: "dashboard", label: "Dashboard", href: "/" },
  { icon: "memory", label: "Allocations", href: "/allocations" },
  { icon: "insights", label: "Stats", href: "/stats" },
  { icon: "account_circle", label: "Profile", href: "/profile" },
  {
    icon: "monitoring",
    label: "Grafana",
    href: "http://localhost:3030/d/advmlnt/resource-allocation-system?orgId=1&from=now-5m&to=now&timezone=browser&refresh=5s",
    external: true,
  },
];

const bottomNavItems: NavItem[] = [
  { icon: "settings", label: "Settings", href: "/settings" },
  { icon: "help_outline", label: "Support", href: "/support" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();

  const displayName = user?.email?.split("@")[0] || "User";

  return (
    <aside
      id="sidebar"
      className="fixed left-0 top-0 h-screen w-64 z-50 flex flex-col py-8"
      style={{
        backgroundColor: "#030712",
        boxShadow: "4px 0 24px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Logo / Brand */}
      <div className="px-6 mb-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-sm">layers</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Control Plane
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
              v1.28.4-stable
            </p>
          </div>
        </Link>
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = !item.external && pathname === item.href;
          const Component = item.external ? "a" : Link;
          const extraProps = item.external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {};

          return (
            <Component
              key={item.label}
              id={`nav-${item.label.toLowerCase()}`}
              href={item.href}
              {...extraProps}
              className={`
                flex items-center gap-3 px-6 py-4 transition-all duration-200
                font-sans text-xs font-semibold tracking-wide uppercase group
                ${isActive
                  ? "bg-blue-600/10 text-blue-400 border-r-2 border-blue-500"
                  : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                }
              `}
            >
              <span
                className={`material-symbols-outlined ${!isActive
                    ? "group-hover:translate-x-1 duration-200 transition-transform"
                    : ""
                  }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.external && (
                <span className="material-symbols-outlined text-[12px] text-slate-600 ml-auto">
                  open_in_new
                </span>
              )}
            </Component>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="px-6 my-4">
        <div className="bg-gradient-to-r from-transparent via-white/5 to-transparent h-[1px]" />
      </div>

      {/* Allocate Pod CTA */}
      <div className="px-6 mb-8">
        <Link
          href="/create-pod"
          id="btn-allocate-pod"
          className="w-full py-3 px-4 gradient-cta hover:brightness-110 text-on-primary-container font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest cursor-pointer"
          style={{
            boxShadow: "0 8px 24px rgba(50, 108, 229, 0.35)",
          }}
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Allocate Pod
        </Link>
      </div>

      {/* Bottom Nav */}
      <div>
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              id={`nav-${item.label.toLowerCase()}`}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 hover:bg-white/5 transition-colors font-sans text-xs font-semibold tracking-wide uppercase group ${isActive
                  ? "bg-blue-600/10 text-blue-400 border-r-2 border-blue-500"
                  : "text-slate-500 hover:text-slate-300"
                }`}
            >
              <span className="material-symbols-outlined group-hover:translate-x-1 duration-200 transition-transform">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User section at bottom */}
      <div className="px-6 mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-xs font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-300 truncate">
              {displayName}
            </p>
            <p className="text-[10px] text-slate-600 truncate">
              {isAdmin ? "Admin" : "Member"}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-600 hover:text-error hover:bg-error/10 rounded-lg transition-all cursor-pointer"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
