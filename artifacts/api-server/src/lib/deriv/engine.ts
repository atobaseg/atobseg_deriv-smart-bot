import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import { logger } from "../logger";
import { DEFAULT_MARKET, isKnownMarket } from "./markets";
import {
  EngineUserError,
  type AccountType,
  type EngineConfig,
  type EngineState,
  type EngineStatus,
  type TradeRecord,
} from "./types";

const BASE_URL = "https://api.derivws.com";
const WINDOW_SIZE = 20;
const MIN_SAMPLES = 20;
const CONFIDENCE_THRESHOLD = 0.85;
const MAX_RECENT_TRADES = 20;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_CONSECUTIVE_API_ERRORS = 3;

function tokenForAccountType(accountType: AccountType): string | undefined {
  return accountType === "demo"
    ? process.env.DERIV_DEMO_TOKEN
    : process.env.DERIV_REAL_TOKEN;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Singleton trading engine for the Deriv "Under 9 / Under 8" digit
 * over/under strategy. Starts fully idle -- nothing connects to Deriv or
 * evaluates trades until start() is called explicitly.
 */
class DerivEngine {
  private state: EngineState = "idle";
  private config: EngineConfig = {
    market: DEFAULT_MARKET,
    accountType: "demo",
    baseStake: 1,
    martingaleEnabled: false,
    martingaleMultiplier: 2,
    stopLoss: 20,
    takeProfit: 20,
    maxSuccessiveLosses: 5,
    maxSuccessiveWins: 5,
  };

  private ws: WebSocket | null = null;
  private accountId: string | null = null;
  private digitWindow: number[] = [];
  private pipDecimals: number | null = null;
  private tradeInFlight = false;
  private consecutiveApiErrors = 0;

  private currentStake = this.config.baseStake;
  private successiveLosses = 0;
  private successiveWins = 0;
  private sessionPnl = 0;
  private totalTrades = 0;
  private wins = 0;
  private losses = 0;
  private lastTick: number | null = null;
  private lastDigit: number | null = null;
  private stopReason: string | null = null;
  private errorMessage: string | null = null;
  private startedAt: string | null = null;
  private recentTrades: TradeRecord[] = [];

  private reqIdCounter = 1;
  private pendingRequests = new Map<number, PendingRequest>();
  private openContractSubscriptions = new Set<string>();

  getStatus(): EngineStatus {
    const confidences = this.computeConfidences();
    return {
      state: this.state,
      config: { ...this.config },
      accountId: this.accountId,
      currentStake: round2(this.currentStake),
      successiveLosses: this.successiveLosses,
      successiveWins: this.successiveWins,
      sessionPnl: round2(this.sessionPnl),
      totalTrades: this.totalTrades,
      wins: this.wins,
      losses: this.losses,
      lastTick: this.lastTick,
      lastDigit: this.lastDigit,
      windowFillCount: this.digitWindow.length,
      windowSize: WINDOW_SIZE,
      under9Confidence: confidences?.under9 ?? null,
      under8Confidence: confidences?.under8 ?? null,
      stopReason: this.stopReason,
      errorMessage: this.errorMessage,
      startedAt: this.startedAt,
      recentTrades: [...this.recentTrades],
    };
  }

  updateConfig(patch: Partial<EngineConfig>): EngineStatus {
    if (patch.market !== undefined && !isKnownMarket(patch.market)) {
      throw new EngineUserError(`Unknown market symbol: ${patch.market}`);
    }
    if (
      patch.accountType !== undefined &&
      patch.accountType !== "demo" &&
      patch.accountType !== "real"
    ) {
      throw new EngineUserError(`Invalid account type: ${patch.accountType}`);
    }
    if (this.state === "running") {
      if (patch.market !== undefined && patch.market !== this.config.market) {
        throw new EngineUserError(
          "Pause or stop the engine before changing the market.",
          409,
        );
      }
      if (
        patch.accountType !== undefined &&
        patch.accountType !== this.config.accountType
      ) {
        throw new EngineUserError(
          "Pause or stop the engine before changing the account type.",
          409,
        );
      }
    }

    this.config = { ...this.config, ...patch };

    if (this.state === "idle" || this.state === "stopped") {
      this.currentStake = this.config.baseStake;
    }

    return this.getStatus();
  }

  async start(): Promise<EngineStatus> {
    if (this.state === "running") {
      return this.getStatus();
    }

    const token = tokenForAccountType(this.config.accountType);
    if (!token) {
      const secretName =
        this.config.accountType === "demo"
          ? "DERIV_DEMO_TOKEN"
          : "DERIV_REAL_TOKEN";
      throw new EngineUserError(
        `${secretName} is not configured. Add it in Secrets before starting ${this.config.accountType === "demo" ? "demo" : "real-money"} trading.`,
      );
    }
    const appId = process.env.DERIV_APP_ID;
    if (!appId) {
      throw new EngineUserError("DERIV_APP_ID is not configured.");
    }

    if (this.state === "paused" && this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Resume an existing session without resetting stats.
      this.state = "running";
      return this.getStatus();
    }

    // Fresh session: reset stats and (re)connect.
    this.resetSession();

    try {
      const accountId = await this.connectAndSubscribe(token, appId);
      this.accountId = accountId;
      this.state = "running";
      this.startedAt = new Date().toISOString();
    } catch (err) {
      this.teardownConnection();
      this.state = "idle";
      const message = err instanceof Error ? err.message : String(err);
      throw new EngineUserError(`Failed to connect to Deriv: ${message}`);
    }

    return this.getStatus();
  }

  pause(): EngineStatus {
    if (this.state === "running") {
      this.state = "paused";
    }
    return this.getStatus();
  }

  emergencyStop(): EngineStatus {
    this.teardownConnection();
    this.state = "idle";
    this.stopReason = null;
    this.errorMessage = null;
    this.tradeInFlight = false;
    return this.getStatus();
  }

  private autoStop(reason: string): void {
    this.teardownConnection();
    this.state = "stopped";
    this.stopReason = reason;
    this.tradeInFlight = false;
    logger.info({ reason }, "Trading engine auto-stopped");
  }

  private resetSession(): void {
    this.successiveLosses = 0;
    this.successiveWins = 0;
    this.sessionPnl = 0;
    this.totalTrades = 0;
    this.wins = 0;
    this.losses = 0;
    this.recentTrades = [];
    this.currentStake = this.config.baseStake;
    this.digitWindow = [];
    this.pipDecimals = null;
    this.stopReason = null;
    this.errorMessage = null;
    this.consecutiveApiErrors = 0;
    this.lastTick = null;
    this.lastDigit = null;
  }

  private teardownConnection(): void {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Connection closed"));
    }
    this.pendingRequests.clear();
    this.openContractSubscriptions.clear();
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.removeAllListeners();
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
  }

  private nextReqId(): number {
    this.reqIdCounter += 1;
    return this.reqIdCounter;
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected to Deriv");
    }
    this.ws.send(JSON.stringify(payload));
  }

  private sendAndWait<T = any>(payload: Record<string, unknown>): Promise<T> {
    const reqId = this.nextReqId();
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        reject(new Error("Deriv request timed out"));
      }, REQUEST_TIMEOUT_MS);
      this.pendingRequests.set(reqId, { resolve, reject, timeout });
      try {
        this.send({ ...payload, req_id: reqId });
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(reqId);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private async connectAndSubscribe(
    token: string,
    appId: string,
  ): Promise<string> {
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Deriv-App-ID": appId,
    };

    const accountsRes = await fetch(
      `${BASE_URL}/trading/v1/options/accounts`,
      { method: "GET", headers: authHeaders },
    );
    if (!accountsRes.ok) {
      throw new Error(
        `Failed to fetch accounts (HTTP ${accountsRes.status}): ${await accountsRes.text()}`,
      );
    }
    const accountsBody: any = await accountsRes.json();
    const accounts = accountsBody.data ?? accountsBody;
    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error("No Options trading accounts found for this token.");
    }
    const account =
      accounts.find((a: any) => a.account_type === this.config.accountType) ??
      accounts[0];
    const accountId = account.account_id ?? account.accountId ?? account.id;

    const otpRes = await fetch(
      `${BASE_URL}/trading/v1/options/accounts/${accountId}/otp`,
      { method: "POST", headers: authHeaders },
    );
    if (!otpRes.ok) {
      throw new Error(
        `Failed to get OTP (HTTP ${otpRes.status}): ${await otpRes.text()}`,
      );
    }
    const otpBody: any = await otpRes.json();
    const wsUrl = otpBody.data?.url ?? otpBody.url;
    if (!wsUrl) {
      throw new Error("OTP response did not include a WebSocket URL.");
    }

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const onOpen = () => {
        this.ws = ws;
        ws.send(JSON.stringify({ ticks: this.config.market, subscribe: 1 }));
        resolve();
      };
      const onError = (err: Error) => {
        reject(err);
      };
      ws.once("open", onOpen);
      ws.once("error", onError);

      ws.on("message", (data: WebSocket.RawData) => {
        this.handleMessage(data.toString());
      });
      ws.on("close", () => {
        if (this.state === "running" || this.state === "paused") {
          this.errorMessage = "Deriv connection closed unexpectedly.";
          this.autoStop("connection_lost");
        }
      });
      ws.on("error", (err) => {
        logger.error({ err }, "Deriv WebSocket error");
      });
    });

    return String(accountId);
  }

  private handleMessage(raw: string): void {
    let response: any;
    try {
      response = JSON.parse(raw);
    } catch {
      return;
    }

    if (response.req_id && this.pendingRequests.has(response.req_id)) {
      const pending = this.pendingRequests.get(response.req_id)!;
      this.pendingRequests.delete(response.req_id);
      clearTimeout(pending.timeout);
      if (response.error) {
        pending.reject(new Error(response.error.message ?? "Deriv API error"));
      } else {
        pending.resolve(response);
      }
      return;
    }

    if (response.msg_type === "tick" && response.tick) {
      this.handleTick(response.tick);
      return;
    }

    if (response.msg_type === "proposal_open_contract" && response.proposal_open_contract) {
      this.handleContractUpdate(response.proposal_open_contract);
      return;
    }

    if (response.error) {
      logger.warn({ error: response.error }, "Deriv API error message");
    }
  }

  private handleTick(tick: any): void {
    const quote = Number(tick.quote);
    if (Number.isNaN(quote)) return;
    this.lastTick = quote;

    const pipSize = tick.pip_size;
    if (pipSize !== undefined && pipSize !== null) {
      const pipSizeStr = String(pipSize);
      this.pipDecimals = pipSizeStr.includes(".")
        ? pipSizeStr.split(".")[1]!.length
        : 0;
    }
    const digit = this.extractDigit(quote);
    if (digit === null) return;
    this.lastDigit = digit;

    this.digitWindow.push(digit);
    if (this.digitWindow.length > WINDOW_SIZE) {
      this.digitWindow.shift();
    }

    if (this.state === "running" && !this.tradeInFlight) {
      this.maybeEnterTrade();
    }
  }

  private extractDigit(quote: number): number | null {
    if (this.pipDecimals === null) return null;
    const fixed = quote.toFixed(this.pipDecimals);
    const lastChar = fixed[fixed.length - 1];
    const digit = Number(lastChar);
    return Number.isNaN(digit) ? null : digit;
  }

  private computeConfidences(): { under9: number; under8: number } | null {
    if (this.digitWindow.length < MIN_SAMPLES) return null;
    const under9 =
      this.digitWindow.filter((d) => d < 9).length / this.digitWindow.length;
    const under8 =
      this.digitWindow.filter((d) => d < 8).length / this.digitWindow.length;
    return { under9: round4(under9), under8: round4(under8) };
  }

  private maybeEnterTrade(): void {
    const confidences = this.computeConfidences();
    if (!confidences) return;

    let barrier: "9" | "8" | null = null;
    if (confidences.under9 >= CONFIDENCE_THRESHOLD) {
      barrier = "9";
    } else if (confidences.under8 >= CONFIDENCE_THRESHOLD) {
      barrier = "8";
    }
    if (!barrier) return;

    this.tradeInFlight = true;
    this.executeTrade(barrier).catch((err) => {
      this.tradeInFlight = false;
      this.consecutiveApiErrors += 1;
      this.errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({ err }, "Trade execution failed");
      if (this.consecutiveApiErrors >= MAX_CONSECUTIVE_API_ERRORS) {
        this.autoStop("repeated_api_errors");
      }
    });
  }

  private async executeTrade(barrier: "9" | "8"): Promise<void> {
    const stake = this.currentStake;
    const market = this.config.market;

    const proposalRes = await this.sendAndWait({
      proposal: 1,
      amount: stake,
      basis: "stake",
      contract_type: "DIGITUNDER",
      currency: "USD",
      duration: 1,
      duration_unit: "t",
      symbol: market,
      barrier,
    });
    const proposal = proposalRes.proposal;
    if (!proposal?.id) {
      throw new Error("Deriv did not return a valid price proposal.");
    }

    const buyRes = await this.sendAndWait({
      buy: proposal.id,
      price: proposal.ask_price ?? stake,
    });
    const buy = buyRes.buy;
    if (!buy?.contract_id) {
      throw new Error("Deriv did not confirm the trade purchase.");
    }

    this.consecutiveApiErrors = 0;
    await this.watchContractUntilSettled(String(buy.contract_id), {
      market,
      barrier,
      stake,
      buyPrice: Number(buy.buy_price ?? stake),
    });
  }

  private contractWaiters = new Map<
    string,
    { market: string; barrier: string; stake: number; buyPrice: number }
  >();

  private watchContractUntilSettled(
    contractId: string,
    context: { market: string; barrier: string; stake: number; buyPrice: number },
  ): Promise<void> {
    this.contractWaiters.set(contractId, context);
    this.openContractSubscriptions.add(contractId);
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.contractWaiters.delete(contractId);
        this.tradeInFlight = false;
        reject(new Error("Timed out waiting for contract settlement"));
      }, REQUEST_TIMEOUT_MS * 2);
      this.contractSettleResolvers.set(contractId, { resolve, reject, timeout });
      try {
        this.send({
          proposal_open_contract: 1,
          contract_id: Number(contractId),
          subscribe: 1,
        });
      } catch (err) {
        clearTimeout(timeout);
        this.contractSettleResolvers.delete(contractId);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private contractSettleResolvers = new Map<
    string,
    { resolve: () => void; reject: (err: Error) => void; timeout: NodeJS.Timeout }
  >();

  private handleContractUpdate(contract: any): void {
    const contractId = String(contract.contract_id);
    const context = this.contractWaiters.get(contractId);
    if (!context) return;

    if (!contract.is_sold) {
      return;
    }

    this.contractWaiters.delete(contractId);
    this.openContractSubscriptions.delete(contractId);
    const resolver = this.contractSettleResolvers.get(contractId);
    this.contractSettleResolvers.delete(contractId);
    if (resolver) clearTimeout(resolver.timeout);

    try {
      this.send({ forget: contract.id ?? contractId });
    } catch {
      // ignore -- connection may already be closing
    }

    const sellPrice = Number(contract.sell_price ?? 0);
    const profit =
      contract.profit !== undefined
        ? Number(contract.profit)
        : sellPrice - context.buyPrice;
    const result: "win" | "loss" = profit > 0 ? "win" : "loss";
    const exitQuote = Number(contract.exit_tick ?? contract.current_spot ?? 0);
    const exitDigit = this.extractDigit(exitQuote) ?? this.lastDigit ?? 0;

    const trade: TradeRecord = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      market: context.market,
      contractType: "DIGITUNDER",
      barrier: context.barrier,
      stake: round2(context.stake),
      payout: round2(sellPrice),
      profit: round2(profit),
      result,
      exitDigit,
    };
    this.recordTrade(trade);

    this.tradeInFlight = false;
    if (resolver) resolver.resolve();
  }

  private recordTrade(trade: TradeRecord): void {
    this.recentTrades.unshift(trade);
    if (this.recentTrades.length > MAX_RECENT_TRADES) {
      this.recentTrades.pop();
    }
    this.totalTrades += 1;
    this.sessionPnl += trade.profit;

    if (trade.result === "win") {
      this.wins += 1;
      this.successiveWins += 1;
      this.successiveLosses = 0;
      this.currentStake = this.config.baseStake;
    } else {
      this.losses += 1;
      this.successiveLosses += 1;
      this.successiveWins = 0;
      if (this.config.martingaleEnabled) {
        const nextStake = this.currentStake * this.config.martingaleMultiplier;
        const maxStake = this.config.baseStake * 1000;
        this.currentStake = Math.min(nextStake, maxStake);
      } else {
        this.currentStake = this.config.baseStake;
      }
    }

    if (this.state !== "running") return;

    if (this.config.stopLoss > 0 && this.sessionPnl <= -this.config.stopLoss) {
      this.autoStop("stop_loss_hit");
    } else if (
      this.config.takeProfit > 0 &&
      this.sessionPnl >= this.config.takeProfit
    ) {
      this.autoStop("take_profit_hit");
    } else if (this.successiveLosses >= this.config.maxSuccessiveLosses) {
      this.autoStop("max_successive_losses_hit");
    } else if (this.successiveWins >= this.config.maxSuccessiveWins) {
      this.autoStop("max_successive_wins_hit");
    }
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export const derivEngine = new DerivEngine();