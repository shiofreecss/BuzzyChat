import { useState, useEffect, useCallback } from 'react';
import * as PusherClient from '../pusher-client';
import type Pusher from 'pusher-js';

// Type for the channels returned from subscribeToChannels
type Channels = ReturnType<typeof PusherClient.subscribeToChannels>;

interface UsePusherOptions {
  userAddress: string;
  onMessage?: (data: any) => void;
  onStatus?: (data: { address: string; isOnline: boolean }) => void;
  onTyping?: (data: { fromAddress: string; isTyping: boolean }) => void;
  onReaction?: (data: any) => void;
}

export function usePusher({
  userAddress,
  onMessage = () => {},
  onStatus = () => {},
  onTyping = () => {},
  onReaction = () => {},
}: UsePusherOptions) {
  const [pusher, setPusher] = useState<Pusher | null>(null);
  const [channels, setChannels] = useState<Channels | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize Pusher on component mount
  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      try {
        const pusherInstance = await PusherClient.initializePusher();
        if (!pusherInstance || !isMounted) return;
        
        setPusher(pusherInstance);
        
        const channelsInstance = PusherClient.subscribeToChannels(pusherInstance, userAddress);
        if (!channelsInstance || !isMounted) return;
        
        setChannels(channelsInstance);
        
        PusherClient.setupEventListeners(
          channelsInstance,
          onMessage,
          onStatus,
          onTyping,
          onReaction
        );
        
        setConnected(true);
      } catch (err) {
        console.error('Failed to initialize Pusher:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };
    
    if (userAddress) {
      initialize();
    }
    
    return () => {
      isMounted = false;
      if (pusher && channels) {
        PusherClient.cleanup(pusher, channels);
      }
    };
  }, [userAddress, onMessage, onStatus, onTyping, onReaction]);

  // Send message function
  const sendMessage = useCallback(
    (content: string, toAddress: string | null = null) => {
      if (!userAddress) {
        throw new Error('User address is required to send a message');
      }
      return PusherClient.sendMessage(content, userAddress, toAddress);
    },
    [userAddress]
  );

  // Send typing status function
  const sendTypingStatus = useCallback(
    (toAddress: string, isTyping: boolean) => {
      if (!userAddress) {
        throw new Error('User address is required to send typing status');
      }
      return PusherClient.sendTypingStatus(userAddress, toAddress, isTyping);
    },
    [userAddress]
  );

  // Send reaction function
  const sendReaction = useCallback(
    (messageId: number, emoji: string) => {
      if (!userAddress) {
        throw new Error('User address is required to send a reaction');
      }
      return PusherClient.sendReaction(messageId, userAddress, emoji);
    },
    [userAddress]
  );

  // Update online status
  const updateOnlineStatus = useCallback(
    (isOnline: boolean) => {
      if (!userAddress) {
        throw new Error('User address is required to update online status');
      }
      return PusherClient.updateOnlineStatus(userAddress, isOnline);
    },
    [userAddress]
  );

  // Update online status when component mounts/unmounts
  useEffect(() => {
    if (userAddress && connected) {
      updateOnlineStatus(true).catch(console.error);
      return () => {
        updateOnlineStatus(false).catch(console.error);
      };
    }
  }, [userAddress, connected, updateOnlineStatus]);

  return {
    pusher,
    connected,
    error,
    sendMessage,
    sendTypingStatus,
    sendReaction,
    updateOnlineStatus,
  };
} 