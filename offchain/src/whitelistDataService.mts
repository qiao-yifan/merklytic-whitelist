import { Logger } from "@aws-lambda-powertools/logger";
import {
  ConditionalCheckFailedException,
  DuplicateItemException,
  DynamoDBServiceException,
  InternalServerError,
  InvalidEndpointException,
  ItemCollectionSizeLimitExceededException,
  ProvisionedThroughputExceededException,
  ReplicatedWriteConflictException,
  RequestLimitExceeded,
  ResourceNotFoundException,
  TransactionConflictException,
} from "@aws-sdk/client-dynamodb";
import { ScanCommandOutput } from "@aws-sdk/lib-dynamodb";
import { ZeroAddress } from "ethers";
import {
  IDynamoDbService,
  ValidPageSizeMax,
  ValidPageSizeMin,
  ValidPartitionKeyValueMaxLen,
  ValidPartitionKeyValueMinLen,
} from "./iDynamoDbService.mts";
import {
  MerkleProofRecord,
  MerkleRootRecord,
  MerkleRootRecords,
  ValidEvmAddressLen,
  ValidEvmAddressRegex,
  ValidWhitelistStartingTokenMaxLen,
  ValidWhitelistStartingTokenMinLen,
  ValidWhitelistStartingTokenRegex,
  WhitelistStatus,
} from "./iWhitelistApplicationService.mts";
import {
  IWhitelistDataService,
  MerkleProofItem,
  MerkleRootItem,
} from "./iWhitelistDataService.mts";
import { createDynamoDbService } from "./dynamoDbService.mts";
import { NoSqlError } from "./noSqlError.mts";
import { ValidationError } from "./validationError.mts";

const WhitelistProofsTableName = process.env["WHITELIST_DYNAMODB_PROOFS_TABLE_NAME"] ?? "";
if (WhitelistProofsTableName.trim().length < 1) {
  throw new ValidationError("Missing whitelist DynamoDB proofs table name");
}

const WhitelistRootsTableName = process.env["WHITELIST_DYNAMODB_ROOTS_TABLE_NAME"] ?? "";
if (WhitelistRootsTableName.trim().length < 1) {
  throw new ValidationError("Missing whitelist DynamoDB roots table name");
}

const WhitelistPartitionKeyName = "WhitelistName";
const WhitelistSortKeyName = "WhitelistAddress";

