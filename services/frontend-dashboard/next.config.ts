import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy auth-service requests
      {
        source: "/api/auth/:path*",
        destination: "http://localhost:3000/:path*",
      },
      // Proxy auth-service protected routes
      {
        source: "/api/auth-protected/:path*",
        destination: "http://localhost:3000/api/:path*",
      },
      // Proxy resource-allocator-service requests
      {
        source: "/api/resources/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
