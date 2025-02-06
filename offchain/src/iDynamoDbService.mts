import { NativeAttributeValue, ScanCommandOutput } from "@aws-sdk/lib-dynamodb";

export const ValidPageSizeMax = 1000;
export const ValidPageSizeMin = 1;

export const ValidPartitionKeyNameMaxLen = 255;
export const ValidPartitionKeyNameMinLen = 3;
export const ValidPartitionKeyNameRegex = /^[0-9A-Za-z_\-.]+$/;

export const ValidPartitionKeyValueMaxLen = 1024;
export const ValidPartitionKeyValueMinLen = 1;

export const ValidSortKeyNameMaxLen = 255;
export const ValidSortKeyNameMinLen = 3;
export const ValidSortKeyNameRegex = /^[0-9A-Za-z_\-.]+$/;

export const ValidSortKeyValueMaxLen = 1024;
export const ValidSortKeyValueMinLen = 1;

export const ValidTableNameMaxLen = 255;
export const ValidTableNameMinLen = 3;
export const ValidTableNameRegex = /^[0-9A-Za-z_\-.]+$/;

export interface IDynamoDbService {
  batchDeleteWrite(
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    sortKeyName: string,
    sortKeyValues: string[],
    maxRetries?: number,
  ): Promise<void>;

  batchInsertExecuteStatement(
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    records: Record<string, NativeAttributeValue>[],
  ): Promise<void>;

  batchPutWrite(
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    records: Record<string, NativeAttributeValue>[],
    maxRetries?: number,
  ): Promise<void>;

  deleteItem(
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    sortKeyName?: string,
    sortKeyValue?: string,
  ): Promise<void>;

  executeInsertStatement(
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    record: Record<string, NativeAttributeValue>,
  ): Promise<void>;

  getItem(
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    sortKeyName?: string,
    sortKeyValue?: string,
  ): Promise<Record<string, NativeAttributeValue> | undefined>;

  paginatedQuery(
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
  ): Promise<Record<string, NativeAttributeValue>[]>;

  putItem(
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    record: Record<string, NativeAttributeValue>,
    conditionExpression?: string,
    expressionAttributeValues?: Record<string, NativeAttributeValue>,
  ): Promise<void>;

  scan(
    tableName: string,
    pageSize: number,
    startingToken?: Record<string, string>,
    filterExpression?: string,
    expressionAttributeValues?: Record<string, NativeAttributeValue>,
  ): Promise<ScanCommandOutput>;

  transactDeleteWrite(
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    sortKeyName: string,
    sortKeyValues: string[],
  ): Promise<void>;

  transactInsertWrite(
    tableName: string,
    partitionKeyName: string,
    partitionKeyValue: string,
    sortKeyName: string,
    records: Record<string, NativeAttributeValue>[],
  ): Promise<void>;
}
