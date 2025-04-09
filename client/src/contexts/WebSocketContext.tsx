import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { checkPusherEnvironment, initializePusher } from "../pusher-client";

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
  const isNetlifyRef = useRef(false);

  // Check if we're on Netlify
  useEffect(() => {
    // Check if we're on Netlify based on domain name
    const isNetlify = window.location.hostname.includes('netlify.app');
    isNetlifyRef.current = isNetlify;
    
    // If we're on Netlify, we know WebSockets won't work, so default to Pusher mode
    if (isNetlify) {
      console.log('Running on Netlify - automatically using Pusher for real-time communication');
      testPusherConnection();
    } else {
      // On other platforms, try Pusher first, then fall back to WebSockets
      checkPusherStatus();
    }
    
    return () => cleanup();
  }, []);

  const testPusherConnection = async () => {
    try {
      // Try to initialize Pusher directly
      const pusher = await initializePusher();
      if (pusher) {
        console.log('Pusher connection successful');
        setIsPusherMode(true);
        setIsConnected(true);
        
        // No need to show toast on initial page load for Netlify
        if (!isNetlifyRef.current) {
          toast({
            title: "Chat Connected",
            description: "Using Pusher for real-time messaging",
            duration: 3000,
          });
        }
      } else {
        console.error('Pusher initialization failed, trying WebSockets');
        // Only try WebSockets if not on Netlify
        if (!isNetlifyRef.current) {
          setupWebSocket();
        } else {
          // On Netlify, we know WebSockets won't work, so just show a subtle message
          console.log('On Netlify without Pusher config - chat will be limited');
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error('Error testing Pusher connection:', error);
      // Only try WebSockets if not on Netlify
      if (!isNetlifyRef.current) {
        setupWebSocket();
      }
    }
  };

  const checkPusherStatus = async () => {
    try {
      const envStatus = await checkPusherEnvironment();
      const isPusherConfigured = envStatus.pusher_key_set && envStatus.pusher_cluster_set;
      
      if (isPusherConfigured) {
        testPusherConnection();
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
    
    // Don't attempt WebSocket connection if we're on Netlify
    if (isNetlifyRef.current) {
      console.log('Not attempting WebSocket on Netlify');
      return;
    }

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
        
        // Only show the toast once and only if we're not on Netlify
        // Netlify users expect WebSockets to fail so we don't need to notify them
        if (!hasToastedErrorRef.current && !isPusherMode && !isNetlifyRef.current) {
          hasToastedErrorRef.current = true;
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Chat connection error occurred. Checking for Pusher fallback...",
            duration: 5000,
          });
          
          // Try Pusher as a fallback
          testPusherConnection();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      
      // Try Pusher as a fallback if WebSocket creation fails
      if (!isPusherMode) {
        testPusherConnection();
      }
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
      if (!hasToastedErrorRef.current && !isNetlifyRef.current) {
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