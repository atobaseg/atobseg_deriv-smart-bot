export interface MarketDefinition {
    symbol: string;
    label: string;
}

export const MARKETS: MarketDefinition[] = [
    { symbol: "R_10", label: "Volatility 10 Index" },
    { symbol: "R_25", label: "Volatility 25 Index" },
    { symbol: "R_50", label: "Volatility 50 Index" },
    { symbol: "R_75", label: "Volatility 75 Index" },
    { symbol: "R_100", label: "Volatility 100 Index" },

    { symbol: "1HZ10V", label: "Volatility 10 (1s) Index" },
    { symbol: "1HZ25V", label: "Volatility 25 (1s) Index" },
    { symbol: "1HZ50V", label: "Volatility 50 (1s) Index" },
    { symbol: "1HZ75V", label: "Volatility 75 (1s) Index" },
    { symbol: "1HZ100V", label: "Volatility 100 (1s) Index" },
];

export function getMarket(symbol: string): MarketDefinition {
    return (
        MARKETS.find((m) => m.symbol === symbol) ?? {
            symbol,
            label: symbol,
        }
    );
}