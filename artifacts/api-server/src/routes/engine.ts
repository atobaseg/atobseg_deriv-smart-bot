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

import { engineManager } from "../lib/deriv/engine-manager";
import type { DerivCredentials } from "../lib/deriv/deriv-client";
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

/**
 * TEMPORARY USER CONTEXT
 *
 * Authentication has not been added to the project yet.
 *
 * These headers are only a bridge:
 *
 * X-User-Id
 * X-Deriv-App-Id
 * X-Deriv-Demo-Token
 * X-Deriv-Real-Token
 *
 * We will replace this with real authentication later.
 */
function getUserEngine(req: Request) {
  const userId = req.header("X-User-Id");
  const appId = req.header("X-Deriv-App-Id");
  const demoToken = req.header("X-Deriv-Demo-Token");
  const realToken = req.header("X-Deriv-Real-Token");

  if (!userId) {
    throw new EngineUserError(
      "User authentication is required.",
      401,
    );
  }

  if (!appId) {
    throw new EngineUserError(
      "Deriv App ID is required.",
      400,
    );
  }

  if (!demoToken && !realToken) {
    throw new EngineUserError(
      "At least one Deriv account token is required.",
      400,
    );
  }

  const credentials: DerivCredentials = {
    appId,
    demoToken,
    realToken,
  };

  return engineManager.getOrCreate(
    userId,
    credentials,
  );
}

router.get(
  "/engine/markets",
  (_req: Request, res: Response): void => {
    res.json(
      ListMarketsResponse.parse(
        getMarketsResponse(),
      ),
    );
  },
);

router.get(
  "/markets",
  (_req: Request, res: Response): void => {
    res.json(
      ListMarketsResponse.parse(
        getMarketsResponse(),
      ),
    );
  },
);

/**
 * GET /engine/status
 */
router.get(
  "/engine/status",
  (req: Request, res: Response): void => {
    try {
      const engine = getUserEngine(req);

      res.json(
        GetEngineStatusResponse.parse(
          engine.getStatus(),
        ),
      );
    } catch (err) {
      if (err instanceof EngineUserError) {
        res.status(err.status).json({
          error: err.message,
        });
        return;
      }

      throw err;
    }
  },
);

/**
 * PATCH /engine/config
 */
router.patch(
  "/engine/config",
  (req: Request, res: Response): void => {
    const parsed =
      UpdateEngineConfigBody.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    try {
      const engine = getUserEngine(req);

      const status =
        engine.updateConfig(
          parsed.data,
        );

      res.json(
        UpdateEngineConfigResponse.parse(
          status,
        ),
      );
    } catch (err) {
      if (err instanceof EngineUserError) {
        res.status(err.status).json({
          error: err.message,
        });
        return;
      }

      throw err;
    }
  },
);

/**
 * POST /engine/start
 */
router.post(
  "/engine/start",
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const engine = getUserEngine(req);

      const status =
        await engine.start();

      res.json(
        StartEngineResponse.parse(
          status,
        ),
      );
    } catch (err) {
      if (err instanceof EngineUserError) {
        logger.warn(
          { err },
          "Engine start rejected",
        );

        res.status(err.status).json({
          error: err.message,
        });

        return;
      }

      throw err;
    }
  },
);

/**
 * POST /engine/pause
 */
router.post(
  "/engine/pause",
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const engine = getUserEngine(req);

      const status =
        await engine.pause();

      res.json(
        PauseEngineResponse.parse(
          status,
        ),
      );
    } catch (err) {
      if (err instanceof EngineUserError) {
        res.status(err.status).json({
          error: err.message,
        });

        return;
      }

      throw err;
    }
  },
);

/**
 * POST /engine/stop
 */
router.post(
  "/engine/stop",
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const engine = getUserEngine(req);

      const status =
        await engine.stop();

      res.json(
        StopEngineResponse.parse(
          status,
        ),
      );
    } catch (err) {
      if (err instanceof EngineUserError) {
        res.status(err.status).json({
          error: err.message,
        });

        return;
      }

      throw err;
    }
  },
);

export default router;