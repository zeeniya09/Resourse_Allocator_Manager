import express from "express";
import { allocateResource, deletePod, getAllPodsWithNodes, getPodById } from "../controllers/pod.controller.js";

const router = express.Router();

router.get("/list", getAllPodsWithNodes);
router.get("/:id", getPodById);
router.post("/allocate", allocateResource);
router.post("/delete", deletePod);

export default router;