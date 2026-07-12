export interface MarketDef {
  symbol: string;
  label: string;
}

// Deriv synthetic volatility index markets that support digit contracts
// (DIGITOVER / DIGITUNDER). Kept as a static list -- these symbols are
// stable Deriv identifiers, not user data.
export const MARKETS: MarketDef[] = [
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

export const DEFAULT_MARKET = "R_100";

export function isKnownMarket(symbol: string): boolean {
  return MARKETS.some((m) => m.symbol === symbol);
}
