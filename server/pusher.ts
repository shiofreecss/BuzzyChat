import Pusher from 'pusher';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || 'us2',
  useTLS: true,
});

// Check if Pusher is properly configured
const isPusherConfigured = !!(
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.PUSHER_CLUSTER
);

console.log(`Pusher configuration status: ${isPusherConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);

// Helper functions for common channels
export const triggerPrivateMessage = (fromAddress: string, toAddress: string, message: any) => {
  const channelName = `private-chat-${[fromAddress, toAddress].sort().join('-')}`;
  return pusher.trigger(channelName, 'new-message', message);
};

export const triggerPublicMessage = (message: any) => {
  return pusher.trigger('public-chat', 'new-message', message);
};

export const triggerGlobalMessage = (message: any) => {
  return pusher.trigger('global-chat', 'new-message', message);
};

export const triggerNationMessage = (nationCode: string, message: any) => {
  const channelName = `nation-chat-${nationCode}`;
  return pusher.trigger(channelName, 'new-message', message);
};

export const triggerTypingStatus = (fromAddress: string, toAddress: string, isTyping: boolean) => {
  const channelName = `private-chat-${[fromAddress, toAddress].sort().join('-')}`;
  return pusher.trigger(channelName, 'typing', { fromAddress, isTyping });
};

export const triggerReaction = (messageId: number, reaction: any) => {
  return pusher.trigger('reactions', `reaction-${messageId}`, reaction);
};

export const triggerUserStatus = (address: string, isOnline: boolean) => {
  return pusher.trigger('user-status', 'status-change', { address, isOnline });
};

// Export the Pusher instance and configuration status
export { pusher, isPusherConfigured }; 