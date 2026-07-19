import { EngineConfig } from "./types";

export class StakeManager {

    private config: EngineConfig;

    private currentStake: number;

    constructor(
        config: EngineConfig
    ) {

        this.config = config;

        this.currentStake =
            config.baseStake;

    }

    //--------------------------------------------------
    // Public
    //--------------------------------------------------

    getCurrentStake(): number {

        return this.round(
            this.currentStake
        );

    }

    getNextStake(): number {

        return this.round(
            this.currentStake
        );

    }

    reset(): void {

        this.currentStake =
            this.config.baseStake;

    }
    //--------------------------------------------------
    // Trade Outcomes
    //--------------------------------------------------

    recordWin(): void {

        // After a win, always return to the base stake.
        this.currentStake =
            this.config.baseStake;

    }

    recordLoss(): void {

        if (!this.config.martingaleEnabled) {

            this.currentStake =
                this.config.baseStake;

            return;

        }

        this.currentStake *=
            this.config.martingaleMultiplier;

        if (
            this.currentStake <
            this.config.minimumStake
        ) {

            this.currentStake =
                this.config.minimumStake;

        }

        if (
            this.currentStake >
            this.config.maximumStake
        ) {

            this.currentStake =
                this.config.maximumStake;

        }

    }

    //--------------------------------------------------
    // Balance-Based Stake Calculation
    //--------------------------------------------------

    updateFromBalance(
        balance: number
    ): void {

        switch (this.config.stakeMode) {

            case "fixed":

                this.currentStake =
                    this.config.baseStake;

                break;

            case "percentage":

                this.currentStake =
                    balance *
                    (this.config.stakePercent / 100);

                break;

            case "kelly":

                this.currentStake =
                    balance *
                    this.config.kellyFraction;

                break;

        }

        if (
            this.currentStake <
            this.config.minimumStake
        ) {

            this.currentStake =
                this.config.minimumStake;

        }

        if (
            this.currentStake >
            this.config.maximumStake
        ) {

            this.currentStake =
                this.config.maximumStake;

        }

    }

    //--------------------------------------------------
    // Helpers
    //--------------------------------------------------

    private round(
        value: number
    ): number {

        return Number(
            value.toFixed(2)
        );

    }

}
