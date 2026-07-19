import {
    SessionStatus,
    TradeRecord
} from "./types";

export class SessionManager {

    private trades: TradeRecord[] = [];

    private sessionPnl = 0;

    private wins = 0;

    private losses = 0;

    private successiveWins = 0;

    private successiveLosses = 0;

    private startedAt: string | null =
        new Date().toISOString();

    //--------------------------------------------------
    // Trade Recording
    //--------------------------------------------------

    addTrade(
        trade: TradeRecord
    ): void {

        this.trades.unshift(trade);

        if (this.trades.length > 100) {

            this.trades.pop();

        }

        this.sessionPnl += trade.profit;

        if (trade.result === "win") {

            this.wins++;

            this.successiveWins++;

            this.successiveLosses = 0;

        } else {

            this.losses++;

            this.successiveLosses++;

            this.successiveWins = 0;

        }

    }
    //--------------------------------------------------
    // Status
    //--------------------------------------------------

    getStatus(): SessionStatus {

        return {

            sessionPnl:
                this.sessionPnl,

            totalTrades:
                this.trades.length,

            wins:
                this.wins,

            losses:
                this.losses,

            successiveWins:
                this.successiveWins,

            successiveLosses:
                this.successiveLosses,

            startedAt:
                this.startedAt

        };

    }

    //--------------------------------------------------
    // Recent Trades
    //--------------------------------------------------

    getRecentTrades(): TradeRecord[] {

        return [...this.trades];

    }

    //--------------------------------------------------
    // Reset Session
    //--------------------------------------------------

    reset(): void {

        this.trades = [];

        this.sessionPnl = 0;

        this.wins = 0;

        this.losses = 0;

        this.successiveWins = 0;

        this.successiveLosses = 0;

        this.startedAt =
            new Date().toISOString();

    }

}