import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, getStorage } from "./storage";
import { insertUserSchema, insertMessageSchema, updateUserSchema, insertFriendRequestSchema } from "@shared/schema";
import { insertReactionSchema } from "@shared/schema";
import { z } from "zod";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { db } from "./db";
import { eq, and, or } from "drizzle-orm";
import { friends } from "@shared/schema";
import {
  isPusherConfigured,
  triggerPrivateMessage,
  triggerPublicMessage,
  triggerReaction,
  triggerTypingStatus,
  triggerUserStatus,
  triggerNationMessage,
  triggerGlobalMessage
} from './pusher';

// Define the type for db to avoid 'any' type errors
const typedDb = db as any;

// Define a schema for typing status messages
const typingStatusSchema = z.object({
  type: z.literal('typing'),
  fromAddress: z.string(),
  toAddress: z.string().nullable(),
});

// Define a schema for reaction messages
const reactionSchema = z.object({
  type: z.literal('reaction'),
  messageId: z.number(),
  emoji: z.string(),
  fromAddress: z.string(),
});

// Define a schema for WebSocket messages
const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal('message'),
    content: z.string(),
    fromAddress: z.string(),
    toAddress: z.string().nullable(),
    timestamp: z.string(),
  }),
  typingStatusSchema,
  reactionSchema,
  z.object({
    type: z.literal('ping'),
    timestamp: z.string(),
  })
]);

