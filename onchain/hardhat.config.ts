import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "hardhat-contract-sizer";

dotenv.config();

const SOLIDITY_VERSION = "0.8.28";
const SOLIDITY_OPTIMIZER_RUNS = 200;

const config: HardhatUserConfig = {
  solidity: {
    version: SOLIDITY_VERSION,
    settings: {
      optimizer: {
        enabled: true,
        runs: SOLIDITY_OPTIMIZER_RUNS,
      },
    },
  },
  mocha: {
    timeout: 300000,
  },
  networks: {
    "hardhat": {
      accounts: { count: 210 },
    },
    // Base
    "base-mainnet": {
      url: process.env.BASE_MAINNET_URL ?? "",
      chainId: 8453,
      from: process.env.BASE_MAINNET_DEFAULT_SENDER_ADDRESS ?? "",
      accounts:
        process.env.BASE_MAINNET_PRIVATE_KEY === undefined ||
        process.env.BASE_MAINNET_PRIVATE_KEY === ""
          ? []
          : [process.env.BASE_MAINNET_PRIVATE_KEY],
    },
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_URL ?? "",
      chainId: 84532,
      from: process.env.BASE_SEPOLIA_DEFAULT_SENDER_ADDRESS ?? "",
      accounts:
        process.env.BASE_SEPOLIA_PRIVATE_KEY === undefined ||
        process.env.BASE_SEPOLIA_PRIVATE_KEY === ""
          ? []
          : [process.env.BASE_SEPOLIA_PRIVATE_KEY],
    },
    // BNB Smart Chain
    "bsc-mainnet": {
      url: process.env.BSC_MAINNET_URL ?? "",
      chainId: 56,
      from: process.env.BSC_MAINNET_DEFAULT_SENDER_ADDRESS ?? "",
      accounts:
        process.env.BSC_MAINNET_PRIVATE_KEY === undefined ||
        process.env.BSC_MAINNET_PRIVATE_KEY === ""
          ? []
          : [process.env.BSC_MAINNET_PRIVATE_KEY],
    },
    "bsc-testnet": {
      url: process.env.BSC_TESTNET_URL ?? "",
      chainId: 97,
      from: process.env.BSC_TESTNET_DEFAULT_SENDER_ADDRESS ?? "",
      accounts:
        process.env.BSC_TESTNET_PRIVATE_KEY === undefined ||
        process.env.BSC_TESTNET_PRIVATE_KEY === ""
          ? []
          : [process.env.BSC_TESTNET_PRIVATE_KEY],
    },
    // Ethereum
    "mainnet": {
      url: process.env.MAINNET_URL ?? "",
      chainId: 1,
      from: process.env.MAINNET_DEFAULT_SENDER_ADDRESS ?? "",
      accounts:
        process.env.MAINNET_PRIVATE_KEY === undefined ||
        process.env.MAINNET_PRIVATE_KEY === ""
          ? []
          : [process.env.MAINNET_PRIVATE_KEY],
    },
    "sepolia": {
      url: process.env.SEPOLIA_URL ?? "",
      chainId: 11155111,
      from: process.env.SEPOLIA_DEFAULT_SENDER_ADDRESS ?? "",
      accounts:
        process.env.SEPOLIA_PRIVATE_KEY === undefined ||
        process.env.SEPOLIA_PRIVATE_KEY === ""
          ? []
          : [process.env.SEPOLIA_PRIVATE_KEY],
    },
    // Polygon PoS
    "polygon-mainnet": {
      url: process.env.POLYGON_MAINNET_URL ?? "",
      chainId: 137,
      from: process.env.POLYGON_MAINNET_DEFAULT_SENDER_ADDRESS ?? "",
      accounts:
        process.env.POLYGON_MAINNET_PRIVATE_KEY === undefined ||
        process.env.POLYGON_MAINNET_PRIVATE_KEY === ""
          ? []
          : [process.env.POLYGON_MAINNET_PRIVATE_KEY],
    },
    "polygon-amoy": {
      url: process.env.POLYGON_AMOY_URL ?? "",
      chainId: 80002,
      from: process.env.POLYGON_AMOY_DEFAULT_SENDER_ADDRESS ?? "",
      accounts:
        process.env.POLYGON_AMOY_PRIVATE_KEY === undefined ||
        process.env.POLYGON_AMOY_PRIVATE_KEY === ""
          ? []
          : [process.env.POLYGON_AMOY_PRIVATE_KEY],
    },
  },
  contractSizer: {
    alphaSort: false,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: false,
  },
  gasReporter: {
    enabled:
      process.env.REPORT_GAS !== undefined &&
      process.env.REPORT_GAS.toLowerCase() === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY ?? "",
    noColors: true,
    outputFile: "gas-reporter-output.txt",
  },
  etherscan: {
    apiKey: {
      // Ethereum
      mainnet: process.env.MAINNET_ETHERSCAN_API_KEY ?? "",
      sepolia: process.env.SEPOLIA_ETHERSCAN_API_KEY ?? "",
      // Base
      base: process.env.BASE_MAINNET_BASESCAN_API_KEY ?? "",
      baseSepolia: process.env.BASE_SEPOLIA_BASESCAN_API_KEY ?? "",
      // BNB Smart Chain
      bsc: process.env.BSC_MAINNET_BSCSCAN_API_KEY ?? "",
      bscTestnet: process.env.BSC_TESTNET_BSCSCAN_API_KEY ?? "",
      // Polygon PoS
      polygon: process.env.POLYGON_MAINNET_POLYGONSCAN_API_KEY ?? "",
      polygonAmoy: process.env.POLYGON_AMOY_POLYGONSCAN_API_KEY ?? "",
    },
  },
  sourcify: {
    enabled: false,
  },
};

export default config;
