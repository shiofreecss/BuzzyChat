import { useState } from "react";
import WalletConnect from "@/components/WalletConnect";
import ChatInterface from "@/components/ChatInterface";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [address, setAddress] = useState<string>();
  const { toast } = useToast();

  const handleConnect = async (walletAddress: string) => {
    try {
      await apiRequest('POST', '/api/users', {
        address: walletAddress,
        nickname: null,
      });
      setAddress(walletAddress);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to register user",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Buzzy.Chat
          </h1>
          <WalletConnect
            onConnect={handleConnect}
            connected={!!address}
            address={address}
          />
        </div>

        {address ? (
          <ChatInterface address={address} />
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">
              Welcome to Buzzy.Chat
            </h2>
            <p className="text-gray-400">
              Connect your wallet to start chatting in this decentralized space
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
