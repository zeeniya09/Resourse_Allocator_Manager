import express from "express";
import podRoutes from "./routes/pod.routes.js";

const app = express();

app.use(express.json());

app.use("/api/pod", podRoutes);

export default app;