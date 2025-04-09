import React, { useState, useEffect, useRef } from 'react';
import { usePusher } from '../hooks/usePusher';

// Types for our messages
interface Message {
  id: number;
  content: string;
  fromAddress: string;
  toAddress: string | null;
  timestamp: string;
  read: boolean;
}

interface User {
  address: string;
  username: string | null;
  nickname: string | null;
  isOnline: boolean;
}

interface PusherChatExampleProps {
  currentUser: {
    address: string;
    username: string | null;
  };
  recipient?: User | null;
}

const PusherChatExample: React.FC<PusherChatExampleProps> = ({ 
  currentUser,
  recipient = null 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recipientIsTyping, setRecipientIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle incoming messages
  const handleMessage = (message: Message) => {
    setMessages(prevMessages => {
      // Check if the message already exists
      const exists = prevMessages.some(m => m.id === message.id);
      if (exists) {
        return prevMessages;
      }
      return [...prevMessages, message];
    });
  };

  // Handle typing status updates
  const handleTyping = (data: { fromAddress: string; isTyping: boolean }) => {
    if (recipient && recipient.address === data.fromAddress) {
      setRecipientIsTyping(data.isTyping);
    }
  };

  // Handle user status updates
  const handleStatus = (data: { address: string; isOnline: boolean }) => {
    // You might want to update the recipient's online status in your app state
    console.log(`User ${data.address} is now ${data.isOnline ? 'online' : 'offline'}`);
  };

  // Initialize Pusher
  const { 
    connected, 
    error, 
    sendMessage, 
    sendTypingStatus 
  } = usePusher({
    userAddress: currentUser.address,
    onMessage: handleMessage,
    onTyping: handleTyping,
    onStatus: handleStatus,
  });

  // Load initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        // If you have a recipient, fetch direct messages
        if (recipient) {
          const response = await fetch(`/api/messages?fromAddress=${currentUser.address}&toAddress=${recipient.address}`);
          if (response.ok) {
            const data = await response.json();
            setMessages(data);
          }
        } else {
          // Otherwise fetch public messages
          const response = await fetch('/api/messages/public');
          if (response.ok) {
            const data = await response.json();
            setMessages(data);
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [currentUser.address, recipient]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle input change and typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // If recipient exists, send typing indicator
    if (recipient && !isTyping) {
      setIsTyping(true);
      sendTypingStatus(recipient.address, true).catch(console.error);
    }
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set a new timeout to stop typing indicator after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      if (recipient && isTyping) {
        setIsTyping(false);
        sendTypingStatus(recipient.address, false).catch(console.error);
      }
    }, 3000);
  };

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      // Send to a recipient if in a direct chat, otherwise public
      const toAddress = recipient ? recipient.address : null;
      
      await sendMessage(newMessage, toAddress);
      setNewMessage('');
      
      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      if (recipient && isTyping) {
        setIsTyping(false);
        sendTypingStatus(recipient.address, false).catch(console.error);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (error) {
    return <div className="text-red-500">Error connecting to chat: {error.message}</div>;
  }

  if (!connected) {
    return <div className="text-gray-500">Connecting to chat...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 rounded-lg shadow-md">
      <div className="p-4 bg-gray-800 text-white rounded-t-lg">
        <h2 className="text-xl font-bold">
          {recipient 
            ? `Chat with ${recipient.nickname || recipient.username || recipient.address}` 
            : 'Public Chat'}
        </h2>
        {recipient && (
          <div className="text-sm">
            {recipient.isOnline 
              ? <span className="text-green-400">Online</span> 
              : <span className="text-gray-400">Offline</span>}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500">No messages yet</div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id} 
              className={`p-3 rounded-lg max-w-[80%] ${
                message.fromAddress === currentUser.address 
                  ? 'bg-blue-500 text-white ml-auto' 
                  : 'bg-gray-300 text-gray-800'
              }`}
            >
              <div className="text-sm font-bold mb-1">
                {message.fromAddress === currentUser.address 
                  ? 'You' 
                  : (recipient?.nickname || recipient?.username || message.fromAddress)}
              </div>
              <div>{message.content}</div>
              <div className="text-xs opacity-70 text-right mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        {recipientIsTyping && (
          <div className="text-gray-500 italic">
            {recipient?.nickname || recipient?.username || recipient?.address} is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default PusherChatExample; 