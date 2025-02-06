import * as v from "valibot";
import {
  ValidEvmAddressLen,
  ValidEvmAddressRegex,
  ValidWhitelistNameMaxLen,
  ValidWhitelistNameMinLen,
  ValidWhitelistNameRegex,
} from "./iWhitelistApplicationService.mts";

export const RequestGetMerkleProofSchema = v.object({
  whitelistName: v.pipe(
    v.string("Whitelist name must be a string"),
    v.nonEmpty("Please provide whitelist name"),
    v.minLength(
      ValidWhitelistNameMinLen,
      `Whitelist name must be at least ${ValidWhitelistNameMinLen.toString()} characters long`,
    ),
    v.maxLength(
      ValidWhitelistNameMaxLen,
      `Whitelist name not exceed ${ValidWhitelistNameMaxLen.toString()} characters`,
    ),
    v.regex(ValidWhitelistNameRegex, "Whitelist name is badly formatted"),
  ),
  whitelistAddress: v.pipe(
    v.string("Whitelist address must be a string"),
    v.nonEmpty("Please provide whitelist address"),
    v.length(
      ValidEvmAddressLen,
      `Whitelist address must be ${ValidEvmAddressLen.toString()} characters long`,
    ),
    v.hexadecimal("Whitelist address must be hexadecimal"),
    v.regex(ValidEvmAddressRegex, "Whitelist address is badly formatted"),
  ),
});

export type RequestGetMerkleProofOutput = v.InferOutput<typeof RequestGetMerkleProofSchema>;
