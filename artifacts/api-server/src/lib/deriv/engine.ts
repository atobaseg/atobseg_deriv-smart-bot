import { ConfidenceEngine } from "./analysis";
import { CONTRACTS, signalToContract } from "./contracts";
import { DerivClient } from "./deriv-client";
import { DEFAULT_ENGINE_CONFIG } from "./config";
import { getMarket } from "./markets";
import { RiskManager } from "./risk-manager";
import { SessionManager } from "./session-manager";
import { StakeManager } from "./stake-manager";
import { TradeManager } from "./trade-manager";
import { validateConfig } from "./validators";

import {
    EngineConfig,
    EngineStatus,
    EngineState,
    EngineUserError,
    TradeSignal,
    TradeRecord
} from "./types";

import { logger } from "../logger";

export class DerivEngine {

    //--------------------------------------------------
    // Engine State
    //--------------------------------------------------

    private state: EngineState = "idle";

    private config: EngineConfig;

    //--------------------------------------------------
    // Managers
    //--------------------------------------------------

    private confidenceEngine: ConfidenceEngine;

    private stakeManager: StakeManager;

    private riskManager: RiskManager;

    private sessionManager: SessionManager;

    private tradeManager: TradeManager;

    private client: DerivClient;

    //--------------------------------------------------
    // Connection
    //--------------------------------------------------

    private accountId: string | null = null;

    private balance: number | null = null;

    private lastTick: number | null = null;

    private lastDigit: number | null = null;

    //--------------------------------------------------
    // Runtime
    //--------------------------------------------------

    private tradeInFlight = false;

    private stopReason: string | null = null;

    private errorMessage: string | null = null;

    //--------------------------------------------------
    // Constructor
    //--------------------------------------------------

    constructor(
        config: Partial<EngineConfig> = {}
    ) {

        this.config = {

            ...DEFAULT_ENGINE_CONFIG,

            ...config

        };

        validateConfig(this.config);

        this.confidenceEngine =
            new ConfidenceEngine(
                this.config
            );

        this.stakeManager =
            new StakeManager(this.config);

        this.riskManager =
            new RiskManager(this.config);

        this.sessionManager =
            new SessionManager();

        this.client =
            new DerivClient();

        this.tradeManager =
            new TradeManager(
                this.client
            );
    }
    //--------------------------------------------------
    // Configuration
    //--------------------------------------------------

    updateConfig(
        patch: Partial<EngineConfig>
    ): EngineStatus {

        if (this.state === "running") {

            throw new EngineUserError(
                "Stop the engine before changing configuration.",
                409
            );

        }

        this.config = {

            ...this.config,

            ...patch

        };

        validateConfig(this.config);

        this.confidenceEngine =
            new ConfidenceEngine(
                this.config
            );

        this.stakeManager =
            new StakeManager(this.config);

        this.riskManager =
            new RiskManager(this.config);

        return this.getStatus();

    }

    //--------------------------------------------------
    // Status
    //--------------------------------------------------

    getStatus(): EngineStatus {

        return {

            state: this.state,

            config: {

                ...this.config

            },

            connection: {

                accountId:
                    this.accountId,

                balance:
                    this.balance,

                lastTick:
                    this.lastTick,

                lastDigit:
                    this.lastDigit,

                health:
                    this.client.isConnected()

                        ? "healthy"

                        : "error"

            },

            analysis:
                this.confidenceEngine.getStatus(),

            session:
                this.sessionManager.getStatus(),

            currentStake:
                this.stakeManager.getCurrentStake(),

            nextStake:
                this.stakeManager.getNextStake(),

            stopReason:
                this.stopReason,

            errorMessage:
                this.errorMessage,

            recentTrades:
                this.sessionManager.getRecentTrades()

        };

    }
    //--------------------------------------------------
    // Engine Lifecycle
    //--------------------------------------------------

    async start(): Promise<EngineStatus> {

        validateConfig(this.config);

        if (this.state === "running") {

            return this.getStatus();

        }

        this.clearErrors();

        this.stopReason = null;

        try {

            this.state = "starting";

            await this.client.connect();
            await this.client.authorize(
                this.config.accountType
            );

            this.accountId =
                this.client.getAccountId();

            this.balance =
                await this.client.getBalance();

            const market =
                getMarket(this.config.market);

            logger.info({

                message: "Subscribing to ticks",

                market: market.symbol

            });

            await this.client.subscribeTicks(

                market.symbol,

                (tick) => this.onTick(tick)

            );

            this.state = "running";

            logger.info({

                message: "Engine started",

                account: this.accountId,

                market: market.symbol

            });

        }
        catch (error) {

            this.state = "stopped";

            this.setError(error);

            throw error;

        }

        return this.getStatus();

    }

