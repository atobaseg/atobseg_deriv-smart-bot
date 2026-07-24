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

    private ws: WebSocket | null = null;

    private connected = false;

    private accountId: string | null = null;

    private balance = 0;

    private tickCallback?:
        (tick: Tick) => void;
    //--------------------------------------------------
    // Request tracking
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

    private nextReqId(): number {

        return this.reqId++;

    }

    private sendRequest(payload: any): Promise<any> {

        if (!this.ws) {

            throw new Error("Not connected.");

        }

        const ws = this.ws;

        const reqId = this.nextReqId();

        return new Promise((resolve, reject) => {

            const timeout = setTimeout(() => {

                this.pendingRequests.delete(reqId);

                reject(new Error("Deriv request timed out."));

            }, 15000);

            this.pendingRequests.set(
                reqId,
                {
                    resolve,
                    reject,
                    timeout
                }
            );

            ws.send(
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
    // Connection
    //--------------------------------------------------

    async connect(): Promise<void> {

        if (this.connected) {
            return;
        }

        const appId = process.env.DERIV_APP_ID;

        if (!appId) {
            throw new Error("DERIV_APP_ID is not configured.");
        }

        // Use demo token if available, otherwise fall back to real token.
        const token =
            process.env.DERIV_DEMO_TOKEN ??
            process.env.DERIV_REAL_TOKEN;

        if (!token) {
            throw new Error(
                "Neither DERIV_DEMO_TOKEN nor DERIV_REAL_TOKEN is configured."
            );
        }

        this.ws = new WebSocket(
            `wss://ws.derivws.com/websockets/v3?app_id=${appId}`
        );

        await new Promise<void>((resolve, reject) => {

            this.ws!.once("open", () => {

                this.connected = true;

                this.ws!.send(
                    JSON.stringify({
                        authorize: token
                    })
                );

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

        this.connected = false;

        this.ws = null;

    }

    async authorize(
        accountType: "demo" | "real"
    ): Promise<void> {

        if (!this.ws) {

            throw new Error("Not connected.");

        }

        const token =
            accountType === "demo"
                ? process.env.DERIV_DEMO_TOKEN
                : process.env.DERIV_REAL_TOKEN;

        if (!token) {

            throw new Error("Missing Deriv token.");

        }

        this.ws.send(
            JSON.stringify({
                authorize: token
            })
        );

    }

    async subscribeTicks(

        symbol: string,

        callback: (tick: Tick) => void

    ): Promise<void> {

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
    // Trading
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

        if (!response.proposal?.id) {
            throw new Error("Failed to create proposal.");
        }

        return {
            id: response.proposal.id,
            ask_price: Number(response.proposal.ask_price)
        };

    }

    //--------------------------------------------------

    async buy(
        proposalId: string,
        price: number
    ): Promise<BuyResponse> {

        const response = await this.sendRequest({
            buy: proposalId,
            price
        });

        if (!response.buy?.contract_id) {
            throw new Error("Buy request failed.");
        }

        return {
            contract_id: Number(response.buy.contract_id)
        };

    }

    //--------------------------------------------------

    async waitForContract(
        contractId: number
    ): Promise<ContractResult> {

        const response = await this.sendRequest({
            proposal_open_contract: 1,
            contract_id: contractId
        });

        const contract = response.proposal_open_contract;

        if (!contract) {
            throw new Error("Failed to retrieve contract.");
        }

        return {
            contract_id: Number(contract.contract_id),
            profit: Number(contract.profit ?? 0),
            buy_price: Number(contract.buy_price ?? 0),
            sell_price: Number(contract.sell_price ?? 0),
            won: Number(contract.profit ?? 0) > 0
        };

    }
    //--------------------------------------------------
    // Message Handling
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
        // Tick Stream
        //--------------------------------------------------

        if (
            message.msg_type === "tick" &&
            this.tickCallback
        ) {

            this.tickCallback({

                quote: Number(message.tick.quote),

                epoch: Number(message.tick.epoch)

            });

            return;

        }

        //--------------------------------------------------
        // Future routing
        //--------------------------------------------------
        // Proposal responses
        // Buy confirmations
        // Contract updates
        // Errors
        // Ping/Pong

    }

}