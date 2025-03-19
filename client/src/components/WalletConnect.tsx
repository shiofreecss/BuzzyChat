import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { connectWallet, disconnectWallet, shortenAddress } from "@/lib/web3";
import { useState } from "react";
import { Wallet, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  const { toast } = useToast();

  const handleConnect = async (walletType: 'metamask' | 'coinbase') => {
    setConnecting(true);
    try {
      const address = await connectWallet(walletType);
      onConnect(address);
      toast({
        title: "Wallet Connected",
        description: `Successfully connected to ${walletType === 'metamask' ? 'MetaMask' : 'Coinbase Wallet'}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: (error as Error).message,
      });
    } finally {
      setConnecting(false);
    }
  };

  if (connected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="retro-button">
            <Wallet className="mr-2 h-4 w-4" />
            {shortenAddress(address!)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-black border border-[#00ff00] shadow-lg shadow-[#00ff00]/20">
          <DropdownMenuItem onClick={onProfileClick} className="cursor-pointer text-[#00ff00] hover:bg-[#00ff00]/10 font-['Press_Start_2P'] text-xs">
            <Settings className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#00ff00]/20" />
          <DropdownMenuItem 
            onClick={onLogout}
            className="cursor-pointer text-red-500 hover:bg-red-500/10 font-['Press_Start_2P'] text-xs"
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
          className="retro-button"
        >
          <Wallet className="mr-2 h-4 w-4" />
          {connecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-black border border-[#00ff00] shadow-lg shadow-[#00ff00]/20">
        <DropdownMenuItem 
          onClick={() => handleConnect('metamask')} 
          className="flex items-center gap-2 py-2 cursor-pointer text-[#00ff00] hover:bg-[#00ff00]/10 font-['Press_Start_2P'] text-xs"
        >
          <img src={MetaMaskLogo} alt="MetaMask" className="w-6 h-6" />
          <span>Connect MetaMask</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleConnect('coinbase')} 
          className="flex items-center gap-2 py-2 cursor-pointer text-[#00ff00] hover:bg-[#00ff00]/10 font-['Press_Start_2P'] text-xs"
        >
          <img src={CoinbaseLogo} alt="Coinbase Wallet" className="w-6 h-6" />
          <span>Connect Coinbase</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}