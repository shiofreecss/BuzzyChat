import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import WalletConnect from "@/components/WalletConnect";
import ChatInterface from "@/components/ChatInterface";
import UserProfile from "@/components/UserProfile";
import ChatList from "@/components/ChatList";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";

export default function Home() {
  const [address, setAddress] = useState<string>();
  const [showProfile, setShowProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Restore session from localStorage
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

  const handleSelectUser = (user: UserType) => {
    setSelectedUser(user);
    if (window.innerWidth <= 768) {
      setLocation('/chat');
    }
  };

  const handleBackToList = () => {
    setSelectedUser(undefined);
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-2 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Buzzy.Chat
          </h1>
          <WalletConnect
            onConnect={handleConnect}
            onProfileClick={() => setShowProfile(true)}
            onLogout={handleLogout}
            connected={!!address}
            address={address}
          />
        </div>

        {address ? (
          showProfile ? (
            <UserProfile address={address} />
          ) : (
            <div className="flex flex-col md:flex-row gap-4">
              {(!selectedUser || window.innerWidth > 768) && (
                <ChatList 
                  currentAddress={address} 
                  onSelectUser={handleSelectUser}
                />
              )}
              {(selectedUser || window.innerWidth > 768) && (
                <ChatInterface 
                  address={address}
                  selectedUser={selectedUser}
                  onSelectUser={handleBackToList}
                  showBackButton={!!selectedUser && window.innerWidth <= 768}
                />
              )}
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