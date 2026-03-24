export function createDeploymentManifest({
    nodeName,
    appName,
    image = "nginx",
    cpu = "200m",
    memory = "256Mi",
    port = 80,
    userId
}) {
    return {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
            name: appName,
            labels: {
                app: appName,
                user: userId
            }
        },
        spec: {
            replicas: 1,
            selector: {
                matchLabels: { app: appName }
            },
            template: {
                metadata: {
                    labels: {
                        app: appName,
                        user: userId
                    }
                },
                spec: {
                    nodeSelector: {
                        "kubernetes.io/hostname": nodeName
                    },
                    containers: [
                        {
                            name: appName,
                            image,
                            ports: [
                                {
                                    containerPort: port
                                }
                            ],
                            resources: {
                                requests: {
                                    cpu,
                                    memory
                                },
                                limits: {
                                    cpu,
                                    memory
                                }
                            },
                            readinessProbe: {
                                httpGet: {
                                    path: "/",
                                    port: port
                                },
                                initialDelaySeconds: 5,
                                periodSeconds: 5
                            }
                        }
                    ],
                    tolerations: [
                        {
                            key: "node-role.kubernetes.io/control-plane",
                            operator: "Exists",
                            effect: "NoSchedule"
                        }
                    ]
                }
            }
        }
    };
}