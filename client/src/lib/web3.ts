declare global {
  interface Window {
    ethereum?: any;
  }
}

import { ethers } from "ethers";
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';

const APP_NAME = 'Buzzy.Chat';
const APP_LOGO_URL = 'https://example.com/logo.png';
const DEFAULT_ETH_JSONRPC_URL = 'https://mainnet.infura.io/v3/your-api-key';
const DEFAULT_CHAIN_ID = 1;

// Initialize Coinbase Wallet SDK
const coinbaseWallet = new CoinbaseWalletSDK({
  appName: APP_NAME,
  appLogoUrl: APP_LOGO_URL,
  overrideIsMetaMask: false
});

// Initialize a Web3 Provider
const ethereum = coinbaseWallet.makeWeb3Provider();

export async function connectWallet(walletType: 'metamask' | 'coinbase' = 'metamask'): Promise<string> {
  try {
    let provider;

    if (walletType === 'metamask') {
      if (!window.ethereum) {
        throw new Error("MetaMask not found! Please install MetaMask first.");
      }
      provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      provider = new ethers.BrowserProvider(ethereum);
    }

    const accounts = await provider.send("eth_requestAccounts", []);
    return accounts[0];
  } catch (error) {
    throw new Error("Failed to connect wallet: " + (error as Error).message);
  }
}

export async function disconnectWallet(): Promise<void> {
  // Clear any local session data
  localStorage.removeItem('walletAddress');
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}