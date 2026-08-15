import {
    DerivEngine,
} from "./engine";

import type {
    DerivCredentials,
} from "./deriv-client";

import type {
    EngineConfig,
} from "./types";

export interface UserEngine {
    userId: string;
    engine: DerivEngine;
}

class EngineManager {

    private readonly engines =
        new Map<string, UserEngine>();

    getOrCreate(
        userId: string,
        credentials: DerivCredentials,
        config: Partial<EngineConfig> = {},
    ): DerivEngine {

        const existing =
            this.engines.get(userId);

        if (existing) {
            return existing.engine;
        }

        const engine =
            new DerivEngine(
                credentials,
                config,
            );

        this.engines.set(
            userId,
            {
                userId,
                engine,
            },
        );

        return engine;
    }

    get(
        userId: string,
    ): DerivEngine | undefined {

        return this.engines.get(userId)?.engine;
    }

    async stop(
        userId: string,
    ): Promise<void> {

        const entry =
            this.engines.get(userId);

        if (!entry) {
            return;
        }

        await entry.engine.stop();

        this.engines.delete(userId);
    }

    async remove(
        userId: string,
    ): Promise<void> {

        const entry =
            this.engines.get(userId);

        if (!entry) {
            return;
        }

        await entry.engine.stop();

        this.engines.delete(userId);
    }

    has(
        userId: string,
    ): boolean {

        return this.engines.has(userId);
    }
}

export const engineManager =
    new EngineManager();