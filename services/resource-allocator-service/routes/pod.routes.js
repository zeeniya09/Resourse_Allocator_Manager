import express from "express";
import {
    allocateResource,
    deletePod,
    getAllPodsWithNodes,
    listAllPodsWithNodes,
    getPodById,
    getUserPods,
    getAllPods,
    getPodStats
} from "../controllers/pod.controller.js";

const router = express.Router();

// Original routes (K8s-based)
router.get("/list", listAllPodsWithNodes);  // Fixed: Use Express route handler
router.get("/k8s/:id", getPodById);

// New database-backed routes
router.get("/", getAllPods);                    // Get all pods from database
router.get("/user", getUserPods);               // Get current user's pods
router.get("/stats", getPodStats);              // Get pod statistics
router.get("/:appName", getPodById);            // Get specific pod by app name
router.post("/allocate", allocateResource);     // Create new pod allocation
router.delete("/:appName", deletePod);          // Delete pod allocation

export default router;