// Add a new endpoint to handle Pusher auth for private channels
const pusherAuthSchema = z.object({
  socket_id: z.string(),
  channel_name: z.string(),
  user_address: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Add Pusher authentication endpoint
  app.post('/api/pusher/auth', async (req, res) => {
    try {
      if (!isPusherConfigured) {
        return res.status(503).json({ error: "Pusher is not configured" });
      }
      
      const validatedData = pusherAuthSchema.parse(req.body);
      const { socket_id, channel_name, user_address } = validatedData;
      
      // For private channels, verify permissions
      if (channel_name.startsWith('private-')) {
        // Implement access control as needed
        
        // For example, for private chats, verify that the user is part of the conversation
        if (channel_name.startsWith('private-chat-') && user_address) {
          const parts = channel_name.replace('private-chat-', '').split('-');
          const user1 = parts[0];
          const user2 = parts[1];
          
          if (user_address !== user1 && user_address !== user2) {
            return res.status(403).json({ error: "Unauthorized access to channel" });
          }
        }
        
        // Import pusher directly here to avoid circular dependencies
        const { pusher } = require('./pusher');
        const auth = pusher.authorizeChannel(socket_id, channel_name);
        return res.json(auth);
      }
      
      return res.status(400).json({ error: "Channel is not private" });
    } catch (error) {
      console.error('Pusher auth error:', error);
      return res.status(400).json({ error: "Invalid request" });
    }
  });
  
  // Keep this for backward compatibility, but use Pusher for real-time communication
  console.log("Creating WebSocket server for backward compatibility");
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    clientTracking: true,
    perMessageDeflate: false
  });
  
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  wss.on('connection', (ws, req) => {
    console.log(`WebSocket connection received but using Pusher instead`);
    
    // Send a message about using Pusher instead
    ws.send(JSON.stringify({ 
      type: 'system',
      message: 'Using Pusher for real-time communication. Please update your client.',
      timestamp: new Date().toISOString(),
      pusher_enabled: isPusherConfigured
    }));
  });

  // HTTP route to check Pusher status
  app.get('/api/pusher/status', (_req, res) => {
    res.json({
      pusher_enabled: isPusherConfigured,
      status: isPusherConfigured ? 'active' : 'not_configured'
    });
  });
  
  // HTTP route to send a message (for clients that don't use Pusher yet)
  app.post('/api/messages', async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      
      // Check friendship if it's a private message
      if (messageData.toAddress) {
        const areFriends = await storage.checkFriendship(
          messageData.fromAddress,
          messageData.toAddress
        );

        if (!areFriends) {
          return res.status(403).json({ 
            error: "You can only send messages to users in your friends list" 
          });
        }
      }
      
      // Store the message
      const savedMessage = await storage.addMessage(messageData);
      
      // Send via Pusher if configured
      if (isPusherConfigured) {
        if (messageData.toAddress) {
          // Private message
          await triggerPrivateMessage(
            messageData.fromAddress,
            messageData.toAddress,
            savedMessage
          );
        } else if (messageData.nationId) {
          // Nation-specific message
          const nation = await storage.getNation(messageData.nationId);
          if (nation) {
            await triggerNationMessage(nation.code, savedMessage);
          } else {
            console.error(`Nation with ID ${messageData.nationId} not found`);
          }
        } else if (messageData.isGlobal) {
          // Global message
          await triggerGlobalMessage(savedMessage);
        } else {
          // Default public message
          await triggerPublicMessage(savedMessage);
        }
      }
      
      res.json(savedMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(400).json({ 
        error: "Failed to send message",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // HTTP route to send reaction (for clients that don't use Pusher yet)
  app.post('/api/reactions', async (req, res) => {
    try {
      const reactionData = insertReactionSchema.parse(req.body);
      const reaction = await storage.addReaction(reactionData);
      
      // Send via Pusher if configured
      if (isPusherConfigured) {
        // Ensure messageId is a number
        const messageId = reaction.messageId;
        if (typeof messageId === 'number') {
          await triggerReaction(messageId, reaction);
        }
      }
      
      res.json(reaction);
    } catch (error) {
      console.error('Error sending reaction:', error);
      res.status(400).json({ 
        error: "Failed to send reaction",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // HTTP route to update user online status
  app.post('/api/users/:address/status', async (req, res) => {
    try {
      const { address } = req.params;
      const { isOnline } = req.body;
      
      if (typeof isOnline !== 'boolean') {
        return res.status(400).json({ error: "isOnline must be a boolean" });
      }
      
      await storage.updateOnlineStatus(address, isOnline);
      
      // Send via Pusher if configured
      if (isPusherConfigured) {
        await triggerUserStatus(address, isOnline);
      }
      
      res.json({ address, isOnline });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(400).json({ 
        error: "Failed to update user status",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Regular HTTP routes
  app.get('/api/users', async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get('/api/users/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const user = await storage.getUser(address);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      console.log("Received user registration request:", req.body);
      
      // Make sure the address is a string and not undefined or null
      if (!req.body.address || typeof req.body.address !== 'string') {
        return res.status(400).json({ error: "Invalid wallet address format" });
      }

      try {
        // Get appropriate storage implementation
        const storageImpl = getStorage();
        
        // Create a basic valid user object
        const userData = {
          address: req.body.address.trim(),
          username: req.body.username,
          nickname: req.body.nickname
        };
        
        // Try to validate with schema - if it fails, we'll still create a basic user
        try {
          insertUserSchema.parse(userData);
        } catch (parseError) {
          console.warn("Schema validation error, but continuing with basic user:", parseError);
        }
        
        // Check if user already exists
        try {
          const existingUser = await storageImpl.getUser(userData.address);
          if (existingUser) {
            console.log("User already exists, returning existing user:", existingUser);
            return res.json(existingUser);
          }
        } catch (error) {
          console.error("Error checking for existing user:", error);
          // Continue to user creation anyway
        }

        // Create new user with error handling
        try {
          console.log("Creating new user with data:", userData);
          const user = await storageImpl.createUser(userData);
          console.log("User created successfully:", user);
          return res.json(user);
        } catch (createError) {
          console.error("Error creating user:", createError);
          // Create a minimal valid response to allow client to continue
          return res.json({
            id: 0,
            address: userData.address,
            username: userData.username,
            nickname: userData.nickname,
            isOnline: true,
            lastSeen: new Date()
          });
        }
      } catch (error) {
        console.error("Validation or database error:", error);
        // Return a minimal valid response with the wallet address
        return res.json({
          id: 0,
          address: req.body.address.trim(),
          username: null,
          nickname: null,
          isOnline: true,
          lastSeen: new Date()
        });
      }
    } catch (error) {
      console.error("Server error during user creation:", error);
      res.status(500).json({ error: "Server error during user creation" });
    }
  });

  app.patch('/api/users/:address', async (req, res) => {
    try {
      const { address } = req.params;
      console.log("PATCH request for address:", address);
      console.log("Request body:", req.body);

      let updateData;
      try {
        updateData = updateUserSchema.parse(req.body);
        console.log("Validated update data:", updateData);
      } catch (error) {
        console.error("Schema validation error:", error);
        return res.status(400).json({ 
          error: "Invalid update data format", 
          details: error instanceof Error ? error.message : String(error) 
        });
      }

      // Check if username is being updated and is not null
      if (updateData.username) {
        try {
          const existingUser = await storage.getUserByUsername(updateData.username);
          if (existingUser && existingUser.address !== address) {
            return res.status(400).json({ error: "Username already taken" });
          }
        } catch (error) {
          console.error("Error checking existing username:", error);
          return res.status(500).json({ 
            error: "Failed to validate username",
            details: error instanceof Error ? error.message : String(error)
          });
        }
      }

      try {
        const updatedUser = await storage.updateUser(address, updateData);
        console.log("Updated user:", updatedUser);
        res.json(updatedUser);
      } catch (error) {
        console.error("Database update error:", error);
        return res.status(500).json({ 
          error: "Failed to update user in database", 
          details: error instanceof Error ? error.message : String(error) 
        });
      }
    } catch (error) {
      console.error("Update user error:", error);
      res.status(400).json({ 
        error: "Invalid update data", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.get('/api/messages', async (req, res) => {
    try {
      const { nationId, isGlobal } = req.query;
      
      if (nationId) {
        const nationMessages = await storage.getNationMessages(parseInt(nationId as string));
        return res.json(nationMessages);
      } else if (isGlobal === 'true') {
        const globalMessages = await storage.getGlobalMessages();
        return res.json(globalMessages);
      } else {
        const messages = await storage.getMessages();
        return res.json(messages);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.delete('/api/messages', async (_req, res) => {
    try {
      await storage.clearMessages();
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Failed to clear messages" });
    }
  });

  // Friend request endpoints
  app.post('/api/friends/request', async (req, res) => {
    try {
      const requestData = insertFriendRequestSchema.parse(req.body);

      // Check if they are already friends
      const areFriends = await storage.checkFriendship(
        requestData.requestorAddress,
        requestData.recipientAddress
      );

      if (areFriends) {
        return res.status(400).json({ error: "Already friends" });
      }

      // Check if any request (pending or accepted) exists between these users
      const [existingRequest] = await typedDb
        .select()
        .from(friends)
        .where(
          or(
            and(
              eq(friends.requestorAddress, requestData.requestorAddress),
              eq(friends.recipientAddress, requestData.recipientAddress)
            ),
            and(
              eq(friends.requestorAddress, requestData.recipientAddress),
              eq(friends.recipientAddress, requestData.requestorAddress)
            )
          )
        );

      if (existingRequest) {
        return res.status(400).json({ 
          error: existingRequest.status === 'pending' 
            ? "Friend request already sent" 
            : "Already friends"
        });
      }

      const friend = await storage.sendFriendRequest(requestData);
      res.json(friend);
    } catch (error) {
      console.error("Failed to send friend request:", error);
      res.status(400).json({ error: "Invalid friend request data" });
    }
  });

  app.post('/api/friends/accept/:requestId', async (req, res) => {
    try {
      const { requestId } = req.params;
      console.log('Starting friend request acceptance:', requestId);
      const friend = await storage.acceptFriendRequest(parseInt(requestId));
      console.log('Friend request accepted successfully:', friend);
      res.json(friend);
    } catch (error) {
      console.error("Error accepting friend request:", error);
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.get('/api/friends/requests/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const requests = await storage.getFriendRequests(address);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch friend requests" });
    }
  });

  app.get('/api/friends/:address', async (req, res) => {
    try {
      const { address } = req.params;
      console.log('Fetching friends for address:', address);
      const friends = await storage.getFriends(address);
      console.log('Retrieved friends:', friends);
      res.json(friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ error: "Failed to fetch friends" });
    }
  });

  app.post('/api/messages/:messageId/reactions', async (req, res) => {
    try {
      const { messageId } = req.params;
      const reactionData = insertReactionSchema.parse({
        ...req.body,
        messageId: parseInt(messageId),
      });
      const reaction = await storage.addReaction(reactionData);

      // Broadcast the reaction to all connected clients
      const broadcastData = JSON.stringify({
        type: 'reaction',
        data: reaction,
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(broadcastData);
        }
      });

      res.json(reaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid reaction data" });
    }
  });

  app.get('/api/messages/:messageId/reactions', async (req, res) => {
    try {
      const { messageId } = req.params;
      const reactions = await storage.getReactions(parseInt(messageId));
      res.json(reactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reactions" });
    }
  });

  app.delete('/api/reactions/:reactionId', async (req, res) => {
    try {
      const { reactionId } = req.params;
      const reaction = await storage.getReactionById(parseInt(reactionId));
      
      if (!reaction) {
        return res.status(404).json({ error: "Reaction not found" });
      }
      
      // Remember the messageId before deleting
      const messageId = reaction.messageId;
      
      await storage.removeReaction(parseInt(reactionId));
      
      // Broadcast the reaction deletion to all connected clients
      const broadcastData = JSON.stringify({
        type: 'reaction_deleted',
        messageId: messageId,
        reactionId: parseInt(reactionId)
      });
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(broadcastData);
        }
      });
      
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ error: "Failed to remove reaction" });
    }
  });

  // Setup message cleanup cron job
  setInterval(async () => {
    try {
      await storage.cleanupOldMessages();
      console.log("Old messages cleaned up successfully");
    } catch (error) {
      console.error("Failed to clean up old messages:", error);
    }
  }, 24 * 60 * 60 * 1000); // Run daily

  // Nation APIs
  app.get('/api/nations', async (_req, res) => {
    try {
      const nations = await storage.getActiveNations();
      res.json(nations);
    } catch (error) {
      console.error('Error fetching nations:', error);
      res.status(500).json({ error: "Failed to fetch nations" });
    }
  });

  app.post('/api/nations', async (req, res) => {
    try {
      const nationData = req.body;
      const nation = await storage.createNation(nationData);
      res.json(nation);
    } catch (error) {
      console.error('Error creating nation:', error);
      res.status(400).json({ error: "Failed to create nation" });
    }
  });

  app.get('/api/nations/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const nation = await storage.getNationByCode(code);
      
      if (!nation) {
        return res.status(404).json({ error: "Nation not found" });
      }
      
      res.json(nation);
    } catch (error) {
      console.error('Error fetching nation:', error);
      res.status(500).json({ error: "Failed to fetch nation" });
    }
  });

  // User nation APIs
  app.post('/api/users/:address/nation', async (req, res) => {
    try {
      const { address } = req.params;
      const { nationCode } = req.body;
      
      if (!nationCode || typeof nationCode !== 'string') {
        return res.status(400).json({ error: "Invalid nation code" });
      }
      
      const user = await storage.updateUserNation(address, nationCode);
      res.json(user);
    } catch (error) {
      console.error('Error updating user nation:', error);
      res.status(400).json({ 
        error: "Failed to update user nation",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get user nation based on IP
  app.get('/api/user/nation', async (req, res) => {
    try {
      // Get client IP
      const forwardedFor = req.headers['x-forwarded-for'];
      const ip = typeof forwardedFor === 'string' 
        ? forwardedFor.split(',')[0].trim() 
        : req.socket.remoteAddress;
      
      if (!ip) {
        return res.status(400).json({ error: "Could not determine client IP" });
      }
      
      try {
        // Call IP geolocation service
        const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
        const geoData = await geoResponse.json();
        
        if (geoData.error) {
          console.error('IP geolocation error:', geoData.error);
          return res.json({ 
            country: 'UNKNOWN',
            countryCode: 'XX',
            ip
          });
        }
        
        // Try to find matching nation in our database
        let nation = null;
        if (geoData.country_code) {
          nation = await storage.getNationByCode(geoData.country_code);
        }
        
        res.json({
          country: geoData.country_name || 'UNKNOWN',
          countryCode: geoData.country_code || 'XX',
          ip,
          nation
        });
      } catch (error) {
        console.error('IP geolocation service error:', error);
        return res.json({ 
          country: 'UNKNOWN',
          countryCode: 'XX',
          ip
        });
      }
    } catch (error) {
      console.error('Error getting user nation:', error);
      res.status(500).json({ error: "Failed to get user nation" });
    }
  });

  return httpServer;
}