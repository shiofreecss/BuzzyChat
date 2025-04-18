import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import WalletConnect from "@/components/WalletConnect";
import ChatInterface from "@/components/ChatInterface";
import UserProfile from "@/components/UserProfile";
import ChatList from "@/components/ChatList";
import NationChat from "@/components/NationChat";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import MatrixFooter from "@/components/MatrixFooter";
import MatrixCursor from "@/components/MatrixCursor";
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
  const [selectedNation, setSelectedNation] = useState<string>();
  const [isGlobalChat, setIsGlobalChat] = useState(false);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [[page, direction], setPage] = useState([0, 0]);
  const [matrixCursorEnabled, setMatrixCursorEnabled] = useState(true);

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
      const formattedAddress = walletAddress.trim();
      console.log("Attempting to register user with address:", formattedAddress);
      
      const userData = {
        address: formattedAddress,
        username: null,
        nickname: null,
      };
      console.log("Sending user data:", userData);
      
      try {
        const response = await apiRequest('POST', '/api/users', userData);
        console.log("Registration successful:", response);
      } catch (apiError) {
        // If the API fails but we have a valid wallet address, continue anyway
        console.error("API error, but continuing with wallet:", apiError);
        // Show a less severe toast
        toast({
          title: "Limited Functionality",
          description: "Connected in offline mode. Some features may be limited.",
          duration: 5000,
        });
      }
      
      // Still set the address even if the API call failed
      setAddress(formattedAddress);
      localStorage.setItem('walletAddress', formattedAddress);
    } catch (error) {
      console.error('Registration error details:', error);
      toast({
        variant: "destructive",
        title: "Error Creating User",
        description: error instanceof Error ? error.message : "Failed to register user",
      });
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('walletAddress');
      setAddress(undefined);
      setShowProfile(false);
      setSelectedUser(undefined);
      setSelectedNation(undefined);
      setIsGlobalChat(false);
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
    setSelectedNation(undefined);
    setIsGlobalChat(false);
    if (isMobile) {
      setPage([1, 1]); // Animate forward
      setLocation('/chat');
    }
  };

  const handleBackToList = () => {
    setSelectedUser(undefined);
    setSelectedNation(undefined);
    setIsGlobalChat(false);
    if (isMobile) {
      setPage([0, -1]); // Animate backward
      setLocation('/');
    }
  };

  const handlePublicChat = () => {
    setSelectedUser(undefined);
    setSelectedNation(undefined);
    setIsGlobalChat(false);
    if (isMobile) {
      setPage([1, 1]); // Animate forward to show chat interface
      setLocation('/chat');
    }
  };

  const handleNationChat = (nationCode: string) => {
    setSelectedUser(undefined);
    setSelectedNation(nationCode);
    setIsGlobalChat(false);
    if (isMobile) {
      setPage([1, 1]); // Animate forward
      setLocation('/chat');
    }
  };

  const handleGlobalChat = () => {
    setSelectedUser(undefined);
    setSelectedNation(undefined);
    setIsGlobalChat(true);
    if (isMobile) {
      setPage([1, 1]); // Animate forward
      setLocation('/chat');
    }
  };

  const handleBackFromProfile = () => {
    setShowProfile(false);
    setPage([0, -1]); // Animate backward
  };

  const showChatInterface = !isMobile || (isMobile && location === '/chat');
  const showChatList = !isMobile || (isMobile && location === '/');

  // Determine which chat component to display
  const renderChatComponent = () => {
    if (selectedUser) {
      return (
        <ChatInterface 
          address={address}
          selectedUser={selectedUser}
          onSelectUser={handleBackToList}
          showBackButton={isMobile}
          isPublicChat={false}
        />
      );
    } else if (selectedNation) {
      return (
        <NationChat
          nationCode={selectedNation}
          currentUserAddress={address}
          isGlobalChat={false}
        />
      );
    } else if (isGlobalChat) {
      return (
        <NationChat
          currentUserAddress={address}
          isGlobalChat={true}
        />
      );
    } else {
      return (
        <ChatInterface 
          address={address}
          selectedUser={undefined}
          onSelectUser={handleBackToList}
          showBackButton={isMobile}
          isPublicChat={true}
        />
      );
    }
  };

  return (
    <>
      {/* Matrix cursor effect follows the mouse when dragging */}
      <MatrixCursor enabled={matrixCursorEnabled} />
      <div className="min-h-screen bg-[#111111] text-[#f4b43e] flex flex-col relative">
        <Header
          onConnect={handleConnect}
          onProfileClick={() => {
            setShowProfile(true);
            setPage([1, 1]); // Animate forward
          }}
          onLogout={handleLogout}
          connected={!!address}
          address={address}
          toggleMatrixCursor={() => setMatrixCursorEnabled(!matrixCursorEnabled)}
          matrixCursorEnabled={matrixCursorEnabled}
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
                          onNationChat={handleNationChat}
                          onGlobalChat={handleGlobalChat}
                          selectedUser={selectedUser}
                          selectedNation={selectedNation}
                          isGlobalChat={isGlobalChat}
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
                        {renderChatComponent()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </AnimatePresence>
          ) : (
            <div className="text-center py-20 space-y-8">
              <h2 className="text-4xl font-mono text-[#f4b43e] [text-shadow:_0_0_30px_rgb(244_180_62_/_40%)]">
                Welcome to Buzzy.Chat
              </h2>
              <div className="max-w-2xl mx-auto space-y-6">
                <p className="text-xl font-mono text-[#f4b43e]/80">
                  Connect, Chat, Create with Web3
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-[#1a1a1a] rounded-lg p-6 shadow-lg border border-[#f4b43e]/20">
                    <h3 className="text-lg font-mono text-[#f4b43e] mb-2">Secure Chat</h3>
                    <p className="text-sm text-[#f4b43e]/70">
                      End-to-end encryption and blockchain authentication ensures your conversations stay private and secure.
                    </p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-6 shadow-lg border border-[#f4b43e]/20">
                    <h3 className="text-lg font-mono text-[#f4b43e] mb-2">Web3 Integration</h3>
                    <p className="text-sm text-[#f4b43e]/70">
                      Connect with MetaMask or Coinbase Wallet to start chatting with your Web3 community.
                    </p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-6 shadow-lg border border-[#f4b43e]/20">
                    <h3 className="text-lg font-mono text-[#f4b43e] mb-2">Rich Features</h3>
                    <p className="text-sm text-[#f4b43e]/70">
                      Emoji reactions, typing indicators, and real-time messaging enhance your chat experience.
                    </p>
                  </div>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-6 shadow-lg max-w-md mx-auto border border-[#f4b43e]/20">
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] rounded-full border border-[#f4b43e]/20 text-[#f4b43e] font-mono text-xs">
                        Connect wallet to enter the Matrix
                      </div>
                    </div>
                    <div className="h-px bg-[#f4b43e]/20"></div>
                    <div className="text-center font-mono text-[#f4b43e] text-xs space-y-4">
                      <p>A decentralized chat platform</p>
                      <p>for web3 communities</p>
                    </div>
                    <WalletConnect 
                      onConnect={handleConnect} 
                      onProfileClick={() => {}}
                      onLogout={handleLogout}
                      connected={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <MatrixFooter />
      </div>
    </>
  );
}