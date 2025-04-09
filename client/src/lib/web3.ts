declare global {
  interface Window {
    ethereum?: any;
  }
}

import { ethers } from "ethers";
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import { connectMockWallet } from './mock-wallet';

const APP_NAME = 'Buzzy.Chat';
const APP_LOGO_URL = 'https://example.com/logo.png';
const DEFAULT_ETH_JSONRPC_URL = 'https://mainnet.infura.io/v3/your-api-key';
const DEFAULT_CHAIN_ID = 1;

// Check if we're in localhost development
const isLocalhost = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

// Initialize Coinbase Wallet SDK
const coinbaseWallet = new CoinbaseWalletSDK({
  appName: APP_NAME,
  appLogoUrl: APP_LOGO_URL
});

// Initialize a Web3 Provider
const ethereum = coinbaseWallet.makeWeb3Provider();

export async function connectWallet(walletType: 'metamask' | 'coinbase' | 'test1' | 'test2' | 'test3' = 'metamask'): Promise<string> {
  try {
    // Use mock wallets for localhost testing
    if (isLocalhost && (walletType === 'test1' || walletType === 'test2' || walletType === 'test3')) {
      return connectMockWallet(walletType);
    }
    
    // For localhost, provide an option to use a random test wallet if MetaMask is not installed
    if (isLocalhost && walletType === 'metamask' && !window.ethereum) {
      console.warn("MetaMask not detected, using mock wallet for local development");
      return connectMockWallet("random");
    }

    let provider;

    if (walletType === 'metamask') {
      if (!window.ethereum) {
        throw new Error("MetaMask not found! Please install MetaMask first.");
      }
      provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      provider = new ethers.BrowserProvider(ethereum);
    }

    try {
      const accounts = await provider.send("eth_requestAccounts", []);
      return accounts[0];
    } catch (error: any) {
      // Handle the "already processing" error (-32002)
      if (error.code === -32002) {
        console.log("MetaMask is already processing a request. Please check your wallet and confirm the connection request.");
        throw new Error("Please check your MetaMask extension. A connection request is already pending.");
      }
      throw error;
    }
  } catch (error) {
    console.error("Wallet connection failed:", error);
    throw new Error("Failed to connect wallet: " + (error as Error).message);
  }
}

export async function disconnectWallet(): Promise<void> {
  // Clear any local session data
  localStorage.removeItem('walletAddress');
}

export function shortenAddress(address: string | undefined | null): string {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}