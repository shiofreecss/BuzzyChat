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
    <div className="min-h-screen bg-black text-[#2bbd2b] flex flex-col">
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

      <main className="flex-1 container max-w-6xl mx-auto p-4 sm:p-6">
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
              >
                <UserProfile 
                  address={address} 
                  onBack={handleBackFromProfile}
                />
              </motion.div>
            ) : (
              <div className="flex flex-col md:flex-row gap-4">
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
                      className="flex-1"
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
            <h2 className="text-4xl font-['Press_Start_2P'] text-[#2bbd2b] [text-shadow:_0_0_30px_rgb(0_255_0_/_20%)]">
              Welcome to Buzzy.Chat
            </h2>
            <div className="max-w-2xl mx-auto space-y-6">
              <p className="text-xl font-['Press_Start_2P'] text-[#2bbd2b]/80">
                A decentralized social chat platform powered by blockchain technology
              </p>
              <div className="bg-[#2bbd2b]/5 backdrop-blur-sm rounded-lg p-6 shadow-lg max-w-md mx-auto border border-[#2bbd2b]/20">
                <ul className="text-left space-y-4">
                  <li className="flex items-center gap-2 text-[#2bbd2b]">
                    <span className="text-xl">🔒</span>
                    <span className="font-['Press_Start_2P'] text-xs">Secure wallet-based auth</span>
                  </li>
                  <li className="flex items-center gap-2 text-[#2bbd2b]">
                    <span className="text-xl">💬</span>
                    <span className="font-['Press_Start_2P'] text-xs">Real-time messaging</span>
                  </li>
                  <li className="flex items-center gap-2 text-[#2bbd2b]">
                    <span className="text-xl">🌐</span>
                    <span className="font-['Press_Start_2P'] text-xs">Public chat channels</span>
                  </li>
                  <li className="flex items-center gap-2 text-[#2bbd2b]">
                    <span className="text-xl">🤝</span>
                    <span className="font-['Press_Start_2P'] text-xs">Friend request system</span>
                  </li>
                  <li className="flex items-center gap-2 text-[#2bbd2b]">
                    <span className="text-xl">🎨</span>
                    <span className="font-['Press_Start_2P'] text-xs">Retro gaming design</span>
                  </li>
                </ul>
              </div>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#2bbd2b]/10 rounded-full border border-[#2bbd2b]/20 text-[#2bbd2b] font-['Press_Start_2P'] text-xs">
                Connect wallet to start chatting
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}