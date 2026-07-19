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

const router: IRouter = Router();

/**
 * Convert internal MARKET object into the array
 * required by ListMarketsResponse.
 */
function getMarketsResponse() {
  return Object.values(MARKETS).map((market) => ({
    symbol: market.symbol,
    label: market.displayName,
  }));
}

/**
 * GET /engine/markets
 */
router.get("/engine/markets", (_req: Request, res: Response): void => {
  res.json(ListMarketsResponse.parse(getMarketsResponse()));
});

/**
 * Alias used by frontend
 */
router.get("/markets", (_req: Request, res: Response): void => {
  res.json(ListMarketsResponse.parse(getMarketsResponse()));
});

router.get("/engine/status", (_req: Request, res: Response): void => {
  res.json(GetEngineStatusResponse.parse(derivEngine.getStatus()));
});

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

router.post("/engine/start", async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await derivEngine.start();
    res.json(StartEngineResponse.parse(status));
  } catch (err) {
    if (err instanceof EngineUserError) {
      req.log.warn({ err }, "Engine start rejected");
      res.status(err.status).json({ error: err.message });
      return;
    }

    throw err;
  }
});

router.post("/engine/pause", (_req: Request, res: Response): void => {
  res.json(PauseEngineResponse.parse(derivEngine.pause()));
});

router.post("/engine/stop", (_req: Request, res: Response): void => {
  res.json(StopEngineResponse.parse(derivEngine.emergencyStop()));
});

export default router;