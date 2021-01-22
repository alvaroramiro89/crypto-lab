const { default: Web3 } = require("web3");
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Token = artifacts.require("Token");
const TokenV2 = artifacts.require("TokenV2");
//const Exchange = artifacts.require("Exchange");

module.exports = async function (deployer) {

  const instance = await deployProxy(Token, ["QTOKEN"], { deployer });
  await upgradeProxy(instance.address, TokenV2, { deployer });

  // await deployer.deploy(Exchange, feeAccount, feePercent);

  // const accounts = await web3.eth.getAccounts()

  // const feeAccount = accounts[0];

  // const feePercent = 10;
  
  // await deployer.deploy(Exchange, feeAccount, feePercent);
};