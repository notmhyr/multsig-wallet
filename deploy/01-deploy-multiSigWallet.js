const { ethers, network } = require("hardhat");
const { verify } = require("../utils/verify");

module.exports = async ({ deployments, getNamedAccounts }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  const accounts = await ethers.getSigners();
  const owners = [deployer, accounts[1].address];
  const args = [owners, 2];

  const multiSigWallet = await deploy("MultiSigWallet", {
    from: deployer,
    log: true,
    args: args,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  log("-------------------------------------");

  if (chainId !== 31337) {
    await verify(multiSigWallet.address, args);
  }
};

module.exports.tags = ["all", "wallet"];
