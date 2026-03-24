export function createServiceManifest(appName, port = 80) {
    return {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
            name: `${appName}-service`
        },
        spec: {
            type: "ClusterIP",
            selector: {
                app: appName
            },
            ports: [
                {
                    port: port,
                    targetPort: port
                }
            ]
        }
    };
}