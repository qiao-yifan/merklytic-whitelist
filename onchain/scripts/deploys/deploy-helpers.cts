import { mkdir, writeFile } from "fs/promises";
import path from "path";
import hre from "hardhat";
const { config, network, run } = hre;

export function getNumberOfConfirmations(chainId: bigint): number {
  let numberOfConfirmations: number;

  switch (chainId) {
    case 1n: // ETH Mainnet
      numberOfConfirmations = 5; // 1 min for 12s block time (https://ethereum.org/en/developers/docs/blocks/#block-time)
      break;
    case 56n: // BSC Mainnet
      numberOfConfirmations = 20; // 1 min for 3s block time (https://academy.binance.com/en/articles/an-introduction-to-bnb-smart-chain-bsc)
      break;
    case 137n: // Polygon PoS Mainnet
      numberOfConfirmations = 30; // 1 min for 2s block time (https://polygonscan.com/chart/blocktime)
      break;
    case 8453n: // Base Mainnet
      numberOfConfirmations = 15; // 30s for 2s block time (https://basescan.org)
      break;
    default:
      numberOfConfirmations = 5;
      break;
  }

  return numberOfConfirmations;
}

export async function verifyContractCode(
  networkName: string,
  contractAddress: string,
  verifyTaskArgs: unknown[]
): Promise<boolean> {
  let explorer: string;
  let verifyPlugin: string;
  let verifyTask: string;

  switch (networkName) {
    case "base-mainnet":
      explorer = "BaseScan";
      verifyPlugin = "verify";
      verifyTask = "verify:verify";
      break;
    case "base-sepolia":
      explorer = "BaseScan";
      verifyPlugin = "verify";
      verifyTask = "verify:verify";
      break;
    case "bsc-mainnet":
      explorer = "BscScan";
      verifyPlugin = "verify";
      verifyTask = "verify:verify";
      break;
    case "bsc-testnet":
      explorer = "BscScan";
      verifyPlugin = "verify";
      verifyTask = "verify:verify";
      break;
    case "polygon-mainnet":
      explorer = "PolygonScan";
      verifyPlugin = "verify";
      verifyTask = "verify:verify";
      break;
    case "polygon-amoy":
      explorer = "PolygonScan";
      verifyPlugin = "verify";
      verifyTask = "verify:verify";
      break;
    default:
      explorer = "Etherscan";
      verifyPlugin = "verify";
      verifyTask = "verify:verify";
      break;
  }

  try {
    console.log(
      `Running ${verifyTask} to verify contract at ${contractAddress} with constructor arguments ${JSON.stringify(
        verifyTaskArgs
      )} on ${explorer} ...`
    );

    await run(verifyTask, {
      address: contractAddress,
      constructorArguments: verifyTaskArgs,
    });

    return true;
  } catch (err: unknown) {
    if (!(err instanceof Error)) {
      throw err;
    }

    const CONTRACT_SOURCE_CODE_ALREADY_VERIFIED =
      "Contract source code already verified";
    const REASON_ALREADY_VERIFIED = "Reason: Already Verified";
    const SMART_CONTRACT_ALREADY_VERIFIED = "Smart-contract already verified";

    const errString = err.toString();
    if (
      errString.includes(CONTRACT_SOURCE_CODE_ALREADY_VERIFIED) ||
      errString.includes(REASON_ALREADY_VERIFIED) ||
      errString.includes(SMART_CONTRACT_ALREADY_VERIFIED)
    ) {
      console.log(REASON_ALREADY_VERIFIED);
      return true;
    }

    console.error(
      `Error occurred while verifying contract at ${contractAddress} on ${explorer}:\n`,
      err
    );

    const networkName = network.name;

    let verifyCommand;

    if (verifyTaskArgs.toString().includes("[object Object]")) {
      const projectArtifactsDirPath = config.paths.artifacts;
      const projectConstructorArgsDirPath = path.join(
        projectArtifactsDirPath,
        "constructorArgs"
      );
      const projectConstructorArgsFilename = `${networkName}-${contractAddress}.js`;
      const projectConstructorArgsFilePath = path.join(
        projectConstructorArgsDirPath,
        projectConstructorArgsFilename
      );

      await saveFile(
        projectConstructorArgsDirPath,
        projectConstructorArgsFilename,
        `module.exports = ${JSON.stringify(verifyTaskArgs, null, 4)};`
      );

      verifyCommand = `npx hardhat ${verifyPlugin} --network ${networkName} --constructor-args ${projectConstructorArgsFilePath} ${contractAddress}`;
    } else {
      const quotedConstructorArgs = verifyTaskArgs.map(
        (x) => `"${String(x).replace(/"/g, '\\"')}"`
      );
      verifyCommand = `npx hardhat ${verifyPlugin} --network ${networkName} ${contractAddress} ${quotedConstructorArgs.join(
        " "
      )}`;
    }

    console.log(
      [
        `Failed to verify contract at ${contractAddress} on ${explorer}, please manually run the following command to verify:`,
        "--------------------",
        verifyCommand,
        "--------------------",
      ].join("\n")
    );

    return false;
  }
}

async function saveFile(
  directoryPath: string,
  filename: string,
  fileContent: string
) {
  const fileAbsPath = path.join(directoryPath, filename);

  try {
    await mkdir(directoryPath);
  } catch (err) {
    if (!(err instanceof Error)) {
      throw err;
    }

    const nodeJsErrnoException = err as NodeJS.ErrnoException;
    if (
      nodeJsErrnoException.errno === -17 &&
      nodeJsErrnoException.code === "EEXIST"
    ) {
      console.error(`${directoryPath} exists`);
    } else {
      console.error(
        `Error while creating directory ${directoryPath}: ${err.message}\n${
          err.stack ?? ""
        }`
      );
      throw err;
    }
  }

  await writeFile(fileAbsPath, fileContent, "utf8");
}
