import path from "path";
import { Logger } from "@aws-lambda-powertools/logger";
import "dotenv/config";
import { ZeroAddress } from "ethers";
import {
  MerkleProofRecord,
  ValidEvmAddressLen,
  ValidEvmAddressRegex,
  ValidWhitelistNameMaxLen,
  ValidWhitelistNameMinLen,
  ValidWhitelistNameRegex,
} from "./iWhitelistApplicationService.mts";
import { IWhitelistQueryService } from "./iWhitelistQueryService.mts";
import { ValidationError } from "./validationError.mts";
import { createWhitelistQueryService } from "./whitelistQueryService.mts";

const validArgvLength = 4;

const logger: Logger = new Logger({ serviceName: "whitelistService" });

const main = async () => {
  if (process.argv.length !== validArgvLength) {
    logger.error(
      `Usage: ${process.argv[1] ? path.basename(process.argv[1]) : "undefined"} <whitelistName> <whitelistAddress>`,
    );
    process.exit(1);
  }

  if (process.argv[2] === undefined) {
    logger.error("[ERR] Missing whitelist name");
    process.exit(1);
  }

  if (process.argv[3] === undefined) {
    logger.error("[ERR] Missing whitelist address");
    process.exit(1);
  }

  if (
    process.argv[2].length < ValidWhitelistNameMinLen ||
    process.argv[2].length > ValidWhitelistNameMaxLen ||
    !ValidWhitelistNameRegex.test(process.argv[2])
  ) {
    const logMessage = `[ERR] Invalid whitelist name: ${process.argv[2]}`;
    logger.error(logMessage);
    throw new ValidationError(logMessage);
  }

  if (
    process.argv[3].length !== ValidEvmAddressLen ||
    !ValidEvmAddressRegex.test(process.argv[3])
  ) {
    const logMessage = `[ERR] Invalid whitelist address: ${process.argv[3]}`;
    logger.error(logMessage);
    throw new ValidationError(logMessage);
  }

  if (process.argv[3] === ZeroAddress) {
    const logMessage = `[ERR] zero whitelist address: ${process.argv[3]}`;
    logger.error(logMessage);
    throw new ValidationError(logMessage);
  }

  const whitelistName = process.argv[2];
  const whitelistAddress = process.argv[3];

  const whitelistQueryService: IWhitelistQueryService = createWhitelistQueryService(logger);
  const merkleProofRecord: MerkleProofRecord | undefined =
    await whitelistQueryService.getMerkleProof(whitelistName, whitelistAddress);
  logger.info(
    `merkleProofRecord: ${merkleProofRecord ? JSON.stringify(merkleProofRecord) : "undefined"}`,
  );
};

await main();
