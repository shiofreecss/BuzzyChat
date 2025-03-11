import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, updateUserSchema, insertFriendRequestSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store connected clients
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const validatedMessage = insertMessageSchema.parse(message);

        // Check if this is a private message and if users are friends
        if (validatedMessage.toAddress) {
          const areFriends = await storage.checkFriendship(
            validatedMessage.fromAddress,
            validatedMessage.toAddress
          );

          if (!areFriends) {
            ws.send(JSON.stringify({ 
              error: "You can only send messages to users in your friends list" 
            }));
            return;
          }
        }

        const savedMessage = await storage.addMessage(validatedMessage);

        // Broadcast to all connected clients
        const broadcastData = JSON.stringify(savedMessage);
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastData);
          }
        });
      } catch (error) {
        ws.send(JSON.stringify({ error: "Invalid message format" }));
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // Get all users
  app.get('/api/users', async (_req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  // Get user by address
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
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUser(userData.address);

      if (existingUser) {
        return res.json(existingUser);
      }

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.patch('/api/users/:address', async (req, res) => {
    try {
      const { address } = req.params;
      console.log("PATCH request for address:", address);
      console.log("Request body:", req.body);

      const updateData = updateUserSchema.parse(req.body);
      console.log("Validated update data:", updateData);

      const updatedUser = await storage.updateUser(address, updateData);
      console.log("Updated user:", updatedUser);

      res.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  app.get('/api/messages', async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
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
      const friend = await storage.sendFriendRequest(requestData);
      res.json(friend);
    } catch (error) {
      res.status(400).json({ error: "Invalid friend request data" });
    }
  });

  app.post('/api/friends/accept/:requestId', async (req, res) => {
    try {
      const { requestId } = req.params;
      const friend = await storage.acceptFriendRequest(parseInt(requestId));
      res.json(friend);
    } catch (error) {
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
      const friends = await storage.getFriends(address);
      res.json(friends);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch friends" });
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