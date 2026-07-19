import {
    AnalysisStatus,
    EngineConfig,
    TradeSignal
} from "./types";


export class ConfidenceEngine {

    private readonly windowSize: number;

    private digits: number[] = [];

    private confidence = 0;

    private lastSignal: TradeSignal = "NONE";

    constructor(config: Pick<EngineConfig, "analysisWindow">) {

        this.windowSize = config.analysisWindow;

    }

    addTick(digit: number): void {

        this.digits.push(digit);

        while (this.digits.length > this.windowSize) {

            this.digits.shift();

        }

        this.analyse();

    }

    private analyse(): void {

        if (this.digits.length < this.windowSize) {

            this.confidence = 0;

            this.lastSignal = "NONE";

            return;

        }

        let under8 = 0;

        let under9 = 0;

        for (const d of this.digits) {

            if (d <= 7) under8++;

            if (d <= 8) under9++;

        }

        const p8 = under8 / this.digits.length;

        const p9 = under9 / this.digits.length;

        if (p8 >= 0.80) {

            this.lastSignal = "UNDER8";

            this.confidence = p8;

            return;

        }

        if (p9 >= 0.90) {

            this.lastSignal = "UNDER9";

            this.confidence = p9;

            return;

        }

        this.lastSignal = "NONE";

        this.confidence = Math.max(p8, p9);

    }
    getSignal(): TradeSignal {

        return this.lastSignal;

    }

    getStatus(): AnalysisStatus {

        return {

            under8Confidence:
                this.lastSignal === "UNDER8"
                    ? this.confidence
                    : null,

            under9Confidence:
                this.lastSignal === "UNDER9"
                    ? this.confidence
                    : null,

            tradeQuality:
                this.confidence,

            signal:
                this.lastSignal,

            windowFillCount:
                this.digits.length,

            windowSize:
                this.windowSize

        };

    }


    reset(): void {

        this.digits = [];

        this.confidence = 0;

        this.lastSignal = "NONE";

    }

}