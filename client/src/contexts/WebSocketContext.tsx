import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { checkPusherEnvironment } from "../pusher-client";

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: any) => void;
  isPusherMode: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  sendMessage: () => {},
  isPusherMode: false
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPusherMode, setIsPusherMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const hasToastedErrorRef = useRef(false);

  // First check if we're on Netlify and should use Pusher instead
  useEffect(() => {
    const checkPusherStatus = async () => {
      try {
        const envStatus = await checkPusherEnvironment();
        const isPusherConfigured = envStatus.pusher_key_set && envStatus.pusher_cluster_set;
        
        if (isPusherConfigured) {
          console.log('Using Pusher for real-time messaging');
          setIsPusherMode(true);
          setIsConnected(true); // Consider Pusher as "connected" by default
          
          toast({
            title: "Using Pusher",
            description: "Chat will use Pusher instead of WebSockets",
            duration: 3000,
          });
        } else {
          // Only attempt WebSocket connection if Pusher is not configured
          setupWebSocket();
        }
      } catch (error) {
        console.error('Error checking Pusher status:', error);
        // Fallback to WebSockets if we can't check Pusher status
        setupWebSocket();
      }
    };
    
    checkPusherStatus();
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
  };

  const setupWebSocket = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    
    // Don't attempt WebSocket connection if we're using Pusher
    if (isPusherMode) return;

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    console.log('Attempting WebSocket connection to:', wsUrl);
    
    try {
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        hasToastedErrorRef.current = false;

        // Start sending ping messages
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString()
            }));
          }
        }, 30000);
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received:', data);

          if (data.type === 'system') {
            // Check if server indicates we should use Pusher
            if (data.pusher_enabled) {
              setIsPusherMode(true);
              cleanup(); // Clean up WebSocket resources
              
              toast({
                title: "Using Pusher",
                description: data.message || "Chat will use Pusher for real-time messaging",
                duration: 3000,
              });
            } else {
              toast({
                title: "Connected",
                description: "Chat connection established",
                duration: 3000,
              });
            }
            return;
          }

          if (data.type === 'reaction') {
            // When a reaction is received, invalidate the reactions query for the affected message
            console.log('Received reaction:', data);
            queryClient.invalidateQueries({ 
              queryKey: [`/api/messages/${data.data.messageId}/reactions`] 
            });
            return;
          }

          // Other message types will be handled by the components that need them
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      socketRef.current.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        // Don't attempt to reconnect if we're in Pusher mode
        if (!isPusherMode) {
          // Attempt to reconnect after a delay
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(setupWebSocket, 2000);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        
        // Only show the toast once
        if (!hasToastedErrorRef.current && !isPusherMode) {
          hasToastedErrorRef.current = true;
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Chat connection error occurred. Will continue trying to connect...",
            duration: 5000,
          });
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  };

  const sendMessage = (message: any) => {
    if (isPusherMode) {
      // If in Pusher mode, don't attempt to send via WebSocket
      console.log('In Pusher mode - messages should be sent via HTTP API');
      return;
    }
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
      if (!hasToastedErrorRef.current) {
        hasToastedErrorRef.current = true;
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Chat connection unavailable. Please try again later.",
          duration: 3000,
        });
      }
    }
  };

  return (
    <WebSocketContext.Provider value={{ 
      socket: socketRef.current, 
      isConnected, 
      sendMessage,
      isPusherMode
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export { WebSocketContext }; 