const createMerkleTree =
  (logger: Logger) =>
  async (
    whitelistName: string,
    merkleRoot: string,
    merkleProofRecords: MerkleProofRecord[],
  ): Promise<void> => {
    logger.info(
      `createMerkleTree: whitelistName=${whitelistName}, merkleRoot=${merkleRoot}, merkleProofRecords.length=${merkleProofRecords.length.toString()}`,
    );

    if (
      whitelistName.length < ValidPartitionKeyValueMinLen ||
      whitelistName.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid whitelist name: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const dynamoDbService: IDynamoDbService = createDynamoDbService(logger);

    try {
      await dynamoDbService.executeInsertStatement(
        WhitelistRootsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
        { MerkleRoot: merkleRoot, WhitelistStatus: WhitelistStatus.Creating },
      );
    } catch (err: unknown) {
      if (err instanceof ConditionalCheckFailedException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof DuplicateItemException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InternalServerError) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ItemCollectionSizeLimitExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ProvisionedThroughputExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof RequestLimitExceeded) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ResourceNotFoundException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof TransactionConflictException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof DynamoDBServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(
          err.name === "AccessDeniedException" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        noSqlError.name = err.name;

        throw noSqlError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }

    try {
      await dynamoDbService.batchInsertExecuteStatement(
        WhitelistProofsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
        merkleProofRecords,
      );
    } catch (err: unknown) {
      await dynamoDbService.putItem(
        WhitelistRootsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
        {
          MerkleRoot: merkleRoot,
          WhitelistStatus: WhitelistStatus.Failed,
        },
        "MerkleRoot = :merkleRoot AND WhitelistStatus = :whitelistStatus",
        {
          ":merkleRoot": merkleRoot,
          ":whitelistStatus": WhitelistStatus.Creating,
        },
      );

      if (err instanceof InternalServerError) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof RequestLimitExceeded) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof DynamoDBServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(
          err.name === "AccessDeniedException" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        noSqlError.name = err.name;

        throw noSqlError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }

    try {
      await dynamoDbService.putItem(
        WhitelistRootsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
        {
          MerkleRoot: merkleRoot,
          WhitelistStatus: WhitelistStatus.Completed,
        },
        "MerkleRoot = :merkleRoot AND WhitelistStatus = :whitelistStatus",
        {
          ":merkleRoot": merkleRoot,
          ":whitelistStatus": WhitelistStatus.Creating,
        },
      );
    } catch (err: unknown) {
      if (err instanceof ConditionalCheckFailedException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InternalServerError) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InvalidEndpointException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ItemCollectionSizeLimitExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ProvisionedThroughputExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ReplicatedWriteConflictException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof RequestLimitExceeded) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ResourceNotFoundException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof TransactionConflictException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof DynamoDBServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(
          err.name === "AccessDeniedException" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        noSqlError.name = err.name;

        throw noSqlError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }
  };

const deleteMerkleTree =
  (logger: Logger) =>
  async (whitelistName: string): Promise<void> => {
    logger.info(`deleteMerkleTree: whitelistName=${whitelistName}`);

    if (
      whitelistName.length < ValidPartitionKeyValueMinLen ||
      whitelistName.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid partition key value: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const dynamoDbService: IDynamoDbService = createDynamoDbService(logger);

    let merkleRootItem: MerkleRootItem | undefined;
    try {
      merkleRootItem = (await dynamoDbService.getItem(
        WhitelistRootsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
      )) as MerkleRootItem | undefined;
    } catch (err: unknown) {
      if (err instanceof InternalServerError) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InvalidEndpointException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ProvisionedThroughputExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof RequestLimitExceeded) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ResourceNotFoundException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof DynamoDBServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(
          err.name === "AccessDeniedException" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        noSqlError.name = err.name;

        throw noSqlError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }

    if (!merkleRootItem) {
      const logMessage = `[ERR] Merkle tree not found: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }
    if (
      merkleRootItem.WhitelistStatus != WhitelistStatus.Completed &&
      merkleRootItem.WhitelistStatus != WhitelistStatus.Failed
    ) {
      const logMessage = `[ERR] Merkle tree pending: ${merkleRootItem.WhitelistStatus}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    try {
      await dynamoDbService.putItem(
        WhitelistRootsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
        {
          MerkleRoot: merkleRootItem.MerkleRoot,
          WhitelistStatus: WhitelistStatus.Deleting,
        },
        "MerkleRoot = :merkleRoot AND (WhitelistStatus = :whitelistStatusCompleted OR WhitelistStatus = :whitelistStatusFailed)",
        {
          ":merkleRoot": merkleRootItem.MerkleRoot,
          ":whitelistStatusCompleted": WhitelistStatus.Completed,
          ":whitelistStatusFailed": WhitelistStatus.Failed,
        },
      );
    } catch (err: unknown) {
      if (err instanceof ConditionalCheckFailedException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InternalServerError) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InvalidEndpointException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ItemCollectionSizeLimitExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ProvisionedThroughputExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ReplicatedWriteConflictException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof RequestLimitExceeded) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ResourceNotFoundException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof TransactionConflictException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof DynamoDBServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(
          err.name === "AccessDeniedException" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        noSqlError.name = err.name;

        throw noSqlError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }

    try {
      const merkleProofItems: MerkleProofItem[] = (await dynamoDbService.paginatedQuery(
        WhitelistProofsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
      )) as MerkleProofItem[];

      const deleteSortKeys: string[] = merkleProofItems.map((item) => item.WhitelistAddress);
      await dynamoDbService.batchDeleteWrite(
        WhitelistProofsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
        "WhitelistAddress",
        deleteSortKeys,
      );

      await dynamoDbService.deleteItem(
        WhitelistRootsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
      );
    } catch (err: unknown) {
      await dynamoDbService.putItem(
        WhitelistRootsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
        {
          MerkleRoot: merkleRootItem.MerkleRoot,
          WhitelistStatus: WhitelistStatus.Failed,
        },
        "MerkleRoot = :merkleRoot AND WhitelistStatus = :whitelistStatus",
        {
          ":merkleRoot": merkleRootItem.MerkleRoot,
          ":whitelistStatus": WhitelistStatus.Deleting,
        },
      );

      if (err instanceof ConditionalCheckFailedException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InternalServerError) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InvalidEndpointException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ItemCollectionSizeLimitExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ProvisionedThroughputExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ReplicatedWriteConflictException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof RequestLimitExceeded) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ResourceNotFoundException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof TransactionConflictException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof DynamoDBServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(
          err.name === "AccessDeniedException" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        noSqlError.name = err.name;

        throw noSqlError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }
  };

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
      whitelistName.length < ValidPartitionKeyValueMinLen ||
      whitelistName.length > ValidPartitionKeyValueMaxLen
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

    const dynamoDbService: IDynamoDbService = createDynamoDbService(logger);

    let merkleRootItem: MerkleRootItem | undefined;
    try {
      merkleRootItem = (await dynamoDbService.getItem(
        WhitelistRootsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
      )) as MerkleRootItem | undefined;
    } catch (err: unknown) {
      if (err instanceof InternalServerError) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InvalidEndpointException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ProvisionedThroughputExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof RequestLimitExceeded) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ResourceNotFoundException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof DynamoDBServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(
          err.name === "AccessDeniedException" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        noSqlError.name = err.name;

        throw noSqlError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }

    if (!merkleRootItem) {
      const logMessage = `[ERR] Merkle tree not found: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }
    if (merkleRootItem.WhitelistStatus != WhitelistStatus.Completed) {
      const logMessage = `[ERR] Merkle tree not completed: ${merkleRootItem.WhitelistStatus}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    let merkleProofRecord: MerkleProofRecord | undefined;
    try {
      merkleProofRecord = (await dynamoDbService.getItem(
        WhitelistProofsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
        WhitelistSortKeyName,
        whitelistAddress,
      )) as MerkleProofRecord | undefined;
    } catch (err: unknown) {
      if (err instanceof InternalServerError) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InvalidEndpointException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ProvisionedThroughputExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof RequestLimitExceeded) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ResourceNotFoundException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof DynamoDBServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(
          err.name === "AccessDeniedException" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        noSqlError.name = err.name;

        throw noSqlError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }

    return merkleProofRecord;
  };

const getMerkleProofs =
  (logger: Logger) =>
  async (whitelistName: string): Promise<MerkleProofRecord[]> => {
    logger.info(`getMerkleProofs: whitelistName=${whitelistName}`);

    if (
      whitelistName.length < ValidPartitionKeyValueMinLen ||
      whitelistName.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid partition key value: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const dynamoDbService: IDynamoDbService = createDynamoDbService(logger);

    let merkleRootItem: MerkleRootItem | undefined;
    try {
      merkleRootItem = (await dynamoDbService.getItem(
        WhitelistRootsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
      )) as MerkleRootItem | undefined;
    } catch (err: unknown) {
      if (err instanceof InternalServerError) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InvalidEndpointException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ProvisionedThroughputExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof RequestLimitExceeded) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ResourceNotFoundException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof DynamoDBServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(
          err.name === "AccessDeniedException" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        noSqlError.name = err.name;

        throw noSqlError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }

    if (!merkleRootItem) {
      const logMessage = `[ERR] Merkle tree not found: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }
    if (merkleRootItem.WhitelistStatus != WhitelistStatus.Completed) {
      const logMessage = `[ERR] Merkle tree not completed: ${merkleRootItem.WhitelistStatus}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    try {
      const merkleProofRecords: MerkleProofRecord[] = (await dynamoDbService.paginatedQuery(
        WhitelistProofsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
      )) as MerkleProofRecord[];

      return merkleProofRecords;
    } catch (err: unknown) {
      if (err instanceof InternalServerError) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InvalidEndpointException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ProvisionedThroughputExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof RequestLimitExceeded) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ResourceNotFoundException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof DynamoDBServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(
          err.name === "AccessDeniedException" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        noSqlError.name = err.name;

        throw noSqlError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }
  };

const getMerkleRoot =
  (logger: Logger) =>
  async (whitelistName: string): Promise<MerkleRootRecord | undefined> => {
    logger.info(`getMerkleRoot: whitelistName=${whitelistName}`);

    if (
      whitelistName.length < ValidPartitionKeyValueMinLen ||
      whitelistName.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid whitelist name: ${whitelistName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const dynamoDbService: IDynamoDbService = createDynamoDbService(logger);

    let merkleRootRecord: MerkleRootRecord | undefined;
    try {
      merkleRootRecord = (await dynamoDbService.getItem(
        WhitelistRootsTableName,
        WhitelistPartitionKeyName,
        whitelistName,
      )) as MerkleRootRecord | undefined;
    } catch (err: unknown) {
      if (err instanceof InternalServerError) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InvalidEndpointException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ProvisionedThroughputExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof RequestLimitExceeded) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ResourceNotFoundException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof DynamoDBServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(
          err.name === "AccessDeniedException" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        noSqlError.name = err.name;

        throw noSqlError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }

    return merkleRootRecord;
  };

const getMerkleRoots =
  (logger: Logger) =>
  async (pageSize: number, startingToken?: string): Promise<MerkleRootRecords> => {
    logger.info(
      `getMerkleRoots: pageSize=${pageSize.toString()}, startingToken=${startingToken ?? "undefined"}`,
    );

    if (pageSize < ValidPageSizeMin || pageSize > ValidPageSizeMax) {
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

    const dynamoDbService: IDynamoDbService = createDynamoDbService(logger);

    let response: ScanCommandOutput;
    try {
      response = await dynamoDbService.scan(
        WhitelistRootsTableName,
        pageSize,
        startingToken
          ? {
              [WhitelistPartitionKeyName]: startingToken,
            }
          : undefined,
      );
    } catch (err: unknown) {
      if (err instanceof InternalServerError) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof InvalidEndpointException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ProvisionedThroughputExceededException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof RequestLimitExceeded) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof ResourceNotFoundException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(err.message, {
          cause: err,
        });
        noSqlError.name = err.name;

        throw noSqlError;
      }

      if (err instanceof DynamoDBServiceException) {
        const logMessage = `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`;
        logger.error(logMessage);

        const noSqlError = new NoSqlError(
          err.name === "AccessDeniedException" ? "Access denied" : err.message,
          {
            cause: err,
          },
        );
        noSqlError.name = err.name;

        throw noSqlError;
      }

      const logMessage =
        err instanceof Error
          ? `[ERR] name=${err.name}, message=${err.message}, stackTrace=${err.stack ?? "undefined"}`
          : `[ERR] err=${JSON.stringify(err)}`;
      logger.error(logMessage);

      throw err;
    }

    const merkleRoots = response.Items ? (response.Items as MerkleRootItem[]) : [];
    const lastEvaluatedKey: string | undefined = response.LastEvaluatedKey
      ? (response.LastEvaluatedKey[WhitelistPartitionKeyName] as string)
      : undefined;

    return {
      MerkleRoots: merkleRoots,
      LastEvaluatedKey: lastEvaluatedKey,
    };
  };

export const createWhitelistDataService = (logger: Logger): IWhitelistDataService => {
  return {
    createMerkleTree: createMerkleTree(logger),
    deleteMerkleTree: deleteMerkleTree(logger),
    getMerkleProof: getMerkleProof(logger),
    getMerkleProofs: getMerkleProofs(logger),
    getMerkleRoot: getMerkleRoot(logger),
    getMerkleRoots: getMerkleRoots(logger),
  };
};
