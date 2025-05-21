# DeFi Interaction and Liquidation Bot

A robust set of JavaScript scripts for interacting with Compound V3 on the Ethereum mainnet, including depositing, borrowing, and monitoring liquidation opportunities. Built with Hardhat and Ethers.js, this project demonstrates advanced proficiency in blockchain development, smart contract interaction, and decentralized finance (DeFi) protocols.

---

## 📋 Project Overview

This repository contains two primary scripts and a comprehensive test suite designed to interact with the Compound V3 protocol on Ethereum mainnet:

1. **depositAndBorrow.js**: A script for depositing ETH (converted to WETH), supplying it as collateral to Compound V3, borrowing USDC, and checking liquidation status.
2. **bot.js**: A liquidation monitoring bot that dynamically tracks accounts on Compound V3, identifies liquidatable positions, and executes profitable liquidations using Uniswap for price quoting.
3. **Test Suite**: A Hardhat-based test suite that verifies the functionality of depositing, borrowing, and liquidation checks, ensuring robust and reliable interactions with mainnet contracts.

The scripts are designed to operate on a mainnet fork or directly on Ethereum mainnet, leveraging Alchemy's WebSocket API for real-time event monitoring and transaction execution.

---

## 🚀 Features

- **Deposit and Borrow**:
  - Deposits ETH and converts it to WETH for use as collateral.
  - Supplies WETH to Compound V3 and borrows USDC based on collateral factors.
  - Fetches real-time WETH price data from Compound's price feed to ensure accurate borrowing.

- **Liquidation Bot**:
  - Monitors Compound V3 events (`Borrow`, `Supply`, `Withdraw`) to dynamically track accounts.
  - Identifies liquidatable accounts and calculates profitability using Uniswap's Quoter contract.
  - Executes liquidations with optimized gas usage, ensuring cost-effective transactions.

- **Testing and Reliability**:
  - Comprehensive test suite using Hardhat and Chai for unit testing.
  - Simulates mainnet interactions via account impersonation and balance manipulation.
  - Validates WETH deposits, approvals, borrowing, liquidation status, and price feed integration.

- **Error Handling and Robustness**:
  - Handles WebSocket connection issues with graceful error logging and process termination.
  - Includes environment variable validation for secure Alchemy and private key integration.

---

## 🛠️ Technologies Used

- **Languages and Frameworks**:
  - JavaScript (Node.js)
  - Hardhat (for testing and mainnet forking)
  - Ethers.js (for Ethereum smart contract interaction)

- **DeFi Protocols**:
  - Compound V3 (Comet) for lending and borrowing
  - Uniswap V3 (Quoter) for price estimation
  - WETH and USDC as primary assets

- **Tools and Services**:
  - Alchemy WebSocket API for real-time mainnet data
  - Hardhat Network Helpers for mainnet forking and testing
  - dotenv for secure environment variable management

---

## 📦 Installation and Setup

### Prerequisites

- Node.js (v20 or higher)
- Alchemy API key (WebSocket URL for mainnet)
- Private key for Ethereum wallet (for transaction signing)
- Hardhat and dependencies installed

### Steps

1. **Clone the repository:**

   ```bash
   git clone https://github.com/rocknwa/Liquidation-Bot.git
   cd Liquidation-Bot
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   Create a `.env` file in the root directory with the following:

   ```env
   ALCHEMY_MAINNET_WS=your-alchemy-websocket-url
   ALCHEMY_MAINNET_HTTPS=your-alchemy-https-url
   PRIVATE_KEY=your-ethereum-private-key
   LIQUIDATOR_CONTRACT=your-liquidator-contract-address
   COMET_ADDRESS=0xc3d688B66703497DAA19211EEdff47f25384cdc3
   UNISWAP_QUOTER=your-uniswap-quoter-address
   ```

   You can also check the `.env.example` file

4. **Run the deposit and borrow script:**

   ```bash
   node depositAndBorrow.js
   ```

5. **Run the liquidation bot:**

   ```bash
   node bot.js
   ```

6. **Run tests:**

   ```bash
   npx hardhat test
   ```

---

## 🔍 Usage

### `depositAndBorrow.js`

This script automates:

- Depositing 1 ETH to receive WETH.
- Approving and supplying WETH to Compound V3 as collateral.
- Borrowing 2000 USDC against the supplied collateral.
- Checking the account's liquidation status and fetching the WETH price from Compound's price feed.

**Run with:**

```bash
node depositAndBorrow.js
```

### `bot.js`

The liquidation bot:

- Listens for Compound V3 events (`Borrow`, `Supply`, `Withdraw`) to track accounts.
- Periodically scans for liquidatable accounts every 60 seconds.
- Executes profitable liquidations using the Uniswap Quoter for price estimation.

**Run with:**

```bash
node bot.js
```

### Test Suite

The test suite verifies:

- Successful ETH to WETH conversion and deposit.
- WETH approval and supply to Compound V3.
- Borrowing USDC and checking liquidation status.
- Fetching WETH price from the price feed.

**Run with:**

```bash
npx hardhat test
```

---

## 💡 Why This Project Stands Out

- **Production-Ready Code**: The scripts are optimized for mainnet interaction, with robust error handling and gas efficiency.
- **Real-Time Monitoring**: The liquidation bot leverages WebSocket events for real-time account tracking, ensuring timely liquidations.
- **Comprehensive Testing**: The Hardhat test suite ensures reliability and correctness, simulating mainnet conditions.
- **DeFi Expertise**: Demonstrates deep understanding of Compound V3, Uniswap, and Ethereum smart contract interactions.
- **Scalability**: Modular design allows easy adaptation for other tokens, protocols, or price feeds.

---

## 📈 Potential Applications

- **DeFi Automation**: Automate lending, borrowing, and liquidation strategies for DeFi portfolios.
- **Protocol Monitoring**: Build tools for real-time monitoring of lending protocol health.
- **Arbitrage Opportunities**: Extend the liquidation bot to capture arbitrage profits across multiple protocols.
- **Client Solutions**: Offer customized DeFi bots for institutional or retail clients in the blockchain space.


---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

_Built with 💻 and ☕ by Therock Ani._
- **Email:** anitherock44@gmail.com
- I am a passionate blockchain developer with expertise in Ethereum, DeFi protocols, and smart contract engineering.
- I am open to opportunities where I can contribute to innovative blockchain projects or help clients integrate DeFi solutions.
