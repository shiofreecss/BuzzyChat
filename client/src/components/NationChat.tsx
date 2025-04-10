import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sendNationMessage, sendGlobalMessage } from '@/pusher-client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ChatMessage from "@/components/ChatMessage";
import { Nation } from "@/components/NationSelect";
import { IoSend } from "react-icons/io5";
import { useToast } from "@/hooks/use-toast";
import { TbWorld, TbPlanet, TbMars } from "react-icons/tb";
import { GiRingedPlanet } from "react-icons/gi";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";

interface NationChatProps {
  nationCode?: string;
  currentUserAddress?: string;
  isGlobalChat?: boolean;
}

// Helper to get the appropriate planet icon for each nation
const getPlanetIcon = (nationCode: string) => {
  switch (nationCode) {
    case 'EARTH':
      return <TbPlanet className="h-6 w-6 text-blue-500" />;
    case 'MARS':
      return <TbMars className="h-6 w-6 text-red-500" />;
    case 'JUPITER':
      return <TbPlanet className="h-6 w-6 text-orange-400" />;
    case 'SATURN':
      return <GiRingedPlanet className="h-6 w-6 text-yellow-400" />;
    case 'VENUS':
      return <TbPlanet className="h-6 w-6 text-yellow-200" />;
    case 'MERCURY':
      return <TbPlanet className="h-6 w-6 text-gray-400" />;
    case 'NEPTUNE':
      return <TbPlanet className="h-6 w-6 text-blue-700" />;
    case 'URANUS':
      return <TbPlanet className="h-6 w-6 text-cyan-400" />;
    case 'PLUTO':
      return <TbPlanet className="h-6 w-6 text-purple-400" />;
    case 'GLOBAL':
      return <TbWorld className="h-6 w-6 text-green-500" />;
    default:
      return <TbPlanet className="h-6 w-6" />;
  }
};

// Get background class based on nation
const getPlanetBackground = (nationCode: string | undefined) => {
  if (!nationCode) return "bg-black";
  
  switch (nationCode) {
    case 'EARTH':
      return "bg-gradient-to-b from-blue-950 to-blue-900";
    case 'MARS':
      return "bg-gradient-to-b from-red-950 to-red-900";
    case 'JUPITER':
      return "bg-gradient-to-b from-orange-950 to-orange-900";
    case 'SATURN':
      return "bg-gradient-to-b from-yellow-950 to-yellow-900";
    case 'VENUS':
      return "bg-gradient-to-b from-yellow-950 to-amber-900";
    case 'MERCURY':
      return "bg-gradient-to-b from-gray-950 to-gray-800";
    case 'NEPTUNE':
      return "bg-gradient-to-b from-blue-950 to-indigo-900";
    case 'URANUS':
      return "bg-gradient-to-b from-cyan-950 to-blue-900";
    case 'PLUTO':
      return "bg-gradient-to-b from-purple-950 to-indigo-950";
    case 'GLOBAL':
      return "bg-gradient-to-b from-green-950 to-green-900";
    default:
      return "bg-black";
  }
};

export default function NationChat({
  nationCode,
  currentUserAddress,
  isGlobalChat = false
}: NationChatProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query for the selected nation
  const { data: selectedNation } = useQuery({
    queryKey: [nationCode ? `/api/nations/${nationCode}` : null],
    queryFn: async () => {
      if (!nationCode || isGlobalChat) return null;
      
      try {
        const response = await fetch(`/api/nations/${nationCode}`);
        if (!response.ok) {
          throw new Error(`Error fetching nation: ${response.status}`);
        }
        return await response.json() as Nation;
      } catch (error) {
        console.error('Error fetching nation:', error);
        throw error;
      }
    },
    enabled: !!nationCode && !isGlobalChat
  });
  
  // Query to get messages for this nation or global chat
  const { data: messages = [] } = useQuery({
    queryKey: [isGlobalChat ? '/api/messages?isGlobal=true' : `/api/messages?nationId=${selectedNation?.id}`],
    queryFn: async () => {
      try {
        const url = isGlobalChat
          ? '/api/messages?isGlobal=true'
          : `/api/messages?nationId=${selectedNation?.id}`;
          
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error fetching messages: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
    },
    enabled: isGlobalChat || (!!selectedNation?.id),
    refetchInterval: 3000
  });
  
  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Handle scroll events to show/hide scroll button
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Show button when scrolled up more than 200px from bottom
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 200;
    setShowScrollButton(isScrolledUp);
  };
  
  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    if (!currentUserAddress) {
      toast({
        title: "Cannot send message",
        description: "You need to connect your wallet first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (isGlobalChat) {
        await sendGlobalMessage(message, currentUserAddress);
      } else if (selectedNation) {
        await sendNationMessage(message, currentUserAddress, selectedNation.id);
      } else {
        toast({
          title: "Cannot send message",
          description: "No planet selected",
          variant: "destructive"
        });
        return;
      }
      
      setMessage('');
      
      // Invalidate the query to refresh messages
      queryClient.invalidateQueries({
        queryKey: [isGlobalChat ? '/api/messages?isGlobal=true' : `/api/messages?nationId=${selectedNation?.id}`]
      });
      
      // Scroll to bottom after sending a message
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error sending message",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  const activeChatCode = isGlobalChat ? 'GLOBAL' : nationCode;
  const chatTitle = isGlobalChat 
    ? "Global Chat" 
    : selectedNation 
      ? `${selectedNation.displayName} Chat` 
      : "Planet Chat";
  
  return (
    <div className={`flex flex-col h-full relative ${getPlanetBackground(activeChatCode)}`}>
      <div className="sticky top-0 z-10 p-3 md:p-4 border-b border-[#f4b43e]/30 backdrop-blur-sm bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeChatCode && getPlanetIcon(activeChatCode)}
            <h2 className="text-lg md:text-xl font-semibold text-[#f4b43e]">{chatTitle}</h2>
          </div>
          <div className="text-xs text-[#f4b43e]/60 font-mono">
            {messages.length} messages
          </div>
        </div>
      </div>
      
      <div className="flex-grow relative">
        <ScrollArea 
          ref={scrollAreaRef} 
          className="h-full pr-2" 
          onScroll={handleScroll}
        >
          <div className="p-3 md:p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-[#f4b43e]/50 font-mono text-sm">
                No messages yet. Be the first to chat!
              </div>
            ) : (
              messages.map((msg: any) => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  isOwn={msg.fromAddress === currentUserAddress} 
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {showScrollButton && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 right-4 rounded-full p-2 bg-[#f4b43e] text-black shadow-lg opacity-90 hover:opacity-100"
            onClick={scrollToBottom}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <form 
        onSubmit={handleSendMessage} 
        className="sticky bottom-0 z-10 border-t p-2 md:p-3 flex items-center gap-2 border-[#f4b43e]/30 backdrop-blur-sm bg-black/20"
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow bg-black/50 border-[#f4b43e]/30 text-[#f4b43e] font-mono text-sm placeholder:text-[#f4b43e]/40"
        />
        <Button 
          type="submit" 
          size="sm" 
          className="bg-[#f4b43e] hover:bg-[#f4b43e]/80 text-black"
        >
          <IoSend className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
} 