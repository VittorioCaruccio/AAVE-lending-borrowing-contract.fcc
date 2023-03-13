const { ethers, getNamedAccounts, network } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")
const AMOUNT = ethers.utils.parseEther("0.02") //AMOUNT ETH deposited will be converted in AMOUNT wETH that could be used
async function getWeth() {
  const { deployer } = await getNamedAccounts()
  const IWeth = await ethers.getContractAt(
    "IWeth",
    networkConfig[network.config.chainId]["WethTokenAddress"],
    deployer
  )

  const txResponse = await IWeth.deposit({ value: AMOUNT })
  const txReceipt = await txResponse.wait(1)
  const Weth_balance = await IWeth.balanceOf(deployer)
  console.log("wETH balance: ", Weth_balance.toString(), "wETH")
}

module.exports = { getWeth, AMOUNT }
