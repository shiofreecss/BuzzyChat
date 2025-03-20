import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define all tables first
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  username: text("username").unique(),
  nickname: text("nickname"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  requestorAddress: text("requestor_address").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  status: text("status").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const reactions = pgTable("reactions", {
  id: serial("id").primaryKey(),
  messageId: serial("message_id").notNull(),
  fromAddress: text("from_address").notNull(),
  emoji: text("emoji").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Then define the schemas
export const insertUserSchema = createInsertSchema(users).pick({
  address: true,
  username: true,
  nickname: true,
}).extend({
  username: z.string().nullable().refine(
    (val) => !val || (val.length >= 3 && val.length <= 20 && /^[a-zA-Z0-9_]+$/.test(val)),
    {
      message: "Username must be 3-20 characters and can only contain letters, numbers, and underscores"
    }
  )
});

export const updateUserSchema = createInsertSchema(users).pick({
  username: true,
  nickname: true,
}).extend({
  username: z.string().nullable().refine(
    (val) => !val || (val.length >= 3 && val.length <= 20 && /^[a-zA-Z0-9_]+$/.test(val)),
    {
      message: "Username must be 3-20 characters and can only contain letters, numbers, and underscores"
    }
  )
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  fromAddress: true,
  toAddress: true,
});

export const insertFriendRequestSchema = createInsertSchema(friends).pick({
  requestorAddress: true,
  recipientAddress: true,
}).extend({
  status: z.literal('pending')
});

export const insertReactionSchema = createInsertSchema(reactions).pick({
  messageId: true,
  fromAddress: true,
  emoji: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Friend = typeof friends.$inferSelect;
export type InsertFriendRequest = z.infer<typeof insertFriendRequestSchema>;
export type Reaction = typeof reactions.$inferSelect;
export type InsertReaction = z.infer<typeof insertReactionSchema>;