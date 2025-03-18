import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import WalletConnect from "@/components/WalletConnect";
import ChatInterface from "@/components/ChatInterface";
import UserProfile from "@/components/UserProfile";
import ChatList from "@/components/ChatList";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import type { User as UserType } from "@shared/schema";

export default function Home() {
  const [address, setAddress] = useState<string>();
  const [showProfile, setShowProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);

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
      localStorage.removeItem('walletAddress');
      setAddress(undefined);
      setShowProfile(false);
      setSelectedUser(undefined);
      setLocation('/');
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

  const handleSelectUser = (user: UserType | null) => {
    setSelectedUser(user);
    if (window.innerWidth <= 768) {
      setLocation('/chat');
    }
  };

  const handleBackToList = () => {
    setSelectedUser(undefined);
    setLocation('/');
  };

  const handleBackFromProfile = () => {
    setShowProfile(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-2 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Buzzy.Chat
          </h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <WalletConnect
              onConnect={handleConnect}
              onProfileClick={() => setShowProfile(true)}
              onLogout={handleLogout}
              connected={!!address}
              address={address}
            />
          </div>
        </div>

        {address ? (
          showProfile ? (
            <UserProfile 
              address={address} 
              onBack={handleBackFromProfile}
            />
          ) : (
            <div className="flex flex-col md:flex-row gap-4">
              {(!selectedUser || window.innerWidth > 768) && (
                <ChatList 
                  currentAddress={address} 
                  onSelectUser={handleSelectUser}
                  onPublicChat={() => handleSelectUser(null)}
                  selectedUser={selectedUser}
                />
              )}
              {(selectedUser !== undefined || window.innerWidth > 768) && (
                <ChatInterface 
                  address={address}
                  selectedUser={selectedUser}
                  onSelectUser={handleBackToList}
                  showBackButton={!!selectedUser && window.innerWidth <= 768}
                  isPublicChat={!selectedUser}
                />
              )}
            </div>
          )
        ) : (
          <div className="text-center py-20 space-y-6">
            <h2 className="text-3xl font-semibold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Welcome to Buzzy.Chat
            </h2>
            <div className="max-w-2xl mx-auto space-y-4 text-gray-300">
              <p className="text-lg">
                A decentralized social chat platform powered by blockchain technology,
                offering secure and seamless communication in the Web3 era.
              </p>
              <ul className="text-left space-y-2 mx-auto max-w-md">
                <li>🔒 Secure wallet-based authentication</li>
                <li>💬 Real-time messaging with friends</li>
                <li>🌐 Public chat channels</li>
                <li>🤝 Friend request system</li>
                <li>🎨 Beautiful, responsive design</li>
              </ul>
              <p className="text-sm mt-8 text-gray-400">
                Connect your wallet to start chatting in this decentralized space
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-12">
              Powered By Beaver Foundation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}