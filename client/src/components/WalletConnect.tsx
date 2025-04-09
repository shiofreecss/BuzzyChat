import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { connectWallet, disconnectWallet, shortenAddress } from "@/lib/web3";
import { getMockWallets } from "@/lib/mock-wallet";
import { useState, useEffect } from "react";
import { Wallet, Settings, LogOut, TestTube } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import MetaMaskLogo from "@/assets/metamask-logo.svg";
import CoinbaseLogo from "@/assets/coinbase-logo.svg";

interface WalletConnectProps {
  onConnect: (address: string) => void;
  onProfileClick: () => void;
  onLogout: () => void;
  connected: boolean;
  address?: string;
}

export default function WalletConnect({ 
  onConnect, 
  onProfileClick, 
  onLogout,
  connected, 
  address 
}: WalletConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if we're running on localhost
    setIsLocalhost(
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    );
  }, []);

  const handleConnect = async (walletType: 'metamask' | 'coinbase' | 'test1' | 'test2' | 'test3') => {
    // Prevent multiple simultaneous connection attempts
    if (connecting) return;
    
    setConnecting(true);
    try {
      console.log(`Attempting to connect with wallet type: ${walletType}`);
      const address = await connectWallet(walletType);
      console.log(`Wallet connected successfully: ${address}`);
      onConnect(address);
      
      let walletName = walletType === 'metamask' 
        ? 'MetaMask' 
        : walletType === 'coinbase' 
          ? 'Coinbase Wallet'
          : `Test Wallet ${walletType.replace('test', '')}`;
          
      toast({
        title: "Wallet Connected",
        description: `Successfully connected to ${walletName}`,
        duration: 3000,
      });
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      
      // Handle specific error cases
      let errorMessage = (error as Error).message;
      
      // Check if it's the "already processing" error
      if (errorMessage.includes("already pending") || errorMessage.includes("-32002")) {
        errorMessage = "Please check your wallet and approve the connection request that's already open.";
      }
      
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setConnecting(false);
    }
  };

  if (connected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-[#f4b43e]/10 hover:bg-[#f4b43e]/20 text-[#f4b43e] border border-[#f4b43e]/30">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline-block sm:ml-2">{shortenAddress(address!)}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-black border border-[#f4b43e] shadow-lg shadow-[#f4b43e]/20">
          <DropdownMenuItem onClick={onProfileClick} className="cursor-pointer text-[#f4b43e] hover:bg-[#f4b43e]/10 font-mono text-xs">
            <Settings className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#f4b43e]/20" />
          <DropdownMenuItem 
            onClick={onLogout}
            className="cursor-pointer text-red-500 hover:bg-red-500/10 font-mono text-xs"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          disabled={connecting}
          className="bg-[#f4b43e]/10 hover:bg-[#f4b43e]/20 text-[#f4b43e] border border-[#f4b43e]/30"
        >
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline-block sm:ml-2">
            {connecting ? "Connecting..." : "Connect Wallet"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-black border border-[#f4b43e] shadow-lg shadow-[#f4b43e]/20">
        <DropdownMenuItem 
          onClick={() => handleConnect('metamask')} 
          className="flex items-center gap-2 py-2 cursor-pointer text-[#f4b43e] hover:bg-[#f4b43e]/10 font-mono text-xs"
        >
          <img src={MetaMaskLogo} alt="MetaMask" className="w-6 h-6" />
          <span>Connect MetaMask</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleConnect('coinbase')} 
          className="flex items-center gap-2 py-2 cursor-pointer text-[#f4b43e] hover:bg-[#f4b43e]/10 font-mono text-xs"
        >
          <img src={CoinbaseLogo} alt="Coinbase Wallet" className="w-6 h-6" />
          <span>Connect Coinbase</span>
        </DropdownMenuItem>
        
        {isLocalhost && (
          <>
            <DropdownMenuSeparator className="bg-[#f4b43e]/20" />
            <DropdownMenuLabel className="text-[#f4b43e]/60 font-mono text-xs pt-2">
              Local Testing
            </DropdownMenuLabel>
            {getMockWallets().map((wallet, index) => (
              <DropdownMenuItem 
                key={wallet.address}
                onClick={() => handleConnect(`test${index + 1}` as any)} 
                className="flex items-center gap-2 py-2 cursor-pointer text-[#f4b43e] hover:bg-[#f4b43e]/10 font-mono text-xs"
              >
                <TestTube className="w-6 h-6" />
                <span>{wallet.name}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}