export function createIngressManifest({ appName, host }) {
    return {
        apiVersion: "networking.k8s.io/v1",
        kind: "Ingress",
        metadata: {
            name: `${appName}-ingress`,
            annotations: {
                "nginx.ingress.kubernetes.io/rewrite-target": "/",
            }
        },
        spec: {
            rules: [
                {
                    host,  // e.g., user-123.localhost
                    http: {
                        paths: [
                            {
                                path: "/",
                                pathType: "Prefix",
                                backend: {
                                    service: { name: `${appName}-svc`, port: { number: 80 } }
                                }
                            }
                        ]
                    }
                }
            ]
        }
    };
}