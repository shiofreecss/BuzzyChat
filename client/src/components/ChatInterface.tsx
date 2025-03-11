import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send, Trash2, Smile } from "lucide-react";
import ChatMessage from "./ChatMessage";
import type { Message, User } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ThemeCustomizer, { type ChatTheme } from "./ThemeCustomizer";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChatInterfaceProps {
  address: string;
  selectedUser?: User;
  onSelectUser?: (user?: User) => void;
}

export default function ChatInterface({ address, selectedUser, onSelectUser }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const socketRef = useRef<WebSocket>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [chatTheme, setChatTheme] = useState<ChatTheme>({
    primary: "#7c3aed",
    secondary: "#1f2937",
    background: "#111827",
  });

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
      console.log("Received message:", event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          toast({
            variant: "destructive",
            title: "Message Error",
            description: data.error,
          });
          return;
        }

        // If it's a welcome message, don't add it to chat
        if (data.connected) return;

        setMessages(prev => [...prev, data]);
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

  return (
    <Card className="flex-1 h-[600px] flex flex-col" style={{ backgroundColor: chatTheme.background }}>
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-100">
            {selectedUser
              ? `Chat with ${selectedUser.username || selectedUser.address}`
              : "Public Chat"
            }
          </h2>
          {selectedUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectUser?.(undefined)}
              className="text-xs"
              style={{ backgroundColor: chatTheme.secondary }}
            >
              Return to Public Chat
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ThemeCustomizer onThemeChange={setChatTheme} currentTheme={chatTheme} />
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMessages}
            className="text-gray-400 hover:text-red-400"
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
        <div ref={messagesEndRef} />
      </ScrollArea>

      <div className="p-4 border-t border-gray-800 flex gap-2">
        <div className="flex-1 flex gap-2">
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-gray-300"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 border-none">
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
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={!isConnected}
            className="bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400"
          />
        </div>
        <Button
          onClick={sendMessage}
          disabled={!isConnected}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}