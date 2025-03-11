import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { connectWallet, shortenAddress } from "@/lib/web3";
import { useState } from "react";
import { Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WalletConnectProps {
  onConnect: (address: string) => void;
  connected: boolean;
  address?: string;
}

export default function WalletConnect({ onConnect, connected, address }: WalletConnectProps) {
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
      <Button disabled className="bg-gradient-to-r from-purple-500 to-blue-500">
        <Wallet className="mr-2 h-4 w-4" />
        {shortenAddress(address!)}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          disabled={connecting}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          <Wallet className="mr-2 h-4 w-4" />
          {connecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleConnect('metamask')}>
          Connect MetaMask
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleConnect('coinbase')}>
          Connect Coinbase Wallet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}