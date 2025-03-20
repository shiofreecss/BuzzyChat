import { ethers } from "ethers";

// Generate a random wallet address for testing
const generateRandomAddress = (): string => {
  // Create a random wallet
  const wallet = ethers.Wallet.createRandom();
  return wallet.address;
};

// Pre-defined test wallets for consistent testing
const TEST_WALLETS = [
  {
    address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    name: "Test Wallet 1"
  },
  {
    address: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
    name: "Test Wallet 2"
  },
  {
    address: "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
    name: "Test Wallet 3"
  }
];

export async function connectMockWallet(type: string = "random"): Promise<string> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (type === "random") {
    return generateRandomAddress();
  } else {
    // Return one of the test wallets
    const index = parseInt(type.replace("test", "")) - 1;
    if (index >= 0 && index < TEST_WALLETS.length) {
      return TEST_WALLETS[index].address;
    }
    // Default to first test wallet if index is invalid
    return TEST_WALLETS[0].address;
  }
}

export function getMockWallets() {
  return TEST_WALLETS;
} 