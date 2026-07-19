import { randomUUID } from "crypto";

import { DerivClient } from "./deriv-client";

import {
    TradeSignal,
    TradeRecord
} from "./types";

import {
    signalToContract
} from "./contracts";

export class TradeManager {

    constructor(

        private readonly client: DerivClient

    ) { }

    //--------------------------------------------------
    // Execute Trade
    //--------------------------------------------------

    async executeTrade(

        signal: Exclude<TradeSignal, "NONE">,

        market: string,

        stake: number,

        currency: string,

        duration: number

    ): Promise<TradeRecord> {

        const contract =
            signalToContract(signal);

        const proposal =
            await this.client.proposal({

                amount: stake,

                basis: "stake",

                contract_type: contract.type,

                barrier: contract.barrier,

                currency,

                duration,

                duration_unit: "t",

                symbol: market

            });
        const buy = await this.client.buy(
            proposal.id,
            stake
        );

        const settled =
            await this.client.waitForContract(
                buy.contract_id
            );

        const profit =
            settled.profit ?? 0;

        const won =
            profit > 0;

        return {

            id: randomUUID(),

            timestamp:
                Date.now(),

            market,

            signal,

            stake,

            won,

            profit,

            buyPrice:
                settled.buy_price ?? stake,

            sellPrice:
                settled.sell_price ?? 0,

            result:
                won
                    ? "win"
                    : "loss"

        };

    }

}