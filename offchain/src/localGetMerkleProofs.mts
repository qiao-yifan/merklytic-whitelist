import path from "path";
import { Logger } from "@aws-lambda-powertools/logger";
import "dotenv/config";
import {
  MerkleProofRecord,
  ValidWhitelistNameMaxLen,
  ValidWhitelistNameMinLen,
  ValidWhitelistNameRegex,
} from "./iWhitelistApplicationService.mts";
import { IWhitelistQueryService } from "./iWhitelistQueryService.mts";
import { ValidationError } from "./validationError.mts";
import { createWhitelistQueryService } from "./whitelistQueryService.mts";

const validArgvLength = 3;

const logger: Logger = new Logger({ serviceName: "whitelistService" });

const main = async () => {
  if (process.argv.length !== validArgvLength) {
    logger.error(
      `Usage: ${process.argv[1] ? path.basename(process.argv[1]) : "undefined"} <whitelistName>`,
    );
    process.exit(1);
  }

  if (process.argv[2] === undefined) {
    logger.error("[ERR] Missing whitelist name");
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

  const whitelistName = process.argv[2];

  const whitelistQueryService: IWhitelistQueryService = createWhitelistQueryService(logger);
  const merkleProofRecords: MerkleProofRecord[] =
    await whitelistQueryService.getMerkleProofs(whitelistName);

  merkleProofRecords.forEach((value, index) => {
    logger.info(`${index.toString()}: ${JSON.stringify(value)}`);
  });
};

await main();
