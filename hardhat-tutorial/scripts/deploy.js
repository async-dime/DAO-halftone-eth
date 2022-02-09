const { ethers } = require('hardhat');
const { HALFTONE_ETH_NFT_CONTRACT_ADDRESS } = require('../constants');

const main = async () => {
  // Deploy the NFTMarketplace contract first
  const NFTMarketplace = await ethers.getContractFactory('NFTMarketplace');
  const nftMarketplace = await NFTMarketplace.deploy();
  await nftMarketplace.deployed();

  console.log('NFTMarketplace deployed to: ', nftMarketplace.address);

  // Now deploy the halftoneEthDAO contract
  const HalftoneEthDAO = await ethers.getContractFactory('HalftoneEthDAO');
  const halftoneEthDAO = await HalftoneEthDAO.deploy(
    nftMarketplace.address,
    HALFTONE_ETH_NFT_CONTRACT_ADDRESS,
    {
      // This assumes your account has at least 1 ETH in it's account
      // Change this value as you want
      value: ethers.utils.parseEther('1'),
    }
  );
  await halftoneEthDAO.deployed();

  console.log('HalftoneEthDAO deployed to: ', halftoneEthDAO.address);
};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (err) {
    console.error('Error deploying the Halftone Eth DAO contract', err);
    process.exit(1);
  }
};

runMain();
