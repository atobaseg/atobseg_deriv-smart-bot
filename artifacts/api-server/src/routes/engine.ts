import { Router, type IRouter, type Request, type Response } from "express";
import {
  ListMarketsResponse,
  GetEngineStatusResponse,
  UpdateEngineConfigBody,
  UpdateEngineConfigResponse,
  StartEngineResponse,
  PauseEngineResponse,
  StopEngineResponse,
} from "@workspace/api-zod";

import { derivEngine } from "../lib/deriv/engine";
import { MARKETS } from "../lib/deriv/markets";
import { EngineUserError } from "../lib/deriv/types";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getMarketsResponse() {
  return Object.values(MARKETS).map((market) => ({
    symbol: market.symbol,
    label: market.displayName,
  }));
}

router.get("/engine/markets", (_req: Request, res: Response): void => {
  res.json(ListMarketsResponse.parse(getMarketsResponse()));
});

router.get("/markets", (_req: Request, res: Response): void => {
  res.json(ListMarketsResponse.parse(getMarketsResponse()));
});

/**
 * GET /engine/status
 *
 * IMPORTANT:
 * Return the EngineStatus exactly as defined by types.ts
 */
router.get("/engine/status", (_req: Request, res: Response): void => {
  const status = derivEngine.getStatus();

  res.json(GetEngineStatusResponse.parse(status));
});

/**
 * PATCH /engine/config
 */
router.patch("/engine/config", (req: Request, res: Response): void => {
  const parsed = UpdateEngineConfigBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const status = derivEngine.updateConfig(parsed.data);

    res.json(UpdateEngineConfigResponse.parse(status));
  } catch (err) {
    if (err instanceof EngineUserError) {
      res.status(err.status).json({ error: err.message });
      return;
    }

    throw err;
  }
});

/**
 * POST /engine/start
 */
router.post(
  "/engine/start",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const status = await derivEngine.start();

      res.json(StartEngineResponse.parse(status));
    } catch (err) {
      if (err instanceof EngineUserError) {
        logger.warn({ err }, "Engine start rejected");
        res.status(err.status).json({ error: err.message });
        return;
      }

      throw err;
    }
  }
);

/**
 * POST /engine/pause
 */
router.post(
  "/engine/pause",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const status = await derivEngine.pause();

      res.json(PauseEngineResponse.parse(status));
    } catch (err) {
      if (err instanceof EngineUserError) {
        res.status(err.status).json({ error: err.message });
        return;
      }

      throw err;
    }
  }
);

/**
 * POST /engine/stop
 */
router.post(
  "/engine/stop",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const status = await derivEngine.stop();

      res.json(StopEngineResponse.parse(status));
    } catch (err) {
      if (err instanceof EngineUserError) {
        res.status(err.status).json({ error: err.message });
        return;
      }

      throw err;
    }
  }
);

export default router;