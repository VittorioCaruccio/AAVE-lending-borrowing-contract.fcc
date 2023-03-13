const { ethers, network, getNamedAccounts } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")
const { getWeth, AMOUNT } = require("./getWeth")

async function main() {
  //Obtaining wETH depositing ETH
  await getWeth()
  const { deployer } = await getNamedAccounts()
  const WETHTokenAddress =
    networkConfig[network.config.chainId]["WethTokenAddress"]
  const LendingPool = await getLendingPool(deployer)

  //approve to deposit wETH in the lending pool in your behalf
  await ApproveErc20(WETHTokenAddress, deployer, LendingPool.address, AMOUNT)

  //lending
  console.log("Depositing...")
  await LendingPool.deposit(WETHTokenAddress, AMOUNT, deployer, 0)
  console.log("Deposited!")

  //display and obtain data for borrowing
  const [totalDebtETH, availableBorrowsETH] = await getBorrowData(
    LendingPool,
    deployer
  )

  //obtain the equivalent available DAI
  const inverse_DAI_price = await getPrice()
  const availableDAI =
    availableBorrowsETH.toString() * 0.95 * (1 / inverse_DAI_price)
  const availableDAIWei = ethers.utils.parseEther(availableDAI.toString())
  console.log("You can borrow: ", availableDAI, " DAI")

  const DAITokenAddress =
    networkConfig[network.config.chainId]["DAITokenAddress"]

  //borrowing
  await borrowDai(LendingPool, deployer, DAITokenAddress, availableDAIWei)

  //repay
  getBorrowData(LendingPool, deployer)
  await repay(LendingPool, DAITokenAddress, availableDAIWei, deployer)
  await getBorrowData(LendingPool, deployer)
}

async function getLendingPool(account) {
  const LendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    networkConfig[network.config.chainId]["LendingPoolAddressesProvider"],
    account
  )
  const LendingPooladdress = await LendingPoolAddressesProvider.getLendingPool()
  const LendingPool = await ethers.getContractAt(
    "ILendingPool",
    LendingPooladdress,
    account
  )
  return LendingPool
}
async function ApproveErc20(ERC20Token, account, spender, amount) {
  const ERC20 = await ethers.getContractAt("IERC20", ERC20Token, account)
  await ERC20.approve(spender, amount)
}

async function getBorrowData(LendingPool, account) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH, ltv } =
    await LendingPool.getUserAccountData(account)

  console.log(
    "You have ",
    totalCollateralETH.toString(),
    " worth of ETH deposited"
  )
  console.log("You have ", totalDebtETH.toString(), " worth of ETH borrowed")
  console.log("You can borrow ", availableBorrowsETH.toString(), "ETH")
  console.log("LTV: ", ltv.toString() / 100, " %")
  return [totalDebtETH, availableBorrowsETH]
}

async function getPrice() {
  const AggregatorV3Interface = await ethers.getContractAt(
    "AggregatorV3Interface",
    networkConfig[network.config.chainId]["ETH_DAIPriceFeedAddress"]
  )
  const price = (await AggregatorV3Interface.latestRoundData())[1]
  return price
}

async function borrowDai(LendingPool, account, asset, amount) {
  console.log("Borrowing maximum DAI amount...")
  const txResponse = await LendingPool.borrow(asset, amount, 1, 0, account)
  const txReceipt = await txResponse.wait(1)
  console.log("Borrowed")
}

async function repay(LendingPool, asset, amount, account) {
  await ApproveErc20(asset, account, LendingPool.address, amount)
  console.log("Repaying the debt...")
  const txResponse = await LendingPool.repay(asset, amount, 1, account)
  const txreceipt = await txResponse.wait(1)
  console.log("Repayed!")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
