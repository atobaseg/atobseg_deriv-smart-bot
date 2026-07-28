import axios from "axios";
import WebSocket from "ws";

import { logger } from "../logger";

export interface Tick {
    quote: number;
    epoch: number;
}

export interface ProposalRequest {
    symbol: string;
    amount: number;
    basis: string;
    contract_type: string;
    currency: string;
    duration: number;
    duration_unit: string;
    barrier?: string;
}

export interface ProposalResponse {
    id: string;
    ask_price: number;
}

export interface BuyResponse {
    contract_id: number;
}

export interface ContractResult {
    contract_id: number;
    profit: number;
    buy_price: number;
    sell_price: number;
    won: boolean;
}

export class DerivClient {

    //--------------------------------------------------
    // Connection
    //--------------------------------------------------

    private ws: WebSocket | null = null;

    private connected = false;

    private accountId: string | null = null;

    private balance = 0;

    private tickCallback?: (tick: Tick) => void;

    //--------------------------------------------------
    // Request Routing
    //--------------------------------------------------

    private reqId = 1;

    private pendingRequests = new Map<
        number,
        {
            resolve: (value: any) => void;
            reject: (reason?: any) => void;
            timeout: NodeJS.Timeout;
        }
    >();

    //--------------------------------------------------
    // Contract subscriptions
    //--------------------------------------------------

    private contractListeners = new Map<
        number,
        (message: any) => void
    >();
    //--------------------------------------------------
    // Helpers
    //--------------------------------------------------

    private nextReqId(): number {

        return this.reqId++;

    }

    private sendRequest(payload: any): Promise<any> {

        if (!this.ws) {

            throw new Error("Not connected.");

        }

        const reqId = this.nextReqId();

        return new Promise((resolve, reject) => {

            const timeout = setTimeout(() => {

                this.pendingRequests.delete(reqId);

                reject(
                    new Error("Deriv request timed out.")
                );

            }, 15000);

            this.pendingRequests.set(reqId, {

                resolve,

                reject,

                timeout

            });

            this.ws!.send(

                JSON.stringify({

                    ...payload,

                    req_id: reqId

                })

            );

        });

    }

    //--------------------------------------------------
    // Status
    //--------------------------------------------------

    isConnected(): boolean {

        return this.connected;

    }

    getAccountId(): string | null {

        return this.accountId;

    }

    async getBalance(): Promise<number> {

        return this.balance;

    }

    //--------------------------------------------------
    // Options API
    //--------------------------------------------------

    private async getOptionsAccountId(): Promise<string> {

        const appId = process.env.DERIV_APP_ID;

        if (!appId) {

            throw new Error("DERIV_APP_ID missing.");

        }

        const token =
            process.env.DERIV_DEMO_TOKEN ??
            process.env.DERIV_REAL_TOKEN;

        if (!token) {

            throw new Error("No Deriv PAT configured.");

        }

        const response = await axios.get(

            "https://api.derivws.com/trading/v1/options/accounts",

            {

                headers: {

                    Authorization: `Bearer ${token}`,

                    "Deriv-App-ID": appId

                }

            }

        );

        const accounts = response.data.data;

        if (!accounts?.length) {

            throw new Error("No Options account found.");

        }

        return accounts[0].account_id;

    }

    private async createOtpConnection(): Promise<string> {

        const appId = process.env.DERIV_APP_ID;

        const token =
            process.env.DERIV_DEMO_TOKEN ??
            process.env.DERIV_REAL_TOKEN;

        if (!appId || !token) {

            throw new Error("Missing Deriv credentials.");

        }

        const accountId =
            await this.getOptionsAccountId();

        const response = await axios.post(

            `https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`,

            {},

            {

                headers: {

                    Authorization: `Bearer ${token}`,

                    "Deriv-App-ID": appId

                }

            }

        );

        return response.data.data.url;

    }

    //--------------------------------------------------
    // Connection
    //--------------------------------------------------

    async connect(): Promise<void> {

        if (this.connected) {

            return;

        }

        const url =
            await this.createOtpConnection();

        this.ws = new WebSocket(url);

        await new Promise<void>((resolve, reject) => {

            this.ws!.once("open", () => {

                this.connected = true;

                resolve();

            });

            this.ws!.once("error", reject);

        });

        this.ws.on(

            "message",

            data => this.handleMessage(data.toString())

        );

        this.ws.on("close", () => {

            this.connected = false;

            logger.warn({

                message: "Disconnected from Deriv"

            });

        });

    }

    async disconnect(): Promise<void> {

        this.ws?.close();

        this.ws = null;

        this.connected = false;

    }
    //--------------------------------------------------
    // Authorization
    //--------------------------------------------------

    async authorize(
        accountType: "demo" | "real"
    ): Promise<void> {

        const token =
            accountType === "demo"
                ? process.env.DERIV_DEMO_TOKEN
                : process.env.DERIV_REAL_TOKEN;

        if (!token) {

            throw new Error("Missing Deriv token.");

        }

        await this.sendRequest({

            authorize: token

        });

    }

