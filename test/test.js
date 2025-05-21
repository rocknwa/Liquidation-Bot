const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { impersonateAccount, setBalance } = require("@nomicfoundation/hardhat-network-helpers");

describe("DepositAndBorrow", function () {
  const COMET_ADDR = "0xc3d688B66703497DAA19211EEdff47f25384cdc3"; // Compound V3 USDC on mainnet
  const WETH_ADDR = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const TEST_ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  async function deployFixture() {
   
    // Impersonate account and set balance
    await impersonateAccount(TEST_ACCOUNT);
    await setBalance(TEST_ACCOUNT, ethers.parseEther("10"));

    const provider = ethers.provider;
    const signer = await provider.getSigner(TEST_ACCOUNT);

    // Initialize contracts with corrected ABIs
    const comet = await ethers.getContractAt(
      [
        "function isLiquidatable(address) view returns (bool)",
        "function supply(address asset, uint256 amount)",
        "function withdraw(address asset, uint256 amount)",
        "function baseToken() view returns (address)",
        "function getCollateralReserves(address) view returns (uint256)",
        "function quoteCollateral(address,uint256) view returns (uint256)",
        "function getAssetInfoByAddress(address asset) view returns (tuple(uint8 offset, address asset, address priceFeed, uint256 scale, uint256 borrowCollateralFactor, uint256 liquidateCollateralFactor, uint256 liquidationFactor, uint128 supplyCap))",
        "function isBorrowPaused() view returns (bool)",
        "event SupplyCollateral(address indexed from, address indexed dst, address indexed asset, uint256 amount)",
        "event WithdrawCollateral(address indexed src, address indexed to, address indexed asset, uint256 amount)",
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
    if (!process.env.ALCHEMY_MAINNET_URL) {
      throw new Error("ALCHEMY_MAINNET_URL not set in .env");
    }
  });

  describe("Deposit and Borrow", function () {
    it("Should deposit ETH and receive WETH", async function () {
      const { weth, signer } = await loadFixture(deployFixture);
      const initialBalance = await weth.balanceOf(signer.address);
      await weth.deposit({ value: ethers.parseEther("1") });
      const finalBalance = await weth.balanceOf(signer.address);
      expect(finalBalance).to.equal(initialBalance + ethers.parseEther("1"));
    });

    it("Should approve Comet to spend WETH", async function () {
      const { weth, signer } = await loadFixture(deployFixture);
      await weth.deposit({ value: ethers.parseEther("1") });
      await weth.approve(COMET_ADDR, ethers.parseEther("1"));
      const allowance = await weth.allowance(signer.address, COMET_ADDR);
      expect(allowance).to.equal(ethers.parseEther("1"));
    });

    it("Should supply WETH to Comet", async function () {
      const { comet, weth, signer } = await loadFixture(deployFixture);
      await weth.deposit({ value: ethers.parseEther("1") });
      await weth.approve(COMET_ADDR, ethers.parseEther("1"));
      await expect(comet.supply(WETH_ADDR, ethers.parseEther("1")))
        .to.emit(comet, "SupplyCollateral")
        .withArgs(signer.address, COMET_ADDR, WETH_ADDR, ethers.parseEther("1"));
    });

    it("Should borrow USDC from Comet", async function () {
      const { comet, weth, signer } = await loadFixture(deployFixture);
      await weth.deposit({ value: ethers.parseEther("1") });
      await weth.approve(COMET_ADDR, ethers.parseEther("1"));
      await comet.supply(WETH_ADDR, ethers.parseEther("1"));

      // Check if borrowing is paused
      const isPaused = await comet.isBorrowPaused();
      if (isPaused) {
        console.log("Borrowing is paused, skipping borrow test");
        return;
      }

      // Calculate max borrow based on collateral factor and WETH price
      const assetInfo = await comet.getAssetInfoByAddress(WETH_ADDR);
      const priceFeed = await ethers.getContractAt(
        ["function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)"],
        assetInfo.priceFeed,
        ethers.provider
      );
      const wethPrice = (await priceFeed.latestRoundData())[1]; // Price in USD (8 decimals)
      const collateralValue = ethers.parseEther("1").mul(wethPrice).div(ethers.parseUnits("1", 8));
      const maxBorrow = collateralValue
        .mul(assetInfo.borrowCollateralFactor)
        .div(ethers.parseEther("1"))
        .mul(ethers.parseUnits("1", 6))
        .div(ethers.parseUnits("1", 18)); // Convert to USDC (6 decimals)

      const borrowAmount = maxBorrow.mul(8).div(10); // Borrow 80% of max to stay safe
      console.log("Calculated max borrow (USDC):", ethers.formatUnits(maxBorrow, 6));
      console.log("Borrowing (USDC):", ethers.formatUnits(borrowAmount, 6));

      const usdcAddr = await comet.baseToken();
      await expect(comet.withdraw(usdcAddr, borrowAmount))
        .to.emit(comet, "Withdraw")
        .withArgs(signer.address, signer.address, borrowAmount);
    });

    it("Should check liquidatable status", async function () {
      const { comet, weth, signer } = await loadFixture(deployFixture);
      await weth.deposit({ value: ethers.parseEther("1") });
      await weth.approve(COMET_ADDR, ethers.parseEther("1"));
      await comet.supply(WETH_ADDR, ethers.parseEther("1"));

      const isPaused = await comet.isBorrowPaused();
      if (isPaused) {
        console.log("Borrowing is paused, checking liquidatable status without borrow");
        const isLiquidatable = await comet.isLiquidatable(signer.address);
        expect(isLiquidatable).to.be.false;
        return;
      }

      const assetInfo = await comet.getAssetInfoByAddress(WETH_ADDR);
      const priceFeed = await ethers.getContractAt(
        ["function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)"],
        assetInfo.priceFeed,
        ethers.provider
      );
      const wethPrice = (await priceFeed.latestRoundData())[1];
      const collateralValue = ethers.parseEther("1").mul(wethPrice).div(ethers.parseUnits("1", 8));
      const maxBorrow = collateralValue
        .mul(assetInfo.borrowCollateralFactor)
        .div(ethers.parseEther("1"))
        .mul(ethers.parseUnits("1", 6))
        .div(ethers.parseUnits("1", 18));

      const borrowAmount = maxBorrow.mul(8).div(10);
      const usdcAddr = await comet.baseToken();
      await comet.withdraw(usdcAddr, borrowAmount);

      const isLiquidatable = await comet.isLiquidatable(signer.address);
      expect(isLiquidatable).to.be.false; // Should not be liquidatable with safe borrow
    });

    it("Should fetch WETH price from price feed", async function () {
      const { comet } = await loadFixture(deployFixture);
      const assetInfo = await comet.getAssetInfoByAddress(WETH_ADDR);
      const priceFeed = await ethers.getContractAt(
        ["function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)"],
        assetInfo.priceFeed,
        ethers.provider
      );
      const latestPrice = (await priceFeed.latestRoundData())[1];
      expect(latestPrice).to.be.gt(0);
    });
  });
});