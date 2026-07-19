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

        const token = process.env.DERIV_TOKEN;

        if (!token) {
            throw new Error("DERIV_TOKEN is not configured.");
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

        logger.info({
            message: "Creating proposal",
            request
        });

        return {
            id: `proposal-${Date.now()}`,
            ask_price: request.amount
        };

    }

    //--------------------------------------------------

    async buy(
        proposalId: string,
        price: number
    ): Promise<BuyResponse> {

        logger.info({
            message: "Buying contract",
            proposalId,
            price
        });

        return {
            contract_id: Date.now()
        };

    }

    //--------------------------------------------------

    async waitForContract(
        contractId: number
    ): Promise<ContractResult> {

        logger.info({
            message: "Waiting for contract settlement",
            contractId
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        return {

            contract_id: contractId,

            won: true,

            profit: 0,

            buy_price: 0,

            sell_price: 0

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