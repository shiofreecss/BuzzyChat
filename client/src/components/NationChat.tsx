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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
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
    <div className={`flex flex-col h-full ${getPlanetBackground(activeChatCode)}`}>
      <div className="p-4 border-b border-[#f4b43e]/30">
        <div className="flex items-center gap-2">
          {activeChatCode && getPlanetIcon(activeChatCode)}
          <h2 className="text-xl font-semibold">{chatTitle}</h2>
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
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
      
      <form 
        onSubmit={handleSendMessage} 
        className="border-t p-4 flex items-center gap-2 border-[#f4b43e]/30"
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow bg-black/50"
        />
        <Button type="submit" size="sm" className="bg-[#f4b43e] hover:bg-[#f4b43e]/80 text-black">
          <IoSend className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
} 