import express from "express";
import allocationRoutes from "./routes/allocation.routes.js";

const app = express();

app.use(express.json());

app.use("/api/v1/allocate", allocationRoutes);

export default app;