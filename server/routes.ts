import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, updateUserSchema } from "@shared/schema";

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
      const updateData = updateUserSchema.parse(req.body);
      const updatedUser = await storage.updateUser(address, updateData);
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  app.get('/api/messages', async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  return httpServer;
}