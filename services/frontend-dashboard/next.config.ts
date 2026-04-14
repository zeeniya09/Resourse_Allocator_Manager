import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const authServiceUrl = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "http://localhost:3000";
    const resourceAllocatorUrl = process.env.NEXT_PUBLIC_RESOURCE_ALLOCATOR_URL || "http://localhost:5000";

    return [
      // Proxy auth-service requests
      {
        source: "/api/auth/:path*",
        destination: `${authServiceUrl}/:path*`,
      },
      // Proxy auth-service protected routes
      {
        source: "/api/auth-protected/:path*",
        destination: `${authServiceUrl}/api/:path*`,
      },
      // Proxy resource-allocator-service requests
      {
        source: "/api/resources/:path*",
        destination: `${resourceAllocatorUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
