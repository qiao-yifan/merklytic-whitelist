import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchExecuteStatementCommand,
  BatchExecuteStatementCommandOutput,
  BatchWriteCommand,
  BatchWriteCommandOutput,
  DeleteCommand,
  DynamoDBDocumentClient,
  ExecuteStatementCommand,
  GetCommand,
  GetCommandOutput,
  NativeAttributeValue,
  PutCommand,
  ScanCommand,
  ScanCommandOutput,
  TransactWriteCommand,
  paginateQuery,
} from "@aws-sdk/lib-dynamodb";
import {
  IDynamoDbService,
  ValidPageSizeMax,
  ValidPageSizeMin,
  ValidPartitionKeyNameMaxLen,
  ValidPartitionKeyNameMinLen,
  ValidPartitionKeyNameRegex,
  ValidPartitionKeyValueMaxLen,
  ValidPartitionKeyValueMinLen,
  ValidSortKeyNameMaxLen,
  ValidSortKeyNameMinLen,
  ValidSortKeyNameRegex,
  ValidSortKeyValueMaxLen,
  ValidSortKeyValueMinLen,
  ValidTableNameMaxLen,
  ValidTableNameMinLen,
  ValidTableNameRegex,
} from "./iDynamoDbService.mts";
import { ValidationError } from "./validationError.mts";

interface BatchWriteDeleteRequest {
  DeleteRequest: {
    Key: Record<string, NativeAttributeValue>;
  };
}

interface BatchWritePutRequest {
  PutRequest: {
    Item: Record<string, NativeAttributeValue>;
  };
}

interface TransactWriteDeleteRequest {
  Delete: {
    Key: Record<string, NativeAttributeValue>;
    TableName: string;
    ConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, NativeAttributeValue>;
  };
}

interface TransactWritePutRequest {
  Put: {
    Item: Record<string, NativeAttributeValue>;
    TableName: string;
    ConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, NativeAttributeValue>;
  };
}

const BatchExecuteMaxItems = 25;
const BatchWriteDefaultExponentialFactor = 2;
const BatchWriteDefaultMaxRetries = 3;
const BatchWriteDefaultMinTimeoutMs = 10;
const BatchWriteMaxItems = 25;

const TransactWriteMaxItems = 100;

const dynamoDbClient: DynamoDBClient = new DynamoDBClient({});
const dynamoDbDocClient: DynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient);

function* chunkArray<T>(array: T[], stride = 1): Generator<T[], void, unknown> {
  for (let i = 0; i < array.length; i += stride) {
    yield array.slice(i, Math.min(i + stride, array.length));
  }
}

function waitMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const batchDeleteWrite =
  (logger: Logger) =>
  async (
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    sortKeyName: string,
    sortKeyValues: string[],
    maxRetries = BatchWriteDefaultMaxRetries,
  ): Promise<void> => {
    logger.info(
      `batchDeleteWrite: tableName=${tableName}, partitionKeyName=${partitionKeyName}, partitionKeyValue=${partitionKeyValue}, sortKeyName=${sortKeyName}, sortKeyValues.length=${sortKeyValues.length.toString()}, maxRetries=${maxRetries.toString()}`,
    );

    if (
      tableName.length < ValidTableNameMinLen ||
      tableName.length > ValidTableNameMaxLen ||
      !ValidTableNameRegex.test(tableName)
    ) {
      const logMessage = `[ERR] Invalid table name: ${tableName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyName.length < ValidPartitionKeyNameMinLen ||
      partitionKeyName.length > ValidPartitionKeyNameMaxLen ||
      !ValidPartitionKeyNameRegex.test(partitionKeyName)
    ) {
      const logMessage = `[ERR] Invalid partition key name: ${partitionKeyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyValue.length < ValidPartitionKeyValueMinLen ||
      partitionKeyValue.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid partition key value: ${partitionKeyValue}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      sortKeyName.length < ValidSortKeyNameMinLen ||
      sortKeyName.length > ValidSortKeyNameMaxLen ||
      !ValidSortKeyNameRegex.test(sortKeyName)
    ) {
      const logMessage = `[ERR] Invalid sort key name: ${sortKeyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (maxRetries < 0) {
      const logMessage = `[ERR] Max retries must be greater or equal to zero: ${maxRetries.toString()}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    let sortKeyValuesLogMessage = "";
    const sortKeyValuesValidated: boolean = sortKeyValues.every((element, index) => {
      if (element.length < ValidSortKeyValueMinLen || element.length > ValidSortKeyValueMaxLen) {
        sortKeyValuesLogMessage = `[ERR] Invalid sort key value at ${index.toString()}: ${element}`;
        logger.error(sortKeyValuesLogMessage);
        return false;
      }

      return true;
    });

    if (!sortKeyValuesValidated) {
      throw new ValidationError(sortKeyValuesLogMessage);
    }

    const sortKeyChunks: Generator<string[], void, unknown> = chunkArray(
      sortKeyValues,
      BatchWriteMaxItems,
    );

    for (const chunk of sortKeyChunks) {
      const deleteRequests: BatchWriteDeleteRequest[] = chunk.map((sortKeyValue) => ({
        DeleteRequest: {
          Key: { [partitionKeyName]: partitionKeyValue, [sortKeyName]: sortKeyValue },
        },
      }));

      let command = new BatchWriteCommand({
        RequestItems: {
          [tableName]: deleteRequests,
        },
      });

      let hasUnprocessedItems = false;
      let retryCount = 0;
      do {
        const response: BatchWriteCommandOutput = await dynamoDbDocClient.send(command);
        const unprocessedItems: BatchWriteDeleteRequest[] = response.UnprocessedItems?.[tableName]
          ? (response.UnprocessedItems[tableName] as BatchWriteDeleteRequest[])
          : [];

        logger.info(
          `batchDelete unprocessedItems [${retryCount.toString()}]: `,
          unprocessedItems.length.toString(),
        );

        hasUnprocessedItems = unprocessedItems.length > 0;
        if (hasUnprocessedItems) {
          command = new BatchWriteCommand({
            RequestItems: {
              [tableName]: unprocessedItems,
            },
          });
        }

        await waitMs(
          BatchWriteDefaultMinTimeoutMs * BatchWriteDefaultExponentialFactor ** retryCount++,
        );
      } while (hasUnprocessedItems && retryCount <= maxRetries);
    }
  };

const batchInsertExecuteStatement =
  (logger: Logger) =>
  async (
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    records: Record<string, NativeAttributeValue>[],
  ): Promise<void> => {
    logger.info(
      `batchInsertExecuteStatement: tableName=${tableName}, partitionKeyName=${partitionKeyName}, partitionKeyValue=${partitionKeyValue}, records.length=${records.length.toString()}`,
    );

    if (
      tableName.length < ValidTableNameMinLen ||
      tableName.length > ValidTableNameMaxLen ||
      !ValidTableNameRegex.test(tableName)
    ) {
      const logMessage = `[ERR] Invalid table name: ${tableName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyName.length < ValidPartitionKeyNameMinLen ||
      partitionKeyName.length > ValidPartitionKeyNameMaxLen ||
      !ValidPartitionKeyNameRegex.test(partitionKeyName)
    ) {
      const logMessage = `[ERR] Invalid partition key name: ${partitionKeyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyValue.length < ValidPartitionKeyValueMinLen ||
      partitionKeyValue.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid partition key value: ${partitionKeyValue}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const recordChunks: Generator<Record<string, NativeAttributeValue>[], void, unknown> =
      chunkArray(records, BatchExecuteMaxItems);
    for (const chunk of recordChunks) {
      const batchExecuteStatements = chunk.map((record) => {
        const item: Record<string, NativeAttributeValue> = {
          [partitionKeyName]: partitionKeyValue,
          ...record,
        };
        const itemAttributesExpression = Object.keys(item)
          .map((name) => `'${name}':?`)
          .join(",");
        return {
          Statement: `INSERT INTO ${tableName} value {${itemAttributesExpression}}`,
          Parameters: Object.values(item),
        };
      });
      batchExecuteStatements.forEach((statement, index) => {
        logger.info(`${index.toString()}: ${statement.Statement}`);
      });
      const command = new BatchExecuteStatementCommand({
        // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.insert.html
        Statements: batchExecuteStatements,
      });
      const response: BatchExecuteStatementCommandOutput = await dynamoDbDocClient.send(command);
      if (response.Responses && response.Responses.length > 0) {
        /*
        response.Responses.forEach((response, index) => {
          logger.info(
            `batchExecuteStatement response ${index.toString()}: ${JSON.stringify(response)}`,
          );
        });
        */

        const hasNoError: boolean = response.Responses.every((response) =>
          response.Error ? false : true,
        );
        if (!hasNoError) {
          const logMessage = `[ERR] batch execute statement command error: ${response.Responses.map((response) => (response.Error && response.Error.Message ? response.Error.Message : "")).join(", ")}`;
          logger.error(logMessage);
          throw new Error(logMessage);
        }
      }
    }
  };

const batchPutWrite =
  (logger: Logger) =>
  async (
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    records: Record<string, NativeAttributeValue>[],
    maxRetries = BatchWriteDefaultMaxRetries,
  ): Promise<void> => {
    logger.info(
      `batchPutWrite: tableName=${tableName}, partitionKeyName=${partitionKeyName}, partitionKeyValue=${partitionKeyValue}, records.lengths=${records.length.toString()}, maxRetries=${maxRetries.toString()}`,
    );

    if (
      tableName.length < ValidTableNameMinLen ||
      tableName.length > ValidTableNameMaxLen ||
      !ValidTableNameRegex.test(tableName)
    ) {
      const logMessage = `[ERR] Invalid table name: ${tableName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyName.length < ValidPartitionKeyNameMinLen ||
      partitionKeyName.length > ValidPartitionKeyNameMaxLen ||
      !ValidPartitionKeyNameRegex.test(partitionKeyName)
    ) {
      const logMessage = `[ERR] Invalid partition key name: ${partitionKeyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyValue.length < ValidPartitionKeyValueMinLen ||
      partitionKeyValue.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid partition key value: ${partitionKeyValue}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (maxRetries < 0) {
      const logMessage = `[ERR] Max retries must be greater or equal to zero: ${maxRetries.toString()}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const recordChunks: Generator<Record<string, NativeAttributeValue>[], void, unknown> =
      chunkArray(records, BatchWriteMaxItems);

    for (const chunk of recordChunks) {
      const putRequests: BatchWritePutRequest[] = chunk.map((record) => ({
        PutRequest: {
          Item: { [partitionKeyName]: partitionKeyValue, ...record },
        },
      }));

      let command = new BatchWriteCommand({
        RequestItems: {
          [tableName]: putRequests,
        },
      });

      let hasUnprocessedItems = false;
      let retryCount = 0;
      do {
        const response: BatchWriteCommandOutput = await dynamoDbDocClient.send(command);
        const unprocessedItems: BatchWritePutRequest[] = response.UnprocessedItems
          ? (response.UnprocessedItems[tableName] as BatchWritePutRequest[])
          : [];

        logger.info(
          `batchPut unprocessedItems [${retryCount.toString()}]: `,
          unprocessedItems.length.toString(),
        );

        hasUnprocessedItems = unprocessedItems.length > 0;
        if (hasUnprocessedItems) {
          command = new BatchWriteCommand({
            RequestItems: {
              [tableName]: unprocessedItems,
            },
          });
        }

        await waitMs(
          BatchWriteDefaultMinTimeoutMs * BatchWriteDefaultExponentialFactor ** retryCount++,
        );
      } while (hasUnprocessedItems && retryCount <= maxRetries);
    }
  };

const deleteItem =
  (logger: Logger) =>
  async (
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    sortKeyName?: string,
    sortKeyValue?: string,
  ): Promise<void> => {
    logger.info(
      `deleteItem: tableName=${tableName}, partitionKeyName=${partitionKeyName}, partitionKeyValue=${partitionKeyValue}, sortKeyName=${sortKeyName ?? "undefined"}, sortKeyValue=${sortKeyValue ?? "undefined"}`,
    );

    if (
      tableName.length < ValidTableNameMinLen ||
      tableName.length > ValidTableNameMaxLen ||
      !ValidTableNameRegex.test(tableName)
    ) {
      const logMessage = `[ERR] Invalid table name: ${tableName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyName.length < ValidPartitionKeyNameMinLen ||
      partitionKeyName.length > ValidPartitionKeyNameMaxLen ||
      !ValidPartitionKeyNameRegex.test(partitionKeyName)
    ) {
      const logMessage = `[ERR] Invalid partition key name: ${partitionKeyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyValue.length < ValidPartitionKeyValueMinLen ||
      partitionKeyValue.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid partition key value: ${partitionKeyValue}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (sortKeyName) {
      if (
        sortKeyName.length < ValidSortKeyNameMinLen ||
        sortKeyName.length > ValidSortKeyNameMaxLen ||
        !ValidSortKeyNameRegex.test(sortKeyName)
      ) {
        const logMessage = `[ERR] Invalid sort key name: ${sortKeyName}`;
        logger.error(logMessage);
        throw new ValidationError(logMessage);
      }

      if (!sortKeyValue) {
        const logMessage = "[ERR] Missing sort key value";
        logger.error(logMessage);
        throw new ValidationError(logMessage);
      }

      if (
        sortKeyValue.length < ValidSortKeyValueMinLen ||
        sortKeyValue.length > ValidSortKeyValueMaxLen
      ) {
        const logMessage = `[ERR] Invalid sort key value: ${sortKeyValue}`;
        logger.error(logMessage);
        throw new ValidationError(logMessage);
      }
    } else {
      if (sortKeyValue) {
        const logMessage = `[ERR] Unnecessary sort key value: ${sortKeyValue}`;
        logger.error(logMessage);
        throw new ValidationError(logMessage);
      }
    }

    const key: Record<string, NativeAttributeValue> = sortKeyName
      ? {
          [partitionKeyName]: partitionKeyValue,
          [sortKeyName]: sortKeyValue,
        }
      : {
          [partitionKeyName]: partitionKeyValue,
        };

    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
    });
    await dynamoDbDocClient.send(command);
  };

const executeInsertStatement =
  (logger: Logger) =>
  async (
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    record: Record<string, NativeAttributeValue[]>,
  ): Promise<void> => {
    logger.info(
      `executeInsertStatement: tableName=${tableName}, partitionKeyName=${partitionKeyName}, partitionKeyValue=${partitionKeyValue}, record=${JSON.stringify(record)}`,
    );

    if (
      tableName.length < ValidTableNameMinLen ||
      tableName.length > ValidTableNameMaxLen ||
      !ValidTableNameRegex.test(tableName)
    ) {
      const logMessage = `[ERR] Invalid table name: ${tableName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyName.length < ValidPartitionKeyNameMinLen ||
      partitionKeyName.length > ValidPartitionKeyNameMaxLen ||
      !ValidPartitionKeyNameRegex.test(partitionKeyName)
    ) {
      const logMessage = `[ERR] Invalid partition key name: ${partitionKeyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyValue.length < ValidPartitionKeyValueMinLen ||
      partitionKeyValue.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid partition key value: ${partitionKeyValue}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const item: Record<string, NativeAttributeValue> = {
      [partitionKeyName]: partitionKeyValue,
      ...record,
    };
    const itemAttributesExpression = Object.keys(item)
      .map((name) => `'${name}':?`)
      .join(",");
    const parameters = Object.values(item);

    /*
    parameters.forEach((parameter, index) => {
      logger.info(`executeStatement ${index.toString()}: ${typeof parameter}`);
    });
    logger.info(`executeStatement: itemAttributesExpression=${itemAttributesExpression}`);
    logger.info(`executeStatement: parameters=${JSON.stringify(parameters)}`);
    */

    const statement = {
      Statement: `INSERT INTO ${tableName} value {${itemAttributesExpression}}`,
      Parameters: parameters,
    };

    // logger.info(`executeStatement: statement=${statement.Statement}`);

    const command = new ExecuteStatementCommand(statement);
    await dynamoDbDocClient.send(command);
  };

const getItem =
  (logger: Logger) =>
  async (
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    sortKeyName?: string,
    sortKeyValue?: string,
  ): Promise<Record<string, NativeAttributeValue> | undefined> => {
    logger.info(
      `getItem: tableName=${tableName}, partitionKeyName=${partitionKeyName}, partitionKeyValue=${partitionKeyValue}, sortKeyName=${sortKeyName ?? "undefined"}, sortKeyValue=${sortKeyValue ?? "undefined"}`,
    );

    if (
      tableName.length < ValidTableNameMinLen ||
      tableName.length > ValidTableNameMaxLen ||
      !ValidTableNameRegex.test(tableName)
    ) {
      const logMessage = `[ERR] Invalid table name: ${tableName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyName.length < ValidPartitionKeyNameMinLen ||
      partitionKeyName.length > ValidPartitionKeyNameMaxLen ||
      !ValidPartitionKeyNameRegex.test(partitionKeyName)
    ) {
      const logMessage = `[ERR] Invalid partition key name: ${partitionKeyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyValue.length < ValidPartitionKeyValueMinLen ||
      partitionKeyValue.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid partition key value: ${partitionKeyValue}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (sortKeyName) {
      if (
        sortKeyName.length < ValidSortKeyNameMinLen ||
        sortKeyName.length > ValidSortKeyNameMaxLen ||
        !ValidSortKeyNameRegex.test(sortKeyName)
      ) {
        const logMessage = `[ERR] Invalid sort key name: ${sortKeyName}`;
        logger.error(logMessage);
        throw new ValidationError(logMessage);
      }

      if (!sortKeyValue) {
        const logMessage = "[ERR] Missing sort key value";
        logger.error(logMessage);
        throw new ValidationError(logMessage);
      }

      if (
        sortKeyValue.length < ValidSortKeyValueMinLen ||
        sortKeyValue.length > ValidSortKeyValueMaxLen
      ) {
        const logMessage = `[ERR] Invalid sort key value: ${sortKeyValue}`;
        logger.error(logMessage);
        throw new ValidationError(logMessage);
      }
    } else {
      if (sortKeyValue) {
        const logMessage = `[ERR] Unnecessary sort key value: ${sortKeyValue}`;
        logger.error(logMessage);
        throw new ValidationError(logMessage);
      }
    }

    const key: Record<string, NativeAttributeValue> = sortKeyName
      ? {
          [partitionKeyName]: partitionKeyValue,
          [sortKeyName]: sortKeyValue,
        }
      : {
          [partitionKeyName]: partitionKeyValue,
        };

    const command = new GetCommand({
      TableName: tableName,
      Key: key,
      // Set this to make sure that recent writes are reflected.
      // For more information, see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html.
      ConsistentRead: true,
    });
    const response: GetCommandOutput = await dynamoDbDocClient.send(command);
    return response.Item;
  };

const paginatedQuery =
  (logger: Logger) =>
  async (
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
  ): Promise<Record<string, NativeAttributeValue>[]> => {
    logger.info(
      `paginatedQuery: tableName=${tableName}, partitionKeyName=${partitionKeyName}, partitionKeyValue=${partitionKeyValue}`,
    );

    if (
      tableName.length < ValidTableNameMinLen ||
      tableName.length > ValidTableNameMaxLen ||
      !ValidTableNameRegex.test(tableName)
    ) {
      const logMessage = `[ERR] Invalid table name: ${tableName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyName.length < ValidPartitionKeyNameMinLen ||
      partitionKeyName.length > ValidPartitionKeyNameMaxLen ||
      !ValidPartitionKeyNameRegex.test(partitionKeyName)
    ) {
      const logMessage = `[ERR] Invalid partition key name: ${partitionKeyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyValue.length < ValidPartitionKeyValueMinLen ||
      partitionKeyValue.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid partition key value: ${partitionKeyValue}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const paginatedQuery = paginateQuery(
      { client: dynamoDbDocClient },
      {
        TableName: tableName,
        // For more information about query expressions, see
        // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#Query.KeyConditionExpressions
        KeyConditionExpression: "#partitionKeyName = :partitionKeyValue",
        ExpressionAttributeNames: { "#partitionKeyName": partitionKeyName },
        ExpressionAttributeValues: { ":partitionKeyValue": partitionKeyValue },
        ConsistentRead: true,
      },
    );

    const records: Record<string, NativeAttributeValue>[] = [];
    for await (const page of paginatedQuery) {
      if (page.Items) {
        records.push(...page.Items);
      }
    }

    logger.info("paginatedQuery records: ", records.length.toString());

    return records;
  };

const putItem =
  (logger: Logger) =>
  async (
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    record: Record<string, NativeAttributeValue>,
    conditionExpression?: string,
    expressionAttributeValues?: Record<string, NativeAttributeValue>,
  ): Promise<void> => {
    logger.info(
      `putItem: tableName=${tableName}, partitionKeyName=${partitionKeyName}, partitionKeyValue=${partitionKeyValue}, record=${JSON.stringify(record)}, conditionExpression=${conditionExpression ?? "undefined"}, expressionAttributeValues=${expressionAttributeValues ? JSON.stringify(expressionAttributeValues) : "undefined"}`,
    );

    if (
      tableName.length < ValidTableNameMinLen ||
      tableName.length > ValidTableNameMaxLen ||
      !ValidTableNameRegex.test(tableName)
    ) {
      const logMessage = `[ERR] Invalid table name: ${tableName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyName.length < ValidPartitionKeyNameMinLen ||
      partitionKeyName.length > ValidPartitionKeyNameMaxLen ||
      !ValidPartitionKeyNameRegex.test(partitionKeyName)
    ) {
      const logMessage = `[ERR] Invalid partition key name: ${partitionKeyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyValue.length < ValidPartitionKeyValueMinLen ||
      partitionKeyValue.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid partition key value: ${partitionKeyValue}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const command = new PutCommand({
      TableName: tableName,
      Item: { [partitionKeyName]: partitionKeyValue, ...record },
      ConditionExpression: conditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    });
    await dynamoDbDocClient.send(command);
  };

const scan =
  (logger: Logger) =>
  async (
    tableName: string,
    pageSize: number,
    startingToken?: Record<string, string>,
    filterExpression?: string,
    expressionAttributeValues?: Record<string, NativeAttributeValue>,
  ): Promise<ScanCommandOutput> => {
    logger.info(
      `paginatedQuery: tableName=${tableName}, pageSize=${pageSize.toString()}, startingToken=${startingToken ? JSON.stringify(startingToken) : "undefined"}`,
    );

    if (
      tableName.length < ValidTableNameMinLen ||
      tableName.length > ValidTableNameMaxLen ||
      !ValidTableNameRegex.test(tableName)
    ) {
      const logMessage = `[ERR] Invalid table name: ${tableName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

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

    const command = new ScanCommand({
      TableName: tableName,
      ConsistentRead: true,
      ExclusiveStartKey: startingToken,
      ExpressionAttributeValues: expressionAttributeValues,
      FilterExpression: filterExpression,
      Limit: pageSize,
    });
    const response: ScanCommandOutput = await dynamoDbDocClient.send(command);
    return response;
  };

const transactDeleteWrite =
  (logger: Logger) =>
  async (
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    sortKeyName: string,
    sortKeyValues: string[],
  ): Promise<void> => {
    logger.info(
      `transactDeleteWrite: tableName=${tableName}, partitionKeyName=${partitionKeyName}, partitionKeyValue=${partitionKeyValue}, sortKeyName=${sortKeyName}, sortKeyValues.length=${sortKeyValues.length.toString()}`,
    );

    if (
      tableName.length < ValidTableNameMinLen ||
      tableName.length > ValidTableNameMaxLen ||
      !ValidTableNameRegex.test(tableName)
    ) {
      const logMessage = `[ERR] Invalid table name: ${tableName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyName.length < ValidPartitionKeyNameMinLen ||
      partitionKeyName.length > ValidPartitionKeyNameMaxLen ||
      !ValidPartitionKeyNameRegex.test(partitionKeyName)
    ) {
      const logMessage = `[ERR] Invalid partition key name: ${partitionKeyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyValue.length < ValidPartitionKeyValueMinLen ||
      partitionKeyValue.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid partition key value: ${partitionKeyValue}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      sortKeyName.length < ValidSortKeyNameMinLen ||
      sortKeyName.length > ValidSortKeyNameMaxLen ||
      !ValidSortKeyNameRegex.test(sortKeyName)
    ) {
      const logMessage = `[ERR] Invalid sort key name: ${sortKeyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    let sortKeyValuesLogMessage = "";
    const verified: boolean = sortKeyValues.every((element, index) => {
      if (element.length < ValidSortKeyValueMinLen || element.length > ValidSortKeyValueMaxLen) {
        sortKeyValuesLogMessage = `[ERR] Invalid sort key value at ${index.toString()}: ${element}`;
        logger.error(sortKeyValuesLogMessage);
        return false;
      }

      return true;
    });

    if (!verified) {
      throw new ValidationError(sortKeyValuesLogMessage);
    }

    const recordChunks: Generator<string[], void, unknown> = chunkArray(
      sortKeyValues,
      TransactWriteMaxItems,
    );

    for (const chunk of recordChunks) {
      const deleteRequests: TransactWriteDeleteRequest[] = chunk.map((sortKeyValue) => ({
        Delete: {
          TableName: tableName,
          Key: {
            [partitionKeyName]: partitionKeyValue,
            [sortKeyName]: sortKeyValue,
          },
        },
      }));

      const command = new TransactWriteCommand({
        TransactItems: deleteRequests,
      });

      await dynamoDbDocClient.send(command);
    }
  };

const transactInsertWrite =
  (logger: Logger) =>
  async (
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    sortKeyName: string,
    records: Record<string, NativeAttributeValue>[],
  ): Promise<void> => {
    logger.info(
      `transactInsertWrite: tableName=${tableName}, partitionKeyName=${partitionKeyName}, partitionKeyValue=${partitionKeyValue}, sortKeyName=${sortKeyName}, records.length=${records.length.toString()}`,
    );

    if (
      tableName.length < ValidTableNameMinLen ||
      tableName.length > ValidTableNameMaxLen ||
      !ValidTableNameRegex.test(tableName)
    ) {
      const logMessage = `[ERR] Invalid table name: ${tableName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyName.length < ValidPartitionKeyNameMinLen ||
      partitionKeyName.length > ValidPartitionKeyNameMaxLen ||
      !ValidPartitionKeyNameRegex.test(partitionKeyName)
    ) {
      const logMessage = `[ERR] Invalid partition key name: ${partitionKeyName}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    if (
      partitionKeyValue.length < ValidPartitionKeyValueMinLen ||
      partitionKeyValue.length > ValidPartitionKeyValueMaxLen
    ) {
      const logMessage = `[ERR] Invalid partition key value: ${partitionKeyValue}`;
      logger.error(logMessage);
      throw new ValidationError(logMessage);
    }

    const recordChunks: Generator<Record<string, NativeAttributeValue>[], void, unknown> =
      chunkArray(records, TransactWriteMaxItems);

    for (const chunk of recordChunks) {
      const putRequests: TransactWritePutRequest[] = chunk.map((record) => ({
        Put: {
          Item: { [partitionKeyName]: partitionKeyValue, ...record },
          TableName: tableName,
          ConditionExpression:
            "#partitionKeyName <> :partitionKeyValue || #sortKeyName <> :sortKeyValue",
          ExpressionAttributeNames: {
            "#partitionKeyName": partitionKeyName,
            "#sortKeyName": sortKeyName,
          },
          ExpressionAttributeValues: {
            ":partitionKeyValue": partitionKeyValue,
            ":sortKeyValue": record[sortKeyName] as string,
          },
        },
      }));

      const command = new TransactWriteCommand({
        TransactItems: putRequests,
      });

      await dynamoDbDocClient.send(command);
    }
  };

export const createDynamoDbService = (logger: Logger): IDynamoDbService => {
  return {
    batchDeleteWrite: batchDeleteWrite(logger),
    batchInsertExecuteStatement: batchInsertExecuteStatement(logger),
    batchPutWrite: batchPutWrite(logger),
    deleteItem: deleteItem(logger),
    executeInsertStatement: executeInsertStatement(logger),
    getItem: getItem(logger),
    paginatedQuery: paginatedQuery(logger),
    putItem: putItem(logger),
    scan: scan(logger),
    transactDeleteWrite: transactDeleteWrite(logger),
    transactInsertWrite: transactInsertWrite(logger),
  };
};
