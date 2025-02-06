import {
  MerkleProofRecord,
  MerkleRootRecord,
  MerkleRootRecords,
} from "./iWhitelistApplicationService.mts";

export interface MerkleRootItem extends MerkleRootRecord {
  WhitelistName: string;
}

export interface MerkleProofItem extends MerkleProofRecord {
  WhitelistName: string;
}

export interface IWhitelistDataService {
  createMerkleTree(
    whitelistName: string,
    merkleRoot: string,
    merkleProofRecords: MerkleProofRecord[],
  ): Promise<void>;

  deleteMerkleTree(whitelistName: string): Promise<void>;

  getMerkleProof(
    whitelistName: string,
    whitelistAddress: string,
  ): Promise<MerkleProofRecord | undefined>;

  getMerkleProofs(whitelistName: string): Promise<MerkleProofRecord[]>;

  getMerkleRoot(whitelistName: string): Promise<MerkleRootRecord | undefined>;

  getMerkleRoots(pageSize: number, startingToken?: string): Promise<MerkleRootRecords>;
}