    //--------------------------------------------------

    async stop(): Promise<EngineStatus> {

        if (this.state === "stopped") {

            return this.getStatus();

        }

        this.state = "stopping";

        try {

            await this.client.disconnect();

        }
        finally {

            this.state = "stopped";

        }

        return this.getStatus();

    }

    //--------------------------------------------------

    async pause(): Promise<EngineStatus> {

        if (this.state !== "running") {

            return this.getStatus();

        }

        this.state = "paused";

        logger.info({

            message: "Engine paused"

        });

        return this.getStatus();

    }

    //--------------------------------------------------

    async resume(): Promise<EngineStatus> {

        if (this.state !== "paused") {

            return this.getStatus();

        }

        this.state = "running";

        logger.info({

            message: "Engine resumed"

        });

        return this.getStatus();

    }
    //--------------------------------------------------
    // Tick Processing
    //--------------------------------------------------

    private async onTick(
        tick: {
            quote: number;
            epoch: number;
        }
    ): Promise<void> {

        if (this.state !== "running") {
            return;
        }

        if (this.tradeInFlight) {
            return;
        }

        this.lastTick = tick.quote;

        this.lastDigit =
            Number(
                tick.quote
                    .toFixed(2)
                    .slice(-1)
            );

        this.confidenceEngine.addTick(
            this.lastDigit
        );

        const signal =
            this.confidenceEngine.getSignal();

        if (!signal) {
            return;
        }

        if (
            !this.riskManager.canTrade()
        ) {
            return;
        }

        try {

            await this.executeSignal(
                signal
            );

        } catch (error) {

            this.setError(error);

        }

    }

    //--------------------------------------------------
    // Signal Execution
    //--------------------------------------------------

    private async executeSignal(
        signal: TradeSignal
    ): Promise<void> {

        this.tradeInFlight = true;

        try {

            const contract =
                signalToContract(signal);

            const stake =
                this.stakeManager.getNextStake();

            const proposal =
                await this.client.proposal({

                    symbol:
                        this.config.market,

                    amount:
                        stake,

                    basis:
                        "stake",

                    contract_type:
                        contract.type,

                    currency:
                        this.config.currency,

                    duration:
                        this.config.duration,

                    duration_unit:
                        "t",

                    barrier:
                        contract.barrier

                });

            const buy =
                await this.client.buy(

                    proposal.id,

                    stake

                );

            const result =
                await this.client.waitForContract(

                    buy.contract_id

                );

            await this.handleTradeResult(

                signal,

                stake,

                result

            );

        } finally {

            this.tradeInFlight = false;

        }

    }
    //--------------------------------------------------
    // Trade Result Handling
    //--------------------------------------------------

    private async handleTradeResult(
        signal: TradeSignal,
        stake: number,
        result: {
            won: boolean;
            profit: number;
            contract_id: number;
            buy_price: number;
            sell_price: number;
        }
    ): Promise<void> {

        const trade: TradeRecord = {

            id: String(result.contract_id),

            timestamp: Date.now(),

            market: this.config.market,

            signal,

            stake,

            won: result.won,

            profit: result.profit,

            buyPrice: result.buy_price,

            sellPrice: result.sell_price,

            result: result.won ? "win" : "loss"

        };

        this.sessionManager.addTrade(trade);

        if (result.won) {

            this.stakeManager.recordWin();

            this.riskManager.recordWin(trade);

            logger.info({

                message: "Trade WON",

                profit: result.profit,

                stake

            });

        } else {

            this.stakeManager.recordLoss();

            this.riskManager.recordLoss(trade);

            logger.warn({

                message: "Trade LOST",

                profit: result.profit,

                stake

            });

        }

        this.balance =
            await this.client.getBalance();

        if (this.riskManager.shouldStop()) {

            this.stopReason =
                this.riskManager.getStopReason();

            logger.warn({

                message: "Risk manager requested stop",

                reason: this.stopReason

            });

            await this.stop();

        }

    }
    //--------------------------------------------------
    // Compatibility Methods
    //--------------------------------------------------


    emergencyStop(): EngineStatus {

        this.stopReason = "Emergency stop";

        this.state = "stopped";

        return this.getStatus();

    }

    //--------------------------------------------------
    // Helpers
    //--------------------------------------------------

    private clearErrors(): void {

        this.stopReason = null;

        this.errorMessage = null;

    }

    private setError(
        error: unknown
    ): void {

        this.errorMessage =
            error instanceof Error
                ? error.message
                : String(error);

        logger.error({

            error: this.errorMessage

        });

    }

}
export const derivEngine = new DerivEngine();