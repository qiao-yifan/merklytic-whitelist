import * as v from "valibot";
import {
  ValidWhitelistNameMaxLen,
  ValidWhitelistNameMinLen,
  ValidWhitelistNameRegex,
} from "./iWhitelistApplicationService.mts";

export const RequestDeleteMerkleTreeSchema = v.object({
  whitelistName: v.pipe(
    v.string("Whitelist name must be a string"),
    v.nonEmpty("Please provide whitelist name"),
    v.minLength(
      ValidWhitelistNameMinLen,
      `Whitelist name must be at least ${ValidWhitelistNameMinLen.toString()} characters long`,
    ),
    v.maxLength(
      ValidWhitelistNameMaxLen,
      `Whitelist name must not exceed ${ValidWhitelistNameMaxLen.toString()} characters`,
    ),
    v.regex(ValidWhitelistNameRegex, "Whitelist name is badly formatted"),
  ),
});

export type RequestDeleteMerkleTreeOutput = v.InferOutput<typeof RequestDeleteMerkleTreeSchema>;
