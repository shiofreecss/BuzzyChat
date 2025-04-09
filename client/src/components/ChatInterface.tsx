import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Trash2, Smile, ArrowLeft, Wifi, WifiOff } from "lucide-react";
import ChatMessage from "./ChatMessage";
import type { Message, User } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { sendMessage as sendMessageApi } from "@/pusher-client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatInterfaceProps {
  address: string;
  selectedUser?: User;
  onSelectUser?: (user?: User) => void;
  showBackButton?: boolean;
  isPublicChat?: boolean;
}

export default function ChatInterface({
  address,
  selectedUser,
  onSelectUser,
  showBackButton = false,
  isPublicChat = false
}: ChatInterfaceProps) {
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [lastTypingTime, setLastTypingTime] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use the WebSocketContext instead of creating our own connection
  const { socket, isConnected, sendMessage, isPusherMode } = useWebSocket();

  const { data: initialMessages = [] } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
  });

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Initialize messages from the query
  useEffect(() => {
    setAllMessages(initialMessages);
  }, [initialMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [allMessages]);

  // Set up message listener for this specific component
  useEffect(() => {
    // Skip this for Pusher mode - Pusher uses HTTP API instead of WebSockets
    if (isPusherMode) return;
    
    const messageHandler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle typing status
        if (data.type === 'typing') {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.add(data.fromAddress);
            return newSet;
          });

          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.fromAddress);
              return newSet;
            });
          }, 3000);
          return;
        }

        // Handle chat messages
        if (!data.type || data.type === 'message') {
          setAllMessages(prev => [...prev, data]);
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    // Add the event listener to the socket
    if (socket) {
      socket.addEventListener('message', messageHandler);
    }

    // Clean up
    return () => {
      if (socket) {
        socket.removeEventListener('message', messageHandler);
      }
    };
  }, [socket, isPusherMode]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setIsSending(true);
    
    try {
      if (isPusherMode) {
        // In Pusher mode, send via HTTP API
        await sendMessageApi(
          newMessage.trim(),
          address,
          selectedUser?.address || null
        );
        
        // Refresh messages after sending
        await queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      } else if (isConnected) {
        // In WebSocket mode, send via WebSocket
        const message = {
          type: 'message',
          content: newMessage.trim(),
          fromAddress: address,
          toAddress: selectedUser?.address || null,
          timestamp: new Date().toISOString()
        };
        
        sendMessage(message);
      } else {
        // Not connected - fallback to HTTP API
        await sendMessageApi(
          newMessage.trim(),
          address,
          selectedUser?.address || null
        );
        
        // Refresh messages after sending
        await queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      }
      
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message",
        duration: 3000,
      });
    } finally {
      setIsSending(false);
    }
  };

  const clearMessages = async () => {
    try {
      await apiRequest("DELETE", "/api/messages");
      await queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      toast({
        title: "Success",
        description: "Messages cleared",
        duration: 3000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear messages",
        duration: 3000,
      });
    }
  };

  const sendTypingStatus = () => {
    if (Date.now() - lastTypingTime > 2000 && isConnected) {
      sendMessage({
        type: 'typing',
        fromAddress: address,
        toAddress: selectedUser?.address || null,
      });
      setLastTypingTime(Date.now());
    }
  };

  // Filter messages based on current chat context
  const filteredMessages = allMessages.filter(msg => {
    if (selectedUser) {
      return (msg.fromAddress === address && msg.toAddress === selectedUser.address) ||
             (msg.fromAddress === selectedUser.address && msg.toAddress === address);
    }
    return !msg.toAddress; // Public messages
  });

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage(prev => prev + emoji.native);
  };

  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get connection status for display
  const connectionStatus = isPusherMode ? true : isConnected;

  return (
    <Card className="h-full flex flex-col bg-black border border-[#f4b43e]">
      <div className="p-4 border-b border-[#f4b43e]/30 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSelectUser?.(undefined)}
              className="md:hidden hover:bg-[#f4b43e]/10 text-[#f4b43e]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h2 className="text-lg font-mono text-[#f4b43e]">
            {selectedUser
              ? `Chat with ${selectedUser.username || shortenAddress(selectedUser.address)}`
              : "Public Chat"
            }
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-2">
                  {connectionStatus ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{connectionStatus ? 
                  (isPusherMode ? "Connected via Pusher" : "Connected via WebSocket") : 
                  "Disconnected"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearMessages}
          className="text-[#f4b43e] hover:bg-[#f4b43e]/10"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {filteredMessages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isOwn={msg.fromAddress === address}
          />
        ))}
        {typingUsers.size > 0 && (
          <div className="text-sm text-[#f4b43e]/70 italic mb-2 font-mono">
            {Array.from(typingUsers).map(addr =>
              shortenAddress(addr)
            ).join(", ")} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      <div className="p-4 border-t border-[#f4b43e]/30 flex gap-2">
        <div className="flex-1 flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-[#f4b43e] hover:bg-[#f4b43e]/10"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 border-none shadow-lg shadow-[#f4b43e]/20">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="dark"
                emojiSize={20}
                emojiButtonSize={28}
                maxFrequentRows={1}
              />
            </PopoverContent>
          </Popover>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === 'Enter') handleSendMessage();
              sendTypingStatus();
            }}
            placeholder={connectionStatus ? "Type your message..." : "Connection unavailable..."}
            disabled={!connectionStatus && !isPusherMode}
            className="bg-transparent text-[#f4b43e] border-[#f4b43e]/30 placeholder:text-[#f4b43e]/40 font-mono text-sm"
          />
        </div>

        <Button
          onClick={handleSendMessage}
          disabled={isSending || !newMessage.trim() || (!connectionStatus && !isPusherMode)}
          className="bg-[#f4b43e]/10 hover:bg-[#f4b43e]/20 text-[#f4b43e] border border-[#f4b43e]/30"
        >
          {isSending ? "..." : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </Card>
  );
}