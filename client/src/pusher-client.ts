import Pusher from 'pusher-js';

// Types for Pusher channels
type Channel = ReturnType<Pusher['subscribe']>;

type Channels = {
  publicChannel: Channel;
  privateChannel?: Channel;
  statusChannel: Channel;
  reactionsChannel: Channel;
  nationChannel?: Channel;
  globalChannel: Channel;
};

// Types for message handlers
type MessageHandler = (data: any) => void;
type StatusHandler = (data: { address: string; isOnline: boolean }) => void;
type TypingHandler = (data: { fromAddress: string; isTyping: boolean }) => void;
type ReactionHandler = (data: any) => void;

// Fetch Pusher configuration from server
export async function initializePusher(): Promise<Pusher | null> {
  try {
    const response = await fetch('/.netlify/functions/ws');
    
    if (!response.ok) {
      console.error(`Server returned status ${response.status}: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log('Pusher config response:', data); // Debug the actual response
    
    if (data.status !== 'pusher_mode') {
      console.warn('Pusher mode not active:', data.message);
      return null;
    }
    
    // Verify Pusher config has required values
    if (!data.pusher_config?.key || !data.pusher_config?.cluster) {
      console.error('Invalid Pusher configuration:', data.pusher_config);
      return null;
    }
    
    return new Pusher(data.pusher_config.key, {
      cluster: data.pusher_config.cluster,
      authEndpoint: '/api/pusher/auth',
    });
  } catch (error) {
    console.error('Failed to initialize Pusher:', error);
    return null;
  }
}

// Create a consistent private channel name between two addresses
function getPrivateChannelName(address1: string, address2: string | null): string | null {
  if (!address2) return null;
  
  // Sort addresses to ensure consistent channel naming regardless of sender/receiver
  const addresses = [address1, address2].sort();
  return `private-chat-${addresses.join('-')}`;
}

// Get nation channel name
function getNationChannelName(nationCode: string): string {
  return `nation-chat-${nationCode}`;
}

// Subscribe to necessary channels
export function subscribeToChannels(
  pusher: Pusher | null, 
  userAddress: string, 
  nationCode?: string
): Channels | null {
  if (!pusher) return null;
  
  try {
    const publicChannel = pusher.subscribe('public-chat');
    const statusChannel = pusher.subscribe('user-status');
    const reactionsChannel = pusher.subscribe('reactions');
    const globalChannel = pusher.subscribe('global-chat');
    
    // Private channel for direct messages
    const privateChannelName = `private-chat-${userAddress}`;
    const privateChannel = userAddress ? pusher.subscribe(privateChannelName) : undefined;
    
    // Nation-specific channel
    let nationChannel;
    if (nationCode) {
      const nationChannelName = getNationChannelName(nationCode);
      nationChannel = pusher.subscribe(nationChannelName);
    }
    
    return { 
      publicChannel, 
      privateChannel, 
      statusChannel, 
      reactionsChannel, 
      nationChannel, 
      globalChannel 
    };
  } catch (error) {
    console.error('Error subscribing to channels:', error);
    return null;
  }
}

// Set up event listeners for messages and status updates
export function setupEventListeners(
  channels: Channels | null, 
  messageHandler: MessageHandler,
  statusHandler: StatusHandler,
  typingHandler: TypingHandler,
  reactionHandler: ReactionHandler
): void {
  if (!channels) return;
  
  channels.publicChannel.bind('new-message', messageHandler);
  channels.globalChannel.bind('new-message', messageHandler);
  
  if (channels.privateChannel) {
    channels.privateChannel.bind('new-message', messageHandler);
    channels.privateChannel.bind('typing', typingHandler);
  }
  
  if (channels.nationChannel) {
    channels.nationChannel.bind('new-message', messageHandler);
  }
  
  channels.statusChannel.bind('status-change', statusHandler);
  channels.reactionsChannel.bind('reaction', reactionHandler);
}

// API request helper with error handling
async function apiRequest(url: string, method: string, data: any) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }
  
  return response.json();
}

// Send message through HTTP API
export async function sendMessage(
  content: string, 
  fromAddress: string, 
  toAddress: string | null = null,
  nationId: number | null = null,
  isGlobal: boolean = false
) {
  try {
    return apiRequest('/api/messages', 'POST', { 
      content, 
      fromAddress, 
      toAddress,
      nationId,
      isGlobal
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Send message to nation-specific chat
export async function sendNationMessage(
  content: string,
  fromAddress: string,
  nationId: number
) {
  try {
    return sendMessage(content, fromAddress, null, nationId, false);
  } catch (error) {
    console.error('Error sending nation message:', error);
    throw error;
  }
}

// Send message to global chat
export async function sendGlobalMessage(
  content: string,
  fromAddress: string
) {
  try {
    return sendMessage(content, fromAddress, null, null, true);
  } catch (error) {
    console.error('Error sending global message:', error);
    throw error;
  }
}

// Send typing indicator
export async function sendTypingStatus(fromAddress: string, toAddress: string, isTyping: boolean) {
  try {
    return apiRequest('/api/typing', 'POST', { fromAddress, toAddress, isTyping });
  } catch (error) {
    console.error('Error sending typing status:', error);
    throw error;
  }
}

// Send message reaction
export async function sendReaction(messageId: number, fromAddress: string, emoji: string) {
  try {
    return apiRequest('/api/reactions', 'POST', { messageId, fromAddress, emoji });
  } catch (error) {
    console.error('Error sending reaction:', error);
    throw error;
  }
}

// Update user online status
export async function updateOnlineStatus(address: string, isOnline: boolean) {
  try {
    return apiRequest(`/api/users/${address}/status`, 'POST', { isOnline });
  } catch (error) {
    console.error('Error updating online status:', error);
    throw error;
  }
}

// Get user nation based on IP
export async function getUserNation() {
  try {
    return apiRequest('/api/user/nation', 'GET', {});
  } catch (error) {
    console.error('Error getting user nation:', error);
    throw error;
  }
}

// Update user nation preference
export async function updateUserNation(address: string, nationCode: string) {
  try {
    return apiRequest(`/api/users/${address}/nation`, 'POST', { nationCode });
  } catch (error) {
    console.error('Error updating user nation:', error);
    throw error;
  }
}

// Get all available nations
export async function getNations() {
  try {
    return apiRequest('/api/nations', 'GET', {});
  } catch (error) {
    console.error('Error getting nations:', error);
    throw error;
  }
}

// Cleanup function to unsubscribe from all channels
export function cleanup(pusher: Pusher | null, channels: Channels | null) {
  if (!pusher || !channels) return;
  
  try {
    pusher.unsubscribe('public-chat');
    pusher.unsubscribe('global-chat');
    
    if (channels.privateChannel) {
      const channelName = channels.privateChannel.name;
      pusher.unsubscribe(channelName);
    }
    
    if (channels.nationChannel) {
      const channelName = channels.nationChannel.name;
      pusher.unsubscribe(channelName);
    }
    
    pusher.unsubscribe('user-status');
    pusher.unsubscribe('reactions');
    pusher.disconnect();
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Debug function to check environment variables
export async function checkPusherEnvironment(): Promise<any> {
  try {
    const response = await fetch('/.netlify/functions/debug-env');
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking Pusher environment:', error);
    return { error: String(error) };
  }
} 