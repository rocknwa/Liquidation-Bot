const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { impersonateAccount, setBalance } = require("@nomicfoundation/hardhat-network-helpers");
 
// This test script is for depositing ETH, borrowing USDC, and checking liquidation status on Comet
// You can change the tokens and amounts as needed including the price feed
// Using Hardhat for testing and a local fork of the Ethereum mainnet
describe("DepositAndBorrow", function () {
  const COMET_ADDR = "0xc3d688B66703497DAA19211EEdff47f25384cdc3"; // Compound V3 USDC on mainnet
  const WETH_ADDR = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const USDC_ADDR = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC on mainnet
  const TEST_ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  async function deployFixture() {
    await impersonateAccount(TEST_ACCOUNT);
    await setBalance(TEST_ACCOUNT, ethers.parseEther("10"));

    const provider = ethers.provider;
    const signer = await provider.getSigner(TEST_ACCOUNT);

    const comet = await ethers.getContractAt(
      [
        "function isLiquidatable(address) view returns (bool)",
        "function supply(address asset, uint256 amount)",
        "function withdraw(address asset, uint256 amount)",
        "function baseToken() view returns (address)",
        "function getCollateralReserves(address) view returns (uint256)",
        "function quoteCollateral(address,uint256) view returns (uint256)",
        "function getAssetInfoByAddress(address asset) view returns (tuple(uint8 offset, address asset, address priceFeed, uint256 scale, uint256 borrowCollateralFactor, uint256 liquidateCollateralFactor, uint256 liquidationFactor, uint128 supplyCap))",
        "event SupplyCollateral(address indexed from, address indexed dst, address indexed asset, uint256 amount)",
        "event Withdraw(address indexed src, address indexed to, uint256 amount)",
      ],
      COMET_ADDR,
      signer
    );
    const weth = await ethers.getContractAt(
      [
        "function deposit() payable",
        "function approve(address,uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address,address) view returns (uint256)",
      ],
      WETH_ADDR,
      signer
    );

    return { comet, weth, signer, provider };
  }

  before(async () => {
    require("dotenv").config();
    if (!process.env.ALCHEMY_MAINNET_WS) {
      throw new Error("ALCHEMY_MAINNET_WS not set in .env");
    }
  });

  describe("Deposit and Borrow", function () {
    it("Should deposit ETH and receive WETH", async function () {
      const { weth, signer } = await loadFixture(deployFixture);
      const initialBalance = await weth.balanceOf(signer.address);
      await weth.deposit({ value: ethers.parseEther("1"), gasLimit: 1000000 });
      const finalBalance = await weth.balanceOf(signer.address);
      expect(finalBalance).to.equal(initialBalance + ethers.parseEther("1"));
    });



    it("Should approve Comet to spend WETH", async function () {
      const { weth, signer } = await loadFixture(deployFixture);
      await weth.deposit({ value: ethers.parseEther("1"), gasLimit: 1000000 });
      await weth.approve(COMET_ADDR, ethers.parseEther("1"), { gasLimit: 1000000 });
      const allowance = await weth.allowance(signer.address, COMET_ADDR);
      expect(allowance).to.equal(ethers.parseEther("1"));
      console.log("WETH allowance for Comet:", ethers.formatUnits(allowance, 18));
    });

   it("Should supply WETH to Comet", async function () {
  const { comet, weth, signer } = await loadFixture(deployFixture);
  await weth.deposit({ value: ethers.parseEther("1"), gasLimit: 1000000 });
  await weth.approve(COMET_ADDR, ethers.parseEther("1"), { gasLimit: 1000000 });
 await comet.supply(WETH_ADDR, ethers.parseEther("1"), { gasLimit: 1000000 });
 console.log(`📢 WETH supplied to comet by ${signer.address} asset: ${WETH_ADDR} amount: 1 WETH`);
});

    it("Should borrow USDC from Comet", async function () {
      const { comet, weth, signer, provider } = await loadFixture(deployFixture);
      await weth.deposit({ value: ethers.parseEther("1"), gasLimit: 1000000 });
      await weth.approve(COMET_ADDR, ethers.parseEther("1"), { gasLimit: 1000000 });
      await comet.supply(WETH_ADDR, ethers.parseEther("1"), { gasLimit: 1000000 });

      const usdcAddr = await comet.baseToken();
      console.log("Base token (USDC) address:", usdcAddr);
      expect(usdcAddr).to.equal(USDC_ADDR);

      const usdcReserves = await comet.getCollateralReserves(usdcAddr);
      console.log("USDC reserves:", ethers.formatUnits(usdcReserves, 6));

      const borrowAmount = ethers.parseUnits("2000", 6); // Match test output
      console.log("Borrow Amount (USDC):", ethers.formatUnits(borrowAmount, 6));

      try {
        await comet.withdraw(usdcAddr, borrowAmount, { gasLimit: 1000000 });
        console.log("Borrowed 2000 USDC");
      } catch (err) {
        console.error("Borrow failed:", err);
        throw new Error(`Borrow failed: ${err.message}`);
      }
    });

    it("Should check liquidatable status", async function () {
      const { comet, weth, signer, provider } = await loadFixture(deployFixture);
      await weth.deposit({ value: ethers.parseEther("1"), gasLimit: 1000000 });
      await weth.approve(COMET_ADDR, ethers.parseEther("1"), { gasLimit: 1000000 });
      await comet.supply(WETH_ADDR, ethers.parseEther("1"), { gasLimit: 1000000 });

      const usdcAddr = await comet.baseToken();
      console.log("Base token (USDC) address:", usdcAddr);
      expect(usdcAddr).to.equal(USDC_ADDR);

      const usdcReserves = await comet.getCollateralReserves(usdcAddr);
      console.log("USDC reserves:", ethers.formatUnits(usdcReserves, 6));

      const borrowAmount = ethers.parseUnits("2000", 6); // Match test output
      console.log("Borrow Amount (USDC):", ethers.formatUnits(borrowAmount, 6));

      try {
        await comet.withdraw(usdcAddr, borrowAmount, { gasLimit: 1000000 });
        console.log("Borrowed 2000 USDC");
      } catch (err) {
        console.error("Borrow failed:", err);
        throw new Error(`Borrow failed: ${err.message}`);
      }

      const isLiquidatable = await comet.isLiquidatable(signer.address);
      console.log("Is account liquidatable?", isLiquidatable);
      expect(isLiquidatable).to.be.false;
    });

    it("Should fetch WETH price from price feed", async function () {
      const { comet, provider } = await loadFixture(deployFixture);
      const assetInfo = await comet.getAssetInfoByAddress(WETH_ADDR);
      console.log("WETH price feed:", assetInfo.priceFeed);
      const priceFeed = await ethers.getContractAt(
        ["function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)"],
        assetInfo.priceFeed,
        provider
      );
      const latestPrice = (await priceFeed.latestRoundData())[1];
      console.log("WETH Price:", ethers.formatUnits(latestPrice, 8));
      expect(latestPrice).to.be.gt(0);
    });
  });
});