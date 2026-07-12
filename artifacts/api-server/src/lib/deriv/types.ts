export type EngineState = "idle" | "running" | "paused" | "stopped";
export type AccountType = "demo" | "real";
export type TradeResult = "win" | "loss";

export interface EngineConfig {
  market: string;
  accountType: AccountType;
  baseStake: number;
  martingaleEnabled: boolean;
  martingaleMultiplier: number;
  stopLoss: number;
  takeProfit: number;
  maxSuccessiveLosses: number;
  maxSuccessiveWins: number;
}

export interface TradeRecord {
  id: string;
  timestamp: string;
  market: string;
  contractType: string;
  barrier: string;
  stake: number;
  payout: number;
  profit: number;
  result: TradeResult;
  exitDigit: number;
}

export interface EngineStatus {
  state: EngineState;
  config: EngineConfig;
  accountId: string | null;
  currentStake: number;
  successiveLosses: number;
  successiveWins: number;
  sessionPnl: number;
  totalTrades: number;
  wins: number;
  losses: number;
  lastTick: number | null;
  lastDigit: number | null;
  windowFillCount: number;
  windowSize: number;
  under9Confidence: number | null;
  under8Confidence: number | null;
  stopReason: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  recentTrades: TradeRecord[];
}

export class EngineUserError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
