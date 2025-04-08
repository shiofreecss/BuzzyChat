import React, { createContext, useContext, useRef, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  sendMessage: () => {}
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pingIntervalRef = useRef<NodeJS.Timeout>();

  const setupWebSocket = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);

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
          toast({
            title: "Connected",
            description: "Chat connection established",
            duration: 3000,
          });
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
      
      // Attempt to reconnect after a delay
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(setupWebSocket, 2000);
    };

    socketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Chat connection error occurred",
        duration: 3000,
      });
    };
  };

  useEffect(() => {
    setupWebSocket();
    
    return () => {
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
  }, []);

  const sendMessage = (message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "WebSocket is not connected",
        duration: 3000,
      });
    }
  };

  return (
    <WebSocketContext.Provider value={{ 
      socket: socketRef.current, 
      isConnected, 
      sendMessage 
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export { WebSocketContext }; 