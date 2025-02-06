import path from "path";
import { Logger } from "@aws-lambda-powertools/logger";
import "dotenv/config";
import {
  MerkleRootRecords,
  ValidWhitelistStartingTokenMaxLen,
  ValidWhitelistStartingTokenMinLen,
  ValidWhitelistStartingTokenRegex,
} from "./iWhitelistApplicationService.mts";
import { IWhitelistQueryService } from "./iWhitelistQueryService.mts";
import { ValidationError } from "./validationError.mts";
import { createWhitelistQueryService } from "./whitelistQueryService.mts";

const validArgvLength = 3;

const validPageSizeMaxLen = 4;
const validPageSizeMinLen = 1;
const validPageSizeRegex = /^[0-9]+$/;

const logger: Logger = new Logger({ serviceName: "whitelistService" });

const main = async () => {
  if (process.argv.length < validArgvLength) {
    logger.error(
      `Usage: ${process.argv[1] ? path.basename(process.argv[1]) : "undefined"} <pageSize> [startingToken]`,
    );
    process.exit(1);
  }

  if (!process.argv[2]) {
    logger.error("[ERR] Missing page size");
    process.exit(1);
  }

  if (
    process.argv[2].length < validPageSizeMinLen ||
    process.argv[2].length > validPageSizeMaxLen ||
    !validPageSizeRegex.test(process.argv[2])
  ) {
    const logMessage = `[ERR] Invalid page size: ${process.argv[2]}`;
    logger.error(logMessage);
    throw new ValidationError(logMessage);
  }

  let startingToken: string | undefined;
  if (process.argv.length > validArgvLength && process.argv[3]) {
    if (
      process.argv[3].length < ValidWhitelistStartingTokenMinLen ||
      process.argv[3].length > ValidWhitelistStartingTokenMaxLen ||
      !ValidWhitelistStartingTokenRegex.test(process.argv[3])
    ) {
      const logMessage = `[ERR] Invalid starting token: ${process.argv[3]}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    startingToken = process.argv[3];
  }

  const pageSize: number = parseInt(process.argv[2]);

  const whitelistQueryService: IWhitelistQueryService = createWhitelistQueryService(logger);
  const merkleRootRecords: MerkleRootRecords = await whitelistQueryService.getMerkleRoots(
    pageSize,
    startingToken,
  );
  logger.info(`merkleRootRecords: ${JSON.stringify(merkleRootRecords)}`);
};

await main();
