import axios from "axios";
import WebSocket from "ws";

import { logger } from "../logger";


//--------------------------------------------------
// Deriv Credentials
//--------------------------------------------------

export interface DerivCredentials {

    appId: string;

    demoToken?: string;

    realToken?: string;

}


//--------------------------------------------------
// Tick
//--------------------------------------------------

export interface Tick {

    quote: number;

    epoch: number;

}


//--------------------------------------------------
// Proposal
//--------------------------------------------------

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


//--------------------------------------------------
// Buy
//--------------------------------------------------

export interface BuyResponse {

    contract_id: number;

}


//--------------------------------------------------
// Contract Result
//--------------------------------------------------

export interface ContractResult {

    contract_id: number;

    profit: number;

    buy_price: number;

    sell_price: number;

    won: boolean;

}


//==================================================
// Deriv Client
//==================================================

export class DerivClient {

    //--------------------------------------------------
    // User Credentials
    //--------------------------------------------------

    private readonly credentials: DerivCredentials;


    //--------------------------------------------------
    // Connection
    //--------------------------------------------------

    private ws: WebSocket | null = null;

    private connected = false;

    private accountId: string | null = null;

    private balance = 0;

    private tickCallback?: (
        tick: Tick
    ) => void;


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
    // Contract Subscriptions
    //--------------------------------------------------

    private contractListeners = new Map<
        number,
        (message: any) => void
    >();


    //--------------------------------------------------
    // Constructor
    //--------------------------------------------------

    constructor(
        credentials: DerivCredentials
    ) {

        if (!credentials.appId) {

            throw new Error(
                "Deriv App ID is required."
            );

        }

        if (
            !credentials.demoToken &&
            !credentials.realToken
        ) {

            throw new Error(
                "At least one Deriv account token is required."
            );

        }

        this.credentials = {
            ...credentials
        };

    }


    //--------------------------------------------------
    // Helpers
    //--------------------------------------------------

    private nextReqId(): number {

        return this.reqId++;

    }


    //--------------------------------------------------

    private sendRequest(
        payload: any
    ): Promise<any> {

        if (!this.ws) {

            throw new Error(
                "Not connected."
            );

        }

        const reqId =
            this.nextReqId();


        return new Promise(
            (resolve, reject) => {

                const timeout =
                    setTimeout(
                        () => {

                            this.pendingRequests.delete(
                                reqId
                            );

                            reject(
                                new Error(
                                    "Deriv request timed out."
                                )
                            );

                        },
                        15000
                    );


                this.pendingRequests.set(
                    reqId,
                    {
                        resolve,
                        reject,
                        timeout
                    }
                );


                this.ws!.send(

                    JSON.stringify({

                        ...payload,

                        req_id: reqId

                    })

                );

            }
        );

    }


    //--------------------------------------------------
    // Status
    //--------------------------------------------------

    isConnected(): boolean {

        return this.connected;

    }


    //--------------------------------------------------

    getAccountId(): string | null {

        return this.accountId;

    }


    //--------------------------------------------------

    async getBalance(): Promise<number> {

        return this.balance;

    }


    //--------------------------------------------------
    // Token Selection
    //--------------------------------------------------

    private getTokenForAccountType(
        accountType: "demo" | "real"
    ): string {

        const token =
            accountType === "demo"
                ? this.credentials.demoToken
                : this.credentials.realToken;


        if (!token) {

            throw new Error(

                accountType === "demo"

                    ? "Demo Deriv token is not configured for this user."

                    : "Real Deriv token is not configured for this user."

            );

        }


        return token;

    }


    //--------------------------------------------------
    // Options API
    //--------------------------------------------------

    private async getOptionsAccountId(
        accountType: "demo" | "real"
    ): Promise<string> {

        const token =
            this.getTokenForAccountType(
                accountType
            );


        const response =
            await axios.get(

                "https://api.derivws.com/trading/v1/options/accounts",

                {

                    headers: {

                        Authorization:
                            `Bearer ${token}`,

                        "Deriv-App-ID":
                            this.credentials.appId

                    }

                }

            );


        const accounts =
            response.data.data;


        if (!accounts?.length) {

            throw new Error(
                "No Options account found."
            );

        }


        return accounts[0].account_id;

    }


    //--------------------------------------------------
    // OTP Connection
    //--------------------------------------------------

    private async createOtpConnection(
        accountType: "demo" | "real"
    ): Promise<string> {

        const token =
            this.getTokenForAccountType(
                accountType
            );


        const accountId =
            await this.getOptionsAccountId(
                accountType
            );


        this.accountId =
            accountId;


        const response =
            await axios.post(

                `https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`,

                {},

                {

                    headers: {

                        Authorization:
                            `Bearer ${token}`,

                        "Deriv-App-ID":
                            this.credentials.appId

                    }

                }

            );


        return response.data.data.url;

    }


    //--------------------------------------------------
    // Connection
    //--------------------------------------------------

    async connect(
        accountType: "demo" | "real"
    ): Promise<void> {

        if (this.connected) {

            return;

        }


        const url =
            await this.createOtpConnection(
                accountType
            );


        this.ws =
            new WebSocket(url);


        //--------------------------------------------------
        // Register handlers FIRST
        //--------------------------------------------------

        this.ws.on(

            "message",

            data =>
                this.handleMessage(
                    data.toString()
                )

        );


        this.ws.on(

            "close",

            () => {

                this.connected = false;

                logger.warn({

                    message:
                        "Disconnected from Deriv"

                });

            }

        );


        //--------------------------------------------------
        // Wait for socket
        //--------------------------------------------------

        await new Promise<void>(
            (resolve, reject) => {

                this.ws!.once(

                    "open",

                    () => {

                        this.connected =
                            true;

                        resolve();

                    }

                );


                this.ws!.once(
                    "error",
                    reject
                );

            }
        );

    }


