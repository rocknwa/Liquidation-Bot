require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.15",            // match your pragma
    settings: {
      viaIR: true,                // enable IR‐based compilation :contentReference[oaicite:3]{index=3}
      optimizer: {
        enabled: true,            // must be enabled for viaIR :contentReference[oaicite:4]{index=4}
        runs: 200,
        details: {
          yulDetails: {
            optimizerSteps: "u"   // recommended for viaIR in Hardhat :contentReference[oaicite:5]{index=5}
          }
        }
      }
    }
  },
  networks: {
    hardhat: {
      forking: { url: process.env.ALCHEMY_MAINNET_WS }
    }
  }
};
