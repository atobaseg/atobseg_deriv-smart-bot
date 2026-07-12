import { Router, type IRouter } from "express";
import healthRouter from "./health";
import engineRouter from "./engine";

const router: IRouter = Router();

router.use(healthRouter);
router.use(engineRouter);

export default router;
