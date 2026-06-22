import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import ordersRouter from "./orders";
import tradesRouter from "./trades";
import marketRouter from "./market";
import tradersRouter from "./traders";
import aiRouter from "./ai";
import authRouter from "./auth";
import intelligenceRouter from "./intelligence";
import researchRouter from "./research";
import companiesRouter from "./companies";
import seedRouter from "./seed";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(ordersRouter);
router.use(tradesRouter);
router.use(marketRouter);
router.use(tradersRouter);
router.use(aiRouter);
router.use(authRouter);
router.use(intelligenceRouter);
router.use(researchRouter);
router.use(companiesRouter);
router.use(seedRouter);

export default router;
