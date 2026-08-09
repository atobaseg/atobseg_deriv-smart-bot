import {
    AnalysisStatus,
    EngineConfig,
    TradeSignal,
} from "./types";

export class ConfidenceEngine {
    private readonly windowSize: number;
    private readonly minimumSamples: number;
    private readonly under8Threshold: number;
    private readonly under9Threshold: number;
    private readonly minimumTradeQuality: number;

    private digits: number[] = [];

    private confidence = 0;
    private under8Confidence = 0;
    private under9Confidence = 0;
    private lastSignal: TradeSignal = "NONE";

    constructor(
        config: Pick<
            EngineConfig,
            | "analysisWindow"
            | "minimumSamples"
            | "under8Threshold"
            | "under9Threshold"
            | "minimumTradeQuality"
        >
    ) {
        this.windowSize = config.analysisWindow;
        this.minimumSamples = config.minimumSamples;
        this.under8Threshold = config.under8Threshold;
        this.under9Threshold = config.under9Threshold;
        this.minimumTradeQuality = config.minimumTradeQuality;
    }

    addTick(digit: number): void {
        if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
            return;
        }

        this.digits.push(digit);

        while (this.digits.length > this.windowSize) {
            this.digits.shift();
        }

        this.analyse();
    }

    private analyse(): void {
        const sampleCount = this.digits.length;

        this.lastSignal = "NONE";
        this.confidence = 0;

        if (sampleCount < this.minimumSamples) {
            this.under8Confidence = 0;
            this.under9Confidence = 0;
            return;
        }

        let under8 = 0;
        let under9 = 0;

        for (const digit of this.digits) {
            if (digit <= 7) under8++;
            if (digit <= 8) under9++;
        }

        const p8 = under8 / sampleCount;
        const p9 = under9 / sampleCount;

        this.under8Confidence = p8;
        this.under9Confidence = p9;

        // Prefer the stronger Under8 signal.
        if (
            p8 >= this.under8Threshold &&
            p8 >= this.minimumTradeQuality
        ) {
            this.lastSignal = "UNDER8";
            this.confidence = p8;
            return;
        }

        if (
            p9 >= this.under9Threshold &&
            p9 >= this.minimumTradeQuality
        ) {
            this.lastSignal = "UNDER9";
            this.confidence = p9;
            return;
        }

        this.confidence = Math.max(p8, p9);
    }

    getSignal(): TradeSignal {
        return this.lastSignal;
    }

    getStatus(): AnalysisStatus {
        return {
            under8Confidence: this.under8Confidence,
            under9Confidence: this.under9Confidence,
            tradeQuality: this.confidence,
            signal: this.lastSignal,
            windowFillCount: this.digits.length,
            windowSize: this.windowSize,
        };
    }

    reset(): void {
        this.digits = [];
        this.confidence = 0;
        this.under8Confidence = 0;
        this.under9Confidence = 0;
        this.lastSignal = "NONE";
    }
}