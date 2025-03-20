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

// Animation variants
const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0
  })
};

const pageTransition = {
  type: "spring",
  bounce: 0,
  duration: 0.3
};

export default function Home() {
  const [address, setAddress] = useState<string>();
  const [showProfile, setShowProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType>();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [[page, direction], setPage] = useState([0, 0]);

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
      setPage([1, 1]); // Animate forward
      setLocation('/chat');
    }
  };

  const handleBackToList = () => {
    setSelectedUser(undefined);
    if (isMobile) {
      setPage([0, -1]); // Animate backward
      setLocation('/');
    }
  };

  const handlePublicChat = () => {
    setSelectedUser(undefined);
    if (isMobile) {
      setPage([1, 1]); // Animate forward to show chat interface
      setLocation('/chat');
    }
  };

  const handleBackFromProfile = () => {
    setShowProfile(false);
    setPage([0, -1]); // Animate backward
  };

  const showChatInterface = !isMobile || (isMobile && location === '/chat');
  const showChatList = !isMobile || (isMobile && location === '/');

  return (
    <div className="min-h-screen bg-[#111111] text-[#f4b43e] flex flex-col">
      <Header
        onConnect={handleConnect}
        onProfileClick={() => {
          setShowProfile(true);
          setPage([1, 1]); // Animate forward
        }}
        onLogout={handleLogout}
        connected={!!address}
        address={address}
      />

      <main className="flex-1 container max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-4 min-h-0">
        {address ? (
          <AnimatePresence mode="wait" custom={direction}>
            {showProfile ? (
              <motion.div
                key="profile"
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={pageTransition}
                className="h-[calc(100vh-12rem)]"
              >
                <UserProfile 
                  address={address} 
                  onBack={handleBackFromProfile}
                />
              </motion.div>
            ) : (
              <div className="flex flex-col md:flex-row gap-2 h-[calc(100vh-12rem)]">
                <AnimatePresence mode="wait" custom={direction}>
                  {showChatList && (
                    <motion.div
                      key="chatlist"
                      custom={direction}
                      variants={pageVariants}
                      initial={isMobile ? "enter" : "center"}
                      animate="center"
                      exit="exit"
                      transition={pageTransition}
                      className="h-full"
                    >
                      <ChatList 
                        currentAddress={address} 
                        onSelectUser={handleSelectUser}
                        onPublicChat={handlePublicChat}
                        selectedUser={selectedUser}
                      />
                    </motion.div>
                  )}
                  {showChatInterface && (
                    <motion.div
                      key="chatinterface"
                      custom={direction}
                      variants={pageVariants}
                      initial={isMobile ? "enter" : "center"}
                      animate="center"
                      exit="exit"
                      transition={pageTransition}
                      className="flex-1 h-full"
                    >
                      <ChatInterface 
                        address={address}
                        selectedUser={selectedUser}
                        onSelectUser={handleBackToList}
                        showBackButton={isMobile}
                        isPublicChat={selectedUser === undefined}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>
        ) : (
          <div className="text-center py-20 space-y-8">
            <h2 className="text-4xl font-mono text-[#f4b43e] [text-shadow:_0_0_30px_rgb(244_180_62_/_20%)]">
              Welcome to Buzzy.Chat
            </h2>
            <div className="max-w-2xl mx-auto space-y-6">
              <p className="text-xl font-mono text-[#f4b43e]/80">
                Connect, Chat, Create with Web3
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#f4b43e]/5 backdrop-blur-sm rounded-lg p-6 shadow-lg border border-[#f4b43e]/20">
                  <h3 className="text-lg font-mono text-[#f4b43e] mb-2">Secure Chat</h3>
                  <p className="text-sm text-[#f4b43e]/70">
                    End-to-end encryption and blockchain authentication ensures your conversations stay private and secure.
                  </p>
                </div>
                <div className="bg-[#f4b43e]/5 backdrop-blur-sm rounded-lg p-6 shadow-lg border border-[#f4b43e]/20">
                  <h3 className="text-lg font-mono text-[#f4b43e] mb-2">Web3 Integration</h3>
                  <p className="text-sm text-[#f4b43e]/70">
                    Connect with MetaMask or Coinbase Wallet to start chatting with your Web3 community.
                  </p>
                </div>
                <div className="bg-[#f4b43e]/5 backdrop-blur-sm rounded-lg p-6 shadow-lg border border-[#f4b43e]/20">
                  <h3 className="text-lg font-mono text-[#f4b43e] mb-2">Rich Features</h3>
                  <p className="text-sm text-[#f4b43e]/70">
                    Emoji reactions, typing indicators, and real-time messaging enhance your chat experience.
                  </p>
                </div>
              </div>
              <div className="bg-[#f4b43e]/5 backdrop-blur-sm rounded-lg p-6 shadow-lg max-w-md mx-auto border border-[#f4b43e]/20">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#f4b43e]/10 rounded-full border border-[#f4b43e]/20 text-[#f4b43e] font-mono text-xs">
                      Connect wallet to start chatting
                    </div>
                  </div>
                  <div className="h-px bg-[#f4b43e]/20"></div>
                  <div className="text-center font-mono text-[#f4b43e] text-xs space-y-4">
                    <p>A decentralized chat platform</p>
                    <p>for web3 communities</p>
                    <ul className="text-left mt-4 space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="text-[#f4b43e]/60">•</span>
                        Private & public chat rooms
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-[#f4b43e]/60">•</span>
                        Friend system with request management
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-[#f4b43e]/60">•</span>
                        Custom usernames & profiles
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}