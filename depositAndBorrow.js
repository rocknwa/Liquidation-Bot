const { ethers } = require("ethers");
require("dotenv").config();
const {
  impersonateAccount,
  setBalance,
} = require("@nomicfoundation/hardhat-network-helpers");
//const RPC_URL = process.env.ALCHEMY_MAINNET_WS; // Alchemy WebSocket URL
//const PK = process.env.PRIVATE_KEY;
const COMET_ADDR = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
const WETH_ADDR = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const cometAbi = [
  "function isLiquidatable(address) view returns (bool)",
  "function supply(address asset, uint256 amount)",
  "function withdraw(address asset, uint256 amount)",
  "function baseToken() view returns (address)",
  "function getCollateralReserves(address) view returns (uint256)",
  "function quoteCollateral(address,uint256) view returns (uint256)",
  "function getAssetInfoByAddress(address asset) view returns (tuple(uint8 offset, address asset, address priceFeed, uint256 scale, uint256 borrowCollateralFactor, uint256 liquidateCollateralFactor, uint256 liquidationFactor, uint128 supplyCap))",
  "function isBorrowPaused() view returns (bool)",
];
const wethAbi = [
  "function deposit() payable",
  "function approve(address,uint256)",
  "function balanceOf(address) view returns (uint256)",
];
async function main() {
  //const provider = new ethers.JsonRpcProvider(RPC_URL); // Alchemy WebSocket URL
   //const wallet = new ethers.Wallet(PK, provider);
    const provider = new ethers.JsonRpcProvider("http://localhost:8545"); // Alchemy WebSocket URL
  const testAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  await impersonateAccount(testAccount);
  await setBalance(testAccount, ethers.parseEther("10"));
  const signer = await provider.getSigner(testAccount);
  const comet = new ethers.Contract(COMET_ADDR, cometAbi, signer);
  const weth = new ethers.Contract(WETH_ADDR, wethAbi, signer); // Check Comet state
  const usdcAddr = await comet.baseToken();
  const usdcReserves = await comet.getCollateralReserves(usdcAddr);
  console.log("USDC reserves:", ethers.formatUnits(usdcReserves, 6)); // Deposit 1 ETH to get WETH
  await weth.deposit({ value: ethers.parseEther("1") });
  console.log(
    "WETH balance:",
    ethers.formatEther(await weth.balanceOf(testAccount))
  ); // Approve Comet to spend WETH
  await weth.approve(COMET_ADDR, ethers.parseEther("1"));
  console.log("Approved WETH for Comet"); // Supply 1 WETH as collateral
  await comet.supply(WETH_ADDR, ethers.parseEther("1"));
  console.log("Supplied 1 WETH to Comet"); // Check collateral factors and price feed
  const assetInfo = await comet.getAssetInfoByAddress(WETH_ADDR);
  console.log(
    "WETH borrow collateral factor:",
    ethers.formatUnits(assetInfo.borrowCollateralFactor, 18)
  );
  console.log(
    "WETH liquidate collateral factor:",
    ethers.formatUnits(assetInfo.liquidateCollateralFactor, 18)
  );
  console.log("WETH price feed:", assetInfo.priceFeed); // Get current WETH price
  const priceFeedAbi = [
    "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
  ];
  const priceFeedContract = new ethers.Contract(
    assetInfo.priceFeed,
    priceFeedAbi,
    provider
  );
  const latestPrice = (await priceFeedContract.latestRoundData())[1];
  console.log("Current WETH price:", ethers.formatUnits(latestPrice, 8)); // Borrow 8000 USDC
  try {
    await comet.withdraw(usdcAddr, ethers.parseUnits("8000", 6));
    console.log("Borrowed 8000 USDC");
  } catch (err) {
    console.error("Borrow failed:", err);
    return;
  } // Check if liquidatable
  let isLiquidatable = await comet.isLiquidatable(testAccount);
  console.log("Is liquidatable after 8000 USDC borrow:", isLiquidatable)
   
  return testAccount;
}
main().catch(console.error);
