import { Logger } from "@aws-lambda-powertools/logger";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { HexString } from "@openzeppelin/merkle-tree/dist/bytes.js";
import { parse } from "csv-parse/sync";
import { ZeroAddress, getAddress, parseEther } from "ethers";
import { IS3Service } from "./iS3Service.mts";
import {
  MerkleProofRecord,
  MerkleRootRecord,
  ValidateWhitelistEntriesMaxCount,
  ValidEvmAddressLen,
  ValidEvmAddressRegex,
  ValidWhitelistAmountMaxLen,
  ValidWhitelistAmountMinLen,
  ValidWhitelistBase64ContentMaxLen,
  ValidWhitelistBase64ContentMinLen,
  ValidWhitelistNameMaxLen,
  ValidWhitelistNameMinLen,
  ValidWhitelistNameRegex,
} from "./iWhitelistApplicationService.mts";
import { IWhitelistCommandService, WhitelistEntry } from "./iWhitelistCommandService.mts";
import { IWhitelistDataService } from "./iWhitelistDataService.mts";
import { createS3Service } from "./s3Service.mts";
import { ValidationError } from "./validationError.mts";
import { createWhitelistDataService } from "./whitelistDataService.mts";

const whitelistS3BucketName = process.env["WHITELIST_S3_BUCKET_NAME"] ?? "";
if (whitelistS3BucketName.trim().length < 1) {
  throw new ValidationError("Missing whitelist S3 bucket name");
}

function getWhitelistKeyName(whitelistName: string) {
  return `${whitelistName}.csv`;
}

function hasDuplicateAddresses<T>(array: T[], propertyName: keyof T) {
  return (
    new Set(array.map((element) => getAddress(element[propertyName] as string))).size !==
    array.length
  );
}

