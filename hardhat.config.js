require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      forking: { url: process.env.ALCHEMY_MAINNET_HTTPS}
    }
  }
};
