import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("MerkleTreeWhitelist", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployMerkleTreeWhitelistFixture() {
    const merkleRoot =
      "0x67063f96b1592f043a1e7998ffec6a4b984a6511566585f51bb418d9ead0578b";
    const merkleProofs = [
      {
        proof: [
          "0x079f6dbc66bf225bbf74af970ec855b0bc1d0717b98f7ccc49429523230c0f3a",
          "0x8fca9c4aa56f15a12b252f1bafbbb3b0f6f47c446f50afcd7821b7bd4a103054",
          "0x49e29e71bc8db42b06dd633099c6caa1b492f8d53326ee5d625a14c9ef2d557c",
        ],
        whitelistAddress: "0xd31FE45F219963F58A7B380dA710646858F48031",
        whitelistAmount: hre.ethers.parseEther("6666.67"),
      },
      {
        proof: [
          "0x44141ee35027f7b42644315ea4da336bf201261911260880fbe8eba6784a333a",
          "0x17f2865fdf204ab017540cdd07d851c46fa0aa1618fe00b5ed8cebf31fa0fe0b",
        ],
        whitelistAddress: "0x9F2e3fc83077d042f9CB8Ce8cd78f9eD031eBa16",
        whitelistAmount: hre.ethers.parseEther("1250"),
      },
      {
        proof: [
          "0x8a39ecb656b1701d0e580b977ed99d7f5d218044f1d69703bbb107686dca535e",
          "0x17f2865fdf204ab017540cdd07d851c46fa0aa1618fe00b5ed8cebf31fa0fe0b",
        ],
        whitelistAddress: "0x9833B846628D174921D81255d6be016157447cAE",
        whitelistAmount: hre.ethers.parseEther("53228.051486152399030389"),
      },
      {
        proof: [
          "0xcb6b03562e508d3c50e99dcf241bdb843227569858cf082b080e7e3c1ee985cf",
          "0x49e29e71bc8db42b06dd633099c6caa1b492f8d53326ee5d625a14c9ef2d557c",
        ],
        whitelistAddress: "0xE1F3Ef67355d81885A55C22f3ECfa2826a1C1B3d",
        whitelistAmount: hre.ethers.parseEther("1250.00"),
      },
      {
        proof: [
          "0x09a88bdaa0460494395062b1da833775fab1c78839c4c6d05b89e30b96ec2986",
          "0x8fca9c4aa56f15a12b252f1bafbbb3b0f6f47c446f50afcd7821b7bd4a103054",
          "0x49e29e71bc8db42b06dd633099c6caa1b492f8d53326ee5d625a14c9ef2d557c",
        ],
        whitelistAddress: "0xbB08678DF8e0808ba17b880978C4Af6e6eEe6722",
        whitelistAmount: hre.ethers.parseEther("16023.916666666666666667"),
      },
    ];

    // Contracts are deployed using the first signer/account by default
    const [owner, ...otherAccounts] = await hre.ethers.getSigners();

    const whitelistFactory = await hre.ethers.getContractFactory(
      "MerkleTreeWhitelist"
    );
    const whitelistInstance = await whitelistFactory.deploy(owner, merkleRoot);

    return {
      whitelistInstance,
      merkleProofs,
      merkleRoot,
      owner,
      otherAccounts,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct owner and Merkle root", async function () {
      const { whitelistInstance, merkleRoot, owner } = await loadFixture(
        deployMerkleTreeWhitelistFixture
      );

      expect(await whitelistInstance.merkleRoot()).to.equal(merkleRoot);
      expect(await whitelistInstance.owner()).to.equal(owner);
    });
  });

  describe("Maintenance", function () {
    it("Should revert with the right error if update root by non-owner", async function () {
      const { whitelistInstance, otherAccounts } = await loadFixture(
        deployMerkleTreeWhitelistFixture
      );

      const newRoot =
        "0x52ed22948e504f232f8ff26393b7e9a9291140d8928d22010606a1213c888fef";
      const nonOwner = otherAccounts[0];

      await expect(
        whitelistInstance.connect(nonOwner).updateRoot(newRoot)
      ).to.be.revertedWithCustomError(
        whitelistInstance,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should set the correct Merkle root if update root by owner", async function () {
      const { whitelistInstance, merkleRoot } = await loadFixture(
        deployMerkleTreeWhitelistFixture
      );

      const newRoot =
        "0x52ed22948e504f232f8ff26393b7e9a9291140d8928d22010606a1213c888fef";

      await expect(whitelistInstance.updateRoot(newRoot))
        .to.emit(whitelistInstance, "RootChange")
        .withArgs(merkleRoot, newRoot);

      expect(await whitelistInstance.merkleRoot()).to.equal(newRoot);
    });
  });

  describe("Verifications", function () {
    it("Should revert with the right error if called with zero address", async function () {
      const { whitelistInstance } = await loadFixture(
        deployMerkleTreeWhitelistFixture
      );

      const proof = [
        "0x15b0f63982b8a79419108ea9e159481208a6ee3395a4dd05eda36a05350d4aea",
      ];
      const whitelistAddress = hre.ethers.ZeroAddress;
      const whitelistAmount = 0n;

      await expect(
        whitelistInstance.isWhitelistedFor(
          whitelistAddress,
          whitelistAmount,
          proof
        )
      ).to.be.revertedWith("MTWL: zero address");
    });

    it("Should revert with the right error if called with non-existent proof", async function () {
      const { whitelistInstance } = await loadFixture(
        deployMerkleTreeWhitelistFixture
      );

      const proof = [
        "0x49e29e71bc8db42b06dd633099c6caa1b492f8d53326ee5d625a14c9ef2d557c",
        "0x079f6dbc66bf225bbf74af970ec855b0bc1d0717b98f7ccc49429523230c0f3a",
      ];
      const whitelistAddress = "0xA798712B59C11FAec69808E38A0a4C68c43Aae00";
      const whitelistAmount: bigint = hre.ethers.parseEther(
        "39097.850733011542169216"
      );

      await expect(
        whitelistInstance.isWhitelistedFor(
          whitelistAddress,
          whitelistAmount,
          proof
        )
      ).to.be.revertedWith("MTWL: invalid proof");
    });

    it("Should revert with the right error if called with existing proof not corresponding to whitelist address and amount", async function () {
      const { whitelistInstance, merkleProofs } = await loadFixture(
        deployMerkleTreeWhitelistFixture
      );

      await expect(
        whitelistInstance.isWhitelistedFor(
          merkleProofs[1].whitelistAddress,
          merkleProofs[1].whitelistAmount,
          merkleProofs[0].proof
        )
      ).to.be.revertedWith("MTWL: invalid proof");
    });

    it("Should revert with the right error if called with existing proof not corresponding to whitelist address", async function () {
      const { whitelistInstance, merkleProofs } = await loadFixture(
        deployMerkleTreeWhitelistFixture
      );

      await expect(
        whitelistInstance.isWhitelistedFor(
          merkleProofs[2].whitelistAddress,
          merkleProofs[1].whitelistAmount,
          merkleProofs[1].proof
        )
      ).to.be.revertedWith("MTWL: invalid proof");
    });

    it("Should revert with the right error if called with existing proof not corresponding to whitelist amount", async function () {
      const { whitelistInstance, merkleProofs } = await loadFixture(
        deployMerkleTreeWhitelistFixture
      );

      await expect(
        whitelistInstance.isWhitelistedFor(
          merkleProofs[2].whitelistAddress,
          merkleProofs[3].whitelistAmount,
          merkleProofs[2].proof
        )
      ).to.be.revertedWith("MTWL: invalid proof");
    });

    it("Should return true if called with existing proof corresponding to whitelist address and amount", async function () {
      const { whitelistInstance, merkleProofs } = await loadFixture(
        deployMerkleTreeWhitelistFixture
      );

      for (const element of merkleProofs) {
        expect(
          await whitelistInstance.isWhitelistedFor(
            element.whitelistAddress,
            element.whitelistAmount,
            element.proof
          )
        ).to.equal(true);
      }
    });
  });
});