    //--------------------------------------------------
    // Disconnect
    //--------------------------------------------------

    async disconnect(): Promise<void> {

        this.ws?.close();

        this.ws = null;

        this.connected = false;

        this.accountId = null;

        this.balance = 0;

        this.tickCallback =
            undefined;


        this.contractListeners.clear();


        for (
            const pending
            of this.pendingRequests.values()
        ) {

            clearTimeout(
                pending.timeout
            );


            pending.reject(

                new Error(
                    "Deriv connection closed."
                )

            );

        }


        this.pendingRequests.clear();

    }


    //--------------------------------------------------
    // Tick Subscription
    //--------------------------------------------------

    subscribeTicks(

        symbol: string,

        callback: (
            tick: Tick
        ) => void

    ): void {

        if (!this.ws) {

            throw new Error(
                "Not connected."
            );

        }


        this.tickCallback =
            callback;


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

        const response =
            await this.sendRequest({

                proposal: 1,

                amount:
                    request.amount,

                basis:
                    request.basis,

                contract_type:
                    request.contract_type,

                currency:
                    request.currency,

                duration:
                    request.duration,

                duration_unit:
                    request.duration_unit,

                underlying_symbol:
                    request.symbol,

                barrier:
                    request.barrier

            });


        return {

            id:
                response.proposal.id,

            ask_price:
                Number(
                    response.proposal.ask_price
                )

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

                buy:
                    proposalId,

                price

            });


        return {

            contract_id:
                Number(
                    response.buy.contract_id
                )

        };

    }


    //--------------------------------------------------
    // Wait for Contract Settlement
    //--------------------------------------------------

    async waitForContract(
        contractId: number
    ): Promise<ContractResult> {

        return new Promise(
            (resolve, reject) => {

                const listener =
                    (message: any) => {

                        const contract =
                            message.proposal_open_contract;


                        if (!contract) {

                            return;

                        }


                        if (!contract.is_sold) {

                            return;

                        }


                        this.contractListeners.delete(
                            contractId
                        );


                        resolve({

                            contract_id:
                                Number(
                                    contract.contract_id
                                ),

                            profit:
                                Number(
                                    contract.profit ?? 0
                                ),

                            buy_price:
                                Number(
                                    contract.buy_price ?? 0
                                ),

                            sell_price:
                                Number(
                                    contract.sell_price ?? 0
                                ),

                            won:
                                Number(
                                    contract.profit ?? 0
                                ) > 0

                        });

                    };


                this.contractListeners.set(

                    contractId,

                    listener

                );


                this.ws?.send(

                    JSON.stringify({

                        proposal_open_contract: 1,

                        contract_id:
                            contractId,

                        subscribe: 1

                    })

                );


                setTimeout(
                    () => {

                        if (
                            this.contractListeners.has(
                                contractId
                            )
                        ) {

                            this.contractListeners.delete(
                                contractId
                            );


                            reject(

                                new Error(
                                    "Contract settlement timeout."
                                )

                            );

                        }

                    },
                    60000
                );

            }
        );

    }


    //--------------------------------------------------
    // Message Routing
    //--------------------------------------------------

    private handleMessage(
        raw: string
    ): void {

        let message: any;


        try {

            message =
                JSON.parse(raw);

        } catch {

            return;

        }


        //--------------------------------------------------
        // Authorization
        //--------------------------------------------------

        if (
            message.msg_type === "authorize"
        ) {

            logger.info({

                message:
                    "Authorize payload",

                payload:
                    message

            });


            this.accountId =
                message.authorize?.loginid
                ?? this.accountId;


            this.balance =
                Number(

                    message.authorize?.balance
                    ?? this.balance

                );


            logger.info({

                message:
                    "Authorization successful",

                accountId:
                    this.accountId,

                balance:
                    this.balance

            });

        }


        //--------------------------------------------------
        // Balance Updates
        //--------------------------------------------------

        if (
            message.msg_type === "balance"
        ) {

            this.balance =
                Number(

                    message.balance?.balance
                    ?? this.balance

                );

        }


        //--------------------------------------------------
        // Tick Stream
        //--------------------------------------------------

        if (
            message.msg_type === "tick"
        ) {

            if (!message.tick) {

                logger.warn({

                    message:
                        "Tick message received without tick payload",

                    payload:
                        message

                });

                return;

            }


            if (this.tickCallback) {

                this.tickCallback({

                    quote:
                        Number(
                            message.tick.quote
                        ),

                    epoch:
                        Number(
                            message.tick.epoch
                        )

                });

            }


            return;

        }


        //--------------------------------------------------
        // Contract Updates
        //--------------------------------------------------

        if (
            message.msg_type ===
            "proposal_open_contract"
        ) {

            const contractId =
                Number(

                    message
                        .proposal_open_contract
                        .contract_id

                );


            const listener =
                this.contractListeners.get(
                    contractId
                );


            if (listener) {

                listener(message);

            }


            return;

        }


        //--------------------------------------------------
        // Pending Request Routing
        //--------------------------------------------------

        if (
            typeof message.req_id ===
            "number"
        ) {

            const pending =
                this.pendingRequests.get(
                    message.req_id
                );


            if (!pending) {

                return;

            }


            clearTimeout(
                pending.timeout
            );


            this.pendingRequests.delete(
                message.req_id
            );


            if (message.error) {

                pending.reject(

                    new Error(
                        message.error.message
                    )

                );

            } else {

                pending.resolve(
                    message
                );

            }

        }

    }

}