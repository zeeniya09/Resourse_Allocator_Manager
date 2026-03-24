export function createDeploymentManifest({
    nodeName,
    appName,
    image = "ubuntu",
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
                            command: image === "ubuntu" ? ["sleep", "3600"] : undefined,
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
                                    cpu: "2x" ? cpu : cpu, // optional logic later
                                    memory: "2x" ? memory : memory
                                }
                            }
                        }
                    ]
                }
            }
        }
    };
}