    //--------------------------------------------------
    // Tick Subscription
    //--------------------------------------------------

    subscribeTicks(

        symbol: string,

        callback: (tick: Tick) => void

    ): void {

        if (!this.ws) {

            throw new Error("Not connected.");

        }

        this.tickCallback = callback;

        this.ws.send(

            JSON.stringify({

                ticks: symbol,

                subscribe: 1

            })

        );

    }

    //--------------------------------------------------
    // Proposal
    //--------------------------------------------------

    async proposal(
        request: ProposalRequest
    ): Promise<ProposalResponse> {

        const response = await this.sendRequest({

            proposal: 1,

            amount: request.amount,

            basis: request.basis,

            contract_type: request.contract_type,

            currency: request.currency,

            duration: request.duration,

            duration_unit: request.duration_unit,

            underlying_symbol: request.symbol,

            barrier: request.barrier

        });

        return {

            id: response.proposal.id,

            ask_price:
                Number(response.proposal.ask_price)

        };

    }

    //--------------------------------------------------
    // Buy
    //--------------------------------------------------

    async buy(

        proposalId: string,

        price: number

    ): Promise<BuyResponse> {

        const response =
            await this.sendRequest({

                buy: proposalId,

                price

            });

        return {

            contract_id:
                Number(response.buy.contract_id)

        };

    }
    //--------------------------------------------------
    // Wait for Contract Settlement
    //--------------------------------------------------

    async waitForContract(
        contractId: number
    ): Promise<ContractResult> {

        return new Promise((resolve, reject) => {

            const listener = (message: any) => {

                const contract =
                    message.proposal_open_contract;

                if (!contract) {
                    return;
                }

                if (!contract.is_sold) {
                    return;
                }

                this.contractListeners.delete(contractId);

                resolve({

                    contract_id:
                        Number(contract.contract_id),

                    profit:
                        Number(contract.profit ?? 0),

                    buy_price:
                        Number(contract.buy_price ?? 0),

                    sell_price:
                        Number(contract.sell_price ?? 0),

                    won:
                        Number(contract.profit ?? 0) > 0

                });

            };

            this.contractListeners.set(
                contractId,
                listener
            );

            this.ws?.send(

                JSON.stringify({

                    proposal_open_contract: 1,

                    contract_id: contractId,

                    subscribe: 1

                })

            );

            setTimeout(() => {

                if (
                    this.contractListeners.has(contractId)
                ) {

                    this.contractListeners.delete(contractId);

                    reject(
                        new Error(
                            "Contract settlement timeout."
                        )
                    );

                }

            }, 60000);

        });

    }
    //--------------------------------------------------
    // Message Routing
    //--------------------------------------------------

    private handleMessage(
        raw: string
    ): void {

        let message: any;

        try {

            message = JSON.parse(raw);

        } catch {

            return;

        }

        //--------------------------------------------------
        // Authorization
        //--------------------------------------------------

        if (message.msg_type === "authorize") {

            this.accountId =
                message.authorize?.loginid ?? null;

            this.balance =
                Number(
                    message.authorize?.balance ?? 0
                );

            logger.info({

                message: "Authorization successful",

                accountId: this.accountId,

                balance: this.balance

            });

            return;

        }

        //--------------------------------------------------
        // Balance updates
        //--------------------------------------------------

        if (message.msg_type === "balance") {

            this.balance =
                Number(
                    message.balance?.balance ?? this.balance
                );

            return;

        }

        //--------------------------------------------------
        // Tick Stream
        //--------------------------------------------------

        if (message.msg_type === "tick") {

            if (!message.tick) {
                logger.warn({
                    message: "Tick message received without tick payload",
                    payload: message
                });
                return;
            }

            if (this.tickCallback) {

                this.tickCallback({

                    quote: Number(message.tick.quote),

                    epoch: Number(message.tick.epoch)

                });

            }

            return;

        }

        //--------------------------------------------------
        // Contract updates
        //--------------------------------------------------

        if (
            message.msg_type === "proposal_open_contract"
        ) {

            const contractId =
                Number(
                    message.proposal_open_contract.contract_id
                );

            const listener =
                this.contractListeners.get(contractId);

            if (listener) {

                listener(message);

            }

            return;

        }

        //--------------------------------------------------
        // Pending request routing
        //--------------------------------------------------

        if (typeof message.req_id === "number") {

            const pending =
                this.pendingRequests.get(message.req_id);

            if (!pending) {

                return;

            }

            clearTimeout(pending.timeout);

            this.pendingRequests.delete(message.req_id);

            if (message.error) {

                pending.reject(

                    new Error(message.error.message)

                );

            } else {

                pending.resolve(message);

            }

        }

    }

}
