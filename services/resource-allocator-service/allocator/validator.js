export const validateResources = (data) => {
    if (data.cpu > 8) {
        throw new Error("CPU limit exceeded");
    }

    if (data.memory > 16384) {
        throw new Error("Memory limit exceeded");
    }
};