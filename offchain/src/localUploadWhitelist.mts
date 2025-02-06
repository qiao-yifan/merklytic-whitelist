import { Buffer } from "buffer";
import { readFile } from "fs/promises";
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

const validArgvLength = 4;

const logger: Logger = new Logger({ serviceName: "whitelistService" });

const main = async () => {
  if (process.argv.length !== validArgvLength) {
    logger.error(
      `Usage: ${process.argv[1] ? path.basename(process.argv[1]) : "undefined"} <whitelistName> <whitelistFilename>`,
    );
    process.exit(1);
  }

  if (process.argv[2] === undefined) {
    logger.error("[ERR] Missing whitelist name");
    process.exit(1);
  }

  if (process.argv[3] === undefined) {
    logger.error("[ERR] Missing whitelist file name");
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
  const whitelistFilename = process.argv[3];

  const whitelistContent: string = await readFile(whitelistFilename, "utf8");
  const whitelistBase64Content: string = Buffer.from(whitelistContent, "utf8").toString("base64");

  const whitelistCommandService: IWhitelistCommandService = createWhitelistCommandService(logger);
  await whitelistCommandService.uploadWhitelist(whitelistName, whitelistBase64Content);
};

await main();
