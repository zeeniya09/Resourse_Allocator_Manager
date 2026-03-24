export function createServiceManifest(appName, port = 80) {
    return {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
            name: `${appName}-service`
        },
        spec: {
            type: "NodePort",
            selector: {
                app: appName
            },
            ports: [
                {
                    port: port,
                    targetPort: port,
                    nodePort: Math.floor(30000 + Math.random() * 2767) // random NodePort
                }
            ]
        }
    };
}