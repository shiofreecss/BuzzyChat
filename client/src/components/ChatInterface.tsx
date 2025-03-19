import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Trash2, Smile, ArrowLeft } from "lucide-react";
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [lastTypingTime, setLastTypingTime] = useState(0);
  const socketRef = useRef<WebSocket>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const queryClient = useQueryClient();


  const { data: initialMessages = [] } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
  });

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log("Attempting WebSocket connection to:", wsUrl);
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      console.log("WebSocket connection established");
      setIsConnected(true);
      setIsReconnecting(false);
      toast({
        title: "Connected",
        description: "Chat connection established",
      });
    };

    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'typing') {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.add(data.fromAddress);
            return newSet;
          });

          // Clear typing indicator after 3 seconds
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
        } else {
          // Handle regular messages
          if (data.error) {
            toast({
              variant: "destructive",
              title: "Message Error",
              description: data.error,
            });
            return;
          }
          if (!data.connected) {
            setMessages(prev => [...prev, data]);
          }
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    socketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect to chat server",
      });
    };

    socketRef.current.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);

      if (!isReconnecting) {
        setIsReconnecting(true);
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect...");
          connectWebSocket();
        }, 5000);
      }
    };
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current || !isConnected) return;

    const message = {
      content: newMessage,
      fromAddress: address,
      toAddress: selectedUser?.address,
    };

    console.log("Sending message:", message);
    socketRef.current.send(JSON.stringify(message));
    setNewMessage("");
  };

  const clearMessages = async () => {
    try {
      await apiRequest("DELETE", "/api/messages");
      await queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      toast({
        title: "Chat Cleared",
        description: "All messages have been cleared",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear messages",
      });
    }
  };

  const sendTypingStatus = () => {
    const now = Date.now();
    if (now - lastTypingTime > 2000) { // Only send every 2 seconds
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'typing',
          fromAddress: address,
          toAddress: selectedUser?.address,
        }));
        setLastTypingTime(now);
      }
    }
  };

  // Filter messages based on the selected chat mode (public or private)
  const filteredMessages = selectedUser
    ? messages.filter(msg =>
        msg && msg.fromAddress && msg.toAddress && (
          (msg.fromAddress === address && msg.toAddress === selectedUser.address) ||
          (msg.fromAddress === selectedUser.address && msg.toAddress === address)
        )
      )
    : messages.filter(msg => msg && !msg.toAddress);

  const handleEmojiSelect = (emoji: any) => {
    setShowEmojiPicker(false);
    setNewMessage(prev => prev + emoji.native);
  };

  const handleReaction = (messageId: number, emoji: string) => {
    // In the future, this should send the reaction to the server
    toast({
      title: "Reaction Added",
      description: `Added reaction ${emoji} to message`,
    });
  };

  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    sendTypingStatus();
  };


  return (
    <Card className="flex-1 h-[calc(100vh-8rem)] sm:h-[600px] flex flex-col bg-black border border-[#00ff00]">
      <div className="p-4 border-b border-[#00ff00]/30 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSelectUser?.(undefined)}
              className="md:hidden hover:bg-[#00ff00]/10 text-[#00ff00]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h2 className="text-lg font-['Press_Start_2P'] text-[#00ff00]">
            {selectedUser
              ? `Chat with ${selectedUser.username || shortenAddress(selectedUser.address)}`
              : "Public Chat"
            }
          </h2>
          {selectedUser && !showBackButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectUser?.(undefined)}
              className="text-xs hidden md:inline-flex border-[#00ff00]/20 text-[#00ff00] hover:bg-[#00ff00]/10"
            >
              Return to Public Chat
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMessages}
            className="text-[#00ff00] hover:bg-[#00ff00]/10"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
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
          <div className="text-sm text-[#00ff00]/70 italic mb-2 font-mono">
            {Array.from(typingUsers).map(addr => 
              shortenAddress(addr)
            ).join(", ")} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      <div className="p-4 border-t border-[#00ff00]/30 flex gap-2">
        <div className="flex-1 flex gap-2">
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-[#00ff00] hover:bg-[#00ff00]/10"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 border-none shadow-lg shadow-[#00ff00]/20">
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
            onChange={handleInputChange}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={!isConnected}
            className="bg-[#00ff00]/10 border-[#00ff00]/20 text-[#00ff00] placeholder-[#00ff00]/50 focus:border-[#00ff00]/50"
          />
        </div>
        <Button
          onClick={sendMessage}
          disabled={!isConnected}
          className="bg-[#00ff00] hover:bg-[#00ff00] text-white shadow-lg shadow-[#00ff00]/20"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}