import { Router, type IRouter } from "express";
import healthRouter from "./health";
import engineRouter from "./engine";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(engineRouter);
router.use(authRouter);

export default router;