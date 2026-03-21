import * as allocationService from "../services/allocation.service.js";

export const allocateResource = async (req, res) => {
    try {
        const result = await allocationService.allocate(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};