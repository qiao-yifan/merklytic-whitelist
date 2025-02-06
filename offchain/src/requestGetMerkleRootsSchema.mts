import * as v from "valibot";
import {
  ValidWhitelistPageSizeMax,
  ValidWhitelistPageSizeMin,
  ValidWhitelistStartingTokenMaxLen,
  ValidWhitelistStartingTokenMinLen,
  ValidWhitelistStartingTokenRegex,
} from "./iWhitelistApplicationService.mts";

export const RequestGetMerkleRootsSchema = v.object({
  pageSize: v.pipe(
    v.string("Page size must be a string"),
    v.nonEmpty("Please provide page size"),
    v.digits("Page size must solely consist of numerical digits"),
    v.transform((input) => parseInt(input)),
    v.number("Page size must be a number"),
    v.integer("Page size must be an integer"),
    v.minValue(
      ValidWhitelistPageSizeMin,
      `Page size must be at least ${ValidWhitelistPageSizeMin.toString()}`,
    ),
    v.maxValue(
      ValidWhitelistPageSizeMax,
      `Page size must not exceed ${ValidWhitelistPageSizeMax.toString()}`,
    ),
  ),
  startingToken: v.exactOptional(
    v.pipe(
      v.string("Starting token must be a string"),
      v.nonEmpty("Please provide starting token"),
      v.minLength(
        ValidWhitelistStartingTokenMinLen,
        `Starting token must be at least ${ValidWhitelistStartingTokenMinLen.toString()} characters long`,
      ),
      v.maxLength(
        ValidWhitelistStartingTokenMaxLen,
        `Starting token  must not exceed ${ValidWhitelistStartingTokenMaxLen.toString()} characters`,
      ),
      v.regex(ValidWhitelistStartingTokenRegex, "Starting token is badly formatted"),
    ),
  ),
});

export type RequestGetMerkleRootsOutput = v.InferOutput<typeof RequestGetMerkleRootsSchema>;
