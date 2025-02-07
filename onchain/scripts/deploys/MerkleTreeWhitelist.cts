import hre from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  getNumberOfConfirmations,
  verifyContractCode,
} from "./deploy-helpers.cts";
const { ethers, network } = hre;

async function main() {
  const contractName = "MerkleTreeWhitelist";

  const networkName = network.name;
  console.log("Network:", networkName);

  const verifyContract =
    process.env.VERIFY_CONTRACT !== undefined &&
    process.env.VERIFY_CONTRACT.toLowerCase() === "true";
  console.log("VerifyContract:", verifyContract);

  const merkleRoot = process.env.MERKLE_TREE_WHITELIST_MERKLE_ROOT;
  if (!merkleRoot) {
    throw new Error("Merkle root is required");
  }
  console.log("MerkleRoot:", merkleRoot);

  const initialOwnerAddress = network.config.from;
  if (!initialOwnerAddress) {
    throw new Error(`No 'from' for network ${networkName} in hardhat.config`);
  }
  console.log("InitialOwnerAddress:", initialOwnerAddress);

  const signer: HardhatEthersSigner = await ethers.getSigner(
    initialOwnerAddress
  );

  const contractFactory = await ethers.getContractFactory(contractName, signer);
  const contractInstance = await contractFactory.deploy(
    initialOwnerAddress,
    merkleRoot
  );

  console.log(
    `Deploying ${contractName} with initial owner ${initialOwnerAddress} and Merkle root ${merkleRoot} ...`
  );

  const deployedContract = await contractInstance.waitForDeployment();
  const deployedAddress = await deployedContract.getAddress();

  const deploymentTransaction = contractInstance.deploymentTransaction();
  if (deploymentTransaction) {
    const numberOfConfirmations = getNumberOfConfirmations(
      deploymentTransaction.chainId
    );

    console.log(
      `Waiting for ${numberOfConfirmations.toString()} confirmations ...`
    );

    await deploymentTransaction.wait(numberOfConfirmations);
  }

  console.log(
    `${contractName} with initial owner ${initialOwnerAddress} and Merkle root ${merkleRoot} deployed to ${deployedAddress}`
  );

  if (verifyContract) {
    await verifyContractCode(networkName, deployedAddress, [
      initialOwnerAddress,
      merkleRoot,
    ]);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
