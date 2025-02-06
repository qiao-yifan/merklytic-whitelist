import {
  MerkleProofRecord,
  MerkleRootRecord,
  MerkleRootRecords,
  MerkleTreeRecords,
} from "./iWhitelistApplicationService.mts";

export interface IWhitelistQueryService {
  getMerkleProof(
    whitelistName: string,
    whitelistAddress: string,
  ): Promise<MerkleProofRecord | undefined>;

  getMerkleProofs(whitelistName: string): Promise<MerkleProofRecord[]>;

  getMerkleRoot(whitelistName: string): Promise<MerkleRootRecord | undefined>;

  getMerkleRoots(pageSize: number, startingToken?: string): Promise<MerkleRootRecords>;

  getMerkleTrees(pageSize: number, startingToken?: string): Promise<MerkleTreeRecords>;
}
