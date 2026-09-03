import { Router, type IRouter } from "express";

import healthRouter from "./health";

import engineRouter from "./engine";

import authRouter from "./auth";

import derivCredentialsRouter from "./deriv-credentials";

const router: IRouter = Router();

router.use(healthRouter);

router.use(engineRouter);

router.use(authRouter);

router.use(derivCredentialsRouter);

export default router;