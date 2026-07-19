export type EngineState =
  | "idle"
  | "starting"
  | "running"
  | "paused"
  | "stopping"
  | "stopped";

export type AccountType =
  | "demo"
  | "real";

export type TradeResult =
  | "win"
  | "loss";

export type StakeMode =
  | "fixed"
  | "percentage"
  | "kelly";

export type RiskValueMode =
  | "amount"
  | "percentage";

export type TradeSignal =
  | "UNDER8"
  | "UNDER9"
  | "NONE";

export type HealthStatus =
  | "healthy"
  | "warning"
  | "error";
export interface EngineConfig {

  //--------------------------------------------------
  // Trading
  //--------------------------------------------------

  market: string;

  accountType: AccountType;

  currency: string;

  duration: number;

  //--------------------------------------------------
  // Stake
  //--------------------------------------------------

  stakeMode: StakeMode;

  baseStake: number;

  stakePercent: number;

  minimumStake: number;

  maximumStake: number;

  reserveBalance: number;

  //--------------------------------------------------
  // Martingale
  //--------------------------------------------------

  martingaleEnabled: boolean;

  martingaleMultiplier: number;

  //--------------------------------------------------
  // Kelly
  //--------------------------------------------------

  kellyEnabled: boolean;

  kellyFraction: number;

  //--------------------------------------------------
  // Risk
  //--------------------------------------------------

  stopLossMode: RiskValueMode;

  stopLoss: number;

  takeProfitMode: RiskValueMode;

  takeProfit: number;

  dailyLossLimit: number;

  dailyProfitLimit: number;

  maxSuccessiveLosses: number;

  maxSuccessiveWins: number;

  //--------------------------------------------------
  // Analysis
  //--------------------------------------------------

  analysisWindow: number;

  minimumSamples: number;

  under8Threshold: number;

  under9Threshold: number;

  minimumTradeQuality: number;

}
export interface TradeRecord {

  id: string;

  timestamp: number;

  market: string;

  signal: TradeSignal;

  stake: number;

  won: boolean;

  profit: number;

  buyPrice: number;

  sellPrice: number;

  result: TradeResult;

}
export interface AnalysisStatus {

  under8Confidence: number | null;

  under9Confidence: number | null;

  tradeQuality: number | null;

  signal: TradeSignal;

  windowFillCount: number;

  windowSize: number;

}

export interface SessionStatus {

  sessionPnl: number;

  totalTrades: number;

  wins: number;

  losses: number;

  successiveWins: number;

  successiveLosses: number;

  startedAt: string | null;

}

export interface ConnectionStatus {

  accountId: string | null;

  balance: number | null;

  lastTick: number | null;

  lastDigit: number | null;

  health: HealthStatus;

}

export interface EngineStatus {

  state: EngineState;

  config: EngineConfig;

  connection: ConnectionStatus;

  analysis: AnalysisStatus;

  session: SessionStatus;

  currentStake: number;

  nextStake: number;

  stopReason: string | null;

  errorMessage: string | null;

  recentTrades: TradeRecord[];

}
export class EngineUserError extends Error {

  readonly status: number;

  constructor(
    message: string,
    status = 400
  ) {

    super(message);

    this.name = "EngineUserError";

    this.status = status;

  }

}