import {
    EngineConfig,
    EngineUserError
} from "./types";

import { MARKETS } from "./markets";

export function validateConfig(
    config: EngineConfig
): void {

    validateMarket(config.market);

    validateStake(config);

    validateRisk(config);

    validateAnalysis(config);

}

function validateMarket(
    market: string
): void {

    const exists = MARKETS.some(
        (item) => item.symbol === market
    );

    if (!exists) {

        throw new EngineUserError(
            `Unsupported market: ${market}`
        );

    }

}

function validateStake(
    config: EngineConfig
): void {

    if (config.baseStake <= 0) {

        throw new EngineUserError(
            "Base stake must be greater than zero."
        );

    }

    if (config.minimumStake <= 0) {

        throw new EngineUserError(
            "Minimum stake must be greater than zero."
        );

    }

    if (config.maximumStake < config.minimumStake) {

        throw new EngineUserError(
            "Maximum stake cannot be less than minimum stake."
        );

    }

    if (
        config.baseStake > config.maximumStake
    ) {

        throw new EngineUserError(
            "Base stake exceeds maximum stake."
        );

    }

}

function validateRisk(
    config: EngineConfig
): void {

    if (config.stopLoss < 0) {

        throw new EngineUserError(
            "Stop loss cannot be negative."
        );

    }

    if (config.takeProfit < 0) {

        throw new EngineUserError(
            "Take profit cannot be negative."
        );

    }

    if (config.dailyLossLimit < 0) {

        throw new EngineUserError(
            "Daily loss limit cannot be negative."
        );

    }

    if (config.dailyProfitLimit < 0) {

        throw new EngineUserError(
            "Daily profit limit cannot be negative."
        );

    }

    if (config.reserveBalance < 0) {

        throw new EngineUserError(
            "Reserve balance cannot be negative."
        );

    }

    if (config.maxSuccessiveLosses < 1) {

        throw new EngineUserError(
            "Maximum successive losses must be at least 1."
        );

    }

    if (config.maxSuccessiveWins < 1) {

        throw new EngineUserError(
            "Maximum successive wins must be at least 1."
        );

    }

}

function validateAnalysis(
    config: EngineConfig
): void {

    if (config.analysisWindow < 20) {

        throw new EngineUserError(
            "Analysis window is too small."
        );

    }

    if (
        config.minimumSamples >
        config.analysisWindow
    ) {

        throw new EngineUserError(
            "Minimum samples cannot exceed analysis window."
        );

    }

    if (
        config.under8Threshold < 0 ||
        config.under8Threshold > 1
    ) {

        throw new EngineUserError(
            "Under8 threshold must be between 0 and 1."
        );

    }

    if (
        config.under9Threshold < 0 ||
        config.under9Threshold > 1
    ) {

        throw new EngineUserError(
            "Under9 threshold must be between 0 and 1."
        );

    }

    if (
        config.minimumTradeQuality < 0 ||
        config.minimumTradeQuality > 1
    ) {

        throw new EngineUserError(
            "Minimum trade quality must be between 0 and 1."
        );

    }

}