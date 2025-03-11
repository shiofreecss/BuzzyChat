import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";
import ChatMessage from "./ChatMessage";
import type { Message, User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface ChatInterfaceProps {
  address: string;
  selectedUser?: User;
}

export default function ChatInterface({ address, selectedUser }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket>();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: initialMessages = [] } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log("Attempting WebSocket connection to:", wsUrl);
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      console.log("WebSocket connection established");
      setIsConnected(true);
      toast({
        title: "Connected",
        description: "Chat connection established",
      });
    };

    socketRef.current.onmessage = (event) => {
      console.log("Received message:", event.data);
      const message = JSON.parse(event.data) as Message;
      setMessages(prev => [...prev, message]);
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
      toast({
        variant: "destructive",
        title: "Disconnected",
        description: "Chat connection lost",
      });
    };

    return () => {
      if (socketRef.current) {
        console.log("Closing WebSocket connection");
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  const filteredMessages = selectedUser
    ? messages.filter(msg => 
        (msg.fromAddress === address && msg.toAddress === selectedUser.address) ||
        (msg.fromAddress === selectedUser.address && msg.toAddress === address)
      )
    : messages.filter(msg => !msg.toAddress);

  return (
    <Card className="flex-1 h-[600px] flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">
          {selectedUser 
            ? `Chat with ${selectedUser.username || selectedUser.address}`
            : "Public Chat"
          }
        </h2>
      </div>
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {filteredMessages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isOwn={msg.fromAddress === address}
          />
        ))}
      </ScrollArea>
      <div className="p-4 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          disabled={!isConnected}
        />
        <Button
          onClick={sendMessage}
          disabled={!isConnected}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}