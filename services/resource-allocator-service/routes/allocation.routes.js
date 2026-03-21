import express from "express";
import { allocateResource } from "../controllers/allocation.controller.js";

const router = express.Router();

router.post("/", allocateResource);

export default router;