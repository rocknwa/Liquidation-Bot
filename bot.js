require("dotenv").config();
const { ethers } = require("ethers");

// This script monitors the Comet protocol for liquidatable accounts and executes liquidation transactions
// using a liquidator contract. It also handles WebSocket connection issues and dynamically tracks accounts.
const RPC_URL = process.env.ALCHEMY_MAINNET_WS; // Alchemy WebSocket URL
const PK = process.env.PRIVATE_KEY;
const LIQUIDATOR = process.env.LIQUIDATOR_CONTRACT;
const COMET_ADDR = process.env.COMET_ADDRESS;
const QUOTER = process.env.UNISWAP_QUOTER;

const cometAbi = [
  "function isLiquidatable(address) view returns (bool)",
  "function absorb(address,address[])",
  "function baseToken() view returns (address)",
  "function getCollateralReserves(address) view returns (uint256)",
  "function quoteCollateral(address,uint256) view returns (uint256)",
  // Add relevant event signatures
  "event Borrow(address indexed user, uint256 amount)",
  "event Supply(address indexed user, address indexed asset, uint256 amount)",
  "event Withdraw(address indexed user, address indexed asset, uint256 amount)"
];
const liquidatorAbi = [
  "function absorbAndArbitrage(address,address[],address[],(uint8,uint24,bool,bytes32,address)[],uint256[],address,uint24,uint256) external"
];
const quoterAbi = [
  "function quoteExactOutputSingle(address,address,uint24,uint256,uint160) external returns (uint256)"
];

async function main() {
  // Provider & Wallet
  const provider = new ethers.WebSocketProvider(RPC_URL); 
  const wallet = new ethers.Wallet(PK, provider);

  // Contracts
  const comet = new ethers.Contract(COMET_ADDR, cometAbi, provider);
  const liquidator = new ethers.Contract(LIQUIDATOR, liquidatorAbi, wallet);
  const quoter = new ethers.Contract(QUOTER, quoterAbi, provider);

  // Debug contract initialization
  console.log("Comet contract initialized at:", COMET_ADDR);
  try {
    const baseToken = await comet.baseToken();
    console.log("Comet base token:", baseToken);
  } catch (err) {
    console.error("Failed to fetch base token:", err);
  }

  // Dynamic account tracking
  const accountsToMonitor = new Set();

  // Function to process liquidation for an account
  async function processLiquidation(acct) {
    try {
      const canLiquidate = await comet.isLiquidatable(acct);
      if (!canLiquidate) return;

      console.log(`🤿 ${acct} is liquidatable!`);

      const liquidatableAccounts = [acct];
      const collateralAssets = [
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
        "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
        "0xc00e94Cb662C3520282E6f5717214004A7f26888"  // COMP
      ];
      const maxToPurchase = collateralAssets.map(() => ethers.utils.parseUnits("1000", 18));

      const poolConfigs = collateralAssets.map(() => ({
        exchange: 0,
        uniswapPoolFee: 3000,
        swapViaWeth: false,
        balancerPoolId: ethers.constants.HashZero,
        curvePool: ethers.constants.AddressZero
      }));

      let totalBaseNeeded = ethers.BigNumber.from(0);
      for (let i = 0; i < collateralAssets.length; i++) {
        const balance = await comet.getCollateralReserves(collateralAssets[i]);
        const quote = await comet.quoteCollateral(
          collateralAssets[i],
          ethers.constants.WeiPerEther
        );
        const baseNeed = ethers.constants.WeiPerEther.mul(balance).div(quote);
        totalBaseNeeded = totalBaseNeeded.add(baseNeed);
      }

      const estimatedCollateral = await quoter.quoteExactOutputSingle(
        await comet.baseToken(),
        collateralAssets[0],
        3000,
        totalBaseNeeded,
        0
      );
      const estimatedBack = await quoter.quoteExactOutputSingle(
        collateralAssets[0],
        await comet.baseToken(),
        3000,
        estimatedCollateral,
        0
      );

      const gasCost = ethers.utils.parseEther("0.002");
      if (estimatedBack.lt(totalBaseNeeded.add(gasCost))) {
        console.log("⚠️ Not profitable, skipping");
        return;
      }

      const estimatedGas = await liquidator.estimateGas.absorbAndArbitrage(
        COMET_ADDR,
        liquidatableAccounts,
        collateralAssets,
        poolConfigs,
        maxToPurchase,
        await comet.baseToken(),
        3000,
        0
      );
      const tx = await liquidator.absorbAndArbitrage(
        COMET_ADDR,
        liquidatableAccounts,
        collateralAssets,
        poolConfigs,
        maxToPurchase,
        await comet.baseToken(),
        3000,
        0,
        { gasLimit: estimatedGas.mul(12).div(10) }
      );
      const receipt = await tx.wait();
      console.log(`✅ Liquidated ${acct} in tx ${receipt.transactionHash}`);
      // Remove account after successful liquidation
      accountsToMonitor.delete(acct);
    } catch (err) {
      console.error(`❌ Error processing ${acct}:`, err);
    }
  }

  // Listen for Comet events to dynamically add accounts
  console.log("🚀 Bot started: listening for Comet events");
  comet.on("Borrow", async (user, amount, event) => {
    console.log(`📢 Borrow event detected for ${user}`);
    accountsToMonitor.add(user);
    // Immediately check if the account is liquidatable
    await processLiquidation(user);
  });

  comet.on("Supply", (user, asset, amount, event) => {
    console.log(`📢 Supply event detected for account: ${user} asset: ${asset} amount: ${amount}`);
    accountsToMonitor.add(user);
  });

  comet.on("Withdraw", (user, asset, amount, event) => {
    console.log(`📢 Withdraw event detected for account: ${user} asset: ${asset.name} amount: ${amount}`);
    accountsToMonitor.add(user);
  });

  // Periodic scan for liquidatable accounts (fallback or cleanup)
  setInterval(async () => {
    console.log(`🔍 Scanning ${accountsToMonitor.size} accounts for liquidation`);
    for (const acct of accountsToMonitor) {
      await processLiquidation(acct);
    }
  }, 60_000); // Check every 60 seconds to avoid missing liquidations

  // Handle WebSocket connection issues (Ethers v6)
  provider.websocket.on("error", (error) => {
    console.error("WebSocket error:", error);
    process.exit(1);
  });

  provider.websocket.on("close", () => {
    console.error("WebSocket closed. Attempting to reconnect...");
    process.exit(1);
  });
}

main().catch((err) => {
  console.error("Main error:", err);
  process.exit(1);
});