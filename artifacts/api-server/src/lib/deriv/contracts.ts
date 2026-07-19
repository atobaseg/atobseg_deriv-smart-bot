/**
 * Deriv contract definitions
 */

import { TradeSignal } from "./types";
export type DigitContractType =
    | "DIGITUNDER"
    | "DIGITOVER"
    | "DIGITMATCH"
    | "DIGITDIFF";

export interface ContractDefinition {

    type: DigitContractType;

    barrier: string;

    description: string;

}

export const CONTRACTS = {

    UNDER8: {

        type: "DIGITUNDER",

        barrier: "8",

        description: "Last digit under 8"

    } satisfies ContractDefinition,

    UNDER9: {

        type: "DIGITUNDER",

        barrier: "9",

        description: "Last digit under 9"

    } satisfies ContractDefinition

} as const;

export type ContractKey =
    keyof typeof CONTRACTS;

/**
 * Lookup helper
 */
export function getContract(
    key: ContractKey
): ContractDefinition {

    return CONTRACTS[key];

}

/**
 * Convert trading signal to contract
 */
export function signalToContract(
    signal: TradeSignal
): ContractDefinition {
    if (signal === "NONE") {

        throw new Error(
            "Cannot create a contract for signal NONE."
        );

    }

    return signal === "UNDER8"

        ? CONTRACTS.UNDER8

        : CONTRACTS.UNDER9;

}