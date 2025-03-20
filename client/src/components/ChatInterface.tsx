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
  const maxReconnectAttempts = 5;
  const reconnectAttemptRef = useRef(0);
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
    setMessages(initialMessages.filter(msg => {
      if (selectedUser) {
        return (msg.fromAddress === address && msg.toAddress === selectedUser.address) ||
               (msg.fromAddress === selectedUser.address && msg.toAddress === address);
      }
      return !msg.toAddress; // Public messages
    }));
  }, [initialMessages, selectedUser, address]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    // More robust way to construct WebSocket URL
    const wsUrl = window.location.origin.replace(/^http/, 'ws') + '/ws';

    try {
      console.log("Attempting WebSocket connection to:", wsUrl);
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttemptRef.current = 0;
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received WebSocket message:", data);

          // Handle system messages (like connection status)
          if (data.type === 'system' && data.message === 'connected') {
            toast({
              title: "Connected",
              description: "Chat connection established",
              duration: 3000,
            });
            return;
          }

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
            return;
          }

          // Handle regular messages and errors
          if (data.error) {
            if (!data.error.includes("Invalid message format")) {
              toast({
                variant: "destructive",
                title: "Message Error",
                description: data.error,
                duration: 3000,
              });
            }
            return;
          }

          if (!data.type || data.type === 'message') {
            setMessages(prev => {
              // Only add the message if it belongs in the current chat context
              const isRelevantMessage = selectedUser
                ? (data.fromAddress === address && data.toAddress === selectedUser.address) ||
                  (data.fromAddress === selectedUser.address && data.toAddress === address)
                : !data.toAddress;

              if (isRelevantMessage) {
                console.log("Adding message to chat:", data);
                return [...prev, data];
              }
              return prev;
            });
          }
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };

      socketRef.current.onclose = () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);

        if (!isReconnecting && reconnectAttemptRef.current < maxReconnectAttempts) {
          setIsReconnecting(true);
          reconnectAttemptRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect... (Attempt ${reconnectAttemptRef.current})`);
            connectWebSocket();
          }, Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000));
        } else if (reconnectAttemptRef.current >= maxReconnectAttempts) {
          toast({
            variant: "destructive",
            title: "Connection Lost",
            description: "Unable to reconnect to chat server. Please refresh the page.",
            duration: 0, // Don't auto-dismiss
          });
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setIsConnected(false);
    }
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
      type: 'message',
      content: newMessage.trim(),
      fromAddress: address,
      toAddress: selectedUser?.address || null,
      timestamp: new Date().toISOString()
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
    const now = Date.now();
    if (now - lastTypingTime > 2000) { 
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'typing',
          fromAddress: address,
          toAddress: selectedUser?.address || null,
        }));
        setLastTypingTime(now);
      }
    }
  };

  const filteredMessages = messages;

  const handleEmojiSelect = (emoji: any) => {
    setShowEmojiPicker(false);
    setNewMessage(prev => prev + emoji.native);
  };

  const handleReaction = (messageId: number, emoji: string) => {
    toast({
      title: "Reaction Added",
      description: `Added reaction ${emoji} to message`,
      duration: 3000, 
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
          {selectedUser && !showBackButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectUser?.(undefined)}
              className="text-xs hidden md:inline-flex border-[#f4b43e]/20 text-[#f4b43e] hover:bg-[#f4b43e]/10"
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
            className="text-[#f4b43e] hover:bg-[#f4b43e]/10"
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
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
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
            onChange={handleInputChange}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={!isConnected}
            className="bg-[#f4b43e]/10 border-[#f4b43e]/20 text-[#f4b43e] placeholder-[#f4b43e]/50 focus:border-[#f4b43e]/50"
          />
        </div>
        <Button
          onClick={sendMessage}
          disabled={!isConnected}
          className="bg-[#f4b43e] hover:bg-[#f4b43e] text-black shadow-lg shadow-[#f4b43e]/20"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}