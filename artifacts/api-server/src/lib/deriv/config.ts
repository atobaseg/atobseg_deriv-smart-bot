import { EngineConfig } from "./types";

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {

  //==================================================
  // Trading
  //==================================================

  market: "R_100",

  accountType: "demo",

  //==================================================
  // Stake
  //==================================================

  stakeMode: "fixed",

  baseStake: 0.35,

  stakePercent: 1,

  minimumStake: 0.35,

  maximumStake: 100,

  reserveBalance: 10,

  //==================================================
  // Martingale
  //==================================================

  martingaleEnabled: false,

  martingaleMultiplier: 2,

  //==================================================
  // Kelly
  //==================================================

  kellyEnabled: false,

  kellyFraction: 0.25,

  //==================================================
  // Risk
  //==================================================

  stopLossMode: "amount",

  stopLoss: 25,

  takeProfitMode: "amount",

  takeProfit: 50,

  dailyLossLimit: 100,

  dailyProfitLimit: 200,

  maxSuccessiveLosses: 5,

  maxSuccessiveWins: 20,

  //==================================================
  // Analysis
  //==================================================

  analysisWindow: 100,

  minimumSamples: 50,

  under8Threshold: 0.80,

  under9Threshold: 0.90,

  minimumTradeQuality: 0.75,

  //==================================================
  // Contract
  //==================================================

  currency: "USD",

  duration: 1

};