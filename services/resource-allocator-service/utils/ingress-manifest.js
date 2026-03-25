export function createIngressManifest({ appName, metalLBIp }) {

    const hostip = `${appName}.${metalLBIp}.nip.io`; // use MetalLB IP dynamically

    return {

        apiVersion: "networking.k8s.io/v1",

        kind: "Ingress",

        metadata: {

            name: `${appName}-ingress`,

            annotations: {

                "nginx.ingress.kubernetes.io/rewrite-target": "/",

                "nginx.ingress.kubernetes.io/enable-rewrite-log": "true",

                "nginx.ingress.kubernetes.io/skip-webhook-validation": "true"

            }

        },

        spec: {

            rules: [

                {

                    host: hostip,

                    http: {

                        paths: [

                            {

                                path: "/",

                                pathType: "Prefix",

                                backend: {

                                    service: { name: `${appName}-service`, port: { number: 80 } }

                                }

                            }

                        ]

                    }

                }

            ]

        }

    };

}