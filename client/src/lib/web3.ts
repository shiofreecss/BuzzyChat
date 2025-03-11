import { ethers } from "ethers";

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask not found! Please install MetaMask first.");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    return accounts[0];
  } catch (error) {
    throw new Error("Failed to connect wallet: " + (error as Error).message);
  }
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
