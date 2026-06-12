import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import ordersRouter from "./orders";
import tradesRouter from "./trades";
import marketRouter from "./market";
import tradersRouter from "./traders";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(ordersRouter);
router.use(tradesRouter);
router.use(marketRouter);
router.use(tradersRouter);
router.use(aiRouter);

export default router;
