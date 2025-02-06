import { Logger } from "@aws-lambda-powertools/logger";
import { ZeroAddress, getAddress } from "ethers";
import {
  MerkleProofRecord,
  MerkleRootRecord,
  MerkleRootRecords,
  MerkleTreeRecords,
  ValidEvmAddressLen,
  ValidEvmAddressRegex,
  ValidWhitelistNameMaxLen,
  ValidWhitelistNameMinLen,
  ValidWhitelistNameRegex,
  ValidWhitelistPageSizeMax,
  ValidWhitelistPageSizeMin,
  ValidWhitelistStartingTokenMaxLen,
  ValidWhitelistStartingTokenMinLen,
  ValidWhitelistStartingTokenRegex,
  WhitelistStatus,
} from "./iWhitelistApplicationService.mts";
import { IWhitelistDataService } from "./iWhitelistDataService.mts";
import { IWhitelistQueryService } from "./iWhitelistQueryService.mts";
import { ValidationError } from "./validationError.mts";
import { createWhitelistDataService } from "./whitelistDataService.mts";

const getMerkleProof =
  (logger: Logger) =>
  async (
    whitelistName: string,
    whitelistAddress: string,
  ): Promise<MerkleProofRecord | undefined> => {
    logger.info(
      `getMerkleProof: whitelistName=${whitelistName}, whitelistAddress=${whitelistAddress}`,
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
      whitelistAddress.length !== ValidEvmAddressLen ||
      !ValidEvmAddressRegex.test(whitelistAddress)
    ) {
      const logMessage = `[ERR] Invalid whitelist address: ${whitelistAddress}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (whitelistAddress === ZeroAddress) {
      const logMessage = `[ERR] zero whitelist address: ${whitelistAddress}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    let normalizedAddress: string;
    try {
      normalizedAddress = getAddress(whitelistAddress);
    } catch (err: unknown) {
      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw new ValidationError(`[ERR] Whitelist address invalid: ${whitelistAddress}`);
    }

    const whitelistDataService: IWhitelistDataService = createWhitelistDataService(logger);

    const merkleRootRecord: MerkleRootRecord | undefined =
      await whitelistDataService.getMerkleRoot(whitelistName);
    if (!merkleRootRecord) {
      const logMessage = `[ERR] Merkle tree not found: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }
    if (merkleRootRecord.WhitelistStatus != WhitelistStatus.Completed) {
      const logMessage = `[ERR] Merkle tree not ready: ${merkleRootRecord.WhitelistStatus.toString()}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const merkleProofRecord: MerkleProofRecord | undefined =
      await whitelistDataService.getMerkleProof(whitelistName, normalizedAddress);

    return merkleProofRecord;
  };

const getMerkleProofs =
  (logger: Logger) =>
  async (whitelistName: string): Promise<MerkleProofRecord[]> => {
    logger.info(`getMerkleProofs: whitelistName=${whitelistName}`);

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
    const merkleProofRecords: MerkleProofRecord[] =
      await whitelistDataService.getMerkleProofs(whitelistName);

    return merkleProofRecords;
  };

const getMerkleRoot =
  (logger: Logger) =>
  async (whitelistName: string): Promise<MerkleRootRecord | undefined> => {
    logger.info(`getMerkleRoot: whitelistName=${whitelistName}`);

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

    return merkleRootRecord;
  };

const getMerkleRoots =
  (logger: Logger) =>
  async (pageSize: number, startingToken?: string): Promise<MerkleRootRecords> => {
    logger.info(
      `getMerkleRoots: pageSize=${pageSize.toString()}, startingToken=${startingToken ?? "undefined"}`,
    );

    if (pageSize < ValidWhitelistPageSizeMin || pageSize > ValidWhitelistPageSizeMax) {
      const logMessage = `[ERR] Invalid page size: ${pageSize.toString()}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (!Number.isInteger(pageSize)) {
      const logMessage = `[ERR] Page size must be integer: ${pageSize.toString()}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (startingToken) {
      if (
        startingToken.length < ValidWhitelistStartingTokenMinLen ||
        startingToken.length > ValidWhitelistStartingTokenMaxLen ||
        !ValidWhitelistStartingTokenRegex.test(startingToken)
      ) {
        const logMessage = `[ERR] Invalid starting token: ${startingToken}`;
        logger.error(logMessage);
        throw new ValidationError(logMessage);
      }
    }

    const whitelistDataService: IWhitelistDataService = createWhitelistDataService(logger);
    const merkleRootRecords: MerkleRootRecords = await whitelistDataService.getMerkleRoots(
      pageSize,
      startingToken,
    );

    return merkleRootRecords;
  };

const getMerkleTrees =
  (logger: Logger) =>
  async (pageSize: number, startingToken?: string): Promise<MerkleTreeRecords> => {
    logger.info(
      `getMerkleTrees: pageSize=${pageSize.toString()}, startingToken=${startingToken ?? "undefined"}`,
    );

    if (pageSize < ValidWhitelistPageSizeMin || pageSize > ValidWhitelistPageSizeMax) {
      const logMessage = `[ERR] Invalid page size: ${pageSize.toString()}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (!Number.isInteger(pageSize)) {
      const logMessage = `[ERR] Page size must be integer: ${pageSize.toString()}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (startingToken) {
      if (
        startingToken.length < ValidWhitelistStartingTokenMinLen ||
        startingToken.length > ValidWhitelistStartingTokenMaxLen ||
        !ValidWhitelistStartingTokenRegex.test(startingToken)
      ) {
        const logMessage = `[ERR] Invalid starting token: ${startingToken}`;
        logger.error(logMessage);
        throw new ValidationError(logMessage);
      }
    }

    const whitelistDataService: IWhitelistDataService = createWhitelistDataService(logger);
    const merkleRootRecords: MerkleRootRecords = await whitelistDataService.getMerkleRoots(
      pageSize,
      startingToken,
    );

    const merkleTreeRecords: MerkleTreeRecords = {
      MerkleTrees: merkleRootRecords.MerkleRoots.map((merkleRoot) => {
        return { WhitelistName: merkleRoot.WhitelistName };
      }),
      LastEvaluatedKey: merkleRootRecords.LastEvaluatedKey,
    };
    return merkleTreeRecords;
  };

export const createWhitelistQueryService = (logger: Logger): IWhitelistQueryService => {
  return {
    getMerkleProof: getMerkleProof(logger),
    getMerkleProofs: getMerkleProofs(logger),
    getMerkleRoot: getMerkleRoot(logger),
    getMerkleRoots: getMerkleRoots(logger),
    getMerkleTrees: getMerkleTrees(logger),
  };
};