const createMerkleTree =
  (logger: Logger) =>
  async (whitelistName: string): Promise<void> => {
    logger.info(`createMerkleTree: whitelistName=${whitelistName}`);

    if (
      whitelistName.length < ValidWhitelistNameMinLen ||
      whitelistName.length > ValidWhitelistNameMaxLen ||
      !ValidWhitelistNameRegex.test(whitelistName)
    ) {
      const logMessage = `[ERR] Invalid whitelist name: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const s3Service: IS3Service = createS3Service(logger);
    const whitelistContent: string | undefined = await s3Service.getObject(
      whitelistS3BucketName,
      getWhitelistKeyName(whitelistName),
    );
    if (!whitelistContent) {
      const logMessage = `[ERR] Whitelist not found: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const whitelistEntries: WhitelistEntry[] = parse(whitelistContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as WhitelistEntry[];

    logger.info(`createMerkleTree: whitelistEntries.length=${whitelistEntries.length.toString()}`);

    if (whitelistEntries.length > ValidateWhitelistEntriesMaxCount) {
      const logMessage = `[ERR] Number of whitelist entries exceed ${ValidateWhitelistEntriesMaxCount.toString()}: ${whitelistEntries.length.toString()}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    let whitelistEntriesLogMessage = "";
    const verified: boolean = whitelistEntries.every((element, index) => {
      logger.info(
        `${index.toString()}: WhitelistAddress=${element.WhitelistAddress}, WhitelistAmount=${element.WhitelistAmount}`,
      );

      if (
        element.WhitelistAddress.length !== ValidEvmAddressLen ||
        !ValidEvmAddressRegex.test(element.WhitelistAddress)
      ) {
        whitelistEntriesLogMessage = `[ERR] Invalid whitelist address at line ${index.toString()}: ${element.WhitelistAddress}`;
        logger.error(whitelistEntriesLogMessage);
        return false;
      }

      if (element.WhitelistAddress === ZeroAddress) {
        whitelistEntriesLogMessage = `[ERR] zero whitelist address at line ${index.toString()}: ${element.WhitelistAddress}`;
        logger.error(whitelistEntriesLogMessage);
        return false;
      }

      try {
        getAddress(element.WhitelistAddress);
      } catch (err: unknown) {
        const logMessage =
          err instanceof Error
            ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
            : `[ERR] err=${JSON.stringify(err)}`;
        logger.error(logMessage);

        whitelistEntriesLogMessage = `[ERR] Whitelist address invalid at line ${index.toString()}: ${element.WhitelistAddress}`;
        return false;
      }

      if (
        element.WhitelistAmount.length < ValidWhitelistAmountMinLen ||
        element.WhitelistAmount.length > ValidWhitelistAmountMaxLen
      ) {
        whitelistEntriesLogMessage = `[ERR] Invalid whitelist amount length at line ${index.toString()}: ${element.WhitelistAmount}`;
        logger.error(whitelistEntriesLogMessage);
        return false;
      }

      try {
        const whitelistAmountWei: bigint = parseEther(element.WhitelistAmount);
        if (whitelistAmountWei < 0) {
          whitelistEntriesLogMessage = `[ERR] Invalid whitelist amount value at line ${index.toString()}: ${element.WhitelistAmount}`;
          logger.error(whitelistEntriesLogMessage);
          return false;
        }
      } catch (err: unknown) {
        const logMessage =
          err instanceof Error
            ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
            : `[ERR] err=${JSON.stringify(err)}`;
        logger.error(logMessage);

        whitelistEntriesLogMessage = `[ERR] Whitelist amount value invalid at line ${index.toString()}: ${element.WhitelistAmount}`;
        return false;
      }

      return true;
    });

    if (!verified) {
      throw new ValidationError(whitelistEntriesLogMessage);
    }

    if (hasDuplicateAddresses<WhitelistEntry>(whitelistEntries, "WhitelistAddress")) {
      const logMessage = "[ERR] Duplicate whitelist address";
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const values: string[][] = whitelistEntries.map((element) => [
      getAddress(element.WhitelistAddress),
      parseEther(element.WhitelistAmount).toString(),
    ]);
    const tree: StandardMerkleTree<string[]> = StandardMerkleTree.of<string[]>(values, [
      "address",
      "uint256",
    ]);
    const root: string = tree.root;

    const proofs: MerkleProofRecord[] = [];
    for (const [index, value] of tree.entries()) {
      const proof: HexString[] = tree.getProof(index);
      proofs.push({
        MerkleProof: proof.toString(),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        WhitelistAddress: value[0]!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        WhitelistAmountWei: value[1]!,
      });
    }

    const whitelistDataService: IWhitelistDataService = createWhitelistDataService(logger);
    await whitelistDataService.createMerkleTree(whitelistName, root, proofs);
  };

const deleteMerkleTree =
  (logger: Logger) =>
  async (whitelistName: string): Promise<void> => {
    logger.info(`deleteMerkleTree: whitelistName=${whitelistName}`);

    if (
      whitelistName.length < ValidWhitelistNameMinLen ||
      whitelistName.length > ValidWhitelistNameMaxLen ||
      !ValidWhitelistNameRegex.test(whitelistName)
    ) {
      const logMessage = `[ERR] Invalid whitelist name: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const whitelistDataService: IWhitelistDataService = createWhitelistDataService(logger);
    await whitelistDataService.deleteMerkleTree(whitelistName);
  };

const deleteWhitelist =
  (logger: Logger) =>
  async (whitelistName: string): Promise<void> => {
    logger.info(`deleteWhitelist: whitelistName=${whitelistName}`);

    if (
      whitelistName.length < ValidWhitelistNameMinLen ||
      whitelistName.length > ValidWhitelistNameMaxLen ||
      !ValidWhitelistNameRegex.test(whitelistName)
    ) {
      const logMessage = `[ERR] Invalid whitelist name: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const whitelistDataService: IWhitelistDataService = createWhitelistDataService(logger);
    const merkleRootRecord: MerkleRootRecord | undefined =
      await whitelistDataService.getMerkleRoot(whitelistName);
    if (merkleRootRecord) {
      const logMessage = `[ERR] Merkle tree exists: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const s3Service: IS3Service = createS3Service(logger);
    await s3Service.deleteObject(whitelistS3BucketName, getWhitelistKeyName(whitelistName));
  };

const uploadWhitelist =
  (logger: Logger) =>
  async (whitelistName: string, base64Content: string): Promise<void> => {
    logger.info(
      `uploadWhitelist: whitelistName=${whitelistName}, base64Content.length=${base64Content.length.toString()}`,
    );

    if (
      whitelistName.length < ValidWhitelistNameMinLen ||
      whitelistName.length > ValidWhitelistNameMaxLen ||
      !ValidWhitelistNameRegex.test(whitelistName)
    ) {
      const logMessage = `[ERR] Invalid whitelist name: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      base64Content.length < ValidWhitelistBase64ContentMinLen ||
      base64Content.length > ValidWhitelistBase64ContentMaxLen
    ) {
      const logMessage = `[ERR] Invalid whitelist content: ${base64Content.length.toString()}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const s3Service: IS3Service = createS3Service(logger);
    await s3Service.multipartUpload(
      whitelistS3BucketName,
      getWhitelistKeyName(whitelistName),
      base64Content,
      "text/csv",
    );
  };

export const createWhitelistCommandService = (logger: Logger): IWhitelistCommandService => {
  return {
    createMerkleTree: createMerkleTree(logger),
    deleteMerkleTree: deleteMerkleTree(logger),
    deleteWhitelist: deleteWhitelist(logger),
    uploadWhitelist: uploadWhitelist(logger),
  };
};
