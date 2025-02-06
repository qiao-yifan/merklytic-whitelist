import {
  ValidPageSizeMax,
  ValidPageSizeMin,
  ValidPartitionKeyValueMaxLen,
  ValidPartitionKeyValueMinLen,
} from "./iDynamoDbService.mts";
import { MerkleRootItem } from "./iWhitelistDataService.mts";

export const ValidEvmAddressLen = 42;
export const ValidEvmAddressRegex = /^(0x|0X)[0-9A-Fa-f]{40}$/;

export const ValidWhitelistAmountMaxLen = 30;
export const ValidWhitelistAmountMinLen = 1;

export const ValidWhitelistBase64ContentMaxLen = 10485760;
export const ValidWhitelistBase64ContentMinLen = 4;

export const ValidateWhitelistEntriesMaxCount = 100000;

export const ValidWhitelistNameMaxLen = ValidPartitionKeyValueMaxLen;
export const ValidWhitelistNameMinLen = ValidPartitionKeyValueMinLen;
export const ValidWhitelistNameRegex = /^[A-Za-z][0-9A-Za-z_-]*$/;

export const ValidWhitelistPageSizeMax = ValidPageSizeMax;
export const ValidWhitelistPageSizeMin = ValidPageSizeMin;

export const ValidWhitelistStartingTokenMaxLen = ValidWhitelistNameMaxLen;
export const ValidWhitelistStartingTokenMinLen = ValidWhitelistNameMinLen;
export const ValidWhitelistStartingTokenRegex = ValidWhitelistNameRegex;

export enum WhitelistStatus {
  Completed = "COMPLETED",
  Creating = "CREATING",
  Deleting = "DELETING",
  Failed = "FAILED",
}

export interface MerkleProofRecord {
  MerkleProof: string;
  WhitelistAddress: string;
  WhitelistAmountWei: string;
}

export interface MerkleRootRecord {
  MerkleRoot: string;
  WhitelistStatus: WhitelistStatus;
}

export interface MerkleRootRecords {
  MerkleRoots: MerkleRootItem[];
  LastEvaluatedKey: string | undefined;
}

export interface MerkleTreeRecord {
  WhitelistName: string;
}

export interface MerkleTreeRecords {
  MerkleTrees: MerkleTreeRecord[];
  LastEvaluatedKey: string | undefined;
}
