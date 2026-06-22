import { Router, type IRouter } from "express";
import { seedCompanies } from "../lib/seedCompanies";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/seed/companies", async (_req, res) => {
  try {
    logger.info("Manual seed triggered via /seed/companies");
    const counts = await seedCompanies();
    res.json({ success: true, counts });
  } catch (err: any) {
    logger.error({ err: err.message }, "Seed failed");
    res.status(500).json({ error: err.message });
  }
});

export default router;
