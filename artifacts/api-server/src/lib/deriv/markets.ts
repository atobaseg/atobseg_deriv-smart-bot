export interface MarketDefinition {
    symbol: string;
    displayName: string;
}

export const MARKETS: Record<string, MarketDefinition> = {

    // Volatility Indices

    R_10: {
        symbol: "R_10",
        displayName: "Volatility 10 Index"
    },

    R_25: {
        symbol: "R_25",
        displayName: "Volatility 25 Index"
    },

    R_50: {
        symbol: "R_50",
        displayName: "Volatility 50 Index"
    },

    R_75: {
        symbol: "R_75",
        displayName: "Volatility 75 Index"
    },

    R_100: {
        symbol: "R_100",
        displayName: "Volatility 100 Index"
    },

    // Volatility (1s) Indices

    "1HZ10V": {
        symbol: "1HZ10V",
        displayName: "Volatility 10 (1s) Index"
    },

    "1HZ25V": {
        symbol: "1HZ25V",
        displayName: "Volatility 25 (1s) Index"
    },

    "1HZ50V": {
        symbol: "1HZ50V",
        displayName: "Volatility 50 (1s) Index"
    },

    "1HZ75V": {
        symbol: "1HZ75V",
        displayName: "Volatility 75 (1s) Index"
    },

    "1HZ100V": {
        symbol: "1HZ100V",
        displayName: "Volatility 100 (1s) Index"
    }

};

export function getMarket(
    symbol: string
): MarketDefinition {

    return MARKETS[symbol] ?? {

        symbol,

        displayName: symbol

    };

}