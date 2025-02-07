// SPDX-License-Identifier: Apache-2.0
pragma solidity =0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract MerkleTreeWhitelist is Ownable {
    bytes32 public merkleRoot;

    /**
     * @dev Emitted when the merkle root for future operations is modified.
     */
    event RootChange(bytes32 oldRoot, bytes32 newRoot);

    constructor(address initialOwner, bytes32 root) Ownable(initialOwner) {
        merkleRoot = root;
    }

    function updateRoot(bytes32 newRoot) external onlyOwner() {
        emit RootChange(merkleRoot, newRoot);

        merkleRoot = newRoot;
    }

    function isWhitelistedFor(
        address whitelistAddress,
        uint256 whitelistAmountWei,
        bytes32[] memory proof
    ) external view returns (bool) {
        require(whitelistAddress != address(0), "MTWL: zero address");

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(whitelistAddress, whitelistAmountWei))));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "MTWL: invalid proof");

        return true;
    }
}
