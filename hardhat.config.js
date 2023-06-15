require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

const rpc_url = process.env.SEPOLIA_RPC_URL;
const private_key = process.env.PRIVATE_KEY;
const etherscan_api_key = process.env.ETHERSCAN_API_KEY;

module.exports = {
  solidity: "0.8.17",

  networks: {
    localhost: {
      chainId: 31337,
    },

    sepolia: {
      chainId: 11155111,
      url: rpc_url,
      accounts: [private_key],
      blockConfirmation: 6,
    },
  },

  namedAccounts: {
    deployer: {
      default: 0,
    },
  },

  etherscan: {
    apiKey: etherscan_api_key,
  },
};
