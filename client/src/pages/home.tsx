import { useState, useEffect } from "react";
import WalletConnect from "@/components/WalletConnect";
import ChatInterface from "@/components/ChatInterface";
import UserProfile from "@/components/UserProfile";
import ChatList from "@/components/ChatList";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { User, Settings, LogOut } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { disconnectWallet } from "@/lib/web3";

export default function Home() {
  const [address, setAddress] = useState<string>();
  const [showProfile, setShowProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType>();
  const [showChatList, setShowChatList] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Restore session from localStorage
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);

  // On mobile, when a user is selected, hide the chat list
  useEffect(() => {
    if (selectedUser && window.innerWidth <= 768) {
      setShowChatList(false);
    }
  }, [selectedUser]);

  const handleConnect = async (walletAddress: string) => {
    try {
      await apiRequest('POST', '/api/users', {
        address: walletAddress,
        username: null,
        nickname: null,
      });
      setAddress(walletAddress);
      localStorage.setItem('walletAddress', walletAddress);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to register user",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await disconnectWallet();
      localStorage.removeItem('walletAddress');
      setAddress(undefined);
      setShowProfile(false);
      setSelectedUser(undefined);
      toast({
        title: "Logged Out",
        description: "Successfully disconnected wallet",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout",
      });
    }
  };

  const handleBackToList = () => {
    setSelectedUser(undefined);
    setShowChatList(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-2 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Buzzy.Chat
          </h1>
          <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
            {address && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowProfile(!showProfile)}
                  className="gap-2"
                >
                  {showProfile ? (
                    <>
                      <User className="h-4 w-4" />
                      Chat
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4" />
                      Profile
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="gap-2 text-red-500 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            )}
            <WalletConnect
              onConnect={handleConnect}
              connected={!!address}
              address={address}
            />
          </div>
        </div>

        {address ? (
          showProfile ? (
            <UserProfile address={address} />
          ) : (
            <div className="flex flex-col md:flex-row gap-4">
              {(showChatList || window.innerWidth > 768) && (
                <ChatList 
                  currentAddress={address} 
                  onSelectUser={(user) => {
                    setSelectedUser(user);
                    if (window.innerWidth <= 768) {
                      setShowChatList(false);
                    }
                  }}
                />
              )}
              <ChatInterface 
                address={address}
                selectedUser={selectedUser}
                onSelectUser={handleBackToList}
                showBackButton={!showChatList}
              />
            </div>
          )
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