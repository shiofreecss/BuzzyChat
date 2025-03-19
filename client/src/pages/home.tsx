import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import WalletConnect from "@/components/WalletConnect";
import ChatInterface from "@/components/ChatInterface";
import UserProfile from "@/components/UserProfile";
import ChatList from "@/components/ChatList";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        onConnect={handleConnect}
        onProfileClick={() => setShowProfile(true)}
        onLogout={handleLogout}
        connected={!!address}
        address={address}
      />

      <main className="flex-1 container max-w-6xl mx-auto p-4 sm:p-6">
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
          <div className="text-center py-20 space-y-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
              Welcome to Buzzy.Chat
            </h2>
            <div className="max-w-2xl mx-auto space-y-6">
              <p className="text-xl text-foreground/80">
                A decentralized social chat platform powered by blockchain technology,
                offering secure and seamless communication in the Web3 era.
              </p>
              <div className="bg-card rounded-lg p-6 shadow-lg max-w-md mx-auto">
                <ul className="text-left space-y-4">
                  <li className="flex items-center gap-2 text-foreground">
                    <span className="text-xl">🔒</span>
                    <span>Secure wallet-based authentication</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <span className="text-xl">💬</span>
                    <span>Real-time messaging with friends</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <span className="text-xl">🌐</span>
                    <span>Public chat channels</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <span className="text-xl">🤝</span>
                    <span>Friend request system</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <span className="text-xl">🎨</span>
                    <span>Beautiful, responsive design</span>
                  </li>
                </ul>
              </div>
              <p className="text-lg text-muted-foreground">
                Connect your wallet to start chatting in this decentralized space
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}