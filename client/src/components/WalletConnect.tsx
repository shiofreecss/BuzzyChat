import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { connectWallet, shortenAddress } from "@/lib/web3";
import { useState } from "react";
import { Wallet } from "lucide-react";

interface WalletConnectProps {
  onConnect: (address: string) => void;
  connected: boolean;
  address?: string;
}

export default function WalletConnect({ onConnect, connected, address }: WalletConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const address = await connectWallet();
      onConnect(address);
      toast({
        title: "Wallet Connected",
        description: "Successfully connected to MetaMask",
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

  return (
    <Button
      onClick={handleConnect}
      disabled={connecting || connected}
      className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
    >
      <Wallet className="mr-2 h-4 w-4" />
      {connected ? shortenAddress(address!) : connecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
