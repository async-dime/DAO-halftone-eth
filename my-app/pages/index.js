import Head from 'next/head';
import Web3Modal from 'web3modal';
import Toast from '../components/Toast';
import styles from '../styles/Home.module.css';
import ProgressBar from '@badrap/bar-of-progress';
import { Contract, providers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';
import { useEffect, useRef, useState } from 'react';
import {
  DAO_CONTRACT_ABI,
  DAO_CONTRACT_ADDRESS,
  NFT_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
} from '../constants';

const BarOfProgress = new ProgressBar({
  size: 4,
  color: '#d38312',
  className: `${styles.progressBar}`,
  delay: 150,
});

export default function Home() {
  // ETH Balance of the DAO contract
  const [treasuryBalance, setTreasuryBalance] = useState('0');
  // Number of proposals created in the DAO
  const [numProposals, setNumProposals] = useState('0');
  // Array of all proposals created in the DAO
  const [proposals, setProposals] = useState([]);
  // User's balance of HalftoneEth NFTs
  const [nftBalance, setNftBalance] = useState(0);
  // Fake NFT Token ID to purchase. Used when creating a proposal.
  const [fakeNftTokenId, setFakeNftTokenId] = useState('');
  // One of "Create Proposal" or "View Proposals"
  const [selectedTab, setSelectedTab] = useState('');
  // True if waiting for a transaction to be mined, false otherwise.
  const [loading, setLoading] = useState(false);
  // True if user has connected their wallet, false otherwise
  const [walletConnected, setWalletConnected] = useState(false);
  const web3ModalRef = useRef();

  const [list, setList] = useState([]); // list of toasts

  const TWITTER_HANDLE = 'p0tat0H8';
  const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

  let toastProperties = null;

  const showToast = (type, text) => {
    const id = Date.now();
    const desc = text.toString();

    switch (type) {
      case 'success':
        toastProperties = {
          id,
          title: 'Success',
          description: desc,
          backgroundColor: '#5cb85c',
          icon: 'checkIcon',
        };
        break;
      case 'error':
        toastProperties = {
          id,
          title: 'Error',
          description: desc,
          backgroundColor: '#d9534f',
          icon: 'errorIcon',
        };
        break;
      default:
        setList([]);
    }
    setList([...list, toastProperties]);
  };

  // Helper function to connect wallet
  const connectWallet = async () => {
    const { ethereum } = window;
    try {
      if (ethereum) {
        // get the provider from web3modal (metamask)
        // for the first-time user, it prompts user to connect their wallet
        await getProviderOrSigner();
        setWalletConnected(true);
      } else {
        showToast('error', 'Please install MetaMask!');
        return;
      }
    } catch (err) {
      console.error(err);
      showToast('error', err.data.message);
    }
  };

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;
    try {
      if (!ethereum) {
        showToast('error', 'Make sure you have MetaMask!');
        return;
      } else {
        showToast('success', `We have the ethereum object: ${ethereum}`);

        // Check if we're authorized to access the user's wallet
        const accounts = await ethereum.request({ method: 'eth_accounts' });

        if (accounts.length !== 0) {
          const account = accounts[0];
          showToast('success', `Found a wallet address: ${account}.`);

          // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
          if (!walletConnected) {
            // Assign the Web3Modal class to the reference object by setting it's `current` value
            // The `current` value is persisted throughout as long as this page is open
            web3ModalRef.current = new Web3Modal({
              network: 'rinkeby',
              providerOptions: {},
              disableInjectedProvider: false,
            });
            connectWallet().then(() => {
              getDAOTreasuryBalance();
              getUserNFTBalance();
              getNumProposalsInDAO();
            });
          }
        } else {
          showToast('error', 'Please connect your MetaMask wallet.');
          return;
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Reads the ETH balance of the DAO contract and sets the `treasuryBalance` state variable
  const getDAOTreasuryBalance = async () => {
    try {
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(DAO_CONTRACT_ADDRESS);
      setTreasuryBalance(balance.toString());
    } catch (error) {
      console.error(error);
    }
  };

  // Reads the number of proposals in the DAO contract and sets the `numProposals` state variable
  const getNumProposalsInDAO = async () => {
    try {
      const provider = await getProviderOrSigner();
      const contract = getDaoContractInstance(provider);
      const daoNumProposals = await contract.numProposals();
      setNumProposals(daoNumProposals.toString());
    } catch (error) {
      console.error(error);
    }
  };

  // Reads the balance of the user's HalftoneEth NFTs and sets the `nftBalance` state variable
  const getUserNFTBalance = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = getHalftoneEthNFTContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress());
      setNftBalance(parseInt(balance.toString()));
    } catch (error) {
      console.error(error);
    }
  };

  // Calls the `createProposal` function in the contract, using the tokenId from `fakeNftTokenId`
  const createProposal = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.createProposal(fakeNftTokenId);
      BarOfProgress.start(15000);
      setLoading(true);
      await txn.wait();
      await getNumProposalsInDAO();
      setLoading(false);
      BarOfProgress.finish();
      showToast('success', 'Successfully create Proposal!');
    } catch (error) {
      console.error(error);
      showToast('error', `Failed to create Proposal : ${error.message}`);
    }
  };

  // Helper function to fetch and parse one proposal from the DAO contract
  // Given the Proposal ID
  // and converts the returned data into a Javascript object with values we can use
  const fetchProposalById = async (id) => {
    try {
      const provider = await getProviderOrSigner();
      const daoContract = getDaoContractInstance(provider);
      const proposal = await daoContract.proposals(id);
      const parsedProposal = {
        proposalId: id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        yayVotes: proposal.yayVotes.toString(),
        nayVotes: proposal.nayVotes.toString(),
        executed: proposal.executed,
      };
      return parsedProposal;
    } catch (error) {
      console.error(error);
    }
  };

  // Runs a loop `numProposals` times to fetch all proposals in the DAO
  // and sets the `proposals` state variable
  const fetchAllProposals = async () => {
    try {
      const proposals = [];
      for (let i = 0; i < numProposals; i++) {
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      return proposals;
    } catch (error) {
      console.error(error);
    }
  };

  // Calls the `voteOnProposal` function in the contract, using the passed
  // proposal ID and Vote
  const voteOnProposal = async (proposalId, _vote) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);

      let vote = _vote === 'YAY' ? 0 : 1;
      const txn = await daoContract.voteOnProposal(proposalId, vote);
      BarOfProgress.start(15000);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      BarOfProgress.finish();
      await fetchAllProposals();
      showToast('success', 'Successfully voted on Proposal!');
    } catch (error) {
      console.error(error);
      showToast('error', `Failed to vote Proposal : ${error.data.message}`);
    }
  };

  // Calls the `executeProposal` function in the contract, using
  // the passed proposal ID
  const executeProposal = async (proposalId) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.executeProposal(proposalId);
      BarOfProgress.start(15000);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      BarOfProgress.finish();
      await fetchAllProposals();
      showToast('success', 'Successfully executing Proposal!');
    } catch (error) {
      console.error(error);
      showToast('error', `Failed to execute Proposal : ${error.data.message}`);
    }
  };

  // Helper function to fetch a Provider/Signer instance from Metamask
  const getProviderOrSigner = async (needSigner = false) => {
    try {
      const provider = await web3ModalRef.current.connect();
      const web3Provider = new providers.Web3Provider(provider);

      const { chainId } = await web3Provider.getNetwork();
      if (chainId !== 4) {
        showToast('error', 'Change the network to Rinkeby');
        throw new Error('Please switch to the Rinkeby network');
      }

      // setWalletConnected(true);
      if (needSigner) {
        const signer = web3Provider.getSigner();
        return signer;
      }
      return web3Provider;
    } catch (err) {
      console.error(err);
      showToast('error', 'Please install MetaMask!');
    }
  };

  // Helper function to return a DAO Contract instance
  // given a Provider/Signer
  const getDaoContractInstance = (providerOrSigner) => {
    return new Contract(
      DAO_CONTRACT_ADDRESS,
      DAO_CONTRACT_ABI,
      providerOrSigner
    );
  };

  // Helper function to return a Halftone Eth NFT Contract instance
  // given a Provider/Signer
  const getHalftoneEthNFTContractInstance = (providerOrSigner) => {
    return new Contract(
      NFT_CONTRACT_ADDRESS,
      NFT_CONTRACT_ABI,
      providerOrSigner
    );
  };

  // piece of code that runs every time the value of `walletConnected` changes
  // so when a wallet connects or disconnects
  // Prompts user to connect wallet if not connected
  // and then calls helper functions to fetch the
  // DAO Treasury Balance, User NFT Balance, and Number of Proposals in the DAO
  useEffect(() => {
    checkIfWalletIsConnected();
  }, [walletConnected]);

  // Piece of code that runs every time the value of `selectedTab` changes
  // Used to re-fetch all proposals in the DAO when user switches
  // to the 'View Proposals' tab
  useEffect(() => {
    if (selectedTab === 'View Proposals') {
      fetchAllProposals();
    }
  }, [selectedTab]);

  // Render the contents of the appropriate tab based on `selectedTab`
  function renderTabs() {
    if (selectedTab === 'Create Proposal') {
      return renderCreateProposalTab();
    } else if (selectedTab === 'View Proposals') {
      return renderViewProposalsTab();
    }
    return null;
  }

  // Renders the 'Create Proposal' tab content
  function renderCreateProposalTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (nftBalance === 0) {
      return (
        <div className={styles.description}>
          You do not own any HalftoneEth NFTs. <br />
          <b>You cannot create or vote on proposals</b>
        </div>
      );
    } else {
      return (
        <div className={styles.container}>
          <label>Fake NFT Token ID to Purchase: </label>
          <input
            className={styles.input}
            placeholder="0"
            type="number"
            onChange={(e) => setFakeNftTokenId(e.target.value)}
          />
          <button className={styles.button2} onClick={createProposal}>
            Create
          </button>
        </div>
      );
    }
  }

  // Renders the 'View Proposals' tab content
  function renderViewProposalsTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (proposals.length === 0) {
      return (
        <div className={styles.description}>No proposals have been created</div>
      );
    } else {
      return (
        <div>
          {proposals.map((p, index) => (
            <div key={index} className={styles.proposalCard}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yayVotes}</p>
              <p>Nay Votes: {p.nayVotes}</p>
              <p>Executed?: {p.executed.toString()}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => voteOnProposal(p.proposalId, 'YAY')}
                  >
                    Vote YAY
                  </button>
                  <button
                    className={styles.button2}
                    onClick={() => voteOnProposal(p.proposalId, 'NAY')}
                  >
                    Vote NAY
                  </button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => executeProposal(p.proposalId)}
                  >
                    Execute Proposal{' '}
                    {p.yayVotes > p.nayVotes ? '(YAY)' : '(NAY)'}
                  </button>
                </div>
              ) : (
                <div className={styles.description}>
                  <b>Proposal Executed</b>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div>
      <Head>
        <title>HalftoneEth DAO</title>
        <meta name="description" content="HalftoneEth DAO" />
        <link rel="icon" href="/halftone-ethx50.ico" />
      </Head>

      <div className={styles.main}>
        <Toast toastList={list} />
        <div>
          <h1 className={styles.header}>Halftone-Ethereum DAO</h1>
          <div className={styles.description}>
            This is a page for the Decentralized Anonymous Organization (DAO) of
            Halftone-Ethereum NFT &amp; Halftone-Ethereum (HET) token.
          </div>
          <div className={styles.description}>
            Go to the links below first:
            <br />
            <a
              href="https://halftone-ethereum.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <span className={styles.linkText}>NFT</span>
            </a>
            <br />
            <a
              href="https://halftone-ethereum-token-ico.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <span className={styles.linkText}>HET Token</span>
            </a>
          </div>
          {walletConnected ? (
            <>
              <div className={styles.description}>
                Your HalftoneEth NFT Balance:{' '}
                <span className={styles.styledNumber}>
                  <b>{nftBalance}</b>
                </span>{' '}
                <br />
                Treasury Balance:{' '}
                <span className={styles.styledNumber}>
                  <b>{formatEther(treasuryBalance)}</b>
                </span>{' '}
                ETH
                <br />
                Total Number of Proposals:{' '}
                <span className={styles.styledNumber}>
                  <b>{numProposals}</b>
                </span>{' '}
              </div>
              <div className={styles.flex}>
                <button
                  className={styles.button}
                  onClick={() => {
                    nftBalance === 0
                      ? showToast(
                          'error',
                          'Please claim or mint some HalftoneEth NFTs!'
                        )
                      : null;
                    setSelectedTab('Create Proposal');
                  }}
                >
                  Create Proposal
                </button>
                <button
                  className={styles.button}
                  onClick={() => setSelectedTab('View Proposals')}
                >
                  View Proposals
                </button>
              </div>
              {renderTabs()}
            </>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="/00.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        <div>
          <img
            alt="Twitter Logo"
            className={styles.twitterLogo}
            src="./twitter.svg"
          />
          {'  '}
          <a
            className={styles.footerText}
            href={TWITTER_LINK}
            target="_blank"
            rel="noopener noreferrer"
          >
            <b>{`built by @${TWITTER_HANDLE}`}</b>
          </a>
        </div>
      </footer>
    </div>
  );
}
