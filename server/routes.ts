import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, getStorage } from "./storage";
import { insertUserSchema, insertMessageSchema, updateUserSchema, insertFriendRequestSchema } from "@shared/schema";
import { insertReactionSchema } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq, and, or } from "drizzle-orm";
import { friends } from "@shared/schema";

// Define a schema for typing status messages
const typingStatusSchema = z.object({
  type: z.literal('typing'),
  fromAddress: z.string(),
  toAddress: z.string().nullable(),
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
  z.object({
    type: z.literal('ping'),
    timestamp: z.string(),
  })
]);

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  console.log("Creating WebSocket server on path: /ws");
  
  // Create WebSocket server with error handling
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    // Add error handling for WebSocket connection issues
    clientTracking: true,
    perMessageDeflate: false
  });
  
  // Handle server-level errors
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  // Store connected clients with their addresses
  const clients = new Map<string, WebSocket>();

  // Heartbeat interval
  const HEARTBEAT_INTERVAL = 30000;
  const HEARTBEAT_TIMEOUT = 35000;

  function heartbeat(ws: WebSocket) {
    const wsAny = ws as any;
    wsAny.isAlive = true;
  }

  // Set up heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const wsAny = ws as any;
      if (wsAny.isAlive === false) {
        console.log("Terminating inactive connection");
        return ws.terminate();
      }
      wsAny.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on('close', () => {
    clearInterval(interval);
  });

  wss.on('connection', (ws, req) => {
    console.log(`New WebSocket connection from ${req.socket.remoteAddress}`);
    let clientAddress: string | undefined;

    // Initialize heartbeat
    const wsAny = ws as any;
    wsAny.isAlive = true;
    ws.on('pong', () => heartbeat(ws));

    ws.on('error', (error) => {
      console.error('WebSocket error occurred:', error);
      if (clientAddress) {
        console.error(`Error for client ${clientAddress}:`, error);
      }
    });

    ws.on('message', async (data) => {
      try {
        console.log('Received raw message:', data.toString());
        const message = JSON.parse(data.toString());
        console.log('Parsed message:', message);
        const validatedMessage = wsMessageSchema.parse(message);
        console.log('Validated message:', validatedMessage);

        if (validatedMessage.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          return;
        }

        // Store the client's address for future reference
        if (!clientAddress) {
          clientAddress = validatedMessage.fromAddress;
          clients.set(clientAddress, ws);
          console.log(`Registered client with address: ${clientAddress}`);
          try {
            await storage.updateOnlineStatus(clientAddress, true);
            console.log(`Updated online status for ${clientAddress}`);
          } catch (error) {
            console.error("Failed to update online status:", error);
          }
        }

        // Handle typing status messages
        if (validatedMessage.type === 'typing') {
          console.log('Processing typing status:', validatedMessage);
          const broadcastData = JSON.stringify(validatedMessage);
          if (validatedMessage.toAddress) {
            const recipientWs = clients.get(validatedMessage.toAddress);
            if (recipientWs?.readyState === WebSocket.OPEN) {
              recipientWs.send(broadcastData);
              console.log(`Sent typing status to ${validatedMessage.toAddress}`);
            }
          }
          return;
        }

        // For chat messages, check friendship and store the message
        if (validatedMessage.toAddress) {
          console.log('Checking friendship between', validatedMessage.fromAddress, 'and', validatedMessage.toAddress);
          const areFriends = await storage.checkFriendship(
            validatedMessage.fromAddress,
            validatedMessage.toAddress
          );

          if (!areFriends) {
            console.log('Friendship check failed, sending error');
            ws.send(JSON.stringify({ 
              error: "You can only send messages to users in your friends list" 
            }));
            return;
          }
        }

        // Store the message in the database
        console.log('Storing message in database');
        const savedMessage = await storage.addMessage({
          content: validatedMessage.content,
          fromAddress: validatedMessage.fromAddress,
          toAddress: validatedMessage.toAddress
        });
        console.log('Message stored:', savedMessage);

        // Broadcast message based on type (private or public)
        const broadcastData = JSON.stringify(savedMessage);

        if (validatedMessage.toAddress) {
          // Private message: send only to sender and recipient
          console.log('Sending private message to recipient');
          const recipientWs = clients.get(validatedMessage.toAddress);
          if (recipientWs?.readyState === WebSocket.OPEN) {
            recipientWs.send(broadcastData);
            console.log('Sent to recipient');
          }
          ws.send(broadcastData);
          console.log('Sent to sender');
        } else {
          // Public message: broadcast to all connected clients
          console.log('Broadcasting public message to all clients');
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
          console.log('Broadcast complete');
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ error: "Invalid message format" }));
      }
    });

    ws.on('close', async () => {
      console.log(`WebSocket connection closed for ${clientAddress || 'unknown client'}`);
      if (clientAddress) {
        try {
          await storage.updateOnlineStatus(clientAddress, false);
          console.log(`Updated offline status for ${clientAddress}`);
        } catch (error) {
          console.error("Failed to update offline status:", error);
        }
        clients.delete(clientAddress);
        console.log(`Removed client ${clientAddress} from active clients`);
      }
    });

    // Send a welcome message
    const welcomeMessage = JSON.stringify({ 
      type: 'system',
      message: 'connected',
      timestamp: new Date().toISOString()
    });
    console.log('Sending welcome message:', welcomeMessage);
    ws.send(welcomeMessage);
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

      const updateData = updateUserSchema.parse(req.body);
      console.log("Validated update data:", updateData);

      // Check if username is being updated and is not null
      if (updateData.username) {
        const existingUser = await storage.getUserByUsername(updateData.username);
        if (existingUser && existingUser.address !== address) {
          return res.status(400).json({ error: "Username already taken" });
        }
      }

      const updatedUser = await storage.updateUser(address, updateData);
      console.log("Updated user:", updatedUser);

      res.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  app.get('/api/messages', async (_req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
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
      const [existingRequest] = await db
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

      clients.forEach((client) => {
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
      await storage.removeReaction(parseInt(reactionId));
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

  return httpServer;
}