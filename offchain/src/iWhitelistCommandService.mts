export interface WhitelistEntry {
  WhitelistAddress: string;
  WhitelistAmount: string;
}

export interface IWhitelistCommandService {
  createMerkleTree(whitelistName: string): Promise<void>;

  deleteMerkleTree(whitelistName: string): Promise<void>;

  deleteWhitelist(whitelistName: string): Promise<void>;

  uploadWhitelist(whitelistName: string, base64Content: string): Promise<void>;
}
