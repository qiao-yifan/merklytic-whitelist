import path from "path";
import { Logger } from "@aws-lambda-powertools/logger";
import "dotenv/config";
import {
  ValidWhitelistNameMaxLen,
  ValidWhitelistNameMinLen,
  ValidWhitelistNameRegex,
} from "./iWhitelistApplicationService.mts";
import { IWhitelistCommandService } from "./iWhitelistCommandService.mts";
import { ValidationError } from "./validationError.mts";
import { createWhitelistCommandService } from "./whitelistCommandService.mts";

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

  const whitelistCommandService: IWhitelistCommandService = createWhitelistCommandService(logger);
  await whitelistCommandService.deleteWhitelist(whitelistName);
};

await main();
