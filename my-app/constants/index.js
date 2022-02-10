import nftContractArtifact from '../utils/HalftoneEth.json';
import DAOContractArtifact from '../utils/HalftoneEthDAO.json';

export const NFT_CONTRACT_ABI = nftContractArtifact.abi;
export const NFT_CONTRACT_ADDRESS =
  '0xB37FB929Bf6daf4524fDB89855DD80b4A8de92f2';

export const DAO_CONTRACT_ABI = DAOContractArtifact.abi;
export const DAO_CONTRACT_ADDRESS =
  '0x507D9FB2c72E0aA3021412F0b0f14f1f54Ca4406';

// NFT_CONTRACT_ABI is the abi of the Halftone Eth NFT contract that deployed before.
// NFT_CONTRACT_ADDRESS the address of the Halftone Eth NFT contract that deployed before.
// DAO_CONTRACT_ABI is the abi of the Halftone Eth DAO contract. To get the abi of the DAO contract, go to hardhat-tutorial/artifacts/contracts/HalftoneEthDAO.sol and then copy HalftoneEthDAO.json file, put it in utils folder and import it to get the `.abi` value.
// DAO_CONTRACT_ADDRESS is the address of the Halftone Eth DAO contract.
