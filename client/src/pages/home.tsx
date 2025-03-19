import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    setSelectedUser(user || undefined);
    if (isMobile) {
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
    <div className="min-h-screen bg-black text-blue-100 flex flex-col">
      <Header
        onConnect={handleConnect}
        onProfileClick={() => setShowProfile(true)}
        onLogout={handleLogout}
        connected={!!address}
        address={address}
      />

      <main className="flex-1 container max-w-6xl mx-auto p-4 sm:p-6">
        {address ? (
          <AnimatePresence mode="wait">
            {showProfile ? (
              <motion.div
                key="profile"
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <UserProfile 
                  address={address} 
                  onBack={handleBackFromProfile}
                />
              </motion.div>
            ) : (
              <div className="flex flex-col md:flex-row gap-4">
                <AnimatePresence mode="wait">
                  {(!selectedUser || !isMobile) && (
                    <motion.div
                      key="chatlist"
                      initial={isMobile ? { x: "-100%", opacity: 0 } : false}
                      animate={{ x: 0, opacity: 1 }}
                      exit={isMobile ? { x: "-100%", opacity: 0 } : false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <ChatList 
                        currentAddress={address} 
                        onSelectUser={handleSelectUser}
                        onPublicChat={() => handleSelectUser(null)}
                        selectedUser={selectedUser}
                      />
                    </motion.div>
                  )}
                  {(selectedUser !== undefined || !isMobile) && (
                    <motion.div
                      key="chatinterface"
                      initial={isMobile ? { x: "100%", opacity: 0 } : false}
                      animate={{ x: 0, opacity: 1 }}
                      exit={isMobile ? { x: "100%", opacity: 0 } : false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="flex-1"
                    >
                      <ChatInterface 
                        address={address}
                        selectedUser={selectedUser}
                        onSelectUser={handleBackToList}
                        showBackButton={!!selectedUser && isMobile}
                        isPublicChat={!selectedUser}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>
        ) : (
          <div className="text-center py-20 space-y-8">
            <h2 className="text-4xl font-bold text-blue-400 [text-shadow:_0_0_30px_rgb(96_165_250_/_20%)]">
              Welcome to Buzzy.Chat
            </h2>
            <div className="max-w-2xl mx-auto space-y-6">
              <p className="text-xl text-blue-300">
                A decentralized social chat platform powered by blockchain technology,
                offering secure and seamless communication in the Web3 era.
              </p>
              <div className="bg-blue-900/10 backdrop-blur-sm rounded-lg p-6 shadow-lg max-w-md mx-auto border border-blue-400/20">
                <ul className="text-left space-y-4">
                  <li className="flex items-center gap-2 text-blue-300">
                    <span className="text-xl">🔒</span>
                    <span>Secure wallet-based authentication</span>
                  </li>
                  <li className="flex items-center gap-2 text-blue-300">
                    <span className="text-xl">💬</span>
                    <span>Real-time messaging with friends</span>
                  </li>
                  <li className="flex items-center gap-2 text-blue-300">
                    <span className="text-xl">🌐</span>
                    <span>Public chat channels</span>
                  </li>
                  <li className="flex items-center gap-2 text-blue-300">
                    <span className="text-xl">🤝</span>
                    <span>Friend request system</span>
                  </li>
                  <li className="flex items-center gap-2 text-blue-300">
                    <span className="text-xl">🎨</span>
                    <span>Beautiful, responsive design</span>
                  </li>
                </ul>
              </div>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500/10 rounded-full border border-blue-400/20 text-blue-400">
                Connect your wallet to start chatting in this decentralized space
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}