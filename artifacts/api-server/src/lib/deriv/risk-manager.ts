import {
    EngineConfig,
    TradeRecord
} from "./types";

export class RiskManager {

    private config: EngineConfig;

    private totalProfit = 0;

    private successiveWins = 0;

    private successiveLosses = 0;

    private stopReason: string | null = null;

    constructor(
        config: EngineConfig
    ) {

        this.config = config;

    }

    //--------------------------------------------------
    // Status
    //--------------------------------------------------

    canTrade(): boolean {

        return this.stopReason === null;

    }

    shouldStop(): boolean {

        return this.stopReason !== null;

    }

    getStopReason(): string | null {

        return this.stopReason;

    }

    reset(): void {

        this.totalProfit = 0;

        this.successiveWins = 0;

        this.successiveLosses = 0;

        this.stopReason = null;

    }
    //--------------------------------------------------
    // Trade Recording
    //--------------------------------------------------

    recordWin(
        trade: TradeRecord
    ): void {

        this.totalProfit += trade.profit;

        this.successiveWins++;

        this.successiveLosses = 0;

        this.evaluateLimits();

    }

    //--------------------------------------------------

    recordLoss(
        trade: TradeRecord
    ): void {

        this.totalProfit += trade.profit;

        this.successiveLosses++;

        this.successiveWins = 0;

        this.evaluateLimits();

    }

    //--------------------------------------------------
    // Limit Evaluation
    //--------------------------------------------------

    private evaluateLimits(): void {

        if (

            this.totalProfit <=
            -this.config.stopLoss

        ) {

            this.stopReason =
                "Stop loss reached";

            return;

        }

        if (

            this.totalProfit >=
            this.config.takeProfit

        ) {

            this.stopReason =
                "Take profit reached";

            return;

        }

        if (

            this.successiveLosses >=
            this.config.maxSuccessiveLosses

        ) {

            this.stopReason =
                "Maximum successive losses reached";

            return;

        }

        if (

            this.successiveWins >=
            this.config.maxSuccessiveWins

        ) {

            this.stopReason =
                "Maximum successive wins reached";

            return;

        }

        if (

            this.totalProfit <=
            -this.config.dailyLossLimit

        ) {

            this.stopReason =
                "Daily loss limit reached";

            return;

        }

        if (

            this.totalProfit >=
            this.config.dailyProfitLimit

        ) {

            this.stopReason =
                "Daily profit limit reached";

        }

    }

}